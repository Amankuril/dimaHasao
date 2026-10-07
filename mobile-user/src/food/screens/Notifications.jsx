import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { AlertCircle, ArrowLeft, Bell, CheckCircle2, Clock, Gift, Tag, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { EmptyState, IconButton, StatusBadge } from '../../components/ds';
import { NAV_CLEARANCE, isImmersiveRoute } from '../../components/dh/AppBottomNav';
import useNotificationInbox from '../hooks/useNotificationInbox';
import RequireUser from '../components/profile/RequireUser';
import { events } from '../../lib/events';
import { localStore } from '../../lib/storage';
import { navigateTo } from '../../lib/webRouter';
import { color, radii, space, tone as tones, type } from '../../theme';
import { LinkButton } from '../components/cart/parts';

const STORAGE_KEY = 'food_user_notifications';
const ICON_MAP = { CheckCircle2, Tag, Gift, AlertCircle, Bell };

/** Old demo seeds that were baked into the UI: never shown as real alerts. */
const isLegacyMockNotification = (item) => {
  if (!item || typeof item !== 'object') return true;
  const id = String(item.id || '');
  const title = String(item.title || '');
  const message = String(item.message || '');
  if (id === '1' || id === '2') return true;
  if (title === 'Order Confirmed' && message.includes('#12345')) return true;
  if (title === 'Special Offer' && message.includes('50% off')) return true;
  return false;
};

const readLocalNotifications = () => {
  try {
    const saved = localStore.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => !isLegacyMockNotification(item));
  } catch {
    return [];
  }
};

/** Notification type -> tone (icon tile colour); the title/badge carry the meaning. */
const TYPE_TONE = { order: 'success', offer: 'gold', broadcast: 'info', alert: 'warning' };

