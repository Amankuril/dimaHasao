/* eslint-disable react-hooks/exhaustive-deps */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { ChevronRight, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { IconButton } from '../../components/ds';
import { useOrders } from '../context/OrdersContext';
import { useProfile } from '../context/ProfileContext';
import { orderAPI } from '../../api/food';
import { isModuleAuthenticated } from '../utils/auth';
import { navigateTo } from '../../lib/webRouter';
import { events } from '../../lib/events';
import { localStore } from '../../lib/storage';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { color, elevation, radii, space, tone as tones, type } from '../../theme';

const GREEN = color.primary;

function loop(value, { to = 1, duration, delay = 0, easing = Easing.inOut(Easing.ease), yoyo = false }) {
  const seq = yoyo
    ? Animated.sequence([
        Animated.timing(value, { toValue: to, duration: duration / 2, easing, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: duration / 2, easing, useNativeDriver: true }),
      ])
    : Animated.timing(value, { toValue: to, duration, easing, useNativeDriver: true });
  return Animated.loop(Animated.sequence([Animated.delay(delay), seq, Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true })]));
}

const Steam = ({ delay, h }) => {
  const v = useAnimatedValue(0);
  useEffect(() => {
    const l = loop(v, { duration: 1500, delay, easing: Easing.out(Easing.ease) });
    l.start();
    return () => l.stop();
  }, [v]);
  return (
    <Animated.View
      style={{
        width: 6,
        height: 12,
        borderRadius: 3,
        backgroundColor: color.goldBright,
        opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.8, 0] }),
        transform: [{ translateY: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -h * 0.66, -h] }) }],
      }}
    />
  );
};

/** The pressure-cooker animation of the live order strip. */
const CookingAnimation = memo(function CookingAnimation() {
  const wobble = useAnimatedValue(0);
  const flame = useAnimatedValue(0);
  useEffect(() => {
    const a = loop(wobble, { duration: 600, yoyo: true });
    const b = loop(flame, { duration: 600, yoyo: true });
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, []);
  return (
    <View style={styles.cook}>
      <View style={{ position: 'absolute', top: -12, flexDirection: 'row', gap: 6 }}>
        <Steam delay={0} h={12} />
        <Steam delay={500} h={15} />
        <Steam delay={1000} h={12} />
      </View>
      <Animated.View style={{ marginTop: 4, transform: [{ rotate: wobble.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) }] }}>
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 10h12v6a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-6z" />
          <Rect x="5" y="8" width="14" height="2" rx="1" />
          <Path d="M12 8V5" />
          <Path d="M11 5h2v2h-2z" fill={GREEN} />
          <Path d="M19 9l3-1v2l-3 1" fill={GREEN} strokeWidth={1} />
          <Path d="M5 10H3v2h2" />
        </Svg>
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          width: 16,
          height: 4,
          borderRadius: 2,
          backgroundColor: GREEN,
          opacity: flame.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] }),
          transform: [{ scaleX: flame.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
        }}
      />
    </View>
  );
});

const getOrderKey = (order) => order?.id || order?._id || order?.orderId || null;
const normalizeOrderToken = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
const getOrderStatus = (order) => normalizeOrderToken(order?.orderStatus || order?.status || order?.deliveryState?.status || order?.deliveryStatus || '');
const getOrderPhase = (order) => normalizeOrderToken(order?.deliveryState?.currentPhase || order?.currentPhase || '');

const ACTIVE_PHASES = new Set(['created', 'confirmed', 'preparing', 'accepted', 'ready', 'ready_for_pickup', 'reached_pickup', 'picked_up', 'out_for_delivery', 'en_route_to_delivery', 'at_pickup', 'at_drop', 'reached_drop']);
const TERMINAL_STATUSES = new Set([
  'delivered', 'cancelled', 'canceled', 'completed', 'failed', 'cancelled_by_user', 'canceled_by_user', 'cancelled_by_restaurant', 'canceled_by_restaurant', 'cancelled_by_admin', 'canceled_by_admin',
]);

