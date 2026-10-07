import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Vibration } from 'react-native';
import io from 'socket.io-client';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import { API_ORIGIN, getAuthToken } from '../../api/client';
import { ORDER_ALERT_CHANNEL_ID } from '../push';
import { deliveryApi as deliveryAPI } from '../../api/delivery';
import { dispatchNotificationInboxRefresh } from './useNotificationInbox';
import { useDeliveryStore, resolveOrderKey, ordersShareIdentity } from '../store/useDeliveryStore';
import { mapOrderLocations } from '../utils/orderMapping';
import { isOrderWithinOfferRange, sanitizeOrderDispatchMetrics } from '../utils/pickupMetrics';
import { decodeToken } from '../../context/AuthContext';
import { localStore } from '../../lib/storage';
import { toast } from '../../lib/notify';

/*
 * Port of Frontend/src/modules/Food/hooks/useDeliveryNotifications.js.
 *
 * Same socket events, same queue/mute/dedupe rules and the same return
 * value. Platform substitutions:
 * - HTMLAudioElement + WebAudio synth fallback -> expo-audio player (the
 *   synth beep only covered autoplay blocks, which native apps do not have);
 * - navigator.vibrate -> Vibration;
 * - browser Notification while the tab is hidden -> a local notification
 *   while the app is in the background;
 * - window focus / visibilitychange -> AppState 'active';
 * - the Flutter bridge and window.__deliverySocketDebug are dropped.
 */

const ALERT_SOUND = require('../../../assets/media/restaurant_alert.mp3');
const VIBRATION_PATTERN = [0, 200, 100, 200, 100, 300];

const debugLog = (...args) => {
  if (__DEV__ || localStore.getItem('delivery_socket_debug') === '1') console.log('[DeliverySocket]', ...args);
};
const debugError = (...args) => console.error('[DeliverySocket]', ...args);

