import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ImageBackground, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronRight, MapPin, ShoppingBag, Tag, Truck, UtensilsCrossed, Wallet, X } from 'lucide-react-native';
import Image from '../../components/Img';
import { Press } from '../../components/ui';
import { publicGetOnce } from '../../api/food';
import { useProfile } from '../context/ProfileContext';
import { useCart } from '../context/CartContext';
import { getCachedUnder250PriceLimit, getLandingSettingsPublic } from '../utils/foodPageCache';
import { subscribeBottomNavShow } from '../utils/bottomNavEvents';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { poppins, shadow, tw } from '../../theme';

/** Food module brand colours (the pages write them as arbitrary values). */
export const F = { green: '#0A4D2B', greenDark: '#06381E', accent: '#257D3C', cream: '#FAF6ED' };

/*
 * UserLayout's two small contexts.
 * - LocationSelector: `openLocationSelector()` opens the address selector page.
 * - the global "Fetching Location..." overlay flag.
 * The web's SearchOverlay context is the search route here (see useSearchOverlay).
 */
const LocationSelectorContext = createContext({
  isLocationSelectorOpen: false,
  openLocationSelector: () => {},
  closeLocationSelector: () => {},
  showGlobalLoader: false,
  setShowGlobalLoader: () => {},
});

export function useLocationSelector() {
  return useContext(LocationSelectorContext);
}

export function LocationSelectorProvider({ children }) {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const [showGlobalLoader, setShowGlobalLoader] = useState(false);

  const openLocationSelector = useCallback(() => {
    router.push({ pathname: '/food/user/address-selector', params: { from: pathRef.current } });
  }, []);
  const closeLocationSelector = useCallback(() => {}, []);

  const value = useMemo(
    () => ({ isLocationSelectorOpen: false, openLocationSelector, closeLocationSelector, showGlobalLoader, setShowGlobalLoader }),
    [openLocationSelector, closeLocationSelector, showGlobalLoader],
  );
  return <LocationSelectorContext.Provider value={value}>{children}</LocationSelectorContext.Provider>;
}

/** The text typed into the web's SearchOverlay before it opens (shared with screens/discovery/SearchOverlay). */
let searchOverlayValue = '';
export const getSearchOverlayValue = () => searchOverlayValue;
export const setSearchOverlayValue = (value) => {
  searchOverlayValue = String(value ?? '');
};

/** Web: SearchOverlayProvider. The overlay is the `search-overlay` screen here. */
export function useSearchOverlay() {
  return useMemo(
    () => ({
      isSearchOpen: false,
      searchValue: '',
      setSearchValue: setSearchOverlayValue,
      openSearch: () => router.push('/food/user/search-overlay'),
      closeSearch: () => {
        searchOverlayValue = '';
      },
    }),
    [],
  );
}

/* ------------------------------------------------------------------ *
 * Scroll-aware visibility of the food tab bar (web: hides on scroll down)
 * ------------------------------------------------------------------ */
const navSubs = new Set();
let navVisible = true;
export function setFoodNavVisible(next) {
  if (navVisible === next) return;
  navVisible = next;
  navSubs.forEach((fn) => fn(next));
}

/** onScroll handler for a main-tab ScrollView / FlatList. */
export function useFoodNavScroll() {
  const lastY = useRef(0);
  const up = useRef(0);
  const down = useRef(0);
  return useCallback((e) => {
    const y = Math.max(0, e.nativeEvent.contentOffset.y);
    const diff = y - lastY.current;
    lastY.current = y;
    if (y < 60) {
      up.current = 0;
      down.current = 0;
      setFoodNavVisible(true);
      return;
    }
    if (diff > 0) {
      down.current += diff;
      up.current = 0;
      if (down.current > 24) setFoodNavVisible(false);
    } else if (diff < 0) {
      up.current -= diff;
      down.current = 0;
      if (up.current > 24) setFoodNavVisible(true);
    }
  }, []);
}

const TABS = [
  { id: 'delivery', route: 'index', label: 'Delivery', icon: Truck, to: '/food/user', orderType: 'delivery' },
  { id: 'takeaway', route: 'takeaway', label: 'Takeaway', icon: ShoppingBag, to: '/food/user/takeaway', orderType: 'takeaway' },
  { id: 'under250', route: 'under-250', label: 'Under 250', icon: Tag, to: '/food/user/under-250' },
  { id: 'dining', route: 'dining', label: 'Dining', icon: UtensilsCrossed, to: '/food/user/dining' },
];

/**
 * Port of components/user/BottomNavigation.jsx: the white pill with
 * Delivery / Takeaway / Under 250 / Dining that floats above the shared nav
 * on the food main tabs. Used as the Tabs navigator's tab bar.
 */
