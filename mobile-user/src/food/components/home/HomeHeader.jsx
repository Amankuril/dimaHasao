import { forwardRef, useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Bell, ChevronDown, MapPin, Mic, Search, Soup, Utensils, Wallet } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import { useProfile } from '../../context/ProfileContext';
import useNotificationInbox from '../../hooks/useNotificationInbox';
import { isModuleAuthenticated } from '../../utils/auth';
import { events } from '../../../lib/events';
import { localStore } from '../../../lib/storage';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { poppins, shadow, tw } from '../../../theme';
import { F } from '../shell';

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
    <Press scale={0.95} onPress={() => goIfSignedIn('/food/user/profile')} accessibilityLabel="Profile" style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, style]}>
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
  const h = compact ? 18 : 20;
  const knob = compact ? 14 : 16;
  return (
    <View ref={ref} collapsable={false} style={styles.veg}>
      <Text style={[styles.vegLabel, compact ? { fontSize: 8 } : null, dark ? styles.vegLabelDark : { color: tw.gray500 }]}>VEG MODE</Text>
      <Press
        scale={1}
        onPress={() => onChange?.(!vegMode)}
        accessibilityRole="switch"
        accessibilityState={{ checked: !!vegMode }}
        accessibilityLabel="Veg mode"
        hitSlop={10}
        style={[
          styles.vegTrack,
          { width: w, height: h, borderRadius: h / 2 },
          dark ? { borderColor: 'rgba(255,255,255,0.2)' } : { borderColor: tw.gray200 },
          { backgroundColor: vegMode ? '#48c479' : dark ? 'rgba(106,114,130,0.6)' : tw.gray300 },
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
      <Search size={20} color={F.green} strokeWidth={3} style={{ marginRight: 8 }} />
      <View style={styles.searchTextBox}>
        <Animated.Text numberOfLines={1} style={[styles.searchText, { opacity: fade, transform: [{ translateY: y }] }]}>
          {placeholder || 'Search'}
        </Animated.Text>
      </View>
      <View style={styles.searchMic}>
        <Mic size={20} color={tw.gray400} />
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
        transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }, { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }, { rotate }],
      }}
    >
      <Image source={{ uri }} style={[{ width: size, height: size, borderRadius: radius, borderWidth: border, borderColor: '#fff', backgroundColor: '#fff' }]} />
    </Animated.View>
  );
}

/**
 * Port of components/user/home/HomeHeader.jsx: location row, bell / wallet /
 * profile, search + veg toggle and the "Flavour Fest" promo that fills the
 * rest of the 255px hero. The Food / Taxi tabs row is switched off on the web
 * (SHOW_VERTICAL_TABS = false), so it is not drawn here either.
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
    <View style={{ paddingBottom: 8 }}>
      <View style={styles.topRow}>
        <Press
          scale={0.98}
          onPress={() => router.push({ pathname: '/food/user/address-selector', params: { from: pathname } })}
          accessibilityLabel={`Delivery location: ${locationTitle(location)}. Change`}
          style={styles.loc}
        >
          <View style={styles.locIcon}>
            <MapPin size={16} color="rgba(255,255,255,0.9)" fill="rgba(255,255,255,0.2)" />
          </View>
          <View style={{ flexShrink: 1 }}>
            <View style={styles.row}>
              <Text style={styles.locTitle} numberOfLines={1}>{locationTitle(location)}</Text>
              <ChevronDown size={12} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.locSub} numberOfLines={1}>{locationSubtitle(location)}</Text>
          </View>
        </Press>

        <View style={[styles.row, { gap: 12 }]}>
          <Press scale={0.9} onPress={() => goIfSignedIn('/food/user/notifications')} accessibilityLabel={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} style={styles.iconBtn} hitSlop={6}>
            <Bell size={24} color="#fff" strokeWidth={2} />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Press>
          <Press scale={0.9} onPress={() => goIfSignedIn('/food/user/wallet')} accessibilityLabel="Wallet" style={styles.iconBtn} hitSlop={6}>
            <Wallet size={26} color="#fff" strokeWidth={2.2} />
          </Press>
          <ProfileAvatar size={36} />
        </View>
      </View>

      <View style={styles.hero}>
        <View style={[styles.row, { gap: 12 }]}>
          <SearchPill onPress={handleSearchFocus} placeholder={placeholders?.[placeholderIndex]} style={{ flex: 1 }} />
          <VegModeToggle ref={vegModeToggleRef} vegMode={vegMode} onChange={handleVegModeChange} />
        </View>

        {showBanner ? (
          <View style={styles.promo}>
            {!hideFoodImages ? (
              <>
                <Text style={styles.promoTitle}>{vegMode ? 'VEGGIE DELIGHT' : 'FLAVOUR FEST'}</Text>
                <View style={styles.promoPill}>
                  <Utensils size={20} color="#fff200" />
                  <Text style={styles.promoPillText}>{vegMode ? 'Pure Veg Magic!' : 'Good Food, Great Mood!'}</Text>
                  <Soup size={24} color="#fff200" />
                </View>
                <View style={styles.dishes}>
                  <FloatingDish uri={displayImages[0]} size={52} radius={16} border={3} rotate="-3deg" />
                  <FloatingDish uri={displayImages[1]} size={72} radius={36} border={4} rotate="0deg" duration={6000} />
                  <FloatingDish uri={displayImages[2]} size={52} radius={16} border={3} rotate="3deg" delay={400} duration={4000} />
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
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  loc: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  locIcon: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 6, borderRadius: 12 },
  locTitle: { flexShrink: 1, fontSize: 15, lineHeight: 20, color: '#fff', ...poppins(900) },
  locSub: { fontSize: 10, lineHeight: 12.5, color: 'rgba(255,255,255,0.8)', marginTop: 2, ...poppins(500) },
  iconBtn: { padding: 6, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -4, right: -4, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: tw.green400, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { fontSize: 8, lineHeight: 10, color: '#fff', ...poppins(600) },
  avatar: { borderWidth: 1.5, borderColor: '#fff', overflow: 'hidden', backgroundColor: '#FFF5E6' },

  hero: { height: 255, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, overflow: 'hidden' },
  search: {
    backgroundColor: '#fff', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', ...shadow('xl'),
  },
  searchTextBox: { flex: 1, height: 20, overflow: 'hidden', justifyContent: 'center' },
  searchText: { fontSize: 15, lineHeight: 20, color: tw.gray400, ...poppins(700) },
  searchMic: { paddingLeft: 12, marginLeft: 4, borderLeftWidth: 1, borderLeftColor: tw.gray100 },

  veg: { alignItems: 'center', gap: 4 },
  vegLabel: { fontSize: 9, lineHeight: 9, letterSpacing: 0.9, ...poppins(900) },
  vegLabelDark: { color: '#fff', textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 },
  vegTrack: { borderWidth: 1, justifyContent: 'center' },
  vegKnob: { backgroundColor: '#fff', ...shadow('md') },

  promo: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, overflow: 'hidden' },
  promoTitle: {
    fontSize: 24, lineHeight: 24, color: '#fff200', fontStyle: 'italic', textShadowColor: '#5a0000', textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1, ...poppins(900),
  },
  promoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  promoPillText: { fontSize: 14, lineHeight: 20, color: '#fff', fontStyle: 'italic', paddingHorizontal: 8, ...poppins(700) },
  dishes: { height: 72, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 12, alignSelf: 'stretch' },
});