const safeReadJson = (key) => {
  try {
    const raw = localStore.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const resolveDeliveryPartnerIdFromClient = () => {
  try {
    const storedUser = safeReadJson('delivery_user') || safeReadJson('deliveryUser') || safeReadJson('user');
    const nestedCandidate =
      storedUser?.id ||
      storedUser?._id ||
      storedUser?.userId ||
      storedUser?.deliveryId ||
      storedUser?.deliveryPartnerId ||
      storedUser?.user?.id ||
      storedUser?.user?._id ||
      storedUser?.deliveryPartner?.id ||
      storedUser?.deliveryPartner?._id;
    if (nestedCandidate) return String(nestedCandidate);
    const payload = decodeToken(getAuthToken());
    const tokenCandidate = payload?.userId || payload?.id || payload?._id || payload?.sub;
    return tokenCandidate ? String(tokenCandidate) : null;
  } catch {
    return null;
  }
};

const buildDeliveryOrderNotification = (orderData = {}) => {
  const orderId = orderData.orderId || orderData.orderMongoId || orderData.id || 'New';
  const itemCount = Array.isArray(orderData.items) ? orderData.items.length : 0;
  const total = Number(orderData.total || orderData.pricing?.total || orderData.orderTotal || 0);
  return {
    title: `New order #${orderId}`,
    body:
      itemCount > 0
        ? `${itemCount} item${itemCount === 1 ? '' : 's'} - ₹${total.toFixed(2)}`
        : 'A new order is available to accept',
    data: { orderId, targetUrl: '/food/delivery/orders', link: '/food/delivery/orders' },
  };
};

/** Socket origin: EXPO_PUBLIC_SOCKET_URL, else the API origin (web: socketOrigin.js). */
const getSocketOrigin = () => String(process.env.EXPO_PUBLIC_SOCKET_URL || API_ORIGIN || '').replace(/\/+$/, '');

export const useDeliveryNotifications = () => {
  const socketRef = useRef(null);
  const playerRef = useRef(null);
  const activeOrderRef = useRef(null);
  const alertLoopTimerRef = useRef(null);
  const alertLoopStartedAtRef = useRef(0);
  const lastAlertAtByOrderRef = useRef(new Map());
  const lastOsNotificationAtByOrderRef = useRef(new Map());
  const processedOrderIdsRef = useRef(new Set());
  const mutedOrderIdsRef = useRef(
    (() => {
      const ids = new Set();
      try {
        const saved = localStore.getItem('delivery_muted_order_ids');
        const parsed = saved ? JSON.parse(saved) : null;
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => {
            const key = String(id || '').trim();
            if (key) ids.add(key);
          });
        }
        localStore.removeItem('delivery_notifications_muted');
      } catch {
        /* ignore */
      }
      return ids;
    })(),
  );
  const [muteUiTick, setMuteUiTick] = useState(0);

  const [newOrder, setNewOrder] = useState(null);
  const [orderReady, setOrderReady] = useState(null);
  const [orderStatusUpdate, setOrderStatusUpdate] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [deliveryPartnerId, setDeliveryPartnerId] = useState(null);
  const [claimedOrderId, setClaimedOrderId] = useState(null);
  const [adminNotification, setAdminNotification] = useState(null);
  const joinedDeliveryRoomRef = useRef(null);
  const ALERT_DEDUPE_MS = 15000;
  const OS_NOTIFICATION_DEDUPE_MS = 20000;
  const NOTIFICATION_PERMISSION_ASKED_KEY = 'delivery_notification_permission_asked';
  const DELIVERY_MUTED_ORDER_IDS_KEY = 'delivery_muted_order_ids';

  const getOrderAlertKey = (orderData = {}) =>
    String(
      orderData?.orderMongoId ||
        orderData?.order_mongo_id ||
        orderData?.orderId ||
        orderData?.order_id ||
        orderData?._id ||
        orderData?.id ||
        '',
    ).trim();

  const collectOrderAlertKeys = (orderData) => {
    if (!orderData) return [];
    if (typeof orderData === 'string') {
      const key = String(orderData).trim();
      return key ? [key] : [];
    }
    return [
      ...new Set(
        [
          orderData.orderMongoId,
          orderData.order_mongo_id,
          orderData.orderId,
          orderData.order_id,
          orderData._id,
          orderData.id,
          orderData.mongoId,
        ]
          .map((id) => String(id || '').trim())
          .filter(Boolean),
      ),
    ];
  };

  const saveMutedOrderIds = useCallback(() => {
    localStore.setItem(DELIVERY_MUTED_ORDER_IDS_KEY, JSON.stringify([...mutedOrderIdsRef.current]));
  }, []);

  const isOrderAlertMuted = useCallback((orderData) => {
    const keys = collectOrderAlertKeys(orderData);
    if (!keys.length) return false;
    return keys.some((key) => mutedOrderIdsRef.current.has(key));
  }, []);

  const clearOrderMuteState = useCallback(
    (orderData) => {
      const keys = collectOrderAlertKeys(orderData);
      if (!keys.length) return;
      let changed = false;
      keys.forEach((key) => {
        if (mutedOrderIdsRef.current.delete(key)) changed = true;
      });
      if (changed) {
        saveMutedOrderIds();
        setMuteUiTick((tick) => tick + 1);
      }
    },
    [saveMutedOrderIds],
  );

  const isProcessedOrder = useCallback((orderData) => {
    if (!orderData) return false;
    const ids = [
      orderData.orderMongoId,
      orderData.orderId,
      orderData._id,
      orderData.id,
      orderData.mongoId,
      orderData.order_id,
      orderData.order_mongo_id,
    ].filter(Boolean);
    return ids.some((id) => processedOrderIdsRef.current.has(String(id).trim()));
  }, []);

  const isOrderInAcceptedQueue = useCallback((orderData) => {
    if (!orderData) return false;
    const accepted = useDeliveryStore.getState().acceptedOrders || [];
    return accepted.some((item) => ordersShareIdentity(item, orderData));
  }, []);

  const markOrderIdsProcessed = useCallback((orderData) => {
    if (!orderData) return;
    [
      orderData.orderMongoId,
      orderData.order_mongo_id,
      orderData.orderId,
      orderData.order_id,
      orderData._id,
      orderData.id,
      orderData.mongoId,
    ]
      .filter(Boolean)
      .forEach((id) => processedOrderIdsRef.current.add(String(id).trim()));
  }, []);

  const shouldProcessOrderAlert = (orderData = {}) => {
    const key = getOrderAlertKey(orderData);
    if (!key) return true;
    const now = Date.now();
    const last = lastAlertAtByOrderRef.current.get(key) || 0;
    if (now - last < ALERT_DEDUPE_MS) return false;
    lastAlertAtByOrderRef.current.set(key, now);
    return true;
  };

  const shouldShowOsNotification = (orderData = {}) => {
    const key = getOrderAlertKey(orderData);
    if (!key) return true;
    const now = Date.now();
    const last = lastOsNotificationAtByOrderRef.current.get(key) || 0;
    if (now - last < OS_NOTIFICATION_DEDUPE_MS) return false;
    lastOsNotificationAtByOrderRef.current.set(key, now);
    return true;
  };

  const clearAlertLoopTimer = useCallback(() => {
    if (alertLoopTimerRef.current) {
      clearInterval(alertLoopTimerRef.current);
      alertLoopTimerRef.current = null;
    }
  }, []);

  const stopAlertLoop = useCallback(() => {
    clearAlertLoopTimer();
    alertLoopStartedAtRef.current = 0;
    const p = playerRef.current;
    if (p) {
      try {
        p.pause();
        p.seekTo(0);
        p.loop = false;
      } catch {
        /* ignore */
      }
    }
  }, [clearAlertLoopTimer]);

  // Ring for at most 10 seconds per request.
  const startAlertLoop = useCallback(
    (playSoundFn, orderData) => {
      clearAlertLoopTimer();
      const targetOrder = orderData || activeOrderRef.current;
      if (!targetOrder || isOrderAlertMuted(targetOrder)) return;
      alertLoopStartedAtRef.current = Date.now();
      alertLoopTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - alertLoopStartedAtRef.current;
        if (elapsed >= 10000 || !activeOrderRef.current) stopAlertLoop();
      }, 1000);
    },
    [clearAlertLoopTimer, isOrderAlertMuted, stopAlertLoop],
  );

  const playNotificationSound = useCallback(
    (orderData = {}) => {
      if (isOrderAlertMuted(orderData)) return;
      try {
        Vibration.vibrate(VIBRATION_PATTERN);
      } catch {
        /* ignore */
      }
      try {
        if (!playerRef.current) playerRef.current = createAudioPlayer(ALERT_SOUND);
        const p = playerRef.current;
        p.muted = false;
        p.volume = 1.0;
        p.loop = true;
        p.seekTo(0);
        p.play();
      } catch (error) {
        debugLog('Alert sound failed:', error);
      }
    },
    [isOrderAlertMuted],
  );

  const triggerOrderAlertFor10Sec = useCallback(
    (orderData) => {
      const target = orderData || activeOrderRef.current || newOrder;
      if (!target || isOrderAlertMuted(target)) return;
      activeOrderRef.current = target;
      playNotificationSound(target);
      startAlertLoop(playNotificationSound, target);
    },
    [isOrderAlertMuted, playNotificationSound, startAlertLoop, newOrder],
  );

  const setOrderAlertMuted = useCallback(
    (orderData, nextMuted) => {
      const keys = collectOrderAlertKeys(orderData);
      if (!keys.length) return;
      const muted = Boolean(nextMuted);
      keys.forEach((key) => {
        if (muted) mutedOrderIdsRef.current.add(key);
        else mutedOrderIdsRef.current.delete(key);
      });
      saveMutedOrderIds();
      setMuteUiTick((tick) => tick + 1);
      if (muted) {
        stopAlertLoop();
        return;
      }
      const targetOrder = orderData || activeOrderRef.current || newOrder;
      if (targetOrder) {
        activeOrderRef.current = targetOrder;
        triggerOrderAlertFor10Sec(targetOrder);
      }
    },
    [saveMutedOrderIds, stopAlertLoop, triggerOrderAlertFor10Sec, newOrder],
  );

  const toggleOrderAlertMuted = useCallback(
    (orderData) => setOrderAlertMuted(orderData, !isOrderAlertMuted(orderData)),
    [isOrderAlertMuted, setOrderAlertMuted],
  );

  const stopAlertsWhenQueueEmpty = useCallback(() => {
    const pending = useDeliveryStore.getState().newOrders || [];
    if (pending.length === 0) {
      stopAlertLoop();
      activeOrderRef.current = null;
      setNewOrder(null);
    }
  }, [stopAlertLoop]);

  const showBackgroundOrderNotification = useCallback(async (orderData = {}) => {
    if (!shouldShowOsNotification(orderData)) return;
    try {
      const perm = await Notifications.getPermissionsAsync();
      if (!perm.granted) return;
      const n = buildDeliveryOrderNotification(orderData);
      await Notifications.scheduleNotificationAsync({
        content: { title: n.title, body: n.body, data: n.data, sound: 'restaurant_alert.mp3', priority: Notifications.AndroidNotificationPriority.MAX },
        trigger: { channelId: ORDER_ALERT_CHANNEL_ID },
      });
    } catch (error) {
      debugLog('Background order notification failed:', error);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleIncomingOrderAlert = useCallback(
    (orderData = {}) => {
      if (isOrderInAcceptedQueue(orderData)) return;
      if (isProcessedOrder(orderData)) return;
      if (!shouldProcessOrderAlert(orderData)) return;
      const mappedOrder = sanitizeOrderDispatchMetrics(mapOrderLocations(orderData) || orderData);
      const riderLocation = useDeliveryStore.getState().riderLocation;
      if (!isOrderWithinOfferRange(mappedOrder, riderLocation)) {
        debugLog('Ignored out-of-range order offer', { orderId: mappedOrder?.orderId || mappedOrder?._id });
        return;
      }
      activeOrderRef.current = mappedOrder || { id: Date.now() };
      useDeliveryStore.getState().addNewOrder(mappedOrder);
      playNotificationSound(mappedOrder);
      startAlertLoop(playNotificationSound);
      if (AppState.currentState !== 'active') showBackgroundOrderNotification(orderData);
    },
    [isOrderInAcceptedQueue, isProcessedOrder, playNotificationSound, showBackgroundOrderNotification, startAlertLoop], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const recoverDeliveryState = useCallback(async () => {
    if (!deliveryPartnerId) return;
    try {
      const [availableResult, currentTripResult] = await Promise.allSettled([
        deliveryAPI.getOrders({ limit: 20, page: 1 }),
        deliveryAPI.getCurrentDelivery(),
      ]);
      const currentPayload =
        currentTripResult.status === 'fulfilled'
          ? (currentTripResult.value?.data?.data ?? currentTripResult.value?.data ?? null)
          : null;
      const activeOrders = Array.isArray(currentPayload?.activeOrders)
        ? currentPayload.activeOrders
        : currentPayload?.activeOrder
          ? [currentPayload.activeOrder]
          : [];
      if (currentPayload?.capacity) useDeliveryStore.getState().setCapacity(currentPayload.capacity);
      if (activeOrders.length) {
        useDeliveryStore
          .getState()
          .setAcceptedOrders(activeOrders.map(mapOrderLocations).filter(Boolean), { capacity: currentPayload?.capacity });
        return;
      }
      if (currentPayload && (currentPayload._id || currentPayload.orderId)) {
        setOrderStatusUpdate({ ...currentPayload, recoverySource: 'delivery_reconnect' });
        return;
      }
      const availablePayload =
        availableResult.status === 'fulfilled' ? (availableResult.value?.data?.data ?? availableResult.value?.data ?? {}) : {};
      const availableOrders = Array.isArray(availablePayload?.docs)
        ? availablePayload.docs
        : Array.isArray(availablePayload?.items)
          ? availablePayload.items
          : Array.isArray(availablePayload)
            ? availablePayload
            : [];
      const recoverableOrder = availableOrders.find((order) => {
        const dispatchStatus = order?.dispatch?.status;
        const isEligibleStatus =
          ['unassigned', 'assigned'].includes(dispatchStatus) && ['preparing', 'ready_for_pickup'].includes(order?.orderStatus);
        if (!isEligibleStatus) return false;
        // Ignore stale orders older than 2 hours so the sound does not ring on every login.
        const createdAt = new Date(order.createdAt || order.updatedAt).getTime();
        return Date.now() - createdAt <= 2 * 60 * 60 * 1000;
      });
      if (availablePayload?.capacity) useDeliveryStore.getState().setCapacity(availablePayload.capacity);
      const newOffers = Array.isArray(availablePayload?.newOffers) ? availablePayload.newOffers : [];
      newOffers.forEach((order) => useDeliveryStore.getState().addNewOrder(order));
      if (recoverableOrder && !isProcessedOrder(recoverableOrder)) {
        setNewOrder(recoverableOrder);
        useDeliveryStore.getState().addNewOrder(recoverableOrder);
        handleIncomingOrderAlert(recoverableOrder);
      }
    } catch (error) {
      debugLog('Delivery recovery sync failed:', error?.message || error);
    }
  }, [deliveryPartnerId, handleIncomingOrderAlert, isProcessedOrder]);

  const joinDeliveryRoomIfPossible = useCallback(() => {
    if (!socketRef.current?.connected || !deliveryPartnerId) return false;
    if (joinedDeliveryRoomRef.current === deliveryPartnerId) return true;
    socketRef.current.emit('join-delivery', deliveryPartnerId);
    joinedDeliveryRoomRef.current = deliveryPartnerId;
    return true;
  }, [deliveryPartnerId]);

  // Ask for notification permission once (web: on the first tap after load).
  useEffect(() => {
    if (localStore.getItem(NOTIFICATION_PERMISSION_ASKED_KEY) === 'true') return;
    localStore.setItem(NOTIFICATION_PERMISSION_ASKED_KEY, 'true');
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  // Ring and notify when the app goes to the background with an offer pending.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'background' || !activeOrderRef.current) return;
      playNotificationSound(activeOrderRef.current);
      showBackgroundOrderNotification(activeOrderRef.current);
    });
    return () => sub.remove();
  }, [playNotificationSound, showBackgroundOrderNotification]);

  // Audio player: play even with the ring switch on silent, as a phone ringtone does.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    playerRef.current = createAudioPlayer(ALERT_SOUND);
    playerRef.current.volume = 0.7;
    return () => {
      try {
        playerRef.current?.pause();
        playerRef.current?.remove();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const fallbackId = resolveDeliveryPartnerIdFromClient();
    if (fallbackId) setDeliveryPartnerId(fallbackId);
    deliveryAPI
      .getMe()
      .then((response) => {
        if (response.data?.success && response.data.data) {
          const dp = response.data.data.user || response.data.data.deliveryPartner;
          const id = dp?.id?.toString() || dp?._id?.toString() || dp?.deliveryId;
          if (id) setDeliveryPartnerId(id);
        }
      })
      .catch((error) => debugError('Error fetching delivery partner:', error?.message));
  }, []);

  useEffect(() => {
    const socketUrl = getSocketOrigin();
    if (!socketUrl) {
      setIsConnected(false);
      return undefined;
    }
    if (!__DEV__ && socketUrl.includes('localhost')) {
      debugError('Refusing to connect Socket.IO to localhost in a release build');
      setIsConnected(false);
      return undefined;
    }

    const token = getAuthToken();
    const socket = io(socketUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      auth: { token: token || '' },
      query: token ? { token } : undefined,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      joinedDeliveryRoomRef.current = null;
      joinDeliveryRoomIfPossible();
      socket.emit('resync');
      void recoverDeliveryState();
    });
    socket.on('connect_error', (error) => {
      debugLog('Socket connection error', error?.message);
      setIsConnected(false);
    });
    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      joinedDeliveryRoomRef.current = null;
      if (reason === 'io server disconnect') socket.connect();
    });
    socket.io.on('reconnect', () => {
      setIsConnected(true);
      joinedDeliveryRoomRef.current = null;
      joinDeliveryRoomIfPossible();
      socket.emit('resync');
      void recoverDeliveryState();
    });

    const onOffer = (orderData) => {
      if (isOrderInAcceptedQueue(orderData) || isProcessedOrder(orderData)) return;
      setNewOrder(orderData);
      handleIncomingOrderAlert(orderData);
    };
    socket.on('new_order', onOffer);
    // Same payload as new_order — also ring so retry-only offers are not silent.
    socket.on('new_order_available', onOffer);

    socket.on('active_orders', (orders = []) => {
      if (!Array.isArray(orders) || orders.length === 0) return;
      useDeliveryStore.getState().setAcceptedOrders(orders.map(mapOrderLocations).filter(Boolean));
    });
    socket.on('delivery_capacity', (capacity) => {
      if (capacity) useDeliveryStore.getState().setCapacity(capacity);
    });
    socket.on('active_order', (orderData) => {
      if (!orderData) return;
      const mapped = mapOrderLocations(orderData);
      if (mapped) {
        markOrderIdsProcessed(mapped);
        clearOrderMuteState(mapped);
        useDeliveryStore.getState().acceptOrderToQueue(mapped);
        stopAlertLoop();
        activeOrderRef.current = null;
        setNewOrder(null);
      }
    });
    socket.on('play_notification_sound', (data) => {
      const normalizedData = {
        orderId: data?.orderId || data?.order_id,
        orderMongoId: data?.orderMongoId || data?.order_mongo_id,
        ...data,
      };
      if (isOrderAlertMuted(normalizedData) || isOrderInAcceptedQueue(normalizedData) || isProcessedOrder(normalizedData)) {
        return;
      }
      handleIncomingOrderAlert(normalizedData);
    });
    socket.on('order_ready', (orderData) => {
      setOrderReady(orderData);
      playNotificationSound(orderData);
    });
    socket.on('order_status_update', (statusData) => setOrderStatusUpdate(statusData || null));
    socket.on('order_cancelled', (statusData) => setOrderStatusUpdate({ ...(statusData || {}), status: 'cancelled' }));
    socket.on('order_deleted', (statusData) => setOrderStatusUpdate({ ...(statusData || {}), status: 'deleted' }));

    const handleOfferTakenElsewhere = (data, { showToast }) => {
      const claimedId = data?.orderId || data?.orderMongoId || data?.order_id;
      const claimedBy = String(data?.claimedBy || '');
      const isSelf = Boolean(claimedBy) && Boolean(deliveryPartnerId) && claimedBy === String(deliveryPartnerId);
      if (claimedId) {
        markOrderIdsProcessed({ _id: claimedId, orderId: claimedId, orderMongoId: claimedId });
        useDeliveryStore.getState().removeNewOrder(claimedId);
        setClaimedOrderId(claimedId);
      }
      if (showToast && !isSelf) {
        toast.info('This request accepted by another rider', { id: `order-claimed-${claimedId || 'unknown'}`, duration: 4000 });
      }
      const remaining = useDeliveryStore.getState().newOrders || [];
      if (remaining.length > 0) {
        const nextOffer = remaining[0];
        activeOrderRef.current = nextOffer;
        setNewOrder(nextOffer);
        if (!isOrderAlertMuted(nextOffer)) {
          playNotificationSound(nextOffer);
          startAlertLoop(playNotificationSound);
        } else {
          stopAlertLoop();
        }
        return;
      }
      stopAlertLoop();
      activeOrderRef.current = null;
      setNewOrder(null);
    };
    socket.on('order_reassigned_elsewhere', (data) => handleOfferTakenElsewhere(data, { showToast: true }));
    socket.on('order_claimed', (data) => handleOfferTakenElsewhere(data, { showToast: true }));
    socket.on('admin_notification', (payload) => {
      setAdminNotification(payload);
      dispatchNotificationInboxRefresh();
    });

    // Web: window focus + visibilitychange -> recover state.
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const fresh = getAuthToken();
        if (fresh) socket.auth.token = fresh;
        if (!socket.connected) socket.connect();
        void recoverDeliveryState();
      }
    });

    return () => {
      stopAlertLoop();
      joinedDeliveryRoomRef.current = null;
      appSub.remove();
      socket.removeAllListeners();
      socket.io.removeAllListeners?.('reconnect');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    deliveryPartnerId,
    handleIncomingOrderAlert,
    isOrderAlertMuted,
    isOrderInAcceptedQueue,
    isProcessedOrder,
    joinDeliveryRoomIfPossible,
    markOrderIdsProcessed,
    clearOrderMuteState,
    playNotificationSound,
    recoverDeliveryState,
    showBackgroundOrderNotification,
    startAlertLoop,
    stopAlertLoop,
  ]);

  useEffect(() => {
    if (!deliveryPartnerId) return;
    joinDeliveryRoomIfPossible();
    if (socketRef.current?.connected) {
      socketRef.current.emit('resync');
      void recoverDeliveryState();
    }
  }, [deliveryPartnerId, joinDeliveryRoomIfPossible, recoverDeliveryState]);

  const clearNewOrder = useCallback(
    (orderOrId) => {
      const target = orderOrId || newOrder || activeOrderRef.current;
      if (target) {
        if (typeof target === 'object') markOrderIdsProcessed(target);
        else processedOrderIdsRef.current.add(String(target).trim());
        clearOrderMuteState(target);
      }
      stopAlertLoop();
      activeOrderRef.current = null;
      setNewOrder(null);
      const removeId = typeof target === 'object' ? resolveOrderKey(target) : String(target || '').trim();
      if (removeId) useDeliveryStore.getState().removeNewOrder(removeId);
      stopAlertsWhenQueueEmpty();
    },
    [clearOrderMuteState, markOrderIdsProcessed, newOrder, stopAlertLoop, stopAlertsWhenQueueEmpty],
  );

  const emitLocation = useCallback((data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('update-location', data);
      return true;
    }
    return false;
  }, []);

  return {
    newOrder,
    clearNewOrder,
    orderReady,
    clearOrderReady: () => setOrderReady(null),
    orderStatusUpdate,
    clearOrderStatusUpdate: () => setOrderStatusUpdate(null),
    adminNotification,
    clearAdminNotification: () => setAdminNotification(null),
    claimedOrderId,
    clearClaimedOrderId: () => setClaimedOrderId(null),
    isConnected,
    playNotificationSound,
    stopSound: stopAlertLoop,
    triggerOrderAlertFor10Sec,
    isOrderAlertMuted,
    setOrderAlertMuted,
    toggleOrderAlertMuted,
    muteUiTick,
    emitLocation,
  };
};
