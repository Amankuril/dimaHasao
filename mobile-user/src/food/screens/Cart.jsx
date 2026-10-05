import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Modal, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import {
  AlertTriangle, ArrowLeft, Banknote, Check, CheckCircle2, ChevronRight, Copy, CreditCard, FileText, Home, Mail, MapPin, MessageCircle, Minus, Percent,
  Phone, Plus, Send, Share, Share2, ShoppingBag, Sparkles, Tag, Utensils, Wallet, X, Zap,
} from 'lucide-react-native';
import Image from '../../components/Img';
import { BottomSheet, Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import Skeleton from '../../components/Skeleton';
import { NAV_CLEARANCE, isImmersiveRoute } from '../../components/dh/AppBottomNav';
import { useCartPage } from '../hooks/pages/useCartPage';
import { navigateTo } from '../../lib/webRouter';
import { toast } from '../../lib/notify';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { poppins, shadow, tw } from '../../theme';
import { F } from '../components/shell';

const DISH_FALLBACK = require('../../../assets/food/dish_fallback.webp');
const ADDON_FALLBACK = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop';
const SCALLOP =
  'M 86.29 42.78 Q 95.00 50.00 86.29 57.22 Q 91.57 67.22 80.76 70.56 Q 81.82 81.82 70.56 80.76 Q 67.22 91.57 57.22 86.29 Q 50.00 95.00 42.78 86.29 Q 32.78 91.57 29.44 80.76 Q 18.18 81.82 19.24 70.56 Q 8.43 67.22 13.71 57.22 Q 5.00 50.00 13.71 42.78 Q 8.43 32.78 19.24 29.44 Q 18.18 18.18 29.44 19.24 Q 32.78 8.43 42.78 13.71 Q 50.00 5.00 57.22 13.71 Q 67.22 8.43 70.56 19.24 Q 81.82 18.18 80.76 29.44 Q 91.57 32.78 86.29 42.78 Z';
const CONFETTI = ['#0a4d2b', '#3b82f6', '#f59e0b', '#0f6b3f', '#06381e', '#ec4899'];
const AMBER = { 50: '#FFFBEB', 100: '#FEF3C6', 200: '#FEE685', 600: '#E17100', 800: '#973C00', 950: '#461901' };
const EMERALD = { 50: '#ECFDF5', 100: '#D0FAE5', 500: '#00BC7D', 600: '#009966', 700: '#007A55' };

function Thumb({ uri, fallback, style }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const fb = typeof fallback === 'string' ? { uri: fallback } : fallback;
  return <Image source={uri && !failed ? { uri } : fb} onError={() => setFailed(true)} style={style} resizeMode="cover" />;
}

function Line({ label, value, loading, bold, color }) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, bold ? poppins(500) : null, color ? { color } : null]}>{label}</Text>
      {loading ? <Skeleton style={{ width: 48, height: 16, borderRadius: 4 }} /> : <Text style={[styles.billValue, bold ? poppins(700) : null, color ? { color } : null]}>{value}</Text>}
    </View>
  );
}

function ConfettiPiece({ index, width, height }) {
  const v = useAnimatedValue(0);
  // Rolled once per piece, when it mounts.
  const [cfg] = useState(() => ({ left: Math.random() * width, color: CONFETTI[index % CONFETTI.length], duration: 2000 + Math.random() * 2000, delay: Math.random() * 2000, spin: Math.random() * 360 }));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: cfg.duration, delay: cfg.delay, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v, cfg]);
  return (
    <Animated.View
      style={{
        position: 'absolute', left: cfg.left, top: 0, width: 12, height: 12, borderRadius: 2, backgroundColor: cfg.color,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-height * 0.1, height * 1.1] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: [`${cfg.spin}deg`, `${cfg.spin + 720}deg`] }) }],
      }}
    />
  );
}

function Spinner({ size = 64 }) {
  const v = useAnimatedValue(0);
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ ...StyleSheet.absoluteFillObject, borderRadius: size / 2, borderWidth: 4, borderColor: tw.gray200 }} />
      <Animated.View style={{ ...StyleSheet.absoluteFillObject, borderRadius: size / 2, borderWidth: 4, borderColor: 'transparent', borderTopColor: F.green, transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }} />
    </View>
  );
}

