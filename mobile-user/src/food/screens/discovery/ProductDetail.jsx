import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, Clock, MapPin, Minus, Plus, ShoppingBag, Star } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import { useCart } from '../../context/CartContext';
import { useOrders } from '../../context/OrdersContext';
import { isModuleAuthenticated } from '../../utils/auth';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { events } from '../../../lib/events';
import { F } from '../../components/shell';
import { productsData, restaurantsData } from './productData';
import { poppins, tw } from '../../../theme';

/** The web builds 15 random ratings per product and shows their average. */
const generateRatings = (totalReviews = 20) => {
  const out = [];
  for (let i = 0; i < Math.min(15, totalReviews); i += 1) out.push(Math.round((3.5 + Math.random() * 1.5) * 10) / 10);
  return out;
};

function Badge({ children, solid, style }) {
  return (
    <View style={[styles.badge, solid ? { backgroundColor: F.green, borderColor: F.green } : null, style]}>
      <Text style={[styles.badgeText, solid ? { color: '#fff' } : null]}>{children}</Text>
    </View>
  );
}

function Stars({ rating, size = 16 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => {
        const c = i < Math.floor(rating) ? tw.yellow400 : i < rating ? tw.yellow200 : tw.gray300;
        return <Star key={i} size={size} color={c} fill={c} />;
      })}
    </View>
  );
}

