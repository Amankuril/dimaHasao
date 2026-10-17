/**
 * Ported from Frontend/src/modules/Food/pages/user/orders/OrderInvoice.jsx
 * (349 lines) — same invoice layout (bill-to, items table, fee breakdown,
 * grand total), re-pointed at the real order shape. The web version reads
 * `order.subtotal`/`order.tax`/`order.total` etc. as flat fields, which
 * only exist on its mock OrdersContext's shape; a real backend order (the
 * only kind reachable here, via orderAPI.getOrderDetails) keeps those
 * under `order.pricing.*` (same shape FoodUserOrderDetailsScreen already
 * reads) — those flat reads would be `undefined` on every real order, so
 * this uses `order.pricing.*` instead of carrying the bug over. Print/
 * Download PDF (window.open + a print stylesheet) has no RN equivalent;
 * replaced with a plain text share via RN's Share API.
 */
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Image, Pressable, ScrollView, Share, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ArrowLeft, FileText, Share2} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import orderApi from '../../services/food/orderApi';

const RUPEE = '₹';
const DISH_FALLBACK = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=100&q=80';

export default function FoodOrderInvoiceScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const orderId = route.params?.orderId;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    orderApi
      .getOrderDetails(orderId)
      .then(res => {
        if (!cancelled) setOrder(res?.data?.data?.order || null);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#0a4d2b" size="large" />
      </View>
    );
  }

  if (!order) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Text className="text-lg font-bold text-gray-900">Order Not Found</Text>
        <Pressable onPress={() => navigation.navigate('FoodOrders')} className="mt-4 bg-[#0a4d2b] px-5 py-2.5 rounded-xl">
          <Text className="text-white font-semibold">Back to Orders</Text>
        </Pressable>
      </View>
    );
  }

  const pricing = order.pricing || {};
  const items = Array.isArray(order.items) ? order.items : [];
  const address = order.address || order.deliveryAddress || {};
  const orderIdDisplay = order.orderId || order._id || orderId;
  const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'}) : '';

  const handleShare = () => {
    const lines = [
      `INVOICE — Order ${orderIdDisplay}`,
      formattedDate,
      '',
      ...items.map(item => `${item.quantity || 1} x ${item.name} — ${RUPEE}${((item.price || 0) * (item.quantity || 1)).toFixed(2)}`),
      '',
      `Subtotal: ${RUPEE}${Number(pricing.subtotal || 0).toFixed(2)}`,
      `Delivery Fee: ${RUPEE}${Number(pricing.deliveryFee || 0).toFixed(2)}`,
      `GST: ${RUPEE}${Number(pricing.tax || 0).toFixed(2)}`,
      pricing.discount > 0 ? `Discount: -${RUPEE}${Number(pricing.discount).toFixed(2)}` : null,
      `Total: ${RUPEE}${Number(pricing.total || 0).toFixed(2)}`,
    ].filter(Boolean);
    Share.share({message: lines.join('\n')}).catch(() => {});
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 items-center justify-center">
            <ArrowLeft size={20} color="#374151" />
          </Pressable>
          <View>
            <Text className="text-lg font-bold text-gray-900">Invoice</Text>
            <Text className="text-xs text-gray-500">Order {orderIdDisplay}</Text>
          </View>
        </View>
        <Pressable onPress={handleShare} className="w-9 h-9 rounded-full border border-gray-200 items-center justify-center">
          <Share2 size={16} color="#374151" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 32}}>
        <View className="border-2 border-gray-100 rounded-2xl p-4">
          <View className="flex-row items-center gap-2 mb-1">
            <FileText size={22} color="#0a4d2b" />
            <Text className="text-xl font-bold text-[#0a4d2b]">INVOICE</Text>
          </View>
          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-xs text-gray-500">Dima Hasao Food Delivery</Text>
            <View className="bg-[#0a4d2b] px-3 py-1 rounded-full">
              <Text className="text-xs font-bold text-white uppercase">{(order.status || 'placed').replace(/_/g, ' ')}</Text>
            </View>
          </View>

          <View className="flex-row justify-between mt-4 pt-4 border-t border-dashed border-gray-200">
            <View className="flex-1 mr-3">
              <Text className="text-xs font-bold text-gray-800 mb-1">Bill To</Text>
              <Text className="text-xs text-gray-600">{address?.street || address?.formattedAddress || 'Self pickup'}</Text>
              {address?.city ? (
                <Text className="text-xs text-gray-600 mt-0.5">
                  {address.city}, {address.state} {address.zipCode}
                </Text>
              ) : null}
            </View>
            <View className="flex-1 items-end">
              <Text className="text-xs font-bold text-gray-800 mb-1">Invoice Details</Text>
              <Text className="text-xs text-gray-600">#{orderIdDisplay}</Text>
              <Text className="text-xs text-gray-600 mt-0.5">{formattedDate}</Text>
              <Text className="text-xs text-gray-600 mt-0.5 uppercase">{(order.payment?.method || 'online').toUpperCase()}</Text>
            </View>
          </View>

          <View className="mt-4 pt-4 border-t border-dashed border-gray-200" style={{gap: 10}}>
            <Text className="text-xs font-bold text-gray-800">Order Items</Text>
            {items.map((item, idx) => (
              <View key={idx} className="flex-row items-center gap-3">
                <Image source={{uri: item.image || DISH_FALLBACK}} className="w-10 h-10 rounded" resizeMode="cover" />
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Qty {item.quantity || 1} × {RUPEE}{(item.price || 0).toFixed(2)}
                  </Text>
                </View>
                <Text className="text-sm font-medium text-gray-900">{RUPEE}{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          <View className="mt-4 pt-4 border-t border-dashed border-gray-200" style={{gap: 6}}>
            <InvoiceRow label="Subtotal" value={`${RUPEE}${Number(pricing.subtotal || 0).toFixed(2)}`} />
            {Number(pricing.packagingFee || 0) > 0 && <InvoiceRow label="Packaging Fee" value={`${RUPEE}${Number(pricing.packagingFee).toFixed(2)}`} />}
            {Number(pricing.platformFee || 0) > 0 && <InvoiceRow label="Platform Fee" value={`${RUPEE}${Number(pricing.platformFee).toFixed(2)}`} />}
            {order.orderType !== 'takeaway' && <InvoiceRow label="Delivery Fee" value={`${RUPEE}${Number(pricing.deliveryFee || 0).toFixed(2)}`} />}
            <InvoiceRow label="GST" value={`${RUPEE}${Number(pricing.tax || 0).toFixed(2)}`} />
            {Number(pricing.discount || 0) > 0 && <InvoiceRow label="Discount" value={`-${RUPEE}${Number(pricing.discount).toFixed(2)}`} valueClassName="text-green-600" />}
            <View className="flex-row justify-between pt-3 mt-1 border-t-2 border-[#0a4d2b]">
              <Text className="text-lg font-bold text-gray-900">Total</Text>
              <Text className="text-lg font-bold text-gray-900">{RUPEE}{Number(pricing.total || 0).toFixed(2)}</Text>
            </View>
          </View>

          <View className="mt-6 pt-4 border-t border-gray-100 items-center">
            <Text className="text-xs text-gray-500">Thank you for your order!</Text>
            <Text className="text-xs text-gray-500 mt-1">For any queries, please contact our support team.</Text>
          </View>
        </View>

        <View className="flex-row gap-3 mt-4">
          <Pressable onPress={() => navigation.navigate('FoodOrderTracking', {orderId})} className="flex-1 border border-gray-300 rounded-xl py-3 items-center">
            <Text className="text-sm font-semibold text-gray-800">Track Order</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('FoodOrders')} className="flex-1 border border-gray-300 rounded-xl py-3 items-center">
            <Text className="text-sm font-semibold text-gray-800">Back to Orders</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function InvoiceRow({label, value, valueClassName = 'text-gray-900'}) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-sm text-gray-600">{label}</Text>
      <Text className={`text-sm font-medium ${valueClassName}`}>{value}</Text>
    </View>
  );
}
