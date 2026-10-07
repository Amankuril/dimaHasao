import { Component, useEffect, useMemo } from 'react';
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import {
  AlertCircle, ArrowLeft, Bike, Calendar, Check, ChevronRight, Clock, MapPin, MessageSquare, Navigation, Phone, Receipt, RefreshCw, Share2, Shield, ShoppingBag, Star,
  Store, User, Users, UtensilsCrossed, X,
} from 'lucide-react-native';
import Image from '../../components/Img';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { Button, Card, EmptyState, IconButton, StatusBadge } from '../../components/ds';
import { NAV_CLEARANCE, isImmersiveRoute } from '../../components/dh/AppBottomNav';
import { useOrderTracking } from '../hooks/pages/useOrderTracking';
import DeliveryTrackingMap from '../components/DeliveryTrackingMap';
import { BillRow, Divider, Field, Radio } from '../components/cart/parts';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { color, elevation, radii, space, tone as tones, type } from '../../theme';

const toPoint = (coords) => {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

class MapErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.mapFallback}>
          <MapPin size={22} color={color.textMuted} />
          <Text style={[type.small, { color: color.textSecondary, textAlign: 'center' }]}>Live map unavailable right now</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

/** Web: DeliveryMap wrapper. Works out the two ends of the route, then draws the live map. */
function DeliveryMap({ orderId, order, fallbackCustomerCoords, userLiveCoords, onEtaUpdate }) {
  const restaurantCoords = useMemo(() => {
    let coords = null;
    if (Array.isArray(order?.restaurantLocation?.coordinates) && order.restaurantLocation.coordinates.length >= 2) coords = order.restaurantLocation.coordinates;
    else if (Array.isArray(order?.restaurantId?.location?.coordinates) && order.restaurantId.location.coordinates.length >= 2) coords = order.restaurantId.location.coordinates;
    else if (order?.restaurantId?.location?.latitude && order?.restaurantId?.location?.longitude) coords = [order.restaurantId.location.longitude, order.restaurantId.location.latitude];
    const point = toPoint(coords);
    if (point) return point;
    const lat = Number(order?.restaurantId?.location?.latitude || order?.restaurant?.location?.latitude);
    const lng = Number(order?.restaurantId?.location?.longitude || order?.restaurant?.location?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }, [order?.restaurantId, order?.restaurantLocation, order?.restaurant]);

  const customerCoords = useMemo(() => {
    const point = toPoint(order?.address?.coordinates || order?.address?.location?.coordinates);
    if (point) return point;
    if (fallbackCustomerCoords && Number.isFinite(fallbackCustomerCoords.lat) && Number.isFinite(fallbackCustomerCoords.lng)) return fallbackCustomerCoords;
    return null;
  }, [order?.address, fallbackCustomerCoords]);

  const live = userLiveCoords && Number.isFinite(userLiveCoords.lat) && Number.isFinite(userLiveCoords.lng) ? userLiveCoords : null;
  const effectiveCustomer = (order?.orderType === 'takeaway' && live) || customerCoords || live || restaurantCoords;
  const effectiveRestaurant = restaurantCoords || effectiveCustomer;
  const ids = useMemo(() => [order?.orderId, order?.mongoId, order?._id, orderId, order?.id].filter(Boolean), [order?.orderId, order?.mongoId, order?._id, orderId, order?.id]);

  if (!orderId || !order || !effectiveRestaurant || !effectiveCustomer) {
    return <View style={[styles.mapBox, { backgroundColor: color.surfaceMuted }]} />;
  }
  return (
    <View style={styles.mapBox}>
      <DeliveryTrackingMap orderId={orderId} orderTrackingIds={ids} restaurantCoords={effectiveRestaurant} customerCoords={effectiveCustomer} order={order} onEtaUpdate={onEtaUpdate} />
    </View>
  );
}

function Pulse({ children, style }) {
  const v = useAnimatedValue(0);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }]}>{children}</Animated.View>;
}

/** Takeaway / dining orders have no rider to follow: an illustration panel stands where the map would be. */
function PickupPanel({ dining, ready }) {
  return (
    <View style={styles.pickupPanel}>
      <Text style={[type.overline, { color: color.gold }]}>{dining ? 'Dining · table service' : 'Order, eat, enjoy'}</Text>
      <Pulse style={styles.pickupIcon}>{dining ? <UtensilsCrossed size={40} color={color.goldOnDark} /> : <ShoppingBag size={40} color={color.goldOnDark} />}</Pulse>
      <Text style={[type.heading, { color: color.textInverse, textAlign: 'center' }]}>{dining ? 'Food will be served at your table' : 'With takeaway self pickup'}</Text>
      <Text style={[type.small, { color: color.textOnDarkMuted, textAlign: 'center', marginTop: space.xs }]}>
        {dining ? 'Sit back and relax. Our server will bring your fresh hot meal directly to you shortly.' : ready ? 'Please collect your order from the counter' : 'We will let you know when it is ready'}
      </Text>
    </View>
  );
}

