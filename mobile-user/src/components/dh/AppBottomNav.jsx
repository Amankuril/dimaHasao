import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Image from '../Img';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from '../Fa';
import { Press } from '../ui';
import { BottomSheet } from '../kit';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { color, elevation, radii, space, type } from '../../theme';

/*
 * The one consumer bottom nav: port of shared/components/app/AppBottomNav.jsx
 * (food and taxi, More opens a sheet) and DimaHasao/components/layout/
 * BottomNav.jsx (tourism shell, More is the /app/more screen and My Bookings
 * carries the ride count).
 *
 * Mounted once above the navigator; it decides from the path whether to show,
 * with the same rules the web applies per shell.
 */

const EMBLEM =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDHxXjaqg_p2_vshVQlQARltQKITPTxRdxMMlP-3QyFF5y8e2b25l5rewGDv8hjTJT1mIeodoXkQyW5Q5DbamrNM5Wqkn9zC5hXH-uNiaqjmuWSf0eYIG090j8R2skAqbm4nCA9jzMl8Rca5t2ANsI31UQDQpgiAqnjiXgjeFcP5hsy0iTh8orLvaeTNhXhfOJY7K7F6qam7R85TVEaEb8naGgso3oEml2Ix6YFyN-Jua917AHlmZIs';

const ANCHORS = [
  { id: 'home', label: 'Home', icon: 'fa-solid fa-house', path: '/app' },
  { id: 'bookings', label: 'Bookings', icon: 'fa-regular fa-calendar-check', path: '/app/bookings' },
  { id: 'center', isCenter: true, label: 'Explore', path: '/app/places' },
  { id: 'profile', label: 'Profile', icon: 'fa-regular fa-circle-user', path: '/app/profile' },
  { id: 'more', label: 'More', icon: 'fa-solid fa-ellipsis', path: '/app/more', isMore: true },
];

const MODULES = [
  { label: 'Tourist Places', icon: 'fa-solid fa-mountain-sun', path: '/app/places' },
  { label: 'Tour Packages', icon: 'fa-solid fa-suitcase-rolling', path: '/app/packages' },
  { label: 'Hotels & Stays', icon: 'fa-solid fa-hotel', path: '/app/hotels' },
  { label: 'Taxi & Auto', icon: 'fa-solid fa-car', path: '/taxi/user' },
  { label: 'Food & Dining', icon: 'fa-solid fa-bowl-food', path: '/food/user' },
  { label: 'Events & Festivals', icon: 'fa-solid fa-ticket', path: '/app/festivals' },
];

/** Food's own destinations, surfaced under the shared nav's More (app/routes.jsx). */
const FOOD_NAV_EXTRAS = [
  { label: 'Delivery', icon: 'fa-solid fa-motorcycle', path: '/food/user' },
  { label: 'Dining', icon: 'fa-solid fa-utensils', path: '/food/user/dining' },
  { label: 'My Orders', icon: 'fa-solid fa-receipt', path: '/food/user/orders' },
  { label: 'Cart', icon: 'fa-solid fa-cart-shopping', path: '/food/user/cart' },
];

const TAXI_NAV_EXTRAS = [
  { label: 'Book a Ride', icon: 'fa-solid fa-car-side', path: '/taxi/user' },
  { label: 'My Rides', icon: 'fa-solid fa-route', path: '/taxi/user/activity' },
  { label: 'Outstation', icon: 'fa-solid fa-road', path: '/taxi/user/intercity' },
  { label: 'Ride Wallet', icon: 'fa-solid fa-wallet', path: '/taxi/user/wallet' },
  { label: 'Support', icon: 'fa-solid fa-headset', path: '/taxi/user/support' },
];

