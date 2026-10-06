import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useDeliveryStore, resolveOrderKey, mapDeliveryPhaseToTripStatus } from './store/useDeliveryStore';
import { useProximityCheck } from './hooks/useProximityCheck';
import { useOrderManager } from './hooks/useOrderManager';
import { useDeliveryNotificationsContext } from './DeliveryRealtimeContext';
import useNotificationInbox from './hooks/useNotificationInbox';
import { getCurrentPosition, watchPosition } from './hooks/useGeolocation';
import { writeOrderTracking } from './realtimeTracking';
import { mapOrderLocations } from './utils/orderMapping';
import { getHaversineDistance, calculateETA, calculateHeading } from './utils/geo';
import { deliveryApi as deliveryAPI } from '../api/delivery';
import { toast } from '../lib/notify';

/*
 * The state and side effects of pages/DeliveryHomeV2.jsx, lifted into the
 * (tabs) layout. On the web, /, /feed, /pocket, /history and /profile all
 * render that one component and React keeps its state across them; the tab
 * layout plays that role here. `currentTab` comes from the focused tab, and
 * effects gate on it exactly as the web's do. When the rider is on Orders or
 * on a pushed page, DeliveryHomeV2 is not mounted on the web, so `homeActive`
 * is false and the home-only effects stop.
 */

const HomeContext = createContext(null);

export function tabFromPath(pathname = '') {
  const p = pathname.replace(/\/+$/, '');
  if (p === '/food/delivery' || p === '/food/delivery/feed') return 'feed';
  if (p === '/food/delivery/orders') return 'orders';
  if (p === '/food/delivery/pocket') return 'pocket';
  if (p === '/food/delivery/history') return 'history';
  if (p === '/food/delivery/profile') return 'profile';
  return null;
}