function SectionItem({ Icon, iconNode, title, subtitle, onPress, showArrow = true, last }) {
  return (
    <Press
      scale={onPress ? 0.99 : 1}
      disabled={!onPress}
      onPress={onPress}
      accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}
      style={[styles.sectionItem, last ? { borderBottomWidth: 0 } : null]}
    >
      <View style={styles.sectionIcon}>{iconNode || <Icon size={20} color={color.primary} />}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.small, { color: color.textSecondary }]} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {showArrow ? <ChevronRight size={20} color={color.textDisabled} /> : null}
    </Press>
  );
}

function Stars({ value, size = 14, onChange, label }) {
  return (
    <View style={{ flexDirection: 'row', gap: onChange ? space.xs : 2, justifyContent: 'center' }} accessibilityRole={onChange ? 'radiogroup' : undefined} accessibilityLabel={label || `${value || 0} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const on = star <= (value || 0);
        const icon = <Star size={size} color={on ? color.gold : color.borderStrong} fill={on ? color.gold : 'none'} />;
        return onChange ? (
          <Press key={star} scale={0.9} onPress={() => onChange(star)} accessibilityRole="radio" accessibilityState={{ checked: value === star }} accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`} style={styles.starBtn}>
            {icon}
          </Press>
        ) : (
          <View key={star}>{icon}</View>
        );
      })}
    </View>
  );
}

