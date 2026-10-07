import { useEffect } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, CheckCircle, AlertCircle, Info, Tag } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { poppins, tw } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { HT } from '../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerNotifications.jsx
 * (/hotel/partner/notifications). As on the web this is the static "Recent"
 * list; its "Mark as Read" / "Mark all read" buttons have no handler there
 * either. The GSAP stagger-in is an Animated fade/slide.
 */

const ICONS = {
  success: (p) => <CheckCircle size={18} color={tw.green600} {...p} />,
  alert: (p) => <AlertCircle size={18} color={tw.red600} {...p} />,
  info: (p) => <Info size={18} color={tw.blue600} {...p} />,
  promo: (p) => <Tag size={18} color={tw.orange600} {...p} />,
};

const BG = {
  success: tw.green50,
  alert: tw.red50,
  info: tw.blue50,
  promo: tw.orange50,
};

// gsap.fromTo({ y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.4 })
const Reveal = ({ index, children }) => {
  const v = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 400, delay: index * 100, useNativeDriver: true }).start();
  }, [v, index]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
      {children}
    </Animated.View>
  );
};

const NotificationItem = ({ notif }) => {
  const Icon = ICONS[notif.type];
  return (
    <View style={[styles.item, notif.read ? styles.itemRead : styles.itemUnread]}>
      <View style={[styles.iconWrap, { backgroundColor: BG[notif.type] }]}>{Icon ? <Icon /> : null}</View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <Text style={[styles.title, { color: notif.read ? tw.gray700 : tw.slate900 }]}>{notif.title}</Text>
          <Text style={styles.time}>{notif.time}</Text>
        </View>
        <Text style={styles.desc}>{notif.desc}</Text>
        {!notif.read && (
          <Press scale={1} style={styles.markRead}>
            <Text style={styles.markReadText}>Mark as Read</Text>
          </Press>
        )}
      </View>
      {!notif.read && <View style={styles.dot} />}
    </View>
  );
};

const notifications = [
  { id: 1, type: 'alert', title: 'Action Required: Update KYC', desc: 'Your business pan card verification is pending. Please re-upload clearer image.', time: '2h ago', read: false },
  { id: 2, type: 'success', title: 'Payout Processed', desc: '₹15,000 has been transferred to your HDFC Bank account ending in 8821.', time: 'Yesterday', read: true },
  { id: 3, type: 'info', title: 'New Review Received', desc: 'Arjun Mehta rated your property 5 stars! "Excellent stay, loved the food."', time: '1d ago', read: false },
  { id: 4, type: 'promo', title: 'Boost Your Visibility', desc: 'Get 20% more bookings this weekend by opting into our "Monsoon Sale".', time: '3d ago', read: true },
];

const PartnerNotifications = () => {
  return (
    <View style={styles.page}>
      <PartnerHeader title="Notifications" subtitle="Alerts & updates" />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={styles.recent}>Recent</Text>
          <Press scale={1}>
            <Text style={styles.markAll}>Mark all read</Text>
          </Press>
        </View>

        <View>
          {notifications.length > 0 ? (
            notifications.map((n, i) => (
              <Reveal key={n.id} index={i}>
                <NotificationItem notif={n} />
              </Reveal>
            ))
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 80, opacity: 0.5 }}>
              <Bell size={40} color={tw.gray300} style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 14, color: tw.gray400, ...poppins(700) }}>No new notifications</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: HT.bg },
  recent: { fontSize: 18, lineHeight: 28, color: tw.slate900, ...poppins(900) },
  markAll: { fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(700) },
  item: { padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', gap: 16 },
  itemRead: { backgroundColor: '#fff' },
  itemUnread: { backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray200 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 14, lineHeight: 20, ...poppins(700) },
  time: { fontSize: 10, lineHeight: 15, color: tw.gray400, marginLeft: 8, ...poppins(500) },
  desc: { fontSize: 12, lineHeight: 19.5, color: tw.gray500, marginBottom: 8, ...poppins(400) },
  markRead: { alignSelf: 'flex-start', borderBottomWidth: 1, borderBottomColor: HT.primary },
  markReadText: { fontSize: 10, lineHeight: 15, color: HT.primary, ...poppins(700) },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tw.red500, marginTop: 8 },
});

export default PartnerNotifications;