// shared/components/app/immersiveRoutes.js
const IMMERSIVE_SUFFIXES = [
  '/ride/select-location', '/ride/select-vehicle', '/ride/searching', '/ride/tracking', '/ride/complete', '/ride/chat',
  '/intercity/vehicle', '/intercity/details', '/intercity/confirm',
  '/address-selector',
];
export const isImmersiveRoute = (pathname = '') => {
  const path = String(pathname || '').replace(/\/+$/, '');
  return IMMERSIVE_SUFFIXES.some((suffix) => path.endsWith(suffix));
};

/** Which shell a path belongs to, and whether that shell shows the nav there. */
export function navStateFor(pathname, signedIn) {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  if (path.startsWith('/food/user')) return { shell: 'food', visible: signedIn && !isImmersiveRoute(path) };
  if (path.startsWith('/taxi/user')) return { shell: 'taxi', visible: signedIn && !isImmersiveRoute(path) };
  if (path === '/app' || path.startsWith('/app/')) {
    // DimaHasao/routes/userRoutes.jsx: hidden on detail pages and sub-flows.
    const p = path.slice(4) || '/';
    const hidden =
      p === '/login' || p === '/support' || p === '/review' || p.endsWith('/book') ||
      /^\/(places|hotels|packages|festivals)\/[^/]+$/.test(p);
    return { shell: 'app', visible: signedIn && !hidden };
  }
  return { shell: null, visible: false };
}

/** Space a scrolling screen leaves so its last row clears the floating nav. */
export const NAV_CLEARANCE = 88;

