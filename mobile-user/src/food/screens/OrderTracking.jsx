import { Component, useEffect, useMemo } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Bike, Calendar, Check, ChevronRight, Clock, MapPin, MessageSquare, Navigation, Phone, Receipt, RefreshCw, Share2, Shield, ShoppingBag, Star,
  Store, User, Users, UtensilsCrossed, X,
} from 'lucide-react-native';
import Image from '../../components/Img';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { useOrderTracking } from '../hooks/pages/useOrderTracking';
import DeliveryTrackingMap from '../components/DeliveryTrackingMap';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { poppins, shadow, tw } from '../../theme';
import { F } from '../components/shell';

const BLUE = { 50: '#EFF6FF', 100: '#DBEAFE', 500: '#2B7FFF', 600: '#155DFC', 700: '#1447E6', 900: '#1C398E' };
const EMERALD = { 50: '#ECFDF5', 100: '#D0FAE5', 700: '#007A55', 900: '#004F3B' };
const YELLOW = '#FDC700';

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
          <Text style={styles.mapFallbackText}>Live map unavailable right now</Text>
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
    return <LinearGradient colors={[tw.gray100, tw.gray200]} style={{ height: 300 }} />;
  }
  return (
    <View style={{ height: 300 }}>
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
    <LinearGradient colors={dining ? ['#0f172a', '#1e293b'] : ['#06381e', '#0a4d2b']} style={styles.pickupPanel}>
      <Text style={styles.pickupKicker}>{dining ? 'DINE-IN' : 'TAKEAWAY · SELF PICKUP'}</Text>
      <Pulse style={styles.pickupIcon}>{dining ? <UtensilsCrossed size={44} color="#fff" /> : <ShoppingBag size={44} color="#fff" />}</Pulse>
      <Text style={styles.pickupTitle}>{dining ? 'Your table order is on its way' : ready ? 'Ready for pickup' : 'Preparing your order'}</Text>
      <Text style={styles.pickupSub}>{dining ? 'Sit back and relax, we will serve you shortly' : ready ? 'Please collect your order from the counter' : 'We will let you know when it is ready'}</Text>
    </LinearGradient>
  );
}

function SectionItem({ Icon, iconNode, title, subtitle, onPress, showArrow = true, last }) {
  return (
    <Press scale={onPress ? 0.99 : 1} disabled={!onPress} onPress={onPress} accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`} style={[styles.sectionItem, last ? { borderBottomWidth: 0 } : null]}>
      <View style={styles.sectionIcon}>{iconNode || <Icon size={20} color={tw.gray600} />}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.sectionTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {showArrow ? <ChevronRight size={20} color={tw.gray400} /> : null}
    </Press>
  );
}

function Stars({ value, size = 14, onChange }) {
  return (
    <View style={{ flexDirection: 'row', gap: onChange ? 12 : 2, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const on = star <= (value || 0);
        const icon = <Star size={size} color={on ? YELLOW : tw.gray200} fill={on ? YELLOW : 'none'} />;
        return onChange ? (
          <Press key={star} scale={0.9} onPress={() => onChange(star)} accessibilityRole="radio" accessibilityState={{ checked: value === star }} accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`} style={{ padding: 4 }}>
            {icon}
          </Press>
        ) : (
          <View key={star}>{icon}</View>
        );
      })}
    </View>
  );
}

