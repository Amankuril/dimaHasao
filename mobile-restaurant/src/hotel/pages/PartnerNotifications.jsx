import { useEffect } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, CheckCircle, AlertCircle, Info, Tag } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { EmptyState, SectionHeader } from '../../components/ds';
import { color, radii, space, tone, type } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerNotifications.jsx
 * (/hotel/partner/notifications). As on the web this is the static "Recent"
 * list; its "Mark as Read" / "Mark all read" buttons have no handler there
 * either. The GSAP stagger-in is an Animated fade/slide.
 */

const ICONS = { success: CheckCircle, alert: AlertCircle, info: Info, promo: Tag };
const TONES = { success: 'success', alert: 'danger', info: 'info', promo: 'gold' };

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
  const t = tone[TONES[notif.type]] || tone.neutral;
  return (
    <View style={[styles.item, notif.read ? styles.itemRead : styles.itemUnread]} accessibilityLabel={`${notif.read ? '' : 'Unread. '}${notif.title}. ${notif.desc}. ${notif.time}`}>
      <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>{Icon ? <Icon size={20} color={t.fg} /> : null}</View>
      <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm }}>
          <Text style={[styles.title, { color: color.text }]}>{notif.title}</Text>
          <Text style={styles.time}>{notif.time}</Text>
        </View>
        <Text style={styles.desc}>{notif.desc}</Text>
        {!notif.read && (
          <Press scale={1} style={styles.markRead}>
            <Text style={styles.markReadText}>Mark as read</Text>
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
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <PartnerHeader title="Notifications" subtitle="Alerts & updates" />

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl + insets.bottom }} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Recent" action="Mark all read" onAction={() => {}} />

        <View style={{ gap: space.md }}>
          {notifications.length > 0 ? (
            notifications.map((n, i) => (
              <Reveal key={n.id} index={i}>
                <NotificationItem notif={n} />
              </Reveal>
            ))
          ) : (
            <EmptyState icon={Bell} title="No new notifications" />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  item: { padding: space.lg, borderRadius: radii.lg, flexDirection: 'row', gap: space.md, borderWidth: 1 },
  itemRead: { backgroundColor: color.surface, borderColor: color.border },
  itemUnread: { backgroundColor: color.primarySoft, borderColor: color.primaryBorder },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, ...type.bodyStrong },
  time: { ...type.caption, color: color.textMuted },
  desc: { ...type.small, color: color.textSecondary },
  markRead: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  markReadText: { ...type.label, color: color.primary },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.danger, marginTop: space.xs },
});

export default PartnerNotifications;
