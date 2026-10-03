/**
 * Ported from Frontend/src/modules/Food/pages/user/orders/OrderTracking.jsx
 * (3188 lines — the biggest Food screen). What makes it that large: a
 * live Google-Maps rider marker driven by `window` custom events
 * (`userSocketConnectionChange`, `deliveryDropOtp`, `orderStatusNotification`)
 * that some other, not-yet-ported part of the web app dispatches from a
 * socket.io connection, plus a scheduled-order countdown, takeaway/dining
 * Lottie-style animations, and a post-checkout confetti splash.
 *
 * Ported: the status lookup table (placed/confirmed/preparing/assigned/
 * at_pickup/ready/on_way/at_drop/delivered/cancelled → title+subtitle+
 * icon, same strings as web), the delivery OTP box
 * (`order.deliveryVerification.dropOtp.code`), restaurant/delivery-partner
 * call buttons, cancel-with-reason (+ refund-destination choice for a
 * captured Razorpay payment) via `orderAPI.cancelOrder`, and the
 * post-delivery rating prompt (same submitOrderRatings call as
 * FoodOrdersScreen's rating modal).
 *
 * Deliberately dropped rather than approximated: the live rider map —
 * it needs the socket layer task #13 (payments/push notifications) owns,
 * so this screen polls `orderAPI.getOrderDetails` every 8s instead of
 * watching that socket, which is the exact same fallback the web version
 * itself uses when its socket is disconnected. The scheduled-order
 * countdown is skipped (this port's Checkout never produces a scheduled
 * order, matching RideTrackingScreen's note for the same reason on the
 * Taxi side). Cancellation eligibility is simplified to "before the
 * restaurant accepts" (status placed/confirmed), dropping the brief
 * post-acceptance edit-window grace period as an edge case not worth the
 * countdown-timer machinery it needs.
 */
import React, {useCallback, useRef, useState} from 'react';
import {ActivityIndicator, Linking, Modal, Pressable, ScrollView, Share, Text, TextInput, View} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {ArrowLeft, Check, Clock, MessageSquare, Phone, Receipt, ShoppingBag, Star, X} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import orderApi from '../../services/food/orderApi';

const POLL_MS = 8000;
const TERMINAL = new Set(['delivered', 'cancelled']);

const STATUS_CONFIG = {
  placed: {title: 'Order Placed', subtitle: 'Waiting for restaurant to accept', iconType: 'food'},
  confirmed: {title: 'Order Placed', subtitle: 'Waiting for restaurant to accept', iconType: 'food'},
  preparing: {title: 'Food is being prepared', subtitle: 'Cooking your meal', iconType: 'food'},
  assigned: {title: 'Rider is arriving', subtitle: 'A delivery partner is arriving at the restaurant', iconType: 'rider'},
  at_pickup: {title: 'Rider at restaurant', subtitle: 'Rider is waiting for your order', iconType: 'rider'},
  ready: {title: 'Handover in progress', subtitle: 'Rider is picking up your order', iconType: 'rider', takeawayTitle: 'Ready for pickup', takeawaySubtitle: 'Please collect your order from the restaurant', takeawayIconType: 'delivered'},
  on_way: {title: 'Out for delivery', subtitle: 'Rider is out for delivery', iconType: 'rider'},
  at_drop: {title: 'Arrived at location', subtitle: 'Please come to the door', iconType: 'rider'},
  delivered: {title: 'Order delivered', subtitle: 'Enjoy your meal!', iconType: 'delivered', takeawayTitle: 'Picked Up', takeawaySubtitle: 'Thank you for ordering!'},
  cancelled: {title: 'Order cancelled', subtitle: 'This order has been cancelled', iconType: 'cancelled'},
};

const ICON_BG = {rider: 'bg-blue-50', cancelled: 'bg-red-50', delivered: 'bg-green-50', food: 'bg-orange-50'};