export function FoodBottomNavigation({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { setOrderType } = useProfile();
  const y = useAnimatedValue(0);
  const [, setLimit] = useState(() => getCachedUnder250PriceLimit(250));

  useEffect(() => {
    // Keeps the admin's "under ₹N" limit warm for the tab it labels.
    let cancelled = false;
    getLandingSettingsPublic(() => publicGetOnce('/food/landing/settings/public'))
      .then((settings) => {
        const n = Number(settings?.under250PriceLimit);
        if (!cancelled && Number.isFinite(n) && n > 0) setLimit(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const apply = (visible) => Animated.timing(y, { toValue: visible ? 0 : 120, duration: 200, useNativeDriver: true }).start();
    navSubs.add(apply);
    const unsub = subscribeBottomNavShow(() => setFoodNavVisible(true));
    return () => {
      navSubs.delete(apply);
      unsub();
    };
  }, [y]);

  const activeRoute = state.routes[state.index]?.name;
  // Every tab switch shows the bar again.
  useEffect(() => {
    setFoodNavVisible(true);
  }, [activeRoute]);

  // Web: the pill is not shown on the profile tab.
  if (activeRoute === 'profile') return null;

  return (
    <Animated.View pointerEvents="box-none" style={[styles.navWrap, { bottom: 68 + insets.bottom, transform: [{ translateY: y }] }]}>
      <View style={[styles.nav, { width: Math.min(width - 48, 448) }]}>
        {TABS.filter((tab) => state.routes.some((r) => r.name === tab.route)).map((tab) => {
          const active = activeRoute === tab.route;
          const Icon = tab.icon;
          return (
            <Press
              key={tab.id}
              scale={0.96}
              onPress={() => {
                setFoodNavVisible(true);
                if (tab.orderType) setOrderType(tab.orderType);
                navigation.navigate(tab.route);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              style={styles.navItem}
            >
              {active ? <View style={styles.navActiveBg} /> : null}
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Icon size={active ? 22 : 20} color={active ? F.green : tw.gray600} strokeWidth={active ? 2.5 : 2} />
                <Text style={[styles.navLabel, active ? { color: F.green } : null]}>{tab.label.toUpperCase()}</Text>
              </View>
            </Press>
          );
        })}
      </View>
    </Animated.View>
  );
}

/** Port of components/user/OutOfZoneScreen.jsx. */
export function OutOfZoneScreen({ location, handleLocationClick }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { userProfile } = useProfile();
  const name = userProfile?.firstName || userProfile?.name || '';
  const initials = userProfile ? name[0]?.toUpperCase() || 'U' : 'U';
  const area = location?.area || location?.subLocality || location?.mainTitle || location?.neighborhood;
  const title = area && !/^-?\d+(\.\d+)?$/.test(String(area).trim()) ? area : location?.city || 'Select Location';

  return (
    <ImageBackground source={require('../../../assets/food/outofzone_bg.jpg')} style={styles.ooz} resizeMode="cover">
      <View style={[styles.oozBar, { paddingTop: 24 + insets.top }]}>
        <Press scale={0.97} onPress={handleLocationClick} style={styles.oozLoc} accessibilityLabel={`Change location, ${title}`}>
          <MapPin size={20} color="#fff" />
          <View style={{ flexShrink: 1 }}>
            <View style={styles.row}>
              <Text style={styles.oozTitle} numberOfLines={1}>{title}</Text>
              <ChevronDown size={14} color="rgba(255,255,255,0.9)" />
            </View>
            <Text style={styles.oozCity} numberOfLines={1}>{location?.city || 'Pinpoint location'}</Text>
          </View>
        </Press>
        <View style={[styles.row, { gap: 12 }]}>
          <Press scale={0.9} onPress={() => router.push('/food/user/wallet')} style={styles.oozIcon} accessibilityLabel="Wallet">
            <Wallet size={22} color="#fff" />
          </Press>
          <Press scale={0.9} onPress={() => router.navigate('/food/user/profile')} style={styles.oozAvatar} accessibilityLabel="Profile">
            <Text style={styles.oozInitial}>{initials}</Text>
          </Press>
        </View>
      </View>

      <View style={[styles.oozText, { top: height * 0.48 - 80 }]}>
        <Text style={styles.oozHeading}>We&apos;ll be there soon –{'\n'}hang tight!</Text>
        <Text style={styles.oozBody}>Looks like online ordering isn&apos;t available{'\n'}at your location yet.</Text>
      </View>
      <Text style={[styles.oozBrand, { top: height * 0.71 }]}>Dima Hasao Food</Text>
    </ImageBackground>
  );
}

/** Port of components/user/StickyCartCard.jsx: the cart strip above the tab bar. */
export function StickyCartCard() {
  const insets = useSafeAreaInsets();
  const { cart, getCartCount } = useCart();
  const [isVisible, setIsVisible] = useState(true);
  const cartCount = getCartCount();
  if (cartCount === 0 || !isVisible) return null;

  const restaurantName = cart[0]?.restaurant || 'Restaurant';
  const restaurantImage = cart[0]?.image || 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=200&h=200&fit=crop';
  const restaurantSlug = String(restaurantName).toLowerCase().replace(/\s+/g, '-');

  return (
    <View pointerEvents="box-none" style={[styles.cartWrap, { bottom: 148 + insets.bottom }]}>
      <View style={styles.cart}>
        <Image source={{ uri: restaurantImage }} style={styles.cartImg} />
        <Press scale={0.98} onPress={() => router.push(`/food/user/restaurants/${restaurantSlug}`)} style={{ flex: 1, minWidth: 0 }} accessibilityLabel={`${restaurantName}. View menu`}>
          <Text style={styles.cartName} numberOfLines={1}>{restaurantName}</Text>
          <View style={[styles.row, { gap: 4 }]}>
            <Text style={styles.cartSub}>View Menu</Text>
            <ChevronRight size={12} color={tw.gray600} />
          </View>
        </Press>
        <Press scale={0.96} onPress={() => router.push('/food/user/cart')} style={styles.cartBtn} accessibilityLabel={`View cart, ${cartCount} items`}>
          <Text style={[styles.cartBtnText, { opacity: 0.9 }]}>View Cart</Text>
          <Text style={[styles.cartBtnText, poppins(700)]}>
            {cartCount} {cartCount === 1 ? 'item' : 'items'}
          </Text>
        </Press>
        <Press scale={0.9} onPress={() => setIsVisible(false)} style={styles.cartClose} accessibilityLabel="Hide cart strip" hitSlop={6}>
          <X size={16} color={tw.gray500} />
        </Press>
      </View>
    </View>
  );
}

/** "Fetching Location..." blocker shown only for a manual location change. */
export function LocationLoaderOverlay() {
  const spin = useAnimatedValue(0);
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);
  return (
    <View style={styles.loader} accessibilityRole="progressbar" accessibilityLabel="Fetching location">
      <Animated.View style={[styles.loaderRing, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
      <Text style={styles.loaderText}>Fetching Location...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  navWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 40 },
  nav: {
    height: 72, backgroundColor: '#fff', borderRadius: 32, borderWidth: 1, borderColor: tw.gray100, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-around', paddingHorizontal: 8, overflow: 'hidden', ...shadow('0 15px 40px -10px rgba(0,0,0,0.3)'),
  },
  navItem: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center' },
  navActiveBg: { position: 'absolute', top: 4, bottom: 4, left: 4, right: 4, borderRadius: 24, backgroundColor: '#FFF5F5' },
  navLabel: { fontSize: 10, lineHeight: 10, letterSpacing: -0.25, color: 'rgba(16,24,40,0.7)', ...poppins(900) },

  ooz: { flex: 1, backgroundColor: '#2A1C3D' },
  oozBar: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  oozLoc: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  oozTitle: { flexShrink: 1, fontSize: 17, lineHeight: 24, color: '#fff', ...poppins(900) },
  oozCity: { fontSize: 12, lineHeight: 15, color: 'rgba(255,255,255,0.9)', ...poppins(700) },
  oozIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  oozAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF5E6', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  oozInitial: { fontSize: 22, lineHeight: 26, color: F.green, ...poppins(900) },
  oozText: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 24, alignItems: 'center' },
  oozHeading: { fontSize: 28, lineHeight: 33.6, letterSpacing: -0.7, color: '#fff', textAlign: 'center', marginBottom: 16, ...poppins(700) },
  oozBody: { fontSize: 16, lineHeight: 24, color: 'rgba(255,255,255,0.9)', textAlign: 'center', ...poppins(500) },
  oozBrand: { position: 'absolute', left: 32, fontSize: 34, lineHeight: 38, letterSpacing: -1.7, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', ...poppins(900) },

  cartWrap: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, zIndex: 30 },
  cart: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: tw.gray200, ...shadow('2xl') },
  cartImg: { width: 56, height: 56, borderRadius: 8, backgroundColor: tw.gray100 },
  cartName: { fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 2, ...poppins(700) },
  cartSub: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  cartBtn: { backgroundColor: F.green, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  cartBtnText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(600) },
  cartClose: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  loader: { ...StyleSheet.absoluteFillObject, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  loaderRing: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: F.green, borderTopColor: 'transparent' },
  loaderText: { marginTop: 16, fontSize: 13, lineHeight: 20, letterSpacing: -0.3, color: tw.gray800, ...poppins(700) },
});
