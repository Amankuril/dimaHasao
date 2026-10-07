import { forwardRef, useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Bell, ChevronDown, MapPin, Mic, Search, Wallet } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import { useProfile } from '../../context/ProfileContext';
import useNotificationInbox from '../../hooks/useNotificationInbox';
import { isModuleAuthenticated } from '../../utils/auth';
import { events } from '../../../lib/events';
import { localStore } from '../../../lib/storage';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { color, elevation, radii, space, type } from '../../../theme';

const bannerImages = {
  nonVeg: [
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=500&h=500&fit=crop',
  ],
  veg: [
    'https://images.unsplash.com/photo-1585238341267-1cfec2046a55?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&h=500&fit=crop',
  ],
};

const PROFILE_AVATAR = require('../../../../assets/food/profile_avatar.webp');

/** Opens a page that needs a session, or asks the shell for the login prompt. */
export function goIfSignedIn(href) {
  if (!isModuleAuthenticated('user')) {
    events.emit('show-login-required');
    return;
  }
  router.push(href);
}

const readUnreadFromStorage = () => {
  try {
    const saved = JSON.parse(localStore.getItem('food_user_notifications') || '[]');
    if (!Array.isArray(saved)) return 0;
    return saved.filter((n) => {
      if (n?.read) return false;
      const id = String(n?.id || '');
      const title = String(n?.title || '');
      const message = String(n?.message || '');
      if (id === '1' || id === '2') return false;
      if (title === 'Order Confirmed' && message.includes('#12345')) return false;
      if (title === 'Special Offer' && message.includes('50% off')) return false;
      return true;
    }).length;
  } catch {
    return 0;
  }
};

export function locationTitle(location) {
  const area = location?.area || location?.subLocality || location?.mainTitle || location?.neighborhood;
  const city = (location?.city || '').toLowerCase();
  const state = (location?.state || '').toLowerCase();
  if (area && !/^-?\d+(\.\d+)?$/.test(String(area).trim())) {
    const areaLower = String(area).toLowerCase();
    if (areaLower !== city && areaLower !== state) return area;
  }
  if (location?.address && location.address !== 'Select location') {
    const parts = String(location.address).split(',').map((p) => p.trim());
    for (const part of parts) {
      const partLower = part.toLowerCase();
      if (partLower && partLower !== city && partLower !== state && !/^-?\d/.test(part) && part.length > 2) return part;
    }
  }
  return location?.area || location?.city || 'Select Location';
}

export function locationSubtitle(location) {
  const state = location?.state || '';
  const pincode = location?.pincode || '';
  if (state && pincode) return `${state}, ${pincode}`;
  if (state) return state;
  if (pincode) return pincode;
  const addr = location?.address || '';
  if (addr && addr.length > 10) return addr.split(',').slice(1, 3).join(',').trim() || 'Pinpoint location';
  return 'Pinpoint location';
}

/** The round profile photo used by the food headers. */
export function ProfileAvatar({ size = 36, style }) {
  const { userProfile } = useProfile();
  const [failed, setFailed] = useState(false);
  const uri = !failed && userProfile?.profileImage ? userProfile.profileImage : null;
  return (
    <Press
      scale={0.95}
      onPress={() => goIfSignedIn('/food/user/profile')}
      accessibilityLabel="Profile"
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, style]}
    >
      <Image source={uri ? { uri } : PROFILE_AVATAR} onError={() => setFailed(true)} style={{ width: '100%', height: '100%' }} />
    </Press>
  );
}

/** Veg Mode label + switch. The ref is measured to anchor the veg popup. */
export const VegModeToggle = forwardRef(function VegModeToggle({ vegMode, onChange, dark = true, compact = false }, ref) {
  const x = useAnimatedValue(vegMode ? 1 : 0);
  useEffect(() => {
    Animated.spring(x, { toValue: vegMode ? 1 : 0, stiffness: 500, damping: 30, mass: 1, useNativeDriver: true }).start();
  }, [vegMode, x]);
  const w = compact ? 40 : 44;
  const h = compact ? 22 : 24;
  const knob = h - 6;
  return (
    <View ref={ref} collapsable={false} style={styles.veg}>
      <Text style={[styles.vegLabel, { color: dark ? color.textInverse : color.textSecondary }]}>Veg mode</Text>
      <Press
        scale={1}
        onPress={() => onChange?.(!vegMode)}
        accessibilityRole="switch"
        accessibilityState={{ checked: !!vegMode }}
        accessibilityLabel="Veg mode"
        hitSlop={12}
        style={[
          styles.vegTrack,
          { width: w, height: h, borderRadius: h / 2 },
          { borderColor: dark ? 'rgba(255,255,255,0.35)' : color.borderStrong },
          // Veg green is the FSSAI veg colour: the switch means "veg only".
          { backgroundColor: vegMode ? color.veg : dark ? 'rgba(255,255,255,0.18)' : color.surfaceMuted },
        ]}
      >
        <Animated.View
          style={[
            styles.vegKnob,
            { width: knob, height: knob, borderRadius: knob / 2 },
            { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [2, w - knob - 4] }) }] },
          ]}
        />
      </Press>
    </View>
  );
});

