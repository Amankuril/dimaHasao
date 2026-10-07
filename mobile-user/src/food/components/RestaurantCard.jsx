import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { AlertCircle, Bookmark, Clock, Flame, Star, Zap } from 'lucide-react-native';
import Image from '../../components/Img';
import { Press } from '../../components/ui';
import { useProfile } from '../context/ProfileContext';
import { isVegMenuItem } from '../utils/vegMode';
import { getRestaurantRouteId } from '../utils/mainTabRoutes';
import { navigateTo } from '../../lib/webRouter';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { poppins, shadow, tw } from '../../theme';

const DISH_FALLBACK = require('../../../assets/food/dish_fallback.webp');

/** Opens a restaurant, handing the list row over so the page paints at once. */
export function openRestaurant(restaurant, { from, dishId } = {}) {
  const nameStr = typeof restaurant?.name === 'string' ? restaurant.name.trim() : '';
  const rawSlug = (typeof restaurant?.slug === 'string' && restaurant.slug.trim()) || nameStr || String(restaurant?.id || restaurant?._id || '');
  const slug = rawSlug.toLowerCase().replace(/[\s/]+/g, '-');
  const id = getRestaurantRouteId(restaurant) || slug;
  if (!id) return;
  // Keyed by path, where the details page reads it as `location.state`.
  navigateTo(`/food/user/restaurants/${id}${dishId ? `?dish=${encodeURIComponent(dishId)}` : ''}`, { state: { from, restaurantData: restaurant } });
}

export const restaurantSlugOf = (restaurant, index = 0) => {
  const nameStr = typeof restaurant?.name === 'string' ? restaurant.name.trim() : '';
  const fallback =
    nameStr ||
    (typeof restaurant?.restaurantName === 'string' ? restaurant.restaurantName.trim() : '') ||
    String(restaurant?.slug || restaurant?.id || restaurant?._id || `restaurant-${index}`);
  const rawSlug = typeof restaurant?.slug === 'string' && restaurant.slug.trim() ? restaurant.slug.trim() : fallback;
  return rawSlug.toLowerCase().replace(/[\s/]+/g, '-');
};

export const formatRatingCount = (value) => {
  const count = Number(value) || 0;
  if (count === 1) return '1 rating';
  if (count < 100) return `${count} ratings`;
  if (count < 1000) return `${Math.floor(count / 100) * 100}+ ratings`;
  return `${(count / 1000).toFixed(1)}K+ ratings`;
};

const SCALLOP =
  'M 86.29 42.78 Q 95.00 50.00 86.29 57.22 Q 91.57 67.22 80.76 70.56 Q 81.82 81.82 70.56 80.76 Q 67.22 91.57 57.22 86.29 Q 50.00 95.00 42.78 86.29 Q 32.78 91.57 29.44 80.76 Q 18.18 81.82 19.24 70.56 Q 8.43 67.22 13.71 57.22 Q 5.00 50.00 13.71 42.78 Q 8.43 32.78 19.24 29.44 Q 18.18 18.18 29.44 19.24 Q 32.78 8.43 42.78 13.71 Q 50.00 5.00 57.22 13.71 Q 67.22 8.43 70.56 19.24 Q 81.82 18.18 80.76 29.44 Q 91.57 32.78 86.29 42.78 Z';

export function ScallopBadge({ size = 20, color = '#2563EB' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d={SCALLOP} fill={color} />
      <SvgText x="50" y="63" textAnchor="middle" fontSize="42" fontWeight="900" fill="#fff">
        %
      </SvgText>
    </Svg>
  );
}

export const formatCouponText = (coupon) => {
  if (!coupon) return '';
  const minOrderValue = Number(coupon.minOrderValue);
  const minOrderText = Number.isFinite(minOrderValue) && minOrderValue > 0 ? ` above ₹${minOrderValue}` : '';
  if (coupon.discountType === 'percentage') {
    const discountPercentage = coupon.discountPercentage ?? coupon.discountValue;
    const limitText = coupon.maxDiscount ? ` up to ₹${coupon.maxDiscount}` : '';
    return `${discountPercentage}% OFF${minOrderText}${limitText}`;
  }
  const value = coupon.originalPrice || coupon.discountValue || 0;
  return `Flat ₹${value} OFF${minOrderText}`;
};

/** Coupons that apply to one restaurant in the given order mode. */
export function couponsForRestaurant(publicOffers, restaurant, isTakeaway) {
  if (restaurant?.hasDishes === false) return [];
  return (publicOffers || []).filter((o) => {
    if (String(o?.restaurantScope) === 'selected') {
      const couponRestId = String(o.restaurantId || '').trim();
      const rId = String(restaurant.restaurantId || '').trim();
      const id = String(restaurant.id || '').trim();
      const mongoId = String(restaurant.mongoId || '').trim();
      if (!(couponRestId === rId || couponRestId === id || couponRestId === mongoId)) return false;
    }
    const cType = String(o.couponType || 'all').trim().toLowerCase();
    return isTakeaway ? cType === 'takeaway' || cType === 'all' : cType === 'delivery' || cType === 'all';
  });
}

