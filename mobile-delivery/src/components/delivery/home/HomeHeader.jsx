import { useEffect } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, Bell, Clock, Contact, Navigation2 } from 'lucide-react-native';
import { useDeliveryHome } from '../../../delivery/DeliveryHomeContext';
import { formatTripDistanceKm } from '../../../delivery/hooks/useProximityCheck';
import { resolveOrderKey } from '../../../delivery/store/useDeliveryStore';
import { mediaUrl } from '../../../api/client';
import { Press } from '../../ui';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { display, poppins, shadow, tw } from '../../../theme';

/*
 * The dark top bar of pages/DeliveryHomeV2.jsx (feed, pocket, profile).
 * `bg-[#121212]/95` is replaced by deliveryTheme.css with an opaque
 * linear-gradient(160deg, #15498b, #000). Text is Poppins (no font-poppins
 * root); font-black is Sora. Every rounded-2xl card gets the theme's #E5DDC3
 * border and card shadow.
 */

const AVATAR = require('../../../../assets/images/profile_avatar.webp');

function OnlineToggle({ isOnline, onPress }) {
  const x = useAnimatedValue(isOnline ? 59 : 0);
  useEffect(() => {
    // framer-motion's default spring for x
    Animated.spring(x, { toValue: isOnline ? 59 : 0, stiffness: 500, damping: 25, useNativeDriver: true }).start();
  }, [isOnline, x]);
  return (
    <Press
      onPress={onPress}
      scale={1}
      accessibilityRole="switch"
      accessibilityLabel="Online status"
      accessibilityState={{ checked: isOnline }}
      style={[styles.toggle, { backgroundColor: isOnline ? tw.primary : tw.primaryStrong }, shadow(isOnline ? '0 10px 15px -3px rgba(21,73,139,0.32), 0 4px 6px -4px rgba(21,73,139,0.32)' : '0 10px 15px -3px rgba(0,0,0,0.28), 0 4px 6px -4px rgba(0,0,0,0.28)')]}
    >
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{isOnline ? 'Online' : ''}</Text>
        <Text style={styles.toggleLabel}>{!isOnline ? 'Offline' : ''}</Text>
      </View>
      <Animated.View style={[styles.knob, shadow('xs'), { transform: [{ translateX: x }] }]} />
    </Press>
  );
}

