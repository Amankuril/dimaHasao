import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, UtensilsCrossed, Wallet, X } from 'lucide-react-native';
import Image from '../../components/Img';
import Skeleton from '../../components/Skeleton';
import { Press } from '../../components/ui';
import { diningAPI } from '../../api/food';
import { useProfile } from '../context/ProfileContext';
import { useLocation as useLocationHook, resolveServiceCity } from '../hooks/useLocation';
import { useZone } from '../hooks/useZone';
import { isModuleAuthenticated } from '../utils/auth';
import { filterCategoriesForVegMode } from '../utils/vegMode';
import { buildFoodCacheKey, getFoodPageCache, setFoodPageCache } from '../utils/foodPageCache';
import { events } from '../../lib/events';
import { localStore } from '../../lib/storage';
import { navigateTo } from '../../lib/webRouter';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { EmptyState, IconButton, SectionHeader, StatusBadge } from '../../components/ds';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { color, elevation, radii, space, type } from '../../theme';
import { DiningFilterChips, DiningFilterModal } from '../components/dining/DiningFilters';
import { DiningRestaurantCard } from '../components/dining/DiningCards';
import { useFoodNavScroll } from '../components/shell';

const DINING_CACHE_TTL_MS = 15 * 60 * 1000;
const BANNER_AUTO_SLIDE_MS = 3500;
const PROFILE_AVATAR = require('../../../assets/food/profile_avatar.webp');
/** Height of the floating Delivery / Takeaway / Under 250 / Dining pill above the app nav. */
const FOOD_PILL_CLEARANCE = 88;
/** Dark scrim for banner captions (primaryDeep, transparent → 80%). */
const SCRIM = ['rgba(6,44,22,0)', 'rgba(6,44,22,0.8)'];

const isDiningCacheFresh = (cached) => Boolean(cached?.ts && Date.now() - Number(cached.ts) < DINING_CACHE_TTL_MS);

const slugifyValue = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const getCoordinates = (restaurant) => {
  const latitude = restaurant?.location?.latitude;
  const longitude = restaurant?.location?.longitude;
  if (typeof latitude === 'number' && typeof longitude === 'number') return { latitude, longitude };
  const coords = restaurant?.location?.coordinates;
  if (Array.isArray(coords) && coords.length === 2) return { latitude: coords[1], longitude: coords[0] };
  return null;
};

