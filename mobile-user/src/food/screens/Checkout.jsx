import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, CreditCard, MapPin, MessageSquare, ShoppingBag } from 'lucide-react-native';
import Image from '../../components/Img';
import { Press } from '../../components/ui';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { useCart } from '../context/CartContext';
import { useProfile } from '../context/ProfileContext';
import { useOrders } from '../context/OrdersContext';
import { adminAPI, userAPI } from '../../api/food';
import { navigateTo } from '../../lib/webRouter';
import { alert } from '../../lib/webShim';
import { poppins, tw } from '../../theme';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Textarea, UI } from '../components/cart/ui';
import { F } from '../components/shell';

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

  const pad = { paddingBottom: 24 + NAV_CLEARANCE + insets.bottom };
  const bg = ['rgba(255,247,237,0.3)', '#ffffff', 'rgba(255,247,237,0.2)'];

  if (cart.length === 0) {
    return (
      <LinearGradient colors={bg} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[{ padding: 16 }, pad]}>
          <Card>
            <CardHeader>
              <CardTitle>Checkout</CardTitle>
            </CardHeader>
            <CardContent>
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <Text style={[styles.muted, { fontSize: 18, lineHeight: 28, marginBottom: 16 }]}>Your cart is empty</Text>
                <Button onPress={() => navigateTo('/user/cart')}>Go to Cart</Button>
              </View>
            </CardContent>
          </Card>
        </ScrollView>
      </LinearGradient>
    );
  }

  const addrString = (a) => [a.street, a.additionalDetails, `${a.city}, ${a.state} ${a.zipCode}`].filter(Boolean).join(', ');
  const disabled = isPlacingOrder || (orderType !== 'takeaway' && !selectedAddress) || !selectedPayment;

  return (
    <LinearGradient colors={bg} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[{ padding: 16, gap: 24 }, pad]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Button variant="ghost" icon onPress={() => navigateTo('/user/cart')} accessibilityLabel="Back to cart" style={{ width: 32, height: 32, borderRadius: 16 }}>
            <ArrowLeft size={20} color={UI.foreground} />
          </Button>
          <Text style={styles.h1}>Checkout</Text>
        </View>

        <Card>
          <CardHeader>
            <CardTitle row>
              {orderType === 'takeaway' ? <ShoppingBag size={20} color={F.green} /> : <MapPin size={20} color={F.green} />}
              <Text style={styles.cardTitleText}>{orderType === 'takeaway' ? 'Pickup Information' : 'Delivery Address'}</Text>
            </CardTitle>
          </CardHeader>
          <CardContent style={{ gap: 16 }}>
            {orderType === 'takeaway' ? (
              <View style={[styles.opt, styles.optOn]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <ShoppingBag size={16} color={F.green} />
                  <Text style={[styles.optTitle, { color: tw.orange900 }]}>Self-Pickup</Text>
                </View>
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.orange800, ...poppins(400) }}>You&apos;ve selected self-pickup. Please collect your order from the restaurant.</Text>
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: tw.orange100 }}>
                  <Text style={{ fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.orange900, ...poppins(500) }}>RESTAURANT ADDRESS</Text>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, marginTop: 4, ...poppins(500) }}>{cart[0]?.restaurant || 'Selected Restaurant'}</Text>
                  <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 4, ...poppins(400) }}>Collect your order once it&apos;s marked as ready.</Text>
                </View>
              </View>
            ) : addresses.length > 0 ? (
              <View style={{ gap: 12 }}>
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
                      style={[styles.opt, on ? styles.optOn : null]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          {address.isDefault ? (
                            <Badge style={{ marginBottom: 8, backgroundColor: F.green }} textStyle={{ color: '#fff' }}>
                              Default
                            </Badge>
                          ) : null}
                          <Text style={styles.optText}>{addrString(address)}</Text>
                        </View>
                        {on ? <CheckCircle size={20} color={F.green} /> : null}
                      </View>
                    </Press>
                  );
                })}
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={[styles.muted, { marginBottom: 16, fontSize: 14 }]}>No addresses saved</Text>
                <Button onPress={() => navigateTo('/user/cart/select-address', { state: { from: '/user/cart/checkout' } })}>Add Address</Button>
              </View>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle row>
              <CreditCard size={20} color={F.green} />
              <Text style={styles.cardTitleText}>Payment Method</Text>
            </CardTitle>
          </CardHeader>
          <CardContent style={{ gap: 12 }}>
            {orderType !== 'takeaway' || isTakeawayCodEnabled ? (
              <Press scale={0.99} disabled={codBlocked} onPress={() => setSelectedPayment('cod')} style={[styles.opt, codBlocked ? { backgroundColor: tw.gray50, opacity: 0.6 } : selectedPayment === 'cod' ? styles.optOn : null]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <CreditCard size={20} color={codBlocked ? tw.gray400 : tw.gray500} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optTitle}>Cash on Delivery</Text>
                      {codBlocked ? (
                        <Text style={{ fontSize: 12, lineHeight: 16, color: F.green, marginTop: 4, ...poppins(500) }}>Not available due to multiple cancellations</Text>
                      ) : (
                        <Text style={[styles.muted, { fontSize: 12, lineHeight: 16 }]}>Pay when you {orderType === 'takeaway' ? 'pickup' : 'receive'} your order</Text>
                      )}
                    </View>
                  </View>
                  {selectedPayment === 'cod' ? <CheckCircle size={20} color={F.green} /> : null}
                </View>
              </Press>
            ) : null}

            {paymentMethods.map((payment) => {
              const on = selectedPayment === payment.id;
              return (
                <Press key={payment.id} scale={0.99} onPress={() => setSelectedPayment(payment.id)} style={[styles.opt, on ? styles.optOn : null]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        {payment.isDefault ? (
                          <Badge style={{ backgroundColor: F.green }} textStyle={{ color: '#fff' }}>
                            Default
                          </Badge>
                        ) : null}
                        <Badge outline textStyle={{ textTransform: 'capitalize' }}>
                          {payment.type}
                        </Badge>
                      </View>
                      <Text style={styles.optTitle}>{`**** **** **** ${payment.cardNumber}`}</Text>
                      <Text style={[styles.muted, { fontSize: 14, lineHeight: 20 }]}>
                        {payment.cardHolder}  Expires {payment.expiryMonth}/{String(payment.expiryYear || '').slice(-2)}
                      </Text>
                    </View>
                    {on ? <CheckCircle size={20} color={F.green} /> : null}
                  </View>
                </Press>
              );
            })}

            <Button variant="outline" onPress={() => navigateTo('/user/profile/payments')} style={{ width: '100%' }}>
              Manage Payment Methods
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle row>
              <MessageSquare size={20} color={F.green} />
              <Text style={styles.cardTitleText}>Add note for restaurant</Text>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea placeholder="E.g. Please make it extra spicy, or no onions..." value={restaurantNote} onChangeText={setRestaurantNote} style={{ minHeight: 100 }} />
            <Text style={[styles.muted, { fontSize: 12, lineHeight: 16, marginTop: 8 }]}>Your request will be shared with the restaurant.</Text>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent style={{ gap: 16 }}>
            <View style={{ gap: 12 }}>
              {cart.map((item) => (
                <View key={item.id} style={styles.sumRow}>
                  <Image source={{ uri: item.image }} style={{ width: 64, height: 64, borderRadius: 8 }} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, lineHeight: 20, color: UI.foreground, ...poppins(500) }}>{item.name}</Text>
                    {item.variantName ? <Text style={[styles.muted, { fontSize: 12, lineHeight: 16 }]}>{item.variantName}</Text> : null}
                    <Text style={[styles.muted, { fontSize: 12, lineHeight: 16 }]}>
                      ₹{(item.price * 83).toFixed(0)} × {item.quantity}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: UI.foreground, ...poppins(600) }}>₹{(item.price * 83 * item.quantity).toFixed(0)}</Text>
                </View>
              ))}
            </View>
            <View style={{ gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: UI.border }}>
              <Row label="Subtotal" value={`₹${subtotal.toFixed(0)}`} />
              {orderType !== 'takeaway' ? <Row label="Delivery Fee" value={`₹${deliveryFee.toFixed(0)}`} /> : null}
              <Row label="Tax" value={`₹${tax.toFixed(0)}`} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: UI.border }}>
                <Text style={{ fontSize: 18, lineHeight: 28, color: UI.foreground, ...poppins(700) }}>Total</Text>
                <Text style={{ fontSize: 18, lineHeight: 28, color: F.green, ...poppins(700) }}>₹{total.toFixed(0)}</Text>
              </View>
            </View>
            <Press scale={0.98} disabled={disabled} onPress={handlePlaceOrder} accessibilityLabel="Place Order" style={[styles.place, disabled ? { opacity: 0.5 } : null]}>
              <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) }}>{isPlacingOrder ? 'Placing Order...' : 'Place Order'}</Text>
            </Press>
          </CardContent>
        </Card>
      </ScrollView>
    </LinearGradient>
  );
}

function Row({ label, value }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={[styles.muted, { fontSize: 14, lineHeight: 20 }]}>{label}</Text>
      <Text style={{ fontSize: 14, lineHeight: 20, color: UI.foreground, ...poppins(400) }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 18, lineHeight: 28, color: UI.foreground, ...poppins(700) },
  cardTitleText: { fontSize: 16, lineHeight: 16, color: UI.foreground, ...poppins(600) },
  muted: { color: UI.mutedForeground, ...poppins(400) },
  opt: { borderWidth: 2, borderColor: tw.gray200, borderRadius: 8, padding: 16 },
  optOn: { borderColor: F.green, backgroundColor: tw.orange50 },
  optTitle: { fontSize: 16, lineHeight: 24, color: UI.foreground, ...poppins(600) },
  optText: { fontSize: 14, lineHeight: 20, color: UI.foreground, ...poppins(500) },
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: UI.border },
  place: { marginTop: 16, height: 44, borderRadius: 6, backgroundColor: F.green, alignItems: 'center', justifyContent: 'center' },
});
