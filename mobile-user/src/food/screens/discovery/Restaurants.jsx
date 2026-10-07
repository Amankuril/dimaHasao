import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Clock, Heart, MapPin, Star, Store } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import { restaurantAPI } from '../../../api/food';
import { useProfile } from '../../context/ProfileContext';
import { useZone } from '../../hooks/useZone';
import { useLocation } from '../../hooks/useLocation';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { filterRestaurantsForVegMode } from '../../utils/vegMode';
import { normalizeImageUrl } from '../../utils/common';
import { RestaurantGridSkeleton, PageBar } from '../../components/discovery/bits';
import { EmptyState } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { color, elevation, radii, space, type } from '../../../theme';

const pickRestaurantImage = (restaurant) => {
  const candidates = [
    restaurant?.coverImage?.url,
    restaurant?.coverImage,
    ...(Array.isArray(restaurant?.coverImages) ? restaurant.coverImages.map((img) => img?.url || img) : []),
    ...(Array.isArray(restaurant?.menuImages) ? restaurant.menuImages.map((img) => img?.url || img) : []),
    restaurant?.profileImage?.url,
    restaurant?.profileImage,
  ];
  const firstValid = candidates.find((value) => typeof value === 'string' && value.trim());
  return normalizeImageUrl(firstValid || '');
};

/** Port of pages/user/restaurants/Restaurants.jsx. */
export default function Restaurants() {
  const insets = useSafeAreaInsets();
  const { addFavorite, removeFavorite, isFavorite, orderType, vegMode, vegModeOption } = useProfile();
  const { location: userLocation } = useLocation();
  const { zoneId } = useZone(userLocation);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useDelayedLoading(loading);

  const visible = useMemo(() => filterRestaurantsForVegMode(restaurants, { vegMode, vegModeOption }), [restaurants, vegMode, vegModeOption]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const params = { limit: 300, _ts: Date.now() };
        if (zoneId) params.zoneId = zoneId;
        const response = await restaurantAPI.getRestaurants(params, { noCache: true });
        const list = response?.data?.data?.restaurants || response?.data?.restaurants || [];
        if (cancelled) return;
        const filtered = list.filter((r) => (orderType === 'takeaway' ? r.takeawaySettings?.isEnabled || r.takeawayAvailable : true));
        setRestaurants(
          filtered.map((restaurant) => {
            const slug = restaurant?.slug || String(restaurant?.name || '').toLowerCase().trim().replace(/\s+/g, '-');
            const cuisine = Array.isArray(restaurant?.cuisines) && restaurant.cuisines.length > 0 ? restaurant.cuisines[0] : 'Multi-cuisine';
            return {
              id: restaurant?._id || restaurant?.restaurantId || slug,
              slug,
              name: restaurant?.name || 'Unknown Restaurant',
              cuisine,
              rating: Number(restaurant?.rating || 0) || 4.5,
              deliveryTime:
                orderType === 'takeaway'
                  ? restaurant.preparationTime || '20-25 mins'
                  : restaurant?.estimatedDeliveryTime || (restaurant?.estimatedDeliveryTimeMinutes ? `${restaurant.estimatedDeliveryTimeMinutes} mins` : '25-30 mins'),
              distance: restaurant?.distance ? (typeof restaurant.distance === 'number' ? `${restaurant.distance.toFixed(1)} km` : restaurant.distance) : '1.2 km',
              priceRange: restaurant?.priceRange || '$$',
              image: pickRestaurantImage(restaurant),
            };
          }),
        );
      } catch {
        if (!cancelled) setRestaurants([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [zoneId, orderType]);

  const renderItem = ({ item: r }) => {
    const favorite = isFavorite(r.slug);
    const toggle = () => {
      if (favorite) removeFavorite(r.slug);
      else addFavorite({ slug: r.slug, name: r.name, cuisine: r.cuisine, rating: r.rating, deliveryTime: r.deliveryTime, distance: r.distance, priceRange: r.priceRange, image: r.image });
    };
    return (
      <View style={styles.card}>
        <Press scale={0.99} onPress={() => router.push(`/food/user/restaurants/${r.slug}`)} accessibilityRole="button" accessibilityLabel={`${r.name}, rated ${r.rating.toFixed(1)}`} style={styles.cardBody}>
          <View style={styles.cardText}>
            <View style={{ paddingRight: 40 }}>
              <Text style={styles.name} numberOfLines={2}>{r.name}</Text>
              <Text style={styles.cuisine} numberOfLines={1}>{r.cuisine}</Text>
              <View style={styles.rating}>
                <Star size={12} color={color.goldText} fill={color.gold} strokeWidth={0} />
                <Text style={styles.ratingText}>{r.rating.toFixed(1)}</Text>
              </View>
            </View>
            <View style={styles.foot}>
              <View style={styles.metaWrap}>
                <View style={styles.meta}>
                  <Clock size={13} color={color.textSecondary} />
                  <Text style={styles.metaText}>{r.deliveryTime}</Text>
                </View>
                <View style={styles.meta}>
                  <MapPin size={13} color={color.textSecondary} />
                  <Text style={styles.metaText}>{r.distance}</Text>
                </View>
              </View>
              <View style={styles.order}>
                <Text style={styles.orderText}>Order now</Text>
                <ChevronRight size={14} color={color.primary} />
              </View>
            </View>
          </View>
          {r.image ? (
            <Image source={{ uri: r.image }} style={styles.img} resizeMode="cover" />
          ) : (
            <View style={[styles.img, styles.imgEmpty]}>
              <Store size={28} color={color.textDisabled} />
            </View>
          )}
        </Press>
        <Press scale={0.9} onPress={toggle} accessibilityRole="button" accessibilityState={{ selected: favorite }} accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'} style={styles.heart}>
          <Heart size={18} color={favorite ? color.primary : color.textMuted} fill={favorite ? color.primary : 'none'} />
        </Press>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PageBar title="All restaurants" onBack={() => router.navigate('/food/user')} />
      {showSkeleton ? (
        <View style={{ padding: space.lg }}>
          <RestaurantGridSkeleton count={4} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(r) => String(r.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }}
          ListEmptyComponent={<EmptyState icon={Store} title="No restaurants available right now." />}
          initialNumToRender={8}
          windowSize={7}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden', ...elevation.card },
  cardBody: { flexDirection: 'row', minHeight: 136 },
  cardText: { flex: 1, minWidth: 0, justifyContent: 'space-between', gap: space.sm, padding: space.md },
  name: { ...type.subheading, color: color.text },
  cuisine: { ...type.caption, color: color.textMuted, marginTop: space.xxs, marginBottom: space.sm },
  rating: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: space.xs, height: 24, paddingHorizontal: space.sm, borderRadius: radii.pill, backgroundColor: color.goldSoft },
  ratingText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.goldText },
  heart: { position: 'absolute', top: space.xs, right: 132, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: color.border, flexWrap: 'wrap' },
  metaWrap: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  metaText: { ...type.caption, color: color.textSecondary },
  order: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
  orderText: { ...type.label, color: color.primary },
  img: { width: 124, backgroundColor: color.surfaceMuted },
  imgEmpty: { alignItems: 'center', justifyContent: 'center' },
});