const getDistanceKm = (userLocation, restaurant) => {
  const userLat = Number(userLocation?.latitude);
  const userLng = Number(userLocation?.longitude);
  const restaurantCoords = getCoordinates(restaurant);
  if (!Number.isFinite(userLat) || !Number.isFinite(userLng) || !restaurantCoords) return Number.POSITIVE_INFINITY;
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(restaurantCoords.latitude - userLat);
  const dLng = toRadians(restaurantCoords.longitude - userLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(userLat)) * Math.cos(toRadians(restaurantCoords.latitude)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Signed-in only: the wallet and profile links ask the shell for the login prompt otherwise. */
const goIfSignedIn = (path, state) => {
  if (!isModuleAuthenticated('user')) {
    events.emit('show-login-required');
    return;
  }
  navigateTo(path, { state });
};

function CategorySkeleton({ width }) {
  return (
    <View style={[styles.cat, { width }]}>
      <Skeleton style={{ height: 14, width: '70%', borderRadius: radii.sm, backgroundColor: color.surfaceMuted }} />
      <Skeleton style={{ flex: 1, marginTop: space.sm, borderRadius: radii.md, backgroundColor: color.surfaceMuted }} />
    </View>
  );
}

function RestaurantSkeleton() {
  return (
    <View style={styles.rSk}>
      <Skeleton style={{ aspectRatio: 16 / 9, borderRadius: 0, backgroundColor: color.surfaceMuted }} />
      <View style={{ padding: space.lg, gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
          <Skeleton style={{ height: 20, width: 160, borderRadius: radii.sm, backgroundColor: color.surfaceMuted }} />
          <Skeleton style={{ height: 24, width: 48, borderRadius: radii.pill, backgroundColor: color.goldSoft }} />
        </View>
        <Skeleton style={{ height: 14, width: 192, borderRadius: radii.sm, backgroundColor: color.surfaceMuted }} />
        <Skeleton style={{ height: 24, width: 120, borderRadius: radii.pill, backgroundColor: color.surfaceMuted }} />
      </View>
    </View>
  );
}

/** Admin dining hero banners: auto-sliding, swipeable, dots at the bottom centre. */
function HeroBanner({ banners, active, height }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scroller = useRef(null);
  const touching = useRef(false);
  const count = banners.length;

  useEffect(() => {
    setIndex((prev) => (count === 0 ? 0 : Math.min(prev, count - 1)));
  }, [count]);

  const goTo = useCallback(
    (next, animated = true) => {
      setIndex(next);
      scroller.current?.scrollTo({ x: next * width, animated });
    },
    [width],
  );

  useEffect(() => {
    if (count <= 1 || !width || !active) return undefined;
    const timer = setInterval(() => {
      if (touching.current) return;
      setIndex((prev) => {
        const next = (prev + 1) % count;
        scroller.current?.scrollTo({ x: next * width, animated: next !== 0 });
        return next;
      });
    }, BANNER_AUTO_SLIDE_MS);
    return () => clearInterval(timer);
  }, [count, width, active]);

  return (
    <View style={[styles.hero, { height }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {count > 0 ? (
        <>
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={count > 1}
            onScrollBeginDrag={() => {
              touching.current = true;
            }}
            onMomentumScrollEnd={(e) => {
              touching.current = false;
              if (width) setIndex(Math.max(0, Math.min(count - 1, Math.round(e.nativeEvent.contentOffset.x / width))));
            }}
          >
            {banners.map((banner, i) => (
              <View key={banner.id} style={{ width: width || 1, height: '100%' }}>
                <Image source={{ uri: banner.imageUrl }} accessibilityLabel={`Dining Banner ${i + 1}`} style={StyleSheet.absoluteFill} resizeMode="cover" />
                {banner.promoCode || banner.tagline ? (
                  <LinearGradient colors={SCRIM} style={styles.heroCaption}>
                    <View style={{ maxWidth: '80%' }}>
                      {banner.promoCode ? (
                        <Text style={styles.heroPromo} numberOfLines={1}>
                          {banner.promoCode}
                        </Text>
                      ) : null}
                      {banner.tagline ? (
                        <Text style={styles.heroTagline} numberOfLines={2}>
                          {banner.tagline}
                        </Text>
                      ) : null}
                    </View>
                  </LinearGradient>
                ) : null}
              </View>
            ))}
          </ScrollView>
          {count > 1 ? (
            <View style={styles.heroDots}>
              {banners.map((banner, i) => (
                <Press
                  key={`${banner.id}-dot`}
                  scale={1}
                  hitSlop={{ top: 16, bottom: 16, left: 4, right: 4 }}
                  onPress={() => goTo(i)}
                  accessibilityLabel={`Go to dining banner ${i + 1}`}
                  accessibilityState={{ selected: index === i }}
                  style={[styles.heroDot, index === i ? styles.heroDotActive : null]}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.heroEmpty}>
          <View style={styles.heroEmptyIcon}>
            <UtensilsCrossed size={24} color={color.goldOnDark} />
          </View>
          <Text style={styles.heroEmptyKicker}>Dining</Text>
          <Text style={styles.heroEmptyTitle}>Fresh dining picks near you</Text>
          <Text style={styles.heroEmptyBody}>Banner will appear here as soon as a dining hero banner is available.</Text>
        </View>
      )}
    </View>
  );
}

function CategoryTile({ category, width }) {
  return (
    <Press
      scale={0.97}
      onPress={() => router.push({ pathname: '/food/user/dining/[category]', params: { category: category.slug } })}
      accessibilityLabel={category.name}
      style={[styles.cat, { width }]}
    >
      <Text style={styles.catName} numberOfLines={2}>
        {category.name}
      </Text>
      <View style={styles.catImage}>
        {category.imageUrl ? (
          <Image source={{ uri: category.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        ) : (
          <UtensilsCrossed size={22} color={color.textDisabled} />
        )}
      </View>
    </Press>
  );
}

/** Port of pages/user/Dining.jsx — the Dining tab. */
export default function Dining() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [isTabActive, setIsTabActive] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setIsTabActive(true);
      return () => setIsTabActive(false);
    }, []),
  );

  const [heroSearch, setHeroSearch] = useState('');
  const [diningSearchOpen, setDiningSearchOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState(null);
  const [selectedCuisine, setSelectedCuisine] = useState(null);
  const { location } = useLocationHook();
  const { zoneId, loading: zoneLoading } = useZone(location);
  const { addFavorite, removeFavorite, isFavorite, vegMode, vegModeOption, userProfile } = useProfile();
  const onNavScroll = useFoodNavScroll();
  const scroller = useRef(null);

  const [categories, setCategories] = useState([]);
  const [restaurantList, setRestaurantList] = useState([]);
  const [loading, setLoading] = useState(true);
  const diningCacheKeyRef = useRef(null);
  const [diningHeroBanners, setDiningHeroBanners] = useState([]);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const resolveLocationForDining = useCallback(() => {
    const fromHook = location || {};
    const cityFromHook = String(fromHook?.city || '').trim();
    const hasValidHookCity = cityFromHook && cityFromHook.toLowerCase() !== 'current location';
    if (hasValidHookCity) return fromHook;
    try {
      const raw = localStore.getItem('userLocation');
      if (!raw) return fromHook;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? { ...fromHook, ...parsed } : fromHook;
    } catch {
      return fromHook;
    }
  }, [location]);

  useEffect(() => {
    if (!isTabActive) return undefined;
    const fetchDiningData = async () => {
      try {
        const activeLocation = resolveLocationForDining();
        const lat = Number(activeLocation?.latitude);
        const lng = Number(activeLocation?.longitude);
        const cityRaw = resolveServiceCity({
          locality: activeLocation?.city || '',
          formattedAddress: activeLocation?.formattedAddress || activeLocation?.address || '',
          fallback: String(activeLocation?.city || '').trim(),
        });
        const city = cityRaw && cityRaw.toLowerCase() !== 'current location' ? cityRaw : '';

        const restaurantParams = {};
        if (city) restaurantParams.city = city;
        if (zoneId) restaurantParams.zoneId = zoneId;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          restaurantParams.lat = lat;
          restaurantParams.lng = lng;
        }

        if (!zoneId) {
          setDiningHeroBanners([]);
          setCategories([]);
          setRestaurantList([]);
          setLoading(false);
          return;
        }

        const cacheKey = buildFoodCacheKey('dining', { zoneId, city: city || '' });
        diningCacheKeyRef.current = cacheKey;
        const cached = getFoodPageCache(cacheKey);

        if (isDiningCacheFresh(cached) && cached.restaurants) {
          setDiningHeroBanners(cached.banners || []);
          setCategories(cached.categories || []);
          setRestaurantList(cached.restaurants || []);
          setLoading(false);
          return;
        }

        if (cached?.restaurants?.length) {
          setDiningHeroBanners(cached.banners || []);
          setCategories(cached.categories || []);
          setRestaurantList(cached.restaurants || []);
          setLoading(false);
        } else {
          setLoading(true);
        }

        const [bannerResponse, cats, rests] = await Promise.all([
          diningAPI.getHeroBanners().catch(() => ({ data: { success: false, data: { banners: [] } } })),
          diningAPI.getCategories(),
          diningAPI.getRestaurants(restaurantParams),
        ]);

        const heroBanners = Array.isArray(bannerResponse?.data?.data?.banners)
          ? bannerResponse.data.data.banners
              .map((banner, index) => {
                const imageUrl = String(banner?.imageUrl || '').trim();
                if (!imageUrl) return null;
                return {
                  id: String(banner?._id || banner?.id || `dining-banner-${index}`),
                  imageUrl,
                  tagline: String(banner?.title || banner?.tagline || '').trim(),
                  promoCode: String(banner?.ctaText || banner?.promoCode || '').trim(),
                };
              })
              .filter(Boolean)
          : [];

        const nextCategories = cats?.data?.success ? cats.data.data || [] : [];
        const nextRestaurants = rests?.data?.success ? rests.data.data || [] : [];

        setDiningHeroBanners(heroBanners);
        setCategories(nextCategories);
        setRestaurantList(nextRestaurants);
        setFoodPageCache(cacheKey, { banners: heroBanners, categories: nextCategories, restaurants: nextRestaurants, ts: Date.now() });
      } catch {
        if (!getFoodPageCache(diningCacheKeyRef.current)?.restaurants?.length) {
          setDiningHeroBanners([]);
          setCategories([]);
          setRestaurantList([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDiningData();
    return undefined;
  }, [resolveLocationForDining, zoneId, isTabActive]);

  const safeCategories = useMemo(
    () =>
      (Array.isArray(categories) ? categories : [])
        .filter((category) => String(category?.name || '').trim().length > 0)
        .map((category) => ({
          ...category,
          name: String(category?.name || '').trim(),
          slug: String(category?.slug || category?.name || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
          imageUrl: String(category?.imageUrl || '').trim(),
        })),
    [categories],
  );

  const normalizedRestaurantList = useMemo(() => {
    return (Array.isArray(restaurantList) ? restaurantList : [])
      .filter((restaurant) => String(restaurant?.restaurantName || restaurant?.name || '').trim().length > 0)
      .sort((a, b) => {
        const aEnabled = a?.diningSettings?.isEnabled === true;
        const bEnabled = b?.diningSettings?.isEnabled === true;
        if (aEnabled && !bEnabled) return -1;
        if (!aEnabled && bEnabled) return 1;
        return 0;
      })
      .map((restaurant, index) => {
        const distanceKm = getDistanceKm(location, restaurant);
        const restaurantName = String(restaurant?.restaurantName || restaurant?.name || '').trim();
        return {
          ...restaurant,
          id: restaurant?._id || restaurant?.id || `restaurant-${index}`,
          name: restaurantName,
          slug: String(restaurant?.restaurantNameNormalized || '').trim() || slugifyValue(restaurantName),
          cuisine: Array.isArray(restaurant?.cuisines) && restaurant.cuisines.length > 0 ? restaurant.cuisines.join(', ') : 'Multi-cuisine',
          image: String(
            restaurant?.coverImages?.[0]?.url ||
              restaurant?.coverImages?.[0] ||
              restaurant?.coverImage ||
              restaurant?.menuImages?.[0]?.url ||
              restaurant?.menuImages?.[0] ||
              restaurant?.profileImage?.url ||
              restaurant?.profileImage ||
              '',
          ).trim(),
          offer: String(restaurant?.offer || 'Pre-book table').trim(),
          featuredDish: String(restaurant?.featuredDish || "Chef's special").trim(),
          featuredPrice: Number(restaurant?.featuredPrice || 0),
          rating: Number(restaurant?.rating || restaurant?.avgRating || 0),
          deliveryTime: String(
            restaurant?.estimatedDeliveryTime ||
              restaurant?.deliveryTime ||
              (restaurant?.estimatedDeliveryTimeMinutes ? `${restaurant.estimatedDeliveryTimeMinutes} mins` : '30-40 mins'),
          ).trim(),
          distanceValue: distanceKm,
          pureVegRestaurant: restaurant?.pureVegRestaurant === true || restaurant?.diningSettings?.pureVegRestaurant === true,
          hasNonVegMenu: restaurant?.hasNonVegMenu === true ? true : restaurant?.hasNonVegMenu === false ? false : undefined,
          isPureVeg: restaurant?.hasNonVegMenu === true ? false : restaurant?.isPureVeg === true || restaurant?.hasNonVegMenu === false,
          diningType: (() => {
            const rawType = restaurant?.diningSettings?.diningType;
            let types = [];
            if (Array.isArray(rawType)) types = rawType;
            else if (typeof rawType === 'string' && rawType.trim()) types = rawType.split(',');
            else if (restaurant?.categories && Array.isArray(restaurant.categories)) {
              types = restaurant.categories.map((c) => (typeof c === 'string' ? c : c.slug || c.name));
            }
            const uniqueTypes = Array.from(new Set(types.map((t) => slugifyValue(t)).filter(Boolean)));
            return uniqueTypes[0] || 'family-dining';
          })(),
          isEnabled: restaurant?.diningSettings?.isEnabled === true,
        };
      });
  }, [restaurantList, location]);

  const filteredCategories = useMemo(() => filterCategoriesForVegMode(safeCategories, vegMode), [safeCategories, vegMode]);

  const nearbyPopularRestaurants = useMemo(() => {
    const within10Km = normalizedRestaurantList.filter((restaurant) => Number.isFinite(restaurant.distanceValue) && restaurant.distanceValue <= 10).sort((a, b) => a.distanceValue - b.distanceValue);
    return within10Km.length > 0 ? within10Km : normalizedRestaurantList;
  }, [normalizedRestaurantList]);

  const toggleFilter = (filterId) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filterId)) next.delete(filterId);
      else next.add(filterId);
      return next;
    });
  };

  const filteredRestaurants = useMemo(() => {
    let filtered = nearbyPopularRestaurants.filter((restaurant) => restaurant?.diningSettings?.isEnabled === true);

    // Pure veg mode: only restaurants with no non-veg menu (full menu scan from API)
    if (vegMode && vegModeOption === 'pure-veg') {
      filtered = filtered.filter((restaurant) => {
        if (restaurant?.hasNonVegMenu === true) return false;
        if (restaurant?.isPureVeg === true) return true;
        if (restaurant?.hasNonVegMenu === false) return true;
        return restaurant?.pureVegRestaurant === true || restaurant?.diningSettings?.pureVegRestaurant === true;
      });
    }

    const minutes = (r) => {
      const timeMatch = String(r.deliveryTime || '').match(/(\d+)/);
      return timeMatch ? parseInt(timeMatch[1], 10) : null;
    };
    if (activeFilters.has('delivery-under-30')) filtered = filtered.filter((r) => minutes(r) != null && minutes(r) <= 30);
    if (activeFilters.has('delivery-under-45')) filtered = filtered.filter((r) => minutes(r) != null && minutes(r) <= 45);
    if (activeFilters.has('distance-under-1km')) filtered = filtered.filter((r) => (r.distanceValue || 0) <= 1.0);
    if (activeFilters.has('distance-under-2km')) filtered = filtered.filter((r) => (r.distanceValue || 0) <= 2.0);
    if (activeFilters.has('rating-35-plus')) filtered = filtered.filter((r) => r.rating >= 3.5);
    if (activeFilters.has('rating-4-plus')) filtered = filtered.filter((r) => r.rating >= 4.0);
    if (activeFilters.has('rating-45-plus')) filtered = filtered.filter((r) => r.rating >= 4.5);

    if (selectedCuisine) filtered = filtered.filter((r) => r.cuisine.toLowerCase().includes(selectedCuisine.toLowerCase()));

    // Search query (restaurant name only)
    if (heroSearch.trim()) {
      const q = heroSearch.trim().toLowerCase();
      filtered = filtered.filter((r) => String(r.name || r.restaurantName || '').toLowerCase().includes(q));
    }

    if (sortBy === 'rating-high') filtered.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'rating-low') filtered.sort((a, b) => a.rating - b.rating);

    return filtered;
  }, [nearbyPopularRestaurants, activeFilters, selectedCuisine, sortBy, heroSearch, vegMode, vegModeOption]);

  const diningSearchQuery = heroSearch.trim();
  const isDiningSearching = diningSearchQuery.length > 0;
  const showPageSkeleton = (loading || zoneLoading) && !isDiningSearching;
  const showDiningSearchEmpty = isDiningSearching && !loading && filteredRestaurants.length === 0;

  useEffect(() => {
    if (!isDiningSearching) return;
    scroller.current?.scrollTo({ y: 0, animated: true });
  }, [isDiningSearching, diningSearchQuery]);

  const searchHeight = useAnimatedValue(0);
  useEffect(() => {
    Animated.spring(searchHeight, { toValue: diningSearchOpen ? 1 : 0, stiffness: 380, damping: 32, mass: 0.82, useNativeDriver: false }).start();
  }, [diningSearchOpen, searchHeight]);

  const closeSearch = () => {
    setHeroSearch('');
    setDiningSearchOpen(false);
  };

  const openRestaurant = (restaurant) => {
    const restaurantSlug = restaurant.slug || encodeURIComponent(restaurant.name);
    navigateTo(`/food/user/dining/${restaurant.diningType}/${restaurantSlug}`, { state: { restaurant } });
  };

  const toggleFavoriteFor = (restaurant) => {
    const restaurantSlug = restaurant.slug || encodeURIComponent(restaurant.name);
    if (isFavorite(restaurantSlug)) {
      removeFavorite(restaurantSlug);
    } else {
      addFavorite({
        slug: restaurantSlug,
        name: restaurant.name,
        cuisine: restaurant.cuisine,
        rating: restaurant.rating,
        deliveryTime: restaurant.deliveryTime,
        distance: restaurant.distance,
        image: restaurant.image,
      });
    }
  };

  const gridWidth = screenWidth - space.lg * 2;
  const tileWidth = Math.floor((gridWidth - space.md * 2) / 3);
  const avatarUri = !avatarFailed && userProfile?.profileImage ? userProfile.profileImage : null;
  const bannerHeight = Math.round(screenHeight * 0.24);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.kicker}>Table booking</Text>
            <Text style={styles.title} accessibilityRole="header">
              Dining
            </Text>
          </View>
          <IconButton
            icon={Search}
            label="Search dining restaurants"
            variant={diningSearchOpen ? 'solid' : 'primary'}
            onPress={() => setDiningSearchOpen(true)}
          />
          <IconButton icon={Wallet} label="Wallet" variant="primary" onPress={() => goIfSignedIn('/food/user/wallet', { from: '/food/user' })} />
          <Press scale={0.95} onPress={() => goIfSignedIn('/food/user/profile', { from: '/food/user/dining' })} accessibilityLabel="Profile" style={styles.avatar}>
            <Image source={avatarUri ? { uri: avatarUri } : PROFILE_AVATAR} onError={() => setAvatarFailed(true)} style={{ width: '100%', height: '100%' }} />
          </Press>
        </View>

        <Animated.View style={{ overflow: 'hidden', opacity: searchHeight, height: searchHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 60] }) }}>
          <View style={styles.searchBox}>
            <Search size={18} color={color.textMuted} strokeWidth={2.25} />
            {diningSearchOpen ? (
              <TextInput
                autoFocus
                value={heroSearch}
                onChangeText={setHeroSearch}
                placeholder="Search dining restaurants..."
                placeholderTextColor={color.textMuted}
                returnKeyType="search"
                autoCorrect={false}
                accessibilityLabel="Search dining restaurants"
                style={styles.searchInput}
              />
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {heroSearch ? <IconButton icon={X} iconSize={16} label="Clear search" size={36} onPress={() => setHeroSearch('')} /> : null}
            <IconButton icon={X} iconSize={18} label="Close search" variant="primary" size={36} onPress={closeSearch} />
          </View>
        </Animated.View>
      </View>

      <ScrollView
        ref={scroller}
        onScroll={onNavScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + FOOD_PILL_CLEARANCE + insets.bottom }}
      >
        {!isDiningSearching ? (
          <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg }}>
            {showPageSkeleton ? <Skeleton style={{ height: bannerHeight, borderRadius: radii.xl, backgroundColor: color.surfaceMuted }} /> : <HeroBanner banners={diningHeroBanners} active={isTabActive} height={bannerHeight} />}
          </View>
        ) : null}

        <View style={{ paddingHorizontal: space.lg, paddingTop: isDiningSearching ? space.lg : space.xxl }}>
          {showPageSkeleton ? (
            <>
              {!isDiningSearching ? (
                <View style={styles.grid}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <CategorySkeleton key={`category-skeleton-${i}`} width={tileWidth} />
                  ))}
                </View>
              ) : null}
              <View style={{ marginTop: isDiningSearching ? 0 : space.xxl }}>
                {!isDiningSearching ? <Skeleton style={{ height: 22, width: 224, maxWidth: '70%', borderRadius: radii.sm, marginBottom: space.lg, backgroundColor: color.surfaceMuted }} /> : null}
                <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.lg, overflow: 'hidden' }}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={`filter-skeleton-${i}`} style={{ height: 38, width: i === 0 ? 90 : i % 2 === 0 ? 122 : 108, borderRadius: radii.pill, backgroundColor: color.surfaceMuted }} />
                  ))}
                </View>
                <View style={{ gap: space.md }}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <RestaurantSkeleton key={`restaurant-skeleton-${i}`} />
                  ))}
                </View>
              </View>
            </>
          ) : (
            <>
              {!isDiningSearching ? (
                <View style={styles.grid}>
                  {filteredCategories.map((category) => (
                    <CategoryTile key={category._id || category.id || category.slug} category={category} width={tileWidth} />
                  ))}
                </View>
              ) : null}

              <View style={{ marginTop: isDiningSearching || filteredCategories.length === 0 ? 0 : space.xxl }}>
                {!showDiningSearchEmpty ? (
                  <View style={{ marginBottom: space.md }}>
                    <SectionHeader title={isDiningSearching ? 'Search results' : 'Popular within 10 km'} style={{ marginBottom: space.sm }} />
                    {!isDiningSearching ? <StatusBadge label={`${filteredRestaurants.length} nearby ${filteredRestaurants.length === 1 ? 'place' : 'places'}`} tone="primary" /> : null}
                    {isDiningSearching && filteredRestaurants.length > 0 ? (
                      <StatusBadge label={`${filteredRestaurants.length} result${filteredRestaurants.length === 1 ? '' : 's'}`} tone="primary" />
                    ) : null}
                  </View>
                ) : null}

                {!isDiningSearching ? (
                  <View style={{ marginHorizontal: -space.lg }}>
                    <DiningFilterChips activeFilters={activeFilters} toggleFilter={toggleFilter} onOpenFilters={() => setIsFilterOpen(true)} />
                  </View>
                ) : null}

                {showDiningSearchEmpty ? (
                  <EmptyState icon={Search} title={`No dining restaurants found for "${diningSearchQuery}"`} message="Search by restaurant name only" />
                ) : filteredRestaurants.length === 0 ? (
                  <View style={styles.none}>
                    <EmptyState icon={UtensilsCrossed} title="No restaurants nearby" message="No popular dining restaurants were found within 10 km for the current location." style={{ paddingVertical: space.xxxl }} />
                  </View>
                ) : (
                  <View style={{ gap: space.md }}>
                    {filteredRestaurants.map((restaurant, index) => {
                      const restaurantSlug = restaurant.slug || encodeURIComponent(restaurant.name);
                      return (
                        <DiningRestaurantCard
                          key={restaurant._id || restaurant.id}
                          restaurant={restaurant}
                          first={index < 2}
                          favorite={isFavorite(restaurantSlug)}
                          onToggleFavorite={() => toggleFavoriteFor(restaurant)}
                          onPress={() => openRestaurant(restaurant)}
                        />
                      );
                    })}
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <DiningFilterModal
        visible={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        activeFilters={activeFilters}
        toggleFilter={toggleFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        selectedCuisine={selectedCuisine}
        setSelectedCuisine={setSelectedCuisine}
        resultCount={filteredRestaurants.length}
        vegMode={vegMode}
        onClear={() => {
          setActiveFilters(new Set());
          setSortBy(null);
          setSelectedCuisine(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  header: { backgroundColor: color.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, paddingTop: space.sm, paddingBottom: space.sm, paddingHorizontal: space.lg, zIndex: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  kicker: { ...type.overline, color: color.goldText },
  title: { ...type.heading, color: color.text },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: color.gold, backgroundColor: color.goldSoft, overflow: 'hidden' },
  searchBox: { marginTop: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.surfaceMuted, borderRadius: radii.md, borderWidth: 1, borderColor: color.primary, paddingLeft: space.md, paddingRight: space.xs, height: 48 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 0, ...type.body, color: color.text },

  hero: { width: '100%', borderRadius: radii.xl, overflow: 'hidden', backgroundColor: color.primaryDeep, ...elevation.card },
  heroCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.xxxl, paddingBottom: space.xxxl },
  heroPromo: { ...type.overline, color: color.goldOnDark },
  heroTagline: { marginTop: space.xs, ...type.heading, color: color.textInverse },
  heroDots: { position: 'absolute', bottom: space.md, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.xs + 2, borderRadius: radii.pill, backgroundColor: color.overlay },
  heroDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  heroDotActive: { width: 20, backgroundColor: color.goldOnDark },
  heroEmpty: { flex: 1, justifyContent: 'flex-end', padding: space.xl, gap: space.xs },
  heroEmptyIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  heroEmptyKicker: { ...type.overline, color: color.goldOnDark },
  heroEmptyTitle: { ...type.heroSerif, color: color.textInverse },
  heroEmptyBody: { ...type.small, color: color.textOnDarkMuted, maxWidth: 300 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cat: { height: 120, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, padding: space.sm + 2, overflow: 'hidden', ...elevation.card },
  catName: { ...type.label, color: color.text, marginBottom: space.xs },
  catImage: { flex: 1, overflow: 'hidden', borderRadius: radii.md, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  rSk: { borderRadius: radii.lg, backgroundColor: color.surface, overflow: 'hidden', borderWidth: 1, borderColor: color.border },

  none: { borderRadius: radii.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, backgroundColor: color.surface },
});