/** Search pill with the rotating `Search "burger"` placeholder. */
export function SearchPill({ onPress, placeholder, style, staticText }) {
  const y = useAnimatedValue(0);
  const fade = useAnimatedValue(1);
  useEffect(() => {
    if (staticText) return;
    y.setValue(10);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [placeholder, staticText, y, fade]);
  return (
    <Press scale={0.98} onPress={onPress} accessibilityRole="search" accessibilityLabel="Search restaurants and dishes" style={[styles.search, style]}>
      <Search size={20} color={color.primary} strokeWidth={2.5} />
      <View style={styles.searchTextBox}>
        <Animated.Text numberOfLines={1} style={[styles.searchText, { opacity: fade, transform: [{ translateY: y }] }]}>
          {placeholder || 'Search'}
        </Animated.Text>
      </View>
      <View style={styles.searchMic}>
        <Mic size={18} color={color.textMuted} />
      </View>
    </Press>
  );
}

function FloatingDish({ uri, size, radius, border, rotate, delay = 0, duration = 3500 }) {
  const float = useAnimatedValue(0);
  const enter = useAnimatedValue(0);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: duration / 2, delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float, delay, duration]);
  useEffect(() => {
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, damping: 15, stiffness: 100, mass: 1, useNativeDriver: true }).start();
  }, [uri, enter]);
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        opacity: enter,
        transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }, { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }, { rotate }],
      }}
    >
      <Image source={{ uri }} style={[{ width: size, height: size, borderRadius: radius, borderWidth: border, borderColor: color.gold, backgroundColor: color.surface }]} />
    </Animated.View>
  );
}

/**
 * Port of components/user/home/HomeHeader.jsx: location row, bell / wallet /
 * profile, search + veg toggle and the "Flavour Fest" promo, drawn in the
 * heritage look (deep green, gold Cinzel title, Playfair tagline). The Food /
 * Taxi tabs row is switched off on the web (SHOW_VERTICAL_TABS = false), so it
 * is not drawn here either.
 */
