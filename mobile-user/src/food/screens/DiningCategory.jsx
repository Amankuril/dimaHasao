import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BadgePercent, Bookmark, Clock, MapPin, Star, UtensilsCrossed } from 'lucide-react-native';
import Image from '../../components/Img';
import Fa from '../../components/Fa';
import { Press } from '../../components/ui';
import { diningAPI } from '../../api/food';
import { useProfile } from '../context/ProfileContext';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { useLocation as useLocationHook } from '../hooks/useLocation';
import { getRestaurantAvailabilityStatus } from '../utils/restaurantAvailability';
import { filterRestaurantsForVegMode } from '../utils/vegMode';
import { navigateTo, useParams } from '../../lib/webRouter';
import { poppins, shadow, tw } from '../../theme';
import { F, useLocationSelector } from '../components/shell';

const slugifyRestaurant = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const formatAddress = (restaurant) =>
  restaurant?.location?.addressLine1 ||
  restaurant?.location?.formattedAddress ||
  restaurant?.location?.address ||
  [restaurant?.location?.area || restaurant?.area, restaurant?.location?.city || restaurant?.city].filter(Boolean).join(', ') ||
  'Address unavailable';

/** "09:30" -> "9:30 am" (what the web's toLocaleTimeString("en-IN") prints). */
const formatTimeValue = (value) => {
  if (!value) return null;
  if (/[ap]m/i.test(value)) return String(value).toUpperCase();
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return value;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return value;
  return `${hours % 12 === 0 ? 12 : hours % 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'pm' : 'am'}`;
};

const formatTimingLabel = (status) => {
  if (!status?.openingTime || !status?.closingTime) return 'Timings not updated';
  return `${formatTimeValue(status.openingTime)} - ${formatTimeValue(status.closingTime)}`;
};

const formatCategoryHeading = (category) =>
  String(category || 'dining')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

