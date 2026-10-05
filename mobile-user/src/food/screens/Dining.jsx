import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Wallet, X } from 'lucide-react-native';
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
import { poppins, shadow, tw } from '../../theme';
import { DiningFilterChips, DiningFilterModal } from '../components/dining/DiningFilters';
import { DiningRestaurantCard } from '../components/dining/DiningCards';
import { F, useFoodNavScroll } from '../components/shell';

const DINING_CACHE_TTL_MS = 15 * 60 * 1000;
const BANNER_AUTO_SLIDE_MS = 3500;
const PROFILE_AVATAR = require('../../../assets/food/profile_avatar.webp');

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
    <View style={[styles.catSk, { width }]}>
      <View style={{ padding: 10 }}>
        <Skeleton style={{ height: 12, width: 64, borderRadius: 6, backgroundColor: '#f0dcca' }} />
        <Skeleton style={{ height: 16, width: 96, borderRadius: 8, marginTop: 12, backgroundColor: '#ead2bc' }} />
        <Skeleton style={{ height: 16, width: 80, borderRadius: 8, marginTop: 8, backgroundColor: '#f3e3d4' }} />
      </View>
      <View style={styles.catSkBottom} />
    </View>
  );
}

function RestaurantSkeleton() {
  return (
    <View style={styles.rSk}>
      <Skeleton style={{ height: 176, borderRadius: 0, backgroundColor: '#fcf6fa' }} />
      <View style={{ padding: 16, gap: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Skeleton style={{ height: 20, width: 160, borderRadius: 10, backgroundColor: '#ead8c8' }} />
            <Skeleton style={{ height: 16, width: 96, borderRadius: 8, marginTop: 8, backgroundColor: '#f2e7dd' }} />
          </View>
          <Skeleton style={{ height: 32, width: 48, borderRadius: 8, backgroundColor: '#d7efe0' }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Skeleton style={{ height: 16, width: 16, borderRadius: 8, backgroundColor: '#efe2d7' }} />
          <Skeleton style={{ height: 16, width: 96, borderRadius: 8, backgroundColor: '#efe2d7' }} />
          <Skeleton style={{ height: 16, width: 16, borderRadius: 8, backgroundColor: '#f5ece4' }} />
          <Skeleton style={{ height: 16, width: 80, borderRadius: 8, backgroundColor: '#f5ece4' }} />
        </View>
        <Skeleton style={{ height: 16, width: 192, borderRadius: 8, backgroundColor: '#f0e1d3' }} />
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
                <View style={styles.heroCaption}>
                  <View style={{ maxWidth: '75%', paddingHorizontal: 12, paddingVertical: 12 }}>
                    {banner.promoCode ? <Text style={styles.heroPromo}>{banner.promoCode}</Text> : null}
                    {banner.tagline ? <Text style={styles.heroTagline}>{banner.tagline}</Text> : null}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
          {count > 1 ? (
            <View style={styles.heroDots}>
              {banners.map((banner, i) => (
                <Press
                  key={`${banner.id}-dot`}
                  scale={1}
                  hitSlop={6}
                  onPress={() => goTo(i)}
                  accessibilityLabel={`Go to dining banner ${i + 1}`}
                  style={[styles.heroDot, index === i ? styles.heroDotActive : null]}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <LinearGradient colors={['#fff5e8', '#fffdf9', '#ffe3cf']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
          <View style={styles.heroEmpty}>
            <Text style={styles.heroEmptyKicker}>DINING</Text>
            <Text style={styles.heroEmptyTitle}>Fresh dining picks near you</Text>
            <Text style={styles.heroEmptyBody}>Banner will appear here as soon as a dining hero banner is available.</Text>
          </View>
        </LinearGradient>
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
      <Text style={styles.catName}>{category.name}</Text>
      <View style={styles.catImage}>
        {category.imageUrl ? (
          <Image source={{ uri: category.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        ) : (
          <LinearGradient colors={['#fff7ee', '#fff1e1']} style={StyleSheet.absoluteFill}>
            <View style={styles.catFallback} />
          </LinearGradient>
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

  const gridWidth = screenWidth - 24;
  const tileWidth = Math.floor((gridWidth - 20) / 3);
  const avatarUri = !avatarFailed && userProfile?.profileImage ? userProfile.profileImage : null;
  const bannerHeight = Math.round(screenHeight * 0.24);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headRow}>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.kicker}>TABLE BOOKING</Text>
            <Text style={styles.title} accessibilityRole="header">
              Dining
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Press
              scale={0.95}
              onPress={() => setDiningSearchOpen(true)}
              accessibilityLabel="Search dining restaurants"
              style={[styles.searchBtn, diningSearchOpen ? { backgroundColor: '#fff', borderWidth: 0 } : { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }]}
            >
              <Search size={20} color={diningSearchOpen ? F.green : '#fff'} strokeWidth={2.5} />
            </Press>
            <Press scale={0.9} onPress={() => goIfSignedIn('/food/user/wallet', { from: '/food/user' })} accessibilityLabel="Wallet" style={styles.walletBtn}>
              <Wallet size={18} color="#fff" strokeWidth={2} />
            </Press>
            <Press scale={0.95} onPress={() => goIfSignedIn('/food/user/profile', { from: '/food/user/dining' })} accessibilityLabel="Profile" style={styles.avatar}>
              <Image source={avatarUri ? { uri: avatarUri } : PROFILE_AVATAR} onError={() => setAvatarFailed(true)} style={{ width: '100%', height: '100%' }} />
            </Press>
          </View>
        </View>

        <Animated.View style={{ overflow: 'hidden', opacity: searchHeight, height: searchHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 56] }) }}>
          <View style={styles.searchBox}>
            <Search size={16} color={F.green} strokeWidth={2.5} style={{ marginLeft: 8 }} />
            {diningSearchOpen ? (
              <TextInput
                autoFocus
                value={heroSearch}
                onChangeText={setHeroSearch}
                placeholder="Search dining restaurants..."
                placeholderTextColor={tw.gray400}
                returnKeyType="search"
                autoCorrect={false}
                accessibilityLabel="Search dining restaurants"
                style={styles.searchInput}
              />
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {heroSearch ? (
              <Press scale={0.9} onPress={() => setHeroSearch('')} accessibilityLabel="Clear search" style={[styles.searchX, { backgroundColor: 'rgba(229,231,235,0.9)' }]}>
                <X size={14} color={tw.gray500} strokeWidth={2.5} />
              </Press>
            ) : null}
            <Press scale={0.9} onPress={closeSearch} accessibilityLabel="Close search" style={[styles.searchX, { backgroundColor: 'rgba(10,77,43,0.1)' }]}>
              <X size={16} color={F.green} strokeWidth={2.5} />
            </Press>
          </View>
        </Animated.View>
      </View>

      <ScrollView
        ref={scroller}
        onScroll={onNavScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 176 + insets.bottom }}
      >
        {!isDiningSearching ? (
          <View style={{ paddingHorizontal: 12, paddingTop: 20, paddingBottom: 12 }}>
            {showPageSkeleton ? <Skeleton style={{ height: bannerHeight, borderRadius: 22, ...shadow('lg') }} /> : <HeroBanner banners={diningHeroBanners} active={isTabActive} height={bannerHeight} />}
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 12, paddingTop: isDiningSearching ? 8 : 12, paddingBottom: 16 }}>
          {showPageSkeleton ? (
            <>
              {!isDiningSearching ? (
                <View style={styles.grid}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <CategorySkeleton key={`category-skeleton-${i}`} width={tileWidth} />
                  ))}
                </View>
              ) : null}
              <View style={{ marginBottom: 16, marginTop: isDiningSearching ? 0 : 16 }}>
                {!isDiningSearching ? (
                  <View style={{ marginBottom: 24, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Skeleton style={{ height: 32, width: 4, borderRadius: 2, backgroundColor: '#f0dcca' }} />
                    <Skeleton style={{ height: 28, width: 224, maxWidth: '70%', borderRadius: 14, backgroundColor: '#ead8c8' }} />
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4, marginBottom: 16, overflow: 'hidden' }}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={`filter-skeleton-${i}`} style={{ height: 32, width: i === 0 ? 90 : i % 2 === 0 ? 122 : 108, borderRadius: 6, borderWidth: 1, borderColor: '#efe3d7', backgroundColor: '#fff7f1' }} />
                  ))}
                </View>
                <View style={{ gap: 16 }}>
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

              <View style={{ marginBottom: 16, marginTop: isDiningSearching ? 0 : 16 }}>
                {!showDiningSearchEmpty ? (
                  <View style={{ marginBottom: 24, paddingHorizontal: 4, gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={styles.bar} />
                      <Text style={styles.sectionTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} accessibilityRole="header">
                        {isDiningSearching ? 'Search Results' : 'Popular Restaurants Within 10km'}
                      </Text>
                    </View>
                    {!isDiningSearching ? (
                      <View style={styles.countPill}>
                        <Text style={styles.countText}>{filteredRestaurants.length} NEARBY PLACES</Text>
                      </View>
                    ) : null}
                    {isDiningSearching && filteredRestaurants.length > 0 ? (
                      <View style={styles.countPill}>
                        <Text style={styles.countText}>
                          {filteredRestaurants.length} RESULT{filteredRestaurants.length === 1 ? '' : 'S'}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {!isDiningSearching ? (
                  <View style={{ marginHorizontal: -12 }}>
                    <DiningFilterChips activeFilters={activeFilters} toggleFilter={toggleFilter} onOpenFilters={() => setIsFilterOpen(true)} />
                  </View>
                ) : null}

                {showDiningSearchEmpty ? (
                  <View style={styles.empty}>
                    <View style={styles.emptyIcon}>
                      <Search size={28} color={tw.gray300} />
                    </View>
                    <Text style={styles.emptyTitle}>No dining restaurants found for &quot;{diningSearchQuery}&quot;</Text>
                    <Text style={styles.emptyBody}>Search by restaurant name only</Text>
                  </View>
                ) : filteredRestaurants.length === 0 ? (
                  <View style={styles.none}>
                    <Text style={styles.noneText}>No popular dining restaurants were found within 10 km for the current location.</Text>
                  </View>
                ) : (
                  <View style={{ gap: 16 }}>
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
  page: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: F.greenDark, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, borderBottomWidth: 2, borderBottomColor: 'rgba(255,255,255,0.2)', paddingTop: 12, paddingBottom: 14, paddingHorizontal: 16, zIndex: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { fontSize: 10, lineHeight: 15, letterSpacing: 2, color: tw.gray200, ...poppins(700) },
  title: { fontSize: 20, lineHeight: 28, color: '#fff', ...poppins(700) },
  searchBtn: { padding: 10, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  walletBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#fff', backgroundColor: '#FFF5E6', overflow: 'hidden' },
  searchBox: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tw.gray50, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, padding: 8, height: 44 },
  searchInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 0, fontSize: 13, color: tw.gray700, ...poppins(700) },
  searchX: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  hero: { width: '100%', borderRadius: 22, overflow: 'hidden', backgroundColor: '#fff', ...shadow('lg') },
  heroCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 },
  heroPromo: { fontSize: 11, lineHeight: 16, letterSpacing: 3.3, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', ...poppins(600) },
  heroTagline: { marginTop: 8, fontSize: 18, lineHeight: 22, color: '#fff', ...poppins(700) },
  heroDots: { position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.25)' },
  heroDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  heroDotActive: { width: 20, backgroundColor: '#fff' },
  heroEmpty: { position: 'absolute', left: 24, bottom: 24, maxWidth: '70%' },
  heroEmptyKicker: { fontSize: 11, lineHeight: 16, letterSpacing: 3.7, color: '#b46f37', ...poppins(600) },
  heroEmptyTitle: { marginTop: 8, fontSize: 24, lineHeight: 32, color: '#2e1d11', ...poppins(900) },
  heroEmptyBody: { marginTop: 8, fontSize: 14, lineHeight: 20, color: '#6d5744', ...poppins(500) },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cat: { height: 114, borderRadius: 22, borderWidth: 1, borderColor: '#ece5dc', backgroundColor: '#fdfaf8', padding: 10, overflow: 'hidden' },
  catName: { fontSize: 12, lineHeight: 15, letterSpacing: -0.3, color: '#2d2722', marginBottom: 4, ...poppins(700) },
  catImage: { flex: 1, overflow: 'hidden', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.4)' },
  catFallback: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', borderTopLeftRadius: 999, borderTopRightRadius: 999, backgroundColor: 'rgba(255,255,255,0.3)' },
  catSk: { height: 114, borderRadius: 22, borderWidth: 1, borderColor: '#efe2d3', backgroundColor: '#fdfafc', overflow: 'hidden', ...shadow('0 1px 2px rgba(60,15,61,0.05)') },
  catSkBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '64%', borderBottomLeftRadius: 18, borderBottomRightRadius: 18, backgroundColor: '#f8eef5' },
  rSk: { borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden', borderWidth: 1, borderColor: '#efe2d3', ...shadow('md') },

  bar: { height: 32, width: 4, borderRadius: 2, backgroundColor: '#ef4f5f', ...shadow('0 0 10px rgba(239,79,95,0.4)') },
  sectionTitle: { flex: 1, fontSize: 20, lineHeight: 28, letterSpacing: -0.5, color: tw.gray900, ...poppins(900) },
  countPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red100, borderRadius: 999, ...shadow('sm') },
  countText: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: '#ef4f5f', ...poppins(900) },

  empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 24 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, lineHeight: 24, color: tw.gray800, textAlign: 'center', ...poppins(700) },
  emptyBody: { fontSize: 14, lineHeight: 20, color: tw.gray500, textAlign: 'center', marginTop: 6, maxWidth: 320, ...poppins(400) },
  none: { borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#eadfce', backgroundColor: '#fffaf4', paddingHorizontal: 24, paddingVertical: 48 },
  noneText: { fontSize: 14, lineHeight: 20, color: tw.gray500, textAlign: 'center', ...poppins(500) },
});