function NotificationsContent() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [notificationsList, setNotificationsList] = useState(() => readLocalNotifications());
  const {
    items: broadcastNotifications,
    unreadCount: broadcastUnreadCount,
    markAsRead: markBroadcastAsRead,
    dismiss: dismissBroadcastNotification,
    dismissAll: dismissAllBroadcastNotifications,
    loading: isLoadingInbox,
  } = useNotificationInbox('user', { limit: 100 });

  // One-time purge of legacy mock seeds stuck in storage.
  useEffect(() => {
    const cleaned = readLocalNotifications();
    try {
      localStore.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    } catch {
      /* ignore */
    }
    setNotificationsList(cleaned);
  }, []);

  // Persistence: save whenever the list changes.
  useEffect(() => {
    try {
      localStore.setItem(STORAGE_KEY, JSON.stringify(notificationsList));
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => {
      events.emit('notificationsUpdated', { count: notificationsList.filter((n) => !n.read).length });
    }, 0);
    return () => clearTimeout(t);
  }, [notificationsList]);

  // Keep in sync when the shell writes order alerts.
  useEffect(() => {
    const syncFromStorage = () => {
      const next = readLocalNotifications();
      setNotificationsList((prev) => {
        try {
          if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        } catch {
          /* fall through */
        }
        return next;
      });
    };
    events.on('notificationsUpdated', syncFromStorage);
    return () => events.off('notificationsUpdated', syncFromStorage);
  }, []);

  // OTP alerts only (order status is owned by the shell to avoid duplicates).
  useEffect(() => {
    const handleDeliveryOtp = (event) => {
      const { orderId, otp, message, orderType } = event?.detail || {};
      const isTakeaway = orderType === 'takeaway';
      const created = {
        id: `otp-${orderId || 'x'}-${otp || Date.now()}`,
        type: 'alert',
        title: isTakeaway ? 'Takeaway OTP Received' : 'Delivery OTP Received',
        message: message || `Your OTP for order #${orderId} is ${otp}`,
        time: 'Just now',
        timestamp: Date.now(),
        read: false,
        icon: 'AlertCircle',
        iconColor: 'text-[#06381e]',
      };
      setNotificationsList((prev) => {
        const cleaned = prev.filter((item) => !isLegacyMockNotification(item));
        const dedupeKey = `otp-${orderId || 'x'}`;
        const already = cleaned.some((n) => String(n.id || '').startsWith(dedupeKey) || (n.title === created.title && n.message === created.message));
        if (already) return prev;
        return [created, ...cleaned].slice(0, 100);
      });
    };
    events.on('deliveryOtpReceived', handleDeliveryOtp);
    return () => events.off('deliveryOtpReceived', handleDeliveryOtp);
  }, []);

  const [mountedAt] = useState(() => Date.now());
  const merged = useMemo(() => {
    const localItems = (notificationsList || []).filter((item) => !isLegacyMockNotification(item)).map((item) => ({ ...item, source: 'local' }));
    const broadcastItems = (broadcastNotifications || []).map((item) => ({
      ...item,
      source: 'broadcast',
      type: 'broadcast',
      time: item.createdAt
        ? new Date(item.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
        : 'Just now',
      timestamp: item.createdAt || mountedAt,
      icon: 'Bell',
      iconColor: 'text-blue-600',
    }));
    return [...broadcastItems, ...localItems].sort((a, b) => new Date(b.timestamp || b.createdAt || 0).getTime() - new Date(a.timestamp || a.createdAt || 0).getTime());
  }, [broadcastNotifications, notificationsList, mountedAt]);

  const unreadCount = notificationsList.filter((n) => !n.read && !isLegacyMockNotification(n)).length + broadcastUnreadCount;

  const handleMarkAsRead = (id, source = 'local') => {
    if (source === 'broadcast') {
      markBroadcastAsRead(id);
      return;
    }
    setNotificationsList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };
  const handleClearAll = () => {
    setNotificationsList([]);
    dismissAllBroadcastNotifications();
  };
  const handleDeleteOne = (id, source = 'local') => {
    if (source === 'broadcast') {
      dismissBroadcastNotification(id);
      return;
    }
    setNotificationsList((prev) => prev.filter((n) => n.id !== id));
  };

  const renderItem = ({ item: n }) => {
    const Icon = ICON_MAP[n.icon] || Bell;
    const t = tones[TYPE_TONE[n.type]] || tones.neutral;
    return (
      <Press
        scale={1}
        onPress={() => handleMarkAsRead(n.id, n.source)}
        accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.message || ''}`}
        style={[styles.card, !n.read ? styles.cardUnread : null]}
      >
        <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
          <Icon size={20} color={t.fg} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
            <Text style={[n.read ? type.body : type.bodyStrong, { color: color.text, flexShrink: 1 }]}>{n.title}</Text>
            {!n.read ? <StatusBadge tone="primary" label="New" /> : null}
          </View>
          {n.message ? <Text style={[type.small, { color: color.textSecondary }]}>{n.message}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: 2 }}>
            <Clock size={12} color={color.textMuted} />
            <Text style={[type.caption, { color: color.textMuted }]}>{n.time}</Text>
          </View>
        </View>
        <IconButton icon={X} label="Delete notification" size={36} iconSize={18} iconColor={color.textMuted} onPress={() => handleDeleteOne(n.id, n.source)} style={{ marginTop: -space.xs, marginRight: -space.xs }} />
      </Press>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={styles.header}>
        <IconButton icon={ArrowLeft} label="Back" onPress={() => navigateTo('/food/user')} />
        <View style={styles.titleRow}>
          <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">
            Notifications
          </Text>
          {unreadCount > 0 ? <StatusBadge tone="primary" label={`${unreadCount} new`} /> : null}
        </View>
        {merged.length > 0 ? <LinkButton title="Clear all" tone="danger" onPress={handleClearAll} accessibilityLabel="Clear All" style={{ paddingHorizontal: space.sm }} /> : null}
      </View>

      {isLoadingInbox && merged.length === 0 ? (
        <View style={{ gap: space.md, padding: space.lg }} accessibilityRole="progressbar" accessibilityLabel="Loading notifications">
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.sk}>
              <View style={[styles.skBlock, { width: 40, height: 40, borderRadius: 20 }]} />
              <View style={{ flex: 1, gap: space.sm, paddingVertical: space.xs }}>
                <View style={[styles.skBlock, { height: 16, width: '33%' }]} />
                <View style={[styles.skBlock, { height: 14, width: '83%' }]} />
                <View style={[styles.skBlock, { height: 12, width: '25%' }]} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={merged}
          keyExtractor={(n) => `${n.source}-${n.id}`}
          renderItem={renderItem}
          contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: (isImmersiveRoute(pathname) ? 0 : NAV_CLEARANCE) + insets.bottom + space.xxl }}
          ListEmptyComponent={<EmptyState icon={Bell} title="No notifications" message="You're all caught up!" />}
        />
      )}
    </View>
  );
}

export default function Notifications() {
  return (
    <RequireUser>
      <NotificationsContent />
    </RequireUser>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.xs, minHeight: 56, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  titleRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sk: { flexDirection: 'row', alignItems: 'flex-start', gap: space.lg, backgroundColor: color.surface, borderRadius: radii.lg, padding: space.lg, borderWidth: 1, borderColor: color.border },
  skBlock: { backgroundColor: color.surfaceMuted, borderRadius: 4 },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, padding: space.md },
  cardUnread: { backgroundColor: color.primarySoft, borderColor: color.primaryBorder },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