function Pulse({ children, active }) {
  const o = useAnimatedValue(1);
  useEffect(() => {
    if (!active) {
      o.setValue(1);
      return undefined;
    }
    const ease = Easing.bezier(0.4, 0, 0.6, 1);
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 0.5, duration: 1000, easing: ease, useNativeDriver: true }),
        Animated.timing(o, { toValue: 1, duration: 1000, easing: ease, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [active, o]);
  return <Animated.View style={{ opacity: o }}>{children}</Animated.View>;
}

export default function HomeHeader() {
  const insets = useSafeAreaInsets();
  const home = useDeliveryHome();
  const {
    currentTab,
    isOnline,
    activeOrder,
    distanceToTarget,
    eta,
    cashLimitNotice,
    acceptedOrders,
    focusedOrderId,
    profileImage,
    inbox,
    isSimMode,
    setIsSimMode,
  } = home;
  const unread = inbox.unreadCount;

  return (
    <LinearGradient
      colors={['#15498B', '#000000']}
      // 160deg
      start={{ x: 0.33, y: 0 }}
      end={{ x: 0.67, y: 1 }}
      style={[styles.header, shadow('2xl'), { paddingTop: insets.top }]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Press onPress={() => router.navigate('/food/delivery/profile')} accessibilityLabel="Profile" style={[styles.avatar, shadow('xl')]}>
            <Image source={profileImage ? { uri: mediaUrl(profileImage) } : AVATAR} style={styles.avatarImg} resizeMode="cover" />
          </Press>
          <OnlineToggle isOnline={isOnline} onPress={home.handleToggleOnline} />
          {__DEV__ ? (
            <Press
              onPress={() => setIsSimMode(!isSimMode)}
              scale={1}
              accessibilityLabel="Simulation mode"
              style={[styles.sim, isSimMode ? { backgroundColor: tw.primarySoft, borderColor: '#FF8904' } : null]}
            >
              <Text style={[styles.simText, { color: isSimMode ? '#fff' : 'rgba(255,255,255,0.4)' }]}>SIM</Text>
            </Press>
          ) : null}
        </View>
        <View style={styles.right}>
          <Press onPress={() => home.setShowEmergencyPopup(true)} accessibilityLabel="Emergency help" style={[styles.iconBtn, styles.sos, shadow('lg')]}>
            <AlertTriangle size={16} color={tw.red500} />
          </Press>
          <Press onPress={() => router.push('/food/delivery/help/id-card')} accessibilityLabel="ID card" style={[styles.iconBtn, styles.idCard, shadow('lg')]}>
            <Contact size={16} color={tw.primary} />
          </Press>
          <Press onPress={() => home.setShowNotifications(true)} accessibilityLabel="Notifications" style={[styles.iconBtn, styles.bell, shadow('lg')]}>
            <Bell size={16} color="#fff" />
            {unread > 0 ? (
              <View style={[styles.badge, shadow('xl')]}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </Press>
        </View>
      </View>

      {currentTab === 'feed' ? (
        <View style={styles.status}>
          {activeOrder ? (
            <View style={styles.grid}>
              <View style={[styles.hud, shadow('card')]}>
                <View>
                  <Text style={styles.hudLabel}>Distance</Text>
                  <View style={styles.hudValueRow}>
                    <Text style={styles.hudValue}>{formatTripDistanceKm(distanceToTarget)}</Text>
                    <Text style={styles.hudUnit}>KM</Text>
                  </View>
                </View>
                <View style={[styles.hudIcon, shadow('lg')]}>
                  <Navigation2 size={16} color={tw.primary} style={{ transform: [{ rotate: '45deg' }] }} />
                </View>
              </View>
              <View style={[styles.hud, shadow('card')]}>
                <View>
                  <Text style={styles.hudLabel}>Arrival</Text>
                  <View style={styles.hudValueRow}>
                    <Text style={styles.hudValue}>{eta ? String(eta) : '--'}</Text>
                    <Text style={styles.hudUnit}>MIN</Text>
                  </View>
                </View>
                <View style={[styles.hudIcon, shadow('lg')]}>
                  <Clock size={16} color={tw.primary} />
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.idle, shadow('card')]}>
              <View style={styles.dotRing}>
                {/* bg-green-500 and bg-green-500/10 both paint #E8F2EC under the theme */}
                <Pulse active={isOnline}>
                  <View style={[styles.dot, { backgroundColor: isOnline ? tw.primarySoft : tw.gray500 }]} />
                </Pulse>
              </View>
              <View>
                <Text style={styles.idleTitle}>{isOnline ? 'System Online' : 'System Offline'}</Text>
                <Text style={styles.idleSub}>{isOnline ? 'Waiting for order requests' : 'Go online to receive jobs'}</Text>
              </View>
            </View>
          )}

          {!activeOrder && cashLimitNotice?.blocked ? (
            <View style={[styles.cash, shadow('card')]}>
              <Text style={styles.cashTitle}>Cash Limit Alert</Text>
              <Text style={styles.cashText}>{cashLimitNotice?.message || 'Please deposit your amount to get orders.'}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {currentTab === 'feed' && acceptedOrders.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcher}>
          {acceptedOrders.map((order) => {
            const orderId = resolveOrderKey(order);
            const label = order?.orderId || order?.displayOrderId || orderId;
            const isFocused = focusedOrderId === orderId;
            // components/orders/OrderSwitcher.jsx (display only, not tappable)
            return (
              <View key={orderId} pointerEvents="none" style={[styles.chip, isFocused ? [styles.chipOn, shadow('lg')] : styles.chipOff]}>
                <Text style={[styles.chipText, { color: isFocused ? '#fff' : 'rgba(255,255,255,0.7)' }]}>#{label}</Text>
              </View>
            );
          })}
        </ScrollView>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: 2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' },
  avatarImg: { width: '100%', height: '100%', borderRadius: 999 },
  toggle: { width: 92, height: 32, borderRadius: 16, padding: 4, flexDirection: 'row', alignItems: 'center' },
  toggleText: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 8 },
  // text-[8.5px] font-black uppercase -> Sora, .01em
  toggleLabel: { fontSize: 8.5, lineHeight: 12.75, color: '#fff', textTransform: 'uppercase', ...display(900, 8.5) },
  knob: { position: 'absolute', left: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  sim: { paddingHorizontal: 12, height: 32, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center' },
  simText: { fontSize: 9, ...display(900, 9) },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  sos: { backgroundColor: 'rgba(251,44,54,0.1)', borderColor: 'rgba(251,44,54,0.2)' },
  // bg-blue-500/10 -> #E8F2EC (opaque), border-blue-500/20 -> mixed border
  idCard: { backgroundColor: tw.primarySoft, borderColor: tw.primaryBorder },
  bell: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.1)' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: tw.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#121212',
  },
  badgeText: { fontSize: 9, lineHeight: 11, color: '#fff', ...display(900, 9) },
  status: { paddingHorizontal: 12, marginTop: 4 },
  grid: { flexDirection: 'row', gap: 12 },
  hud: {
    flex: 1,
    backgroundColor: tw.primary,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5DDC3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  hudLabel: { fontSize: 9, lineHeight: 13.5, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4, ...display(900, 9) },
  hudValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  hudValue: { fontSize: 24, lineHeight: 24, color: '#fff', ...display(900, 24) },
  hudUnit: { fontSize: 11, lineHeight: 16.5, color: 'rgba(255,255,255,0.8)', marginBottom: 2, ...poppins(700) },
  hudIcon: { width: 36, height: 36, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  idle: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: '#E5DDC3' },
  dotRing: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.primarySoft, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  // h3 -> Sora
  idleTitle: { color: '#fff', fontSize: 11, lineHeight: 11, textTransform: 'uppercase', marginBottom: 4, ...display(900, 11) },
  idleSub: { color: tw.gray400, fontSize: 10, lineHeight: 15, letterSpacing: -0.25, textTransform: 'uppercase', ...poppins(700) },
  cash: { marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E5DDC3', backgroundColor: 'rgba(254,154,0,0.1)', paddingHorizontal: 16, paddingVertical: 12 },
  cashTitle: { fontSize: 10, lineHeight: 15, textTransform: 'uppercase', color: tw.amber200, ...display(900, 10) },
  cashText: { marginTop: 4, fontSize: 11, lineHeight: 16.5, color: tw.amber100, ...poppins(600) },
  switcher: { paddingHorizontal: 12, marginTop: 8, gap: 8, paddingBottom: 4 },
  chip: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  // bg-orange-500 -> #E8F2EC via the substring rule
  chipOn: { backgroundColor: tw.primarySoft },
  chipOff: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  chipText: { fontSize: 11, lineHeight: 16.5, textTransform: 'uppercase', ...display(900, 11) },
});
