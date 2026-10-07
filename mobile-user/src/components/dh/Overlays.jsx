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
      setShown(toastMessage);
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
        <Fa name="fa-solid fa-circle-check" size={16} color={color.goldOnDark} />
        <Text style={styles.toastText}>{shown}</Text>
      </View>
    </Animated.View>
  );
}

const NOTIFICATIONS = [
  {
    id: 1,
    title: 'Falcon Festival 2026 Announced!',
    desc: 'Annual wildlife and tribal music extravaganza dates released. Umrangso Lake venue confirmed.',
    time: '2 hrs ago',
    icon: 'fa-solid fa-feather-pointed',
    tone: 'gold',
  },
  {
    id: 2,
    title: 'Scenic Bird Phenomenon Season',
    desc: 'Jatinga watchtower observatory is now open for evening visitors. Best time 5:30 PM.',
    time: '1 day ago',
    icon: 'fa-solid fa-dove',
    tone: 'primary',
  },
  {
    id: 3,
    title: 'Welcome to Dima Hasao Tourism',
    desc: 'Thank you for exploring our hills! Enjoy verified taxi rides & registered eco guides.',
    time: '3 days ago',
    icon: 'fa-solid fa-leaf',
    tone: 'info',
  },
];

/** Port of components/common/NotificationsDrawer.jsx (slides in from the right). */
export function NotificationsDrawer() {
  const { isNotificationsOpen, setIsNotificationsOpen } = useBooking();
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
              {NOTIFICATIONS.map((n) => (
                <View key={n.id} style={styles.note}>
                  <View style={[styles.noteIcon, { backgroundColor: tone[n.tone].bg }]}>
                    <Fa name={n.icon} size={16} color={tone[n.tone].fg} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.noteTitle}>{n.title}</Text>
                    <Text style={styles.noteDesc}>{n.desc}</Text>
                    <Text style={styles.noteTime}>{n.time}</Text>
                  </View>
                </View>
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
