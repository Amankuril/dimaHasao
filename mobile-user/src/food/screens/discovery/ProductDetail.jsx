import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, Clock, MapPin, Minus, Plus, SearchX, ShoppingBag, Star } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import { useCart } from '../../context/CartContext';
import { useOrders } from '../../context/OrdersContext';
import { isModuleAuthenticated } from '../../utils/auth';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { events } from '../../../lib/events';
import { productsData, restaurantsData } from './productData';
import { Button, EmptyState, SectionHeader, StatusBadge } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { color, elevation, radii, space, type } from '../../../theme';

/** The web builds 15 random ratings per product and shows their average. */
const generateRatings = (totalReviews = 20) => {
  const out = [];
  for (let i = 0; i < Math.min(15, totalReviews); i += 1) out.push(Math.round((3.5 + Math.random() * 1.5) * 10) / 10);
  return out;
};

function Badge({ children, solid, style }) {
  return <StatusBadge label={String(children)} tone={solid ? 'primary' : 'neutral'} style={style} />;
}

function Stars({ rating, size = 16 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => {
        const c = i < Math.floor(rating) ? color.gold : i < rating ? color.goldSoft : color.border;
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
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <EmptyState icon={SearchX} title="Product not found" actionLabel="Go back home" onAction={() => router.navigate('/food/user')} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }}>
        <View style={styles.hero}>
          <Image source={{ uri: product.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <Press scale={0.9} onPress={goBack} accessibilityLabel="Back" style={styles.back}>
            <ArrowLeft size={20} color={color.text} />
          </Press>
          <View style={styles.ratingBadge}>
            <Star size={13} color={color.gold} fill={color.gold} strokeWidth={0} />
            <Text style={styles.ratingBadgeText}>{averageRating}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.lg }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.pName} accessibilityRole="header">{product.name}</Text>
              <Text style={styles.pDesc} numberOfLines={3}>{product.description}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.price}>₹{(product.price * 83).toFixed(0)}</Text>
              <Text style={styles.per}>per serving</Text>
            </View>
          </View>
          <View style={styles.pMeta}>
            <Stars rating={averageRating} />
            <Text style={styles.pRating}>{averageRating}</Text>
            <Text style={styles.sep}>|</Text>
            <Text style={styles.reviews}>{ratings.length} {ratings.length === 1 ? 'review' : 'reviews'}</Text>
            <Badge>{product.category}</Badge>
          </View>
        </View>

        <View style={styles.crumbs}>
          <Press scale={1} onPress={() => router.navigate('/food/user')} accessibilityLabel="Home" style={styles.crumbLink}>
            <Text style={[styles.muted, { color: color.primary }]}>Home</Text>
          </Press>
          <Text style={styles.muted}>/</Text>
          <Text style={[styles.fg, { flexShrink: 1 }]} numberOfLines={1}>{restaurant?.name || 'Restaurant'}</Text>
          <Text style={styles.muted}>/</Text>
          <Text style={[styles.fg, { flexShrink: 1 }]} numberOfLines={1}>{product.name}</Text>
        </View>

        <View style={styles.card}>
          <SectionHeader title="Order" />
          {inCart ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <View style={[styles.qty, { borderColor: color.primary }]}>
                <Press scale={0.9} onPress={decrease} accessibilityLabel="Decrease" style={styles.qBtn}><Minus size={20} color={color.primary} /></Press>
                <Text style={styles.qNum}>{cartItem?.quantity || 0}</Text>
                <Press scale={0.9} onPress={increase} accessibilityLabel="Increase" style={styles.qBtn}><Plus size={20} color={color.primary} /></Press>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.muted2}>In cart</Text>
                <Text style={styles.inCart}>₹{(product.price * 83 * (cartItem?.quantity || 0)).toFixed(0)}</Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: space.md }}>
              <View style={[styles.qty, { borderColor: color.border, alignSelf: 'flex-start' }]}>
                <Press scale={0.9} onPress={() => setQuantity((p) => Math.max(1, p - 1))} accessibilityLabel="Decrease" style={styles.qBtn}><Minus size={20} color={color.primary} /></Press>
                <Text style={styles.qNum}>{quantity}</Text>
                <Press scale={0.9} onPress={() => setQuantity((p) => p + 1)} accessibilityLabel="Increase" style={styles.qBtn}><Plus size={20} color={color.primary} /></Press>
              </View>
              <Button title={`Add to cart - ₹${(product.price * 83 * quantity).toFixed(0)}`} accessibilityLabel="Add to Cart" icon={ShoppingBag} onPress={handleAddToCart} />
            </View>
          )}
        </View>

        {restaurant ? (
          <View style={[styles.card, { gap: space.md }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.h3}>{restaurant.name}</Text>
                <Text style={styles.muted2}>{restaurant.cuisine}</Text>
              </View>
              <Badge solid>{restaurant.priceRange}</Badge>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, flexWrap: 'wrap' }}>
              <View style={styles.rm}><Star size={16} color={color.gold} fill={color.gold} strokeWidth={0} /><Text style={styles.rmB}>{restaurant.rating}</Text></View>
              <View style={styles.rm}><Clock size={16} color={color.textSecondary} /><Text style={styles.rmT}>{restaurant.deliveryTime}</Text></View>
              <View style={styles.rm}><MapPin size={16} color={color.textSecondary} /><Text style={styles.rmT}>{restaurant.distance}</Text></View>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <SectionHeader title="Details" />
          <View style={styles.dGrid}>
            <View style={styles.dCell}><Text style={styles.muted2}>Category</Text><Text style={styles.dVal}>{product.category}</Text></View>
            <View style={styles.dCell}><Text style={styles.muted2}>Preparation time</Text><Text style={styles.dVal}>{product.preparationTime}</Text></View>
            <View style={styles.dCell}><Text style={styles.muted2}>Calories</Text><Text style={styles.dVal}>{product.calories} kcal</Text></View>
            <View style={styles.dCell}><Text style={styles.muted2}>Ingredients</Text><Text style={styles.dVal}>{product.ingredients.length} items</Text></View>
          </View>
          <View style={{ marginTop: space.lg }}>
            <Text style={[styles.muted2, { marginBottom: space.sm }]}>Ingredients</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {product.ingredients.map((ing, i) => (
                <Badge key={i}>{ing}</Badge>
              ))}
            </View>
          </View>
        </View>

        {orderHistory.length > 0 ? (
          <View style={styles.card}>
            <SectionHeader title="Your order history" />
            {orderHistory.map((order) => (
              <View key={order.id} style={styles.oRow}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.oId}>Order {order.id}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs }}>
                    <Calendar size={12} color={color.textMuted} />
                    <Text style={styles.muted2}>{new Date(order.createdAt).toLocaleDateString()}</Text>
                    <Text style={styles.muted2}>·</Text>
                    <Text style={styles.muted2}>{order.status}</Text>
                  </View>
                </View>
                <Badge>{order.status}</Badge>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { aspectRatio: 4 / 3, borderRadius: radii.xl, overflow: 'hidden', backgroundColor: color.surfaceMuted },
  back: { position: 'absolute', top: space.md, left: space.md, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...elevation.card },
  ratingBadge: { position: 'absolute', top: space.md, right: space.md, flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 28, paddingHorizontal: space.sm + 2, borderRadius: radii.pill, backgroundColor: 'rgba(17,17,17,0.72)' },
  ratingBadgeText: { ...type.label, color: color.textInverse },
  card: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, padding: space.lg, ...elevation.card },
  pName: { ...type.heading, fontSize: 20, lineHeight: 28, color: color.text, marginBottom: space.xs },
  pDesc: { ...type.small, color: color.textSecondary },
  pMeta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap', marginTop: space.md },
  pRating: { ...type.bodyStrong, color: color.text },
  sep: { ...type.small, color: color.textDisabled },
  reviews: { ...type.small, color: color.textSecondary },
  price: { ...type.price, color: color.primary },
  per: { ...type.caption, color: color.textMuted },
  crumbs: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap', paddingHorizontal: space.xs },
  crumbLink: { minHeight: 32, justifyContent: 'center' },
  muted: { ...type.caption, color: color.textMuted },
  muted2: { ...type.small, color: color.textMuted },
  fg: { ...type.caption, color: color.text },
  h3: { ...type.subheading, color: color.text },
  qty: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radii.md, height: 48 },
  qBtn: { width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' },
  qNum: { minWidth: 40, textAlign: 'center', ...type.subheading, color: color.text },
  inCart: { ...type.price, color: color.primary },
  rm: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  rmB: { ...type.bodyStrong, color: color.goldText },
  rmT: { ...type.body, color: color.text },
  dGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.lg },
  dCell: { width: '50%' },
  dVal: { ...type.bodyStrong, color: color.text, marginTop: space.xxs },
  oRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingVertical: space.md, borderTopWidth: 1, borderTopColor: color.border },
  oId: { ...type.bodyStrong, color: color.text },
});