/** Port of pages/user/ProductDetail.jsx (sample catalogue, no API, as on the web). */
export default function ProductDetail() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const goBack = useAppBackNavigation();
  const product = productsData[parseInt(id, 10)];
  const { addToCart, isInCart, getCartItem, updateQuantity } = useCart();
  const { getAllOrders } = useOrders();
  const [quantity, setQuantity] = useState(1);
  const [ratings] = useState(() => (product ? generateRatings() : []));

  const restaurant = product ? restaurantsData[product.restaurantSlug] : null;
  const inCart = product ? isInCart(product.id) : false;
  const cartItem = product ? getCartItem(product.id) : null;
  const orders = getAllOrders();

  const orderHistory = useMemo(() => {
    if (!product) return [];
    return orders.filter((order) => order.items?.some((item) => item.id === product.id)).slice(0, 5);
  }, [orders, product]);

  const averageRating = useMemo(() => {
    if (ratings.length === 0) return product?.rating || 0;
    return Math.round((ratings.reduce((a, r) => a + r, 0) / ratings.length) * 10) / 10;
  }, [ratings, product]);

  const handleAddToCart = async () => {
    if (!isModuleAuthenticated('user')) {
      events.emit('show-login-required');
      return;
    }
    if (product) {
      for (let i = 0; i < quantity; i += 1) {
        const result = await addToCart(product);
        if (result?.ok === false) {
          Alert.alert('', result.error || 'Cannot add item from different restaurant. Please clear cart first.');
          break;
        }
      }
    }
  };

  const increase = () => (inCart && cartItem ? updateQuantity(product.id, cartItem.quantity + 1) : setQuantity((p) => p + 1));
  const decrease = () => {
    if (inCart && cartItem) {
      if (cartItem.quantity > 1) updateQuantity(product.id, cartItem.quantity - 1);
    } else setQuantity((p) => Math.max(1, p - 1));
  };

  if (!product) {
    return (
      <View style={[styles.center, { paddingTop: 80 }]}>
        <Text style={styles.nf}>Product Not Found</Text>
        <Press scale={0.97} onPress={() => router.navigate('/food/user')} accessibilityLabel="Go Back Home" style={styles.btn}>
          <Text style={styles.btnText}>Go Back Home</Text>
        </Press>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFEF8' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 + insets.bottom }}>
        <View style={[styles.hero, { marginTop: 16 }]}>
          <Image source={{ uri: product.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <Press scale={0.9} onPress={goBack} accessibilityLabel="Back" style={styles.back}>
            <ArrowLeft size={20} color={tw.gray900} />
          </Press>
          <View style={styles.ratingBadge}>
            <Star size={12} color="#fff" fill="#fff" />
            <Text style={styles.ratingBadgeText}>{averageRating}</Text>
          </View>

          <View style={styles.info}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.pName}>{product.name}</Text>
                <Text style={styles.pDesc} numberOfLines={2}>{product.description}</Text>
                <View style={styles.pMeta}>
                  <Stars rating={averageRating} />
                  <Text style={styles.pRating}>{averageRating}</Text>
                  <Text style={{ color: tw.gray400 }}>|</Text>
                  <Text style={styles.reviews}>{ratings.length} {ratings.length === 1 ? 'Review' : 'Reviews'}</Text>
                  <Text style={{ color: tw.gray400 }}>|</Text>
                  <Badge>{product.category}</Badge>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.price}>₹{(product.price * 83).toFixed(0)}</Text>
                <Text style={styles.per}>per serving</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingVertical: 24, gap: 24 }}>
          <View style={styles.crumbs}>
            <Press scale={1} onPress={() => router.navigate('/food/user')} accessibilityLabel="Home">
              <Text style={styles.muted}>Home</Text>
            </Press>
            <Text style={styles.muted}>/</Text>
            <Text style={[styles.fg, { flexShrink: 1 }]} numberOfLines={1}>{restaurant?.name || 'Restaurant'}</Text>
            <Text style={styles.muted}>/</Text>
            <Text style={[styles.fg, { flexShrink: 1 }]} numberOfLines={1}>{product.name}</Text>
          </View>

          <View style={[styles.section, { gap: 16 }]}>
            <Text style={styles.h2}>Order</Text>
            {inCart ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={[styles.qty, { borderColor: F.green }]}>
                  <Press scale={0.9} onPress={decrease} accessibilityLabel="Decrease" style={styles.qBtn}><Minus size={20} color={tw.gray900} /></Press>
                  <Text style={styles.qNum}>{cartItem?.quantity || 0}</Text>
                  <Press scale={0.9} onPress={increase} accessibilityLabel="Increase" style={styles.qBtn}><Plus size={20} color={tw.gray900} /></Press>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.muted2}>In cart</Text>
                  <Text style={styles.inCart}>₹{(product.price * 83 * (cartItem?.quantity || 0)).toFixed(0)}</Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={[styles.qty, { borderColor: tw.gray300 }]}>
                  <Press scale={0.9} onPress={() => setQuantity((p) => Math.max(1, p - 1))} accessibilityLabel="Decrease" style={styles.qBtn}><Minus size={20} color={tw.gray900} /></Press>
                  <Text style={styles.qNum}>{quantity}</Text>
                  <Press scale={0.9} onPress={() => setQuantity((p) => p + 1)} accessibilityLabel="Increase" style={styles.qBtn}><Plus size={20} color={tw.gray900} /></Press>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-start' }}>
                  <Press scale={0.97} onPress={handleAddToCart} accessibilityLabel="Add to Cart" style={[styles.btn, { flexDirection: 'row', gap: 8 }]}>
                    <ShoppingBag size={20} color="#fff" />
                    <Text style={styles.btnText}>Add to Cart - ₹{(product.price * 83 * quantity).toFixed(0)}</Text>
                  </Press>
                </View>
              </View>
            )}
          </View>

          {restaurant ? (
            <View style={[styles.section, { gap: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.h3}>{restaurant.name}</Text>
                  <Text style={styles.muted2}>{restaurant.cuisine}</Text>
                </View>
                <Badge solid>{restaurant.priceRange}</Badge>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <View style={styles.rm}><Star size={16} color={tw.yellow400} fill={tw.yellow400} /><Text style={styles.rmB}>{restaurant.rating}</Text></View>
                <View style={styles.rm}><Clock size={16} color={tw.gray500} /><Text style={styles.rmT}>{restaurant.deliveryTime}</Text></View>
                <View style={styles.rm}><MapPin size={16} color={tw.gray500} /><Text style={styles.rmT}>{restaurant.distance}</Text></View>
              </View>
            </View>
          ) : null}

          <View style={[styles.section, { gap: 16 }]}>
            <Text style={styles.h2}>Details</Text>
            <View style={styles.dGrid}>
              <View style={styles.dCell}><Text style={styles.muted2}>Category</Text><Text style={styles.dVal}>{product.category}</Text></View>
              <View style={styles.dCell}><Text style={styles.muted2}>Preparation Time</Text><Text style={styles.dVal}>{product.preparationTime}</Text></View>
              <View style={styles.dCell}><Text style={styles.muted2}>Calories</Text><Text style={styles.dVal}>{product.calories} kcal</Text></View>
              <View style={styles.dCell}><Text style={styles.muted2}>Ingredients</Text><Text style={styles.dVal}>{product.ingredients.length} items</Text></View>
            </View>
            <View>
              <Text style={[styles.muted2, { marginBottom: 8 }]}>Ingredients</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {product.ingredients.map((ing, i) => (
                  <Badge key={i}>{ing}</Badge>
                ))}
              </View>
            </View>
          </View>

          {orderHistory.length > 0 ? (
            <View style={[styles.section, { gap: 16 }]}>
              <Text style={styles.h2}>Your Order History</Text>
              {orderHistory.map((order) => (
                <View key={order.id} style={styles.oRow}>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.oId}>Order {order.id}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Calendar size={12} color={tw.gray500} />
                      <Text style={styles.muted2}>{new Date(order.createdAt).toLocaleDateString()}</Text>
                      <Text style={styles.muted2}>{'�'}</Text>
                      <Text style={styles.muted2}>{order.status}</Text>
                    </View>
                  </View>
                  <Badge>{order.status}</Badge>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', paddingHorizontal: 16, backgroundColor: '#FFFEF8' },
  nf: { fontSize: 24, lineHeight: 32, color: tw.gray900, marginBottom: 16, ...poppins(700) },
  btn: { backgroundColor: F.green, height: 36, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 14, lineHeight: 20, ...poppins(500) },
  hero: { height: 350, borderRadius: 8, overflow: 'hidden', backgroundColor: tw.gray100 },
  back: { position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', ...{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' } },
  ratingBadge: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: F.green, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  ratingBadgeText: { color: '#fff', fontSize: 12, lineHeight: 16, ...poppins(500) },
  info: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16 },
  pName: { fontSize: 20, lineHeight: 25, color: tw.gray900, marginBottom: 8, ...poppins(700) },
  pDesc: { fontSize: 14, lineHeight: 20, color: tw.gray600, marginBottom: 8, ...poppins(400) },
  pMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  pRating: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  reviews: { fontSize: 14, lineHeight: 20, color: tw.gray600, textDecorationLine: 'underline', ...poppins(400) },
  price: { fontSize: 24, lineHeight: 32, color: F.green, ...poppins(800) },
  per: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 4, ...poppins(400) },
  badge: { borderWidth: 1, borderColor: tw.gray200, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(500) },
  crumbs: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  muted: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  muted2: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  fg: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(500) },
  section: { paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  h2: { fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  h3: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8 },
  qBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  qNum: { minWidth: 32, textAlign: 'center', paddingHorizontal: 16, fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(600) },
  inCart: { fontSize: 18, lineHeight: 28, color: F.green, ...poppins(700) },
  rm: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rmB: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  rmT: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(400) },
  dGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  dCell: { width: '50%' },
  dVal: { fontSize: 14, lineHeight: 20, color: tw.gray900, marginTop: 4, ...poppins(600) },
  oRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  oId: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
});
