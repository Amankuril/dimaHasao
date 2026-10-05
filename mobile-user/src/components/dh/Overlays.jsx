import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from '../Fa';
import { Press } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { navStateFor } from './AppBottomNav';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { poppins, shadow, tw } from '../../theme';

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
  // `bottom-16`: sits just above the nav where there is one.
  const navVisible = navStateFor(pathname, signedIn).visible;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="alert"
      style={[
        styles.toastWrap,
        { bottom: (navVisible ? 64 : 24) + insets.bottom, opacity: anim },
        { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] },
      ]}
    >
      <View style={styles.toast}>
        <Fa name="fa-solid fa-circle-check" size={14} color={tw.emerald400} />
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
    color: tw.amber500,
    bg: tw.amber50,
  },
  {
    id: 2,
    title: 'Scenic Bird Phenomenon Season',
    desc: 'Jatinga watchtower observatory is now open for evening visitors. Best time 5:30 PM.',
    time: '1 day ago',
    icon: 'fa-solid fa-dove',
    color: tw.emerald600,
    bg: tw.emerald50,
  },
  {
    id: 3,
    title: 'Welcome to Dima Hasao Tourism',
    desc: 'Thank you for exploring our hills! Enjoy verified taxi rides & registered eco guides.',
    time: '3 days ago',
    icon: 'fa-solid fa-leaf',
    color: tw.blue500,
    bg: tw.blue50,
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
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={close} accessibilityLabel="Close notifications" />
        </Animated.View>
        <Animated.View style={[styles.drawer, { width: panelWidth, transform: [{ translateX: x }] }]}>
          <View style={{ flex: 1 }}>
            <View style={[styles.drawerHead, { paddingTop: 16 + insets.top }]}>
              <View style={styles.rowGap}>
                <Fa name="fa-solid fa-bell" size={14} color={tw.amber400} />
                <Text style={styles.drawerTitle}>Notifications</Text>
              </View>
              <Press onPress={close} style={styles.closeBtn} accessibilityLabel="Close">
                <Fa name="fa-solid fa-xmark" size={14} color="#fff" />
              </Press>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              {NOTIFICATIONS.map((n) => (
                <View key={n.id} style={styles.note}>
                  <View style={[styles.noteIcon, { backgroundColor: n.bg }]}>
                    <Fa name={n.icon} size={14} color={n.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noteTitle}>{n.title}</Text>
                    <Text style={styles.noteDesc}>{n.desc}</Text>
                    <Text style={styles.noteTime}>{n.time}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
          <View style={[styles.drawerFoot, { paddingBottom: 16 + insets.bottom }]}>
            <Press onPress={close} style={styles.drawerClose}>
              <Text style={styles.drawerCloseText}>Close</Text>
            </Press>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 999 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 384, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(15,23,43,0.95)', borderWidth: 1, borderColor: 'rgba(255,185,0,0.3)', ...shadow('xl'),
  },
  toastText: { flexShrink: 1, fontSize: 12, lineHeight: 16, color: tw.amber300, ...poppins(500) },
  drawerRoot: { flex: 1, alignItems: 'flex-end' },
  drawer: { flex: 1, backgroundColor: '#fff', ...shadow('2xl') },
  drawerHead: { padding: 16, backgroundColor: '#0A3A22', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  drawerTitle: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: tw.gray100, backgroundColor: 'rgba(249,250,251,0.5)' },
  noteIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  noteTitle: { fontSize: 12, lineHeight: 15, color: tw.gray900, ...poppins(700) },
  noteDesc: { fontSize: 11, lineHeight: 15, color: tw.gray600, marginTop: 4, ...poppins(400) },
  noteTime: { fontSize: 9, lineHeight: 13.5, color: tw.gray400, marginTop: 6, ...poppins(500) },
  drawerFoot: { padding: 16, borderTopWidth: 1, borderTopColor: tw.gray100 },
  drawerClose: { paddingVertical: 8, borderRadius: 12, backgroundColor: '#0A3A22', alignItems: 'center' },
  drawerCloseText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(600) },
});