/** Port of pages/user/DiningCategory.jsx: the restaurants of one dining category. */
export default function DiningCategory() {
  const insets = useSafeAreaInsets();
  const params = useParams();
  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const goBack = useAppBackNavigation();
  const { openLocationSelector } = useLocationSelector();
  const { location } = useLocationHook();
  const { addFavorite, removeFavorite, isFavorite, vegMode, vegModeOption } = useProfile();

  const [restaurants, setRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchRestaurants = async () => {
      try {
        setIsLoading(true);
        const response = await diningAPI.getRestaurants(category ? (location?.city ? { category, city: location.city } : { category }) : location?.city ? { city: location.city } : {});
        if (cancelled) return;
        if (response?.data?.success) {
          const mapped = (Array.isArray(response.data.data) ? response.data.data : []).map((restaurant) => {
            const availability = getRestaurantAvailabilityStatus(restaurant);
            return {
              id: restaurant._id || restaurant.id,
              slug: restaurant.restaurantNameNormalized || slugifyRestaurant(restaurant.restaurantName || restaurant.name),
              name: restaurant.restaurantName || restaurant.name || 'Restaurant',
              image: restaurant.coverImage || restaurant.menuImages?.[0] || restaurant.profileImage?.url || restaurant.profileImage || '',
              address: formatAddress(restaurant),
              cuisine: Array.isArray(restaurant.cuisines) && restaurant.cuisines.length > 0 ? restaurant.cuisines.join(' • ') : 'Multi-cuisine',
              price: restaurant.costForTwo ? `Rs ${restaurant.costForTwo} for two` : 'Price on request',
              rating: Number(restaurant.rating || restaurant.avgRating || 0).toFixed(1),
              offer: restaurant.offer || 'Pre-book tables and dining offers',
              featuredDish: restaurant.featuredDish || "Chef's special",
              pureVegRestaurant: restaurant.pureVegRestaurant === true || restaurant.diningSettings?.pureVegRestaurant === true,
              hasNonVegMenu: restaurant.hasNonVegMenu,
              isPureVeg: restaurant.isPureVeg,
              featuredPrice: restaurant.featuredPrice || null,
              availability,
            };
          });
          setRestaurants(mapped);
          setError(null);
        } else {
          setRestaurants([]);
        }
      } catch {
        if (cancelled) return;
        setError('Failed to load dining restaurants');
        setRestaurants([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchRestaurants();
    return () => {
      cancelled = true;
    };
  }, [category, location?.city]);

  const cityName = location?.city || 'Select location';
  const heading = useMemo(() => formatCategoryHeading(category), [category]);
  const visibleRestaurants = useMemo(() => filterRestaurantsForVegMode(restaurants, { vegMode, vegModeOption }), [restaurants, vegMode, vegModeOption]);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Press scale={0.95} onPress={goBack} accessibilityLabel="Go back" style={styles.back}>
          <ArrowLeft size={20} color="#2f2215" />
        </Press>
        <Press scale={0.97} onPress={openLocationSelector} accessibilityLabel={`Dining in ${cityName}. Change location`} style={styles.locBtn}>
          <Fa name="fa-solid fa-location-dot" size={16} color={F.green} />
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.locKicker}>DINING IN</Text>
            <Text style={styles.locCity} numberOfLines={1}>
              {cityName}
            </Text>
          </View>
        </Press>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 96 + insets.bottom }}>
        <LinearGradient colors={['#fff4e7', '#ffffff', '#fff9f3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroKicker}>DINING CATEGORY</Text>
          <Text style={styles.heroTitle} accessibilityRole="header">
            {heading}
          </Text>
          <Text style={styles.heroBody}>Explore all restaurants linked to this dining category, check their timings, preview the menu, and jump straight into table booking.</Text>
          <View style={styles.found}>
            <MapPin size={16} color={F.green} />
            <Text style={styles.foundText}>{visibleRestaurants.length} places found</Text>
          </View>
        </LinearGradient>

        {isLoading ? (
          <Text style={styles.loading}>Loading dining restaurants...</Text>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : visibleRestaurants.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No restaurants are linked to this dining category yet.</Text>
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            {visibleRestaurants.map((restaurant) => {
              const favorite = isFavorite(restaurant.slug);
              const open = restaurant.availability?.isOpen;
              return (
                <Press
                  key={restaurant.id}
                  scale={0.98}
                  accessibilityLabel={restaurant.name}
                  onPress={() => navigateTo(`/food/user/dining/${category}/${restaurant.slug}`, { state: { restaurant } })}
                  style={styles.card}
                >
                  <View style={styles.photo}>
                    {restaurant.image ? <Image source={{ uri: restaurant.image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
                    <LinearGradient colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0)']} locations={[0, 0.5, 1]} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
                    <View style={styles.photoTop}>
                      <View style={styles.dishPill}>
                        <Text style={styles.dishText}>
                          {restaurant.featuredDish}
                          {restaurant.featuredPrice ? ` • ₹${restaurant.featuredPrice}` : ''}
                        </Text>
                      </View>
                      <Press
                        scale={0.9}
                        accessibilityLabel={favorite ? 'Remove bookmark' : 'Add bookmark'}
                        onPress={() => {
                          if (favorite) {
                            removeFavorite(restaurant.slug);
                            return;
                          }
                          addFavorite({ slug: restaurant.slug, name: restaurant.name, cuisine: restaurant.cuisine, rating: restaurant.rating, image: restaurant.image });
                        }}
                        style={styles.bookmark}
                      >
                        <Bookmark size={20} color="#2f2215" fill={favorite ? '#2f2215' : 'none'} />
                      </Press>
                    </View>
                    <View style={styles.photoBottom}>
                      <Text style={styles.reserve}>RESERVE YOUR TABLE</Text>
                      <Text style={styles.offer}>{restaurant.offer}</Text>
                    </View>
                  </View>

                  <View style={{ padding: 20, gap: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.name} numberOfLines={1}>
                          {restaurant.name}
                        </Text>
                        <Text style={styles.address} numberOfLines={2}>
                          {restaurant.address}
                        </Text>
                      </View>
                      <View style={styles.rating}>
                        <Text style={styles.ratingText}>{restaurant.rating}</Text>
                        <Star size={14} color="#fff" fill="#fff" />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <UtensilsCrossed size={16} color={F.green} />
                      <Text style={styles.cuisine} numberOfLines={1}>
                        {restaurant.cuisine}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <View style={[styles.chip, { backgroundColor: open ? tw.emerald50 : tw.rose50 }]}>
                        <Clock size={14} color={open ? tw.emerald700 : tw.rose700} />
                        <Text style={[styles.chipText, { color: open ? tw.emerald700 : tw.rose700 }]}>{open ? 'Open now' : 'Closed now'}</Text>
                      </View>
                      <View style={[styles.chip, { backgroundColor: '#fff4e7' }]}>
                        <Text style={[styles.chipText, { color: '#a25b1f' }]}>{formatTimingLabel(restaurant.availability)}</Text>
                      </View>
                    </View>

                    <View style={styles.foot}>
                      <Text style={styles.price}>{restaurant.price}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <BadgePercent size={16} color={F.green} />
                        <Text style={styles.menuBook}>Menu & booking</Text>
                      </View>
                    </View>
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
  page: { flex: 1, backgroundColor: '#fffaf4' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#efe2d2', backgroundColor: 'rgba(255,250,244,0.95)' },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#e7d8c5', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  locBtn: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#e7d8c5', backgroundColor: '#fff' },
  locKicker: { fontSize: 12, lineHeight: 16, letterSpacing: 2.9, color: '#aa8b68', ...poppins(600) },
  locCity: { fontSize: 14, lineHeight: 20, color: '#2f2215', ...poppins(700) },

  hero: { borderRadius: 28, borderWidth: 1, borderColor: '#f0dfca', padding: 24, marginBottom: 24, ...shadow('0 18px 60px rgba(90,55,20,0.08)') },
  heroKicker: { fontSize: 12, lineHeight: 16, letterSpacing: 4.1, color: '#c07a3a', marginBottom: 8, ...poppins(600) },
  heroTitle: { fontSize: 30, lineHeight: 36, letterSpacing: -0.75, color: '#23180f', ...poppins(900) },
  heroBody: { marginTop: 8, fontSize: 14, lineHeight: 20, color: '#6b5641', ...poppins(400) },
  found: { alignSelf: 'flex-start', marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', ...shadow('sm') },
  foundText: { fontSize: 14, lineHeight: 20, color: '#6b5641', ...poppins(600) },

  loading: { paddingVertical: 80, textAlign: 'center', fontSize: 16, lineHeight: 24, color: '#7f6850', ...poppins(400) },
  error: { paddingVertical: 80, textAlign: 'center', fontSize: 16, lineHeight: 24, color: tw.red600, ...poppins(400) },
  empty: { borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: '#e8d9c5', backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 64 },
  emptyText: { textAlign: 'center', fontSize: 16, lineHeight: 24, color: '#7f6850', ...poppins(400) },

  card: { borderRadius: 30, borderWidth: 1, borderColor: '#f0dfca', backgroundColor: '#fff', overflow: 'hidden', ...shadow('0 18px 60px rgba(17,24,39,0.08)') },
  photo: { height: 256, overflow: 'hidden' },
  photoTop: { position: 'absolute', left: 16, right: 16, top: 16, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  dishPill: { flexShrink: 1, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6 },
  dishText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(600) },
  bookmark: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  photoBottom: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  reserve: { fontSize: 11, lineHeight: 16, letterSpacing: 3.5, color: 'rgba(255,255,255,0.8)', marginBottom: 8, ...poppins(600) },
  offer: { maxWidth: '85%', fontSize: 24, lineHeight: 30, color: '#fff', ...poppins(900) },
  name: { fontSize: 22, lineHeight: 27, color: '#23180f', ...poppins(900) },
  address: { marginTop: 8, fontSize: 14, lineHeight: 24, color: '#6b5641', ...poppins(400) },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: tw.emerald600 },
  ratingText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) },
  cuisine: { flex: 1, fontSize: 14, lineHeight: 20, color: '#5f4c39', ...poppins(400) },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 12, lineHeight: 16, ...poppins(600) },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#ead7c0', borderStyle: 'dashed', paddingTop: 16 },
  price: { fontSize: 14, lineHeight: 20, color: '#4c3b2c', ...poppins(600) },
  menuBook: { fontSize: 14, lineHeight: 20, color: F.green, ...poppins(700) },
});
