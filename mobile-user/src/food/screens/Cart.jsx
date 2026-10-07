import { useEffect, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  AlertTriangle, ArrowLeft, Banknote, Check, CheckCircle2, ChevronDown, ChevronRight, Clock, Copy, CreditCard, FileText, Home, Mail, MapPin, MessageCircle,
  Minus, Percent, Phone, Plus, Send, Share, Share2, ShoppingBag, Sparkles, Tag, Utensils, Wallet, X, Zap,
} from 'lucide-react-native';
import Image from '../../components/Img';
import { BottomSheet, Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import Skeleton from '../../components/Skeleton';
import { Button, Card, EmptyState, IconButton, StatusBadge, formatINR } from '../../components/ds';
import { NAV_CLEARANCE, isImmersiveRoute } from '../../components/dh/AppBottomNav';
import { BillRow, CtaBar, Divider, Field, LinkButton, Radio, VegMark } from '../components/cart/parts';
import { useCartPage } from '../hooks/pages/useCartPage';
import { navigateTo } from '../../lib/webRouter';
import { toast } from '../../lib/notify';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { color, elevation, radii, space, tone, type } from '../../theme';

const DISH_FALLBACK = require('../../../assets/food/dish_fallback.webp');
const ADDON_FALLBACK = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop';
const SCALLOP =
  'M 86.29 42.78 Q 95.00 50.00 86.29 57.22 Q 91.57 67.22 80.76 70.56 Q 81.82 81.82 70.56 80.76 Q 67.22 91.57 57.22 86.29 Q 50.00 95.00 42.78 86.29 Q 32.78 91.57 29.44 80.76 Q 18.18 81.82 19.24 70.56 Q 8.43 67.22 13.71 57.22 Q 5.00 50.00 13.71 42.78 Q 8.43 32.78 19.24 29.44 Q 18.18 18.18 29.44 19.24 Q 32.78 8.43 42.78 13.71 Q 50.00 5.00 57.22 13.71 Q 67.22 8.43 70.56 19.24 Q 81.82 18.18 80.76 29.44 Q 91.57 32.78 86.29 42.78 Z';
const CONFETTI = [color.primary, color.gold, color.info, color.goldBright, color.primaryDeep, color.success];
const inr = (n) => formatINR(n, { decimals: 2 });

function Thumb({ uri, fallback, style }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const fb = typeof fallback === 'string' ? { uri: fallback } : fallback;
  return <Image source={uri && !failed ? { uri } : fb} onError={() => setFailed(true)} style={style} resizeMode="cover" />;
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
      <View style={{ ...StyleSheet.absoluteFill, borderRadius: size / 2, borderWidth: 4, borderColor: color.border }} />
      <Animated.View style={{ ...StyleSheet.absoluteFill, borderRadius: size / 2, borderWidth: 4, borderColor: 'transparent', borderTopColor: color.primary, transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }} />
    </View>
  );
}

