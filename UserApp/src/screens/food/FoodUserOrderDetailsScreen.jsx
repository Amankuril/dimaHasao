/**
 * Ported from Frontend/src/modules/Food/pages/user/orders/UserOrderDetails.jsx
 * (800 lines): status card, cancellation reason banner, restaurant card
 * with call button, items list, full bill breakdown (with the savings
 * banner), customer/payment/date/address info, and reorder. The one real
 * drop is the jsPDF-generated PDF receipt — no RN equivalent library is
 * installed, and it's not worth adding just for this; "Invoice" now
 * opens FoodOrderInvoiceScreen, a plain read-only summary of the same
 * data instead of a generated file.
 */
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ArrowLeft, Calendar, Check, CreditCard, FileText, MapPin, Phone, RotateCcw, User, X} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import orderApi from '../../services/food/orderApi';
import restaurantApi from '../../services/food/restaurantApi';
import {useFoodCart} from '../../context/FoodCartContext';

const RUPEE = '₹';
const DISH_FALLBACK = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=100&q=80';

const isCancelledStatus = status => status === 'cancelled' || status === 'cancelled_by_restaurant' || status === 'restaurant_cancelled' || String(status || '').includes('cancel');

export default function FoodUserOrderDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const orderId = route.params?.orderId;
  const {replaceCart} = useFoodCart();

  const [order, setOrder] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await orderApi.getOrderDetails(orderId);
        const orderData = response?.data?.data?.order || response?.data?.order;
        if (!orderData) throw new Error('Order not found');
        if (cancelled) return;
        setOrder(orderData);

        const restaurantId = orderData.restaurantId;
        if (restaurantId && typeof restaurantId === 'string') {
          try {
            const restaurantRes = await restaurantApi.getRestaurantById(restaurantId);
            if (!cancelled) setRestaurant(restaurantRes?.data?.data || null);
          } catch {
            // non-fatal — order details still render without it
          }
        }
      } catch (err) {
        Toast.show({type: 'error', text1: err?.response?.data?.message || 'Failed to load order details'});
        navigation.goBack();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, navigation]);

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator color="#0a4d2b" size="large" />
      </View>
    );
  }
  if (!order) return null;

  const restaurantObj = restaurant || order.restaurantId || order.restaurant || {};
  const restaurantName = order.restaurantName || restaurantObj.restaurantName || restaurantObj.name || 'Restaurant';
  const restaurantLocation = restaurantObj.address || restaurantObj.location?.formattedAddress || restaurantObj.location?.address || 'Address not available';
  const restaurantPhone = restaurantObj.primaryContactNumber || restaurantObj.phone || restaurantObj.contactNumber || order.restaurantPhone || '';
  const items = Array.isArray(order.items) ? order.items : [];
  const pricing = order.pricing || {};
  const isCancelled = isCancelledStatus(order.status);
  const isDelivered = order.status === 'delivered';
  const orderIdDisplay = order.orderId || order._id || orderId;
  const userName = order.userName || order.customerName || 'Customer';
  const userPhone = order.userPhone || order.customerPhone || '';
  const paymentMethodRaw = (order.payment?.method || 'online').toLowerCase();
  const isCod = paymentMethodRaw === 'cash' || paymentMethodRaw === 'cod';
  const paymentDate = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', {month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'}) : '';
  const addressSrc = order.deliveryAddress || order.address || null;
  const addressText = addressSrc ? addressSrc.formattedAddress || addressSrc.address || [addressSrc.street || addressSrc.addressLine1, addressSrc.area, addressSrc.city, addressSrc.state, addressSrc.zipCode || addressSrc.pincode].filter(Boolean).join(', ') : '';
  const savings = (pricing.discount || 0) + (pricing.originalItemTotal || 0) - (pricing.subtotal || 0);

  const handleReorder = () => {
    if (!items.length) {
      Toast.show({type: 'error', text1: 'Order items not available'});
      return;
    }
    const reorderItems = items
      .map((item, index) => {
        const itemId = item.id || item.itemId || item._id;
        if (!itemId) return null;
        return {
          id: itemId,
          name: item.name || 'Item',
          price: Number(item.price) || 0,
          image: item.image || '',
          restaurant: restaurantName,
          restaurantId: restaurantObj._id || restaurantObj.restaurantId || order.restaurantId,
          isVeg: item.isVeg === true || item.foodType === 'Veg',
          quantity: Math.max(1, Number(item.quantity || item.qty) || 1),
          reorderIndex: index,
        };
      })
      .filter(Boolean);
    if (!reorderItems.length) {
      Toast.show({type: 'error', text1: 'No reorderable items found'});
      return;
    }
    replaceCart(reorderItems);
    Toast.show({type: 'success', text1: 'Items added to cart'});
    navigation.navigate('FoodRestaurantDetails', {restaurantId: restaurantObj._id || restaurantObj.restaurantId || order.restaurantId});
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white flex-row items-center gap-3 px-4 py-3 border-b border-gray-100">
        <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 items-center justify-center">
          <ArrowLeft size={20} color="#374151" />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-800">Order Details</Text>
      </View>

      <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 100}}>
        <View className={`bg-white p-4 rounded-xl flex-row items-center gap-3 shadow-sm border border-gray-100`}>
          <View className={`w-10 h-10 rounded-lg items-center justify-center ${isCancelled ? 'bg-red-50' : isDelivered ? 'bg-green-50' : 'bg-amber-50'}`}>
            {isCancelled ? <X size={20} color="#dc2626" /> : isDelivered ? <Check size={20} color="#16a34a" /> : <RotateCcw size={20} color="#d97706" />}
          </View>
          <View className="flex-1">
            <Text className="font-bold text-gray-800">{isDelivered ? (order.orderType === 'takeaway' ? 'Order Picked Up' : 'Order was delivered') : isCancelled ? 'Order was cancelled' : `Order Status: ${(order.status || 'PROCESSING').toUpperCase()}`}</Text>
            <Text className="text-xs text-gray-500 mt-0.5">{isDelivered ? 'Thank you for ordering' : isCancelled ? 'This order was not fulfilled' : 'We are processing your order'}</Text>
          </View>
        </View>

        {isCancelled && (
          <View className="bg-red-50 border border-red-100 rounded-xl p-4 mt-3">
            <Text className="text-[10px] font-bold text-red-800 uppercase tracking-widest">Cancellation Reason</Text>
            <Text className="text-sm font-semibold text-gray-900 mt-1">{order.cancellationReason || 'The restaurant was unable to fulfill this order.'}</Text>
            <Text className="text-[11px] text-gray-500 mt-1">Refund will be initiated to your source payment method.</Text>
          </View>
        )}

        <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mt-3">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-3 flex-1 min-w-0">
              <Image source={{uri: restaurantObj.profileImage?.url || restaurantObj.profileImage || order.restaurantImage || items[0]?.image || DISH_FALLBACK}} className="w-10 h-10 rounded-lg" resizeMode="cover" />
              <View className="flex-1 min-w-0">
                <Text className="font-semibold text-gray-800" numberOfLines={1}>
                  {restaurantName}
                </Text>
                <Text className="text-xs text-gray-500" numberOfLines={1}>
                  {restaurantLocation}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => (restaurantPhone ? Linking.openURL(`tel:${restaurantPhone}`) : Toast.show({type: 'error', text1: 'Restaurant phone not available'}))}
              className="w-8 h-8 rounded-full border border-[#0a4d2b]/30 items-center justify-center">
              <Phone size={14} color="#0a4d2b" />
            </Pressable>
          </View>

          <Text className="text-xs text-gray-500 uppercase mb-3">Order ID: #{orderIdDisplay}</Text>
          {order.note ? <Text className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 self-start px-3 py-1 rounded-full mb-3">Note: {order.note}</Text> : null}

          <View className="border-t border-dashed border-gray-200" style={{gap: 10, paddingTop: 10}}>
            {items.map((item, idx) => (
              <View key={idx} className="flex-row items-center gap-3">
                <Image source={{uri: item.image || DISH_FALLBACK}} className="w-14 h-14 rounded-xl" resizeMode="cover" />
                <View className="flex-1 min-w-0 flex-row items-center gap-2">
                  <View className={`w-3 h-3 border rounded-sm items-center justify-center ${item.isVeg === true || item.foodType === 'Veg' ? 'border-green-600' : 'border-red-600'}`}>
                    <View className={`w-1.5 h-1.5 rounded-full ${item.isVeg === true || item.foodType === 'Veg' ? 'bg-green-600' : 'bg-red-600'}`} />
                  </View>
                  <Text className="text-sm text-gray-700 flex-1" numberOfLines={2}>
                    {item.quantity || 1} x {item.name}
                    {item.variantName ? ` (${item.variantName})` : ''}
                  </Text>
                </View>
                <Text className="text-sm font-medium text-gray-800">{RUPEE}{(item.price || 0).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>

        {isDelivered && (
          <Pressable onPress={() => navigation.navigate('FoodSubmitComplaint', {orderId: order._id || orderId})} className="bg-[#0a4d2b]/5 border border-[#0a4d2b]/20 rounded-lg py-3 mt-3 flex-row items-center justify-center gap-2">
            <FileText size={16} color="#0a4d2b" />
            <Text className="text-sm font-semibold text-[#0a4d2b]">Restaurant Complaint</Text>
          </Pressable>
        )}

        <View className="bg-white rounded-xl shadow-sm border border-gray-100 mt-3 overflow-hidden">
          <View className="p-4 flex-row items-center justify-between border-b border-gray-100">
            <View className="flex-row items-center gap-2">
              <FileText size={18} color="#4b5563" />
              <Text className="font-semibold text-gray-800">Bill Summary</Text>
            </View>
            <Pressable onPress={() => navigation.navigate('FoodOrderInvoice', {orderId})}>
              <Text className="text-xs font-bold text-[#0a4d2b]">View Invoice</Text>
            </Pressable>
          </View>
          <View className="p-4" style={{gap: 8}}>
            <BillRow label="Item total" value={`${RUPEE}${Number(pricing.subtotal || pricing.total || 0).toFixed(2)}`} />
            <BillRow label="GST (govt. taxes)" value={`${RUPEE}${Number(pricing.tax || 0).toFixed(2)}`} />
            {order.orderType !== 'takeaway' && order.orderType !== 'dining' && <BillRow label="Delivery fee" value={pricing.deliveryFee ? `${RUPEE}${Number(pricing.deliveryFee).toFixed(2)}` : 'FREE'} />}
            {Number(pricing.platformFee || 0) > 0 && <BillRow label="Platform fee" value={`${RUPEE}${Number(pricing.platformFee).toFixed(2)}`} />}
            <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
              <View className="flex-row items-center gap-2">
                <Text className="font-bold text-gray-800">Paid</Text>
                <View className={`px-2 py-0.5 rounded border ${isCod ? 'bg-gray-100 border-gray-200' : 'bg-green-100 border-green-200'}`}>
                  <Text className={`text-[10px] font-bold uppercase ${isCod ? 'text-gray-800' : 'text-green-800'}`}>{isCod ? 'COD' : 'Online'}</Text>
                </View>
              </View>
              <Text className="font-bold text-gray-800">{RUPEE}{Number(pricing.total || 0).toFixed(2)}</Text>
            </View>
          </View>
          {savings > 0 && (
            <View className="bg-[#0a4d2b]/5 py-3 items-center">
              <Text className="text-sm font-bold text-[#0a4d2b]">You saved {RUPEE}{Number(savings).toFixed(2)} on this order!</Text>
            </View>
          )}
        </View>

        <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mt-3" style={{gap: 14}}>
          <InfoRow Icon={User} title="Customer Details" lines={[userName, userPhone]} />
          <InfoRow Icon={CreditCard} title="Payment Method" lines={[`Paid via ${isCod ? 'COD' : 'Online'}`]} />
          <InfoRow Icon={Calendar} title="Payment Date" lines={[paymentDate]} />
          {order.orderType !== 'takeaway' && <InfoRow Icon={MapPin} title="Delivery Address" lines={[addressText || 'Address not available']} />}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex-row gap-3">
        <Pressable onPress={handleReorder} className="flex-1 bg-[#0a4d2b] rounded-lg py-3 items-center flex-row justify-center gap-2">
          <RotateCcw size={16} color="#fff" />
          <Text className="text-white font-semibold">Reorder</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('FoodOrderInvoice', {orderId})} className="flex-1 border border-[#0a4d2b] rounded-lg py-3 items-center flex-row justify-center gap-2">
          <FileText size={16} color="#0a4d2b" />
          <Text className="text-[#0a4d2b] font-semibold">Invoice</Text>
        </Pressable>
      </View>
    </View>
  );
}

function BillRow({label, value}) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="text-sm text-gray-800">{value}</Text>
    </View>
  );
}

function InfoRow({Icon, title, lines}) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
        <Icon size={16} color="#4b5563" />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-gray-800 text-sm">{title}</Text>
        {lines.filter(Boolean).map((line, idx) => (
          <Text key={idx} className="text-gray-500 text-xs mt-0.5">
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}