/** Vertical step timeline: done steps green with a tick, the current step ringed, later steps muted. */
function Timeline({ steps, current }) {
  return (
    <View style={{ marginTop: space.lg }} accessibilityRole="list">
      {steps.map((label, i) => {
        const done = i < current;
        const now = i === current;
        const last = i === steps.length - 1;
        return (
          <View key={label} style={styles.tlRow} accessible accessibilityLabel={`${label}${done ? ', done' : now ? ', current step' : ''}`}>
            <View style={styles.tlRail}>
              <View style={[styles.tlDot, done && styles.tlDotDone, now && styles.tlDotNow]}>{done ? <Check size={12} color={color.onPrimary} strokeWidth={3} /> : null}</View>
              {!last ? <View style={[styles.tlLine, done && { backgroundColor: color.primary }]} /> : null}
            </View>
            <Text style={[now ? type.bodyStrong : type.body, { color: done || now ? color.text : color.textMuted, paddingBottom: last ? 0 : space.md }]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const addressLine = (address) => {
  if (!address) return '';
  if (address.formattedAddress && address.formattedAddress !== 'Select location') return address.formattedAddress;
  return [address.street, address.additionalDetails, address.city, address.state, address.zipCode].filter(Boolean).join(', ');
};

/** Port of pages/user/orders/OrderTracking.jsx (logic: useOrderTracking). */
export default function OrderTracking() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { height } = useWindowDimensions();
  const t = useOrderTracking();
  const {
    navigate, location, orderId, profile, order, loading, error, showConfirmation, orderStatus, estimatedTime, isRefreshing, showCancelDialog, setShowCancelDialog,
    showOrderDetails, setShowOrderDetails, cancellationReason, setCancellationReason, refundDestination, setRefundDestination, isCancelling,
    isInstructionsModalOpen, setIsInstructionsModalOpen, deliveryInstructions, setDeliveryInstructions, isUpdatingInstructions, showRatingModal,
    setShowRatingModal, selectedRestaurantRating, setSelectedRestaurantRating, selectedDeliveryRating, setSelectedDeliveryRating, restaurantFeedbackText,
    setRestaurantFeedbackText, deliveryFeedbackText, setDeliveryFeedbackText, submittingRating, isLocalRated, hasDeliveryPartner, isOrderRated, handleOpenRating,
    handleBackClick, handleSubmitRating, handleEtaUpdate, defaultAddress, fallbackCustomerCoords, userLiveCoords, isAdminAccepted, handleCallRestaurant,
    handleOpenDirections, handleCallRider, customerDeliveryOtp, handleCancelOrder, handleConfirmCancel, handleUpdateInstructions, handleShare, handleRefresh,
  } = t;

  const spin = useAnimatedValue(0);
  useEffect(() => {
    if (!isRefreshing) return;
    spin.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [isRefreshing, spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (loading) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center', padding: space.lg }]} accessibilityRole="progressbar" accessibilityLabel="Loading order details">
        <ActivityIndicator size="large" color={color.primary} />
        <Text style={[type.body, { color: color.textSecondary, marginTop: space.lg }]}>Loading order details...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[styles.screen, { justifyContent: 'center' }]}>
        <EmptyState icon={AlertCircle} title="Order not found" message={error || "The order you're looking for doesn't exist."} actionLabel="Back to orders" onAction={() => navigate('/user/orders')} />
      </View>
    );
  }

  const pickup = order?.orderType === 'takeaway' || order?.orderType === 'dining';
  const eta = typeof estimatedTime === 'number' ? estimatedTime : null;
  const statusConfig = {
    placed: { title: 'Order Placed', subtitle: 'Waiting for restaurant to accept', iconType: 'food' },
    confirmed: { title: 'Order Placed', subtitle: 'Waiting for restaurant to accept', iconType: 'food' },
    preparing: {
      title: 'Food is being prepared',
      subtitle: pickup
        ? eta == null ? 'Cooking your meal' : eta <= 0 ? 'Waiting for restaurant to mark ready' : `Ready for pickup in ${eta} mins`
        : eta == null ? 'Cooking your meal' : eta <= 0 ? 'Arriving soon' : `Arriving in ${eta} mins`,
      iconType: 'food',
    },
    assigned: { title: 'Rider is arriving', subtitle: 'A delivery partner is arriving at the restaurant', iconType: 'rider' },
    at_pickup: { title: 'Rider at restaurant', subtitle: 'Rider is waiting for your order', iconType: 'rider' },
    ready: {
      title: pickup ? 'Ready for pickup' : 'Handover in progress',
      subtitle: pickup ? 'Please collect your order from the restaurant' : 'Rider is picking up your order',
      iconType: pickup ? 'delivered' : 'rider',
    },
    on_way: { title: 'Out for delivery', subtitle: eta == null ? 'Rider is out for delivery' : eta <= 0 ? 'Arriving soon' : `Arriving in ${eta} mins`, iconType: 'rider' },
    at_drop: { title: 'Arrived at location', subtitle: 'Please come to the door', iconType: 'rider' },
    delivered: { title: order?.orderType === 'takeaway' ? 'Picked up' : 'Order delivered', subtitle: order?.orderType === 'takeaway' ? 'Thank you for ordering!' : 'Enjoy your meal!', iconType: 'delivered' },
    cancelled: {
      title: order?.orderType === 'takeaway' ? 'Takeaway order cancelled' : order?.orderType === 'dining' ? 'Dining order cancelled' : 'Order cancelled',
      subtitle: order?.cancellationReason || 'This order has been cancelled',
      red: true,
      iconType: 'cancelled',
    },
  };
  const currentStatus = statusConfig[orderStatus] || statusConfig.placed;
  const isScheduledOrder = Boolean(order?.scheduledAt) && !['delivered', 'cancelled'].includes(orderStatus);
  const scheduledDateFormatted = order?.scheduledAt
    ? new Date(order.scheduledAt).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;
  const isDeliveredOrder = orderStatus === 'delivered' || order?.status === 'delivered' || Boolean(order?.deliveredAt);
  const scheduledWaiting = isScheduledOrder && ['placed', 'confirmed'].includes(orderStatus);
  const active = orderStatus !== 'delivered' && orderStatus !== 'cancelled';
  const takeaway = order?.orderType === 'takeaway';
  const safety = () => navigate('/user/profile/report-safety-emergency', { state: { returnTo: location.pathname } });
  const payMethod = String(order?.payment?.method || order?.paymentMethod || '').toLowerCase();
  const payStatus = String(order?.payment?.status || '').toLowerCase();
  const isRazorpayPaid = payMethod === 'razorpay' && ['paid', 'authorized', 'captured', 'settled', 'refunded'].includes(payStatus);
  const statusIcon = {
    rider: { tone: 'info', Icon: Bike },
    cancelled: { tone: 'danger', Icon: X },
    delivered: { tone: 'success', Icon: Check },
    food: { tone: 'warning', Icon: UtensilsCrossed },
  }[currentStatus.iconType];
  // Badge word + tone for the current status (DESIGN_SYSTEM state table).
  const badge = {
    placed: { tone: 'info', label: 'Placed' },
    confirmed: { tone: 'info', label: 'Placed' },
    preparing: { tone: 'warning', label: 'Preparing' },
    assigned: { tone: 'warning', label: 'Rider assigned' },
    at_pickup: { tone: 'warning', label: 'Rider at restaurant' },
    ready: pickup ? { tone: 'primary', label: 'Ready' } : { tone: 'info', label: 'Picking up' },
    on_way: { tone: 'info', label: 'On the way' },
    at_drop: { tone: 'info', label: 'Arrived' },
    delivered: { tone: 'success', label: takeaway ? 'Picked up' : 'Delivered' },
    cancelled: { tone: 'danger', label: 'Cancelled' },
  }[orderStatus] || { tone: 'info', label: 'Placed' };
  // Step timeline (display only, derived from orderStatus).
  const steps = pickup ? ['Order placed', 'Preparing', 'Ready for pickup', order?.orderType === 'dining' ? 'Served' : 'Picked up'] : ['Order placed', 'Preparing', 'On the way', 'Delivered'];
  const stepIndex = { placed: 0, confirmed: 0, preparing: 1, assigned: 1, at_pickup: 1, ready: pickup ? 2 : 1, on_way: 2, at_drop: 2, delivered: 4 }[orderStatus] ?? 0;
  const showRefresh = scheduledWaiting || !['at_pickup', 'ready', 'on_way', 'at_drop', 'delivered'].includes(orderStatus);
  const refreshBtn = (
    <IconButton icon={RefreshCw} label="Refresh order status" variant="soft" onPress={handleRefresh}>
      {null}
    </IconButton>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon={ArrowLeft} label="Go back" onPress={handleBackClick} />
        <Text style={[type.heading, { color: color.text, flex: 1 }]} numberOfLines={1} accessibilityRole="header">
          {order.restaurant}
        </Text>
        <IconButton icon={Share2} label="Share order" onPress={handleShare} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: (isImmersiveRoute(pathname) ? 0 : NAV_CLEARANCE) + insets.bottom + space.xxl }}>
        {/* Status */}
        <Card>
          {scheduledWaiting ? (
            <>
              <View style={styles.statusTop}>
                <StatusBadge tone="info" icon={Clock} label="Scheduled order" />
                <Animated.View style={{ transform: [{ rotate }] }}>{refreshBtn}</Animated.View>
              </View>
              <Text style={[type.heading, { color: color.text, marginTop: space.sm }]}>Order scheduled</Text>
              <View style={[styles.row, { marginTop: space.xs }]}>
                <Calendar size={16} color={color.primary} />
                <Text style={[type.bodyStrong, { color: color.text }]}>{scheduledDateFormatted}</Text>
              </View>
              <Text style={[type.small, { color: color.textMuted, marginTop: space.sm }]}>The restaurant will start preparing your order closer to the scheduled time</Text>
            </>
          ) : (
            <>
              <View style={styles.statusTop}>
                <View style={[styles.statusIcon, { backgroundColor: tones[statusIcon.tone].bg }]}>
                  <statusIcon.Icon size={26} color={tones[statusIcon.tone].fg} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                  <StatusBadge tone={badge.tone} label={badge.label} />
                  <Text style={[type.heading, { color: color.text }]} accessibilityLiveRegion="polite">
                    {currentStatus.title}
                  </Text>
                </View>
                {showRefresh ? <Animated.View style={{ transform: [{ rotate }] }}>{refreshBtn}</Animated.View> : null}
              </View>
              <Text style={[type.body, { color: currentStatus.red ? color.danger : color.textSecondary, marginTop: space.sm }]}>{currentStatus.subtitle}</Text>
              {orderStatus !== 'cancelled' ? <Timeline steps={steps} current={stepIndex} /> : null}
            </>
          )}
        </Card>

        {!isDeliveredOrder && orderStatus !== 'cancelled' && !scheduledWaiting ? (
          pickup ? (
            <PickupPanel dining={order?.orderType === 'dining'} ready={orderStatus === 'ready'} />
          ) : (
            <MapErrorBoundary>
              <DeliveryMap orderId={orderId} order={order} fallbackCustomerCoords={fallbackCustomerCoords} userLiveCoords={userLiveCoords} onEtaUpdate={handleEtaUpdate} />
            </MapErrorBoundary>
          )
        ) : null}

        {customerDeliveryOtp && active ? (
          <View style={styles.otp}>
            <Text style={[type.overline, { color: color.goldText }]}>{takeaway ? 'Takeaway OTP' : 'Delivery OTP'}</Text>
            <Text style={styles.otpCode} selectable accessibilityLabel={`OTP ${String(customerDeliveryOtp).split('').join(' ')}`}>
              {customerDeliveryOtp}
            </Text>
            <Text style={[type.small, { color: color.textSecondary }]}>
              {takeaway ? 'Share this 4-digit OTP with the restaurant at the counter to verify and complete your pick-up.' : 'Share this 4-digit OTP with your delivery partner at drop-off.'}
            </Text>
          </View>
        ) : null}

        {takeaway && orderStatus !== 'ready' && active ? (
          <Card style={styles.inlineCard}>
            <View style={styles.roundIcon}>
              <ShoppingBag size={20} color={color.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.bodyStrong, { color: color.text }]}>Takeaway / self pickup</Text>
              <Text style={[type.small, { color: color.textSecondary, marginTop: 2 }]}>
                {orderStatus === 'preparing' ? "Your order is being prepared. We'll notify you when it's ready." : 'Waiting for the restaurant to accept and prepare your order.'}
              </Text>
            </View>
          </Card>
        ) : null}

        {orderStatus === 'delivered' && !isOrderRated ? (
          <Card style={styles.rateCard}>
            <View style={[styles.statusIcon, { backgroundColor: color.goldSoft }]}>
              <Star size={28} color={color.gold} fill={color.gold} />
            </View>
            <Text style={[type.heading, { color: color.text, marginTop: space.md }]}>{isLocalRated ? 'Feedback received' : 'Enjoyed your food?'}</Text>
            <Text style={[type.small, { color: color.textSecondary, textAlign: 'center', marginTop: space.xs, maxWidth: 300 }]}>
              {isLocalRated ? 'Thank you for rating your experience! Your feedback has been submitted.' : `Rate your experience with ${order?.restaurant || 'The Restaurant'} and help us improve!`}
            </Text>
            {isLocalRated ? (
              <StatusBadge tone="success" icon={Check} label="Submitted" style={{ marginTop: space.lg, alignSelf: 'center' }} />
            ) : (
              <Button title="Give rating" fullWidth={false} onPress={handleOpenRating} style={{ marginTop: space.lg, alignSelf: 'center', minWidth: 200 }} />
            )}
          </Card>
        ) : null}

        {orderStatus === 'delivered' && isOrderRated ? (
          <Card>
            <View style={[styles.row, { justifyContent: 'space-between', marginBottom: space.md }]}>
              <Text style={[type.subheading, { color: color.text }]}>Your feedback</Text>
              <StatusBadge tone="success" icon={Check} label="Rating submitted" />
            </View>
            <View style={{ gap: space.md }}>
              <View style={styles.feedbackRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.label, { color: color.text }]} numberOfLines={1}>
                    {order?.restaurant || 'Food & Restaurant'}
                  </Text>
                  {order?.ratings?.restaurant?.comment ? (
                    <Text style={[type.caption, { color: color.textMuted }]} numberOfLines={2}>
                      &quot;{order.ratings.restaurant.comment}&quot;
                    </Text>
                  ) : null}
                </View>
                <Stars value={order?.ratings?.restaurant?.rating || order?.restaurantRating} />
              </View>
              {hasDeliveryPartner ? (
                <View style={styles.feedbackRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[type.label, { color: color.text }]}>Delivery service</Text>
                    {order?.ratings?.deliveryPartner?.comment ? (
                      <Text style={[type.caption, { color: color.textMuted }]} numberOfLines={2}>
                        &quot;{order.ratings.deliveryPartner.comment}&quot;
                      </Text>
                    ) : null}
                  </View>
                  <Stars value={order?.ratings?.deliveryPartner?.rating || order?.deliveryPartnerRating} />
                </View>
              ) : null}
            </View>
          </Card>
        ) : null}

        {order?.deliveryPartnerId ? (
          <Card padded={false}>
            <View style={styles.partnerRow}>
              <View style={styles.avatar}>
                {order.deliveryPartner?.avatar ? <Image source={{ uri: order.deliveryPartner.avatar }} style={{ width: '100%', height: '100%' }} /> : <Bike size={24} color={color.primary} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={1}>
                  {order.deliveryPartner?.name || 'Delivery Partner'}
                </Text>
                <Text style={[type.small, { color: color.textSecondary }]}>{orderStatus === 'delivered' ? 'Delivered your order' : 'Your delivery partner is arriving'}</Text>
              </View>
              <IconButton icon={Phone} label="Call delivery partner" variant="primary" onPress={handleCallRider} />
            </View>
            {order?.note ? (
              <View style={styles.note}>
                <MessageSquare size={16} color={color.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.caption, { color: color.textMuted }]}>Instruction for rider</Text>
                  <Text style={[type.small, { color: color.text }]}>&quot;{order.note}&quot;</Text>
                </View>
              </View>
            ) : null}
          </Card>
        ) : null}

        {active && !pickup ? (
          <Card padded={false}>
            <SectionItem Icon={Shield} title="Learn about delivery partner safety" onPress={safety} last />
          </Card>
        ) : null}

        {active && !pickup ? <Text style={[type.overline, { color: color.textMuted, marginTop: space.sm }]}>All your delivery details in one place</Text> : null}

        {!takeaway ? (
          <Card padded={false}>
            <SectionItem
              Icon={User}
              title={order?.userName || order?.userId?.fullName || order?.userId?.name || profile?.fullName || profile?.name || 'Customer'}
              subtitle={order?.userPhone || order?.userId?.phone || profile?.phone || defaultAddress?.phone || 'Phone number not available'}
              showArrow={false}
            />
            <SectionItem
              Icon={order?.orderType === 'dining' ? Users : MapPin}
              title={order?.orderType === 'dining' ? 'Dining / table service' : 'Delivery at location'}
              subtitle={order?.orderType === 'dining' ? 'Enjoy your food in the restaurant. Table service.' : addressLine(order?.address) || addressLine(defaultAddress) || 'Add delivery address'}
              showArrow={false}
              last={!(!isAdminAccepted && active && order?.orderType !== 'dining')}
            />
            {!isAdminAccepted && active && order?.orderType !== 'dining' ? (
              <SectionItem
                last
                Icon={MessageSquare}
                title={order?.note ? 'Edit delivery instructions' : 'Add delivery instructions'}
                subtitle={order?.note ? order.note.substring(0, 35) + (order.note.length > 35 ? '...' : '') : ''}
                onPress={() => {
                  setDeliveryInstructions(order?.note || '');
                  setIsInstructionsModalOpen(true);
                }}
              />
            ) : null}
          </Card>
        ) : null}

        <Card padded={false}>
          <View style={styles.partnerRow}>
            <View style={styles.avatar}>
              <Store size={24} color={color.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={2}>
                {order.restaurant}
              </Text>
              <Text style={[type.small, { color: color.textSecondary }]} numberOfLines={2}>
                {order.restaurantAddress || 'Restaurant location'}
              </Text>
            </View>
            <IconButton icon={Navigation} label="Get directions to the restaurant" variant="primary" onPress={handleOpenDirections} />
            <IconButton icon={Phone} label="Call restaurant" variant="primary" onPress={handleCallRestaurant} />
          </View>
          <Press scale={0.99} onPress={() => setShowOrderDetails(true)} accessibilityLabel="View order details" style={styles.itemsRow}>
            <Receipt size={20} color={color.primary} />
            <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
              {order?.items?.map((item, index) => (
                <Text key={index} style={[type.body, { color: color.text }]}>
                  <Text style={{ color: color.textMuted }}>{item.quantity} × </Text>
                  {item.name}
                  {item.variantName ? ` (${item.variantName})` : ''}
                </Text>
              ))}
              <Text style={[type.label, { color: color.primary }]}>View order details</Text>
            </View>
            <ChevronRight size={20} color={color.textDisabled} />
          </Press>
        </Card>

        {!isAdminAccepted && active ? (
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            <Button title="Cancel order" variant="dangerSoft" onPress={handleCancelOrder} accessibilityLabel="Cancel order" />
            <Text style={[type.caption, { color: color.textMuted, textAlign: 'center' }]}>You can cancel your order until the restaurant accepts it.</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* "Order Placed!" interstitial */}
      <Modal visible={!!showConfirmation} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <View style={[styles.confirm, { paddingBottom: insets.bottom }]}>
          <View style={styles.confirmCheck}>
            <Check size={48} color={color.onPrimary} strokeWidth={3} />
          </View>
          <Text style={[type.heroSerif, { color: color.primary, marginTop: space.xxl, textAlign: 'center' }]}>{isScheduledOrder ? 'Order scheduled' : 'Order placed'}</Text>
          <Text style={[type.body, { color: color.textSecondary, marginTop: space.sm, textAlign: 'center' }]}>
            {isScheduledOrder ? `Scheduled for ${scheduledDateFormatted}` : 'Waiting for the restaurant to accept your order'}
          </Text>
          <ActivityIndicator size="small" color={color.primary} style={{ marginTop: space.xxxl }} />
          <Text style={[type.small, { color: color.textMuted, marginTop: space.md }]}>Loading order details...</Text>
          <Button title="Learn about delivery partner safety" icon={Shield} variant="ghost" onPress={safety} style={{ marginTop: space.xxxl }} />
        </View>
      </Modal>

      {/* Cancel order */}
      <Dialog visible={showCancelDialog} onClose={() => !isCancelling && setShowCancelDialog(false)} backdrop={color.overlay} panelStyle={styles.dialog}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : undefined}>
          <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">
            Cancel order
          </Text>
          <View style={{ gap: space.lg, paddingTop: space.lg }}>
            {isRazorpayPaid ? (
              <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
                <Text style={[type.label, { color: color.text }]}>Refund preference</Text>
                {[
                  ['source', 'Refund to original payment method (5-7 working days)'],
                  ['wallet', 'Refund to wallet (instant credit)'],
                ].map(([value, label]) => {
                  const on = refundDestination === value;
                  return (
                    <Press
                      key={value}
                      scale={0.99}
                      disabled={isCancelling}
                      onPress={() => setRefundDestination(value)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={label}
                      style={[styles.radioRow, on ? styles.radioRowOn : null]}
                    >
                      <Radio checked={on} />
                      <Text style={[type.small, { flex: 1, color: color.text }]}>{label}</Text>
                    </Press>
                  );
                })}
              </View>
            ) : null}
            <Field
              label="Reason for cancellation"
              value={cancellationReason}
              onChangeText={setCancellationReason}
              placeholder="e.g., Changed my mind, Wrong address, etc."
              multiline
              editable={!isCancelling}
              accessibilityLabel="Reason for cancellation"
            />
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Button
                title="Keep order"
                variant="outline"
                disabled={isCancelling}
                onPress={() => {
                  setShowCancelDialog(false);
                  setCancellationReason('');
                  setRefundDestination('source');
                }}
                accessibilityLabel="Keep order"
                style={{ flex: 1 }}
              />
              <Button
                title={isCancelling ? 'Cancelling...' : 'Cancel order'}
                variant="danger"
                loading={isCancelling}
                disabled={isCancelling || !cancellationReason.trim()}
                onPress={handleConfirmCancel}
                accessibilityLabel="Confirm cancellation"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Dialog>

      {/* Order details */}
      <Dialog visible={showOrderDetails} onClose={() => setShowOrderDetails(false)} backdrop={color.overlay} panelStyle={[styles.dialog, { padding: 0, overflow: 'hidden' }]}>
        <View style={styles.dialogHead}>
          <Text style={[type.heading, { color: color.text, flex: 1 }]} accessibilityRole="header">
            Order details
          </Text>
          <IconButton icon={X} label="Close order details" onPress={() => setShowOrderDetails(false)} />
        </View>
        <ScrollView style={{ maxHeight: height * 0.6 }} contentContainerStyle={{ padding: space.xl, gap: space.xl }}>
          <View style={[styles.row, { gap: space.lg, flexWrap: 'wrap' }]}>
            <View>
              <Text style={[type.caption, { color: color.textMuted }]}>Date & time</Text>
              <Text style={[type.bodyStrong, { color: color.text }]}>
                {order?.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
              </Text>
            </View>
            <View>
              <Text style={[type.caption, { color: color.textMuted, marginBottom: 2 }]}>Status</Text>
              <StatusBadge tone={badge.tone} label={String(order?.status === 'placed' ? 'order placed' : order?.status?.replace('_', ' ') || '').replace(/^./, (ch) => ch.toUpperCase())} />
            </View>
          </View>

          {order?.note ? (
            <View style={styles.note}>
              <MessageSquare size={18} color={color.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.caption, { color: color.textMuted }]}>Delivery instructions</Text>
                <Text style={[type.small, { color: color.text }]}>{order.note}</Text>
              </View>
            </View>
          ) : null}

          <View style={{ gap: space.md }}>
            <Text style={[type.label, { color: color.text }]}>Order items</Text>
            {order?.items?.map((item, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.bodyStrong, { color: color.text }]}>{item.name}</Text>
                  {item.variantName ? <Text style={[type.caption, { color: color.textMuted }]}>{item.variantName}</Text> : null}
                  <Text style={[type.caption, { color: color.textMuted }]}>Quantity: {item.quantity}</Text>
                </View>
                <Text style={[type.bodyStrong, { color: color.text }]}>₹{((item?.price || 0) * (item?.quantity || 0)).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.bill}>
            <Text style={[type.label, { color: color.text }]}>Bill summary</Text>
            <BillRow label="Item total" value={`₹${Number(order?.subtotal || 0).toFixed(2)}`} />
            {Number(order?.packagingFee) > 0 ? <BillRow label="Packaging charges" value={`₹${Number(order.packagingFee).toFixed(2)}`} /> : null}
            {Number(order?.platformFee) > 0 ? <BillRow label="Platform fee" value={`₹${Number(order.platformFee).toFixed(2)}`} /> : null}
            {!pickup ? <BillRow label="Delivery fee" value={`₹${Number(order?.deliveryFee || 0).toFixed(2)}`} /> : null}
            <BillRow label="GST" value={`₹${Number(order?.gst || 0).toFixed(2)}`} />
            {Number(order?.discount) > 0 ? <BillRow label="Discount applied" tone="success" value={`−₹${Number(order.discount).toFixed(2)}`} /> : null}
            <Divider />
            <BillRow
              strong
              label={`Paid ${['cash', 'cod'].includes(String(order?.payment?.method || order?.paymentMethod || 'online').toLowerCase()) ? '(COD)' : '(Online)'}`}
              value={`₹${Number(order?.totalAmount || 0).toFixed(2)}`}
            />
          </View>

          {order?.paymentMethod ? (
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <View style={styles.row}>
                <Shield size={16} color={color.textSecondary} />
                <Text style={[type.body, { color: color.textSecondary }]}>Payment method</Text>
              </View>
              <Text style={[type.bodyStrong, { color: color.text }]}>{String(order.paymentMethod).toUpperCase()}</Text>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ padding: space.lg, borderTopWidth: 1, borderTopColor: color.border }}>
          <Button title="Okay" onPress={() => setShowOrderDetails(false)} accessibilityLabel="Close order details" />
        </View>
      </Dialog>

      {/* Delivery instructions */}
      <Dialog visible={isInstructionsModalOpen} onClose={() => setIsInstructionsModalOpen(false)} backdrop={color.overlay} panelStyle={styles.dialog}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : undefined}>
          <Text style={[type.heading, { color: color.text, marginBottom: space.sm }]} accessibilityRole="header">
            Delivery instructions
          </Text>
          <View style={{ gap: space.lg }}>
            <Text style={[type.small, { color: color.textSecondary }]}>Add instructions for the delivery partner to help them find your address or know where to leave your order.</Text>
            <Field value={deliveryInstructions} onChangeText={setDeliveryInstructions} placeholder="E.g. Ring the doorbell, leave at the front desk..." multiline accessibilityLabel="Delivery instructions" inputStyle={{ minHeight: 120 }} />
            <Button title="Save instructions" loading={isUpdatingInstructions} disabled={isUpdatingInstructions} onPress={handleUpdateInstructions} accessibilityLabel="Save instructions" />
          </View>
        </KeyboardAvoidingView>
      </Dialog>

      {/* Rating */}
      <Dialog visible={showRatingModal} onClose={() => setShowRatingModal(false)} backdrop={color.overlay} panelStyle={[styles.dialog, { padding: 0 }]}>
        <ScrollView style={{ maxHeight: height * 0.85 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.xl, gap: space.xl }}>
          <View style={styles.row}>
            <Star size={22} color={color.gold} fill={color.gold} />
            <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">
              Rate your experience
            </Text>
          </View>
          <View style={{ gap: space.md }}>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <Text style={[type.subheading, { color: color.text }]}>How was the food?</Text>
              <StatusBadge tone="neutral" label="Restaurant" />
            </View>
            <Stars size={32} value={selectedRestaurantRating} onChange={setSelectedRestaurantRating} label="Food rating" />
            <Field value={restaurantFeedbackText} onChangeText={setRestaurantFeedbackText} placeholder="Write a quick review for the food (optional)" multiline accessibilityLabel="Review for the food" inputStyle={{ minHeight: 80 }} />
          </View>
          {hasDeliveryPartner ? (
            <View style={{ gap: space.md, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: color.border }}>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Text style={[type.subheading, { color: color.text }]}>How was the delivery?</Text>
                <StatusBadge tone="neutral" label="Delivery" />
              </View>
              <Stars size={32} value={selectedDeliveryRating} onChange={setSelectedDeliveryRating} label="Delivery rating" />
              <Field
                value={deliveryFeedbackText}
                onChangeText={setDeliveryFeedbackText}
                placeholder={`How was ${order?.deliveryPartnerName || 'the rider'}? (optional)`}
                multiline
                accessibilityLabel="Review for the delivery"
                inputStyle={{ minHeight: 80 }}
              />
            </View>
          ) : null}
          <View style={{ gap: space.xs }}>
            {(() => {
              const off = submittingRating || selectedRestaurantRating === null || (hasDeliveryPartner && selectedDeliveryRating === null);
              return <Button title="Submit feedback" size="lg" loading={submittingRating} disabled={off} onPress={handleSubmitRating} accessibilityLabel="Submit feedback" />;
            })()}
            <Button title="Maybe later" variant="ghost" onPress={() => setShowRatingModal(false)} accessibilityLabel="Maybe later" />
          </View>
        </ScrollView>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, paddingVertical: space.xs, minHeight: 56, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },

  statusTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  statusIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  tlRow: { flexDirection: 'row', gap: space.md },
  tlRail: { width: 22, alignItems: 'center' },
  tlDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.borderStrong, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  tlDotDone: { backgroundColor: color.primary, borderColor: color.primary },
  tlDotNow: { borderColor: color.primary, borderWidth: 6 },
  tlLine: { flex: 1, width: 2, minHeight: 14, backgroundColor: color.border, marginVertical: 2 },

  mapBox: { height: 280, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: color.border },
  mapFallback: { height: 280, borderRadius: radii.lg, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.lg },
  pickupPanel: { minHeight: 260, borderRadius: radii.lg, backgroundColor: color.primaryDeep, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  pickupIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(202,168,62,0.5)', alignItems: 'center', justifyContent: 'center', marginVertical: space.xl },

  otp: { borderRadius: radii.lg, padding: space.lg, borderWidth: 1, borderColor: color.gold, backgroundColor: color.goldSoft, gap: space.xs },
  otpCode: { ...type.priceLg, fontSize: 32, lineHeight: 40, letterSpacing: 8, color: color.text },
  inlineCard: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  roundIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },

  rateCard: { alignItems: 'center', paddingVertical: space.xxl },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  starBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },

  partnerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg, paddingRight: space.sm, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: color.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.primarySoft, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, backgroundColor: color.surfaceMuted, padding: space.md, margin: space.lg, borderRadius: radii.md },
  sectionItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, minHeight: 64, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: color.border },
  sectionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  itemsRow: { padding: space.lg, flexDirection: 'row', alignItems: 'flex-start', gap: space.md },

  confirm: { flex: 1, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxxl },
  confirmCheck: { width: 96, height: 96, borderRadius: 48, backgroundColor: color.success, alignItems: 'center', justifyContent: 'center', ...elevation.float },

  dialog: { width: '100%', maxWidth: 520, backgroundColor: color.surface, borderRadius: radii.xl, padding: space.xl, ...elevation.sheet },
  dialogHead: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.xl, paddingRight: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: color.border },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.border, padding: space.md },
  radioRowOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  bill: { backgroundColor: color.surfaceMuted, borderRadius: radii.md, padding: space.lg, gap: space.md },
});
