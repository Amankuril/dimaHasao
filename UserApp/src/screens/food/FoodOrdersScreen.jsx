/**
 * Ported from Frontend/src/modules/Food/pages/user/orders/Orders.jsx
 * (1228 lines) — the real backend-driven order history (`orderAPI`, not
 * the mock OrdersContext the dead ProductDetail/Checkout pages use).
 * Ports: the order-transform shape, status badges, the "N min remaining"
 * countdown for active orders, reorder (via FoodCartContext.replaceCart),
 * and the post-delivery rating modal (restaurant + delivery partner
 * stars, via `orderAPI.submitOrderRatings`). Dropped: the per-card
 * three-dot "share restaurant" menu (RN's Share.share from the restaurant
 * screen already covers that) and the localStorage-tracked
 * "shownRatingForOrders" set — this screen never auto-pops the rating
 * modal (same as web: it only opens from the explicit "Rate" button), so
 * there's nothing to dedupe against auto-popups in the first place.
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, FlatList, Image, Modal, Pressable, RefreshControl, Text, TextInput, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {AlertCircle, ArrowLeft, ChevronRight, Clock, Search, Star} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import orderApi from '../../services/food/orderApi';
import {useFoodCart} from '../../context/FoodCartContext';

const RUPEE = '₹';
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=100&q=80';

const getOrderStatus = order => {
  const status = order.status;
  if (status === 'delivered' || status === 'completed') return 'delivered';
  if (status === 'out_for_delivery' || status === 'outForDelivery') return 'outForDelivery';
  if (status === 'ready' || status === 'preparing') return 'preparing';
  if (String(status).toLowerCase().includes('cancel')) return 'cancelled';
  return status || 'confirmed';
};

const transformOrder = order => {
  const backendStatus = order.orderStatus || order.status;
  const isCancelled = ['cancelled', 'cancelled_by_user', 'cancelled_by_restaurant', 'cancelled_by_admin'].includes(backendStatus);
  const cancellationReason = order.cancellationReason || '';
  const isRestaurantCancelled = isCancelled && (order.cancelledBy === 'restaurant' || /rejected by restaurant|restaurant rejected|restaurant cancelled|restaurant is too busy|item not available|outside delivery area|kitchen closing|technical issue|order not accepted within time limit|restaurant did not respond/i.test(cancellationReason));
  const isUserCancelled = isCancelled && order.cancelledBy === 'user';

  return {
    id: order._id?.toString() || order.orderId || `ORD-${order._id}`,
    mongoId: order._id,
    orderId: order.orderId || order._id?.toString(),
    status: isRestaurantCancelled ? 'restaurant_cancelled' : getOrderStatus({...order, status: backendStatus}),
    createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString(),
    items: (order.items || []).map(item => ({
      itemId: item.itemId || item._id || item.id,
      name: item.name || item.foodName || 'Item',
      variantName: item.variantName || '',
      quantity: item.quantity || 1,
      price: item.price || 0,
      image: item.image || null,
      isVeg: item.isVeg === true || item.foodType === 'Veg',
      id: item.id || item._id,
    })),
    total: order.pricing?.total || order.total || 0,
    subtotal: order.pricing?.subtotal || 0,
    deliveryFee: order.pricing?.deliveryFee || 0,
    tax: order.pricing?.tax || 0,
    pricing: order.pricing || {},
    payment: order.payment || {},
    restaurant: order.restaurantId?.restaurantName || order.restaurantId?.name || order.restaurantName || 'Restaurant',
    restaurantId: order.restaurantId?._id || order.restaurantId,
    restaurantSlug: order.restaurantId?.slug || null,
    restaurantImage: order.restaurantId?.profileImage?.url || order.restaurantId?.profileImage || null,
    restaurantRating: order.ratings?.restaurant?.rating || null,
    deliveryPartnerRating: order.ratings?.deliveryPartner?.rating || null,
    cancellationReason,
    isRestaurantCancelled,
    isUserCancelled,
    eta: order.eta || {min: order.estimatedDeliveryTime || 30, max: order.estimatedDeliveryTime || 30},
    preparationTime: order.preparationTime || 0,
    acceptedAt: order.acceptedAt || null,
    deliveryPartnerId: order.deliveryPartnerId?._id || order.deliveryPartnerId || null,
    deliveryPartnerName: order.deliveryPartnerId?.name || order.deliveryPartnerName || null,
    orderType: order.orderType || 'delivery',
  };
};

const calculateCountdown = order => {
  if (!order || order.status === 'delivered' || String(order.status).toLowerCase().includes('cancel')) return null;
  if (order.preparationTime && order.acceptedAt) {
    const elapsedMinutes = Math.floor((Date.now() - new Date(order.acceptedAt)) / 60000);
    const remaining = Math.max(0, order.preparationTime - elapsedMinutes);
    return remaining > 0 ? remaining : null;
  }
  const elapsedMinutes = Math.floor((Date.now() - new Date(order.createdAt)) / 60000);
  const maxETA = order.eta?.max || 30;
  const remaining = Math.max(0, maxETA - elapsedMinutes);
  return remaining > 0 ? remaining : null;
};

export default function FoodOrdersScreen() {
  const navigation = useNavigation();
  const {replaceCart} = useFoodCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [countdowns, setCountdowns] = useState({});
  const [ratingModal, setRatingModal] = useState(null);
  const [restaurantStars, setRestaurantStars] = useState(0);
  const [deliveryStars, setDeliveryStars] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await orderApi.getOrders({limit: 100, page: 1});
      const list = response?.data?.data?.orders || [];
      const transformed = list.map(transformOrder).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(transformed);
    } catch {
      Toast.show({type: 'error', text1: 'Could not load orders'});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders]),
  );

  useEffect(() => {
    const update = () => {
      const next = {};
      orders.forEach(o => {
        const remaining = calculateCountdown(o);
        if (remaining !== null) next[o.id] = remaining;
      });
      setCountdowns(next);
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [orders]);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.trim().toLowerCase();
    return orders.filter(o => o.restaurant.toLowerCase().includes(q) || o.items.some(i => i.name.toLowerCase().includes(q)));
  }, [orders, search]);

  const handleReorder = order => {
    if (!order.restaurantId || !order.items.length) {
      Toast.show({type: 'error', text1: 'Order items not available'});
      return;
    }
    const reorderItems = order.items.map((item, index) => ({
      id: item.id || item.itemId,
      name: item.name,
      price: Number(item.price) || 0,
      image: item.image || '',
      restaurant: order.restaurant,
      restaurantId: order.restaurantId,
      isVeg: item.isVeg !== false,
      quantity: Math.max(1, Number(item.quantity) || 1),
      reorderIndex: index,
    }));
    replaceCart(reorderItems);
    Toast.show({type: 'success', text1: 'Items added to cart'});
    navigation.navigate('FoodRestaurantDetails', {restaurantId: order.restaurantId});
  };

  const openRating = order => {
    setRatingModal(order);
    setRestaurantStars(0);
    setDeliveryStars(0);
  };

  const hasDeliveryPartner = order => !!(order?.deliveryPartnerId || order?.deliveryPartnerName);

  const submitRating = async () => {
    if (!ratingModal || restaurantStars === 0 || (hasDeliveryPartner(ratingModal) && deliveryStars === 0)) {
      Toast.show({type: 'error', text1: 'Please select all required ratings'});
      return;
    }
    setSubmittingRating(true);
    try {
      await orderApi.submitOrderRatings(ratingModal.id, {
        restaurantRating: restaurantStars,
        deliveryPartnerRating: hasDeliveryPartner(ratingModal) ? deliveryStars : undefined,
      });
      setOrders(prev => prev.map(o => (o.id === ratingModal.id ? {...o, restaurantRating: restaurantStars, deliveryPartnerRating: hasDeliveryPartner(ratingModal) ? deliveryStars : null} : o)));
      Toast.show({type: 'success', text1: 'Thanks for rating your order!'});
      setRatingModal(null);
    } catch (err) {
      Toast.show({type: 'error', text1: err?.response?.data?.message || 'Failed to submit rating'});
    } finally {
      setSubmittingRating(false);
    }
  };

  const renderOrder = ({item: order}) => {
    const isDelivered = order.status === 'delivered';
    const isCancelled = order.status === 'cancelled' || order.status === 'restaurant_cancelled';
    const hasRated = order.restaurantRating && (!order.deliveryPartnerId || order.deliveryPartnerRating);

    return (
      <View className="bg-white rounded-2xl border border-gray-100 shadow-sm mx-4 mb-4 overflow-hidden">
        <View className="flex-row items-start gap-3 p-4 pb-2">
          <Image source={{uri: order.restaurantImage || FALLBACK_IMAGE}} className="w-12 h-12 rounded-lg" resizeMode="cover" />
          <View className="flex-1 min-w-0">
            <Text className="font-semibold text-gray-800 text-base" numberOfLines={1}>
              {order.restaurant}
            </Text>
            <Text className="text-[11px] text-gray-500 mt-0.5">
              Order ID: <Text className="font-semibold text-gray-700">{order.orderId}</Text>
            </Text>
          </View>
        </View>

        <View className="border-t border-dashed border-gray-100 mx-4" />

        <View className="px-4 py-2" style={{gap: 6}}>
          {order.items.map((item, idx) => (
            <View key={item.id || idx} className="flex-row items-center gap-2">
              <View className={`w-3.5 h-3.5 border rounded-sm items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                <View className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
              </View>
              <Text className="text-sm text-gray-800 flex-1" numberOfLines={1}>
                {item.quantity} x {item.name}
              </Text>
              <Text className="text-sm font-semibold text-gray-800">{RUPEE}{(item.quantity * item.price).toFixed(0)}</Text>
            </View>
          ))}
        </View>

        <View className="bg-gray-50 rounded-xl mx-4 mb-2 px-3 py-2.5 flex-row justify-between items-center">
          <Text className="text-sm font-semibold text-gray-800">Total Bill</Text>
          <Text className="text-base font-bold text-gray-900">{RUPEE}{order.total.toFixed(0)}</Text>
        </View>

        <View className="px-4 pb-4 pt-1" style={{gap: 10}}>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</Text>
            <StatusBadge order={order} />
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-1 min-w-0 mr-2">
              {order.isRestaurantCancelled ? (
                <Text className="text-xs text-red-500 font-medium" numberOfLines={1}>
                  {order.cancellationReason || 'Cancelled by restaurant'}
                </Text>
              ) : isDelivered && hasRated ? (
                <View className="flex-row items-center gap-1">
                  <Star size={12} color="#16a34a" fill="#16a34a" />
                  <Text className="text-xs text-gray-500">You rated {order.restaurantRating}/5</Text>
                </View>
              ) : isDelivered ? (
                <Pressable onPress={() => openRating(order)} className="flex-row items-center gap-1">
                  <Star size={14} color="#94a3b8" />
                  <Text className="text-xs font-bold text-slate-500">{order.orderType === 'takeaway' ? 'Rate Restaurant' : 'Rate Restaurant & Delivery'}</Text>
                </Pressable>
              ) : countdowns[order.id] ? (
                <View className="flex-row items-center gap-1">
                  <Clock size={12} color="#0a4d2b" />
                  <Text className="text-xs font-semibold text-[#0a4d2b]">{countdowns[order.id]} min remaining</Text>
                </View>
              ) : null}
            </View>

            <View className="flex-row items-center gap-3 flex-shrink-0">
              <Pressable onPress={() => navigation.navigate(isDelivered || isCancelled ? 'FoodUserOrderDetails' : 'FoodOrderTracking', {orderId: order.id})} className="flex-row items-center gap-0.5">
                <Text className="text-xs font-bold text-gray-600">View Details</Text>
                <ChevronRight size={14} color="#4b5563" />
              </Pressable>
              {(isDelivered || isCancelled) && (
                <Pressable onPress={() => handleReorder(order)} className="bg-[#0a4d2b] px-3 py-1.5 rounded-lg">
                  <Text className="text-xs font-bold text-white">Reorder</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white flex-row items-center gap-3 px-4 py-3 border-b border-gray-100">
        <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 items-center justify-center">
          <ArrowLeft size={20} color="#374151" />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-800 flex-1">Your Orders</Text>
      </View>

      <View className="px-4 py-3">
        <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 h-10">
          <Search size={16} color="#9ca3af" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search by restaurant or dish" placeholderTextColor="#9ca3af" className="flex-1 ml-2 text-sm text-gray-800" />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0a4d2b" size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <AlertCircle size={36} color="#9ca3af" />
          <Text className="text-base font-semibold text-gray-700 mt-3">No orders yet</Text>
          <Text className="text-sm text-gray-500 mt-1 text-center">Your placed orders will show up here</Text>
        </View>
      ) : (
        <FlatList data={filtered} keyExtractor={o => o.id} renderItem={renderOrder} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} colors={['#0a4d2b']} />} contentContainerStyle={{paddingTop: 4, paddingBottom: 24}} />
      )}

      <Modal visible={!!ratingModal} transparent animationType="fade" onRequestClose={() => setRatingModal(null)}>
        <Pressable className="flex-1 bg-black/50 items-center justify-center p-6" onPress={() => setRatingModal(null)}>
          {ratingModal && (
            <Pressable onPress={e => e.stopPropagation()} className="bg-white rounded-2xl p-5 w-full max-w-sm">
              <Text className="text-lg font-bold text-gray-900 mb-1">Rate your order</Text>
              <Text className="text-sm text-gray-500 mb-4">{ratingModal.restaurant}</Text>

              <Text className="text-sm font-semibold text-gray-800 mb-2">Food</Text>
              <StarPicker value={restaurantStars} onChange={setRestaurantStars} />

              {hasDeliveryPartner(ratingModal) && (
                <>
                  <Text className="text-sm font-semibold text-gray-800 mb-2 mt-4">Delivery</Text>
                  <StarPicker value={deliveryStars} onChange={setDeliveryStars} />
                </>
              )}

              <Pressable onPress={submitRating} disabled={submittingRating} className={`rounded-xl py-3 items-center mt-5 ${submittingRating ? 'bg-gray-300' : 'bg-[#0a4d2b]'}`}>
                {submittingRating ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Submit Rating</Text>}
              </Pressable>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

function StatusBadge({order}) {
  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled' || order.status === 'restaurant_cancelled';
  const isUserCancelled = order.isUserCancelled;
  const isReadyForPickup = order.orderType === 'takeaway' && (order.status === 'ready' || order.status === 'ready_for_pickup');

  let label = 'Confirmed';
  let bgClassName = 'bg-amber-50 border border-amber-200';
  let textClassName = 'text-amber-700';
  if (order.isRestaurantCancelled || (isCancelled && !isUserCancelled)) {
    label = 'Cancelled';
    bgClassName = 'bg-red-50 border border-red-200';
    textClassName = 'text-red-700';
  } else if (isUserCancelled) {
    label = 'Cancelled By You';
    bgClassName = 'bg-red-50 border border-red-200';
    textClassName = 'text-red-700';
  } else if (isDelivered) {
    label = order.orderType === 'takeaway' ? 'Picked Up' : 'Delivered';
    bgClassName = 'bg-green-600';
    textClassName = 'text-white';
  } else if (isReadyForPickup) {
    label = 'Ready for Pickup';
    bgClassName = 'bg-green-600';
    textClassName = 'text-white';
  } else if (order.status === 'preparing') {
    label = 'Preparing';
  } else if (order.status === 'outForDelivery') {
    label = 'Out for Delivery';
  }

  return (
    <View className={`px-3 py-1 rounded-full ${bgClassName}`}>
      <Text className={`text-[10px] font-black uppercase tracking-wider ${textClassName}`}>{label}</Text>
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