function BillRow({ label, value, color }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={[styles.billLabel, color ? { color, ...poppins(500) } : null]}>{label}</Text>
      <Text style={[styles.billValue, color ? { color } : null]}>{value}</Text>
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
      <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel="Loading order details">
        <ActivityIndicator size="large" color={tw.gray600} />
        <Text style={styles.centerText}>Loading order details...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Order Not Found</Text>
        <Text style={[styles.centerText, { marginTop: 0, marginBottom: 24 }]}>{error || "The order you're looking for doesn't exist."}</Text>
        <Press scale={0.97} onPress={() => navigate('/user/orders')} accessibilityLabel="Back to Orders" style={styles.darkBtn}>
          <Text style={styles.darkBtnText}>Back to Orders</Text>
        </Press>
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
    delivered: { title: order?.orderType === 'takeaway' ? 'Picked UP' : 'Order delivered', subtitle: order?.orderType === 'takeaway' ? 'Thank you for ordering!' : 'Enjoy your meal!', iconType: 'delivered' },
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
  const headerColor = currentStatus.red ? tw.red600 : tw.green600;
  const safety = () => navigate('/user/profile/report-safety-emergency', { state: { returnTo: location.pathname } });
  const payMethod = String(order?.payment?.method || order?.paymentMethod || '').toLowerCase();
  const payStatus = String(order?.payment?.status || '').toLowerCase();
  const isRazorpayPaid = payMethod === 'razorpay' && ['paid', 'authorized', 'captured', 'settled', 'refunded'].includes(payStatus);
  const statusIcon = {
    rider: { bg: BLUE[50], node: <Bike size={30} color={BLUE[600]} /> },
    cancelled: { bg: tw.red50, node: <X size={36} color={tw.red500} /> },
    delivered: { bg: tw.green50, node: <Check size={36} color={tw.green500} /> },
    food: { bg: tw.orange50, node: <Receipt size={34} color={tw.orange500} /> },
  }[currentStatus.iconType];

  return (
    <View style={{ flex: 1, backgroundColor: tw.gray100 }}>
      <View style={{ backgroundColor: headerColor }}>
        <View style={styles.nav}>
          <Press scale={0.9} onPress={handleBackClick} accessibilityLabel="Go back" style={styles.navBtn}>
            <ArrowLeft size={24} color="#fff" />
          </Press>
          <Text style={styles.navTitle} numberOfLines={1} accessibilityRole="header">{order.restaurant}</Text>
          <Press scale={0.9} onPress={handleShare} accessibilityLabel="Share order" style={styles.navBtn}>
            <Share2 size={20} color="#fff" />
          </Press>
        </View>

        {scheduledWaiting ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 20, alignItems: 'center' }}>
            <View style={[styles.pill, { paddingVertical: 6, marginBottom: 12 }]}>
              <Clock size={16} color="#fff" />
              <Text style={[styles.pillText, poppins(600)]}>Scheduled Order</Text>
            </View>
            <Text style={[styles.statusTitle, { marginBottom: 8 }]}>Order Scheduled</Text>
            <View style={[styles.pill, { paddingHorizontal: 20, paddingVertical: 10 }]}>
              <Calendar size={16} color="#fff" />
              <Text style={styles.pillText}>{scheduledDateFormatted}</Text>
              <Press scale={0.9} onPress={handleRefresh} accessibilityLabel="Refresh order status" hitSlop={10}>
                <Animated.View style={{ transform: [{ rotate }] }}>
                  <RefreshCw size={16} color="#fff" />
                </Animated.View>
              </Press>
            </View>
            <Text style={styles.scheduledNote}>The restaurant will start preparing your order closer to the scheduled time</Text>
          </View>
        ) : !['at_pickup', 'ready', 'on_way', 'at_drop', 'delivered'].includes(orderStatus) ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center' }}>
            <Text style={[styles.statusTitle, { marginBottom: 12 }]}>{currentStatus.title}</Text>
            <View style={styles.pill}>
              <Text style={[styles.pillText, { flexShrink: 1 }]}>{currentStatus.subtitle}</Text>
              <Press scale={0.9} onPress={handleRefresh} accessibilityLabel="Refresh order status" hitSlop={10}>
                <Animated.View style={{ transform: [{ rotate }] }}>
                  <RefreshCw size={16} color="#fff" />
                </Animated.View>
              </Press>
            </View>
          </View>
        ) : null}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}>
        {!isDeliveredOrder && orderStatus !== 'cancelled' && !scheduledWaiting ? (
          pickup ? (
            <PickupPanel dining={order?.orderType === 'dining'} ready={orderStatus === 'ready'} />
          ) : (
            <MapErrorBoundary>
              <DeliveryMap orderId={orderId} order={order} fallbackCustomerCoords={fallbackCustomerCoords} userLiveCoords={userLiveCoords} onEtaUpdate={handleEtaUpdate} />
            </MapErrorBoundary>
          )
        ) : null}

        <View style={{ padding: 16, gap: 16 }}>
          {customerDeliveryOtp && active ? (
            <View style={[styles.otp, takeaway ? { backgroundColor: EMERALD[50], borderColor: EMERALD[100] } : null]}>
              <Text style={[styles.otpLabel, takeaway ? { color: EMERALD[700] } : null]}>{takeaway ? 'TAKEAWAY OTP' : 'DELIVERY OTP'}</Text>
              <Text style={[styles.otpCode, takeaway ? { color: EMERALD[900] } : null]} selectable>{customerDeliveryOtp}</Text>
              <Text style={[styles.otpNote, takeaway ? { color: EMERALD[700] } : null]}>
                {takeaway ? 'Share this 4-digit OTP with the restaurant at the counter to verify and complete your pick-up.' : 'Share this 4-digit OTP with your delivery partner at drop-off.'}
              </Text>
            </View>
          ) : null}

          {takeaway && orderStatus !== 'ready' && active ? (
            <View style={styles.takeawayCard}>
              <View style={styles.takeawayIcon}>
                <ShoppingBag size={20} color={tw.orange600} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.takeawayTitle}>Takeaway / Self Pickup</Text>
                <Text style={styles.takeawayBody}>
                  {orderStatus === 'preparing' ? "Your order is being prepared. We'll notify you when it's ready." : 'Waiting for the restaurant to accept and prepare your order.'}
                </Text>
              </View>
            </View>
          ) : null}

          {['at_pickup', 'ready', 'on_way', 'at_drop', 'delivered'].includes(orderStatus) ? (
            <View style={[styles.card, { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
              <View style={[styles.statusIcon, { backgroundColor: statusIcon.bg }]}>{statusIcon.node}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusCardTitle}>{currentStatus.title}</Text>
                <Text style={styles.statusCardSub}>{currentStatus.subtitle}</Text>
              </View>
            </View>
          ) : null}

          {orderStatus === 'delivered' && !isOrderRated ? (
            <Press scale={isLocalRated ? 1 : 0.99} disabled={isLocalRated} onPress={handleOpenRating} accessibilityLabel={isLocalRated ? 'Feedback received' : 'Rate your order'} style={[styles.card, styles.rateCard]}>
              <View style={styles.rateIcon}>
                <Star size={32} color={F.green} fill={F.green} />
              </View>
              <Text style={styles.rateTitle}>{isLocalRated ? 'Feedback Received' : 'Enjoyed your food?'}</Text>
              <Text style={styles.rateBody}>
                {isLocalRated ? 'Thank you for rating your experience! Your feedback has been submitted.' : `Rate your experience with ${order?.restaurant || 'The Restaurant'} and help us improve!`}
              </Text>
              <View style={[styles.rateBtn, isLocalRated ? { backgroundColor: tw.gray300 } : null]}>
                <Text style={[styles.rateBtnText, isLocalRated ? { color: tw.gray500 } : null]}>{isLocalRated ? 'Submitted' : 'Give Rating'}</Text>
              </View>
            </Press>
          ) : null}

          {orderStatus === 'delivered' && isOrderRated ? (
            <View style={[styles.card, { padding: 20, borderWidth: 1, borderColor: tw.gray100 }]}>
              <View style={styles.feedbackHead}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tw.green500 }} />
                  <Text style={styles.feedbackTitle}>Your Feedback</Text>
                </View>
                <Text style={styles.feedbackDone}>RATING SUBMITTED</Text>
              </View>
              <View style={{ gap: 16 }}>
                <View style={styles.feedbackRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.feedbackName}>{order?.restaurant || 'Food & Restaurant'}</Text>
                    {order?.ratings?.restaurant?.comment ? <Text style={styles.feedbackComment} numberOfLines={1}>&quot;{order.ratings.restaurant.comment}&quot;</Text> : null}
                  </View>
                  <Stars value={order?.ratings?.restaurant?.rating || order?.restaurantRating} />
                </View>
                {hasDeliveryPartner ? (
                  <View style={styles.feedbackRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.feedbackName}>Delivery Service</Text>
                      {order?.ratings?.deliveryPartner?.comment ? <Text style={styles.feedbackComment} numberOfLines={1}>&quot;{order.ratings.deliveryPartner.comment}&quot;</Text> : null}
                    </View>
                    <Stars value={order?.ratings?.deliveryPartner?.rating || order?.deliveryPartnerRating} />
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {order?.deliveryPartnerId ? (
            <View style={styles.card}>
              <View style={styles.partnerRow}>
                <View style={styles.partnerAvatar}>
                  {order.deliveryPartner?.avatar ? <Image source={{ uri: order.deliveryPartner.avatar }} style={{ width: '100%', height: '100%' }} /> : <Bike size={26} color={BLUE[600]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>{order.deliveryPartner?.name || 'Delivery Partner'}</Text>
                  <Text style={styles.sectionSub}>{orderStatus === 'delivered' ? 'Delivered your order' : 'Your delivery partner is arriving'}</Text>
                </View>
                <Press scale={0.9} onPress={handleCallRider} accessibilityLabel="Call delivery partner" style={[styles.roundAction, { backgroundColor: BLUE[50] }]}>
                  <Phone size={20} color={BLUE[600]} />
                </Press>
              </View>
              {order?.note ? (
                <View style={styles.riderNote}>
                  <MessageSquare size={16} color={BLUE[500]} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.riderNoteLabel}>INSTRUCTION FOR RIDER</Text>
                    <Text style={styles.riderNoteText}>&quot;{order.note}&quot;</Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {active && !pickup ? (
            <>
              <Press scale={0.99} onPress={safety} accessibilityLabel="Learn about delivery partner safety" style={[styles.card, { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <Shield size={24} color={tw.gray600} />
                <Text style={[styles.sectionTitle, { flex: 1 }]}>Learn about delivery partner safety</Text>
                <ChevronRight size={20} color={tw.gray400} />
              </Press>
              <View style={styles.detailsBanner}>
                <Text style={styles.detailsBannerText}>All your delivery details in one place 🥡</Text>
              </View>
            </>
          ) : null}

          {!takeaway ? (
            <View style={styles.card}>
              <SectionItem
                Icon={User}
                title={order?.userName || order?.userId?.fullName || order?.userId?.name || profile?.fullName || profile?.name || 'Customer'}
                subtitle={order?.userPhone || order?.userId?.phone || profile?.phone || defaultAddress?.phone || 'Phone number not available'}
                showArrow={false}
              />
              <SectionItem
                iconNode={order?.orderType === 'dining' ? <Users size={20} color={BLUE[600]} /> : <MapPin size={22} color={tw.green600} fill={tw.green100} />}
                title={order?.orderType === 'dining' ? 'Dining / Table Service' : 'Delivery at Location'}
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
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.partnerRow}>
              <View style={[styles.partnerAvatar, { backgroundColor: tw.orange100, borderWidth: 0 }]}>
                <Store size={26} color={tw.orange600} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{order.restaurant}</Text>
                <Text style={[styles.sectionSub, { flexShrink: 1 }]}>{order.restaurantAddress || 'Restaurant location'}</Text>
              </View>
              <View style={{ gap: 8 }}>
                <Press scale={0.9} onPress={handleOpenDirections} accessibilityLabel="Get directions to the restaurant" style={[styles.roundAction, { backgroundColor: tw.orange50 }]}>
                  <Navigation size={20} color={F.green} />
                </Press>
                <Press scale={0.9} onPress={handleCallRestaurant} accessibilityLabel="Call restaurant" style={[styles.roundAction, { backgroundColor: tw.orange50 }]}>
                  <Phone size={20} color={F.green} />
                </Press>
              </View>
            </View>
            <Press scale={0.99} onPress={() => setShowOrderDetails(true)} accessibilityLabel="View order details" style={{ padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <Receipt size={20} color={tw.gray500} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginTop: 8, gap: 4 }}>
                {order?.items?.map((item, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={styles.vegBox}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tw.green600 }} />
                    </View>
                    <Text style={styles.itemLine}>
                      {item.quantity} x {item.name}
                      {item.variantName ? ` (${item.variantName})` : ''}
                    </Text>
                  </View>
                ))}
              </View>
              <ChevronRight size={20} color={tw.gray400} />
            </Press>
          </View>

          {!isAdminAccepted && active ? (
            <View style={{ gap: 12 }}>
              <Press scale={0.98} onPress={handleCancelOrder} accessibilityLabel="Cancel order" style={styles.cancelOrder}>
                <Text style={styles.cancelOrderText}>Cancel Order</Text>
              </Press>
              <Text style={styles.cancelNote}>You can cancel your order until the restaurant accepts it.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* "Order Placed!" interstitial */}
      <Modal visible={!!showConfirmation} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <View style={styles.confirm}>
          <View style={styles.confirmCheck}>
            <Check size={48} color="#fff" strokeWidth={3} />
          </View>
          <Text style={styles.confirmTitle}>{isScheduledOrder ? 'Order Scheduled!' : 'Order Placed!'}</Text>
          <Text style={styles.confirmBody}>{isScheduledOrder ? `Scheduled for ${scheduledDateFormatted}` : 'Waiting for the restaurant to accept your order'}</Text>
          <ActivityIndicator size="small" color={F.green} style={{ marginTop: 32 }} />
          <Text style={styles.confirmLoading}>Loading order details...</Text>
          <Press scale={0.98} onPress={safety} accessibilityLabel="Learn about delivery partner safety" style={styles.confirmSafety}>
            <Shield size={16} color={F.green} />
            <Text style={styles.confirmSafetyText}>Learn about delivery partner safety</Text>
          </Press>
        </View>
      </Modal>

      {/* Cancel order */}
      <Dialog visible={showCancelDialog} onClose={() => !isCancelling && setShowCancelDialog(false)} panelStyle={styles.dialog}>
        <Text style={styles.dialogTitle}>Cancel Order</Text>
        <View style={{ gap: 20, paddingVertical: 24 }}>
          {isRazorpayPaid ? (
            <View style={styles.refundBox}>
              <Text style={styles.refundTitle}>Refund preference</Text>
              {[
                ['source', 'Refund to original payment method (5-7 working days)'],
                ['wallet', 'Refund to wallet (instant credit)'],
              ].map(([value, label]) => {
                const on = refundDestination === value;
                return (
                  <Press key={value} scale={0.99} disabled={isCancelling} onPress={() => setRefundDestination(value)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={styles.refundOpt}>
                    <View style={[styles.radio, on ? { borderColor: F.green } : null]}>{on ? <View style={styles.radioDot} /> : null}</View>
                    <Text style={styles.refundOptText}>{label}</Text>
                  </Press>
                );
              })}
            </View>
          ) : null}
          <TextInput
            value={cancellationReason}
            onChangeText={setCancellationReason}
            placeholder="e.g., Changed my mind, Wrong address, etc."
            placeholderTextColor={tw.gray400}
            multiline
            editable={!isCancelling}
            textAlignVertical="top"
            accessibilityLabel="Reason for cancellation"
            style={[styles.textarea, { minHeight: 100, borderWidth: 2, borderColor: tw.gray300 }, isCancelling ? { backgroundColor: tw.gray100 } : null]}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Press
              scale={0.98}
              disabled={isCancelling}
              onPress={() => {
                setShowCancelDialog(false);
                setCancellationReason('');
                setRefundDestination('source');
              }}
              accessibilityLabel="Keep order"
              style={[styles.dialogBtn, styles.outline]}
            >
              <Text style={styles.outlineText}>Cancel</Text>
            </Press>
            <Press scale={0.98} disabled={isCancelling || !cancellationReason.trim()} onPress={handleConfirmCancel} accessibilityLabel="Confirm cancellation" style={[styles.dialogBtn, { backgroundColor: tw.red600 }, isCancelling || !cancellationReason.trim() ? { opacity: 0.5 } : null]}>
              {isCancelling ? <ActivityIndicator size="small" color="#fff" /> : null}
              <Text style={styles.dialogBtnText}>{isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}</Text>
            </Press>
          </View>
        </View>
      </Dialog>

      {/* Order details */}
      <Dialog visible={showOrderDetails} onClose={() => setShowOrderDetails(false)} panelStyle={[styles.dialog, { padding: 0, overflow: 'hidden' }]}>
        <View style={styles.detailsHead}>
          <Text style={styles.dialogTitle}>Order Details</Text>
        </View>
        <ScrollView style={{ maxHeight: height * 0.6 }} contentContainerStyle={{ padding: 24, paddingTop: 16, gap: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View>
              <Text style={styles.metaLabel}>DATE & TIME</Text>
              <Text style={styles.metaValue}>
                {order?.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
              </Text>
            </View>
            <View style={{ width: 1, height: 32, backgroundColor: tw.gray100 }} />
            <View>
              <Text style={styles.metaLabel}>STATUS</Text>
              <Text style={[styles.metaValue, { color: tw.green600, ...poppins(700) }]}>{String(order?.status === 'placed' ? 'order placed' : order?.status?.replace('_', ' ') || '').toUpperCase()}</Text>
            </View>
          </View>

          {order?.note ? (
            <View style={styles.detailsNote}>
              <MessageSquare size={20} color={F.green} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailsNoteLabel}>DELIVERY INSTRUCTIONS</Text>
                <Text style={styles.detailsNoteText}>{order.note}</Text>
              </View>
            </View>
          ) : null}

          <View>
            <Text style={[styles.metaLabel, { fontSize: 14, marginBottom: 12, ...poppins(500) }]}>ORDER ITEMS</Text>
            <View style={{ gap: 16 }}>
              {order?.items?.map((item, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
                  <View style={[styles.vegBox, { width: 20, height: 20, marginTop: 2 }]}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tw.green600 }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailItemName}>{item.name}</Text>
                    {item.variantName ? <Text style={styles.sectionSub}>{item.variantName}</Text> : null}
                    <Text style={styles.sectionSub}>Quantity: {item.quantity}</Text>
                  </View>
                  <Text style={styles.detailItemName}>₹{((item?.price || 0) * (item?.quantity || 0)).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.bill}>
            <Text style={styles.billTitle}>BILL SUMMARY</Text>
            <BillRow label="Item Total" value={`₹${Number(order?.subtotal || 0).toFixed(2)}`} />
            {Number(order?.packagingFee) > 0 ? <BillRow label="Packaging Charges" value={`₹${Number(order.packagingFee).toFixed(2)}`} /> : null}
            {Number(order?.platformFee) > 0 ? <BillRow label="Platform Fee" value={`₹${Number(order.platformFee).toFixed(2)}`} /> : null}
            {!pickup ? <BillRow label="Delivery Fee" value={`₹${Number(order?.deliveryFee || 0).toFixed(2)}`} /> : null}
            <BillRow label="GST" value={`₹${Number(order?.gst || 0).toFixed(2)}`} />
            {Number(order?.discount) > 0 ? <BillRow label="Discount Applied" value={`-₹${Number(order.discount).toFixed(2)}`} color={tw.green600} /> : null}
            <View style={styles.billTotalRow}>
              <Text style={styles.billPaid}>
                Paid{' '}
                {['cash', 'cod'].includes(String(order?.payment?.method || order?.paymentMethod || 'online').toLowerCase()) ? (
                  <Text style={{ color: tw.gray500 }}>(COD)</Text>
                ) : (
                  <Text style={{ color: tw.green600 }}>(Online)</Text>
                )}
              </Text>
              <Text style={styles.billTotal}>₹{Number(order?.totalAmount || 0).toFixed(2)}</Text>
            </View>
          </View>

          {order?.paymentMethod ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Shield size={16} color={tw.gray600} />
                <Text style={[styles.billLabel, poppins(500)]}>Payment Method</Text>
              </View>
              <Text style={styles.payMethod}>{String(order.paymentMethod).toUpperCase()}</Text>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ padding: 24, borderTopWidth: 1, borderTopColor: tw.gray100 }}>
          <Press scale={0.98} onPress={() => setShowOrderDetails(false)} accessibilityLabel="Close order details" style={[styles.dialogBtn, { flex: 0, backgroundColor: tw.gray900, height: 48 }]}>
            <Text style={styles.dialogBtnText}>Okay</Text>
          </Press>
        </View>
      </Dialog>

      {/* Delivery instructions */}
      <Dialog visible={isInstructionsModalOpen} onClose={() => setIsInstructionsModalOpen(false)} panelStyle={[styles.dialog, { borderRadius: 24 }]}>
        <Text style={[styles.dialogTitle, { marginBottom: 8 }]}>Delivery Instructions</Text>
        <View style={{ gap: 16 }}>
          <Text style={styles.sectionSub}>Add instructions for the delivery partner to help them find your address or know where to leave your order.</Text>
          <TextInput
            value={deliveryInstructions}
            onChangeText={setDeliveryInstructions}
            placeholder="E.g. Ring the doorbell, leave at the front desk..."
            placeholderTextColor={tw.slate400}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Delivery instructions"
            style={[styles.textarea, { minHeight: 120, fontSize: 16 }]}
          />
          <Press scale={0.98} disabled={isUpdatingInstructions} onPress={handleUpdateInstructions} accessibilityLabel="Save instructions" style={[styles.dialogBtn, { flex: 0, backgroundColor: F.green, height: 48 }]}>
            {isUpdatingInstructions ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.dialogBtnText}>Save Instructions</Text>}
          </Press>
        </View>
      </Dialog>

      {/* Rating */}
      <Dialog visible={showRatingModal} onClose={() => setShowRatingModal(false)} panelStyle={[styles.dialog, { borderRadius: 24, padding: 0 }]}>
        <ScrollView style={{ maxHeight: height * 0.85 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Star size={24} color={F.green} fill={F.green} />
            <Text style={styles.dialogTitle}>Rate your Experience</Text>
          </View>
          <View style={{ gap: 12 }}>
            <View style={styles.rateHead}>
              <Text style={styles.rateQ}>How was the food?</Text>
              <Text style={[styles.rateTag, { backgroundColor: tw.orange50, color: tw.orange600 }]}>Restaurant</Text>
            </View>
            <Stars size={40} value={selectedRestaurantRating} onChange={setSelectedRestaurantRating} />
            <TextInput value={restaurantFeedbackText} onChangeText={setRestaurantFeedbackText} placeholder="Write a quick review for the food (optional)" placeholderTextColor={tw.slate400} multiline textAlignVertical="top" accessibilityLabel="Review for the food" style={[styles.textarea, { minHeight: 80 }]} />
          </View>
          {hasDeliveryPartner ? (
            <View style={{ gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: tw.gray100 }}>
              <View style={styles.rateHead}>
                <Text style={styles.rateQ}>How was the delivery?</Text>
                <Text style={[styles.rateTag, { backgroundColor: BLUE[50], color: BLUE[600] }]}>Delivery</Text>
              </View>
              <Stars size={40} value={selectedDeliveryRating} onChange={setSelectedDeliveryRating} />
              <TextInput value={deliveryFeedbackText} onChangeText={setDeliveryFeedbackText} placeholder={`How was ${order?.deliveryPartnerName || 'the rider'}? (optional)`} placeholderTextColor={tw.slate400} multiline textAlignVertical="top" accessibilityLabel="Review for the delivery" style={[styles.textarea, { minHeight: 80 }]} />
            </View>
          ) : null}
          <View>
            {(() => {
              const off = submittingRating || selectedRestaurantRating === null || (hasDeliveryPartner && selectedDeliveryRating === null);
              return (
                <Press scale={0.98} disabled={off} onPress={handleSubmitRating} accessibilityLabel="Submit feedback" style={[styles.dialogBtn, { flex: 0, backgroundColor: F.green, height: 56, borderRadius: 16 }, off ? { opacity: 0.5 } : null]}>
                  {submittingRating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.dialogBtnText}>Submit Feedback</Text>}
                </Press>
              );
            })()}
            <Press scale={0.98} onPress={() => setShowRatingModal(false)} accessibilityLabel="Maybe later" style={{ paddingVertical: 12 }}>
              <Text style={styles.later}>Maybe later</Text>
            </Press>
          </View>
        </ScrollView>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: tw.gray50, alignItems: 'center', justifyContent: 'center', padding: 16 },
  centerText: { fontSize: 16, lineHeight: 24, color: tw.gray600, marginTop: 16, textAlign: 'center', ...poppins(400) },
  notFound: { fontSize: 18, lineHeight: 28, color: tw.gray900, marginBottom: 16, ...poppins(700) },
  darkBtn: { backgroundColor: tw.gray900, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  darkBtnText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  navBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 18, lineHeight: 28, color: '#fff', ...poppins(600) },
  statusTitle: { fontSize: 24, lineHeight: 32, color: '#fff', textAlign: 'center', ...poppins(700) },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, maxWidth: '100%' },
  pillText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) },
  scheduledNote: { fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.8)', marginTop: 12, textAlign: 'center', ...poppins(400) },

  mapFallback: { height: 300, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  mapFallbackText: { fontSize: 14, lineHeight: 20, color: tw.gray600, textAlign: 'center', paddingHorizontal: 16, ...poppins(400) },
  pickupPanel: { height: 300, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  pickupKicker: { fontSize: 11, lineHeight: 16, letterSpacing: 2.2, color: 'rgba(255,255,255,0.7)', ...poppins(700) },
  pickupIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  pickupTitle: { fontSize: 20, lineHeight: 28, color: '#fff', textAlign: 'center', ...poppins(700) },
  pickupSub: { fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 4, ...poppins(400) },

  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', ...shadow('sm') },
  otp: { borderRadius: 12, padding: 16, borderWidth: 1, backgroundColor: BLUE[50], borderColor: BLUE[100], ...shadow('sm') },
  otpLabel: { fontSize: 12, lineHeight: 16, letterSpacing: 0.3, color: BLUE[700], ...poppins(600) },
  otpCode: { fontSize: 24, lineHeight: 32, letterSpacing: 2.4, color: BLUE[900], marginTop: 4, ...poppins(800) },
  otpNote: { fontSize: 12, lineHeight: 16, color: BLUE[700], marginTop: 4, ...poppins(400) },
  takeawayCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: tw.orange50, borderWidth: 1, borderColor: tw.orange100, borderRadius: 12, padding: 16, ...shadow('sm') },
  takeawayIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.orange100, alignItems: 'center', justifyContent: 'center' },
  takeawayTitle: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  takeawayBody: { fontSize: 12, lineHeight: 19.5, color: tw.gray600, marginTop: 4, ...poppins(400) },
  statusIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tw.gray100 },
  statusCardTitle: { fontSize: 16, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  statusCardSub: { fontSize: 14, lineHeight: 19, color: tw.gray500, marginTop: 4, ...poppins(400) },

  rateCard: { padding: 24, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(10,77,43,0.1)' },
  rateIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(10,77,43,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  rateTitle: { fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  rateBody: { fontSize: 14, lineHeight: 20, color: tw.gray500, marginTop: 8, marginBottom: 24, maxWidth: 280, textAlign: 'center', ...poppins(400) },
  rateBtn: { width: 200, height: 48, borderRadius: 12, backgroundColor: F.green, alignItems: 'center', justifyContent: 'center' },
  rateBtnText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) },
  feedbackHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tw.gray50 },
  feedbackTitle: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  feedbackDone: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.gray400, opacity: 0.5, ...poppins(700) },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  feedbackName: { fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(600) },
  feedbackComment: { fontSize: 10, lineHeight: 15, color: tw.gray500, fontStyle: 'italic', marginTop: 2, ...poppins(400) },

  partnerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: tw.gray200 },
  partnerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: BLUE[50], overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BLUE[100] },
  roundAction: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  riderNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(239,246,255,0.5)', padding: 12, margin: 16, marginTop: 12, borderRadius: 8, borderWidth: 1, borderColor: BLUE[100] },
  riderNoteLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: BLUE[600], marginBottom: 2, ...poppins(700) },
  riderNoteText: { fontSize: 12, lineHeight: 19.5, color: tw.gray700, ...poppins(500) },
  detailsBanner: { backgroundColor: '#FEFCE8', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: tw.gray200 },
  detailsBannerText: { fontSize: 14, lineHeight: 20, color: '#894B00', ...poppins(500) },
  sectionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: tw.gray200 },
  sectionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(500) },
  sectionSub: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  vegBox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: tw.green600, alignItems: 'center', justifyContent: 'center' },
  itemLine: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  cancelOrder: { height: 48, borderRadius: 12, backgroundColor: tw.red600, alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  cancelOrderText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) },
  cancelNote: { fontSize: 10, lineHeight: 15, color: tw.gray400, textAlign: 'center', paddingHorizontal: 16, ...poppins(400) },

  confirm: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  confirmCheck: { width: 96, height: 96, borderRadius: 48, backgroundColor: tw.green500, alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { fontSize: 24, lineHeight: 32, color: tw.gray900, marginTop: 24, ...poppins(700) },
  confirmBody: { fontSize: 16, lineHeight: 24, color: tw.gray600, marginTop: 8, textAlign: 'center', ...poppins(400) },
  confirmLoading: { fontSize: 14, lineHeight: 20, color: tw.gray500, marginTop: 12, ...poppins(400) },
  confirmSafety: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 48, paddingTop: 32, borderTopWidth: 1, borderTopColor: tw.gray100, alignSelf: 'stretch', justifyContent: 'center' },
  confirmSafetyText: { fontSize: 14, lineHeight: 20, color: F.green, ...poppins(500) },

  dialog: { width: '95%', maxWidth: 600, backgroundColor: '#fff', borderRadius: 16, padding: 24, ...shadow('2xl') },
  dialogTitle: { fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  dialogBtn: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  dialogBtnText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) },
  outline: { borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff' },
  outlineText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  refundBox: { gap: 8, borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, backgroundColor: tw.gray50, padding: 16 },
  refundTitle: { fontSize: 14, lineHeight: 20, color: tw.gray900, marginBottom: 4, ...poppins(600) },
  refundOpt: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 6, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8 },
  refundOptText: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(400) },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: tw.gray400, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: F.green },
  textarea: { borderWidth: 1, borderColor: tw.gray200, borderRadius: 12, backgroundColor: tw.gray50, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: tw.gray800, ...poppins(400) },
  detailsHead: { padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  metaLabel: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.gray500, ...poppins(400) },
  metaValue: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  detailsNote: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(255,247,237,0.5)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: tw.orange100 },
  detailsNoteLabel: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: F.green, marginBottom: 4, ...poppins(700) },
  detailsNoteText: { fontSize: 14, lineHeight: 22.75, color: tw.gray800, textTransform: 'capitalize', ...poppins(500) },
  detailItemName: { fontSize: 16, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  bill: { backgroundColor: tw.gray50, borderRadius: 12, padding: 16, gap: 12 },
  billTitle: { fontSize: 14, lineHeight: 20, letterSpacing: 0.7, color: tw.gray900, ...poppins(700) },
  billLabel: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  billValue: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  billTotalRow: { paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray200, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billPaid: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  billTotal: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  payMethod: { fontSize: 14, lineHeight: 20, letterSpacing: 0.35, color: tw.gray900, ...poppins(700) },
  rateHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rateQ: { fontSize: 16, lineHeight: 24, color: tw.gray800, ...poppins(600) },
  rateTag: { fontSize: 12, lineHeight: 16, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', ...poppins(500) },
  later: { fontSize: 14, lineHeight: 20, color: tw.gray400, textAlign: 'center', ...poppins(500) },
});