export default function HomeHeader({
  location,
  handleSearchFocus,
  placeholderIndex,
  placeholders,
  vegMode = false,
  handleVegModeChange,
  vegModeToggleRef,
  isTabActive = true,
  hideFoodImages = false,
  showBanner = false,
}) {
  const pathname = usePathname();
  const { unreadCount: broadcastUnread } = useNotificationInbox('user', { pollMs: 60000, enabled: isTabActive });
  const [localUnread, setLocalUnread] = useState(readUnreadFromStorage);

  useEffect(() => {
    const handler = (e) => setLocalUnread(e?.detail?.count ?? readUnreadFromStorage());
    events.on('notificationsUpdated', handler);
    return () => events.off('notificationsUpdated', handler);
  }, []);
  useEffect(() => {
    setLocalUnread(readUnreadFromStorage());
  }, [pathname]);
  const unreadCount = broadcastUnread + localUnread;

  const [imgIndex, setImgIndex] = useState(0);
  const currentPool = vegMode ? bannerImages.veg : bannerImages.nonVeg;
  useEffect(() => {
    if (!showBanner || !isTabActive) return undefined;
    const timer = setInterval(() => setImgIndex((prev) => (prev + 1) % currentPool.length), 4000);
    return () => clearInterval(timer);
  }, [currentPool.length, showBanner, isTabActive]);
  useEffect(() => {
    setImgIndex(0);
  }, [vegMode]);
  const displayImages = [currentPool[imgIndex % currentPool.length], currentPool[(imgIndex + 1) % currentPool.length], currentPool[(imgIndex + 2) % currentPool.length]];

  return (
    <View style={{ paddingBottom: space.lg }}>
      <View style={styles.topRow}>
        <Press
          scale={0.98}
          onPress={() => router.push({ pathname: '/food/user/address-selector', params: { from: pathname } })}
          accessibilityLabel={`Delivery location: ${locationTitle(location)}. Change`}
          style={styles.loc}
        >
          <View style={styles.locIcon}>
            <MapPin size={18} color={color.gold} />
          </View>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <View style={styles.row}>
              <Text style={styles.locTitle} numberOfLines={1}>{locationTitle(location)}</Text>
              <ChevronDown size={16} color={color.textOnDarkMuted} style={{ marginLeft: space.xs }} />
            </View>
            <Text style={styles.locSub} numberOfLines={1}>{locationSubtitle(location)}</Text>
          </View>
        </Press>

        <View style={[styles.row, { gap: space.xs }]}>
          <Press scale={0.9} onPress={() => goIfSignedIn('/food/user/notifications')} accessibilityLabel={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} style={styles.iconBtn}>
            <Bell size={22} color={color.textInverse} strokeWidth={2} />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Press>
          <Press scale={0.9} onPress={() => goIfSignedIn('/food/user/wallet')} accessibilityLabel="Wallet" style={styles.iconBtn}>
            <Wallet size={22} color={color.textInverse} strokeWidth={2} />
          </Press>
          <ProfileAvatar size={40} />
        </View>
      </View>

      <View style={styles.hero}>
        <View style={[styles.row, { gap: space.md }]}>
          <SearchPill onPress={handleSearchFocus} placeholder={placeholders?.[placeholderIndex]} style={{ flex: 1 }} />
          <VegModeToggle ref={vegModeToggleRef} vegMode={vegMode} onChange={handleVegModeChange} />
        </View>

        {showBanner ? (
          <View style={[styles.promo, hideFoodImages ? styles.promoBare : null]}>
            {!hideFoodImages ? (
              <>
                <View style={styles.promoText}>
                  <Text style={styles.promoTitle} accessibilityRole="header" numberOfLines={1}>
                    {vegMode ? 'VEGGIE DELIGHT' : 'FLAVOUR FEST'}
                  </Text>
                  <Text style={styles.promoTag} numberOfLines={1}>{vegMode ? 'Pure veg magic' : 'Good food, great mood'}</Text>
                </View>
                <View style={styles.dishes}>
                  <FloatingDish uri={displayImages[0]} size={52} radius={radii.md} border={2} rotate="-3deg" />
                  <FloatingDish uri={displayImages[1]} size={72} radius={36} border={2} rotate="0deg" duration={6000} />
                  <FloatingDish uri={displayImages[2]} size={52} radius={radii.md} border={2} rotate="3deg" delay={400} duration={4000} />
                </View>
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.lg, paddingRight: space.md, paddingTop: space.md, paddingBottom: space.sm },
  loc: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, minWidth: 0, minHeight: 44 },
  locIcon: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  locTitle: { ...type.subheading, color: color.textInverse, flexShrink: 1 },
  locSub: { ...type.caption, color: color.textOnDarkMuted },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: 4, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: color.goldBright,
    borderWidth: 1.5, borderColor: color.primaryDeep, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { ...type.caption, fontSize: 12, lineHeight: 14, fontFamily: 'Poppins_700Bold', color: color.onGold },
  avatar: { borderWidth: 2, borderColor: color.gold, overflow: 'hidden', backgroundColor: color.goldSoft },

  hero: { paddingHorizontal: space.lg, paddingTop: space.sm },
  search: {
    height: 48, backgroundColor: color.surface, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md + 2,
    borderWidth: 1, borderColor: color.border, ...elevation.card,
  },
  searchTextBox: { flex: 1, height: 22, overflow: 'hidden', justifyContent: 'center' },
  searchText: { ...type.body, color: color.textMuted },
  searchMic: { paddingLeft: space.md, borderLeftWidth: 1, borderLeftColor: color.border },

  veg: { alignItems: 'center', gap: space.xs },
  vegLabel: { ...type.caption, fontFamily: 'Poppins_600SemiBold' },
  vegTrack: { borderWidth: 1, justifyContent: 'center' },
  vegKnob: { backgroundColor: color.surface, ...elevation.card },

  promo: { marginTop: space.lg, alignItems: 'center', gap: space.md, paddingVertical: space.lg, paddingHorizontal: space.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(202,168,62,0.45)', backgroundColor: 'rgba(255,255,255,0.06)' },
  promoBare: { minHeight: 170, borderWidth: 0, backgroundColor: 'transparent' },
  promoText: { alignItems: 'center', gap: space.xxs, alignSelf: 'stretch' },
  promoTitle: { ...type.heroSerif, color: color.goldOnDark, textAlign: 'center' },
  promoTag: { ...type.tagline, fontSize: 14, color: color.textOnDarkMuted, textAlign: 'center' },
  dishes: { height: 76, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: space.md },
});
