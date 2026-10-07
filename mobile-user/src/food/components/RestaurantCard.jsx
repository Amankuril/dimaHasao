import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { AlertCircle, Bookmark, Clock, Flame, Star } from 'lucide-react-native';
import Image from '../../components/Img';
import { Press } from '../../components/ui';
import { useProfile } from '../context/ProfileContext';
import { isVegMenuItem } from '../utils/vegMode';
import { getRestaurantRouteId } from '../utils/mainTabRoutes';
import { navigateTo } from '../../lib/webRouter';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';

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

export function ScallopBadge({ size = 20, color: fill = '#2563EB' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d={SCALLOP} fill={fill} />
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


// Dark pill / scrim behind text that sits on a photo.
const ON_PHOTO = 'rgba(17,17,17,0.78)';

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
      <ScallopBadge size={18} color={color.goldText} />
      <View style={styles.offerTextBox}>
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
  compact = false,
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
    <View style={{ height, borderTopLeftRadius: radius, borderTopRightRadius: radius, overflow: 'hidden', backgroundColor: color.surfaceMuted }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
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

      {current?.dish && !compact ? (
        <>
          <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.45)', 'transparent']} style={styles.scrim} />
          <View pointerEvents="none" style={styles.dishBadge}>
            {!vegMode ? <DietMark veg={isDishVeg} /> : null}
            <Text style={[styles.dishText, { flexShrink: 1 }]} numberOfLines={1}>{current.dish.name}</Text>
            <Text style={[styles.dishText, styles.dishSep]}>·</Text>
            <Text style={styles.dishText}>₹{current.dish.price}</Text>
          </View>
        </>
      ) : null}

      {failed ? (
        <View style={styles.unavailable}>
          <Text style={[type.caption, { color: color.textMuted }]}>Image unavailable</Text>
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

/** FSSAI veg / non-veg mark: square outline with a filled dot. */
function DietMark({ veg }) {
  const c = veg ? color.veg : color.nonVeg;
  return (
    <View accessibilityLabel={veg ? 'Veg' : 'Non-veg'} style={[styles.dietBox, { borderColor: c }]}>
      <View style={[styles.dietDot, { backgroundColor: c }]} />
    </View>
  );
}

/** Rating as a gold badge ("New" when unrated). */
function RatingBadge({ rating }) {
  const rated = Number(rating) > 0;
  return (
    <View style={styles.rating} accessibilityLabel={rated ? `Rated ${Number(rating).toFixed(1)}` : 'New'}>
      <Star size={13} color={color.goldText} fill={rated ? color.gold : 'none'} strokeWidth={rated ? 0 : 2} />
      <Text style={styles.ratingText}>{rated ? Number(rating).toFixed(1) : 'New'}</Text>
    </View>
  );
}

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

  const rated = Number(restaurant.rating) > 0;
  const meta = [restaurant.deliveryTime, restaurant.distance].filter(Boolean).join('  ·  ');
  const open = () => openRestaurant(restaurant, { from: backFrom });

  // The card is a View (not a button) so the photo slides and the bookmark are
  // not buttons nested inside a button; the body and each slide open the page.
  return (
    <Animated.View style={{ opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) }] }}>
      <View style={[styles.card, dimmed || closed ? { opacity: 0.8 } : null]}>
        <View>
          <RestaurantImageCarousel restaurant={restaurant} backFrom={backFrom} height={196} radius={radii.lg} categoryFallbackImage={categoryFallbackImage} />
          {dimmed || closed ? <View pointerEvents="none" style={styles.greyWash} /> : null}
          <Press
            scale={0.9}
            onPress={onToggleFavorite}
            accessibilityRole="button"
            accessibilityState={{ selected: !!favorite }}
            accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
            style={[styles.bookmark, favorite ? styles.bookmarkOn : null]}
          >
            <Bookmark size={20} color={favorite ? color.onPrimary : color.text} fill={favorite ? color.onPrimary : 'none'} />
          </Press>
        </View>

        <Press
          scale={0.99}
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`${restaurant.name}. ${rated ? `Rated ${Number(restaurant.rating).toFixed(1)}` : 'New'}${meta ? `. ${meta}` : ''}`}
          style={styles.body}
        >
          <View style={styles.headRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={2}>{restaurant.name}</Text>
              {meta ? (
                <View style={styles.meta}>
                  <Clock size={14} color={color.textSecondary} />
                  <Text style={styles.metaText} numberOfLines={1}>{meta}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: space.xxs }}>
              <RatingBadge rating={restaurant.rating} />
              {rated ? <Text style={styles.ratingCount}>{formatRatingCount(restaurant.totalRatings)}</Text> : null}
            </View>
          </View>
          <RestaurantCardOfferCarousel coupons={coupons} />

          {closed ? (
            offline ? (
              <StatusBadge label="Offline" tone="warning" icon={AlertCircle} style={{ marginTop: space.sm }} />
            ) : availability.openingTime ? (
              <StatusBadge label={`Opens at ${availability.openingTime}`} tone="neutral" icon={Clock} style={{ marginTop: space.sm }} />
            ) : (
              <StatusBadge label="Closed" tone="neutral" icon={AlertCircle} style={{ marginTop: space.sm }} />
            )
          ) : null}
        </Press>
      </View>
    </Animated.View>
  );
});

