import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgePercent, Bookmark, Check, ChefHat, ChevronRight, MapPin, Plus, Tag, Search, ShoppingBag, ShoppingCart, SlidersHorizontal, UtensilsCrossed, X } from 'lucide-react-native';
import Image from '../../components/Img';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { adminAPI, publicGetOnce, restaurantAPI } from '../../api/food';
import { useProfile } from '../context/ProfileContext';
import { useCart } from '../context/CartContext';
import { useLocation } from '../hooks/useLocation';
import { useZone } from '../hooks/useZone';
import { foodImages } from '../constants/images';
import { isNonVegCategoryScope } from '../utils/vegMode';
import { getRestaurantAvailabilityStatus } from '../utils/restaurantAvailability';
import { compareRestaurantsByAvailabilityAndDistance } from '../utils/restaurantBrowseSort';
import { normalizeImageUrl as normalizeServerImageUrl } from '../utils/common';
import { getRestaurantRouteId, toFoodUserPath } from '../utils/mainTabRoutes';
import { getCachedExploreIcons, isExploreIconsCacheFresh, preloadImageUrls, setCachedExploreIcons } from '../utils/foodPageCache';
import { API_ORIGIN } from '../../api/client';
import { localStore, sessionStore } from '../../lib/storage';
import { toast } from '../../lib/notify';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { color, elevation, radii, space, type } from '../../theme';
import { Button, Chip, ChipRow, EmptyState, SectionHeader } from '../../components/ds';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import HomeHeader, { ProfileAvatar, SearchPill, VegModeToggle } from '../components/home/HomeHeader';
import FilterSheet from '../components/home/FilterSheet';
import { ApplyingVegOverlay, SwitchOffVegDialog, SwitchingOffVegOverlay, VegModePopup } from '../components/home/VegMode';
import { RecommendedCard, RestaurantCard, couponsForRestaurant, restaurantSlugOf } from '../components/RestaurantCard';
import { StickyCartCard, useFoodNavScroll, useLocationSelector } from '../components/shell';
import OrderTrackingCard from '../components/OrderTrackingCard';

const HERO_BANNER_AUTO_SLIDE_MS = 3500;
// Height of the floating Delivery / Takeaway / Under 250 / Dining pill (FoodShell) above the app nav.
const FOOD_TABS_HEIGHT = 72;
const RESTAURANTS_BATCH_SIZE = 9;
const HOME_CATEGORIES_CACHE_KEY = 'food_home_categories_v2';

const getSessionCache = (key) => {
  try {
    const cached = sessionStore.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};
const setSessionCache = (key, data) => {
  try {
    sessionStore.setItem(key, JSON.stringify(data));
  } catch {}
};

let HOME_RESTAURANTS_CACHE = null;
let HOME_CATEGORIES_CACHE = null;
let cachesRead = false;
const readCaches = () => {
  if (cachesRead) return;
  cachesRead = true;
  HOME_RESTAURANTS_CACHE = getSessionCache('food_home_restaurants');
  HOME_CATEGORIES_CACHE = getSessionCache(HOME_CATEGORIES_CACHE_KEY);
};

/*
 * The web bundles four PNG fallbacks for the explore tiles, but those files are
 * damaged in the repository (line-ending conversion) and do not decode, so a
 * tile without an admin icon draws the matching line icon instead.
 */
const EXPLORE_FALLBACK_ICONS = { 'under-250': Tag, offers: BadgePercent, gourmet: ChefHat, collection: Bookmark };

const placeholders = ['Search "burger"', 'Search "biryani"', 'Search "pizza"', 'Search "desserts"', 'Search "chinese"', 'Search "thali"', 'Search "momos"', 'Search "dosa"'];

const QUICK_FILTERS = [
  { id: 'delivery-under-30', label: 'Under 30 mins' },
  { id: 'delivery-under-45', label: 'Under 45 mins' },
  { id: 'distance-under-1km', label: 'Under 1km', icon: MapPin },
  { id: 'distance-under-2km', label: 'Under 2km', icon: MapPin },
];

const src = (value) => (typeof value === 'string' ? { uri: value } : value);

const getRestaurantDisplayName = (restaurant) => {
  const nameCandidates = [restaurant?.name, restaurant?.restaurantName, restaurant?.restaurantName?.english, restaurant?.restaurantName?.value, restaurant?.onboarding?.step1?.restaurantName];
  const resolvedName = nameCandidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);
  return resolvedName ? resolvedName.trim() : 'Restaurant';
};

const slugifyCategory = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const normalizeImageUrl = (imageUrl) => normalizeServerImageUrl(imageUrl, API_ORIGIN);

const extractImageFromValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return normalizeImageUrl(value);
  if (typeof value === 'object') {
    const candidate = value.url || value.secure_url || value.imageUrl || value.imageURL || value.image || value.src || value.path || value.location || value.link || value.href || '';
    return typeof candidate === 'string' ? normalizeImageUrl(candidate) : '';
  }
  return '';
};
const buildRestaurantImageCandidates = (value) => {
  const normalized = extractImageFromValue(value);
  return normalized ? [normalized] : [];
};
const extractImages = (source) => {
  if (!source) return [];
  const normalizedImages = (Array.isArray(source) ? source.flatMap((entry) => buildRestaurantImageCandidates(entry)) : buildRestaurantImageCandidates(source))
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);
  return normalizedImages.filter((value, index) => normalizedImages.indexOf(value) === index);
};