/** Card title row: lucide icon + Poppins title (+ optional right slot). */
function CardTitle({ icon: Icon, title, right }) {
  return (
    <View style={styles.cardTitleRow}>
      {Icon ? <Icon size={20} color={color.primary} /> : null}
      <Text style={[type.subheading, { color: color.text, flex: 1 }]} accessibilityRole="header">
        {title}
      </Text>
      {right}
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
      <View key={coupon.code} style={[styles.couponCard, blocked ? { opacity: 0.6 } : null]}>
        <View style={styles.couponIcon}>
          <Percent size={16} color={color.goldText} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
            <Text style={styles.couponCode}>{String(coupon.code).toUpperCase()}</Text>
            <Text style={[type.bodyStrong, { color: color.text }]}>{coupon.discountDisplay || `Save ${RUPEE_SYMBOL}${coupon.discount}`}</Text>
          </View>
          <Text style={[type.small, { color: color.textMuted, marginTop: space.xs }]} numberOfLines={compact ? 1 : 2}>
            {coupon.description || 'Save flat amount on your order'}
          </Text>
          {blocked ? (
            <Text style={[type.caption, { color: color.warning, marginTop: 2 }]}>Not available for this delivery location</Text>
          ) : !meetsMinOrder ? (
            <Text style={[type.caption, { color: color.textMuted, marginTop: 2 }]}>
              Add items worth {RUPEE_SYMBOL}
              {Math.max(0, (Number(coupon.minOrder) || 0) - subtotal).toFixed(0)} more to apply
            </Text>
          ) : null}
        </View>
        <Button title="Apply" size="sm" variant="outline" fullWidth={false} disabled={!isApplicable} onPress={() => handleApplyCoupon(coupon)} accessibilityLabel={`Apply coupon ${coupon.code}`} style={{ height: 40 }} />
      </View>
    );
  };

  if (cart.length === 0 && !showOrderSuccess && !showPlacingOrder && !showSavingsCongrats) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <View style={styles.header}>
          <IconButton icon={ArrowLeft} label="Go back" onPress={handleBack} />
          <Text style={[type.heading, { color: color.text, flex: 1 }]} accessibilityRole="header">
            Cart
          </Text>
        </View>
        <EmptyState icon={Utensils} title="Your cart is empty" message="Add items from a restaurant to start a new order" actionLabel="Browse restaurants" onAction={() => navigateTo('/food/user')} />
      </View>
    );
  }

  const placeDisabled = isPlacingOrder || loadingPricing || isCartZoneMismatch || (selectedPaymentMethod === 'wallet' && walletBalance < total) || isRestaurantClosed;
  const placeLabel = isRestaurantClosed
    ? 'Restaurant closed'
    : isCartZoneMismatch
      ? 'Not deliverable here'
      : isPlacingOrder
        ? 'Processing...'
        : loadingPricing
          ? 'Calculating...'
          : !isTakeaway && !hasSavedAddress
            ? 'Select address'
            : 'Place order';

  const paymentOptions = [
    { id: 'razorpay', name: 'Online payment', description: 'UPI, cards, netbanking', Icon: Zap, badge: 'Secure', disabled: !isPaymentMethodEnabled('razorpay'), disabledText: 'Online payment is turned off' },
    {
      id: 'wallet', name: 'Wallet', description: 'Pay from your wallet', Icon: Wallet, subInfo: `Balance ${RUPEE_SYMBOL}${walletBalance.toFixed(0)}`,
      disabled: walletBalance < total || !isPaymentMethodEnabled('wallet'), disabledText: !isPaymentMethodEnabled('wallet') ? 'Wallet is turned off' : `Low balance (${RUPEE_SYMBOL}${walletBalance.toFixed(0)})`,
    },
    { id: 'cash', name: 'Cash on delivery', description: 'Pay when the order arrives', Icon: Banknote, disabled: !isPaymentMethodEnabled('cash'), disabledText: 'Cash on delivery is turned off', hideWhenDisabled: true },
  ].filter((option) => !option.hideWhenDisabled || !option.disabled);

  const deliveryAddressText = defaultAddress ? formatFullAddress(defaultAddress) || defaultAddress?.formattedAddress || defaultAddress?.address || 'Add delivery address' : 'Add delivery address';
  const busy = showOrderSuccess || isPlacingOrder || showPlacingOrder;
  const PayIcon = selectedPaymentMethod === 'wallet' ? Wallet : selectedPaymentMethod === 'razorpay' ? Zap : Banknote;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={styles.header}>
        <IconButton icon={ArrowLeft} label="Go back" onPress={handleBack} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.heading, { color: color.text }]} numberOfLines={1} accessibilityRole="header">
            {restaurantName}
          </Text>
          {isRestaurantClosed ? (
            <Text style={[type.caption, { color: color.danger }]} numberOfLines={2}>
              Restaurant is closed. Please order when they are online.
            </Text>
          ) : null}
        </View>
        <IconButton icon={Share} label="Share" onPress={handleShare} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {isCartZoneMismatch ? (
          <View style={[styles.banner, { backgroundColor: tone.warning.bg, borderColor: color.warning }]}>
            <AlertTriangle size={20} color={color.warning} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.bodyStrong, { color: color.text }]}>Delivery not available here</Text>
              <Text style={[type.small, { color: color.textSecondary, marginTop: 2 }]}>
                {restaurantName} doesn’t deliver to your selected location. Switch address to continue, or clear this cart.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
                <Button title="Change location" icon={MapPin} size="sm" variant="primary" fullWidth={false} onPress={openLocationSelector} />
                <Button
                  title="Clear cart"
                  size="sm"
                  variant="outline"
                  fullWidth={false}
                  onPress={() => {
                    clearCart();
                    toast.success('Cart cleared');
                  }}
                />
              </View>
            </View>
          </View>
        ) : null}

        {savings > 0 ? (
          <View style={[styles.banner, { backgroundColor: tone.success.bg, borderColor: tone.success.bg, alignItems: 'center' }]}>
            <Sparkles size={18} color={color.success} />
            <Text style={[type.bodyStrong, { color: color.success, flex: 1 }]}>
              {appliedCoupon?.code ? `You saved ${RUPEE_SYMBOL}${savings} with '${appliedCoupon.code}' on this order!` : `You saved ${RUPEE_SYMBOL}${savings} on this order!`}
            </Text>
          </View>
        ) : null}

        {/* Items */}
        <Card>
          <CardTitle icon={ShoppingBag} title="Your items" />
          <View style={{ gap: space.lg }}>
            {cart.map((item, index) => {
              const veg = item.isVeg === true || item.foodType === 'Veg';
              return (
                <View key={item.id} style={isCartUnavailable ? { opacity: 0.6 } : null}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
                    <View style={styles.itemImg}>
                      <Thumb uri={item.image} fallback={DISH_FALLBACK} style={{ width: '100%', height: '100%' }} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
                        <VegMark veg={veg} size={14} style={{ marginTop: 4 }} />
                        <Text style={[type.bodyStrong, { color: color.text, flex: 1 }]} numberOfLines={2}>
                          {item.name}
                        </Text>
                      </View>
                      {item.variantName ? <StatusBadge label={item.variantName} tone="neutral" /> : null}
                      {isRestaurantClosed ? <Text style={[type.caption, { color: color.danger }]}>Remove this dish to order available dishes</Text> : null}
                      {isCartZoneMismatch && !isRestaurantClosed ? <Text style={[type.caption, { color: color.warning }]}>Not deliverable to your selected location</Text> : null}
                      <View style={styles.itemFoot}>
                        <View style={styles.qty}>
                          <Press scale={0.9} onPress={() => updateQuantity(item.id, item.quantity - 1)} accessibilityLabel={`Remove one ${item.name}`} style={styles.qtyBtn} hitSlop={4}>
                            <Minus size={16} color={color.primary} />
                          </Press>
                          <Text style={[type.bodyStrong, styles.qtyText]} accessibilityLabel={`Quantity ${item.quantity}`}>
                            {item.quantity}
                          </Text>
                          <Press scale={0.9} onPress={() => updateQuantity(item.id, item.quantity + 1)} accessibilityLabel={`Add one more ${item.name}`} style={styles.qtyBtn} hitSlop={4}>
                            <Plus size={16} color={color.primary} />
                          </Press>
                        </View>
                        <Text style={[type.bodyStrong, { color: color.text }]}>
                          {RUPEE_SYMBOL}
                          {((item.price || 0) * (item.quantity || 1)).toFixed(0)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {index < cart.length - 1 ? <Divider dashed style={{ marginTop: space.lg }} /> : null}
                </View>
              );
            })}
          </View>
          <Divider style={{ marginTop: space.lg }} />
          <Press scale={0.98} onPress={handleBack} accessibilityLabel="Add more items" style={styles.inlineAction}>
            <Plus size={18} color={color.primary} />
            <Text style={[type.label, { color: color.primary }]}>Add more items</Text>
          </Press>
        </Card>

        {/* Note */}
        <Card padded={false}>
          <Press
            scale={0.99}
            onPress={() => setShowRestaurantNoteInput(!showRestaurantNoteInput)}
            accessibilityLabel="Add note for restaurant"
            accessibilityState={{ expanded: showRestaurantNoteInput }}
            style={styles.rowPress}
          >
            <Utensils size={18} color={color.textSecondary} />
            <Text style={[type.body, { color: restaurantNote ? color.text : color.textSecondary, flex: 1 }]} numberOfLines={1}>
              {restaurantNote || 'Add note for restaurant'}
            </Text>
            <ChevronDown size={18} color={color.textMuted} style={{ transform: [{ rotate: showRestaurantNoteInput ? '180deg' : '0deg' }] }} />
          </Press>
          {showRestaurantNoteInput ? (
            <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}>
              <Field
                label="Restaurant instructions"
                value={restaurantNote}
                onChangeText={setRestaurantNote}
                placeholder="Eg. Don't add onions, make it extra spicy, etc."
                multiline
                maxLength={240}
                accessibilityLabel="Note for restaurant"
              />
              <View style={{ marginTop: space.xs, flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
                <Text style={[type.caption, { color: color.textMuted }]}>Note for restaurant.</Text>
                <Text style={[type.caption, { color: color.textMuted }]}>{restaurantNote.length}/240</Text>
              </View>
            </View>
          ) : null}
        </Card>

        {/* Add-ons */}
        {addons.length > 0 ? (
          <Card style={{ paddingHorizontal: 0 }}>
            <View style={{ paddingHorizontal: space.lg }}>
              <CardTitle icon={Sparkles} title="Complete your meal with" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
              {loadingAddons
                ? [1, 2, 3].map((i) => (
                    <View key={i} style={{ width: 120 }}>
                      <Skeleton style={{ height: 112, borderRadius: radii.md }} />
                      <Skeleton style={{ height: 16, borderRadius: 4, marginTop: space.sm }} />
                      <Skeleton style={{ height: 12, borderRadius: 4, marginTop: space.xs, width: '66%' }} />
                    </View>
                  ))
                : addons.map((addon) => (
                    <View key={addon.id} style={{ width: 120 }}>
                      <View style={styles.addonImg}>
                        <Thumb uri={addon.image || (addon.images && addon.images[0])} fallback={ADDON_FALLBACK} style={{ width: 120, height: 112 }} />
                        <VegMark veg size={14} style={{ position: 'absolute', top: space.xs + 2, left: space.xs + 2 }} />
                      </View>
                      <Text style={[type.label, { color: color.text, marginTop: space.sm }]} numberOfLines={2}>
                        {addon.name}
                      </Text>
                      {addon.description ? (
                        <Text style={[type.caption, { color: color.textMuted }]} numberOfLines={1}>
                          {addon.description}
                        </Text>
                      ) : null}
                      <View style={styles.addonFoot}>
                        <Text style={[type.bodyStrong, { color: color.text }]}>
                          {RUPEE_SYMBOL}
                          {addon.price}
                        </Text>
                        <IconButton
                          icon={Plus}
                          label={`Add ${addon.name}`}
                          variant="primary"
                          size={36}
                          iconSize={18}
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
                        />
                      </View>
                    </View>
                  ))}
            </ScrollView>
          </Card>
        ) : null}

        {/* Coupons */}
        <Card>
          <CardTitle icon={Tag} title="Offers & coupons" />

          {!appliedCoupon && !couponCode ? (
            filteredCoupons.length > 0 ? (
              <View style={{ gap: space.sm }}>
                {filteredCoupons.slice(0, 2).map((coupon) => renderCartCouponCard(coupon, { compact: true, blocked: isCartUnavailable }))}
                <Press scale={0.98} onPress={openCoupons} accessibilityLabel="View all offers" style={[styles.moreOffers, isCartUnavailable ? { opacity: 0.6 } : null]}>
                  <Text style={[type.label, { color: color.text, flex: 1 }]}>
                    {filteredCoupons.length > 2 ? `+ ${filteredCoupons.length - 2} more offer${filteredCoupons.length - 2 > 1 ? 's' : ''}` : 'More offers available'}
                  </Text>
                  <Text style={[type.label, { color: color.primary }]}>View all</Text>
                  <ChevronRight size={16} color={color.primary} />
                </Press>
              </View>
            ) : (
              <Press scale={0.98} onPress={openCoupons} accessibilityLabel="Apply a coupon code" style={[styles.moreOffers, isCartUnavailable ? { opacity: 0.6 } : null]}>
                <Text style={[type.label, { color: color.text, flex: 1 }]}>Have a coupon code?</Text>
                <Text style={[type.label, { color: color.primary }]}>Apply</Text>
                <ChevronRight size={16} color={color.primary} />
              </Press>
            )
          ) : null}

          {couponCode && !appliedCoupon ? (
            <View style={styles.couponPending} accessibilityLabel="Applying coupon">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
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
              <View style={styles.appliedIcon}>
                <Check size={16} color={color.onPrimary} strokeWidth={3} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                  <Text style={[type.caption, { color: color.textSecondary }]}>Applied</Text>
                  <Text style={styles.couponCode}>{String(appliedCoupon.code).toUpperCase()}</Text>
                </View>
                <Text style={[type.bodyStrong, { color: color.success, marginTop: 2 }]}>
                  You saved {RUPEE_SYMBOL}
                  {Math.round(discount)}
                </Text>
              </View>
              <LinkButton title="Remove" tone="danger" onPress={handleRemoveCoupon} accessibilityLabel="Remove coupon" />
            </View>
          ) : null}
        </Card>

        {/* Delivery / pickup */}
        <Card>
          {isTakeaway ? (
            <>
              <CardTitle icon={ShoppingBag} title="Pickup from" />
              <Text style={[type.subheading, { color: color.text }]} numberOfLines={2}>
                {restaurantData?.name || cart[0]?.restaurant || 'Restaurant'}
              </Text>
              <Text style={[type.small, { color: color.textSecondary, marginTop: space.xs }]} numberOfLines={3}>
                {restaurantData?.address || restaurantData?.location?.address || 'Restaurant Address'}
              </Text>
              <StatusBadge icon={CheckCircle2} tone="success" label={`Ready for pickup in ${restaurantData?.preparationTime || '25-30'} mins`} style={{ marginTop: space.md }} />
            </>
          ) : (
            <>
              <CardTitle
                icon={MapPin}
                title={deliveryAddressMode === 'current' ? 'Deliver to current location' : 'Deliver to'}
                right={<IconButton icon={ChevronRight} label="Open location selector" variant="primary" size={40} onPress={openLocationSelector} />}
              />
              <View style={styles.etaRow}>
                <Clock size={16} color={color.success} />
                <Text style={[type.small, { color: color.textSecondary }]}>
                  Delivery in <Text style={[type.bodyStrong, { color: color.success }]}>{restaurantData?.estimatedDeliveryTime || '15-20 mins'}</Text>
                </Text>
              </View>
              {deliveryAddressMode === 'current' ? (
                <View style={{ gap: space.xs }}>
                  <Text style={[type.small, { color: color.textSecondary }]} numberOfLines={3}>
                    {currentLocationLoading || !currentLocationAddress
                      ? 'Finding your current address...'
                      : formatFullAddress(currentLocationAddress) || currentLocationAddress?.formattedAddress || currentLocationAddress?.address || 'Add delivery address'}
                  </Text>
                  <StatusBadge label="GPS enabled" tone="primary" />
                </View>
              ) : (
                <Text style={[type.small, { color: color.textSecondary }]} numberOfLines={3}>
                  {deliveryAddressText}
                </Text>
              )}
              {!hasSavedAddress ? (
                <View style={[styles.inlineNote, { backgroundColor: tone.warning.bg }]}>
                  <AlertTriangle size={16} color={color.warning} />
                  <Text style={[type.small, { color: color.text, flex: 1 }]}>Select a delivery location to continue</Text>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
                {['Home', 'Work', 'Other'].map((label) => {
                  const normalizedLabel = normalizeAddressLabel(label);
                  const addressExists = addresses.some((addr) => normalizeAddressLabel(addr.label) === normalizedLabel);
                  return (
                    <Press
                      key={label}
                      scale={0.96}
                      disabled={!addressExists}
                      onPress={() => handleSelectAddressByLabel(label)}
                      accessibilityLabel={`Deliver to ${label}`}
                      accessibilityState={{ disabled: !addressExists }}
                      style={[styles.labelChip, addressExists ? null : styles.labelChipOff]}
                    >
                      <Text style={[type.label, { color: addressExists ? color.text : color.textDisabled }]}>{label}</Text>
                    </Press>
                  );
                })}
              </View>

              {addresses.length > 0 ? (
                <View style={{ marginTop: space.md, gap: space.sm }} accessibilityRole="radiogroup">
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
                        accessibilityLabel={`${getDisplayAddressLabel(address.label)}, ${formatFullAddress(address) || address.address || ''}`}
                        style={[styles.savedAddr, isSelected ? styles.savedAddrOn : null]}
                      >
                        <View style={{ marginTop: 1 }}>
                          <Radio checked={isSelected} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[type.bodyStrong, { color: color.text }]}>{getDisplayAddressLabel(address.label)}</Text>
                          <Text style={[type.small, { color: color.textSecondary, marginTop: 2 }]} numberOfLines={3}>
                            {formatFullAddress(address) || address.address || 'Address details'}
                          </Text>
                        </View>
                      </Press>
                    );
                  })}
                </View>
              ) : null}
            </>
          )}
        </Card>

        {/* Recipient */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Phone size={18} color={color.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={1}>
                {recipientName}, {recipientPhone || '+91-XXXXXXXXXX'}
              </Text>
              <Text style={[type.caption, { color: color.textMuted }]}>Order recipient details</Text>
            </View>
            <LinkButton
              title={isEditingRecipient ? 'Done' : 'Change'}
              onPress={() => setIsEditingRecipient((prev) => !prev)}
              accessibilityLabel={isEditingRecipient ? 'Done editing recipient' : 'Change recipient'}
            />
          </View>
          {isEditingRecipient ? (
            <View style={styles.recipientForm}>
              <Field
                label="Name"
                value={recipientDetails.name}
                onChangeText={(text) => setRecipientDetails((prev) => ({ ...prev, name: text }))}
                placeholder="Enter recipient name"
                autoCapitalize="words"
                returnKeyType="next"
                accessibilityLabel="Recipient name"
              />
              <Field
                label="Phone number"
                value={recipientDetails.phone}
                onChangeText={(text) => setRecipientDetails((prev) => ({ ...prev, phone: sanitizeRecipientPhone(text) }))}
                placeholder="Enter recipient phone"
                keyboardType="phone-pad"
                returnKeyType="done"
                accessibilityLabel="Recipient phone number"
              />
              <Text style={[type.caption, { color: color.textMuted }]}>Agar aap kisi aur ke liye order kar rahe ho, to yahan uska naam aur phone save kar do.</Text>
            </View>
          ) : null}
        </Card>

        {/* Bill */}
        <Card padded={false}>
          <Press
            scale={0.99}
            onPress={() => setShowBillDetails(!showBillDetails)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showBillDetails }}
            accessibilityLabel={`Bill details, to pay ${inr(total)}`}
            style={styles.rowPress}
          >
            <FileText size={20} color={color.primary} />
            <Text style={[type.subheading, { color: color.text, flex: 1 }]}>Bill details</Text>
            {loadingPricing ? <Skeleton style={{ width: 64, height: 20, borderRadius: 4 }} /> : <Text style={[type.bodyStrong, { color: color.text }]}>{inr(total)}</Text>}
            <ChevronDown size={18} color={color.textMuted} style={{ transform: [{ rotate: showBillDetails ? '180deg' : '0deg' }] }} />
          </Press>
          {showBillDetails ? (
            <View style={styles.billBody}>
              <BillRow label="Item total" value={inr(subtotal)} loading={loadingPricing} />
              {!isTakeaway ? (
                <>
                  <BillRow label="Delivery fee" note={deliveryFeeBreakdownText || null} value={deliveryFee === 0 ? 'Free' : inr(deliveryFee)} tone={deliveryFee === 0 ? 'success' : undefined} loading={loadingPricing} />
                  {freeDeliveryUpTo > 0 ? (
                    <StatusBadge icon={Sparkles} tone="primary" label={`Free delivery at ${RUPEE_SYMBOL}${freeDeliveryUpTo.toFixed(0)}+`} />
                  ) : null}
                </>
              ) : null}
              {platformFee > 0 ? <BillRow label="Platform fee" value={inr(platformFee)} loading={loadingPricing} /> : null}
              {packagingFee > 0 || gstCharges > 0 ? <BillRow label="GST and restaurant charges" value={inr(packagingFee + gstCharges)} loading={loadingPricing} /> : null}
              {discount > 0 ? <BillRow label="Coupon discount" tone="success" value={`−${inr(discount)}`} loading={loadingPricing} /> : null}
              <Divider />
              <BillRow strong label="To pay" value={inr(total)} loading={loadingPricing} />
            </View>
          ) : null}
        </Card>
      </ScrollView>

      {/* Pay + place order */}
      <CtaBar extraBottom={navClearance}>
        <Press scale={0.99} onPress={() => setShowPaymentSheet(true)} accessibilityLabel={`Paying with ${selectedPaymentLabel}. Change`} style={styles.payRow}>
          <View style={styles.payIcon}>
            <PayIcon size={20} color={color.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[type.caption, { color: color.textMuted }]}>Paying with</Text>
            <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={1}>
              {selectedPaymentLabel}
              {selectedPaymentMethod === 'wallet' ? (
                <Text style={[type.small, { color: color.success }]}>
                  {'  '}
                  {RUPEE_SYMBOL}
                  {walletBalance.toFixed(0)}
                </Text>
              ) : null}
            </Text>
          </View>
          <Text style={[type.label, { color: color.primary }]}>Change</Text>
          <ChevronRight size={16} color={color.primary} />
        </Press>
        <View style={styles.ctaRow}>
          <View style={{ minWidth: 0, flexShrink: 1 }}>
            <Text style={[type.caption, { color: color.textMuted }]}>Total</Text>
            {loadingPricing ? (
              <Skeleton style={{ width: 80, height: 22, borderRadius: 4, marginTop: 2 }} />
            ) : (
              <Text style={[type.price, { color: color.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {inr(total)}
              </Text>
            )}
          </View>
          <Button
            title={placeLabel}
            size="lg"
            iconRight={ChevronRight}
            disabled={placeDisabled}
            loading={isPlacingOrder}
            onPress={handlePlaceOrder}
            accessibilityLabel={`${placeLabel}. Total ${inr(total)}`}
            style={{ flex: 1 }}
          />
        </View>
      </CtaBar>

      {/* Placing order / success: cover the whole screen, as the web's fixed layers do */}
      <Modal visible={busy} transparent={!showOrderSuccess} statusBarTranslucent animationType="fade" onRequestClose={() => {}}>
        {showOrderSuccess ? (
          <View style={[styles.success, { paddingTop: insets.top, paddingBottom: insets.bottom + space.xxl }]}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {Array.from({ length: 28 }, (_, i) => (
                <ConfettiPiece key={i} index={i} width={width} height={height} />
              ))}
            </View>
            <View style={styles.successCircle}>
              <Check size={56} color={color.onPrimary} strokeWidth={3} />
            </View>
            <Text style={[type.heroSerif, { color: color.primary, marginTop: space.xxl, textAlign: 'center' }]} accessibilityRole="header">
              Order placed
            </Text>
            <Text style={[type.body, { color: color.textSecondary, textAlign: 'center', marginTop: space.xs }]}>
              {isTakeaway ? 'Your delicious food is being prepared for pickup' : 'Your delicious food is on its way'}
            </Text>
            <Card style={{ alignSelf: 'stretch', marginTop: space.xxl, maxWidth: 420 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
                {isTakeaway ? <Home size={20} color={color.primary} /> : <MapPin size={20} color={color.primary} />}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.subheading, { color: color.text }]} numberOfLines={2}>
                    {isTakeaway ? restaurantData?.name || 'Restaurant' : defaultAddress?.city || 'Your Location'}
                  </Text>
                  <Text style={[type.small, { color: color.textSecondary, marginTop: 2 }]} numberOfLines={3}>
                    {isTakeaway
                      ? restaurantData?.location
                        ? restaurantData.location.addressLine1 || restaurantData.location.formattedAddress || restaurantData.location.address || `${restaurantData.location.city || ''}${restaurantData.location.area ? `, ${restaurantData.location.area}` : ''}`
                        : restaurantData?.address || restaurantData?.formattedAddress || 'Self-Pickup from Restaurant'
                      : defaultAddress
                        ? formatFullAddress(defaultAddress) || defaultAddress?.formattedAddress || defaultAddress?.address || 'Delivery Address'
                        : 'Delivery Address'}
                  </Text>
                </View>
              </View>
            </Card>
            <Button title="Track your order" size="lg" onPress={handleGoToOrders} style={{ marginTop: space.xxl, alignSelf: 'stretch', maxWidth: 420 }} />
          </View>
        ) : isPlacingOrder ? (
          <View style={styles.placingOverlay} accessibilityRole="progressbar" accessibilityLabel="Placing your order">
            <Spinner />
            <Text style={[type.heading, { color: color.text, marginTop: space.xxl }]}>Placing your order...</Text>
            <Text style={[type.body, { color: color.textSecondary, textAlign: 'center', maxWidth: 320, marginTop: space.sm }]}>
              {selectedPaymentMethod === 'razorpay' ? 'Please wait while we verify your payment. Do not close the app.' : 'We are creating your order. Please wait.'}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: color.overlay }}>
            <View style={[styles.placingSheet, { paddingBottom: space.xxl + insets.bottom }]}>
              <Text style={[type.heading, { color: color.text, marginBottom: space.xl }]}>{isTakeaway ? 'Placing takeaway order' : 'Placing your order'}</Text>
              <View style={styles.placingRow}>
                <View style={styles.placingIcon}>
                  <CreditCard size={22} color={color.primary} />
                </View>
                <Text style={[type.bodyStrong, { color: color.text, flex: 1 }]}>
                  {selectedPaymentMethod === 'razorpay' ? `Pay ${inr(total)} online (Razorpay)` : selectedPaymentMethod === 'wallet' ? `Pay ${inr(total)} from Wallet` : 'Pay on delivery (COD)'}
                </Text>
              </View>
              <View style={[styles.placingRow, { marginBottom: space.xxl }]}>
                <View style={styles.placingIcon}>
                  <Home size={22} color={color.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.bodyStrong, { color: color.text }]}>{isTakeaway ? 'Picking up from Restaurant' : 'Delivering to Location'}</Text>
                  <Text style={[type.small, { color: color.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                    {isTakeaway ? restaurantData?.name || cart[0]?.restaurant || 'Restaurant' : defaultAddress ? formatFullAddress(defaultAddress) || defaultAddress?.formattedAddress || defaultAddress?.address || 'Address' : 'Add address'}
                  </Text>
                </View>
              </View>
              <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.max(0, Math.min(100, orderProgress))) }}>
                <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, orderProgress))}%`, borderRadius: radii.pill, backgroundColor: color.primary }} />
              </View>
              <Button
                title="Cancel"
                variant="ghost"
                fullWidth={false}
                onPress={() => {
                  setShowPlacingOrder(false);
                  setIsPlacingOrder(false);
                }}
                style={{ alignSelf: 'flex-end', marginTop: space.lg }}
              />
            </View>
          </View>
        )}
      </Modal>

      {/* Payment method */}
      <BottomSheet visible={showPaymentSheet} onClose={() => setShowPaymentSheet(false)} backdrop={color.overlay} spring={{ stiffness: 350, damping: 30 }} panelStyle={[styles.sheet, { maxHeight: height * 0.82 }]}>
        <View style={{ paddingTop: space.md, paddingBottom: space.lg + insets.bottom, flexShrink: 1 }}>
          <View style={styles.handle} />
          <View style={styles.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">
                Payment method
              </Text>
              <Text style={[type.small, { color: color.textMuted }]}>Select how you want to pay</Text>
            </View>
            <IconButton icon={X} label="Close" variant="soft" onPress={() => setShowPaymentSheet(false)} />
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md }} accessibilityRole="radiogroup">
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
                  style={[styles.payOpt, on ? styles.payOptOn : null, option.disabled ? styles.payOptOff : null]}
                >
                  <Radio checked={on} disabled={option.disabled} />
                  <View style={[styles.payOptIcon, { backgroundColor: option.disabled ? color.surfaceMuted : color.primarySoft }]}>
                    <Icon size={20} color={option.disabled ? color.textDisabled : color.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                      <Text style={[type.bodyStrong, { color: option.disabled ? color.textMuted : color.text }]}>{option.name}</Text>
                      {option.badge && !option.disabled ? <StatusBadge label={option.badge} tone="success" /> : null}
                    </View>
                    <Text style={[type.small, { color: color.textMuted }]}>
                      {option.description}
                      {option.subInfo && !option.disabled ? <Text style={{ color: color.success }}>{` · ${option.subInfo}`}</Text> : null}
                    </Text>
                    {option.disabled ? <Text style={[type.caption, { color: color.danger, marginTop: 2 }]}>{option.disabledText}</Text> : null}
                  </View>
                </Press>
              );
            })}
          </ScrollView>
          <View style={styles.payFoot}>
            <View>
              <Text style={[type.caption, { color: color.textMuted }]}>Total to pay</Text>
              <Text style={[type.price, { color: color.text }]}>
                {RUPEE_SYMBOL}
                {total.toFixed(0)}
              </Text>
            </View>
            <Button title="Done" onPress={() => setShowPaymentSheet(false)} accessibilityLabel="Confirm payment method" style={{ flex: 1 }} />
          </View>
        </View>
      </BottomSheet>

      {/* All coupons */}
      <BottomSheet visible={showCouponSheet && !appliedCoupon && !isCartUnavailable} onClose={() => setShowCouponSheet(false)} backdrop={color.overlay} panelStyle={[styles.sheet, { maxHeight: height * 0.85 }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flexShrink: 1 }}>
          <View style={[styles.sheetHead, { paddingTop: space.lg, borderBottomWidth: 1, borderBottomColor: color.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">
                All offers & coupons
              </Text>
              <Text style={[type.small, { color: color.textMuted }]}>
                {filteredCoupons.length} offer{filteredCoupons.length === 1 ? '' : 's'} available
              </Text>
            </View>
            <IconButton icon={X} label="Close coupons" variant="soft" onPress={() => setShowCouponSheet(false)} />
          </View>
          <View style={styles.codeRow}>
            <TextInput
              value={manualCouponCode}
              onChangeText={(text) => setManualCouponCode(text.toUpperCase())}
              placeholder="Enter coupon code"
              placeholderTextColor={color.textDisabled}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleApplyCouponCode}
              accessibilityLabel="Coupon code"
              style={styles.codeInput}
            />
            <Button title="Apply" variant="secondary" fullWidth={false} disabled={isCartUnavailable} onPress={handleApplyCouponCode} accessibilityLabel="Apply coupon code" />
          </View>
          <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.lg + insets.bottom, gap: space.sm }}>
            {loadingCoupons ? (
              <Text style={styles.sheetEmpty}>Loading offers...</Text>
            ) : filteredCoupons.length > 0 ? (
              filteredCoupons.map((coupon) => renderCartCouponCard(coupon, { blocked: isCartUnavailable }))
            ) : (
              <Text style={styles.sheetEmpty}>No offers available right now. You can still enter a coupon code above.</Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </BottomSheet>

      {/* Share */}
      <Dialog visible={!!(showShareModal && sharePayload)} onClose={() => setShowShareModal(false)} backdrop={color.overlay} panelStyle={styles.shareDialog}>
        <View style={[styles.sheetHead, { paddingTop: space.md, borderBottomWidth: 1, borderBottomColor: color.border }]}>
          <Text style={[type.heading, { color: color.text, flex: 1 }]} accessibilityRole="header">
            Share
          </Text>
          <IconButton icon={X} label="Close share modal" onPress={() => setShowShareModal(false)} />
        </View>
        <View style={{ padding: space.lg, gap: space.sm }}>
          {[
            { key: 'system', label: 'Share via system apps', Icon: Share2, onPress: handleSystemShareFromModal },
            { key: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, onPress: () => openShareTarget('whatsapp') },
            { key: 'telegram', label: 'Telegram', Icon: Send, onPress: () => openShareTarget('telegram') },
            { key: 'email', label: 'Email', Icon: Mail, onPress: () => openShareTarget('email') },
            { key: 'copy', label: 'Copy link', Icon: Copy, onPress: copyShareLink },
          ].map(({ key, label, Icon, onPress }) => (
            <Press key={key} scale={0.99} onPress={onPress} accessibilityLabel={label} style={styles.shareRow}>
              <Icon size={20} color={color.primary} />
              <Text style={[type.body, { color: color.text }]}>{label}</Text>
            </Press>
          ))}
        </View>
      </Dialog>

      {/* Best coupon suggestion */}
      <BottomSheet
        visible={!!(showAutoCouponPopup && bestCoupon && !isCartUnavailable)}
        onClose={() => setShowAutoCouponPopup(false)}
        backdrop={color.overlay}
        spring={{ stiffness: 240, damping: 28 }}
        panelStyle={[styles.sheet, styles.autoSheet, { paddingBottom: space.xxl + insets.bottom }]}
      >
        <IconButton icon={X} label="Close" variant="soft" onPress={() => setShowAutoCouponPopup(false)} style={{ position: 'absolute', top: space.md, right: space.md }} />
        <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginTop: space.xl }}>
          <View style={styles.autoGlow} />
          <Svg width={80} height={80} viewBox="0 0 100 100">
            <Path d={SCALLOP} fill={color.goldBright} />
          </Svg>
          <Percent size={36} color={color.onGold} style={{ position: 'absolute' }} />
        </View>
        <Text style={[type.overline, { color: color.goldText, marginTop: space.lg }]}>Exclusively for you</Text>
        <Text style={[type.heading, { color: color.text, marginTop: space.sm, textAlign: 'center' }]}>
          Save{' '}
          <Text style={{ color: color.success }}>
            {RUPEE_SYMBOL}
            {bestCouponDiscount}
          </Text>{' '}
          on this order
        </Text>
        <Text style={[type.body, { color: color.textSecondary, marginTop: space.xs, textAlign: 'center' }]}>
          with coupon <Text style={styles.couponCode}>{String(bestCoupon?.code || '').toUpperCase()}</Text>
        </Text>
        <Button title="Apply coupon" size="lg" onPress={handleApplyAutoCoupon} accessibilityLabel="Apply this coupon" style={{ marginTop: space.xxl }} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.xs, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },

  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg, borderRadius: radii.lg, borderWidth: 1 },
  inlineNote: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radii.md, marginTop: space.md },

  itemImg: { width: 64, height: 64, borderRadius: radii.md, overflow: 'hidden', backgroundColor: color.surfaceMuted },
  itemFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginTop: space.xs },
  qty: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: color.primaryBorder, borderRadius: radii.md, backgroundColor: color.primarySoft, height: 40 },
  qtyBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  qtyText: { minWidth: 24, textAlign: 'center', color: color.primary },
  inlineAction: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44, marginBottom: -space.sm, alignSelf: 'flex-start' },
  rowPress: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingHorizontal: space.lg, paddingVertical: space.md },

  addonImg: { borderRadius: radii.md, overflow: 'hidden', backgroundColor: color.surfaceMuted },
  addonFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs },

  couponCard: { backgroundColor: color.goldSoft, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md },
  couponIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  couponCode: { ...type.caption, fontFamily: type.label.fontFamily, color: color.goldText, backgroundColor: color.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: color.gold, paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  moreOffers: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 48, paddingHorizontal: space.md, backgroundColor: color.surfaceMuted, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, borderRadius: radii.md },
  couponPending: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.md, backgroundColor: color.surfaceMuted, borderRadius: radii.md },
  applied: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, backgroundColor: tone.success.bg, borderRadius: radii.md },
  appliedIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: color.success, alignItems: 'center', justifyContent: 'center' },

  etaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  labelChip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: space.lg, borderRadius: radii.pill, backgroundColor: color.surface, borderWidth: 1, borderColor: color.borderStrong },
  labelChipOff: { backgroundColor: color.surfaceMuted, borderColor: color.border },
  savedAddr: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.border, padding: space.md, backgroundColor: color.surface },
  savedAddrOn: { borderColor: color.primary, backgroundColor: color.primarySoft },

  recipientForm: { marginTop: space.lg, paddingTop: space.lg, borderTopWidth: 1, borderStyle: 'dashed', borderColor: color.border, gap: space.md },

  billBody: { paddingHorizontal: space.lg, paddingBottom: space.lg, paddingTop: space.md, borderTopWidth: 1, borderStyle: 'dashed', borderColor: color.border, gap: space.md },

  payRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, padding: space.sm, backgroundColor: color.surfaceMuted, borderRadius: radii.md },
  payIcon: { width: 40, height: 40, borderRadius: radii.sm, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },

  success: { flex: 1, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl },
  successCircle: { width: 112, height: 112, borderRadius: 56, backgroundColor: color.success, alignItems: 'center', justifyContent: 'center', ...elevation.float },
  placingOverlay: { flex: 1, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl },
  placingSheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: space.xl, paddingTop: space.xxl, ...elevation.sheet },
  placingRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginBottom: space.lg },
  placingIcon: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 8, backgroundColor: color.surfaceMuted, borderRadius: radii.pill, overflow: 'hidden' },

  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden', ...elevation.sheet },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, alignSelf: 'center', marginBottom: space.md },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
  payOpt: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: 64, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.border, backgroundColor: color.surface },
  payOptOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  payOptOff: { backgroundColor: color.surfaceMuted },
  payOptIcon: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  payFoot: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingTop: space.md, paddingHorizontal: space.lg, borderTopWidth: 1, borderTopColor: color.border },

  codeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg, borderBottomWidth: 1, borderBottomColor: color.border, backgroundColor: color.surfaceMuted },
  codeInput: { flex: 1, height: 48, backgroundColor: color.surface, borderRadius: radii.md, paddingHorizontal: space.md, borderWidth: 1, borderColor: color.border, ...type.bodyStrong, lineHeight: undefined, color: color.text },
  sheetEmpty: { ...type.body, paddingVertical: space.xxxl, textAlign: 'center', color: color.textMuted },

  shareDialog: { width: '92%', maxWidth: 448, backgroundColor: color.surface, borderRadius: radii.lg, ...elevation.sheet },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: color.border },

  autoSheet: { paddingHorizontal: space.xl, paddingTop: space.xl, alignItems: 'center' },
  autoGlow: { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: color.goldSoft },
});