export function DeliveryHomeProvider({ children }) {
  const pathname = usePathname();
  const routeTab = tabFromPath(pathname);
  const homeActive = ['feed', 'pocket', 'history', 'profile'].includes(routeTab);
  const [currentTab, setCurrentTab] = useState(routeTab && routeTab !== 'orders' ? routeTab : 'feed');
  useEffect(() => {
    if (routeTab && routeTab !== 'orders') setCurrentTab(routeTab);
  }, [routeTab]);
  const feedActive = homeActive && currentTab === 'feed';

  const {
    isOnline,
    toggleOnline,
    acceptedOrders,
    focusedOrderId,
    orderSessions,
    setRiderLocation,
    setAcceptedOrders,
    setCapacity,
    updateOrderSession,
    removeAcceptedOrder,
  } = useDeliveryStore();
  const activeOrder = useDeliveryStore((state) => state.getFocusedOrder());
  const tripStatus = useDeliveryStore((state) => state.getFocusedTripStatus());
  const focusedSession = focusedOrderId ? orderSessions[focusedOrderId] || {} : {};
  const showVerification = Boolean(focusedSession.showVerification);
  const isModalMinimized = Boolean(focusedSession.isModalMinimized);
  const setShowVerification = (value) => focusedOrderId && updateOrderSession(focusedOrderId, { showVerification: value });
  const setIsModalMinimized = (value) => focusedOrderId && updateOrderSession(focusedOrderId, { isModalMinimized: value });

  const { isWithinRange, distanceToTarget } = useProximityCheck();
  const orderManager = useOrderManager();
  const { reachPickup, reachDrop, resetTrip } = orderManager;
  const notifications = useDeliveryNotificationsContext();
  const {
    clearNewOrder,
    orderStatusUpdate,
    clearOrderStatusUpdate,
    claimedOrderId,
    clearClaimedOrderId,
    adminNotification,
    clearAdminNotification,
    isConnected: isSocketConnected,
    emitLocation,
  } = notifications;
  const inbox = useNotificationInbox('delivery', { limit: 20 });

  const [cashLimitNotice, setCashLimitNotice] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showEmergencyPopup, setShowEmergencyPopup] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [emergencyNumbers, setEmergencyNumbers] = useState({ medicalEmergency: '', accidentHelpline: '', contactPolice: '', insurance: '' });

  const [eta, setEta] = useState(null);
  const lastLocationSentAt = useRef(0);
  const lastCoordRef = useRef(null);
  const rollingSpeedRef = useRef([]);
  const lastAutoArrivalRef = useRef({ PICKING_UP: false, PICKED_UP: false });

  const [zoom, setZoom] = useState(14);
  const [isSimMode, setIsSimMode] = useState(false);
  const [simPath, setSimPath] = useState([]);
  const [simIndex, setSimIndex] = useState(0);
  const [, setSimProgress] = useState(0);
  const [activePolyline, setActivePolyline] = useState(null);
  const mapRef = useRef(null);
  const simInitializedRef = useRef(false);
  const gpsBlockedToastShown = useRef(false);

  // Simulation glide (dev builds only; the SIM controls only render in __DEV__).
  const lastSimUpdateSentAt = useRef(0);
  useEffect(() => {
    if (!(isSimMode && simPath.length > 1 && simIndex < simPath.length - 1)) return undefined;
    const interval = setInterval(() => {
      setSimProgress((prev) => {
        const nextProgress = prev + 0.08;
        if (nextProgress >= 1) {
          setSimIndex((idx) => idx + 1);
          return 0;
        }
        const currentPoint = simPath[simIndex];
        const nextPoint = simPath[simIndex + 1];
        if (currentPoint && nextPoint) {
          const lat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * nextProgress;
          const lng = currentPoint.lng + (nextPoint.lng - currentPoint.lng) * nextProgress;
          const heading = calculateHeading(currentPoint.lat, currentPoint.lng, nextPoint.lat, nextPoint.lng);
          setRiderLocation({ lat, lng, heading });
          mapRef.current?.panTo?.({ lat, lng });
          const now = Date.now();
          if (now - lastSimUpdateSentAt.current >= 2000) {
            lastSimUpdateSentAt.current = now;
            const payload = { lat, lng, heading, orderId: activeOrder?.orderId || activeOrder?._id, status: 'on_the_way', polyline: activePolyline };
            deliveryAPI.updateLocation(lat, lng, true, { heading }).catch(() => {});
            if (payload.orderId) {
              emitLocation(payload);
              writeOrderTracking(payload.orderId, { lat, lng, heading, polyline: activePolyline, status: tripStatus, eta }).catch(() => {});
            }
          }
        }
        return nextProgress;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isSimMode, simPath, simIndex, activeOrder, emitLocation, activePolyline, eta, tripStatus, setRiderLocation]);

  // Emergency numbers and the avatar (web: fetched when DeliveryHomeV2 mounts).
  useEffect(() => {
    if (!homeActive) return;
    (async () => {
      try {
        const [emergencyRes, profileRes] = await Promise.all([deliveryAPI.getEmergencyHelp(), deliveryAPI.getProfile()]);
        if (emergencyRes?.data?.success && emergencyRes.data.data) setEmergencyNumbers(emergencyRes.data.data);
        if (profileRes?.data?.success && profileRes.data.data?.profile) {
          const profile = profileRes.data.data.profile;
          setProfileImage(profile.profileImage?.url || profile.documents?.photo || null);
        }
      } catch {
        /* the header keeps its placeholders */
      }
    })();
  }, [homeActive]);

  useEffect(() => {
    setSimIndex(0);
    setSimProgress(0);
    simInitializedRef.current = false;
  }, [tripStatus, isSimMode, activeOrder?._id]);

  useEffect(() => {
    if (!isSimMode || simInitializedRef.current || simPath.length < 2) return;
    const start = simPath[0];
    if (start && Number.isFinite(Number(start.lat)) && Number.isFinite(Number(start.lng))) {
      setRiderLocation({ lat: Number(start.lat), lng: Number(start.lng), heading: 0 });
      simInitializedRef.current = true;
    }
  }, [isSimMode, simPath, setRiderLocation]);

  const parsePoint = (raw) => {
    if (!raw) return null;
    const lat = Number(raw.lat ?? raw.latitude);
    const lng = Number(raw.lng ?? raw.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  };

  useEffect(() => {
    if (!isSimMode || simPath.length > 1 || !activeOrder) return;
    const riderPoint = parsePoint(useDeliveryStore.getState().riderLocation);
    const targetPoint =
      tripStatus === 'PICKED_UP' || tripStatus === 'REACHED_DROP' ? parsePoint(activeOrder.customerLocation) : parsePoint(activeOrder.restaurantLocation);
    if (!riderPoint || !targetPoint) return;
    const distance = getHaversineDistance(riderPoint.lat, riderPoint.lng, targetPoint.lat, targetPoint.lng);
    if (!Number.isFinite(distance) || distance < 10) return;
    const steps = 60;
    setSimPath(
      Array.from({ length: steps + 1 }, (_, i) => ({
        lat: riderPoint.lat + (targetPoint.lat - riderPoint.lat) * (i / steps),
        lng: riderPoint.lng + (targetPoint.lng - riderPoint.lng) * (i / steps),
      })),
    );
  }, [isSimMode, simPath, activeOrder, tripStatus]);

  // Restore the trip panel when the status or the focused order changes.
  useEffect(() => {
    setIsModalMinimized(false);
  }, [tripStatus, focusedOrderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial sync with the server (web: on DeliveryHomeV2 mount).
  useEffect(() => {
    if (!homeActive) return;
    (async () => {
      try {
        const response = await deliveryAPI.getCurrentDelivery();
        const payload = response?.data?.data || {};
        const activeOrders = Array.isArray(payload.activeOrders) ? payload.activeOrders : payload.activeOrder ? [payload.activeOrder] : [];
        if (payload.capacity) setCapacity(payload.capacity);
        if (activeOrders.length) {
          const mapped = activeOrders.map(mapOrderLocations).filter(Boolean);
          setAcceptedOrders(mapped, { capacity: payload.capacity });
          mapped.forEach((order) => {
            const orderId = resolveOrderKey(order);
            const backendStatus = String(order.deliveryStatus || order.orderState?.status || order.orderStatus || order.status || '').toLowerCase();
            const currentPhase = order.deliveryState?.currentPhase;
            let nextStatus = mapDeliveryPhaseToTripStatus(order);
            if (['delivered', 'completed'].includes(backendStatus)) nextStatus = 'COMPLETED';
            else if (currentPhase === 'at_drop' || backendStatus === 'reached_drop') nextStatus = 'REACHED_DROP';
            else if (['picked_up', 'delivering'].includes(backendStatus)) nextStatus = 'PICKED_UP';
            else if (currentPhase === 'at_pickup' || backendStatus === 'reached_pickup') nextStatus = 'REACHED_PICKUP';
            updateOrderSession(orderId, { tripStatus: nextStatus });
          });
        }
      } catch {
        /* Order Sync Failed */
      }
    })();
  }, [homeActive, setAcceptedOrders, setCapacity, updateOrderSession]);

  // ETA from the distance and the rolling GPS speed (8 m/s when unknown).
  useEffect(() => {
    if (distanceToTarget != null && distanceToTarget !== Infinity) {
      const avg = rollingSpeedRef.current.length > 0 ? rollingSpeedRef.current.reduce((a, b) => a + b, 0) / rollingSpeedRef.current.length : 8;
      setEta(calculateETA(distanceToTarget, avg));
    } else {
      setEta(null);
    }
  }, [distanceToTarget]);

  // Online / offline status sync.
  useEffect(() => {
    if (!homeActive) return;
    deliveryAPI.updateOnlineStatus(isOnline).catch(() => {});
  }, [isOnline, homeActive]);

  // GPS tracking while online on the feed.
  useEffect(() => {
    if (!isOnline || !feedActive) return undefined;
    return watchPosition(
      (pos) => {
        if (isSimMode) return;
        const { latitude: lat, longitude: lng, heading, speed } = pos.coords;
        const now = Date.now();
        setRiderLocation({ lat, lng, heading: heading || 0 });
        if (speed && speed > 0) rollingSpeedRef.current = [...rollingSpeedRef.current.slice(-4), speed];
        // Geo-fenced auto arrival within 100 m (off in dev builds, as on the web).
        if (!isSimMode && !__DEV__ && distanceToTarget && distanceToTarget <= 100 && !lastAutoArrivalRef.current[tripStatus]) {
          if (tripStatus === 'PICKING_UP') {
            lastAutoArrivalRef.current[tripStatus] = true;
            reachPickup().catch(() => {
              lastAutoArrivalRef.current[tripStatus] = false;
            });
          } else if (tripStatus === 'PICKED_UP') {
            lastAutoArrivalRef.current[tripStatus] = true;
            reachDrop().catch(() => {
              lastAutoArrivalRef.current[tripStatus] = false;
            });
          }
        }
        if (distanceToTarget > 200) lastAutoArrivalRef.current[tripStatus] = false;
        const distMoved = lastCoordRef.current ? getHaversineDistance(lat, lng, lastCoordRef.current.lat, lastCoordRef.current.lng) : 1000;
        if (distMoved >= 25 || now - lastLocationSentAt.current >= 7000) {
          lastLocationSentAt.current = now;
          lastCoordRef.current = { lat, lng };
          const orderId = activeOrder?.orderId || activeOrder?._id;
          deliveryAPI.updateLocation(lat, lng, true, { heading: heading || 0, speed: speed || 0, accuracy: pos.coords.accuracy }).catch(() => {});
          if (orderId) {
            emitLocation({ lat, lng, heading: heading || 0, speed: speed || 0, accuracy: pos.coords.accuracy, orderId, status: 'on_the_way', polyline: activePolyline });
            writeOrderTracking(orderId, { lat, lng, heading: heading || 0, polyline: activePolyline, status: tripStatus, eta }).catch(() => {});
          }
        }
      },
      () => {
        // Never use a fake city in production: it made Distance/Arrival show 800+ km.
        if (__DEV__ && !useDeliveryStore.getState().riderLocation) setRiderLocation({ lat: 22.7196, lng: 75.8577, heading: 0 });
        if (!gpsBlockedToastShown.current) {
          gpsBlockedToastShown.current = true;
          toast.error('Location unavailable', {
            id: 'gps-blocked',
            description: __DEV__ ? 'Dev: using Indore test location.' : 'Enable GPS for accurate distance and navigation.',
          });
        }
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );
  }, [isOnline, feedActive, setRiderLocation, isSimMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Heartbeat: ping every 10 s if no GPS update went out for 15 s.
  useEffect(() => {
    if (!isOnline || !homeActive) return undefined;
    const pingInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastLocationSentAt.current >= 15000 && lastCoordRef.current) {
        lastLocationSentAt.current = now;
        deliveryAPI.updateLocation(lastCoordRef.current.lat, lastCoordRef.current.lng, true, { heading: 0, speed: 0, accuracy: null }).catch(() => {});
      }
    }, 10000);
    return () => clearInterval(pingInterval);
  }, [isOnline, homeActive]);

  useEffect(() => {
    if (!claimedOrderId) return;
    clearNewOrder(claimedOrderId);
    clearClaimedOrderId();
  }, [claimedOrderId, clearNewOrder, clearClaimedOrderId]);

  // Poll active and available orders while online on the feed (12 s with a socket, 5 s without).
  useEffect(() => {
    if (!isOnline || !feedActive) return undefined;
    let cancelled = false;
    const hydrateAvailableOrder = async () => {
      try {
        const currentResponse = await deliveryAPI.getCurrentDelivery();
        const currentPayload = currentResponse?.data?.data || {};
        const activeOrders = Array.isArray(currentPayload.activeOrders) ? currentPayload.activeOrders : currentPayload.activeOrder ? [currentPayload.activeOrder] : [];
        if (!cancelled && currentPayload.capacity) setCapacity(currentPayload.capacity);
        if (!cancelled && activeOrders.length) {
          setAcceptedOrders(activeOrders.map(mapOrderLocations).filter(Boolean), { capacity: currentPayload.capacity });
        }
        const availableResponse = await deliveryAPI.getOrders({ limit: 20, page: 1 });
        const availablePayload = availableResponse?.data?.data || availableResponse?.data || {};
        if (!cancelled) setCashLimitNotice(availablePayload?.cashLimit?.blocked ? availablePayload.cashLimit : null);
        if (!cancelled && availablePayload.capacity) setCapacity(availablePayload.capacity);
        const newOffers = Array.isArray(availablePayload.newOffers) ? availablePayload.newOffers : [];
        if (!cancelled) {
          newOffers.forEach((order) => useDeliveryStore.getState().addNewOrder(order));
          if (newOffers.length) setCashLimitNotice(null);
        }
      } catch {
        /* fallback sync failed */
      }
    };
    void hydrateAvailableOrder();
    const poller = setInterval(() => {
      if (AppState.currentState === 'active') void hydrateAvailableOrder();
    }, isSocketConnected ? 12000 : 5000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void hydrateAvailableOrder());
    return () => {
      cancelled = true;
      clearInterval(poller);
      sub.remove();
    };
  }, [feedActive, isOnline, isSocketConnected, setAcceptedOrders, setCapacity]);

  useEffect(() => {
    if (!orderStatusUpdate || !homeActive) return;
    if (orderStatusUpdate.status === 'cancelled') {
      toast.error('Order cancelled');
      const cancelledId = orderStatusUpdate.orderId || orderStatusUpdate.orderMongoId || orderStatusUpdate._id;
      if (cancelledId) removeAcceptedOrder(cancelledId);
      else resetTrip();
    }
    clearOrderStatusUpdate();
  }, [orderStatusUpdate, resetTrip, clearOrderStatusUpdate, removeAcceptedOrder, homeActive]);

  // Admin broadcasts. Sonner's toast action ("View") is folded into a tap on the toast.
  useEffect(() => {
    if (!adminNotification || !homeActive) return;
    toast.info(adminNotification.title || 'New Notification', {
      description: adminNotification.message || adminNotification.body || '',
      duration: 8000,
      action: { label: 'View', onClick: () => setShowNotifications(true) },
    });
    clearAdminNotification();
  }, [adminNotification, clearAdminNotification, homeActive]);

  const handleCenterMap = () => {
    const loc = useDeliveryStore.getState().riderLocation;
    if (mapRef.current && loc) mapRef.current.panTo({ lat: parseFloat(loc.lat || loc.latitude), lng: parseFloat(loc.lng || loc.longitude) });
  };

  const handleMapClick = () => {
    if (activeOrder || showVerification) setIsModalMinimized(true);
  };

  const handleToggleOnline = useCallback(() => {
    const nextState = !useDeliveryStore.getState().isOnline;
    toggleOnline();
    if (nextState) {
      // Sync position immediately so dispatch sees the rider right away.
      getCurrentPosition(
        (pos) => deliveryAPI.updateLocation(pos.coords.latitude, pos.coords.longitude, true).catch(() => {}),
        () => {},
        { enableHighAccuracy: true },
      );
    } else {
      deliveryAPI.updateOnlineStatus(false).catch(() => {});
    }
  }, [toggleOnline]);

  const startSimulation = () => {
    const nextSimState = !isSimMode;
    setIsSimMode(nextSimState);
    if (!nextSimState) return;
    toast.warning('Simulation Mode Active');
    const target =
      tripStatus === 'PICKED_UP' || tripStatus === 'REACHED_DROP' ? parsePoint(activeOrder?.customerLocation) : parsePoint(activeOrder?.restaurantLocation);
    const riderPoint = parsePoint(useDeliveryStore.getState().riderLocation) || (target ? { lat: target.lat + 0.001, lng: target.lng + 0.001 } : null);
    if (riderPoint) setRiderLocation({ lat: riderPoint.lat, lng: riderPoint.lng, heading: 0 });
    if (riderPoint && target && (!simPath || simPath.length < 2)) {
      const steps = 60;
      setSimPath(
        Array.from({ length: steps + 1 }, (_, i) => ({
          lat: riderPoint.lat + (target.lat - riderPoint.lat) * (i / steps),
          lng: riderPoint.lng + (target.lng - riderPoint.lng) * (i / steps),
        })),
      );
    }
  };

  const value = {
    currentTab,
    homeActive,
    isOnline,
    activeOrder,
    tripStatus,
    acceptedOrders,
    focusedOrderId,
    showVerification,
    setShowVerification,
    isModalMinimized,
    setIsModalMinimized,
    isWithinRange,
    distanceToTarget,
    eta,
    zoom,
    setZoom,
    isSimMode,
    setIsSimMode,
    startSimulation,
    setSimPath,
    activePolyline,
    setActivePolyline,
    mapRef,
    cashLimitNotice,
    profileImage,
    emergencyNumbers,
    showEmergencyPopup,
    setShowEmergencyPopup,
    showNotifications,
    setShowNotifications,
    inbox,
    orderManager,
    handleCenterMap,
    handleMapClick,
    handleToggleOnline,
    goHome: () => router.replace('/food/delivery'),
  };

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useDeliveryHome() {
  return useContext(HomeContext);
}
