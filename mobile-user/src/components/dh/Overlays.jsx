import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from '../Fa';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { NAV_CLEARANCE, navStateFor } from './AppBottomNav';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { Button, IconButton, fa } from '../ds';
import useNotificationInbox from '../../food/hooks/useNotificationInbox';
import { color, elevation, radii, space, tone, type } from '../../theme';

/** MobileFrame's toast: the dark pill above the bottom nav (`showToast(msg)`). */
export function DhToast() {
  const { toastMessage } = useBooking();
  const { signedIn } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const anim = useAnimatedValue(0);
  const [shown, setShown] = useState(null);

  useEffect(() => {
    if (toastMessage) {
      setShown(typeof toastMessage === 'string' ? { text: toastMessage, tone: 'success' } : toastMessage);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, stiffness: 300, damping: 24 }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setShown(null));
    }
  }, [toastMessage, anim]);

  if (!shown) return null;
  // Sits just above the floating nav where there is one.
  const navVisible = navStateFor(pathname, signedIn).visible;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="alert"
      style={[
        styles.toastWrap,
        { bottom: (navVisible ? NAV_CLEARANCE : space.xxl) + insets.bottom, opacity: anim },
        { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] },
      ]}
    >
      <View style={styles.toast}>
        {shown.tone === 'error'
          ? <Fa name="fa-solid fa-circle-exclamation" size={16} color="#FCA5A5" />
          : <Fa name="fa-solid fa-circle-check" size={16} color={color.goldOnDark} />}
        <Text style={styles.toastText}>{shown.text}</Text>
      </View>
    </Animated.View>
  );
}

// Relative time for an inbox item ("5 min ago", "2 days ago").
const ago = (iso) => {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
};

/** Port of components/common/NotificationsDrawer.jsx (slides in from the right). */
export function NotificationsDrawer() {
  const { isNotificationsOpen, setIsNotificationsOpen } = useBooking();
  // The drawer listed three hardcoded notices ("Falcon Festival 2026 announced",
  // "2 hrs ago"). It now reads the account's real inbox.
  const { items, loading, markAsRead } = useNotificationInbox('user', { limit: 30, enabled: isNotificationsOpen });
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(320, width * 0.85);
  const x = useAnimatedValue(panelWidth);
  const fade = useAnimatedValue(0);
  const [mounted, setMounted] = useState(false);
  const close = () => setIsNotificationsOpen(false);

  useEffect(() => {
    if (isNotificationsOpen) {
      setMounted(true);
      x.setValue(panelWidth);
      Animated.parallel([
        Animated.spring(x, { toValue: 0, stiffness: 300, damping: 25, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(x, { toValue: panelWidth, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [isNotificationsOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.drawerRoot}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: color.overlay }]} onPress={close} accessibilityLabel="Close notifications" />
        </Animated.View>
        <Animated.View style={[styles.drawer, { width: panelWidth, transform: [{ translateX: x }] }]}>
          <View style={{ flex: 1 }}>
            <View style={[styles.drawerHead, { paddingTop: space.md + insets.top }]}>
              <View style={styles.rowGap}>
                <Fa name="fa-solid fa-bell" size={16} color={color.gold} />
                <Text style={styles.drawerTitle} accessibilityRole="header">
                  NOTIFICATIONS
                </Text>
              </View>
              <IconButton icon={fa('fa-solid fa-xmark')} label="Close" variant="inverse" onPress={close} />
            </View>
            <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
              {items.length === 0 ? (
                <Text style={[styles.noteDesc, { textAlign: 'center', paddingVertical: space.xl }]}>
                  {loading ? 'Loading…' : 'No notifications yet. Booking and ride updates will appear here.'}
                </Text>
              ) : items.map((n) => (
                <Pressable key={n.id} onPress={() => !n.read && markAsRead(n.id)} style={[styles.note, !n.read && { borderColor: color.gold }]}>
                  <View style={[styles.noteIcon, { backgroundColor: tone.primary.bg }]}>
                    <Fa name="fa-solid fa-bell" size={16} color={tone.primary.fg} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.noteTitle}>{n.title}</Text>
                    {n.message ? <Text style={styles.noteDesc}>{n.message}</Text> : null}
                    <Text style={styles.noteTime}>{ago(n.createdAt)}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={[styles.drawerFoot, { paddingBottom: space.lg + insets.bottom }]}>
            <Button title="Close" variant="secondary" onPress={close} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center', zIndex: 999 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, maxWidth: 400, minHeight: 44, paddingHorizontal: space.lg, paddingVertical: space.sm + 2, borderRadius: radii.pill,
    backgroundColor: color.primaryDeep, borderWidth: 1, borderColor: 'rgba(202,168,62,0.5)', ...elevation.float,
  },
  toastText: { flexShrink: 1, ...type.label, color: color.textInverse },
  drawerRoot: { flex: 1, alignItems: 'flex-end' },
  drawer: { flex: 1, backgroundColor: color.bg, ...elevation.sheet },
  drawerHead: { paddingLeft: space.lg, paddingRight: space.sm, paddingBottom: space.md, backgroundColor: color.primaryDeep, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  drawerTitle: { ...type.titleSerif, color: color.goldOnDark },
  note: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  noteIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  noteTitle: { ...type.bodyStrong, color: color.text },
  noteDesc: { ...type.small, color: color.textSecondary, marginTop: 2 },
  noteTime: { ...type.caption, color: color.textMuted, marginTop: space.xs },
  drawerFoot: { padding: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, backgroundColor: color.surface },
});