/** Port of pages/user/cart/Cart.jsx (logic: useCartPage). */
export default function Cart() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const c = useCartPage();
  const {
    RUPEE_SYMBOL, formatFullAddress, handleBack, handleShare, restaurantName, isRestaurantClosed, isCartZoneMismatch, isCartUnavailable, savings, appliedCoupon,
    couponCode, cart, updateQuantity, restaurantNote, setRestaurantNote, showRestaurantNoteInput, setShowRestaurantNoteInput, addons, loadingAddons, restaurantId,
    addToCart, clearCart, filteredCoupons, handleApplyCoupon, handleRemoveCoupon, discount, orderType, restaurantData, deliveryAddressMode,
    currentLocationLoading, currentLocationAddress, defaultAddress, hasSavedAddress, normalizeAddressLabel, addresses, handleSelectAddressByLabel, getAddressId,
    selectedAddressId, handleSelectSavedAddress, getDisplayAddressLabel, openLocationSelector, recipientName, recipientPhone, isEditingRecipient,
    setIsEditingRecipient, recipientDetails, setRecipientDetails, sanitizeRecipientPhone, showBillDetails, setShowBillDetails, loadingPricing, total, subtotal,
    deliveryFee, deliveryFeeBreakdownText, pricing, feeSettings, platformFee, packagingFee, gstCharges, showPaymentSheet, setShowPaymentSheet,
    selectedPaymentMethod, setSelectedPaymentMethod, selectedPaymentLabel, walletBalance, handlePlaceOrder, isPlacingOrder, setIsPlacingOrder, showPlacingOrder,
    setShowPlacingOrder, orderProgress, showOrderSuccess, handleGoToOrders, isPaymentMethodEnabled, showCouponSheet, setShowCouponSheet, manualCouponCode,
    setManualCouponCode, handleApplyCouponCode, loadingCoupons, showShareModal, setShowShareModal, sharePayload, handleSystemShareFromModal, openShareTarget,
    copyShareLink, showAutoCouponPopup, setShowAutoCouponPopup, bestCoupon, bestCouponDiscount, handleApplyAutoCoupon, showSavingsCongrats,
  } = c;

  const navClearance = isImmersiveRoute(pathname) ? insets.bottom : NAV_CLEARANCE + insets.bottom;
  const isTakeaway = orderType === 'takeaway';
  const freeDeliveryUpTo = Number((pricing?.freeDeliveryUpTo ?? feeSettings.freeDeliveryUpTo) || 0);
  const couponBlockedMessage = isCartZoneMismatch ? 'This restaurant does not deliver to your selected location' : 'Restaurant is closed. Coupons cannot be applied right now.';
  const openCoupons = () => {
    if (isCartUnavailable) {
      toast.error(couponBlockedMessage);
      return;
    }
    setShowCouponSheet(true);
  };

  const renderCartCouponCard = (coupon, { compact = false, blocked = false } = {}) => {
    const meetsMinOrder = subtotal >= (Number(coupon.minOrder) || 0);
    const isApplicable = !blocked && meetsMinOrder;
    return (
      <View key={coupon.code} style={[styles.couponCard, compact ? { padding: 12 } : null, blocked ? { opacity: 0.6 } : null]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <View style={styles.couponIcon}>
            <Percent size={16} color={F.green} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={styles.couponCode}>{String(coupon.code).toUpperCase()}</Text>
              <Text style={styles.couponSave}>{coupon.discountDisplay || `Save ${RUPEE_SYMBOL}${coupon.discount}`}</Text>
            </View>
            <Text style={styles.couponDesc} numberOfLines={compact ? 1 : 2}>{coupon.description || 'Save flat amount on your order'}</Text>
            {blocked ? (
              <Text style={styles.couponHint}>Not available for this delivery location</Text>
            ) : !meetsMinOrder ? (
              <Text style={styles.couponHint}>
                Add items worth {RUPEE_SYMBOL}
                {Math.max(0, (Number(coupon.minOrder) || 0) - subtotal).toFixed(0)} more to apply
              </Text>
            ) : null}
          </View>
        </View>
        <Press scale={0.95} disabled={!isApplicable} onPress={() => handleApplyCoupon(coupon)} accessibilityLabel={`Apply coupon ${coupon.code}`} style={[styles.couponApply, isApplicable ? null : { backgroundColor: tw.gray50, borderColor: tw.gray200 }]}>
          <Text style={[styles.couponApplyText, isApplicable ? null : { color: tw.gray400 }]}>APPLY</Text>
        </Press>
      </View>
    );
  };

  if (cart.length === 0 && !showOrderSuccess && !showPlacingOrder && !showSavingsCongrats) {
    return (
      <View style={{ flex: 1, backgroundColor: tw.gray50 }}>
        <View style={styles.emptyHead}>
          <Press scale={0.9} onPress={handleBack} accessibilityLabel="Go back" style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }} hitSlop={8}>
            <ArrowLeft size={16} color={tw.gray700} />
          </Press>
          <Text style={styles.emptyHeadText}>Cart</Text>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: 80, paddingHorizontal: 16 }}>
          <View style={styles.emptyIcon}>
            <Utensils size={40} color={tw.gray400} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyBody}>Add items from a restaurant to start a new order</Text>
          <Press scale={0.97} onPress={() => navigateTo('/food/user')} accessibilityLabel="Browse Restaurants" style={styles.browse}>
            <Text style={styles.browseText}>Browse Restaurants</Text>
          </Press>
        </View>
      </View>
    );
  }

  const placeDisabled = isPlacingOrder || loadingPricing || isCartZoneMismatch || (selectedPaymentMethod === 'wallet' && walletBalance < total) || isRestaurantClosed;
  const placeLabel = isRestaurantClosed
    ? 'Restaurant Closed'
    : isCartZoneMismatch
      ? 'Not Deliverable Here'
      : isPlacingOrder
        ? 'Processing...'
        : loadingPricing
          ? 'Calculating...'
          : !isTakeaway && !hasSavedAddress
            ? 'Select Address'
            : 'Place Order';

  const paymentOptions = [
    { id: 'razorpay', name: 'Online Payment', description: 'UPI, Cards, Netbanking', Icon: Zap, bg: EMERALD[50], fg: EMERALD[600], badge: 'SECURE', disabled: !isPaymentMethodEnabled('razorpay'), disabledText: 'Online Pay Disabled' },
    {
      id: 'wallet', name: 'Quick Wallet', description: 'Pay from your wallet', Icon: Wallet, bg: '#EFF6FF', fg: '#155DFC', subInfo: `Bal: ${RUPEE_SYMBOL}${walletBalance.toFixed(0)}`,
      disabled: walletBalance < total || !isPaymentMethodEnabled('wallet'), disabledText: !isPaymentMethodEnabled('wallet') ? 'Wallet Disabled' : 'Low Balance',
    },
    { id: 'cash', name: 'Cash on Delivery', description: 'Pay when order arrives', Icon: Banknote, bg: tw.orange50, fg: '#06381e', disabled: !isPaymentMethodEnabled('cash'), disabledText: 'COD Disabled', hideWhenDisabled: true },
  ].filter((option) => !option.hideWhenDisabled || !option.disabled);

  const deliveryAddressText = defaultAddress ? formatFullAddress(defaultAddress) || defaultAddress?.formattedAddress || defaultAddress?.address || 'Add delivery address' : 'Add delivery address';
  const busy = showOrderSuccess || isPlacingOrder || showPlacingOrder;

  return (
    <View style={{ flex: 1, backgroundColor: tw.slate50 }}>
      <View style={styles.header}>
        <Press scale={0.95} onPress={handleBack} accessibilityLabel="Go back" style={styles.headBtn} hitSlop={6}>
          <ArrowLeft size={18} color={tw.gray800} strokeWidth={2.5} />
        </Press>
        <View style={{ flex: 1, minWidth: 0, marginLeft: 8 }}>
          <Text style={styles.headTitle} numberOfLines={1} accessibilityRole="header">{restaurantName}</Text>
          {isRestaurantClosed ? <Text style={styles.headClosed}>Restaurant is closed. Please order when they are online.</Text> : null}
        </View>
        <Press scale={0.95} onPress={handleShare} accessibilityLabel="Share" style={styles.headBtn} hitSlop={6}>
          <Share size={18} color={tw.gray800} strokeWidth={2.5} />
        </Press>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 190 + navClearance }}>
        {isCartZoneMismatch ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
            <LinearGradient colors={[AMBER[50], '#FFF7ED', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mismatch}>
              <LinearGradient colors={['#FFB900', tw.orange500]} style={styles.mismatchBar} />
              <View style={styles.mismatchIcon}>
                <AlertTriangle size={20} color={AMBER[600]} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.mismatchTitle}>Delivery not available here</Text>
                <Text style={styles.mismatchBody}>{restaurantName} doesn’t deliver to your selected location. Switch address to continue, or clear this cart.</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  <Press scale={0.98} onPress={openLocationSelector} accessibilityLabel="Change location" style={[styles.mismatchBtn, { backgroundColor: AMBER[600] }]}>
                    <MapPin size={14} color="#fff" />
                    <Text style={[styles.mismatchBtnText, { color: '#fff' }]}>Change location</Text>
                  </Press>
                  <Press
                    scale={0.98}
                    onPress={() => {
                      clearCart();
                      toast.success('Cart cleared');
                    }}
                    accessibilityLabel="Clear cart"
                    style={[styles.mismatchBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: AMBER[200] }]}
                  >
                    <Text style={[styles.mismatchBtnText, { color: AMBER[800] }]}>Clear cart</Text>
                  </Press>
                </View>
              </View>
            </LinearGradient>
          </View>
        ) : null}

        {savings > 0 ? (
          <View style={styles.savings}>
            <Text style={{ fontSize: 14 }}>🎉</Text>
            <Text style={styles.savingsText}>
              {appliedCoupon?.code ? `You saved ${RUPEE_SYMBOL}${savings} with '${appliedCoupon.code}' on this order!` : `You saved ${RUPEE_SYMBOL}${savings} on this order!`}
            </Text>
          </View>
        ) : null}

        <View style={{ padding: 16, gap: 8 }}>
          {/* Items */}
          <View style={styles.card}>
            <View style={{ gap: 24 }}>
              {cart.map((item, index) => {
                const veg = item.isVeg === true || item.foodType === 'Veg';
                return (
                  <View key={item.id} style={isCartUnavailable ? { opacity: 0.6 } : null}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <View style={[styles.vegBox, { borderColor: veg ? tw.green600 : tw.red600 }]}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: veg ? tw.green600 : tw.red600 }} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <View style={styles.itemImg}>
                          <Thumb uri={item.image} fallback={DISH_FALLBACK} style={{ width: '100%', height: '100%' }} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          {item.variantName ? (
                            <View style={{ flexDirection: 'row' }}>
                              <Text style={styles.variant} numberOfLines={1}>{item.variantName}</Text>
                            </View>
                          ) : null}
                          {isRestaurantClosed ? <Text style={[styles.itemNote, { color: tw.red500 }]}>Remove this dish to order available dishes</Text> : null}
                          {isCartZoneMismatch && !isRestaurantClosed ? <Text style={[styles.itemNote, { color: AMBER[600] }]}>Not deliverable to your selected location</Text> : null}
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 10 }}>
                        <View style={styles.qty}>
                          <Press scale={0.9} onPress={() => updateQuantity(item.id, item.quantity - 1)} accessibilityLabel={`Remove one ${item.name}`} style={styles.qtyBtn} hitSlop={6}>
                            <Minus size={14} color={F.green} />
                          </Press>
                          <Text style={styles.qtyText}>{item.quantity}</Text>
                          <Press scale={0.9} onPress={() => updateQuantity(item.id, item.quantity + 1)} accessibilityLabel={`Add one more ${item.name}`} style={styles.qtyBtn} hitSlop={6}>
                            <Plus size={14} color={F.green} />
                          </Press>
                        </View>
                        <Text style={styles.itemPrice}>
                          {RUPEE_SYMBOL}
                          {((item.price || 0) * (item.quantity || 1)).toFixed(0)}
                        </Text>
                      </View>
                    </View>
                    {index < cart.length - 1 ? <View style={styles.dashed} /> : null}
                  </View>
                );
              })}
            </View>
            <Press scale={0.98} onPress={handleBack} accessibilityLabel="Add more items" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, alignSelf: 'flex-start' }}>
              <Plus size={16} color={F.green} />
              <Text style={styles.addMore}>Add more items</Text>
            </Press>
          </View>

          {/* Note */}
          <View style={styles.card}>
            <Press scale={0.99} onPress={() => setShowRestaurantNoteInput(!showRestaurantNoteInput)} accessibilityLabel="Add note for restaurant" style={styles.noteBtn}>
              <Utensils size={16} color={tw.gray600} />
              <Text style={styles.noteBtnText} numberOfLines={1}>{restaurantNote || 'Add note for restaurant'}</Text>
            </Press>
          </View>
          {showRestaurantNoteInput ? (
            <View style={[styles.card, { borderRadius: 8, paddingVertical: 12, shadowOpacity: 0, elevation: 0 }]}>
              <Text style={styles.noteLabel}>Restaurant instructions</Text>
              <TextInput
                value={restaurantNote}
                onChangeText={setRestaurantNote}
                placeholder="Eg. Don't add onions, make it extra spicy, etc."
                placeholderTextColor={tw.gray400}
                multiline
                maxLength={240}
                textAlignVertical="top"
                accessibilityLabel="Note for restaurant"
                style={styles.noteInput}
              />
              <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <Text style={styles.noteHint}>Note for restaurant.</Text>
                <Text style={[styles.noteHint, { color: tw.gray400 }]}>{restaurantNote.length}/240</Text>
              </View>
            </View>
          ) : null}

          {/* Add-ons */}
          {addons.length > 0 ? (
            <View style={[styles.card, { paddingVertical: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={16} color={F.green} />
                </View>
                <Text style={styles.addonsTitle}>Complete your meal with</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }}>
                {loadingAddons
                  ? [1, 2, 3].map((i) => (
                      <View key={i} style={{ width: 112 }}>
                        <Skeleton style={{ height: 112, borderRadius: 8 }} />
                        <Skeleton style={{ height: 16, borderRadius: 4, marginTop: 8 }} />
                        <Skeleton style={{ height: 12, borderRadius: 4, marginTop: 4, width: '66%' }} />
                      </View>
                    ))
                  : addons.map((addon) => (
                      <View key={addon.id} style={{ width: 112 }}>
                        <View style={{ borderRadius: 8, overflow: 'hidden', backgroundColor: tw.gray100 }}>
                          <Thumb uri={addon.image || (addon.images && addon.images[0])} fallback={ADDON_FALLBACK} style={{ width: 112, height: 112 }} />
                          <View style={styles.addonVeg}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tw.green600 }} />
                          </View>
                          <Press
                            scale={0.9}
                            hitSlop={8}
                            accessibilityLabel={`Add ${addon.name}`}
                            onPress={() => {
                              const cartRestaurantId = cart[0]?.restaurantId || restaurantId;
                              const cartRestaurantName = cart[0]?.restaurant || restaurantName;
                              if (!cartRestaurantId || !cartRestaurantName) {
                                toast.error('Restaurant information is missing. Please refresh the page.');
                                return;
                              }
                              addToCart({
                                id: addon.id,
                                name: addon.name,
                                price: addon.price,
                                image: addon.image || (addon.images && addon.images[0]) || '',
                                description: addon.description || '',
                                isVeg: true,
                                restaurant: cartRestaurantName,
                                restaurantId: cartRestaurantId,
                              });
                            }}
                            style={styles.addonAdd}
                          >
                            <Plus size={14} color={F.green} />
                          </Press>
                        </View>
                        <Text style={styles.addonName} numberOfLines={2}>{addon.name}</Text>
                        {addon.description ? <Text style={styles.addonDesc} numberOfLines={1}>{addon.description}</Text> : null}
                        <Text style={styles.addonPrice}>
                          {RUPEE_SYMBOL}
                          {addon.price}
                        </Text>
                      </View>
                    ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Coupons */}
          <View style={[styles.card, { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
              <Tag size={20} color={tw.gray400} />
              <Text style={styles.couponsTitle}>Offers & Coupons</Text>
            </View>

            {!appliedCoupon && !couponCode ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 }}>
                {filteredCoupons.length > 0 ? (
                  <View style={{ gap: 10 }}>
                    {filteredCoupons.slice(0, 2).map((coupon) => renderCartCouponCard(coupon, { compact: true, blocked: isCartUnavailable }))}
                    <Press scale={0.98} onPress={openCoupons} accessibilityLabel="View all offers" style={[styles.moreOffers, isCartUnavailable ? { opacity: 0.6 } : null]}>
                      <Text style={styles.moreOffersText}>
                        {filteredCoupons.length > 2 ? `+ ${filteredCoupons.length - 2} more offer${filteredCoupons.length - 2 > 1 ? 's' : ''}` : 'More offers available'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.moreOffersCta}>VIEW ALL</Text>
                        <ChevronRight size={14} color={F.green} />
                      </View>
                    </Press>
                  </View>
                ) : (
                  <Press scale={0.98} onPress={openCoupons} accessibilityLabel="Apply a coupon code" style={[styles.moreOffers, isCartUnavailable ? { opacity: 0.6 } : null]}>
                    <Text style={styles.moreOffersText}>Have a coupon code?</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={styles.moreOffersCta}>APPLY</Text>
                      <ChevronRight size={14} color={F.green} />
                    </View>
                  </Press>
                )}
              </View>
            ) : null}

            {couponCode && !appliedCoupon ? (
              <View style={styles.couponPending}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Skeleton style={{ width: 32, height: 32, borderRadius: 16 }} />
                  <View>
                    <Skeleton style={{ width: 64, height: 12, borderRadius: 4 }} />
                    <Skeleton style={{ width: 112, height: 16, borderRadius: 4, marginTop: 6 }} />
                  </View>
                </View>
                <Skeleton style={{ width: 64, height: 32, borderRadius: 8 }} />
              </View>
            ) : null}

            {appliedCoupon ? (
              <View style={styles.applied}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <View style={styles.appliedIcon}>
                    <Check size={16} color="#fff" strokeWidth={3} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.appliedLabel}>APPLIED:</Text>
                      <Text style={styles.appliedCode}>{String(appliedCoupon.code).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.appliedSaved}>
                      You saved {RUPEE_SYMBOL}
                      {Math.round(discount)}
                    </Text>
                  </View>
                </View>
                <Press scale={0.95} onPress={handleRemoveCoupon} accessibilityLabel="Remove coupon" style={styles.remove}>
                  <Text style={styles.removeText}>REMOVE</Text>
                </Press>
              </View>
            ) : null}
          </View>

          {/* Delivery time */}
          {!isTakeaway ? (
            <View style={[styles.card, { paddingVertical: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }]}>
              <Zap size={20} color={tw.green600} fill="rgba(0,166,62,0.2)" style={{ marginTop: 2 }} />
              <Text style={styles.deliveryIn}>
                Delivery in <Text style={{ color: tw.green600, ...poppins(700) }}>{restaurantData?.estimatedDeliveryTime || '15-20 mins'}</Text>
              </Text>
            </View>
          ) : null}

          {/* Address / pickup */}
          <View style={[styles.card, { paddingVertical: 20 }]}>
            {isTakeaway ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
                <View style={styles.pickupIcon}>
                  <ShoppingBag size={24} color={F.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickupLabel}>PICKUP FROM</Text>
                  <Text style={styles.pickupName}>{restaurantData?.name || cart[0]?.restaurant || 'Restaurant'}</Text>
                  <Text style={styles.pickupAddr} numberOfLines={2}>{restaurantData?.address || restaurantData?.location?.address || 'Restaurant Address'}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 16 }}>
                    <View style={styles.pickupReady}>
                      <CheckCircle2 size={16} color={tw.green600} />
                      <Text style={styles.pickupReadyText}>READY FOR PICKUP IN {restaurantData?.preparationTime || '25-30'} MINS</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16, flex: 1 }}>
                  <View style={styles.addrIcon}>
                    <MapPin size={20} color={F.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addrHead}>
                      Delivery at <Text style={poppins(600)}>{deliveryAddressMode === 'current' ? 'Current location' : 'Location'}</Text>
                    </Text>
                    {deliveryAddressMode === 'current' ? (
                      <View style={{ marginTop: 4 }}>
                        <Text style={styles.addrSmall} numberOfLines={2}>
                          {currentLocationLoading || !currentLocationAddress
                            ? 'Finding your current address...'
                            : formatFullAddress(currentLocationAddress) || currentLocationAddress?.formattedAddress || currentLocationAddress?.address || 'Add delivery address'}
                        </Text>
                        <View style={{ flexDirection: 'row', marginTop: 4 }}>
                          <Text style={styles.gps}>GPS enabled</Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.addrText} numberOfLines={2}>{deliveryAddressText}</Text>
                    )}
                    {!hasSavedAddress ? <Text style={styles.addrWarn}>Select a delivery location to continue</Text> : null}

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                      {['Home', 'Work', 'Other'].map((label) => {
                        const normalizedLabel = normalizeAddressLabel(label);
                        const addressExists = addresses.some((addr) => normalizeAddressLabel(addr.label) === normalizedLabel);
                        return (
                          <Press key={label} scale={0.96} disabled={!addressExists} onPress={() => handleSelectAddressByLabel(label)} accessibilityLabel={`Deliver to ${label}`} style={[styles.labelChip, addressExists ? null : styles.labelChipOff]}>
                            <Text style={[styles.labelChipText, addressExists ? null : { color: tw.gray400 }]}>{label}</Text>
                          </Press>
                        );
                      })}
                    </View>

                    {addresses.length > 0 ? (
                      <View style={{ marginTop: 16, gap: 12 }}>
                        {addresses.map((address) => {
                          const addressId = getAddressId(address);
                          const isSelected = !!addressId && addressId === selectedAddressId;
                          return (
                            <Press
                              key={addressId || `${address.label}-${address.street}-${address.city}`}
                              scale={0.99}
                              onPress={() => handleSelectSavedAddress(address)}
                              accessibilityRole="radio"
                              accessibilityState={{ checked: isSelected }}
                              style={[styles.savedAddr, isSelected ? { borderColor: F.green, backgroundColor: 'rgba(10,77,43,0.02)' } : null]}
                            >
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={styles.savedAddrLabel}>{getDisplayAddressLabel(address.label)}</Text>
                                <Text style={styles.savedAddrText} numberOfLines={2}>{formatFullAddress(address) || address.address || 'Address details'}</Text>
                              </View>
                              {isSelected ? <Text style={styles.selectedTag}>SELECTED</Text> : null}
                            </Press>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                </View>
                <Press scale={0.92} onPress={openLocationSelector} accessibilityLabel="Open location selector" style={styles.addrChevron} hitSlop={6}>
                  <ChevronRight size={20} color={F.green} />
                </Press>
              </View>
            )}
          </View>

          {/* Recipient */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <Phone size={16} color={tw.gray500} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.recipient}>
                  {recipientName}, <Text style={poppins(600)}>{recipientPhone || '+91-XXXXXXXXXX'}</Text>
                </Text>
                <Text style={styles.recipientSub}>Order recipient details</Text>
              </View>
              <Press scale={0.96} onPress={() => setIsEditingRecipient((prev) => !prev)} accessibilityLabel={isEditingRecipient ? 'Done editing recipient' : 'Change recipient'} hitSlop={10}>
                <Text style={styles.change}>{isEditingRecipient ? 'Done' : 'Change'}</Text>
              </Press>
            </View>
            {isEditingRecipient ? (
              <View style={styles.recipientForm}>
                <View>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    value={recipientDetails.name}
                    onChangeText={(text) => setRecipientDetails((prev) => ({ ...prev, name: text }))}
                    placeholder="Enter recipient name"
                    placeholderTextColor={tw.gray400}
                    autoCapitalize="words"
                    returnKeyType="next"
                    accessibilityLabel="Recipient name"
                    style={styles.field}
                  />
                </View>
                <View>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <TextInput
                    value={recipientDetails.phone}
                    onChangeText={(text) => setRecipientDetails((prev) => ({ ...prev, phone: sanitizeRecipientPhone(text) }))}
                    placeholder="Enter recipient phone"
                    placeholderTextColor={tw.gray400}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    accessibilityLabel="Recipient phone number"
                    style={styles.field}
                  />
                </View>
                <Text style={styles.noteHint}>Agar aap kisi aur ke liye order kar rahe ho, to yahan uska naam aur phone save kar do.</Text>
              </View>
            ) : null}
          </View>

          {/* Bill */}
          <View style={[styles.card, { paddingVertical: 20 }]}>
            <Press scale={0.99} onPress={() => setShowBillDetails(!showBillDetails)} accessibilityRole="button" accessibilityState={{ expanded: showBillDetails }} accessibilityLabel="Bill details" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <FileText size={20} color={tw.gray700} />
                <Text style={styles.billTitle}>Bill Details</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {loadingPricing ? <Skeleton style={{ width: 64, height: 20, borderRadius: 4 }} /> : <Text style={styles.billTotal}>{`${RUPEE_SYMBOL}${total.toFixed(2)}`}</Text>}
                <View style={[styles.billChevron, { transform: [{ rotate: showBillDetails ? '90deg' : '0deg' }] }]}>
                  <ChevronRight size={16} color={tw.gray500} />
                </View>
              </View>
            </Press>
            {showBillDetails ? (
              <View style={styles.billBody}>
                <Line label="Item Total" value={`${RUPEE_SYMBOL}${subtotal.toFixed(2)}`} loading={loadingPricing} />
                {!isTakeaway ? (
                  <>
                    <Line label="Delivery Fee" value={deliveryFee === 0 ? 'FREE' : `${RUPEE_SYMBOL}${deliveryFee.toFixed(2)}`} loading={loadingPricing} />
                    {deliveryFeeBreakdownText ? <Text style={styles.feeBreakdown}>{deliveryFeeBreakdownText}</Text> : null}
                    {freeDeliveryUpTo > 0 ? (
                      <View style={{ flexDirection: 'row', marginTop: -6 }}>
                        <View style={styles.freeAt}>
                          <Sparkles size={12} color={F.green} />
                          <Text style={styles.freeAtText}>
                            Free delivery at{' '}
                            <Text style={{ color: F.greenDark }}>
                              {RUPEE_SYMBOL}
                              {freeDeliveryUpTo.toFixed(0)}+
                            </Text>
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </>
                ) : null}
                {platformFee > 0 ? <Line bold label="Platform Fee" value={`${RUPEE_SYMBOL}${platformFee.toFixed(2)}`} loading={loadingPricing} /> : null}
                {packagingFee > 0 || gstCharges > 0 ? <Line bold label="GST and Restaurant Charges" value={`${RUPEE_SYMBOL}${(packagingFee + gstCharges).toFixed(2)}`} loading={loadingPricing} /> : null}
                {discount > 0 ? <Line label="Coupon Discount" color={F.green} value={`-${RUPEE_SYMBOL}${discount.toFixed(2)}`} loading={loadingPricing} /> : null}
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Pay + place order */}
      <View style={[styles.bottom, { paddingBottom: navClearance }]}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
          <Press scale={0.98} onPress={() => setShowPaymentSheet(true)} accessibilityLabel={`Paying with ${selectedPaymentLabel}. Change`} style={styles.payRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.payIcon}>
                {selectedPaymentMethod === 'wallet' ? <Wallet size={20} color={F.green} /> : selectedPaymentMethod === 'razorpay' ? <Zap size={20} color={F.green} /> : <Banknote size={20} color={F.green} />}
              </View>
              <View>
                <Text style={styles.payWith}>PAYING WITH</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.payLabel}>{selectedPaymentLabel}</Text>
                  {selectedPaymentMethod === 'wallet' ? (
                    <Text style={styles.payBal}>
                      {RUPEE_SYMBOL}
                      {walletBalance.toFixed(0)}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
            <View style={styles.payChange}>
              <Text style={styles.payChangeText}>CHANGE</Text>
              <ChevronRight size={14} color={F.green} />
            </View>
          </Press>

          <Press scale={0.98} disabled={placeDisabled} onPress={handlePlaceOrder} accessibilityLabel={`${placeLabel}. Total ${RUPEE_SYMBOL}${total.toFixed(2)}`} accessibilityState={{ disabled: placeDisabled, busy: isPlacingOrder }} style={[styles.placeShadow, placeDisabled ? { opacity: 0.5 } : null]}>
            <LinearGradient colors={['#0a4d2b', '#06381e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.place}>
              <View style={styles.placeTotal}>
                <Text style={styles.placeTotalValue}>
                  {RUPEE_SYMBOL}
                  {total.toFixed(2)}
                </Text>
                <Text style={styles.placeTotalLabel}>TOTAL</Text>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Text style={styles.placeText}>{placeLabel}</Text>
                <ChevronRight size={16} color="#fff" />
              </View>
            </LinearGradient>
          </Press>
        </View>
      </View>

      {/* Placing order / success: cover the whole screen, as the web's fixed layers do */}
      <Modal visible={busy} transparent={!showOrderSuccess} statusBarTranslucent animationType="fade" onRequestClose={() => {}}>
        {showOrderSuccess ? (
          <View style={styles.success}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {Array.from({ length: 28 }, (_, i) => (
                <ConfettiPiece key={i} index={i} width={width} height={height} />
              ))}
            </View>
            <LinearGradient colors={[tw.green500, tw.green600]} style={styles.successCircle}>
              <Check size={64} color="#fff" strokeWidth={3} />
            </LinearGradient>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32, marginBottom: 8 }}>
              {isTakeaway ? <Home size={20} color={tw.red500} /> : <MapPin size={20} color={tw.red500} fill={tw.red500} />}
              <Text style={styles.successPlace}>{isTakeaway ? restaurantData?.name || 'Restaurant' : defaultAddress?.city || 'Your Location'}</Text>
            </View>
            <Text style={styles.successAddr}>
              {isTakeaway
                ? restaurantData?.location
                  ? restaurantData.location.addressLine1 || restaurantData.location.formattedAddress || restaurantData.location.address || `${restaurantData.location.city || ''}${restaurantData.location.area ? `, ${restaurantData.location.area}` : ''}`
                  : restaurantData?.address || restaurantData?.formattedAddress || 'Self-Pickup from Restaurant'
                : defaultAddress
                  ? formatFullAddress(defaultAddress) || defaultAddress?.formattedAddress || defaultAddress?.address || 'Delivery Address'
                  : 'Delivery Address'}
            </Text>
            <Text style={styles.successTitle}>Order Placed!</Text>
            <Text style={styles.successBody}>{isTakeaway ? 'Your delicious food is being prepared for pickup' : 'Your delicious food is on its way'}</Text>
            <Press scale={0.97} onPress={handleGoToOrders} accessibilityLabel="Track your order" style={styles.track}>
              <Text style={styles.trackText}>Track Your Order</Text>
            </Press>
          </View>
        ) : isPlacingOrder ? (
          <View style={styles.placingOverlay} accessibilityRole="progressbar" accessibilityLabel="Placing your order">
            <Spinner />
            <Text style={styles.placingTitle}>Placing Your Order...</Text>
            <Text style={styles.placingBody}>
              {selectedPaymentMethod === 'razorpay' ? 'Please wait while we verify your payment. Do not close the app.' : 'We are creating your order. Please wait.'}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={[styles.placingSheet, { paddingBottom: 32 + insets.bottom }]}>
              <Text style={styles.placingSheetTitle}>{isTakeaway ? 'Placing takeaway order' : 'Placing your order'}</Text>
              <View style={styles.placingRow}>
                <View style={styles.placingIcon}>
                  <CreditCard size={24} color={tw.gray600} />
                </View>
                <Text style={[styles.placingRowTitle, { flex: 1 }]}>
                  {selectedPaymentMethod === 'razorpay' ? `Pay ${RUPEE_SYMBOL}${total.toFixed(2)} online (Razorpay)` : selectedPaymentMethod === 'wallet' ? `Pay ${RUPEE_SYMBOL}${total.toFixed(2)} from Wallet` : 'Pay on delivery (COD)'}
                </Text>
              </View>
              <View style={[styles.placingRow, { marginBottom: 32 }]}>
                <View style={[styles.placingIcon, { backgroundColor: tw.gray50 }]}>
                  <Home size={28} color={tw.gray600} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.placingRowTitle}>{isTakeaway ? 'Picking up from Restaurant' : 'Delivering to Location'}</Text>
                  <Text style={styles.placingRowSub} numberOfLines={2}>
                    {isTakeaway ? restaurantData?.name || cart[0]?.restaurant || 'Restaurant' : defaultAddress ? formatFullAddress(defaultAddress) || defaultAddress?.formattedAddress || defaultAddress?.address || 'Address' : 'Add address'}
                  </Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <LinearGradient colors={['#0a4d2b', '#06381e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${Math.max(0, Math.min(100, orderProgress))}%`, borderRadius: 999 }} />
              </View>
              <Press
                scale={0.97}
                onPress={() => {
                  setShowPlacingOrder(false);
                  setIsPlacingOrder(false);
                }}
                accessibilityLabel="Cancel"
                style={{ alignSelf: 'flex-end', marginTop: 24 }}
                hitSlop={10}
              >
                <Text style={styles.cancel}>CANCEL</Text>
              </Press>
            </View>
          </View>
        )}
      </Modal>

      {/* Payment method */}
      <BottomSheet visible={showPaymentSheet} onClose={() => setShowPaymentSheet(false)} backdrop="rgba(0,0,0,0.6)" spring={{ stiffness: 350, damping: 30 }} panelStyle={[styles.sheet, { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: height * 0.82 }]}>
        <View style={{ padding: 20, paddingBottom: 20 + insets.bottom, flexShrink: 1 }}>
          <View style={styles.handle} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View>
              <Text style={styles.payTitle}>Payment Method</Text>
              <Text style={styles.paySub}>SELECT HOW YOU WANT TO PAY</Text>
            </View>
            <Press scale={0.9} onPress={() => setShowPaymentSheet(false)} accessibilityLabel="Close" style={styles.grayClose}>
              <X size={16} color={tw.gray500} />
            </Press>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
            {paymentOptions.map((option) => {
              const on = selectedPaymentMethod === option.id;
              const Icon = option.Icon;
              return (
                <Press
                  key={option.id}
                  scale={0.98}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on, disabled: option.disabled }}
                  accessibilityLabel={`${option.name}. ${option.disabled ? option.disabledText : option.description}`}
                  onPress={() => {
                    if (option.disabled) return;
                    setSelectedPaymentMethod(option.id);
                    setShowPaymentSheet(false);
                  }}
                  style={[styles.payOpt, on ? styles.payOptOn : null, option.disabled ? { opacity: 0.4 } : null]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
                    <View style={[styles.payOptIcon, { backgroundColor: on ? 'rgba(255,255,255,0.2)' : option.bg }]}>
                      <Icon size={20} color={on ? '#fff' : option.fg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.payOptName, on ? { color: '#fff' } : null]}>{option.name}</Text>
                        {option.badge ? <Text style={[styles.payBadge, on ? { backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' } : null]}>{option.badge}</Text> : null}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Text style={[styles.payOptDesc, on ? { color: 'rgba(255,255,255,0.8)' } : null]}>{option.description}</Text>
                        {option.subInfo && !option.disabled ? (
                          <>
                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: on ? 'rgba(255,255,255,0.4)' : tw.orange300 }} />
                            <Text style={[styles.payOptSub, on ? { color: '#fff' } : null]}>{option.subInfo.toUpperCase()}</Text>
                          </>
                        ) : null}
                      </View>
                      {option.disabled ? <Text style={styles.payOptDisabled}>{option.disabledText.toUpperCase()}</Text> : null}
                    </View>
                  </View>
                  <View style={[styles.radio, on ? { backgroundColor: '#fff', borderColor: '#fff' } : null]}>{on ? <Check size={14} color={F.green} strokeWidth={4} /> : null}</View>
                </Press>
              );
            })}
          </ScrollView>
          <View style={styles.payFoot}>
            <View>
              <Text style={styles.payFootLabel}>TOTAL PAY</Text>
              <Text style={styles.payFootTotal}>
                {RUPEE_SYMBOL}
                {total.toFixed(0)}
              </Text>
            </View>
            <Press scale={0.98} onPress={() => setShowPaymentSheet(false)} accessibilityLabel="Confirm payment method" style={styles.confirm}>
              <Text style={styles.confirmText}>Confirm Order</Text>
            </Press>
          </View>
        </View>
      </BottomSheet>

      {/* All coupons */}
      <BottomSheet visible={showCouponSheet && !appliedCoupon && !isCartUnavailable} onClose={() => setShowCouponSheet(false)} backdrop="rgba(0,0,0,0.6)" panelStyle={[styles.sheet, { maxHeight: height * 0.85 }]}>
        <View style={styles.sheetHead}>
          <View>
            <Text style={styles.sheetTitle}>All Offers & Coupons</Text>
            <Text style={styles.sheetSub}>
              {filteredCoupons.length} offer{filteredCoupons.length === 1 ? '' : 's'} available
            </Text>
          </View>
          <Press scale={0.9} onPress={() => setShowCouponSheet(false)} accessibilityLabel="Close coupons" style={styles.grayClose}>
            <X size={16} color={tw.gray500} />
          </Press>
        </View>
        <View style={styles.codeRow}>
          <TextInput
            value={manualCouponCode}
            onChangeText={(text) => setManualCouponCode(text.toUpperCase())}
            placeholder="Enter coupon code"
            placeholderTextColor={tw.gray400}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleApplyCouponCode}
            accessibilityLabel="Coupon code"
            style={styles.codeInput}
          />
          <Press scale={0.95} disabled={isCartUnavailable} onPress={handleApplyCouponCode} accessibilityLabel="Apply coupon code" style={styles.codeApply}>
            <Text style={styles.codeApplyText}>APPLY</Text>
          </Press>
        </View>
        <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 + insets.bottom, gap: 12 }}>
          {loadingCoupons ? (
            <Text style={styles.sheetEmpty}>Loading offers...</Text>
          ) : filteredCoupons.length > 0 ? (
            filteredCoupons.map((coupon) => renderCartCouponCard(coupon, { blocked: isCartUnavailable }))
          ) : (
            <Text style={styles.sheetEmpty}>No offers available right now. You can still enter a coupon code above.</Text>
          )}
        </ScrollView>
      </BottomSheet>

      {/* Share */}
      <Dialog visible={!!(showShareModal && sharePayload)} onClose={() => setShowShareModal(false)} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.shareDialog}>
        <View style={styles.shareHead}>
          <Text style={[styles.sheetTitle, { flex: 1, ...poppins(600) }]}>Share</Text>
          <Press scale={0.9} onPress={() => setShowShareModal(false)} accessibilityLabel="Close share modal" style={{ padding: 4 }} hitSlop={8}>
            <X size={16} color={tw.gray600} />
          </Press>
        </View>
        <View style={{ paddingHorizontal: 20, paddingVertical: 16, gap: 8 }}>
          {[
            { key: 'system', label: 'Share via system apps', Icon: Share2, onPress: handleSystemShareFromModal },
            { key: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, onPress: () => openShareTarget('whatsapp') },
            { key: 'telegram', label: 'Telegram', Icon: Send, onPress: () => openShareTarget('telegram') },
            { key: 'email', label: 'Email', Icon: Mail, onPress: () => openShareTarget('email') },
            { key: 'copy', label: 'Copy link', Icon: Copy, onPress: copyShareLink },
          ].map(({ key, label, Icon, onPress }) => (
            <Press key={key} scale={0.99} onPress={onPress} accessibilityLabel={label} style={styles.shareRow}>
              <Icon size={20} color={tw.gray700} />
              <Text style={styles.shareRowText}>{label}</Text>
            </Press>
          ))}
        </View>
      </Dialog>

      {/* Best coupon suggestion */}
      <BottomSheet visible={!!(showAutoCouponPopup && bestCoupon && !isCartUnavailable)} onClose={() => setShowAutoCouponPopup(false)} backdrop="rgba(0,0,0,0.6)" spring={{ stiffness: 240, damping: 28 }} panelStyle={[styles.sheet, styles.autoSheet, { paddingBottom: 32 + insets.bottom }]}>
        <Press scale={0.9} onPress={() => setShowAutoCouponPopup(false)} accessibilityLabel="Close" style={[styles.grayClose, { position: 'absolute', top: 16, right: 16 }]}>
          <X size={16} color={tw.gray500} />
        </Press>
        <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginTop: 24 }}>
          <View style={styles.autoGlow} />
          <Svg width={80} height={80} viewBox="0 0 100 100">
            <Path d={SCALLOP} fill="#3B82F6" />
          </Svg>
          <Percent size={36} color="#fff" style={{ position: 'absolute' }} />
        </View>
        <Text style={styles.autoTag}>✦ EXCLUSIVELY FOR YOU ✦</Text>
        <Text style={styles.autoTitle}>
          Save{' '}
          <Text style={{ color: '#3B82F6', ...poppins(800) }}>
            {RUPEE_SYMBOL}
            {bestCouponDiscount}
          </Text>{' '}
          on this order
        </Text>
        <Text style={styles.autoCode}>
          with coupon &apos;<Text style={{ color: tw.gray900, ...poppins(800) }}>{String(bestCoupon?.code || '').toUpperCase()}</Text>&apos;
        </Text>
        <Text style={styles.autoTip}>Tap on &apos;APPLY&apos; to avail this</Text>
        <Press scale={0.97} onPress={handleApplyAutoCoupon} accessibilityLabel="Apply this coupon" style={styles.autoApply}>
          <Text style={styles.autoApplyText}>APPLY</Text>
        </Press>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  emptyHeadText: { fontSize: 16, lineHeight: 24, color: tw.gray800, ...poppins(600) },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, lineHeight: 28, color: tw.gray800, marginBottom: 4, ...poppins(600) },
  emptyBody: { fontSize: 14, lineHeight: 20, color: tw.gray500, marginBottom: 16, textAlign: 'center', ...poppins(400) },
  browse: { backgroundColor: F.green, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  browseText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: 'rgba(243,244,246,0.8)' },
  headBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(243,244,246,0.5)', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  headTitle: { fontSize: 16, lineHeight: 24, letterSpacing: -0.4, color: '#1C2534', ...poppins(700) },
  headClosed: { fontSize: 12, lineHeight: 16, color: tw.red600, marginTop: 2, ...poppins(600) },

  mismatch: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(254,230,133,0.8)', overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, paddingLeft: 20, ...shadow('0 8px 24px rgba(245,158,11,0.08)') },
  mismatchBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  mismatchIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: AMBER[100], borderWidth: 1, borderColor: 'rgba(254,230,133,0.7)', alignItems: 'center', justifyContent: 'center' },
  mismatchTitle: { fontSize: 14, lineHeight: 20, letterSpacing: -0.35, color: AMBER[950], ...poppins(700) },
  mismatchBody: { fontSize: 12, lineHeight: 19.5, color: 'rgba(151,60,0,0.8)', marginTop: 4, ...poppins(400) },
  mismatchBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  mismatchBtnText: { fontSize: 11, lineHeight: 16, letterSpacing: 0.275, ...poppins(700) },
  savings: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: tw.green50, paddingHorizontal: 16, paddingVertical: 10 },
  savingsText: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.green700, ...poppins(600) },

  card: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, ...shadow('sm') },
  vegBox: { width: 16, height: 16, borderWidth: 2, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  itemImg: { width: 64, height: 64, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: tw.gray100, backgroundColor: tw.gray100 },
  itemName: { fontSize: 14, lineHeight: 17.5, color: tw.gray900, ...poppins(700) },
  variant: { fontSize: 10, lineHeight: 15, color: tw.red600, marginTop: 4, backgroundColor: tw.red50, borderWidth: 1, borderColor: 'rgba(255,226,226,0.5)', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', ...poppins(600) },
  itemNote: { fontSize: 11, lineHeight: 16, marginTop: 4, ...poppins(600) },
  qty: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(10,77,43,0.3)', borderRadius: 8, backgroundColor: '#fff', overflow: 'hidden' },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  qtyText: { minWidth: 28, textAlign: 'center', fontSize: 14, lineHeight: 20, color: F.green, ...poppins(900) },
  itemPrice: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(900) },
  dashed: { marginTop: 24, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: tw.gray100 },
  addMore: { fontSize: 14, lineHeight: 20, color: F.green, ...poppins(500) },

  noteBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: tw.gray200, borderRadius: 8 },
  noteBtnText: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  noteLabel: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginBottom: 8, ...poppins(500) },
  noteInput: { height: 80, borderWidth: 1, borderColor: tw.gray200, borderRadius: 8, padding: 12, fontSize: 14, color: tw.gray900, backgroundColor: '#fff', ...poppins(400) },
  noteHint: { fontSize: 11, lineHeight: 16, color: tw.gray500, ...poppins(400) },

  addonsTitle: { fontSize: 14, lineHeight: 20, color: tw.gray800, ...poppins(600) },
  addonVeg: { position: 'absolute', top: 4, left: 4, width: 14, height: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.green600, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  addonAdd: { position: 'absolute', bottom: 4, right: 4, width: 24, height: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: F.green, borderRadius: 4, alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  addonName: { fontSize: 12, lineHeight: 15, color: tw.gray800, marginTop: 6, ...poppins(500) },
  addonDesc: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 2, ...poppins(400) },
  addonPrice: { fontSize: 12, lineHeight: 16, color: tw.gray800, marginTop: 2, ...poppins(600) },

  couponsTitle: { fontSize: 14, lineHeight: 20, color: tw.gray800, ...poppins(700) },
  couponCard: { backgroundColor: 'rgba(10,77,43,0.05)', borderWidth: 1, borderColor: 'rgba(10,77,43,0.1)', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  couponIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.red100, alignItems: 'center', justifyContent: 'center' },
  couponCode: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: F.green, backgroundColor: '#fff', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(10,77,43,0.3)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', ...poppins(700) },
  couponSave: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(900) },
  couponDesc: { fontSize: 11, lineHeight: 16, color: tw.gray500, marginTop: 4, ...poppins(500) },
  couponHint: { fontSize: 9, lineHeight: 13, color: tw.gray400, marginTop: 2, ...poppins(600) },
  couponApply: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(10,77,43,0.2)', ...shadow('sm') },
  couponApplyText: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: F.green, ...poppins(900) },
  moreOffers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: 'rgba(249,250,251,0.5)', borderWidth: 1, borderStyle: 'dashed', borderColor: tw.gray200, borderRadius: 12 },
  moreOffersText: { fontSize: 12, lineHeight: 16, color: F.green, ...poppins(700) },
  moreOffersCta: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: F.green, ...poppins(900) },
  couponPending: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'rgba(248,250,252,0.5)', borderTopWidth: 1, borderStyle: 'dashed', borderColor: tw.slate100 },
  applied: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'rgba(236,253,245,0.5)', borderTopWidth: 1, borderTopColor: 'rgba(208,250,229,0.6)' },
  appliedIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: EMERALD[500], alignItems: 'center', justifyContent: 'center' },
  appliedLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: tw.gray500, ...poppins(700) },
  appliedCode: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: EMERALD[700], backgroundColor: 'rgba(208,250,229,0.6)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(0,188,125,0.3)', overflow: 'hidden', ...poppins(800) },
  appliedSaved: { fontSize: 14, lineHeight: 20, color: EMERALD[600], marginTop: 2, ...poppins(800) },
  remove: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red100, borderRadius: 8 },
  removeText: { fontSize: 12, lineHeight: 16, color: tw.red600, ...poppins(900) },

  deliveryIn: { flex: 1, fontSize: 16, lineHeight: 24, color: tw.gray800, ...poppins(400) },
  pickupIcon: { backgroundColor: 'rgba(10,77,43,0.02)', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(10,77,43,0.08)' },
  pickupLabel: { fontSize: 12, lineHeight: 12, letterSpacing: 1.2, color: tw.gray400, ...poppins(900) },
  pickupName: { fontSize: 18, lineHeight: 22.5, color: tw.gray900, marginTop: 6, ...poppins(900) },
  pickupAddr: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 4, ...poppins(500) },
  pickupReady: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: tw.green50, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: tw.green100 },
  pickupReadyText: { flexShrink: 1, fontSize: 11, lineHeight: 16, letterSpacing: -0.275, color: tw.green600, ...poppins(900) },
  addrIcon: { backgroundColor: 'rgba(10,77,43,0.02)', padding: 8, borderRadius: 12, marginTop: 2 },
  addrHead: { fontSize: 14, lineHeight: 20, color: tw.gray800, ...poppins(400) },
  addrText: { fontSize: 14, lineHeight: 20, color: tw.gray500, marginTop: 4, paddingRight: 16, ...poppins(400) },
  addrSmall: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  gps: { fontSize: 10, lineHeight: 15, color: F.green, backgroundColor: 'rgba(10,77,43,0.02)', borderWidth: 1, borderColor: 'rgba(10,77,43,0.3)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', ...poppins(600) },
  addrWarn: { fontSize: 14, lineHeight: 20, color: F.green, marginTop: 8, ...poppins(500) },
  labelChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, backgroundColor: tw.slate100 },
  labelChipOff: { backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray100 },
  labelChipText: { fontSize: 12, lineHeight: 16, color: tw.slate700, ...poppins(600) },
  savedAddr: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 12, borderWidth: 2, borderColor: tw.slate100, padding: 12 },
  savedAddrLabel: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  savedAddrText: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 4, ...poppins(400) },
  selectedTag: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: '#fff', backgroundColor: F.green, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', ...poppins(700) },
  addrChevron: { padding: 8, backgroundColor: 'rgba(10,77,43,0.02)', borderRadius: 999 },

  recipient: { fontSize: 14, lineHeight: 20, color: tw.gray800, ...poppins(500) },
  recipientSub: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 4, ...poppins(400) },
  change: { fontSize: 12, lineHeight: 16, color: F.green, ...poppins(600) },
  recipientForm: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderStyle: 'dashed', borderColor: tw.gray200, gap: 12 },
  fieldLabel: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginBottom: 6, ...poppins(500) },
  field: { borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: tw.gray900, ...poppins(400) },

  billTitle: { fontSize: 16, lineHeight: 24, letterSpacing: -0.4, color: tw.gray900, ...poppins(900) },
  billTotal: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(900) },
  billChevron: { width: 28, height: 28, borderRadius: 14, backgroundColor: tw.slate50, borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  billBody: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderStyle: 'dashed', borderColor: tw.gray200, gap: 12 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  billLabel: { flexShrink: 1, fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  billValue: { fontSize: 14, lineHeight: 20, color: tw.gray800, ...poppins(500) },
  feeBreakdown: { fontSize: 11, lineHeight: 16, color: tw.gray500, marginTop: -6, marginLeft: 4, borderLeftWidth: 2, borderLeftColor: tw.gray100, paddingLeft: 8, ...poppins(400) },
  freeAt: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: 'rgba(10,77,43,0.12)', borderWidth: 1, borderColor: 'rgba(10,77,43,0.25)', paddingHorizontal: 10, paddingVertical: 4 },
  freeAtText: { fontSize: 11, lineHeight: 16, color: F.green, ...poppins(600) },

  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: tw.gray200, ...shadow('lg') },
  payRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, backgroundColor: tw.gray50, borderRadius: 12, borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  payIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(10,77,43,0.06)', alignItems: 'center', justifyContent: 'center' },
  payWith: { fontSize: 10, lineHeight: 12.5, letterSpacing: 0.5, color: tw.gray500, opacity: 0.8, ...poppins(700) },
  payLabel: { fontSize: 14, lineHeight: 17.5, color: tw.gray800, ...poppins(700) },
  payBal: { fontSize: 10, lineHeight: 12.5, color: tw.green600, backgroundColor: tw.green50, paddingHorizontal: 4, borderRadius: 4, overflow: 'hidden', ...poppins(700) },
  payChange: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(10,77,43,0.02)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  payChangeText: { fontSize: 11, lineHeight: 16, letterSpacing: 1.1, color: F.green, ...poppins(700) },
  placeShadow: { borderRadius: 16, ...shadow('0 10px 15px rgba(10,77,43,0.3)') },
  place: { height: 48, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, borderBottomWidth: 4, borderBottomColor: 'rgba(130,24,26,0.3)' },
  placeTotal: { borderRightWidth: 1.5, borderRightColor: 'rgba(255,255,255,0.2)', paddingRight: 16 },
  placeTotalValue: { fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.9)', ...poppins(600) },
  placeTotalLabel: { fontSize: 9, lineHeight: 12, letterSpacing: 0.45, color: 'rgba(255,255,255,0.8)', marginTop: -2, ...poppins(700) },
  placeText: { fontSize: 14, lineHeight: 20, letterSpacing: 0.35, color: '#fff', ...poppins(900) },

  success: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  successCircle: { width: 128, height: 128, borderRadius: 64, alignItems: 'center', justifyContent: 'center', ...shadow('0 25px 50px rgba(185,248,207,0.6)') },
  successPlace: { fontSize: 24, lineHeight: 32, color: tw.gray900, ...poppins(700) },
  successAddr: { fontSize: 16, lineHeight: 24, color: tw.gray500, textAlign: 'center', maxWidth: 384, ...poppins(400) },
  successTitle: { fontSize: 30, lineHeight: 36, color: F.green, marginTop: 48, marginBottom: 8, ...poppins(700) },
  successBody: { fontSize: 16, lineHeight: 24, color: tw.gray600, textAlign: 'center', ...poppins(400) },
  track: { marginTop: 40, backgroundColor: F.green, paddingVertical: 16, paddingHorizontal: 48, borderRadius: 12, ...shadow('0 10px 15px rgba(10,77,43,0.2)') },
  trackText: { fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(600) },
  placingOverlay: { flex: 1, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  placingTitle: { fontSize: 20, lineHeight: 28, color: tw.gray900, marginTop: 32, ...poppins(700) },
  placingBody: { fontSize: 14, lineHeight: 20, color: tw.gray500, textAlign: 'center', maxWidth: 320, marginTop: 16, ...poppins(400) },
  placingSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 32 },
  placingSheetTitle: { fontSize: 24, lineHeight: 32, color: tw.gray900, marginBottom: 24, ...poppins(700) },
  placingRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  placingIcon: { width: 56, height: 56, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  placingRowTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(600) },
  placingRowSub: { fontSize: 14, lineHeight: 20, color: tw.gray600, marginTop: 4, ...poppins(400) },
  progressTrack: { height: 10, backgroundColor: tw.gray200, borderRadius: 999, overflow: 'hidden' },
  cancel: { fontSize: 16, lineHeight: 24, color: F.green, ...poppins(600) },

  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: tw.gray200, alignSelf: 'center', marginBottom: 20 },
  payTitle: { fontSize: 20, lineHeight: 20, color: tw.gray900, ...poppins(800) },
  paySub: { fontSize: 11, lineHeight: 16, letterSpacing: -0.55, color: tw.gray400, marginTop: 4, ...poppins(700) },
  grayClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  payOpt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: tw.gray100, backgroundColor: '#fff', ...shadow('sm') },
  payOptOn: { borderColor: F.green, backgroundColor: F.green },
  payOptIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payOptName: { fontSize: 14, lineHeight: 16, letterSpacing: -0.35, color: tw.gray900, ...poppins(900) },
  payBadge: { fontSize: 8, lineHeight: 12, letterSpacing: 0.4, color: EMERALD[700], backgroundColor: EMERALD[100], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', ...poppins(900) },
  payOptDesc: { fontSize: 11, lineHeight: 16, color: tw.gray400, ...poppins(700) },
  payOptSub: { fontSize: 10, lineHeight: 15, letterSpacing: -0.5, color: tw.green600, ...poppins(900) },
  payOptDisabled: { fontSize: 9, lineHeight: 13, letterSpacing: 0.225, color: tw.red500, marginTop: 4, ...poppins(900) },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: tw.gray200, alignItems: 'center', justifyContent: 'center' },
  payFoot: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: tw.gray100 },
  payFootLabel: { fontSize: 10, lineHeight: 10, letterSpacing: 1, color: tw.gray400, marginBottom: 4, ...poppins(700) },
  payFootTotal: { fontSize: 20, lineHeight: 28, color: F.green, ...poppins(900) },
  confirm: { flex: 1, height: 44, borderRadius: 12, backgroundColor: F.green, alignItems: 'center', justifyContent: 'center', ...shadow('0 10px 15px rgba(10,77,43,0.2)') },
  confirmText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) },

  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  sheetTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  sheetSub: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 2, ...poppins(400) },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: tw.gray100, backgroundColor: 'rgba(249,250,251,0.6)' },
  codeInput: { flex: 1, height: 44, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 0, borderWidth: 1, borderColor: tw.gray200, fontSize: 14, color: tw.gray800, ...poppins(600) },
  codeApply: { height: 44, paddingHorizontal: 20, borderWidth: 1, borderColor: F.green, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  codeApplyText: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: F.green, ...poppins(900) },
  sheetEmpty: { paddingVertical: 40, textAlign: 'center', fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },

  shareDialog: { width: '92%', maxWidth: 448, backgroundColor: '#fff', borderRadius: 16, ...shadow('2xl') },
  shareHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: tw.gray200 },
  shareRowText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },

  autoSheet: { padding: 24, alignItems: 'center' },
  autoGlow: { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(59,130,246,0.15)' },
  autoTag: { fontSize: 11, lineHeight: 16, letterSpacing: 2.2, color: tw.gray800, marginTop: 16, ...poppins(700) },
  autoTitle: { fontSize: 24, lineHeight: 30, color: tw.gray900, marginTop: 12, textAlign: 'center', ...poppins(900) },
  autoCode: { fontSize: 14, lineHeight: 20, color: tw.gray500, marginTop: 6, textAlign: 'center', ...poppins(600) },
  autoTip: { fontSize: 11, lineHeight: 16, color: tw.gray400, marginTop: 20, textAlign: 'center', ...poppins(600) },
  autoApply: { alignSelf: 'stretch', marginTop: 24, height: 48, backgroundColor: F.green, borderRadius: 12, alignItems: 'center', justifyContent: 'center', ...shadow('md') },
  autoApplyText: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: '#fff', ...poppins(700) },
});
