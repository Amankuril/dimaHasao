/**
 * Ported from Frontend/src/modules/Food/pages/user/cart/Cart.jsx (4137
 * lines). On web this one screen does cart review AND checkout (address
 * picker, payment-method sheet, Razorpay, `orderAPI.createOrder`) — this
 * app already has dedicated FoodCheckout/FoodSelectAddress routes
 * (FoodStack.jsx) for that, so the split here is deliberate: this screen
 * owns items, the note, add-ons, coupons, and the bill breakdown computed
 * via the same `orderAPI.calculateOrder` the web app uses; "Proceed to
 * Pay" hands off to FoodCheckout (built in Food 9d) for address
 * confirmation, payment method, and placing the order. Dropped: the
 * confetti/savings-congrats animations, the zone-mismatch warning banner
 * (Checkout will be the one place that must resolve a deliverable
 * address before payment), and the full client-side delivery-fee-range
 * fallback table — `calculateOrder` is the primary path on web too, the
 * fallback here is just "show subtotal-only until it responds."
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Image, Modal, Pressable, ScrollView, Share, Text, TextInput, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {AlertCircle, ArrowLeft, ChevronRight, Minus, Plus, Sparkles, Tag, Utensils, X} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import {useFoodCart} from '../../context/FoodCartContext';
import {useFoodProfile} from '../../context/FoodProfileContext';
import restaurantApi from '../../services/food/restaurantApi';
import orderApi from '../../services/food/orderApi';
import {getRestaurantAvailabilityStatus} from '../../utils/restaurantAvailability';
import {filterPublicOffers, mapPublicOfferToCartCoupon} from '../../utils/offerUtils';

const RUPEE = '₹';
const FOOD_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop';

export default function FoodCartScreen() {
  const navigation = useNavigation();
  const {cart, restaurantId, restaurantName, updateQuantity, removeFromCart, addToCart} = useFoodCart();
  const {getDefaultAddress, orderType} = useFoodProfile();

  const [restaurant, setRestaurant] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [addons, setAddons] = useState([]);
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showBillDetails, setShowBillDetails] = useState(false);

  const defaultAddress = getDefaultAddress?.() || null;
  const isTakeaway = orderType === 'takeaway';
  const hasSavedAddress = Boolean(defaultAddress);
  const canCalculate = cart.length > 0 && restaurantId && (isTakeaway || hasSavedAddress);

  useEffect(() => {
    if (!restaurantId) {
      setRestaurant(null);
      return;
    }
    restaurantApi
      .getRestaurantById(restaurantId)
      .then(res => setRestaurant(res?.data?.data || null))
      .catch(() => setRestaurant(null));
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) {
      setAddons([]);
      return;
    }
    restaurantApi
      .getAddonsByRestaurantId(restaurantId)
      .then(res => setAddons(res?.data?.data?.addons || res?.data?.addons || []))
      .catch(() => setAddons([]));
  }, [restaurantId]);

  useEffect(() => {
    restaurantApi
      .getPublicOffers()
      .then(res => {
        const list = res?.data?.data?.allOffers || res?.data?.allOffers || [];
        const filtered = filterPublicOffers(list, {restaurantId, restaurant, orderType, requireShowInCart: true});
        setAvailableCoupons(filtered.map(o => mapPublicOfferToCartCoupon(o, RUPEE)));
      })
      .catch(() => setAvailableCoupons([]));
  }, [restaurantId, restaurant, orderType]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0), [cart]);

  const recalculatePricing = useCallback(
    async couponCode => {
      if (!canCalculate) {
        setPricing(null);
        return;
      }
      setLoadingPricing(true);
      try {
        const response = await orderApi.calculateOrder({
          useCart: true,
          items: [],
          restaurantId,
          deliveryAddress: isTakeaway ? undefined : defaultAddress,
          couponCode: couponCode ?? appliedCoupon?.code ?? undefined,
          orderType,
        });
        const pricingData = response?.data?.data?.pricing;
        if (pricingData) setPricing(pricingData);
      } catch {
        setPricing(null);
      } finally {
        setLoadingPricing(false);
      }
    },
    [canCalculate, restaurantId, isTakeaway, defaultAddress, orderType, appliedCoupon],
  );

  useEffect(() => {
    recalculatePricing();
  }, [cart.length, subtotal, restaurantId, isTakeaway, defaultAddress]);

  useFocusEffect(
    useCallback(() => {
      recalculatePricing();
    }, [recalculatePricing]),
  );

  const availability = restaurant ? getRestaurantAvailabilityStatus(restaurant, new Date()) : null;
  const isRestaurantClosed = availability ? !availability.isOpen : false;

  const deliveryFee = pricing?.deliveryFee ?? 0;
  const platformFee = pricing?.platformFee ?? 0;
  const packagingFee = pricing?.packagingFee ?? 0;
  const gstCharges = pricing?.tax ?? 0;
  const discount = pricing?.discount ?? 0;
  const total = pricing?.total ?? subtotal + (isTakeaway ? 0 : deliveryFee) + platformFee + packagingFee + gstCharges - discount;

  const applyCoupon = async coupon => {
    if (isRestaurantClosed) {
      Toast.show({type: 'error', text1: 'Restaurant is closed. Coupons cannot be applied right now.'});
      return;
    }
    if (subtotal < (Number(coupon.minOrder) || 0)) {
      Toast.show({type: 'error', text1: `Min order ${RUPEE}${Number(coupon.minOrder || 0)}`});
      return;
    }
    if (coupon?.couponType && coupon.couponType !== 'all' && coupon.couponType !== orderType) {
      Toast.show({type: 'error', text1: `This coupon is only valid for ${coupon.couponType} orders`});
      return;
    }
    setAppliedCoupon(coupon);
    setShowCouponModal(false);
    await recalculatePricing(coupon.code);
    Toast.show({type: 'success', text1: 'Coupon applied'});
  };

  const applyManualCode = async () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) {
      Toast.show({type: 'error', text1: 'Enter coupon code'});
      return;
    }
    const matched = availableCoupons.find(c => String(c.code || '').toUpperCase() === code);
    await applyCoupon(matched || {code, discount: 0, minOrder: 0, couponType: 'all'});
  };

  const removeCoupon = async () => {
    setAppliedCoupon(null);
    setManualCode('');
    await recalculatePricing(null);
  };

  const addAddonToCart = async addon => {
    const addonId = String(addon.id || addon._id || '');
    const result = await addToCart({
      id: addonId,
      itemId: addonId,
      name: addon.name,
      price: Number(addon.price) || 0,
      image: addon.image || addon.images?.[0] || '',
      restaurant: restaurantName,
      restaurantId,
      isVeg: addon.foodType === 'Veg' || addon.isVeg === true,
      foodType: addon.foodType,
    });
    if (result?.ok === false) {
      Toast.show({type: 'error', text1: result.error || 'Could not add item'});
    }
  };

  const handleProceed = () => {
    if (!isTakeaway && !hasSavedAddress) {
      navigation.navigate('FoodSelectAddress');
      return;
    }
    navigation.navigate('FoodCheckout', {couponCode: appliedCoupon?.code || null, orderNote: note});
  };

  if (cart.length === 0) {
    return (
      <View className="flex-1 bg-white">
        <View className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Pressable onPress={() => navigation.goBack()} className="w-8 h-8 items-center justify-center">
            <ArrowLeft size={18} color="#374151" />
          </Pressable>
          <Text className="font-semibold text-gray-800">Cart</Text>
        </View>
        <View className="flex-1 items-center justify-center px-4">
          <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-4">
            <Utensils size={36} color="#9ca3af" />
          </View>
          <Text className="text-lg font-semibold text-gray-800 mb-1">Your cart is empty</Text>
          <Text className="text-sm text-gray-500 mb-4 text-center">Add items from a restaurant to start a new order</Text>
          <Pressable onPress={() => navigation.navigate('Delivery')} className="bg-[#0a4d2b] px-5 py-2.5 rounded-xl">
            <Text className="text-white font-semibold">Browse Restaurants</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center gap-2 flex-1 min-w-0">
          <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 rounded-full border border-gray-100 items-center justify-center">
            <ArrowLeft size={18} color="#1f2937" />
          </Pressable>
          <View className="flex-1 min-w-0">
            <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
              {restaurantName || 'Cart'}
            </Text>
            {isRestaurantClosed && <Text className="text-xs font-semibold text-red-600 mt-0.5">Restaurant is closed. Please order when they are online.</Text>}
          </View>
        </View>
        <Pressable onPress={() => Share.share({message: `My order from ${restaurantName}`}).catch(() => {})} className="w-9 h-9 rounded-full border border-gray-100 items-center justify-center">
          <Tag size={16} color="#1f2937" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 200}}>
        <View className="bg-white mx-4 mt-4 rounded-2xl p-4 shadow-sm border border-slate-100">
          {cart.map((item, index) => (
            <View key={item.id}>
              <View className="flex-row items-center gap-3">
                <View className={`w-4 h-4 border-2 rounded-sm items-center justify-center ${item.isVeg === true || item.foodType === 'Veg' ? 'border-green-600' : 'border-red-600'}`}>
                  <View className={`w-2 h-2 rounded-full ${item.isVeg === true || item.foodType === 'Veg' ? 'bg-green-600' : 'bg-red-600'}`} />
                </View>
                <Image source={{uri: item.image || FOOD_IMAGE_FALLBACK}} className="w-16 h-16 rounded-2xl" resizeMode="cover" />
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-bold text-gray-900" numberOfLines={2}>
                    {item.name}
                  </Text>
                  {item.variantName ? (
                    <Text className="text-[10px] text-red-600 font-semibold bg-red-50 border border-red-100 self-start px-2 py-0.5 rounded-full mt-1">{item.variantName}</Text>
                  ) : null}
                </View>
                <View className="items-end gap-2">
                  <View className="flex-row items-center border border-[#0a4d2b]/30 rounded-lg">
                    <Pressable onPress={() => (item.quantity - 1 <= 0 ? removeFromCart(item.id) : updateQuantity(item.id, item.quantity - 1))} className="px-2.5 py-1.5">
                      <Minus size={14} color="#0a4d2b" />
                    </Pressable>
                    <Text className="px-2 text-sm font-black text-[#0a4d2b]">{item.quantity}</Text>
                    <Pressable onPress={() => updateQuantity(item.id, item.quantity + 1)} className="px-2.5 py-1.5">
                      <Plus size={14} color="#0a4d2b" />
                    </Pressable>
                  </View>
                  <Text className="text-sm font-black text-gray-900">{RUPEE}{((item.price || 0) * (item.quantity || 1)).toFixed(0)}</Text>
                </View>
              </View>
              {index < cart.length - 1 && <View className="mt-4 mb-4 border-b border-dashed border-gray-100" />}
            </View>
          ))}

          <Pressable onPress={() => navigation.goBack()} className="flex-row items-center gap-2 mt-4">
            <Plus size={16} color="#0a4d2b" />
            <Text className="text-sm font-medium text-[#0a4d2b]">Add more items</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => setShowNoteInput(v => !v)} className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm border border-slate-100 flex-row items-center gap-2">
          <Utensils size={16} color="#6b7280" />
          <Text className="text-sm text-gray-600 flex-1" numberOfLines={1}>
            {note || 'Add note for restaurant'}
          </Text>
        </Pressable>
        {showNoteInput && (
          <View className="bg-white mx-4 mt-2 rounded-2xl p-4 border border-slate-100">
            <TextInput value={note} onChangeText={t => setNote(t.slice(0, 240))} placeholder="Eg. Don't add onions, make it extra spicy, etc." placeholderTextColor="#9ca3af" multiline className="text-sm text-gray-900 h-20" />
            <Text className="text-[11px] text-gray-400 text-right mt-1">{note.length}/240</Text>
          </View>
        )}

        {addons.length > 0 && (
          <View className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm border border-slate-100">
            <View className="flex-row items-center gap-2 mb-3">
              <Sparkles size={16} color="#0a4d2b" />
              <Text className="text-sm font-semibold text-gray-800">Complete your meal with</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 12}}>
              {addons.map(addon => (
                <View key={addon.id || addon._id} className="w-28">
                  <Image source={{uri: addon.image || addon.images?.[0] || FOOD_IMAGE_FALLBACK}} className="w-28 h-28 rounded-xl" resizeMode="cover" />
                  <Text className="text-xs font-semibold text-gray-800 mt-1.5" numberOfLines={1}>
                    {addon.name}
                  </Text>
                  <View className="flex-row items-center justify-between mt-1">
                    <Text className="text-xs font-bold text-gray-900">{RUPEE}{Math.round(addon.price)}</Text>
                    <Pressable onPress={() => addAddonToCart(addon)} className="bg-[#0a4d2b] px-2 py-1 rounded">
                      <Text className="text-[10px] font-bold text-white">ADD</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm border border-slate-100">
          {appliedCoupon ? (
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#0a4d2b]">{appliedCoupon.code} applied</Text>
                <Text className="text-xs text-gray-500 mt-0.5">You saved {RUPEE}{discount.toFixed(0)}</Text>
              </View>
              <Pressable onPress={removeCoupon}>
                <X size={18} color="#6b7280" />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setShowCouponModal(true)} className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Tag size={16} color="#0a4d2b" />
                <Text className="text-sm font-semibold text-gray-800">Apply Coupon</Text>
              </View>
              <ChevronRight size={16} color="#9ca3af" />
            </Pressable>
          )}
        </View>

        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm border border-slate-100">
          <Pressable onPress={() => setShowBillDetails(v => !v)} className="flex-row items-center justify-between">
            <Text className="text-sm font-bold text-gray-800">Bill Details</Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-bold text-gray-900">{loadingPricing ? '...' : `${RUPEE}${total.toFixed(2)}`}</Text>
              <ChevronRight size={16} color="#6b7280" style={{transform: [{rotate: showBillDetails ? '90deg' : '0deg'}]}} />
            </View>
          </Pressable>

          {showBillDetails && (
            <View className="mt-3 pt-3 border-t border-dashed border-gray-200" style={{gap: 8}}>
              <Row label="Item Total" value={`${RUPEE}${subtotal.toFixed(2)}`} />
              {!isTakeaway && <Row label="Delivery Fee" value={deliveryFee === 0 ? 'FREE' : `${RUPEE}${deliveryFee.toFixed(2)}`} valueClassName={deliveryFee === 0 ? 'text-[#0a4d2b]' : undefined} />}
              {platformFee > 0 && <Row label="Platform Fee" value={`${RUPEE}${platformFee.toFixed(2)}`} />}
              {packagingFee + gstCharges > 0 && <Row label="GST and Restaurant Charges" value={`${RUPEE}${(packagingFee + gstCharges).toFixed(2)}`} />}
              {discount > 0 && <Row label="Coupon Discount" value={`-${RUPEE}${discount.toFixed(2)}`} labelClassName="text-[#0a4d2b]" valueClassName="text-[#0a4d2b]" />}
            </View>
          )}
        </View>

        {!isTakeaway && (
          <View className="mx-4 mt-3">
            {hasSavedAddress ? (
              <Pressable onPress={() => navigation.navigate('FoodSelectAddress')} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex-row items-center justify-between">
                <View className="flex-1 min-w-0">
                  <Text className="text-xs text-gray-500">Delivering to</Text>
                  <Text className="text-sm font-semibold text-gray-900 mt-0.5" numberOfLines={1}>
                    {defaultAddress?.formattedAddress || defaultAddress?.address || 'Selected address'}
                  </Text>
                </View>
                <Text className="text-xs font-bold text-[#0a4d2b]">CHANGE</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => navigation.navigate('FoodSelectAddress')} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-center gap-2">
                <AlertCircle size={16} color="#b45309" />
                <Text className="text-sm text-amber-800 flex-1">Select a delivery address to see delivery fee and place your order.</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <Pressable onPress={handleProceed} disabled={loadingPricing || isRestaurantClosed} className={`rounded-xl py-3.5 items-center ${isRestaurantClosed ? 'bg-gray-300' : 'bg-[#0a4d2b]'}`}>
          <Text className="text-white font-bold text-base">{loadingPricing ? 'Calculating...' : `Proceed to Pay · ${RUPEE}${total.toFixed(0)}`}</Text>
        </Pressable>
      </View>

      <Modal visible={showCouponModal} transparent animationType="slide" onRequestClose={() => setShowCouponModal(false)}>
        <Pressable className="flex-1 bg-black/60 justify-end" onPress={() => setShowCouponModal(false)}>
          <Pressable onPress={e => e.stopPropagation()} className="bg-white rounded-t-3xl" style={{maxHeight: '75%'}}>
            <View className="px-5 pt-5 pb-3 border-b border-gray-100 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-gray-900">Apply Coupon</Text>
              <Pressable onPress={() => setShowCouponModal(false)}>
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <View className="px-5 py-4">
              <View className="flex-row items-center gap-2 border border-gray-200 rounded-xl px-3 h-11">
                <TextInput value={manualCode} onChangeText={setManualCode} placeholder="Enter coupon code" placeholderTextColor="#9ca3af" autoCapitalize="characters" className="flex-1 text-sm text-gray-900" />
                <Pressable onPress={applyManualCode}>
                  <Text className="text-sm font-bold text-[#0a4d2b]">APPLY</Text>
                </Pressable>
              </View>
            </View>
            <ScrollView className="px-5 pb-6">
              {availableCoupons.map(coupon => (
                <Pressable key={coupon.code} onPress={() => applyCoupon(coupon)} className="border border-gray-100 rounded-2xl p-4 mb-3">
                  <Text className="text-base font-bold text-gray-950">{coupon.discountDisplay}</Text>
                  <Text className="text-xs text-gray-500 mt-1">{coupon.description}</Text>
                  <Text className="text-xs font-semibold text-blue-600 mt-2">Code: {coupon.code}</Text>
                </Pressable>
              ))}
              {availableCoupons.length === 0 && <Text className="text-sm text-gray-500 text-center py-6">No coupons available right now</Text>}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