/** The compact card of the "Recommended for you" row. */
export const RecommendedCard = memo(function RecommendedCard({ restaurant, backFrom }) {
  const rated = Number(restaurant.rating) > 0;
  return (
    <View style={styles.rec}>
      <View style={{ height: 104, backgroundColor: color.surfaceMuted }}>
        <RestaurantImageCarousel restaurant={restaurant} height={104} radius={radii.lg} backFrom={backFrom} compact />
        <View pointerEvents="none" style={styles.recRating}>
          <Star size={12} color={color.gold} fill={rated ? color.gold : 'none'} strokeWidth={rated ? 0 : 2} />
          <Text style={styles.recRatingText}>{rated ? Number(restaurant.rating).toFixed(1) : 'New'}</Text>
        </View>
      </View>
      <Press scale={0.98} onPress={() => openRestaurant(restaurant, { from: backFrom })} accessibilityRole="button" accessibilityLabel={restaurant.name} style={styles.recBody}>
        <Text style={styles.recName} numberOfLines={1}>{restaurant.name}</Text>
        <View style={styles.recTagRow}>
          <Flame size={14} color={color.goldText} />
          <Text style={styles.recTag}>Near & fast</Text>
        </View>
      </Press>
    </View>
  );
});

const styles = StyleSheet.create({
  offer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', maxWidth: '100%', gap: space.xs + 2, marginTop: space.sm, height: 28, paddingLeft: space.xs + 2, paddingRight: space.md, borderRadius: radii.pill, backgroundColor: color.goldSoft },
  offerTextBox: { flexShrink: 1, height: 18, overflow: 'hidden', justifyContent: 'center' },
  offerText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.goldText },

  scrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 64 },
  dishBadge: {
    position: 'absolute', top: space.md, left: space.md, maxWidth: '76%', flexDirection: 'row', alignItems: 'center', gap: space.xs + 2,
    paddingHorizontal: space.md - 2, height: 30, borderRadius: radii.pill, backgroundColor: ON_PHOTO,
  },
  dietBox: { width: 14, height: 14, borderWidth: 1.5, borderRadius: 2, backgroundColor: color.surface, padding: 2 },
  dietDot: { flex: 1, borderRadius: radii.pill },
  dishText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.textInverse },
  dishSep: { color: color.textOnDarkMuted },
  unavailable: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surfaceMuted },
  dots: { position: 'absolute', bottom: space.md, right: space.md, flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { width: 16, backgroundColor: color.surface },

  card: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden', ...elevation.card },
  greyWash: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(120,120,120,0.35)' },
  bookmark: {
    position: 'absolute', top: space.md, right: space.md, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center', ...elevation.card,
  },
  bookmarkOn: { backgroundColor: color.primary },
  body: { padding: space.lg, paddingTop: space.md },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  name: { ...type.heading, color: color.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, marginTop: space.xs },
  metaText: { ...type.caption, color: color.textSecondary, flexShrink: 1 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 26, paddingHorizontal: space.sm, borderRadius: radii.pill, backgroundColor: color.goldSoft, borderWidth: 1, borderColor: color.border },
  ratingText: { ...type.label, color: color.goldText },
  ratingCount: { ...type.caption, color: color.textMuted },

  rec: { width: 164, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, ...elevation.card },
  recRating: {
    position: 'absolute', bottom: space.sm, left: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 24, paddingHorizontal: space.sm,
    borderRadius: radii.pill, backgroundColor: ON_PHOTO,
  },
  recRatingText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.textInverse },
  recBody: { paddingHorizontal: space.md, paddingVertical: space.sm + 2, minHeight: 64 },
  recName: { ...type.bodyStrong, color: color.text },
  recTagRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xxs },
  recTag: { ...type.caption, color: color.goldText },
});