const isActiveOrder = (order) => {
  if (!order) return false;
  const status = getOrderStatus(order);
  const phase = getOrderPhase(order);
  if (TERMINAL_STATUSES.has(status)) return false;
  if (phase === 'completed' || phase === 'delivered') return false;
  if (order.scheduledAt && (status === 'confirmed' || status === 'created' || status === 'pending')) return false;
  if (!status && phase) return ACTIVE_PHASES.has(phase);
  if (!status) return false;
  return true;
};

const parsePrepMinutes = (preparationTime) => {
  if (!preparationTime) return null;
  const num = Number(preparationTime);
  if (Number.isFinite(num) && num > 0) return num;
  const range = String(preparationTime).match(/(\d+)\s*-\s*(\d+)/);
  if (range) return Number(range[2]);
  const single = String(preparationTime).match(/(\d+)/);
  if (single) return Number(single[1]);
  return null;
};

const getTimeRemaining = (order) => {
  if (!order) return null;
  const prepMins = parsePrepMinutes(order.preparationTime);
  if (prepMins && order.acceptedAt) {
    const target = new Date(new Date(order.acceptedAt).getTime() + prepMins * 60000);
    return Math.ceil((target - new Date()) / 60000);
  }
  const orderTime = new Date(order.scheduledAt || order.createdAt || order.orderDate || order.created_at || order.date || Date.now());
  const isScheduled = !!order.scheduledAt;
  const estimatedMinutes = isScheduled ? 0 : order.estimatedDeliveryTime || order.estimatedTime || order.estimated_delivery_time || 35;
  const deliveryTime = new Date(orderTime.getTime() + estimatedMinutes * 60000);
  return Math.max(0, Math.ceil((deliveryTime - new Date()) / 60000));
};

function ordersFingerprint(orders) {
  if (!Array.isArray(orders) || orders.length === 0) return '';
  return orders.map((o) => `${getOrderKey(o)}:${getOrderStatus(o)}`).join('|');
}

/** Status tile on the right of the strip: a word plus colour, never colour alone. */
function Badge({ tone = 'primary', solid, children }) {
  const t = tones[tone] || tones.primary;
  return <View style={[styles.badge, { backgroundColor: solid ? color.primary : t.bg }]}>{children(solid ? color.onPrimary : t.fg)}</View>;
}
const Small = ({ children, fg }) => <Text style={[type.caption, { color: fg }]}>{children}</Text>;
const Big = ({ children, fg }) => (
  <Text style={[type.bodyStrong, { color: fg }]} numberOfLines={1}>
    {children}
  </Text>
);

