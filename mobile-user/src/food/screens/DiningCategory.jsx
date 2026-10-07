import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ArrowLeft, BadgePercent, Bookmark, Clock, MapPin, Star, UtensilsCrossed } from 'lucide-react-native';
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
import { EmptyState, IconButton, StatusBadge } from '../../components/ds';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { color, elevation, radii, space, type } from '../../theme';
import { useLocationSelector } from '../components/shell';

/** Dark scrim for text over the card photo (primaryDeep). */
const SCRIM = ['rgba(6,44,22,0.85)', 'rgba(6,44,22,0.25)', 'rgba(6,44,22,0)'];

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
  const m = String(value)
    .trim()
    .match(/^(\d{1,2}):(\d{2})/);
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
        const response = await diningAPI.getRestaurants(
          category ? (location?.city ? { category, city: location.city } : { category }) : location?.city ? { city: location.city } : {},
        );
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

  const renderRestaurant = ({ item: restaurant }) => {
    const favorite = isFavorite(restaurant.slug);
    const open = restaurant.availability?.isOpen;
    return (
      <View style={styles.card}>
        <Press
          scale={0.98}
          accessibilityLabel={restaurant.name}
          onPress={() =>
            navigateTo(`/food/user/dining/${category}/${restaurant.slug}`, {
              state: { restaurant },
            })
          }
        >
          <View style={styles.photo}>
            {restaurant.image ? (
              <Image source={{ uri: restaurant.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.photoEmpty]}>
                <UtensilsCrossed size={32} color={color.textDisabled} />
              </View>
            )}
            <LinearGradient colors={SCRIM} locations={[0, 0.5, 1]} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
            <View style={styles.photoTop}>
              <View style={styles.dishPill}>
                <Text style={styles.dishText} numberOfLines={1}>
                  {restaurant.featuredDish}
                  {restaurant.featuredPrice ? ` • ₹${restaurant.featuredPrice}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.photoBottom}>
              <Text style={styles.reserve}>Reserve your table</Text>
              <Text style={styles.offer} numberOfLines={2}>
                {restaurant.offer}
              </Text>
            </View>
          </View>

          <View style={{ padding: space.lg, gap: space.md }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: space.md,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {restaurant.name}
                </Text>
                <Text style={styles.address} numberOfLines={2}>
                  {restaurant.address}
                </Text>
              </View>
              <View style={styles.rating} accessibilityLabel={`Rated ${restaurant.rating}`}>
                <Star size={14} color={color.gold} fill={color.gold} />
                <Text style={styles.ratingText}>{restaurant.rating}</Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
              }}
            >
              <UtensilsCrossed size={16} color={color.textMuted} />
              <Text style={styles.cuisine} numberOfLines={1}>
                {restaurant.cuisine}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              <StatusBadge icon={Clock} label={open ? 'Open now' : 'Closed now'} tone={open ? 'success' : 'danger'} />
              <StatusBadge label={formatTimingLabel(restaurant.availability)} tone="neutral" />
            </View>

            <View style={styles.foot}>
              <Text style={styles.price}>{restaurant.price}</Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.xs,
                }}
              >
                <BadgePercent size={16} color={color.primary} />
                <Text style={styles.menuBook}>Menu & booking</Text>
              </View>
            </View>
          </View>
        </Press>
        {/* Bookmark sits beside (not inside) the card's Press: no nested buttons on web. */}
        <View style={styles.bookmarkPos}>
          <Press
            scale={0.9}
            accessibilityLabel={favorite ? 'Remove bookmark' : 'Add bookmark'}
            accessibilityState={{ selected: Boolean(favorite) }}
            onPress={() => {
              if (favorite) {
                removeFavorite(restaurant.slug);
                return;
              }
              addFavorite({
                slug: restaurant.slug,
                name: restaurant.name,
                cuisine: restaurant.cuisine,
                rating: restaurant.rating,
                image: restaurant.image,
              });
            }}
            style={styles.bookmark}
          >
            <Bookmark size={20} color={favorite ? color.primary : color.text} fill={favorite ? color.primary : 'none'} />
          </Press>
        </View>
      </View>
    );
  };

  const listHeader = (
    <View style={styles.hero}>
      <Text style={styles.heroKicker}>Dining category</Text>
      <Text style={styles.heroTitle} accessibilityRole="header">
        {heading}
      </Text>
      <Text style={styles.heroBody}>Explore all restaurants linked to this dining category, check their timings, preview the menu, and jump straight into table booking.</Text>
      <StatusBadge icon={MapPin} label={`${visibleRestaurants.length} places found`} tone="gold" style={{ marginTop: space.md }} />
    </View>
  );

  const listEmpty = isLoading ? (
    <View style={styles.state} accessibilityRole="progressbar">
      <ActivityIndicator color={color.primary} />
      <Text style={styles.stateText}>Loading dining restaurants...</Text>
    </View>
  ) : error ? (
    <EmptyState icon={AlertCircle} title={error} />
  ) : (
    <View style={styles.empty}>
      <EmptyState icon={UtensilsCrossed} title="No restaurants yet" message="No restaurants are linked to this dining category yet." style={{ paddingVertical: space.xxxl }} />
    </View>
  );

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <IconButton icon={ArrowLeft} label="Go back" variant="soft" onPress={goBack} />
        <Press scale={0.97} onPress={openLocationSelector} accessibilityLabel={`Dining in ${cityName}. Change location`} style={styles.locBtn}>
          <Fa name="fa-solid fa-location-dot" size={16} color={color.primary} />
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text style={styles.locKicker}>Dining in</Text>
            <Text style={styles.locCity} numberOfLines={1}>
              {cityName}
            </Text>
          </View>
        </Press>
      </View>

      <FlatList
        data={isLoading || error ? [] : visibleRestaurants}
        keyExtractor={(restaurant, i) => String(restaurant.id ?? `restaurant-${i}`)}
        renderItem={renderRestaurant}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ItemSeparatorComponent={Separator}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: space.lg,
          paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom,
        }}
      />
    </View>
  );
}

const Separator = () => <View style={{ height: space.md }} />;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
    backgroundColor: color.surface,
  },
  locBtn: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  locKicker: { ...type.caption, color: color.textMuted },
  locCity: { ...type.bodyStrong, color: color.text },

  hero: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    padding: space.xl,
    marginBottom: space.xxl,
    ...elevation.card,
  },
  heroKicker: {
    ...type.overline,
    color: color.goldText,
    marginBottom: space.xs,
  },
  heroTitle: { ...type.heroSerif, color: color.primary },
  heroBody: { marginTop: space.sm, ...type.small, color: color.textSecondary },

  state: {
    paddingVertical: space.xxxl * 2,
    alignItems: 'center',
    gap: space.md,
  },
  stateText: { ...type.body, color: color.textMuted, textAlign: 'center' },
  empty: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },

  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    overflow: 'hidden',
    ...elevation.card,
  },
  photo: {
    aspectRatio: 16 / 10,
    overflow: 'hidden',
    backgroundColor: color.surfaceMuted,
  },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  photoTop: {
    position: 'absolute',
    left: space.md,
    right: 64,
    top: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  bookmarkPos: { position: 'absolute', top: space.sm, right: space.sm },
  dishPill: {
    flexShrink: 1,
    borderRadius: radii.pill,
    backgroundColor: color.overlay,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
  },
  dishText: { ...type.caption, color: color.textInverse },
  bookmark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBottom: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: space.lg,
  },
  reserve: {
    ...type.overline,
    color: color.goldOnDark,
    marginBottom: space.xs,
  },
  offer: { maxWidth: '90%', ...type.heading, color: color.textInverse },
  name: { ...type.heading, color: color.text },
  address: { marginTop: space.xxs, ...type.small, color: color.textSecondary },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: color.goldSoft,
  },
  ratingText: { ...type.label, color: color.goldText },
  cuisine: { flex: 1, minWidth: 0, ...type.small, color: color.textSecondary },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    borderTopWidth: 1,
    borderTopColor: color.border,
    borderStyle: 'dashed',
    paddingTop: space.md,
  },
  price: { flexShrink: 1, ...type.bodyStrong, color: color.text },
  menuBook: { ...type.label, color: color.primary },
});