export default function FoodOrderTrackingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const orderId = route.params?.orderId;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [restaurantStars, setRestaurantStars] = useState(0);
  const [deliveryStars, setDeliveryStars] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const pollRef = useRef(null);

  const fetchOrder = useCallback(async () => {
    try {
      const response = await orderApi.getOrderDetails(orderId, {force: true});
      const data = response?.data?.data?.order || response?.data?.order;
      if (data) setOrder(data);
    } catch {
      // keep showing last known state; the poll will retry
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      fetchOrder();
      pollRef.current = setInterval(() => {
        if (order && TERMINAL.has(order.status)) return;
        fetchOrder();
      }, POLL_MS);
      return () => clearInterval(pollRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchOrder]),
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-100 items-center justify-center">
        <ActivityIndicator color="#0a4d2b" size="large" />
      </View>
    );
  }
  if (!order) {
    return (
      <View className="flex-1 bg-gray-100 items-center justify-center p-6">
        <Text className="text-base font-semibold text-gray-700">Order not found</Text>
        <Pressable onPress={() => navigation.navigate('FoodOrders')} className="mt-4 bg-[#0a4d2b] px-5 py-2.5 rounded-xl">
          <Text className="text-white font-semibold">Back to Orders</Text>
        </Pressable>
      </View>
    );
  }

  const isTakeaway = order.orderType === 'takeaway';
  const status = order.status || 'placed';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.placed;
  const title = isTakeaway && cfg.takeawayTitle ? cfg.takeawayTitle : cfg.title;
  const subtitle = isTakeaway && cfg.takeawaySubtitle ? cfg.takeawaySubtitle : cfg.subtitle;
  const iconType = isTakeaway && cfg.takeawayIconType ? cfg.takeawayIconType : cfg.iconType;
  const isCancelled = status === 'cancelled';
  const isDelivered = status === 'delivered';
  const otp = order?.deliveryVerification?.dropOtp?.code ? String(order.deliveryVerification.dropOtp.code) : null;
  const canCancel = !isCancelled && !isDelivered && ['placed', 'confirmed'].includes(status);
  const restaurantObj = order.restaurantId && typeof order.restaurantId === 'object' ? order.restaurantId : {};
  const restaurantName = order.restaurantName || restaurantObj.restaurantName || restaurantObj.name || 'Restaurant';
  const restaurantPhone = restaurantObj.primaryContactNumber || restaurantObj.phone || order.restaurantPhone || '';
  const deliveryPartner = order.deliveryPartnerId && typeof order.deliveryPartnerId === 'object' ? order.deliveryPartnerId : null;
  const hasRated = order?.ratings?.restaurant?.rating != null;
  const hasDeliveryPartner = Boolean(order.deliveryPartnerId || order.deliveryPartnerName);

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      Toast.show({type: 'error', text1: 'Please provide a reason for cancellation'});
      return;
    }
    setCancelling(true);
    try {
      const method = String(order?.payment?.method || '').toLowerCase();
      const payStatus = String(order?.payment?.status || '').toLowerCase();
      const isRazorpayPaid = method === 'razorpay' && ['paid', 'authorized', 'captured', 'settled', 'refunded'].includes(payStatus);
      await orderApi.cancelOrder(orderId, {reason: cancelReason.trim(), ...(isRazorpayPaid ? {refundDestination: 'source'} : {})});
      Toast.show({type: 'success', text1: 'Order cancelled successfully'});
      setShowCancel(false);
      setCancelReason('');
      fetchOrder();
    } catch (err) {
      Toast.show({type: 'error', text1: err?.response?.data?.message || 'Failed to cancel order'});
    } finally {
      setCancelling(false);
    }
  };

  const submitRating = async () => {
    if (restaurantStars === 0 || (hasDeliveryPartner && deliveryStars === 0)) {
      Toast.show({type: 'error', text1: 'Please select all required ratings'});
      return;
    }
    setSubmittingRating(true);
    try {
      await orderApi.submitOrderRatings(orderId, {restaurantRating: restaurantStars, deliveryPartnerRating: hasDeliveryPartner ? deliveryStars : undefined});
      Toast.show({type: 'success', text1: 'Thanks for rating your order!'});
      setShowRating(false);
      fetchOrder();
    } catch (err) {
      Toast.show({type: 'error', text1: err?.response?.data?.message || 'Failed to submit rating'});
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-100">
      <View className="bg-white flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => navigation.navigate('FoodOrders')} className="w-9 h-9 items-center justify-center">
            <ArrowLeft size={20} color="#374151" />
          </Pressable>
          <Text className="text-base font-bold text-gray-900">Order #{order.orderId || order._id}</Text>
        </View>
        <Pressable onPress={() => Share.share({message: `Tracking my order from ${restaurantName}`}).catch(() => {})}>
          <Receipt size={18} color="#374151" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 100}}>
        {otp && !isDelivered && !isCancelled && (
          <View className={`rounded-xl p-4 border mb-3 ${isTakeaway ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
            <Text className={`text-xs font-semibold uppercase ${isTakeaway ? 'text-emerald-700' : 'text-blue-700'}`}>{isTakeaway ? 'Takeaway OTP' : 'Delivery OTP'}</Text>
            <Text className={`text-2xl font-extrabold mt-1 tracking-widest ${isTakeaway ? 'text-emerald-900' : 'text-blue-900'}`}>{otp}</Text>
            <Text className={`text-xs mt-1 ${isTakeaway ? 'text-emerald-700' : 'text-blue-700'}`}>{isTakeaway ? 'Share this OTP with the restaurant to verify pick-up.' : 'Share this OTP with your delivery partner at drop-off.'}</Text>
          </View>
        )}

        <View className="bg-white rounded-xl p-4 shadow-sm flex-row items-center gap-4">
          <View className={`w-14 h-14 rounded-full items-center justify-center ${ICON_BG[iconType] || 'bg-orange-50'}`}>
            {iconType === 'cancelled' ? <X size={24} color="#ef4444" /> : iconType === 'delivered' ? <Check size={24} color="#16a34a" /> : iconType === 'rider' ? <ShoppingBag size={22} color="#2563eb" /> : <Clock size={22} color="#ea580c" />}
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-gray-900">{title}</Text>
            <Text className="text-sm text-gray-500 mt-0.5">{isCancelled ? order.cancellationReason || subtitle : subtitle}</Text>
          </View>
        </View>

        {isDelivered && !hasRated && (
          <View className="bg-white rounded-xl p-5 shadow-sm border-2 border-[#0a4d2b]/10 mt-3 items-center">
            <Star size={28} color="#0a4d2b" />
            <Text className="font-bold text-gray-900 mt-2">How was your order?</Text>
            <Text className="text-sm text-gray-500 mt-1 text-center">Rate your experience with {restaurantName}</Text>
            <Pressable onPress={() => setShowRating(true)} className="bg-[#0a4d2b] px-5 py-2.5 rounded-xl mt-3">
              <Text className="text-white font-semibold">Rate Now</Text>
            </Pressable>
          </View>
        )}

        <View className="bg-white rounded-xl shadow-sm mt-3 overflow-hidden">
          <View className="flex-row items-center justify-between p-4">
            <Text className="font-semibold text-gray-900 flex-1" numberOfLines={1}>
              {restaurantName}
            </Text>
            <Pressable
              onPress={() => (restaurantPhone ? Linking.openURL(`tel:${restaurantPhone}`) : Toast.show({type: 'error', text1: 'Restaurant phone not available'}))}
              className="w-9 h-9 rounded-full bg-[#0a4d2b]/10 items-center justify-center">
              <Phone size={16} color="#0a4d2b" />
            </Pressable>
          </View>
        </View>

        {deliveryPartner && !isTakeaway && (
          <View className="bg-white rounded-xl shadow-sm mt-3 overflow-hidden">
            <View className="flex-row items-center gap-3 p-4">
              <View className="w-11 h-11 rounded-full bg-blue-50 items-center justify-center">
                <Text className="text-blue-600 font-bold">{(deliveryPartner.name || 'D')[0]}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900">{deliveryPartner.name || 'Delivery Partner'}</Text>
                <Text className="text-sm text-gray-500">{isDelivered ? 'Delivered your order' : 'Your delivery partner is arriving'}</Text>
              </View>
              <Pressable
                onPress={() => (deliveryPartner.phone ? Linking.openURL(`tel:${deliveryPartner.phone}`) : Toast.show({type: 'error', text1: 'Rider phone not available'}))}
                className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center">
                <Phone size={16} color="#2563eb" />
              </Pressable>
            </View>
            {order.note ? (
              <View className="bg-blue-50/60 mx-4 mb-4 p-3 rounded-lg flex-row items-start gap-2">
                <MessageSquare size={14} color="#3b82f6" />
                <Text className="text-xs text-gray-700 flex-1">"{order.note}"</Text>
              </View>
            ) : null}
          </View>
        )}

        <View className="flex-row gap-3 mt-4">
          <Pressable onPress={() => navigation.navigate('FoodUserOrderDetails', {orderId})} className="flex-1 border border-gray-300 rounded-xl py-3 items-center">
            <Text className="text-sm font-semibold text-gray-800">View Bill</Text>
          </Pressable>
          {canCancel && (
            <Pressable onPress={() => setShowCancel(true)} className="flex-1 border border-red-300 rounded-xl py-3 items-center">
              <Text className="text-sm font-semibold text-red-600">Cancel Order</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <Modal visible={showCancel} transparent animationType="fade" onRequestClose={() => setShowCancel(false)}>
        <Pressable className="flex-1 bg-black/50 items-center justify-center p-6" onPress={() => setShowCancel(false)}>
          <Pressable onPress={e => e.stopPropagation()} className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <Text className="text-lg font-bold text-gray-900 mb-1">Cancel this order?</Text>
            <Text className="text-sm text-gray-500 mb-3">Please tell us why you're cancelling.</Text>
            <TextInput value={cancelReason} onChangeText={setCancelReason} placeholder="Reason for cancellation" placeholderTextColor="#9ca3af" multiline className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 h-20" />
            <View className="flex-row gap-3 mt-4">
              <Pressable onPress={() => setShowCancel(false)} className="flex-1 border border-gray-300 rounded-xl py-3 items-center">
                <Text className="text-sm font-semibold text-gray-700">Keep Order</Text>
              </Pressable>
              <Pressable onPress={handleConfirmCancel} disabled={cancelling} className={`flex-1 rounded-xl py-3 items-center ${cancelling ? 'bg-gray-300' : 'bg-red-600'}`}>
                {cancelling ? <ActivityIndicator color="#fff" /> : <Text className="text-sm font-semibold text-white">Yes, Cancel</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showRating} transparent animationType="fade" onRequestClose={() => setShowRating(false)}>
        <Pressable className="flex-1 bg-black/50 items-center justify-center p-6" onPress={() => setShowRating(false)}>
          <Pressable onPress={e => e.stopPropagation()} className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <Text className="text-lg font-bold text-gray-900 mb-1">Rate your order</Text>
            <Text className="text-sm text-gray-500 mb-4">{restaurantName}</Text>
            <Text className="text-sm font-semibold text-gray-800 mb-2">Food</Text>
            <StarPicker value={restaurantStars} onChange={setRestaurantStars} />
            {hasDeliveryPartner && (
              <>
                <Text className="text-sm font-semibold text-gray-800 mb-2 mt-4">Delivery</Text>
                <StarPicker value={deliveryStars} onChange={setDeliveryStars} />
              </>
            )}
            <Pressable onPress={submitRating} disabled={submittingRating} className={`rounded-xl py-3 items-center mt-5 ${submittingRating ? 'bg-gray-300' : 'bg-[#0a4d2b]'}`}>
              {submittingRating ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Submit Rating</Text>}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function StarPicker({value, onChange}) {
  return (
    <View className="flex-row gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Pressable key={n} onPress={() => onChange(n)}>
          <Star size={28} color={n <= value ? '#facc15' : '#d1d5db'} fill={n <= value ? '#facc15' : 'none'} />
        </Pressable>
      ))}
    </View>
  );
}
