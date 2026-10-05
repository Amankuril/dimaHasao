import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { toast } from '../../lib/notify';
import { API_BASE_URL } from '../../api/config';
import { userAPI } from '../../api/food';
import { dispatchNotificationInboxRefresh } from './useNotificationInbox';
import { isModuleAuthenticated } from '../utils/auth';
import { getSocketOrigin } from '../../shared/utils/socketOrigin';
import { localStore } from '../../lib/storage';
import { events } from '../../lib/events';

const debugLog = () => {};

/**
 * Hook for user to receive real-time order notifications.
 * Dispatches 'orderStatusNotification' custom event for OrderTrackingCard.
 */
export const useUserNotifications = () => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState(null);
  const lastDropOtpToastRef = useRef({ key: '', at: 0 });
  const lastOrderStatusToastRef = useRef({ key: '', at: 0 });

  const DROP_OTP_TOAST_ID = 'user-delivery-drop-otp';
  const DROP_OTP_DEDUPE_MS = 15000;
  const ORDER_STATUS_TOAST_ID = 'user-order-status-update';
  const ORDER_STATUS_DEDUPE_MS = 4000;

  // Fetch current user ID
  useEffect(() => {
    if (!isModuleAuthenticated('user')) {
      return;
    }
    const fetchUserId = async () => {
      try {
        const response = await userAPI.getProfile();
        if (response.data?.success && response.data.data?.user) {
          const user = response.data.data.user;
          const id = user._id?.toString() || user.userId || user.id;
          setUserId(id);
        }
      } catch (error) {
        // Not logged in or error
      }
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (!API_BASE_URL || !String(API_BASE_URL).trim()) {
      setIsConnected(false);
      return;
    }
    if (!userId) {
      return;
    }

    // Normalize backend URL
    let backendUrl = API_BASE_URL;
    try {
      backendUrl = new URL(backendUrl).origin;
    } catch {
      backendUrl = String(backendUrl || "")
        .replace(/\/api\/v\d+\/?$/i, "")
        .replace(/\/api\/?$/i, "")
        .replace(/\/+$/, "");
    }

    // Socket.IO has its own port; one resolver decides it for every module.
    const socketUrl = getSocketOrigin() || `${backendUrl}`;
    
    // Auth token
    const token = localStore.getItem('user_accessToken') || localStore.getItem('accessToken');
    if (!token) return;

    debugLog('🔌 Connecting to User Socket.IO:', socketUrl);

    socketRef.current = io(socketUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      auth: { token },
      forceNew: false,
      multiplex: true
    });

    socketRef.current.on('connect', () => {
      debugLog('✅ User Socket connected, userId:', userId);
      setIsConnected(true);
      globalThis.orderSocketConnected = true;
      events.emit('userSocketConnectionChange', { isConnected: true });
      // Backend auto-joins 'user:userId' room based on role/token in config/socket.js
    });

    socketRef.current.on('order_status_update', (data) => {
      debugLog('🔔 Order status update received:', data);
      
      const rawId = String(data.displayOrderId || data.orderDisplayId || data.orderId || '');
      const readableId = rawId.length > 20
        ? `FOD-${rawId.slice(-6).toUpperCase()}`
        : rawId || 'Update';

      const rawTitle = String(data.title || '');
      const title = (rawTitle && (!data.orderId || !rawTitle.includes(data.orderId) || String(data.orderId).length <= 20))
        ? rawTitle
        : `Order #${readableId}`;
      const message = data.message || `Your order status is now ${String(data.orderStatus || '').replace(/_/g, ' ')}`;

      const isImportant = String(data.orderStatus).includes('cancel') ||
        ['ready_for_pickup', 'ready', 'confirmed', 'delivered', 'out_for_delivery'].includes(data.orderStatus);

      const statusKey = `${readableId}:${String(data.orderStatus || '')}`;
      const now = Date.now();
      const isDuplicateStatusToast =
        statusKey &&
        statusKey === lastOrderStatusToastRef.current.key &&
        now - lastOrderStatusToastRef.current.at < ORDER_STATUS_DEDUPE_MS;

      if (isImportant && !isDuplicateStatusToast) {
        lastOrderStatusToastRef.current = { key: statusKey, at: now };
        events.emit('show-user-notification-toast', { title, message });
        // Only refresh inbox (bell count) for delivered orders
        if (data.orderStatus === 'delivered') {
          dispatchNotificationInboxRefresh();
        }
      }

      // Dispatch custom event for OrderTrackingCard and other listeners
      events.emit('orderStatusNotification', {
          orderMongoId: data.orderMongoId,
          orderId: readableId,
          status: data.orderStatus,
          orderStatus: data.orderStatus, // Ensure compatibility with different UI checks
          title,
          message,
          deliveryState: data.deliveryState,
          deliveryVerification: data.deliveryVerification,
          timestamp: new Date().toISOString()
      });
    });

    /** Customer receives handover OTP when partner confirms "reached drop" (never shown to partner). */
    socketRef.current.on('delivery_drop_otp', (payload) => {
      debugLog('🔐 Delivery handover OTP:', payload?.orderId);
      const otp = payload?.otp != null ? String(payload.otp) : '';
      const orderId = payload?.orderId != null ? String(payload.orderId) : '';
      const message = payload?.message != null ? String(payload.message) : '';

      const otpKey = `${orderId}:${otp}`;
      const now = Date.now();
      const lastToast = lastDropOtpToastRef.current;
      const isDuplicateOtp =
        otpKey &&
        otpKey === lastToast.key &&
        now - lastToast.at < DROP_OTP_DEDUPE_MS;

      if (isDuplicateOtp) {
        return;
      }

      lastDropOtpToastRef.current = { key: otpKey, at: now };

      events.emit('deliveryDropOtp', {
            orderMongoId: payload?.orderMongoId,
            orderId,
            otp,
            message,
            orderType: payload?.orderType || 'delivery'
          });
      const isTakeaway = payload?.orderType === 'takeaway';
      const title = orderId 
        ? `Order #${orderId} — ${isTakeaway ? 'Takeaway OTP' : 'Delivery OTP'}` 
        : (isTakeaway ? 'Takeaway OTP' : 'Delivery OTP');
      const parts = [message, otp ? `OTP: ${otp}` : ''].filter(Boolean);

      toast.dismiss(DROP_OTP_TOAST_ID);
      toast.message(title, {
        id: DROP_OTP_TOAST_ID,
        description: parts.join(' — ') || (isTakeaway ? 'Verification OTP for your takeaway pickup.' : 'Handover OTP from your delivery partner.'),
        duration: 12_000
      });
    });

    socketRef.current.on('dining_booking_update', (payload) => {
      debugLog('🍽️ Dining booking update:', payload);
      events.emit('diningBookingStatusUpdate', payload);
    });

    socketRef.current.on('admin_notification', (payload) => {
      events.emit('show-user-notification-toast', {
          title: payload?.title || 'Notification',
          message: payload?.message || '',
        });
      dispatchNotificationInboxRefresh();
    });

    socketRef.current.on('connect_error', () => {
      if (__DEV__) {
        // debugLog('❌ Socket connection error');
      }
      setIsConnected(false);
      globalThis.orderSocketConnected = false;
      events.emit('userSocketConnectionChange', { isConnected: false });
    });

    socketRef.current.on('disconnect', (reason) => {
      debugLog('🔌 Socket disconnected:', reason);
      setIsConnected(false);
      globalThis.orderSocketConnected = false;
      events.emit('userSocketConnectionChange', { isConnected: false });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId]);

  return { isConnected };
};