export default function AppBottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { signedIn } = useAuth();
  const { bookings } = useBooking();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const { shell, visible } = navStateFor(pathname, signedIn);
  if (!visible) return null;

  const inApp = shell === 'app';
  const extras = shell === 'food' ? FOOD_NAV_EXTRAS : shell === 'taxi' ? TAXI_NAV_EXTRAS : [];
  const extrasTitle = shell === 'food' ? 'Food & Dining' : 'Taxi & Auto';
  const badge = inApp && bookings.length > 0 ? bookings.length : null;

  const isAnchorActive = (path) => (path === '/app' ? pathname === '/app' || pathname === '/app/' : pathname.startsWith(path));

  const go = (path) => {
    setIsMoreOpen(false);
    if (path) router.navigate(path);
  };

  return (
    <>
      <View pointerEvents="box-none" style={[styles.wrap, { bottom: 8 + insets.bottom }]}>
        <View style={[styles.nav, { width: Math.min(width - 20, 384) }]}>
          {ANCHORS.map((item) => {
            if (item.isCenter) {
              return (
                <View key="center" style={styles.centerSlot}>
                  <Press scale={0.92} onPress={() => go(item.path)} accessibilityLabel="Explore Dima Hasao" style={styles.centerBtn}>
                    <Image source={{ uri: EMBLEM }} style={styles.emblem} />
                  </Press>
                </View>
              );
            }
            const sheetMore = item.isMore && !inApp;
            const isActive = sheetMore ? isMoreOpen : isAnchorActive(item.path);
            return (
              <Press
                key={item.id}
                scale={0.88}
                onPress={() => (sheetMore ? setIsMoreOpen((o) => !o) : go(item.path))}
                accessibilityLabel={item.id === 'bookings' && badge ? `${item.label}, ${badge} active` : item.label}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                style={styles.item}
              >
                <View style={styles.iconBox}>
                  <Fa name={item.icon} size={18} color={isActive ? color.goldOnDark : 'rgba(255,255,255,0.85)'} />
                  {item.id === 'bookings' && badge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
                  {item.label}
                </Text>
                <View style={styles.lineSlot}>{isActive ? <View style={styles.line} /> : null}</View>
              </Press>
            );
          })}
        </View>
      </View>

      <BottomSheet visible={isMoreOpen} onClose={() => setIsMoreOpen(false)} backdrop={color.overlay} spring={{ stiffness: 380, damping: 34 }}>
        <View style={[styles.sheet, { maxHeight: height * 0.72 }]}>
          <View style={styles.grabber}>
            <View style={styles.grabberBar} />
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}>
            {extras.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{extrasTitle}</Text>
                <View style={styles.grid4}>
                  {extras.map((item) => (
                    <Press key={item.label} onPress={() => go(item.path)} accessibilityLabel={item.label} style={styles.extra}>
                      <View style={styles.extraIcon}>
                        <Fa name={item.icon} size={18} color={color.primary} />
                      </View>
                      <Text style={styles.extraText}>{item.label}</Text>
                    </Press>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={[styles.section, { paddingBottom: 16 }]}>
              <Text style={styles.sectionTitle}>Everything in Dima Hasao</Text>
              <View style={styles.grid2}>
                {MODULES.map((item) => (
                  <Press key={item.label} onPress={() => go(item.path)} accessibilityLabel={item.label} style={styles.module}>
                    <View style={styles.moduleIcon}>
                      <Fa name={item.icon} size={16} color={color.primary} />
                    </View>
                    <Text style={styles.moduleText}>{item.label}</Text>
                  </Press>
                ))}
              </View>
              <Press onPress={() => go('/app/more')} accessibilityLabel="Help, support and everything else" style={styles.everything}>
                <Text style={styles.everythingText}>Help, support & everything else</Text>
              </Press>
            </View>
          </ScrollView>
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.md, zIndex: 50 },
  nav: {
    height: 64, backgroundColor: color.primaryPressed, borderRadius: radii.pill, paddingHorizontal: space.sm,
    borderWidth: 1, borderColor: 'rgba(202,168,62,0.35)', flexDirection: 'row', alignItems: 'center',
    ...elevation.float,
  },
  item: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center' },
  iconBox: { height: 22, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -6, right: -12, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: color.goldBright,
    borderWidth: 2, borderColor: color.primaryPressed, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 11, lineHeight: 13, color: color.onGold, fontFamily: 'Poppins_700Bold' },
  label: { ...type.caption, marginTop: 3, color: 'rgba(255,255,255,0.85)' },
  labelActive: { color: color.goldOnDark, fontFamily: 'Poppins_600SemiBold' },
  lineSlot: { height: 3, width: 20, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  line: { width: 18, height: 3, borderRadius: 2, backgroundColor: color.goldOnDark },
  centerSlot: { width: 68, height: 56, alignItems: 'center' },
  centerBtn: {
    position: 'absolute', top: -18, width: 64, height: 64, borderRadius: 32, backgroundColor: color.primaryPressed, padding: 2,
    borderWidth: 3, borderColor: color.gold, alignItems: 'center', justifyContent: 'center', ...elevation.float,
  },
  emblem: { width: '100%', height: '100%', borderRadius: 32 },
  sheet: { backgroundColor: color.bg, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, borderTopWidth: 1, borderTopColor: color.border },
  grabber: { paddingTop: space.md, paddingBottom: space.sm, alignItems: 'center' },
  grabberBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.borderStrong },
  section: { paddingHorizontal: space.lg, paddingBottom: space.lg },
  sectionTitle: { ...type.overline, color: color.textMuted, marginBottom: space.sm },
  grid4: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  extra: { width: '23%', flexGrow: 1, alignItems: 'center', gap: space.xs + 2, paddingVertical: space.md, paddingHorizontal: space.xs, borderRadius: radii.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, minHeight: 84 },
  extraIcon: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  extraText: { ...type.caption, textAlign: 'center', color: color.text },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  module: { width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, paddingHorizontal: space.md, minHeight: 56, borderRadius: radii.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border },
  moduleIcon: { width: 32, height: 32, borderRadius: radii.sm, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  moduleText: { ...type.label, flex: 1, color: color.text },
  everything: { marginTop: space.md, minHeight: 48, justifyContent: 'center', borderRadius: radii.md, backgroundColor: color.primary, alignItems: 'center' },
  everythingText: { ...type.button, color: color.goldOnDark },
});