export const RestaurantCardOfferCarousel = memo(function RestaurantCardOfferCarousel({ coupons }) {
  const uniqueCoupons = useMemo(() => {
    if (!coupons || coupons.length === 0) return [];
    const map = new Map();
    coupons.forEach((c) => {
      const text = formatCouponText(c);
      if (text && !map.has(text)) map.set(text, c);
    });
    return Array.from(map.values());
  }, [coupons]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const y = useAnimatedValue(0);
  const fade = useAnimatedValue(1);
  const couponsKey = uniqueCoupons.map((c) => c.couponCode || c.code || '').join(',');

  useEffect(() => {
    if (uniqueCoupons.length <= 1) return undefined;
    const interval = setInterval(() => setCurrentIndex((prev) => (prev + 1) % uniqueCoupons.length), 3000);
    return () => clearInterval(interval);
  }, [couponsKey, uniqueCoupons.length]);

  useEffect(() => {
    if (uniqueCoupons.length <= 1) return;
    y.setValue(-14);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [currentIndex, uniqueCoupons.length, y, fade]);

  if (uniqueCoupons.length === 0) return null;
  const current = uniqueCoupons[currentIndex] || uniqueCoupons[0];
  return (
    <View style={styles.offer}>
      <ScallopBadge size={20} />
      <View style={{ flex: 1, height: 20, overflow: 'hidden', justifyContent: 'center' }}>
        <Animated.Text numberOfLines={1} style={[styles.offerText, { opacity: fade, transform: [{ translateY: y }] }]}>
          {formatCouponText(current)}
        </Animated.Text>
      </View>
    </View>
  );
});

/**
 * Port of components/user/RestaurantImageCarousel.jsx. Slides are the
 * restaurant's recommended dishes (tapping one opens the restaurant on that
 * dish); with none, the cover image.
 */
export const RestaurantImageCarousel = memo(function RestaurantImageCarousel({
  restaurant,
  height = 224,
  radius = 6,
  backFrom = '',
  categoryFallbackImage = null,
  active = true,
}) {
  const { vegMode } = useProfile();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const scroller = useRef(null);
  const touching = useRef(false);

  const slideItems = useMemo(() => {
    const items = [];
    if (Array.isArray(restaurant.recommendedDishes) && restaurant.recommendedDishes.length > 0) {
      restaurant.recommendedDishes.forEach((dish, idx) => {
        if (vegMode && !isVegMenuItem(dish)) return;
        const dishImg = dish.image || categoryFallbackImage;
        if (dishImg) items.push({ id: dish.id || idx, src: dishImg, dish });
      });
    }
    if (items.length === 0) {
      const sourceImages = Array.isArray(restaurant.images) && restaurant.images.length > 0 ? restaurant.images : [restaurant.image];
      const valid = sourceImages.filter((img) => typeof img === 'string').map((img) => img.trim()).filter(Boolean);
      if (valid.length > 0) items.push({ id: 'fallback', src: valid[0], dish: null });
      else if (categoryFallbackImage) items.push({ id: 'fallback', src: categoryFallbackImage, dish: null });
      else items.push({ id: 'fallback', src: DISH_FALLBACK, dish: null });
    }
    return items;
  }, [restaurant.recommendedDishes, restaurant.images, restaurant.image, vegMode, categoryFallbackImage]);

  const count = slideItems.length;
  useEffect(() => {
    setIndex(0);
    setFailed(false);
    scroller.current?.scrollTo({ x: 0, animated: false });
  }, [restaurant?.id, restaurant?.slug, count]);

  useEffect(() => {
    if (count <= 1 || !active || !width) return undefined;
    const timer = setInterval(() => {
      if (touching.current) return;
      setIndex((prev) => {
        const next = (prev + 1) % count;
        scroller.current?.scrollTo({ x: next * width, animated: next !== 0 });
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [count, active, width]);

  const current = slideItems[index] || slideItems[0];
  const isDishVeg = current?.dish ? isVegMenuItem(current.dish) || current.dish.foodType === 'Veg' : false;
  const onSlidePress = useCallback(
    (dish) => openRestaurant(restaurant, { from: backFrom, dishId: dish?.id }),
    [restaurant, backFrom],
  );

  return (
    <View style={{ height, borderTopLeftRadius: radius, borderTopRightRadius: radius, overflow: 'hidden', backgroundColor: tw.gray100 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        scrollEnabled={count > 1}
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        onScrollBeginDrag={() => {
          touching.current = true;
        }}
        onMomentumScrollEnd={(e) => {
          touching.current = false;
          if (width) setIndex(Math.max(0, Math.min(count - 1, Math.round(e.nativeEvent.contentOffset.x / width))));
        }}
      >
        {slideItems.map((item, idx) => (
          <Press key={`${item.id}-${idx}`} scale={1} onPress={() => onSlidePress(item.dish)} accessibilityLabel={item.dish ? `${item.dish.name} at ${restaurant.name}` : restaurant.name} style={{ width: width || 1, height }}>
            <Image
              source={typeof item.src === 'string' ? { uri: item.src } : item.src}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              resizeMode="cover"
              onError={() => {
                if (count === 1) setFailed(true);
              }}
            />
          </Press>
        ))}
      </ScrollView>

      {current?.dish ? (
        <>
          <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.45)', 'transparent']} style={styles.scrim} />
          <View pointerEvents="none" style={styles.dishBadge}>
            {!vegMode ? (
              <View style={[styles.dietBox, { borderColor: isDishVeg ? tw.green600 : tw.red600 }]}>
                <View style={[styles.dietDot, { backgroundColor: isDishVeg ? tw.green600 : tw.red600 }]} />
              </View>
            ) : null}
            <Text style={[styles.dishText, { flexShrink: 1 }]} numberOfLines={1}>{current.dish.name}</Text>
            <Text style={[styles.dishText, { color: 'rgba(255,255,255,0.7)' }]}>•</Text>
            <Text style={[styles.dishText, poppins(900)]}>₹{current.dish.price}</Text>
          </View>
        </>
      ) : null}

      {failed ? (
        <View style={styles.unavailable}>
          <Text style={{ fontSize: 12, color: tw.gray500, ...poppins(400) }}>Image unavailable</Text>
        </View>
      ) : null}

      {count > 1 ? (
        <View pointerEvents="none" style={styles.dots}>
          {slideItems.map((_, i) => (
            <View key={i} style={[styles.dot, i === index ? styles.dotActive : null]} />
          ))}
        </View>
      ) : null}
    </View>
  );
});

/** The large restaurant card of the Home / Takeaway list. */
export const RestaurantCard = memo(function RestaurantCard({
  restaurant,
  index = 0,
  availability,
  favorite,
  onToggleFavorite,
  coupons,
  dimmed,
  backFrom,
  categoryFallbackImage,
}) {
  const closed = !availability?.isOpen;
  const offline = availability?.reason === 'inactive' || availability?.reason === 'not-accepting-orders';
  const enter = useAnimatedValue(index < 10 ? 0 : 1);
  useEffect(() => {
    if (index >= 10) return;
    Animated.timing(enter, { toValue: 1, duration: 500, delay: index * 50, useNativeDriver: true }).start();
  }, [enter, index]);

  return (
    <Animated.View style={{ opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) }] }}>
      <Press scale={0.99} onPress={() => openRestaurant(restaurant, { from: backFrom })} accessibilityLabel={`${restaurant.name}. ${Number(restaurant.rating) > 0 ? `Rated ${Number(restaurant.rating).toFixed(1)}` : 'New'}`} style={[styles.card, dimmed || closed ? { opacity: 0.75 } : null]}>
        <View>
          <RestaurantImageCarousel restaurant={restaurant} backFrom={backFrom} radius={28} categoryFallbackImage={categoryFallbackImage} />
          {dimmed || closed ? <View pointerEvents="none" style={styles.greyWash} /> : null}
          <Press
            scale={0.9}
            onPress={onToggleFavorite}
            accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
            style={[styles.bookmark, favorite ? { backgroundColor: tw.red500 } : null]}
          >
            <Bookmark size={20} color={favorite ? '#fff' : tw.gray800} fill={favorite ? '#fff' : 'none'} />
          </Press>
        </View>

        <View style={styles.body}>
          <View style={styles.headRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={2}>{restaurant.name}</Text>
              <View style={styles.meta}>
                <Zap size={16} color="#257d3c" fill="#257d3c" strokeWidth={2.5} />
                <Text style={styles.metaText}>{restaurant.deliveryTime}</Text>
                <Text style={[styles.metaText, { marginHorizontal: 4, ...poppins(700) }]}>|</Text>
                <Text style={styles.metaText}>{restaurant.distance}</Text>
              </View>
              <RestaurantCardOfferCarousel coupons={coupons} />
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <View style={styles.rating}>
                <Star size={14} color="#fff" fill="#fff" strokeWidth={0} />
                <Text style={styles.ratingText}>{Number(restaurant.rating) > 0 ? Number(restaurant.rating).toFixed(1) : 'NEW'}</Text>
              </View>
              {Number(restaurant.rating) > 0 ? <Text style={styles.ratingCount}>{formatRatingCount(restaurant.totalRatings)}</Text> : null}
            </View>
          </View>

          {closed ? (
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <View style={[styles.status, offline ? styles.statusOffline : null]}>
                {offline ? (
                  <>
                    <AlertCircle size={12} color={tw.red500} strokeWidth={2.5} />
                    <Text style={[styles.statusText, { color: tw.red600 }]}>OFFLINE</Text>
                  </>
                ) : availability.openingTime ? (
                  <>
                    <Clock size={12} color={tw.gray500} strokeWidth={2.5} />
                    <Text style={styles.statusText}>OPENS AT {String(availability.openingTime).toUpperCase()}</Text>
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} color={tw.gray500} strokeWidth={2.5} />
                    <Text style={styles.statusText}>CLOSED</Text>
                  </>
                )}
              </View>
            </View>
          ) : null}
        </View>
      </Press>
    </Animated.View>
  );
});

/** The 150px card of the "Recommended For You" row. */
export const RecommendedCard = memo(function RecommendedCard({ restaurant, backFrom }) {
  const rated = Number(restaurant.rating) > 0;
  return (
    <Press scale={0.98} onPress={() => openRestaurant(restaurant, { from: backFrom })} accessibilityLabel={restaurant.name} style={styles.rec}>
      <View style={{ height: 96, backgroundColor: tw.gray50 }}>
        <RestaurantImageCarousel restaurant={restaurant} height={96} radius={20} backFrom={backFrom} />
        <View style={[styles.recRating, rated ? null : { backgroundColor: 'rgba(229,231,235,0.9)' }]}>
          <Text style={[styles.recRatingText, rated ? null : { color: tw.gray600 }]}>{rated ? Number(restaurant.rating).toFixed(1) : 'NEW'}</Text>
        </View>
      </View>
      <View style={{ padding: 10 }}>
        <Text style={styles.recName} numberOfLines={1}>{restaurant.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Flame size={14} color="#0a4d2b" fill="#0a4d2b" />
          <Text style={styles.recTag}>NEAR & FAST</Text>
        </View>
      </View>
    </Press>
  );
});

const styles = StyleSheet.create({
  offer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, height: 20, overflow: 'hidden' },
  offerText: { fontSize: 11, lineHeight: 16, letterSpacing: 0.275, color: tw.slate700 || '#314158', ...poppins(700) },

  scrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 64 },
  dishBadge: {
    position: 'absolute', top: 12, left: 12, maxWidth: '78%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  dietBox: { width: 14, height: 14, borderWidth: 1.5, borderRadius: 2, backgroundColor: '#fff', padding: 1.5 },
  dietDot: { flex: 1, borderRadius: 999 },
  dishText: { fontSize: 12, lineHeight: 16, letterSpacing: -0.3, color: '#fff', ...poppins(700) },
  unavailable: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: tw.gray100 },
  dots: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 16, backgroundColor: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(229,231,235,0.7)', overflow: 'hidden', ...shadow('md') },
  greyWash: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(120,120,120,0.35)' },
  bookmark: {
    position: 'absolute', top: 16, right: 16, width: 44, height: 44, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center', ...shadow('xl'),
  },
  body: { padding: 12 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  name: { fontSize: 24, lineHeight: 30, letterSpacing: -0.6, color: '#1c1c1c', ...poppins(700) },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  metaText: { fontSize: 14, lineHeight: 20, color: '#257d3c', ...poppins(600) },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#257d3c', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { fontSize: 14, lineHeight: 20, letterSpacing: -0.35, color: '#fff', ...poppins(700) },
  ratingCount: { fontSize: 10, lineHeight: 14, color: tw.gray500, marginTop: 2, ...poppins(500) },
  status: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: tw.gray100,
    borderWidth: 1, borderColor: tw.gray200,
  },
  statusOffline: { backgroundColor: tw.red50, borderColor: tw.red100 },
  statusText: { fontSize: 10, lineHeight: 15, letterSpacing: 0.25, color: tw.gray600, ...poppins(700) },

  rec: { width: 150, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(229,231,235,0.7)', backgroundColor: '#fff', ...shadow('md') },
  recRating: {
    position: 'absolute', bottom: 8, left: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.8)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  recRatingText: { fontSize: 10, lineHeight: 15, color: '#fff', ...poppins(500) },
  recName: { fontSize: 14, lineHeight: 20, letterSpacing: -0.35, color: tw.gray900, ...poppins(600) },
  recTag: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: '#0a4d2b', ...poppins(700) },
});
