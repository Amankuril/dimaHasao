import { useEffect } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Bell, Clock, Contact, Navigation2, Wallet } from 'lucide-react-native';
import { useDeliveryHome } from '../../../delivery/DeliveryHomeContext';
import { formatTripDistanceKm } from '../../../delivery/hooks/useProximityCheck';
import { resolveOrderKey } from '../../../delivery/store/useDeliveryStore';
import { mediaUrl } from '../../../api/client';
import { Press } from '../../ui';
import { IconButton } from '../../ds';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { color, elevation, radii, space, type } from '../../../theme';

/*
 * Top bar of the Feed, Pocket and Profile tabs: avatar, the online switch,
 * SOS / ID card / notifications, and on the Feed the rider status or the
 * live trip HUD. On the Feed it floats over the map (absolute); on the other
 * tabs it sits in normal flow so their content starts right below it.
 */

const AVATAR = require('../../../../assets/images/profile_avatar.webp');

const TOGGLE_W = 124;
const KNOB = 32;
const KNOB_TRAVEL = TOGGLE_W - KNOB - 8;

/** The duty switch: the one control a rider must read at a glance. Word + colour + knob side. */
function OnlineToggle({ isOnline, onPress }) {
  const x = useAnimatedValue(isOnline ? KNOB_TRAVEL : 0);
  useEffect(() => {
    Animated.spring(x, { toValue: isOnline ? KNOB_TRAVEL : 0, stiffness: 500, damping: 30, useNativeDriver: true }).start();
  }, [isOnline, x]);
  return (
    <Press
      onPress={onPress}
      scale={0.97}
      accessibilityRole="switch"
      accessibilityLabel={isOnline ? 'You are online. Tap to go offline' : 'You are offline. Tap to go online'}
      accessibilityState={{ checked: isOnline }}
      style={[styles.toggle, isOnline ? styles.toggleOn : styles.toggleOff]}
    >
      <Text style={[styles.toggleLabel, isOnline ? styles.toggleLabelOn : styles.toggleLabelOff]} numberOfLines={1}>
        {isOnline ? 'Online' : 'Offline'}
      </Text>
      <Animated.View style={[styles.knob, elevation.card, { transform: [{ translateX: x }] }]}>
        <View style={[styles.knobDot, { backgroundColor: isOnline ? color.online : color.textDisabled }]} />
      </Animated.View>
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
        Animated.timing(o, { toValue: 0.35, duration: 1000, easing: ease, useNativeDriver: true }),
        Animated.timing(o, { toValue: 1, duration: 1000, easing: ease, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [active, o]);
  return <Animated.View style={{ opacity: o }}>{children}</Animated.View>;
}

function HudTile({ label, value, unit, Icon }) {
  return (
    <View style={styles.hud} accessible accessibilityLabel={`${label}: ${value} ${unit}`}>
      <View style={styles.hudIcon}>
        <Icon size={18} color={color.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.hudLabel}>{label}</Text>
        <View style={styles.hudValueRow}>
          <Text style={styles.hudValue} numberOfLines={1}>
            {value}
          </Text>
          <Text style={styles.hudUnit}>{unit}</Text>
        </View>
      </View>
    </View>
  );
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
  const onFeed = currentTab === 'feed';

  return (
    <View style={[styles.header, onFeed ? [styles.overlay, elevation.float] : styles.inFlow, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Press onPress={() => router.navigate('/food/delivery/profile')} accessibilityLabel="Profile" style={styles.avatar}>
            <Image source={profileImage ? { uri: mediaUrl(profileImage) } : AVATAR} style={styles.avatarImg} resizeMode="cover" />
          </Press>
          <OnlineToggle isOnline={isOnline} onPress={home.handleToggleOnline} />
        </View>
        <View style={styles.right}>
          <IconButton icon={AlertTriangle} label="Emergency help" variant="danger" size={40} iconSize={20} onPress={() => home.setShowEmergencyPopup(true)} />
          <IconButton icon={Contact} label="ID card" variant="soft" size={40} iconSize={20} onPress={() => router.push('/food/delivery/help/id-card')} />
          <IconButton icon={Bell} label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'} variant="soft" size={40} iconSize={20} onPress={() => home.setShowNotifications(true)}>
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </IconButton>
        </View>
      </View>

      {onFeed ? (
        <View style={styles.status}>
          {__DEV__ ? (
            // Dev builds only: route simulation switch.
            <Press onPress={() => setIsSimMode(!isSimMode)} scale={1} accessibilityLabel="Simulation mode" style={[styles.sim, isSimMode && styles.simOn]}>
              <Text style={[styles.simText, { color: isSimMode ? color.onPrimary : color.textMuted }]}>{isSimMode ? 'SIM on (dev)' : 'SIM off (dev)'}</Text>
            </Press>
          ) : null}
          {activeOrder ? (
            <View style={styles.grid}>
              <HudTile label="Distance" value={formatTripDistanceKm(distanceToTarget)} unit="km" Icon={Navigation2} />
              <HudTile label="Arrival" value={eta ? String(eta) : '--'} unit="min" Icon={Clock} />
            </View>
          ) : (
            <View style={[styles.idle, { backgroundColor: isOnline ? color.onlineSoft : color.offlineSoft }]}>
              <View style={styles.dotRing}>
                <Pulse active={isOnline}>
                  <View style={[styles.dot, { backgroundColor: isOnline ? color.online : color.offline }]} />
                </Pulse>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.idleTitle}>{isOnline ? 'You are online' : 'You are offline'}</Text>
                <Text style={styles.idleSub}>{isOnline ? 'Waiting for order requests' : 'Go online to receive orders'}</Text>
              </View>
            </View>
          )}

          {!activeOrder && cashLimitNotice?.blocked ? (
            <View style={styles.cash} accessibilityRole="alert">
              <Wallet size={18} color={color.warning} style={{ marginTop: 1 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cashTitle}>Cash limit reached</Text>
                <Text style={styles.cashText}>{cashLimitNotice?.message || 'Please deposit your amount to get orders.'}</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {onFeed && acceptedOrders.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcher}>
          {acceptedOrders.map((order) => {
            const orderId = resolveOrderKey(order);
            const label = order?.orderId || order?.displayOrderId || orderId;
            const isFocused = focusedOrderId === orderId;
            // Display only, not tappable (as before).
            return (
              <View key={orderId} pointerEvents="none" style={[styles.chip, isFocused ? styles.chipOn : styles.chipOff]}>
                <Text style={[styles.chipText, { color: isFocused ? color.onPrimary : color.textSecondary }]}>#{label}</Text>
              </View>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: color.surface, paddingBottom: space.md },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200, borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl },
  inFlow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.borderStrong },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.sm },
  left: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: color.surfaceMuted, borderWidth: 1, borderColor: color.border },
  avatarImg: { width: '100%', height: '100%' },

  toggle: { width: TOGGLE_W, height: 40, borderRadius: radii.pill, padding: 4, justifyContent: 'center' },
  toggleOn: { backgroundColor: color.online },
  toggleOff: { backgroundColor: color.surfaceMuted, borderWidth: 1, borderColor: color.borderStrong },
  toggleLabel: { ...type.buttonSm, position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  // Text sits on the side the knob is not on.
  toggleLabelOn: { color: color.onPrimary, paddingRight: KNOB },
  toggleLabelOff: { color: color.textSecondary, paddingLeft: KNOB },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  knobDot: { width: 10, height: 10, borderRadius: 5 },

  sim: { alignSelf: 'flex-start', paddingHorizontal: space.sm, height: 28, borderRadius: radii.sm, borderWidth: 1, borderColor: color.border, justifyContent: 'center' },
  simOn: { backgroundColor: color.primary, borderColor: color.primary },
  simText: { ...type.caption },

  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: color.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: color.surface,
  },
  badgeText: { color: color.textInverse, fontSize: 12, lineHeight: 14, fontFamily: 'NunitoSans_800ExtraBold' },

  status: { paddingHorizontal: space.lg, marginTop: space.md, gap: space.sm },
  grid: { flexDirection: 'row', gap: space.sm },
  hud: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.primarySoft, borderRadius: radii.lg, paddingHorizontal: space.md, paddingVertical: space.md },
  hudIcon: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  hudLabel: { ...type.caption, color: color.primary },
  hudValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  hudValue: { ...type.metric, color: color.text },
  hudUnit: { ...type.label, color: color.textSecondary },

  idle: { borderRadius: radii.lg, paddingHorizontal: space.lg, paddingVertical: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md },
  dotRing: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  idleTitle: { ...type.subheading, color: color.text },
  idleSub: { ...type.small, color: color.textSecondary },

  cash: { flexDirection: 'row', gap: space.sm, borderRadius: radii.md, backgroundColor: color.warningSoft, paddingHorizontal: space.md, paddingVertical: space.md },
  cashTitle: { ...type.label, color: color.warning },
  cashText: { ...type.small, color: color.text, marginTop: 2 },

  switcher: { paddingHorizontal: space.lg, marginTop: space.sm, gap: space.sm },
  chip: { borderRadius: radii.pill, paddingHorizontal: space.lg, height: 32, justifyContent: 'center' },
  chipOn: { backgroundColor: color.primary },
  chipOff: { backgroundColor: color.surfaceMuted },
  chipText: { ...type.label },
});