function TrackingCardContent({ activeOrder, currentOrderKey, hasBottomNav, timeRemaining, statusText, restaurantName, orderStatus, orderType, isPreparingExpired, setDismissedKey }) {
  const insets = useSafeAreaInsets();
  const slide = useAnimatedValue(0);
  useEffect(() => {
    Animated.spring(slide, { toValue: 1, damping: 25, stiffness: 200, mass: 1, useNativeDriver: true }).start();
  }, [slide]);

  const isTakeawayOrDining = orderType === 'takeaway' || orderType === 'dining' || activeOrder?.orderType === 'takeaway' || activeOrder?.orderType === 'dining';
  const rawStatus = getOrderStatus(activeOrder);
  const rawPhase = getOrderPhase(activeOrder);
  const isReadyOrder = rawStatus === 'ready' || rawStatus === 'ready_for_pickup' || orderStatus === 'ready' || orderStatus === 'ready_for_pickup';
  const isAccepted = !['created', 'pending', 'confirmed', 'placed', ''].includes(rawStatus);

  let right;
  if (!isAccepted) {
    right = (
      <Badge tone="info">
        {(fg) => (
          <>
            <Small fg={fg}>Order</Small>
            <Big fg={fg}>Placed</Big>
          </>
        )}
      </Badge>
    );
  } else if (isTakeawayOrDining && isReadyOrder) {
    right = <Badge tone="success">{(fg) => <Big fg={fg}>Pick now</Big>}</Badge>;
  } else if (isPreparingExpired) {
    right = (
      <Badge tone="warning">
        {(fg) => (
          <>
            <Small fg={fg}>Order</Small>
            <Big fg={fg}>Preparing</Big>
          </>
        )}
      </Badge>
    );
  } else if (rawStatus === 'reached_drop' || orderStatus === 'reached_drop' || rawPhase === 'at_drop') {
    right = (
      <Badge tone="success">
        {(fg) => (
          <>
            <Small fg={fg}>Rider</Small>
            <Big fg={fg}>Arrived!</Big>
          </>
        )}
      </Badge>
    );
  } else {
    right = (
      <Badge solid>
        {(fg) => (
          <>
            <Small fg={fg}>{isTakeawayOrDining ? 'Ready in' : 'Arriving in'}</Small>
            <Big fg={fg}>{timeRemaining !== null && timeRemaining > 0 ? `${timeRemaining} min` : '--'}</Big>
          </>
        )}
      </Badge>
    );
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: (hasBottomNav ? 175 : 24) + insets.bottom },
        { opacity: slide, transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }] },
      ]}
    >
      <View style={styles.card}>
        <Press
          scale={1}
          onPress={() => navigateTo(`/food/user/orders/${activeOrder.id || activeOrder._id || activeOrder.orderId}`)}
          accessibilityLabel={`${restaurantName}. ${statusText}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}
        >
          <CookingAnimation />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>{restaurantName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: 2 }}>
              <Text style={styles.status} numberOfLines={1}>{statusText}</Text>
              <ChevronRight size={14} color={GREEN} />
            </View>
          </View>
          {right}
        </Press>
        <IconButton icon={X} label="Dismiss" size={32} iconSize={16} variant="soft" iconColor={color.textMuted} onPress={() => setDismissedKey(currentOrderKey)} style={styles.close} />
      </View>
    </Animated.View>
  );
}

/** Port of components/user/OrderTrackingCard.jsx: the live order strip on the home screen. */
function OrderTrackingCardInner({ hasBottomNav = true }) {
  const { orders: contextOrders } = useOrders();
  const { orderType } = useProfile();
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [apiOrders, setApiOrders] = useState([]);
  const [hasFetchedApi, setHasFetchedApi] = useState(false);
  const [activeOrderOverride, setActiveOrderOverride] = useState(null);
  const lastRefreshRef = useRef(0);
  const lastApiFingerprintRef = useRef('');
  const activeOrderKeyRef = useRef('');
  const activeOrderSnapshotRef = useRef(null);
  const [invalidOrderIds, setInvalidOrderIds] = useState(new Set());
  const verifyingKeysRef = useRef(new Set());
  const lastVerifyTimeRef = useRef({});
  const isFetchingOrdersRef = useRef(false);
  const lastFetchOrdersTimeRef = useRef(0);

  const fetchOrders = useCallback(async () => {
    if (!isModuleAuthenticated('user')) {
      setHasFetchedApi(true);
      return;
    }
    if (isFetchingOrdersRef.current) return;
    if (Date.now() - lastFetchOrdersTimeRef.current < 2000) return;
    isFetchingOrdersRef.current = true;
    try {
      const response = await orderAPI.getOrders({ limit: 10, page: 1 });
      let nextOrders = [];
      if (response?.data?.success && response?.data?.data?.orders) nextOrders = response.data.data.orders;
      else if (response?.data?.orders) nextOrders = response.data.orders;
      else if (response?.data?.data?.data && Array.isArray(response.data.data.data)) nextOrders = response.data.data.data;
      else if (response?.data?.data?.docs && Array.isArray(response.data.data.docs)) nextOrders = response.data.data.docs;
      else if (response?.data?.data && Array.isArray(response.data.data)) nextOrders = response.data.data;
      const list = Array.isArray(nextOrders) ? nextOrders : [];
      const fp = ordersFingerprint(list);
      if (fp !== lastApiFingerprintRef.current) {
        lastApiFingerprintRef.current = fp;
        setApiOrders(list);
      }
    } catch (error) {
      if (error?.response?.status === 401) {
        localStore.removeItem('user_accessToken');
        localStore.removeItem('accessToken');
      }
      if (lastApiFingerprintRef.current !== '') {
        lastApiFingerprintRef.current = '';
        setApiOrders([]);
      }
    } finally {
      lastFetchOrdersTimeRef.current = Date.now();
      isFetchingOrdersRef.current = false;
      setHasFetchedApi(true);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 60000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const uniqueOrders = useMemo(() => {
    const isMongoObjectId = (value) => /^[a-f0-9]{24}$/i.test(String(value || ''));
    const serverKeys = new Set((apiOrders || []).map((o) => String(getOrderKey(o) || '')).filter(Boolean));
    const seen = new Set();
    return [...apiOrders, ...contextOrders].filter((order) => {
      const key = getOrderKey(order);
      if (!key || seen.has(key)) return false;
      if (invalidOrderIds.has(key)) return false;
      if (hasFetchedApi && isMongoObjectId(key) && !serverKeys.has(String(key))) return false;
      seen.add(key);
      return true;
    });
  }, [contextOrders, apiOrders, invalidOrderIds, hasFetchedApi]);

  const activeOrder = useMemo(() => {
    const currentTabType = orderType || 'delivery';
    const filtered = uniqueOrders.filter((order) => (order?.orderType || 'delivery') === currentTabType);
    const candidate = filtered.find((order) => isActiveOrder(order)) || null;
    if (!candidate) return null;
    const overrideKey = getOrderKey(activeOrderOverride);
    const candidateKey = getOrderKey(candidate);
    if (overrideKey && candidateKey && overrideKey === candidateKey) return activeOrderOverride;
    return candidate;
  }, [uniqueOrders, activeOrderOverride, orderType]);

  useEffect(() => {
    activeOrderKeyRef.current = String(getOrderKey(activeOrder) || '');
    activeOrderSnapshotRef.current = activeOrder;
  }, [activeOrder]);

  useEffect(() => {
    const handleOrderStatusNotification = async (event) => {
      const detail = event?.detail || {};
      const incomingKey = String(detail?.orderMongoId || detail?.orderId || '').trim();
      const currentKey = activeOrderKeyRef.current;
      if (!incomingKey || !currentKey) return;
      if (incomingKey !== currentKey) return;
      const snap = activeOrderSnapshotRef.current;
      setActiveOrderOverride((prev) => ({
        ...(prev || snap || {}),
        orderStatus: detail?.orderStatus || prev?.orderStatus || snap?.orderStatus,
        deliveryState: detail?.deliveryState ? { ...(prev?.deliveryState || snap?.deliveryState || {}), ...detail.deliveryState } : prev?.deliveryState || snap?.deliveryState,
        status: detail?.status || prev?.status || snap?.status,
      }));
      const now = Date.now();
      if (now - lastRefreshRef.current < 1500) return;
      lastRefreshRef.current = now;
      try {
        const response = await orderAPI.getOrderDetails(incomingKey);
        const fresh = response?.data?.data?.order || response?.data?.order || response?.data?.data || null;
        if (fresh) setActiveOrderOverride(fresh);
      } catch (error) {
        if (error?.response?.status === 404 || error?.response?.status === 400) {
          setInvalidOrderIds((prev) => new Set(prev).add(incomingKey));
        }
      }
    };
    const handleOrderPlaced = () => {
      fetchOrders();
    };
    events.on('orderStatusNotification', handleOrderStatusNotification);
    events.on('order-placed', handleOrderPlaced);
    return () => {
      events.off('orderStatusNotification', handleOrderStatusNotification);
      events.off('order-placed', handleOrderPlaced);
    };
  }, [fetchOrders]);

  useEffect(() => {
    if (!activeOrder) {
      setTimeRemaining((prev) => (prev !== null ? null : prev));
      return undefined;
    }
    const tick = () => {
      const next = getTimeRemaining(activeOrder);
      setTimeRemaining((prev) => (prev === next ? prev : next));
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [activeOrder]);

  useEffect(() => {
    const key = getOrderKey(activeOrder);
    if (!key || invalidOrderIds.has(key)) return;
    if (apiOrders.some((o) => getOrderKey(o) === key)) return;
    if (verifyingKeysRef.current.has(key)) return;
    if (Date.now() - (lastVerifyTimeRef.current[key] || 0) < 8000) return;
    (async () => {
      verifyingKeysRef.current.add(key);
      lastVerifyTimeRef.current[key] = Date.now();
      try {
        await orderAPI.getOrderDetails(key);
      } catch (error) {
        if (error?.response?.status === 404 || error?.response?.status === 400) {
          setInvalidOrderIds((prev) => new Set(prev).add(key));
        }
      } finally {
        verifyingKeysRef.current.delete(key);
      }
    })();
  }, [activeOrder, apiOrders, invalidOrderIds]);

  const [dismissedKey, setDismissedKey] = useState(null);

  const shouldShow = useMemo(() => {
    if (!activeOrder) return false;
    const key = activeOrder.id || activeOrder._id || activeOrder.orderId;
    if (dismissedKey === key) return false;
    const status = getOrderStatus(activeOrder) || 'preparing';
    const phase = getOrderPhase(activeOrder);
    if (TERMINAL_STATUSES.has(status) || phase === 'cancelled' || phase === 'canceled') return false;
    return true;
  }, [activeOrder, dismissedKey]);

  const currentOrderKey = activeOrder ? activeOrder.id || activeOrder._id || activeOrder.orderId : null;
  const restaurantName = useMemo(() => {
    if (!activeOrder) return 'Restaurant';
    return activeOrder.restaurant || activeOrder.restaurantName || activeOrder.restaurantId?.restaurantName || activeOrder.restaurantId?.name || 'Restaurant';
  }, [activeOrder]);

  const orderStatus = activeOrder ? getOrderStatus(activeOrder) : 'preparing';
  const orderPhase = activeOrder ? getOrderPhase(activeOrder) : '';

  const isPreparingExpired = useMemo(() => {
    const s = String(orderStatus);
    const isPreparing = s === 'preparing' || s === 'accepted' || s === 'processed';
    return isPreparing && activeOrder?.preparationTime && activeOrder?.acceptedAt && timeRemaining !== null && timeRemaining <= 0;
  }, [orderStatus, activeOrder, timeRemaining]);

  const statusText = useMemo(() => {
    if (!activeOrder) return '';
    const s = String(orderStatus);
    const p = String(orderPhase);
    if (s === 'confirmed' || s === 'placed' || s === 'created' || s === 'pending') return 'Waiting for restaurant to accept';
    if (s === 'preparing' || s === 'accepted' || s === 'processed') {
      if (activeOrder?.preparationTime && activeOrder?.acceptedAt && timeRemaining !== null && timeRemaining <= 0) return 'Waiting for restaurant';
      return 'Preparing your order';
    }
    if (s === 'ready_for_pickup' || s === 'ready') return 'Ready for pickup';
    if (s === 'reached_pickup' || p === 'at_pickup') return 'Delivery partner reached restaurant';
    if (s === 'picked_up' || p === 'en_route_to_delivery' || s === 'out_for_delivery') return 'On the way';
    if (s === 'reached_drop' || p === 'at_drop' || s === 'at_drop') return 'Arrived near you';
    if (s === 'delivered' || p === 'delivered' || p === 'completed') return 'Delivered';
    return 'Waiting for restaurant to accept';
  }, [activeOrder, orderStatus, orderPhase, timeRemaining]);

  if (!shouldShow) return null;
  return (
    <TrackingCardContent
      key={String(currentOrderKey)}
      activeOrder={activeOrder}
      currentOrderKey={currentOrderKey}
      hasBottomNav={hasBottomNav}
      timeRemaining={timeRemaining}
      statusText={statusText}
      restaurantName={restaurantName}
      orderStatus={orderStatus}
      orderType={orderType}
      isPreparingExpired={isPreparingExpired}
      setDismissedKey={setDismissedKey}
    />
  );
}

const OrderTrackingCard = memo(OrderTrackingCardInner);
export default OrderTrackingCard;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 40 },
  card: { backgroundColor: color.surface, borderRadius: radii.lg, padding: space.md, paddingTop: space.lg, borderWidth: 1, borderColor: color.border, ...elevation.float },
  close: { position: 'absolute', top: -space.md, right: -space.sm, zIndex: 20, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  cook: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: color.primarySoft },
  name: { ...type.subheading, color: color.text },
  status: { ...type.small, color: color.textSecondary, flexShrink: 1 },
  badge: { borderRadius: radii.md, paddingHorizontal: space.md, paddingVertical: space.sm, alignItems: 'center', justifyContent: 'center', minWidth: 84 },
});
