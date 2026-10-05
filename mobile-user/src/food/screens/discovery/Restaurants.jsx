import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, Heart, MapPin, Star } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import { restaurantAPI } from '../../../api/food';
import { useProfile } from '../../context/ProfileContext';
import { useZone } from '../../hooks/useZone';
import { useLocation } from '../../hooks/useLocation';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { filterRestaurantsForVegMode } from '../../utils/vegMode';
import { normalizeImageUrl } from '../../utils/common';
import { RestaurantGridSkeleton } from '../../components/discovery/bits';
import { F } from '../../components/shell';
import { poppins, tw } from '../../../theme';

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

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFEF8' }}>
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 96 + insets.bottom, paddingHorizontal: 12 }}>
        <View style={styles.head}>
          <Press scale={0.9} onPress={() => router.navigate('/food/user')} accessibilityLabel="Back" style={styles.back}>
            <ArrowLeft size={16} color={tw.gray900} />
          </Press>
          <Text style={styles.title}>All Restaurants</Text>
        </View>

        {showSkeleton ? (
          <RestaurantGridSkeleton count={4} />
        ) : visible.length === 0 ? (
          <Text style={styles.empty}>No restaurants available right now.</Text>
        ) : (
          <View style={{ gap: 12, paddingTop: 8 }}>
            {visible.map((r) => {
              const favorite = isFavorite(r.slug);
              const toggle = () => {
                if (favorite) removeFavorite(r.slug);
                else addFavorite({ slug: r.slug, name: r.name, cuisine: r.cuisine, rating: r.rating, deliveryTime: r.deliveryTime, distance: r.distance, priceRange: r.priceRange, image: r.image });
              };
              return (
                <Press key={r.id} scale={0.99} onPress={() => router.push(`/food/user/restaurants/${r.slug}`)} accessibilityLabel={r.name} style={styles.card}>
                  <View style={styles.cardBody}>
                    <View style={{ flex: 1, justifyContent: 'space-between', gap: 8, padding: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                          <Text style={styles.name} numberOfLines={2}>{r.name}</Text>
                          <Text style={styles.cuisine} numberOfLines={1}>{r.cuisine}</Text>
                          <View style={styles.rating}>
                            <Star size={12} color={tw.yellow400} fill={tw.yellow400} />
                            <Text style={styles.ratingText}>{r.rating.toFixed(1)}</Text>
                          </View>
                        </View>
                        <Press scale={0.9} onPress={toggle} accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'} style={styles.heart}>
                          <Heart size={16} color={favorite ? tw.red500 : tw.gray400} fill={favorite ? tw.red500 : 'none'} />
                        </Press>
                      </View>
                      <View style={styles.foot}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, flexWrap: 'wrap' }}>
                          <View style={styles.meta}>
                            <Clock size={12} color={tw.gray600} />
                            <Text style={styles.metaText}>{r.deliveryTime}</Text>
                          </View>
                          <View style={styles.meta}>
                            <MapPin size={12} color={tw.gray600} />
                            <Text style={styles.metaText}>{r.distance}</Text>
                          </View>
                        </View>
                        <View style={styles.order}>
                          <Text style={styles.orderText}>Order Now</Text>
                        </View>
                      </View>
                    </View>
                    <Image source={{ uri: r.image || 'https://via.placeholder.com/400x300?text=Restaurant' }} style={styles.img} resizeMode="cover" />
                  </View>
                </Press>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  back: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  empty: { paddingVertical: 64, textAlign: 'center', fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, overflow: 'hidden', paddingBottom: 4 },
  cardBody: { flexDirection: 'row', minHeight: 120 },
  name: { fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 4, ...poppins(600) },
  cuisine: { fontSize: 12, lineHeight: 16, color: tw.gray600, marginBottom: 8, ...poppins(500) },
  rating: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 4, backgroundColor: tw.yellow50, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  ratingText: { fontSize: 12, lineHeight: 16, color: tw.yellow700, ...poppins(700) },
  heart: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray200 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(500) },
  order: { backgroundColor: F.green, height: 28, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  orderText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(500) },
  img: { width: 144, backgroundColor: tw.gray100 },
});
