import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Banknote, CreditCard, MapPin, MessageSquare, Receipt, ShoppingBag, ShoppingCart } from 'lucide-react-native';
import Image from '../../components/Img';
import { Press } from '../../components/ui';
import { Button, Card, EmptyState, IconButton, StatusBadge } from '../../components/ds';
import { NAV_CLEARANCE, isImmersiveRoute } from '../../components/dh/AppBottomNav';
import { useCart } from '../context/CartContext';
import { useProfile } from '../context/ProfileContext';
import { useOrders } from '../context/OrdersContext';
import { adminAPI, userAPI } from '../../api/food';
import { navigateTo } from '../../lib/webRouter';
import { alert } from '../../lib/webShim';
import { color, radii, space, type } from '../../theme';
import { BillRow, CtaBar, Divider, Field, Radio } from '../components/cart/parts';

const getAddressId = (address) => address?.id || address?._id || '';

/** Port of pages/user/cart/Checkout.jsx (the web page prices with its own fixed x83 / 8% tax; kept as is). */
export default function Checkout() {
  const insets = useSafeAreaInsets();
  const { cart, clearCart } = useCart();
  const { getDefaultAddress, getDefaultPaymentMethod, setDefaultAddress, addresses, paymentMethods, orderType, userProfile } = useProfile();
  const { createOrder } = useOrders();
  const [selectedAddressId, setSelectedAddressId] = useState(getAddressId(getDefaultAddress()));
  const [selectedPayment, setSelectedPayment] = useState(getDefaultPaymentMethod()?.id || '');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isTakeawayCodEnabled, setIsTakeawayCodEnabled] = useState(true);
  const [isCodBlockingFeatureEnabled, setIsCodBlockingFeatureEnabled] = useState(true);
  const [restaurantNote, setRestaurantNote] = useState('');

  useEffect(() => {
    userAPI
      .getCustomizationSettings()
      .then((res) => {
        if (res?.data?.data) setIsCodBlockingFeatureEnabled(res.data.data.cod_blocking_feature_enabled !== false);
      })
      .catch(() => {});
    if (orderType === 'takeaway') {
      adminAPI
        .getTakeawayCodStatus()
        .then((res) => setIsTakeawayCodEnabled(res?.data?.enabled !== false))
        .catch(() => setIsTakeawayCodEnabled(true));
    }
  }, [orderType]);

  useEffect(() => {
    const takeawayCodOff = orderType === 'takeaway' && !isTakeawayCodEnabled;
    const blocked = userProfile?.isCodBlocked && isCodBlockingFeatureEnabled;
    if ((takeawayCodOff || blocked) && selectedPayment === 'cod') setSelectedPayment('razorpay');
  }, [orderType, isTakeawayCodEnabled, selectedPayment, userProfile, isCodBlockingFeatureEnabled]);

  const selectedAddress = addresses.find((a) => getAddressId(a) === selectedAddressId) || getDefaultAddress();
  const defaultPayment = paymentMethods.find((pm) => pm.id === selectedPayment) || getDefaultPaymentMethod();

  useEffect(() => {
    const defaultId = getAddressId(getDefaultAddress());
    const stillExists = addresses.some((a) => getAddressId(a) === selectedAddressId);
    if (!selectedAddressId || !stillExists) setSelectedAddressId(defaultId || '');
  }, [addresses, selectedAddressId, getDefaultAddress]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity * 83, 0);
  const deliveryFee = orderType === 'takeaway' ? 0 : 2.99 * 83;
  const tax = subtotal * 0.08;
  const total = subtotal + deliveryFee + tax;
  const codBlocked = !!(userProfile?.isCodBlocked && isCodBlockingFeatureEnabled);

  const handlePlaceOrder = () => {
    if (orderType !== 'takeaway' && !selectedAddress) return alert('Please select a delivery address');
    if (!selectedPayment) return alert('Please select a payment method');
    if (cart.length === 0) return alert('Your cart is empty');
    setIsPlacingOrder(true);
    setTimeout(() => {
      createOrder({
        items: cart.map((item) => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity, image: item.image })),
        address: orderType === 'takeaway' ? null : selectedAddress,
        paymentMethod: selectedPayment === 'cod' ? { id: 'cod', name: 'Cash on Delivery' } : defaultPayment,
        orderType,
        subtotal,
        deliveryFee,
        tax,
        total,
        restaurant: cart[0]?.restaurant || cart[0]?.name || 'Multiple Restaurants',
        restaurantId: cart[0]?.restaurantId,
        note: restaurantNote,
      });
      // Web: the navigate() that follows reads an undefined `pricing` and throws, so the page
      // just re-renders with the emptied cart. Reproduced: no navigation.
      clearCart();
    }, 1500);
  };

  const pathname = usePathname();
  const navClearance = isImmersiveRoute(pathname) ? insets.bottom : NAV_CLEARANCE + insets.bottom;

  const header = (
    <View style={styles.header}>
      <IconButton icon={ArrowLeft} label="Back to cart" onPress={() => navigateTo('/user/cart')} />
      <Text style={[type.heading, { color: color.text, flex: 1 }]} accessibilityRole="header">
        Checkout
      </Text>
    </View>
  );

  if (cart.length === 0) {
    return (
      <View style={styles.screen}>
        {header}
        <EmptyState icon={ShoppingCart} title="Your cart is empty" actionLabel="Go to cart" onAction={() => navigateTo('/user/cart')} />
      </View>
    );
  }

  const addrString = (a) => [a.street, a.additionalDetails, `${a.city}, ${a.state} ${a.zipCode}`].filter(Boolean).join(', ');
  const disabled = isPlacingOrder || (orderType !== 'takeaway' && !selectedAddress) || !selectedPayment;

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Card>
          <CardTitle icon={orderType === 'takeaway' ? ShoppingBag : MapPin} title={orderType === 'takeaway' ? 'Pickup information' : 'Delivery address'} />
          {orderType === 'takeaway' ? (
            <View style={[styles.opt, styles.optOn]}>
              <Text style={[type.bodyStrong, { color: color.text }]}>Self-pickup</Text>
              <Text style={[type.small, { color: color.textSecondary, marginTop: 2 }]}>You&apos;ve selected self-pickup. Please collect your order from the restaurant.</Text>
              <Divider style={{ marginVertical: space.md }} />
              <Text style={[type.overline, { color: color.textMuted }]}>Restaurant</Text>
              <Text style={[type.bodyStrong, { color: color.text, marginTop: space.xs }]} numberOfLines={2}>
                {cart[0]?.restaurant || 'Selected Restaurant'}
              </Text>
              <Text style={[type.caption, { color: color.textMuted, marginTop: space.xs }]}>Collect your order once it&apos;s marked as ready.</Text>
            </View>
          ) : addresses.length > 0 ? (
            <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
              {addresses.map((address) => {
                const id = getAddressId(address);
                const on = selectedAddressId === id;
                return (
                  <Press
                    key={id || `${address.label}-${address.street}-${address.city}`}
                    scale={0.99}
                    onPress={() => {
                      setSelectedAddressId(id);
                      if (id) setDefaultAddress(id);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={addrString(address)}
                    style={[styles.opt, styles.optRow, on ? styles.optOn : null]}
                  >
                    <Radio checked={on} />
                    <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                      {address.isDefault ? <StatusBadge label="Default" tone="primary" /> : null}
                      <Text style={[type.small, { color: color.text }]} numberOfLines={3}>
                        {addrString(address)}
                      </Text>
                    </View>
                  </Press>
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon={MapPin}
              title="No addresses saved"
              actionLabel="Add address"
              onAction={() => navigateTo('/user/cart/select-address', { state: { from: '/user/cart/checkout' } })}
              style={{ paddingVertical: space.xxl }}
            />
          )}
        </Card>

        <Card>
          <CardTitle icon={CreditCard} title="Payment method" />
          <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
            {orderType !== 'takeaway' || isTakeawayCodEnabled ? (
              <Press
                scale={0.99}
                disabled={codBlocked}
                onPress={() => setSelectedPayment('cod')}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedPayment === 'cod', disabled: codBlocked }}
                accessibilityLabel="Cash on Delivery"
                style={[styles.opt, styles.optRow, codBlocked ? styles.optOff : selectedPayment === 'cod' ? styles.optOn : null]}
              >
                <Radio checked={selectedPayment === 'cod'} disabled={codBlocked} />
                <Banknote size={20} color={codBlocked ? color.textDisabled : color.primary} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.bodyStrong, { color: codBlocked ? color.textMuted : color.text }]}>Cash on Delivery</Text>
                  {codBlocked ? (
                    <Text style={[type.caption, { color: color.danger, marginTop: 2 }]}>Not available due to multiple cancellations</Text>
                  ) : (
                    <Text style={[type.small, { color: color.textMuted }]}>Pay when you {orderType === 'takeaway' ? 'pickup' : 'receive'} your order</Text>
                  )}
                </View>
              </Press>
            ) : null}

            {paymentMethods.map((payment) => {
              const on = selectedPayment === payment.id;
              return (
                <Press
                  key={payment.id}
                  scale={0.99}
                  onPress={() => setSelectedPayment(payment.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${payment.type} ending ${payment.cardNumber}`}
                  style={[styles.opt, styles.optRow, on ? styles.optOn : null]}
                >
                  <Radio checked={on} />
                  <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                      {payment.isDefault ? <StatusBadge label="Default" tone="primary" /> : null}
                      <StatusBadge label={String(payment.type || '').replace(/^./, (ch) => ch.toUpperCase())} tone="neutral" />
                    </View>
                    <Text style={[type.bodyStrong, { color: color.text }]}>{`**** **** **** ${payment.cardNumber}`}</Text>
                    <Text style={[type.small, { color: color.textMuted }]}>
                      {payment.cardHolder}  Expires {payment.expiryMonth}/{String(payment.expiryYear || '').slice(-2)}
                    </Text>
                  </View>
                </Press>
              );
            })}

            <Button title="Manage payment methods" variant="outline" onPress={() => navigateTo('/user/profile/payments')} />
          </View>
        </Card>

        <Card>
          <CardTitle icon={MessageSquare} title="Add note for restaurant" />
          <Field
            placeholder="E.g. Please make it extra spicy, or no onions..."
            value={restaurantNote}
            onChangeText={setRestaurantNote}
            multiline
            accessibilityLabel="Note for restaurant"
            hint="Your request will be shared with the restaurant."
          />
        </Card>

        <Card>
          <CardTitle icon={Receipt} title="Order summary" />
          <View style={{ gap: space.md }}>
            {cart.map((item) => (
              <View key={item.id} style={styles.sumRow}>
                <Image source={{ uri: item.image }} style={styles.sumImg} resizeMode="cover" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {item.variantName ? <Text style={[type.caption, { color: color.textMuted }]}>{item.variantName}</Text> : null}
                  <Text style={[type.caption, { color: color.textMuted }]}>
                    ₹{(item.price * 83).toFixed(0)} × {item.quantity}
                  </Text>
                </View>
                <Text style={[type.bodyStrong, { color: color.text }]}>₹{(item.price * 83 * item.quantity).toFixed(0)}</Text>
              </View>
            ))}
          </View>
          <Divider style={{ marginVertical: space.lg }} />
          <View style={{ gap: space.md }}>
            <BillRow label="Subtotal" value={`₹${subtotal.toFixed(0)}`} />
            {orderType !== 'takeaway' ? <BillRow label="Delivery fee" value={`₹${deliveryFee.toFixed(0)}`} /> : null}
            <BillRow label="Tax" value={`₹${tax.toFixed(0)}`} />
            <Divider />
            <BillRow strong label="Total" value={`₹${total.toFixed(0)}`} />
          </View>
        </Card>
      </ScrollView>

      <CtaBar extraBottom={navClearance}>
        <View style={styles.ctaRow}>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text style={[type.caption, { color: color.textMuted }]}>Total</Text>
            <Text style={[type.price, { color: color.text }]} numberOfLines={1}>
              ₹{total.toFixed(0)}
            </Text>
          </View>
          <Button
            title={isPlacingOrder ? 'Placing order...' : 'Place order'}
            size="lg"
            disabled={disabled}
            loading={isPlacingOrder}
            onPress={handlePlaceOrder}
            accessibilityLabel="Place Order"
            style={{ flex: 1 }}
          />
        </View>
      </CtaBar>
    </View>
  );
}

function CardTitle({ icon: Icon, title }) {
  return (
    <View style={styles.cardTitle}>
      <Icon size={20} color={color.primary} />
      <Text style={[type.subheading, { color: color.text, flex: 1 }]} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.xs, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  opt: { borderWidth: 1.5, borderColor: color.border, borderRadius: radii.md, padding: space.md, backgroundColor: color.surface },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 },
  optOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  optOff: { backgroundColor: color.surfaceMuted, opacity: 0.7 },
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sumImg: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: color.surfaceMuted },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
});
