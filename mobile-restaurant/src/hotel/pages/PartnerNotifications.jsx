import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, CheckCircle, AlertCircle, Info, Tag } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { hotelService } from '../services/apiService';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { EmptyState, SectionHeader } from '../../components/ds';
import { color, radii, space, tone, type } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerNotifications.jsx
 * (/hotel/partner/notifications). It used to show four invented notices
 * ("Payout Processed ₹15,000 ... HDFC ending 8821", a review from "Arjun
 * Mehta", a "Monsoon Sale") with buttons that did nothing. It now reads the
 * partner's inbox (GET /hotels/notifications); "Mark all read" calls the
 * server.
 */

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

// Server notification type -> the card's look.
const kindOf = (t = '') => {
  const v = String(t).toLowerCase();
  if (/cancel|reject|fail|no_show|alert|kyc/.test(v)) return 'alert';
  if (/payout|payment|paid|settle|withdraw|approved/.test(v)) return 'success';
  if (/offer|promo/.test(v)) return 'promo';
  return 'info';
};

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
      </View>
      {!notif.read && <View style={styles.dot} />}
    </View>
  );
};


const PartnerNotifications = () => {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await hotelService.getNotifications(1, 50);
      const list = Array.isArray(res?.notifications) ? res.notifications : [];
      setNotifications(
        list.map((n) => ({
          id: n._id,
          type: kindOf(n.type || n.data?.type),
          title: n.title || 'Notification',
          desc: n.body || n.message || '',
          time: ago(n.createdAt),
          read: Boolean(n.isRead),
        })),
      );
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await hotelService.markAllNotificationsRead(); } catch { load(); }
  };

  return (
    <View style={styles.page}>
      <PartnerHeader title="Notifications" subtitle="Alerts & updates" />

      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[color.primary]} />}
      >
        <SectionHeader title="Recent" action={notifications.some((n) => !n.read) ? 'Mark all read' : undefined} onAction={markAllRead} />

        <View style={{ gap: space.md }}>
          {loading ? (
            <ActivityIndicator color={color.primary} style={{ padding: space.xl }} />
          ) : notifications.length > 0 ? (
            notifications.map((n, i) => (
              <Reveal key={n.id} index={i}>
                <NotificationItem notif={n} />
              </Reveal>
            ))
          ) : (
            <EmptyState icon={Bell} title="No notifications yet" />
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