/** `via-white/30 skew-x-[-20deg]` sheen that sweeps across a tile. */
function Glint({ duration = 2000, repeatDelay = 3000, opacity = 0.4 }) {
  const x = useAnimatedValue(0);
  const [w, setW] = useState(0);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([Animated.timing(x, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }), Animated.delay(repeatDelay)]),
    );
    loop.start();
    return () => loop.stop();
  }, [x, duration, repeatDelay]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? (
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: w * 1.5, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-w * 3, w * 3] }) }, { skewX: '-20deg' }] }}>
          <LinearGradient colors={['transparent', `rgba(255,255,255,${opacity})`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function Pulse({ style }) {
  const v = useAnimatedValue(1);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([Animated.timing(v, { toValue: 0.5, duration: 1000, useNativeDriver: true }), Animated.timing(v, { toValue: 1, duration: 1000, useNativeDriver: true })]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[{ backgroundColor: color.surfaceMuted, opacity: v }, style]} />;
}

function RestaurantSkeleton() {
  return (
    <View style={styles.skCard}>
      <Pulse style={{ height: 196 }} />
      <View style={{ padding: space.lg, gap: space.md }}>
        <Pulse style={{ height: 18, width: '75%', borderRadius: radii.sm }} />
        <Pulse style={{ height: 14, width: '55%', borderRadius: radii.sm }} />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Pulse style={{ height: 14, width: 64, borderRadius: radii.sm }} />
          <Pulse style={{ height: 14, width: 96, borderRadius: radii.sm }} />
        </View>
      </View>
    </View>
  );
}

/** Explore-more tile image: the admin's icon, or the bundled one if it fails. */
function ExploreIconImage({ image, id }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  if (typeof image === 'string' && image && !failed) {
    return <Image source={{ uri: image }} onError={() => setFailed(true)} style={{ width: '100%', height: '100%', borderRadius: radii.sm }} resizeMode="contain" />;
  }
  const Icon = EXPLORE_FALLBACK_ICONS[id] || Tag;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={26} color={color.primary} strokeWidth={1.75} />
    </View>
  );
}

/** Admin hero banners: auto-sliding, swipeable, with dots at the bottom right. */
function HeroBanner({ images, banners, zoneId, active }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scroller = useRef(null);
  const touching = useRef(false);
  const count = images.length;

  useEffect(() => {
    setIndex(0);
    scroller.current?.scrollTo({ x: 0, animated: false });
  }, [count]);

  useEffect(() => {
    if (count <= 1 || !width || !active) return undefined;
    const timer = setInterval(() => {
      if (touching.current) return;
      setIndex((prev) => {
        const next = (prev + 1) % count;
        scroller.current?.scrollTo({ x: next * width, animated: next !== 0 });
        return next;
      });
    }, HERO_BANNER_AUTO_SLIDE_MS);
    return () => clearInterval(timer);
  }, [count, width, active]);

  const open = (i) => {
    const allLinked = banners[i]?.linkedRestaurants || [];
    const linked = zoneId ? allLinked.filter((r) => !r.zoneId || String(r.zoneId) === String(zoneId)) : allLinked;
    if (linked.length === 0) return;
    const first = linked[0];
    const restaurantId = getRestaurantRouteId(first) || first.restaurantId || first._id;
    if (restaurantId) router.push({ pathname: '/food/user/restaurants/[slug]', params: { slug: String(restaurantId) } });
  };

  return (
    <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.lg }}>
      <View style={styles.hero} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
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
          {images.map((image, i) => (
            <Press key={`${i}-${image}`} scale={1} onPress={() => open(i)} accessibilityRole="imagebutton" accessibilityLabel={`Open hero banner ${i + 1}`} style={{ width: width || 1, height: '100%' }}>
              <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </Press>
          ))}
        </ScrollView>
        <Glint duration={2500} repeatDelay={5000} opacity={0.3} />
        {count > 1 ? (
          <View style={styles.heroDots}>
            {images.map((_, i) => (
              <Press
                key={i}
                scale={1}
                hitSlop={6}
                onPress={() => {
                  setIndex(i);
                  scroller.current?.scrollTo({ x: i * width, animated: true });
                }}
                accessibilityLabel={`Go to banner ${i + 1}`}
                style={[styles.heroDot, index === i ? styles.heroDotActive : null]}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function CategoryRail({ categories, sticky }) {
  const size = sticky ? 56 : 72;
  const itemWidth = sticky ? 72 : 84;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={sticky ? styles.railSticky : styles.rail}>
      {categories.slice(0, 12).map((category, index) => (
        <Press
          key={`${sticky ? 'sticky-' : ''}${category.id || index}`}
          scale={0.95}
          onPress={() => router.push({ pathname: '/food/user/category/[category]', params: { category: category.slug || slugifyCategory(category.name) } })}
          accessibilityLabel={`${category.name} category`}
          style={[styles.catItem, { width: itemWidth }]}
        >
          <View style={[styles.catCircle, { width: size, height: size, borderRadius: size / 2 }]}>
            <Image source={src(category.image)} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            {!sticky ? <Glint duration={2000} repeatDelay={3000 + index * 500} /> : null}
          </View>
          <Text numberOfLines={1} style={styles.catName}>
            {category.name}
          </Text>
        </Press>
      ))}
      {categories.length > 0 ? (
        <Press scale={0.95} onPress={() => router.push('/food/user/categories')} accessibilityLabel="See all categories" style={[styles.catItem, { width: itemWidth }]}>
          <View style={[styles.catCircle, styles.catAll, { width: size, height: size, borderRadius: size / 2 }]}>
            <UtensilsCrossed size={sticky ? 22 : 26} color={color.primary} />
          </View>
          <View style={styles.catAllLabel}>
            <Text numberOfLines={1} style={[styles.catName, { color: color.primary }]}>See all</Text>
            <ChevronRight size={14} color={color.primary} />
          </View>
        </Press>
      ) : null}
    </ScrollView>
  );
}

/**
 * Port of pages/user/Home.jsx — the food Delivery home and, with
 * `homeMode="takeaway"`, the Takeaway tab.
 */
export default function Home({ homeMode = null }) {
  readCaches();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [isTabActive, setIsTabActive] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setIsTabActive(true);
      return () => setIsTabActive(false);
    }, []),
  );

  const { openLocationSelector } = useLocationSelector();
  const { vegMode, setVegMode: setVegModeContext, vegModeOption, setVegModeOption, orderType, addFavorite, removeFavorite, isFavorite, getFavorites, getDefaultAddress } = useProfile();
  const { cart } = useCart();
  const { location } = useLocation();
  const { zoneId, isOutOfService, loading: zoneLoading } = useZone(location);

  const isTakeawayPage = homeMode === 'takeaway';
  const effectiveOrderType = homeMode === 'takeaway' || homeMode === 'delivery' ? homeMode : orderType;
  const isTakeawayActive = effectiveOrderType === 'takeaway' || isTakeawayPage;
  const homeBrowsePath = isTakeawayActive ? '/food/user/takeaway' : '/food/user';

  const [heroSearch, setHeroSearch] = useState('');
  const [takeawaySearchOpen, setTakeawaySearchOpen] = useState(false);

  // --- veg mode ---------------------------------------------------------
  const [prevVegMode, setPrevVegMode] = useState(vegMode);
  const [showVegModePopup, setShowVegModePopup] = useState(false);
  const [showSwitchOffPopup, setShowSwitchOffPopup] = useState(false);
  const [isApplyingVegMode, setIsApplyingVegMode] = useState(false);
  const [isSwitchingOffVegMode, setIsSwitchingOffVegMode] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0, triangleLeft: 0 });
  const vegModeToggleRef = useRef(null);
  const stickyVegToggleRef = useRef(null);
  const isHandlingSwitchOff = useRef(false);
  const [isStickyHeaderVisible, setIsStickyHeaderVisible] = useState(false);
  const categoriesBottom = useRef(null);
  const screenWidth = useRef(360);

  useEffect(() => {
    if (vegMode !== prevVegMode && !isHandlingSwitchOff.current) setPrevVegMode(vegMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vegMode]);

  const handleVegModeChange = (newValue) => {
    if (isHandlingSwitchOff.current) return;
    if (newValue && !prevVegMode) {
      const node = (isStickyHeaderVisible ? stickyVegToggleRef.current : vegModeToggleRef.current) || vegModeToggleRef.current;
      const show = (x = 0, y = 0, w = 0, h = 0) => {
        const sw = screenWidth.current;
        const popupWidth = Math.min(sw - 32, 320);
        let left = x + w - popupWidth;
        left = Math.max(16, Math.min(left, sw - popupWidth - 16));
        setPopupPosition({ top: y + h + 10, left, triangleLeft: x + w / 2 - left });
        setShowVegModePopup(true);
      };
      if (node?.measureInWindow) node.measureInWindow(show);
      else show();
    } else if (!newValue && prevVegMode) {
      isHandlingSwitchOff.current = true;
      setShowSwitchOffPopup(true);
    } else {
      setVegModeContext(newValue);
      setPrevVegMode(newValue);
    }
  };

  // --- landing data -----------------------------------------------------
  const [publicOffers, setPublicOffers] = useState([]);
  useEffect(() => {
    let active = true;
    restaurantAPI
      .getPublicOffers()
      .then((response) => {
        if (!active) return;
        const list = response?.data?.data?.allOffers || response?.data?.allOffers || [];
        setPublicOffers(list.filter((o) => o.showInCart !== false && !(o.status && o.status !== 'active')));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const cachedExplore = useMemo(() => {
    try {
      const cached = getCachedExploreIcons();
      return cached && isExploreIconsCacheFresh() ? cached : null;
    } catch {
      return null;
    }
  }, []);
  const [heroBannerImages, setHeroBannerImages] = useState([]);
  const [heroBannersData, setHeroBannersData] = useState([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [landingExploreMore, setLandingExploreMore] = useState(() => cachedExplore?.items || []);
  const [exploreMoreHeading, setExploreMoreHeading] = useState(() => cachedExplore?.heading || 'Explore More');
  const [festBannerImageUrl, setFestBannerImageUrl] = useState(() => localStore.getItem('CACHED_FEST_BANNER') || null);
  const [festBannerTopColor, setFestBannerTopColor] = useState(() => localStore.getItem('CACHED_FEST_BANNER_COLOR') || '');
  const [recommendedRestaurantIds, setRecommendedRestaurantIds] = useState([]);
  const [recommendedRestaurantsFromSettings, setRecommendedRestaurantsFromSettings] = useState([]);
  const [restaurantsData, setRestaurantsData] = useState(HOME_RESTAURANTS_CACHE || []);
  const [loadingRestaurants, setLoadingRestaurants] = useState(!HOME_RESTAURANTS_CACHE || (Array.isArray(HOME_RESTAURANTS_CACHE) && HOME_RESTAURANTS_CACHE.length === 0));
  const [realCategories, setRealCategories] = useState(HOME_CATEGORIES_CACHE || []);
  const [menuCategories, setMenuCategories] = useState([]);
  const [restaurantDietMeta, setRestaurantDietMeta] = useState({});
  const [availabilityTick, setAvailabilityTick] = useState(() => Date.now());
  const [visibleRestaurantCount, setVisibleRestaurantCount] = useState(RESTAURANTS_BATCH_SIZE);
  const publicCategoriesCacheRef = useRef(new Map());
  const publicCategoriesInFlightRef = useRef(new Map());

  useEffect(() => {
    const intervalId = setInterval(() => setAvailabilityTick(Date.now()), 60000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (zoneLoading) return undefined;
    let cancelled = false;
    setLoadingBanners(true);
    publicGetOnce('/food/hero-banners/public', zoneId ? { params: { zoneId } } : {})
      .then((response) => {
        if (cancelled) return;
        const data = response?.data?.data;
        const list = Array.isArray(data?.banners) ? data.banners : Array.isArray(data) ? data : [];
        setHeroBannerImages(list.map((b) => (b && typeof b.imageUrl === 'string' ? b.imageUrl : '')).filter(Boolean));
        setHeroBannersData(list.filter((b) => b && typeof b.imageUrl === 'string' && b.imageUrl));
      })
      .catch(() => {
        if (cancelled) return;
        setHeroBannerImages([]);
        setHeroBannersData([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingBanners(false);
      });
    return () => {
      cancelled = true;
    };
  }, [zoneId, zoneLoading]);

  useEffect(() => {
    if (zoneLoading) return undefined;
    let cancelled = false;
    const reqConfig = zoneId ? { params: { zoneId } } : {};
    Promise.all([
      publicGetOnce('/food/explore-icons/public', reqConfig).catch(() => ({ data: { data: {} } })),
      publicGetOnce('/food/landing/settings/public', reqConfig).catch(() => ({ data: { data: {} } })),
    ])
      .then(([exploreRes, settingsRes]) => {
        if (cancelled) return;
        const exploreData = exploreRes?.data?.data;
        const items = Array.isArray(exploreData?.items) ? exploreData.items : Array.isArray(exploreData) ? exploreData : [];
        const mappedItems = items.map((it) => ({ ...it, imageUrl: it.imageUrl || it.iconUrl, label: it.label || it.name }));
        setLandingExploreMore(mappedItems);
        const settings = settingsRes?.data?.data || {};
        const heading = settings.exploreMoreHeading || 'Explore More';
        setExploreMoreHeading(heading);
        setRecommendedRestaurantIds(settings.recommendedRestaurantIds || []);
        setRecommendedRestaurantsFromSettings(settings.recommendedRestaurants || []);
        const newBannerUrl = typeof settings.festBannerImageUrl === 'string' ? settings.festBannerImageUrl : '';
        const newTopColor = typeof settings.festBannerTopColor === 'string' && settings.festBannerTopColor ? settings.festBannerTopColor : '';
        setFestBannerImageUrl(newBannerUrl);
        setFestBannerTopColor(newTopColor);
        localStore.setItem('CACHED_FEST_BANNER', newBannerUrl);
        localStore.setItem('CACHED_FEST_BANNER_COLOR', newTopColor);
        setCachedExploreIcons({ items: mappedItems, heading });
        preloadImageUrls(mappedItems.map((it) => it.imageUrl || it.image).filter(Boolean));
      })
      .catch(() => {
        if (cancelled) return;
        setLandingExploreMore([]);
        setExploreMoreHeading('Explore More');
        setRecommendedRestaurantsFromSettings([]);
        setFestBannerImageUrl('');
        localStore.setItem('CACHED_FEST_BANNER', '');
      });
    return () => {
      cancelled = true;
    };
  }, [zoneId, zoneLoading]);

  const cartCount = useMemo(() => cart.reduce((total, item) => total + (item.quantity || 0), 0), [cart]);

  const defaultSavedAddress = useMemo(() => getDefaultAddress?.() || null, [getDefaultAddress]);
  const defaultSavedAddressLocation = useMemo(() => {
    const coords = defaultSavedAddress?.location?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const lng = parseFloat(coords[0]);
      const lat = parseFloat(coords[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { latitude: lat, longitude: lng };
    }
    const lat = parseFloat(defaultSavedAddress?.latitude || defaultSavedAddress?.lat);
    const lng = parseFloat(defaultSavedAddress?.longitude || defaultSavedAddress?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { latitude: lat, longitude: lng };
    return null;
  }, [defaultSavedAddress]);

  const effectiveLocation = location;
  const distanceOrigin = useMemo(() => {
    if (Number.isFinite(defaultSavedAddressLocation?.latitude) && Number.isFinite(defaultSavedAddressLocation?.longitude)) return defaultSavedAddressLocation;
    if (Number.isFinite(effectiveLocation?.latitude) && Number.isFinite(effectiveLocation?.longitude)) {
      return { latitude: Number(effectiveLocation.latitude), longitude: Number(effectiveLocation.longitude) };
    }
    return null;
  }, [defaultSavedAddressLocation, effectiveLocation]);

  // A new zone means a new catalogue: show the loading state until it lands.
  const prevResolvedZoneIdRef = useRef(zoneId);
  useEffect(() => {
    if (zoneLoading) return;
    if (prevResolvedZoneIdRef.current === zoneId) return;
    prevResolvedZoneIdRef.current = zoneId;
    setLoadingRestaurants(true);
  }, [zoneId, zoneLoading]);

  useEffect(() => {
    if (zoneLoading) return undefined;
    let cancelled = false;
    const run = async () => {
      const zoneKey = String(zoneId || 'global');
      try {
        const cached = publicCategoriesCacheRef.current.get(zoneKey);
        if (cached) {
          if (!cancelled) setRealCategories(cached);
          return;
        }
        const inFlight = publicCategoriesInFlightRef.current.get(zoneKey);
        if (inFlight) {
          const categories = await inFlight;
          if (!cancelled) setRealCategories(categories);
          return;
        }
        const promise = (async () => {
          const res = await adminAPI.getPublicCategories(zoneId ? { zoneId } : {});
          const list = res?.data?.data?.categories || res?.data?.categories || [];
          const categories = Array.isArray(list)
            ? list.map((cat, idx) => ({
                id: String(cat?.id || cat?._id || cat?.slug || idx),
                name: cat?.name || '',
                slug: cat?.slug || String(cat?.name || '').toLowerCase().replace(/\s+/g, '-'),
                image: normalizeImageUrl(cat?.image || cat?.imageUrl) || foodImages[idx % foodImages.length] || foodImages[0],
                type: cat?.type || '',
                foodTypeScope: cat?.foodTypeScope || '',
              }))
            : [];
          publicCategoriesCacheRef.current.set(zoneKey, categories);
          return categories;
        })();
        publicCategoriesInFlightRef.current.set(zoneKey, promise);
        const categories = await promise;
        publicCategoriesInFlightRef.current.delete(zoneKey);
        if (!cancelled) {
          setRealCategories(categories);
          HOME_CATEGORIES_CACHE = categories;
          setSessionCache(HOME_CATEGORIES_CACHE_KEY, categories);
        }
      } catch {
        publicCategoriesInFlightRef.current.delete(zoneKey);
        if (!cancelled) setRealCategories(HOME_CATEGORIES_CACHE || []);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [zoneId, zoneLoading]);

  // --- filters ----------------------------------------------------------
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [sortBy, setSortBy] = useState(null);
  const [selectedCuisine, setSelectedCuisine] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({ activeFilters: new Set(), sortBy: null, selectedCuisine: null });
  const [isLoadingFilterResults, setIsLoadingFilterResults] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showManageCollections, setShowManageCollections] = useState(false);
  const [selectedRestaurantSlug, setSelectedRestaurantSlug] = useState(null);
  const restaurantsRequestSeqRef = useRef(0);
  const menuUnionRequestSeqRef = useRef(0);
  const menuUnionCacheRef = useRef(new Map());

  const toggleFilter = (filterId) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filterId)) next.delete(filterId);
      else next.add(filterId);
      return next;
    });
  };

  const fetchRestaurants = useCallback(
    async (filters = {}) => {
      if (!zoneId) {
        setRestaurantsData([]);
        setLoadingRestaurants(false);
        return;
      }
      const requestSeq = ++restaurantsRequestSeqRef.current;
      const done = () => {
        if (requestSeq === restaurantsRequestSeqRef.current) setLoadingRestaurants(false);
      };
      try {
        if (!(Array.isArray(HOME_RESTAURANTS_CACHE) && HOME_RESTAURANTS_CACHE.length > 0)) setLoadingRestaurants(true);

        const params = {};
        if (Number.isFinite(distanceOrigin?.latitude) && Number.isFinite(distanceOrigin?.longitude)) {
          params.lat = Number(distanceOrigin.latitude);
          params.lng = Number(distanceOrigin.longitude);
        }
        params.limit = 40;
        if (filters.sortBy) params.sortBy = filters.sortBy;
        if (effectiveOrderType) params.orderType = effectiveOrderType;
        if (filters.selectedCuisine) params.cuisine = filters.selectedCuisine;

        const f = filters.activeFilters;
        if (f?.has('rating-45-plus')) params.minRating = 4.5;
        else if (f?.has('rating-4-plus')) params.minRating = 4.0;
        else if (f?.has('rating-35-plus')) params.minRating = 3.5;
        if (f?.has('delivery-under-30')) params.maxDeliveryTime = 30;
        else if (f?.has('delivery-under-45')) params.maxDeliveryTime = 45;
        if (f?.has('distance-under-1km')) params.radiusKm = 1.0;
        else if (f?.has('distance-under-2km')) params.radiusKm = 2.0;
        if (f?.has('price-under-200')) params.maxPrice = 200;
        else if (f?.has('price-under-500')) params.maxPrice = 500;
        if (f?.has('has-offers')) params.hasOffers = 'true';
        if (f?.has('top-rated')) params.topRated = 'true';
        else if (f?.has('trusted')) params.trusted = 'true';
        params.zoneId = zoneId;

        const response = await restaurantAPI.getRestaurants(params);
        if (requestSeq !== restaurantsRequestSeqRef.current) return;

        const restaurantsArray = response?.data?.success ? response.data.data?.restaurants : null;
        if (!Array.isArray(restaurantsArray) || restaurantsArray.length === 0) {
          setRestaurantsData([]);
          done();
          return;
        }

        const transformed = restaurantsArray
          .filter((restaurant) => !isTakeawayActive || restaurant.takeawaySettings?.isEnabled || restaurant.takeawayAvailable)
          .map((restaurant) => {
            const deliveryTime = restaurant.estimatedDeliveryTime || '25-30 mins';
            const distanceInKm = Number.isFinite(Number(restaurant.distanceInKm)) ? Number(restaurant.distanceInKm) : null;
            const topOrder = Number.isFinite(Number(restaurant.__topOrder ?? restaurant.topOrder)) ? Number(restaurant.__topOrder ?? restaurant.topOrder) : 1000000;
            const cuisine = restaurant.cuisines && restaurant.cuisines.length > 0 ? restaurant.cuisines[0] : 'Multi-cuisine';
            const coverImages = extractImages([...(Array.isArray(restaurant.coverImages) ? restaurant.coverImages : [restaurant.coverImages]).filter(Boolean), restaurant.coverImage]);
            const profileImageCandidates = extractImages([
              ...buildRestaurantImageCandidates(restaurant.profileImage),
              ...buildRestaurantImageCandidates(restaurant.onboarding?.step2?.profileImageUrl),
              ...buildRestaurantImageCandidates(restaurant.image),
              ...buildRestaurantImageCandidates(restaurant.imageUrl),
            ]);
            const profileImageUrl = profileImageCandidates[0] || '';
            const allImages = Array.from(new Set([...coverImages, ...profileImageCandidates].filter(Boolean)));
            const dishes = Array.isArray(restaurant.recommendedDishes) ? restaurant.recommendedDishes : [];
            return {
              id: restaurant.restaurantId || restaurant._id,
              mongoId: restaurant._id || null,
              name: getRestaurantDisplayName(restaurant),
              cuisine,
              cuisines: Array.isArray(restaurant.cuisines) ? restaurant.cuisines : [],
              rating: Number(restaurant.rating) || 0,
              totalRatings: Number(restaurant.totalRatings) || 0,
              deliveryTime: isTakeawayActive
                ? restaurant.preparationTime || '20-25 mins'
                : restaurant.deliveryTime ||
                  restaurant.estimatedDeliveryTime ||
                  (restaurant.estimatedDeliveryTimeMinutes ? `${restaurant.estimatedDeliveryTimeMinutes} mins` : deliveryTime),
              takeawaySettings: restaurant.takeawaySettings || null,
              takeawayAvailable: restaurant.takeawayAvailable === true,
              distance: restaurant.distance || null,
              distanceInKm,
              topOrder,
              __topOrder: topOrder,
              image: allImages[0] || profileImageUrl || '',
              images: allImages,
              priceRange: restaurant.priceRange || '$$',
              featuredDish: restaurant.featuredDish || (dishes.length > 0 ? dishes[0].name : restaurant.cuisines && restaurant.cuisines.length > 0 ? `${restaurant.cuisines[0]} Special` : 'Special Dish'),
              featuredPrice: restaurant.featuredPrice || (dishes.length > 0 ? dishes[0].price : 249),
              offer: restaurant.offer || null,
              slug: restaurant.slug,
              restaurantId: restaurant.restaurantId,
              pureVegRestaurant: restaurant.pureVegRestaurant === true,
              location: restaurant.location,
              isActive: restaurant.isActive !== false,
              isAcceptingOrders: restaurant.isAcceptingOrders !== false,
              openDays: Array.isArray(restaurant.openDays) ? restaurant.openDays : [],
              deliveryTimings: restaurant.deliveryTimings || null,
              outletTimings: restaurant.outletTimings || null,
              openingTime: restaurant.openingTime || restaurant?.deliveryTimings?.openingTime || null,
              closingTime: restaurant.closingTime || restaurant?.deliveryTimings?.closingTime || null,
              recommendedDishes: dishes,
              hasDishes: restaurant.hasDishes === true || restaurant.totalMenuItems > 0,
              totalMenuItems: restaurant.totalMenuItems || 0,
            };
          });

        setRestaurantsData(transformed);
        HOME_RESTAURANTS_CACHE = transformed;
        setSessionCache('food_home_restaurants', transformed);
        done();
      } catch {
        setRestaurantsData([]);
        done();
      }
    },
    [distanceOrigin?.latitude, distanceOrigin?.longitude, zoneId, effectiveOrderType, isTakeawayActive],
  );

  const applyFiltersAndRefetch = useCallback(
    async (nextActiveFilters = activeFilters, nextSortBy = sortBy, nextSelectedCuisine = selectedCuisine) => {
      // Setting the applied filters re-runs the fetch effect below.
      setIsLoadingFilterResults(true);
      setAppliedFilters({ activeFilters: new Set(nextActiveFilters), sortBy: nextSortBy, selectedCuisine: nextSelectedCuisine });
    },
    [activeFilters, sortBy, selectedCuisine],
  );

  useEffect(() => {
    if (zoneLoading) return undefined;
    if (!zoneId) {
      setRestaurantsData([]);
      setLoadingRestaurants(false);
      setIsLoadingFilterResults(false);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchRestaurants(appliedFilters).finally(() => {
        if (!cancelled) setIsLoadingFilterResults(false);
      });
    }, 50);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [appliedFilters, fetchRestaurants, zoneLoading, zoneId]);

  // --- veg mode needs each menu to know which restaurants are pure veg ---
  const menuUnionRestaurantIdsKey = useMemo(() => {
    if (!Array.isArray(restaurantsData) || restaurantsData.length === 0) return '';
    return restaurantsData
      .map((r) => String(r?.restaurantId || r?.id || '').trim())
      .filter(Boolean)
      .sort()
      .join(',');
  }, [restaurantsData]);

  useEffect(() => {
    const restaurantIds = menuUnionRestaurantIdsKey ? menuUnionRestaurantIdsKey.split(',').filter(Boolean) : [];
    const run = async () => {
      const requestSeq = ++menuUnionRequestSeqRef.current;
      if (!menuUnionRestaurantIdsKey || !vegMode) {
        setMenuCategories([]);
        if (!vegMode) setRestaurantDietMeta({});
        return;
      }
      const categoryMap = new Map();
      const menuCache = menuUnionCacheRef.current;
      const menuResponses = [];
      for (let index = 0; index < restaurantIds.length; index += 4) {
        const batchIds = restaurantIds.slice(index, index + 4);
        const batchResponses = await Promise.all(
          batchIds.map(async (id) => {
            if (!id) return { id: null, menu: null };
            if (menuCache.has(id)) return { id, menu: menuCache.get(id) };
            try {
              const response = await restaurantAPI.getMenuByRestaurantId(id);
              const menu = response?.data?.data?.menu || null;
              menuCache.set(id, menu);
              return { id, menu };
            } catch {
              menuCache.set(id, null);
              return { id, menu: null };
            }
          }),
        );
        if (requestSeq !== menuUnionRequestSeqRef.current) return;
        menuResponses.push(...batchResponses);
      }
      if (requestSeq !== menuUnionRequestSeqRef.current) return;

      const nextDietMeta = {};
      menuResponses.forEach(({ id, menu }) => {
        let hasVeg = false;
        let hasNonVeg = false;
        const markItemDiet = (item) => {
          const foodType = String(item?.foodType || '').trim().toLowerCase();
          if (foodType === 'veg' || item?.isVeg === true) {
            hasVeg = true;
            return 'veg';
          }
          if (foodType.includes('non') || item?.isVeg === false) {
            hasNonVeg = true;
            return 'non-veg';
          }
          return 'unknown';
        };
        const sections = Array.isArray(menu?.sections) ? menu.sections : [];
        sections.forEach((section) => {
          let sectionHasVeg = false;
          (Array.isArray(section?.items) ? section.items : []).forEach((item) => {
            if (markItemDiet(item) === 'veg') sectionHasVeg = true;
          });
          (Array.isArray(section?.subsections) ? section.subsections : []).forEach((subsection) => {
            (Array.isArray(subsection?.items) ? subsection.items : []).forEach((item) => {
              if (markItemDiet(item) === 'veg') sectionHasVeg = true;
            });
          });
          const categoryName = String(section?.name || '').trim();
          const slug = slugifyCategory(categoryName);
          if (!categoryName || !slug) return;
          if (vegMode && !sectionHasVeg) return;
          let image = '';
          if (Array.isArray(section?.items) && section.items.length > 0) image = normalizeImageUrl(section.items[0]?.image);
          if (!image && Array.isArray(section?.subsections)) {
            for (const subsection of section.subsections) {
              if (Array.isArray(subsection?.items) && subsection.items.length > 0) {
                image = normalizeImageUrl(subsection.items[0]?.image);
                if (image) break;
              }
            }
          }
          if (!categoryMap.has(slug)) categoryMap.set(slug, { id: slug, name: categoryName, slug, label: categoryName, image: image || '' });
          else if (image && !categoryMap.get(slug).image) categoryMap.get(slug).image = image;
        });
        if (id) nextDietMeta[id] = { hasVeg, hasNonVeg, isPureVeg: hasVeg && !hasNonVeg };
      });

      setMenuCategories(
        Array.from(categoryMap.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((category, index) => ({ ...category, image: category.image || foodImages[index % foodImages.length] || foodImages[0] })),
      );
      setRestaurantDietMeta(nextDietMeta);
    };
    run();
  }, [menuUnionRestaurantIdsKey, vegMode]);

  const displayCategories = useMemo(() => {
    const filterByVeg = (cats) => (vegMode ? cats.filter((cat) => !isNonVegCategoryScope(cat)) : cats);
    if (realCategories.length > 0) return filterByVeg(realCategories);
    return filterByVeg(menuCategories);
  }, [menuCategories, realCategories, vegMode]);

  const matchesVegMode = useCallback(
    (restaurant) => {
      if (!vegMode) return true;
      if (vegModeOption !== 'pure-veg') return true;
      const id = String(restaurant?.id || restaurant?.restaurantId || restaurant?.mongoId || '');
      const meta = id ? restaurantDietMeta?.[id] : null;
      if (meta) {
        if (meta.hasNonVeg === true) return false;
        if (meta.isPureVeg === true) return true;
        return meta.hasVeg === true && meta.hasNonVeg === false;
      }
      return restaurant?.pureVegRestaurant === true;
    },
    [vegMode, vegModeOption, restaurantDietMeta],
  );

  const filteredRestaurants = useMemo(() => {
    let result = (restaurantsData || []).filter(matchesVegMode);
    if (isTakeawayActive) {
      result = result.filter((restaurant) => restaurant?.takeawaySettings?.isEnabled === true || restaurant?.takeawayAvailable === true);
      const q = heroSearch.trim().toLowerCase();
      if (q) {
        result = result.filter((restaurant) => {
          const name = String(restaurant?.name || restaurant?.restaurantName || '').trim().toLowerCase();
          const slug = String(restaurant?.slug || '').trim().toLowerCase().replace(/-/g, '');
          return name.includes(q) || slug.includes(q);
        });
      }
    }
    return result
      .map((restaurant, index) => ({ restaurant, index }))
      .sort((a, b) => {
        const byBrowse = compareRestaurantsByAvailabilityAndDistance(a.restaurant, b.restaurant, { now: new Date(availabilityTick) });
        return byBrowse !== 0 ? byBrowse : a.index - b.index;
      })
      .map((item) => item.restaurant);
  }, [restaurantsData, matchesVegMode, isTakeawayActive, heroSearch, availabilityTick]);

  const showRestaurantSkeleton = isLoadingFilterResults || loadingRestaurants || zoneLoading;
  const takeawaySearchQuery = isTakeawayActive ? heroSearch.trim() : '';
  const isTakeawaySearching = takeawaySearchQuery.length > 0;
  const showTakeawaySearchEmpty = isTakeawayActive && isTakeawaySearching && !showRestaurantSkeleton && filteredRestaurants.length === 0;

  const sectionSubtitle = useMemo(() => {
    if (showRestaurantSkeleton) return 'Finding Restaurants For You';
    if (!isTakeawayActive) return `${filteredRestaurants.length} Restaurants Delivering to You`;
    if (isTakeawaySearching) {
      if (filteredRestaurants.length === 0) return null;
      return filteredRestaurants.length === 1 ? `1 result for "${takeawaySearchQuery}"` : `${filteredRestaurants.length} results for "${takeawaySearchQuery}"`;
    }
    return `${filteredRestaurants.length} Restaurant${filteredRestaurants.length === 1 ? '' : 's'} near you`;
  }, [showRestaurantSkeleton, isTakeawayActive, isTakeawaySearching, filteredRestaurants.length, takeawaySearchQuery]);
  const sectionTitle = !isTakeawayActive ? 'Featured Restaurants' : isTakeawaySearching ? 'Search Results' : 'Takeaway Restaurants';

  // Any change to what is listed starts the lazy list from its first batch.
  const lazyResetKey = `${restaurantsData.length}:${Array.from(activeFilters).sort().join('|')}:${selectedCuisine || ''}:${sortBy || ''}:${vegMode ? '1' : '0'}:${vegModeOption}:${heroSearch || ''}`;
  useEffect(() => {
    setVisibleRestaurantCount(RESTAURANTS_BATCH_SIZE);
  }, [lazyResetKey]);

  const visibleRestaurants = useMemo(() => filteredRestaurants.slice(0, visibleRestaurantCount), [filteredRestaurants, visibleRestaurantCount]);
  const hasMoreRestaurants = visibleRestaurantCount < filteredRestaurants.length;
  const loadMoreRestaurants = useCallback(() => {
    setVisibleRestaurantCount((previous) => Math.min(previous + RESTAURANTS_BATCH_SIZE, filteredRestaurants.length));
  }, [filteredRestaurants.length]);

  const recommendedForYouRestaurants = useMemo(() => {
    const idsInOrder = (recommendedRestaurantIds || []).map((id) => String(id));
    const hasIds = idsInOrder.length > 0;
    const fromSettings = Array.isArray(recommendedRestaurantsFromSettings)
      ? recommendedRestaurantsFromSettings.filter((r) => !r.zoneId || !zoneId || String(r.zoneId) === String(zoneId))
      : [];
    const fromSettingsMapped = fromSettings.map((restaurant) => {
      const restaurantId = restaurant?._id ? String(restaurant._id) : '';
      const imageCandidates = extractImages([...(Array.isArray(restaurant?.coverImages) ? restaurant.coverImages : [restaurant?.coverImages]).filter(Boolean), restaurant?.profileImage]);
      const image = imageCandidates[0] || foodImages[0];
      return {
        id: restaurant?.restaurantId || restaurantId,
        mongoId: restaurantId,
        name: getRestaurantDisplayName(restaurant),
        cuisine: Array.isArray(restaurant?.cuisines) && restaurant.cuisines.length > 0 ? restaurant.cuisines[0] : 'Multi-cuisine',
        rating: Number(restaurant?.rating) || 0,
        distance: '',
        deliveryTime: '',
        image,
        images: imageCandidates.length > 0 ? imageCandidates : [],
        slug: restaurant?.slug || restaurant?.restaurantId || restaurantId,
        offer: null,
        pureVegRestaurant: restaurant?.pureVegRestaurant === true,
        isActive: restaurant?.isActive !== false,
        isAcceptingOrders: restaurant?.isAcceptingOrders !== false,
        openingTime: restaurant?.openingTime || null,
        closingTime: restaurant?.closingTime || null,
        openDays: Array.isArray(restaurant?.openDays) ? restaurant.openDays : [],
      };
    });
    const orderedFromSettings = hasIds ? idsInOrder.map((id) => fromSettingsMapped.find((restaurant) => String(restaurant.mongoId) === id)).filter(Boolean) : fromSettingsMapped;
    const existingIds = new Set(orderedFromSettings.map((restaurant) => String(restaurant.mongoId || restaurant.id)));
    const fromFetchedMissing = (restaurantsData || []).filter((restaurant) => {
      const mongoId = String(restaurant.mongoId || '');
      return hasIds && idsInOrder.includes(mongoId) && !existingIds.has(mongoId);
    });
    return [...orderedFromSettings, ...fromFetchedMissing].filter(matchesVegMode).slice(0, 12);
  }, [recommendedRestaurantIds, recommendedRestaurantsFromSettings, restaurantsData, matchesVegMode, zoneId]);

  const finalExploreItems = useMemo(() => {
    const fallback = [
      { id: 'under-250', label: 'Under 250', image: '', href: '/food/user/under-250' },
      { id: 'offers', label: 'Offers', image: '', href: '/food/user/offers' },
      { id: 'gourmet', label: 'Gourmet', image: '', href: '/food/user/gourmet' },
      { id: 'collection', label: 'Collections', image: '', href: '/food/user/profile/favorites' },
    ];
    if (!landingExploreMore || landingExploreMore.length === 0) return fallback;
    return fallback.map((item) => {
      const itemLabel = item.label.toLowerCase();
      const apiItem = landingExploreMore.find((ai) => {
        const label = String(ai.label || ai.name || '').toLowerCase().trim();
        const linkType = String(ai.linkType || '').toLowerCase().trim();
        const link = String(ai.link || ai.targetPath || '').toLowerCase();
        return (
          label === itemLabel ||
          linkType === item.id ||
          link.includes(item.id) ||
          (item.id === 'under-250' && (label.includes('under 250') || label.includes('under-250') || label.includes('under ₹250') || label.includes('under rs')))
        );
      });
      if (!apiItem) return item;
      const href = apiItem.link ? (apiItem.link.startsWith('/') ? apiItem.link : `/${apiItem.link}`) : item.href;
      const remote = normalizeImageUrl(apiItem.imageUrl || apiItem.iconUrl || apiItem.image || '') || '';
      return { ...item, image: remote || item.image, href };
    });
  }, [landingExploreMore]);

  useEffect(() => {
    const interval = setInterval(() => setPlaceholderIndex((prev) => (prev + 1) % placeholders.length), 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchFocus = useCallback(() => {
    if (isTakeawayActive) {
      setTakeawaySearchOpen(true);
      return;
    }
    router.push({ pathname: '/food/user/search', params: { mode: 'delivery' } });
  }, [isTakeawayActive]);

  const onToggleFavorite = (restaurant, restaurantSlug, favorite) => {
    if (favorite) {
      setSelectedRestaurantSlug(restaurantSlug);
      setShowManageCollections(true);
      return;
    }
    addFavorite({
      slug: restaurantSlug,
      name: restaurant.name,
      cuisine: restaurant.cuisine,
      rating: restaurant.rating,
      deliveryTime: restaurant.deliveryTime,
      distance: restaurant.distance,
      priceRange: restaurant.priceRange,
      image: restaurant.image,
    });
    toast('Added to bookmark');
  };

  // --- scrolling --------------------------------------------------------
  const onNavScroll = useFoodNavScroll();
  const onScroll = (e) => {
    onNavScroll(e);
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (categoriesBottom.current != null) {
      const past = contentOffset.y > categoriesBottom.current;
      if (past !== isStickyHeaderVisible) setIsStickyHeaderVisible(past);
    }
    if (hasMoreRestaurants && !showRestaurantSkeleton && contentOffset.y + layoutMeasurement.height > contentSize.height - 480) loadMoreRestaurants();
  };

  const showFest = !!festBannerImageUrl && !isTakeawayActive;
  const brandColor = showFest && festBannerTopColor ? festBannerTopColor : color.primaryDeep;
  const takeawaySearchHeight = useAnimatedValue(0);
  useEffect(() => {
    Animated.spring(takeawaySearchHeight, { toValue: takeawaySearchOpen ? 1 : 0, stiffness: 380, damping: 32, mass: 0.82, useNativeDriver: false }).start();
  }, [takeawaySearchOpen, takeawaySearchHeight]);

  const favoritesCount = getFavorites().length;

  return (
    <View style={styles.page} onLayout={(e) => (screenWidth.current = e.nativeEvent.layout.width)}>
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + FOOD_TABS_HEIGHT + space.lg + insets.bottom }}
      >
        <View style={[styles.brand, { backgroundColor: brandColor }]}>
          {showFest ? (
            <Image
              source={{ uri: festBannerImageUrl }}
              accessibilityLabel="Fest Banner"
              resizeMode="cover"
              style={StyleSheet.absoluteFill}
              onError={() => {
                setFestBannerImageUrl('');
                setFestBannerTopColor('');
                localStore.setItem('CACHED_FEST_BANNER', '');
                localStore.setItem('CACHED_FEST_BANNER_COLOR', '');
              }}
            />
          ) : null}
          {!isTakeawayActive ? (
            <HomeHeader
              location={effectiveLocation}
              handleSearchFocus={handleSearchFocus}
              placeholderIndex={placeholderIndex}
              placeholders={placeholders}
              vegMode={vegMode}
              handleVegModeChange={handleVegModeChange}
              vegModeToggleRef={vegModeToggleRef}
              isTabActive={isTabActive}
              showBanner
              hideFoodImages={!!festBannerImageUrl}
            />
          ) : (
            <View style={styles.takeHead}>
              <View style={styles.takeRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.takeKicker}>Self-pickup</Text>
                  <Text style={styles.takeTitle} accessibilityRole="header" numberOfLines={1}>TAKEAWAY</Text>
                </View>
                <View style={styles.takeActions}>
                  <Press
                    scale={0.95}
                    onPress={() => setTakeawaySearchOpen(true)}
                    accessibilityLabel="Search takeaway restaurants"
                    accessibilityState={{ expanded: takeawaySearchOpen }}
                    style={[styles.takeBtn, takeawaySearchOpen ? { backgroundColor: color.surface } : null]}
                  >
                    <Search size={20} color={takeawaySearchOpen ? color.primary : color.textInverse} strokeWidth={2.25} />
                  </Press>
                  <Press scale={0.95} onPress={() => router.push({ pathname: '/food/user/cart', params: { from: pathname } })} accessibilityLabel={`Cart, ${cartCount} items`} style={styles.takeBtn}>
                    <ShoppingCart size={20} color={color.textInverse} strokeWidth={2.25} />
                    {cartCount > 0 ? (
                      <View style={styles.cartBadge}>
                        <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                      </View>
                    ) : null}
                  </Press>
                  <ProfileAvatar size={40} />
                </View>
              </View>
              <Animated.View style={{ overflow: 'hidden', opacity: takeawaySearchHeight, height: takeawaySearchHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 60] }) }}>
                <View style={styles.takeSearch}>
                  <Search size={18} color={color.primary} strokeWidth={2.25} />
                  {takeawaySearchOpen ? (
                    <TextInput
                      autoFocus
                      value={heroSearch}
                      onChangeText={setHeroSearch}
                      placeholder="Search takeaway restaurants"
                      placeholderTextColor={color.textMuted}
                      returnKeyType="search"
                      autoCorrect={false}
                      accessibilityLabel="Search takeaway restaurants"
                      style={styles.takeInput}
                    />
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}
                  {heroSearch ? (
                    <Press scale={0.9} onPress={() => setHeroSearch('')} accessibilityLabel="Clear search" hitSlop={6} style={[styles.takeX, { backgroundColor: color.surfaceMuted }]}>
                      <X size={16} color={color.textSecondary} strokeWidth={2.5} />
                    </Press>
                  ) : null}
                  <Press
                    scale={0.9}
                    onPress={() => {
                      setHeroSearch('');
                      setTakeawaySearchOpen(false);
                    }}
                    accessibilityLabel="Close search"
                    hitSlop={6}
                    style={[styles.takeX, { backgroundColor: color.primarySoft }]}
                  >
                    <X size={16} color={color.primary} strokeWidth={2.5} />
                  </Press>
                </View>
              </Animated.View>
            </View>
          )}
        </View>

        {isTakeawayActive ? (
          <View style={styles.pickup}>
            <View style={styles.pickupIcon}>
              <ShoppingBag size={22} color={color.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.pickupTitle}>Pickup restaurants</Text>
              <Text style={styles.pickupSub}>Order online, skip the queue and pick it up yourself</Text>
            </View>
          </View>
        ) : (
          <View
            style={{ paddingTop: space.lg, paddingBottom: space.sm }}
            onLayout={(e) => {
              categoriesBottom.current = e.nativeEvent.layout.y + e.nativeEvent.layout.height;
            }}
          >
            <CategoryRail categories={displayCategories} />
          </View>
        )}

        {loadingBanners ? (
          <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.lg }}>
            <Pulse style={{ width: '100%', aspectRatio: 1.7, borderRadius: radii.lg }} />
          </View>
        ) : heroBannerImages.length > 0 ? (
          <HeroBanner images={heroBannerImages} banners={heroBannersData} zoneId={zoneId} active={isTabActive} />
        ) : null}

        {!isTakeawayActive ? (
          <ChipRow style={styles.filterBar} contentStyle={{ alignItems: 'center' }}>
            <Chip
              label={activeFilters.size > 0 || sortBy ? 'Filters •' : 'Filters'}
              icon={SlidersHorizontal}
              selected={false}
              onPress={() => setIsFilterOpen(true)}
              style={styles.filterChip}
            />
            {QUICK_FILTERS.map((filter) => (
              <Chip
                key={filter.id}
                label={filter.label}
                icon={filter.icon}
                selected={activeFilters.has(filter.id)}
                style={styles.filterChip}
                onPress={() => {
                  const nextFilters = new Set(activeFilters);
                  if (nextFilters.has(filter.id)) nextFilters.delete(filter.id);
                  else nextFilters.add(filter.id);
                  setActiveFilters(nextFilters);
                  applyFiltersAndRefetch(nextFilters, sortBy, selectedCuisine);
                }}
              />
            ))}
          </ChipRow>
        ) : null}

        {!isTakeawayActive && recommendedForYouRestaurants.length > 0 ? (
          <View style={styles.block}>
            <SectionHeader title="Recommended for you" style={styles.gutter} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.recRow}>
              {recommendedForYouRestaurants.map((restaurant) => (
                <RecommendedCard key={`recommended-${restaurant.mongoId || restaurant.id}`} restaurant={restaurant} backFrom={homeBrowsePath} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {!isTakeawayActive ? (
          <View style={styles.block}>
            <SectionHeader title={exploreMoreHeading} style={styles.gutter} />
            <View style={styles.exploreGrid}>
              {finalExploreItems.slice(0, 4).map((item) => (
                <Press
                  key={item.id}
                  scale={0.95}
                  onPress={() => router.push(item.href.startsWith('/food/') ? item.href : toFoodUserPath(item.href))}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  style={styles.exploreItem}
                >
                  <View style={styles.exploreTile}>
                    <ExploreIconImage image={item.image} id={item.id} />
                  </View>
                  <Text style={styles.exploreLabel} numberOfLines={1}>{item.label}</Text>
                </Press>
              ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.block, isTakeawayActive ? { paddingTop: space.sm } : null]}>
          {!showTakeawaySearchEmpty ? (
            <View style={styles.gutter}>
              <SectionHeader title={sectionTitle} style={{ marginBottom: space.xxs }} />
              {sectionSubtitle ? <Text style={styles.sectionSub}>{sectionSubtitle}</Text> : null}
            </View>
          ) : null}

          {showRestaurantSkeleton ? (
            <View style={styles.list} accessibilityRole="progressbar" accessibilityLabel="Loading restaurants">
              <RestaurantSkeleton />
              <RestaurantSkeleton />
              <RestaurantSkeleton />
            </View>
          ) : (
            <View style={styles.list}>
              {visibleRestaurants.map((restaurant, index) => {
                const restaurantSlug = restaurantSlugOf(restaurant, index);
                const favorite = isFavorite(restaurantSlug);
                return (
                  <RestaurantCard
                    key={restaurant?.id || restaurant?._id || restaurantSlug || index}
                    restaurant={restaurant}
                    index={index}
                    availability={getRestaurantAvailabilityStatus(restaurant, new Date(availabilityTick))}
                    favorite={favorite}
                    onToggleFavorite={() => onToggleFavorite(restaurant, restaurantSlug, favorite)}
                    coupons={couponsForRestaurant(publicOffers, restaurant, isTakeawayActive)}
                    dimmed={isOutOfService}
                    backFrom={homeBrowsePath}
                  />
                );
              })}
              {showTakeawaySearchEmpty ? (
                <EmptyState icon={Search} title={`No takeaway restaurants found for "${takeawaySearchQuery}"`} message="Search by restaurant name only" />
              ) : null}
            </View>
          )}

          {hasMoreRestaurants && !showRestaurantSkeleton ? (
            <View style={{ alignItems: 'center', paddingTop: space.lg }}>
              <Button title="Load more restaurants" variant="outline" size="sm" fullWidth={false} onPress={loadMoreRestaurants} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {isStickyHeaderVisible && !isTakeawayActive ? (
        <View style={styles.sticky}>
          <View style={styles.stickyRow}>
            <SearchPill onPress={handleSearchFocus} staticText placeholder={'Search "biryani"'} style={styles.stickySearch} />
            <VegModeToggle ref={stickyVegToggleRef} vegMode={vegMode} onChange={handleVegModeChange} dark={false} compact />
          </View>
          <CategoryRail categories={displayCategories} sticky />
        </View>
      ) : null}

      <StickyCartCard />
      <OrderTrackingCard hasBottomNav />

      <FilterSheet
        visible={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        activeFilters={activeFilters}
        toggleFilter={toggleFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        selectedCuisine={selectedCuisine}
        loading={isLoadingFilterResults}
        isTakeaway={isTakeawayActive}
        onClear={() => {
          setActiveFilters(new Set());
          setSortBy(null);
          setSelectedCuisine(null);
        }}
        onApply={() => {
          setIsFilterOpen(false);
          applyFiltersAndRefetch(activeFilters, sortBy, selectedCuisine);
        }}
      />

      <VegModePopup
        visible={showVegModePopup}
        position={popupPosition}
        vegModeOption={vegModeOption}
        setVegModeOption={setVegModeOption}
        onDismiss={() => {
          setShowVegModePopup(false);
          setVegModeContext(false);
          setPrevVegMode(false);
        }}
        onApply={() => {
          setShowVegModePopup(false);
          setIsApplyingVegMode(true);
          setVegModeContext(true);
          setPrevVegMode(true);
          setTimeout(() => setIsApplyingVegMode(false), 2000);
        }}
      />
      <SwitchOffVegDialog
        visible={showSwitchOffPopup}
        onKeep={() => {
          setShowSwitchOffPopup(false);
          isHandlingSwitchOff.current = false;
          setVegModeContext(true);
        }}
        onSwitchOff={() => {
          setShowSwitchOffPopup(false);
          setIsSwitchingOffVegMode(true);
          setTimeout(() => {
            setIsSwitchingOffVegMode(false);
            isHandlingSwitchOff.current = false;
            setVegModeContext(false);
            setPrevVegMode(false);
          }, 2000);
        }}
      />
      <ApplyingVegOverlay visible={isApplyingVegMode} />
      <SwitchingOffVegOverlay visible={isSwitchingOffVegMode} />

      <BottomSheet visible={showManageCollections} onClose={() => setShowManageCollections(false)} spring={{ stiffness: 400, damping: 30 }} panelStyle={styles.sheet}>
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle} accessibilityRole="header">Manage collections</Text>
          <Press scale={0.9} onPress={() => setShowManageCollections(false)} accessibilityLabel="Close" style={styles.sheetClose}>
            <X size={20} color={color.text} />
          </Press>
        </View>
        <View style={{ padding: space.lg, gap: space.sm }}>
          <View style={styles.collRow}>
            <View style={styles.collIcon}>
              <Bookmark size={22} color={color.primary} fill={color.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.collName}>Bookmarks</Text>
              <Text style={styles.collCount}>
                {favoritesCount} restaurant{favoritesCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <Press
              scale={0.9}
              hitSlop={12}
              disabled={!selectedRestaurantSlug}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: true }}
              accessibilityLabel="Bookmarked. Untick to remove"
              onPress={() => {
                removeFavorite(selectedRestaurantSlug);
                setSelectedRestaurantSlug(null);
                setShowManageCollections(false);
              }}
              style={[styles.check, selectedRestaurantSlug ? null : styles.checkOff]}
            >
              <Check size={14} color={color.onPrimary} strokeWidth={3} />
            </Press>
          </View>
          <Press scale={0.98} onPress={() => setShowManageCollections(false)} accessibilityLabel="Create new Collection" style={styles.collRow}>
            <View style={[styles.collIcon, { backgroundColor: color.surfaceMuted }]}>
              <Plus size={22} color={color.primary} />
            </View>
            <Text style={[styles.collName, { flex: 1 }]}>Create new collection</Text>
          </Press>
        </View>
        <View style={[styles.sheetFoot, { paddingBottom: space.lg + insets.bottom }]}>
          <Button
            title="Done"
            variant="secondary"
            onPress={() => {
              setSelectedRestaurantSlug(null);
              setShowManageCollections(false);
            }}
          />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  brand: { borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl, overflow: 'hidden', ...elevation.card },
  gutter: { paddingHorizontal: space.lg },
  block: { paddingTop: space.xxl },

  takeHead: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.lg },
  takeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  takeActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  takeKicker: { ...type.overline, color: color.textOnDarkMuted },
  takeTitle: { ...type.heroSerif, color: color.goldOnDark },
  takeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  cartBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: color.goldBright,
    borderWidth: 1.5, borderColor: color.primaryDeep, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { ...type.caption, lineHeight: 14, fontFamily: 'Poppins_700Bold', color: color.onGold },
  takeSearch: { marginTop: space.md, height: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.surface, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, paddingLeft: space.md, paddingRight: space.xs + 2 },
  takeInput: { flex: 1, minWidth: 0, height: '100%', paddingVertical: 0, ...type.body, color: color.text, outlineWidth: 0 },
  takeX: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pickup: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.lg, marginTop: space.lg, padding: space.md, borderRadius: radii.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border },
  pickupIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  pickupTitle: { ...type.bodyStrong, color: color.text },
  pickupSub: { ...type.small, color: color.textSecondary },

  rail: { paddingHorizontal: space.md, gap: space.xs },
  railSticky: { paddingHorizontal: space.md, gap: space.xs, paddingTop: space.xs, paddingBottom: space.sm },
  catItem: { alignItems: 'center', gap: space.sm },
  catCircle: { overflow: 'hidden', borderWidth: 2, borderColor: color.border, backgroundColor: color.surface, ...elevation.card },
  catAll: { borderColor: color.primaryBorder, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  catAllLabel: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
  catName: { ...type.caption, color: color.text, textAlign: 'center', alignSelf: 'stretch' },

  hero: { width: '100%', aspectRatio: 1.7, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: color.surfaceMuted, borderWidth: 1, borderColor: color.border },
  heroDots: { position: 'absolute', bottom: space.md, right: space.md, flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  heroDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  heroDotActive: { width: 20, backgroundColor: color.surface },

  filterBar: { paddingVertical: space.xs },
  filterChip: { height: 40 },

  recRow: { paddingHorizontal: space.lg, paddingBottom: space.xs, gap: space.md },
  exploreGrid: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg },
  exploreItem: { flex: 1, minWidth: 0, alignItems: 'center', gap: space.sm },
  exploreTile: { width: '100%', aspectRatio: 1, borderRadius: radii.md, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, padding: space.sm, overflow: 'hidden', ...elevation.card },
  exploreLabel: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.text, textAlign: 'center', alignSelf: 'stretch' },

  sectionSub: { ...type.small, color: color.textMuted, marginBottom: space.md },
  list: { paddingHorizontal: space.lg, gap: space.lg },
  skCard: { borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, overflow: 'hidden' },

  sticky: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border, ...elevation.float },
  stickyRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  stickySearch: { flex: 1, borderColor: color.primaryBorder },

  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.lg, paddingRight: space.sm, paddingTop: space.lg, paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: color.border },
  sheetTitle: { ...type.heading, color: color.text },
  sheetClose: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  collRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: 64, borderRadius: radii.md },
  collIcon: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  collName: { ...type.subheading, color: color.text },
  collCount: { ...type.small, color: color.textMuted, marginTop: space.xxs },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: color.primary, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' },
  checkOff: { opacity: 0.6 },
  sheetFoot: { borderTopWidth: 1, borderTopColor: color.border, paddingHorizontal: space.lg, paddingTop: space.lg },
});
