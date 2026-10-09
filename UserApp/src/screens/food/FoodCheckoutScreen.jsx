/**
 * The web app has two checkout implementations: Frontend's
 * pages/user/cart/Checkout.jsx (460 lines) is dead — it uses the mock
 * OrdersContext, fake USD*83 pricing, and nothing links to its route
 * (confirmed the same way ProductDetail.jsx was: only UserRouter.jsx's
 * own registration references it). The real order-placement flow is
 * `handlePlaceOrder` inside Cart.jsx (around line 1909) — this screen
 * ports that, continuing the Cart/Checkout split started in Food 9c.
 *
 * Ported: recipient name/phone, cutlery toggle, payment method choice
 * (Cash / Wallet — Razorpay shows as a real option but is wired to a
 * "coming soon" notice, matching this app's standing pattern of
 * deferring the native payment-gateway SDK to the dedicated payments
 * task rather than approximating it with a web script tag that doesn't
 * exist on RN), final bill, and `orderAPI.createOrder`. Dropped:
 * scheduled-for-later ordering (deferred alongside RestaurantDetails'
 * schedule sheet) and the client-side multi-restaurant-cart repair logic
 * (FoodCartContext's addToCart already refuses a second restaurant
 * before it ever reaches the cart, so cross-restaurant cart corruption
 * can't happen here the way it can on web's guest-cart path).
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Banknote, CheckCircle2, MapPin, ShoppingBag, Utensils, Wallet, Zap} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import {useFoodCart} from '../../context/FoodCartContext';
import {useFoodProfile} from '../../context/FoodProfileContext';
import orderApi from '../../services/food/orderApi';
import userApi from '../../services/food/userApi';

const RUPEE = '₹';

export default function FoodCheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};

  const {cart, restaurantId, restaurantName, clearCart} = useFoodCart();
  const {getDefaultAddress, userProfile, orderType} = useFoodProfile();
  const isTakeaway = orderType === 'takeaway';
  const defaultAddress = getDefaultAddress?.() || null;

  const [pricing, setPricing] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [recipientName, setRecipientName] = useState(userProfile?.name || '');
  const [recipientPhone, setRecipientPhone] = useState(defaultAddress?.phone || userProfile?.phone || '');
  const [sendCutlery, setSendCutlery] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [walletBalance, setWalletBalance] = useState(0);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    userApi
      .getWallet()
      .then(res => setWalletBalance(res?.data?.data?.wallet?.balance || 0))
      .catch(() => setWalletBalance(0));
  }, []);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0), [cart]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!restaurantId || cart.length === 0 || (!isTakeaway && !defaultAddress)) {
        setLoadingPricing(false);
        return;
      }
      setLoadingPricing(true);
      try {
        const response = await orderApi.calculateOrder({
          useCart: true,
          items: [],
          restaurantId,
          deliveryAddress: isTakeaway ? undefined : defaultAddress,
          couponCode: params.couponCode || undefined,
          orderType,
        });
        if (!cancelled) setPricing(response?.data?.data?.pricing || null);
      } catch {
        if (!cancelled) setPricing(null);
      } finally {
        if (!cancelled) setLoadingPricing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, cart.length, isTakeaway, defaultAddress, orderType, params.couponCode]);

  const deliveryFee = pricing?.deliveryFee ?? 0;
  const platformFee = pricing?.platformFee ?? 0;
  const packagingFee = pricing?.packagingFee ?? 0;
  const gstCharges = pricing?.tax ?? 0;
  const discount = pricing?.discount ?? 0;
  const total = pricing?.total ?? subtotal + (isTakeaway ? 0 : deliveryFee) + platformFee + packagingFee + gstCharges - discount;

  const handlePlaceOrder = useCallback(async () => {
    if (!isTakeaway && !defaultAddress) {
      Toast.show({type: 'error', text1: 'Please choose a delivery address to continue'});
      navigation.navigate('FoodSelectAddress');
      return;
    }
    if (!restaurantId || cart.length === 0) {
      Toast.show({type: 'error', text1: 'Your cart is empty'});
      return;
    }
    if (paymentMethod === 'razorpay') {
      Toast.show({type: 'info', text1: 'Online payment is coming soon', text2: 'Please pay with Cash or Wallet for now'});
      return;
    }
    if (paymentMethod === 'wallet' && walletBalance < total) {
      Toast.show({type: 'error', text1: `Insufficient wallet balance. Available ${RUPEE}${walletBalance.toFixed(0)}`});
      return;
    }

    setPlacingOrder(true);
    try {
      const orderPayload = {
        useCart: true,
        items: [],
        address: isTakeaway
          ? undefined
          : {
              ...defaultAddress,
              phone: recipientPhone || defaultAddress?.phone || '',
              name: recipientName,
              fullName: recipientName,
            },
        customerName: recipientName,
        customerPhone: recipientPhone || defaultAddress?.phone || '',
        restaurantId,
        restaurantName,
        couponCode: params.couponCode || undefined,
        restaurantNote: params.orderNote || '',
        sendCutlery,
        paymentMethod,
        orderType: orderType || 'delivery',
      };

      const response = await orderApi.createOrder(orderPayload);
      const order = response?.data?.data?.order;
      const orderId = order?._id || order?.orderId || order?.id;

      Toast.show({type: 'success', text1: paymentMethod === 'wallet' ? 'Order placed with Wallet payment' : 'Order placed with Cash on Delivery'});
      await clearCart();
      navigation.replace('FoodOrderTracking', {orderId});
    } catch (err) {
      Toast.show({type: 'error', text1: err?.response?.data?.message || err?.message || 'Could not place order'});
    } finally {
      setPlacingOrder(false);
    }
  }, [isTakeaway, defaultAddress, restaurantId, cart.length, paymentMethod, walletBalance, total, recipientPhone, recipientName, restaurantName, params.couponCode, params.orderNote, sendCutlery, orderType, clearCart, navigation]);

  return (
    <View className="flex-1 bg-slate-50">
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <Text className="text-lg font-bold text-gray-900">Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 160}}>
        <View className="bg-white mx-4 mt-4 rounded-2xl p-4 shadow-sm border border-slate-100">
          <View className="flex-row items-center gap-2 mb-3">
            {isTakeaway ? <ShoppingBag size={18} color="#0a4d2b" /> : <MapPin size={18} color="#0a4d2b" />}
            <Text className="text-sm font-bold text-gray-900">{isTakeaway ? 'Pickup Information' : 'Delivery Address'}</Text>
          </View>
          {isTakeaway ? (
            <View className="border-2 border-[#0a4d2b] bg-orange-50 rounded-xl p-3">
              <Text className="font-semibold text-orange-900">Self-Pickup</Text>
              <Text className="text-sm text-orange-800 mt-1">Collect your order from {restaurantName || 'the restaurant'} once it's marked ready.</Text>
            </View>
          ) : defaultAddress ? (
            <Pressable onPress={() => navigation.navigate('FoodSelectAddress')} className="border-2 border-[#0a4d2b] bg-orange-50 rounded-xl p-3 flex-row items-start justify-between">
              <View className="flex-1 mr-2">
                <Text className="text-xs font-bold text-[#0a4d2b] uppercase">{defaultAddress.label || 'Address'}</Text>
                <Text className="text-sm text-gray-800 mt-1">{defaultAddress.formattedAddress || defaultAddress.address}</Text>
              </View>
              <CheckCircle2 size={18} color="#0a4d2b" />
            </Pressable>
          ) : (
            <Pressable onPress={() => navigation.navigate('FoodSelectAddress')} className="border border-gray-300 rounded-xl p-4 items-center">
              <Text className="text-sm text-gray-600 mb-2">No address selected</Text>
              <Text className="text-sm font-bold text-[#0a4d2b]">Add / Select Address</Text>
            </Pressable>
          )}

          {!isTakeaway && (
            <View className="mt-3" style={{gap: 10}}>
              <TextInput value={recipientName} onChangeText={setRecipientName} placeholder="Recipient name" placeholderTextColor="#9ca3af" className="border border-gray-200 rounded-xl px-3 h-11 text-sm text-gray-900" />
              <TextInput value={recipientPhone} onChangeText={setRecipientPhone} placeholder="Recipient phone" placeholderTextColor="#9ca3af" keyboardType="phone-pad" className="border border-gray-200 rounded-xl px-3 h-11 text-sm text-gray-900" />
            </View>
          )}
        </View>

        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm border border-slate-100 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Utensils size={18} color="#6b7280" />
            <Text className="text-sm text-gray-800">Send cutlery</Text>
          </View>
          <Switch value={sendCutlery} onValueChange={setSendCutlery} trackColor={{true: '#0a4d2b'}} />
        </View>

        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm border border-slate-100">
          <Text className="text-sm font-bold text-gray-900 mb-3">Payment Method</Text>
          {[
            {id: 'cash', label: 'Cash on Delivery', sub: `Pay when you ${isTakeaway ? 'pickup' : 'receive'} your order`, Icon: Banknote},
            {id: 'wallet', label: 'Wallet', sub: `Balance: ${RUPEE}${walletBalance.toFixed(0)}`, Icon: Wallet},
            {id: 'razorpay', label: 'Pay Online', sub: 'Cards, UPI & more — coming soon', Icon: Zap},
          ].map(opt => (
            <Pressable key={opt.id} onPress={() => setPaymentMethod(opt.id)} className={`flex-row items-center justify-between border-2 rounded-xl p-3 mb-2 ${paymentMethod === opt.id ? 'border-[#0a4d2b] bg-orange-50' : 'border-gray-200'}`}>
              <View className="flex-row items-center gap-3">
                <opt.Icon size={18} color={paymentMethod === opt.id ? '#0a4d2b' : '#6b7280'} />
                <View>
                  <Text className="text-sm font-semibold text-gray-900">{opt.label}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">{opt.sub}</Text>
                </View>
              </View>
              {paymentMethod === opt.id && <CheckCircle2 size={18} color="#0a4d2b" />}
            </Pressable>
          ))}
        </View>

        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm border border-slate-100" style={{gap: 8}}>
          <Text className="text-sm font-bold text-gray-900 mb-1">Bill Summary</Text>
          <Row label="Subtotal" value={`${RUPEE}${subtotal.toFixed(2)}`} />
          {!isTakeaway && <Row label="Delivery Fee" value={deliveryFee === 0 ? 'FREE' : `${RUPEE}${deliveryFee.toFixed(2)}`} />}
          {platformFee > 0 && <Row label="Platform Fee" value={`${RUPEE}${platformFee.toFixed(2)}`} />}
          {packagingFee + gstCharges > 0 && <Row label="GST and Charges" value={`${RUPEE}${(packagingFee + gstCharges).toFixed(2)}`} />}
          {discount > 0 && <Row label="Coupon Discount" value={`-${RUPEE}${discount.toFixed(2)}`} labelClassName="text-[#0a4d2b]" valueClassName="text-[#0a4d2b]" />}
          <View className="flex-row justify-between pt-2 mt-1 border-t border-gray-100">
            <Text className="text-base font-bold text-gray-900">Total</Text>
            <Text className="text-base font-bold text-[#0a4d2b]">{loadingPricing ? '...' : `${RUPEE}${total.toFixed(2)}`}</Text>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <Pressable
          onPress={handlePlaceOrder}
          disabled={placingOrder || loadingPricing}
          className={`rounded-xl py-3.5 items-center ${placingOrder || loadingPricing ? 'bg-gray-300' : 'bg-[#0a4d2b]'}`}>
          {placingOrder ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">Place Order · {RUPEE}{total.toFixed(0)}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function Row({label, value, labelClassName = 'text-gray-600', valueClassName = 'text-gray-800'}) {
  return (
    <View className="flex-row justify-between">
      <Text className={`text-sm ${labelClassName}`}>{label}</Text>
      <Text className={`text-sm font-medium ${valueClassName}`}>{value}</Text>
    </View>
  );
}
