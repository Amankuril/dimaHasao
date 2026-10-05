import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ArrowLeft, Bell, CheckCircle2, Clock, Gift, Tag, Trash2, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import useNotificationInbox from '../hooks/useNotificationInbox';
import RequireUser from '../components/profile/RequireUser';
import { events } from '../../lib/events';
import { localStore } from '../../lib/storage';
import { navigateTo } from '../../lib/webRouter';
import { F } from '../components/shell';
import { poppins, shadow, tw, twClass } from '../../theme';

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

const TYPE_BG = { order: tw.green100, offer: tw.red100, broadcast: tw.blue100 };

function NotificationsContent() {
  const insets = useSafeAreaInsets();
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

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 16, paddingBottom: 16 + insets.bottom }}>
        <View style={styles.header}>
          <Press scale={0.92} onPress={() => navigateTo('/food/user')} accessibilityLabel="Back" style={styles.back}>
            <ArrowLeft size={16} color={tw.gray900} />
          </Press>
          <View style={styles.titleRow}>
            <Bell size={20} color={F.green} fill={F.green} />
            <Text style={styles.title}>Notifications</Text>
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            ) : null}
          </View>
          {merged.length > 0 ? (
            <Press scale={0.96} onPress={handleClearAll} accessibilityLabel="Clear All" style={styles.clear}>
              <Trash2 size={16} color={tw.gray500} />
              <Text style={styles.clearText}>Clear All</Text>
            </Press>
          ) : null}
        </View>

        {isLoadingInbox && merged.length === 0 ? (
          <View style={{ gap: 12, paddingTop: 4 }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.sk}>
                <View style={[styles.skBlock, { width: 40, height: 40, borderRadius: 20 }]} />
                <View style={{ flex: 1, gap: 8, paddingVertical: 4 }}>
                  <View style={[styles.skBlock, { height: 16, width: '33%' }]} />
                  <View style={[styles.skBlock, { height: 14, width: '83%' }]} />
                  <View style={[styles.skBlock, { height: 12, width: '25%', backgroundColor: tw.gray100 }]} />
                </View>
              </View>
            ))}
          </View>
        ) : merged.length > 0 ? (
          <View style={{ gap: 12 }}>
            {merged.map((n) => {
              const Icon = ICON_MAP[n.icon] || Bell;
              return (
                <Press
                  key={`${n.source}-${n.id}`}
                  scale={1}
                  onPress={() => handleMarkAsRead(n.id, n.source)}
                  accessibilityLabel={n.title}
                  style={[styles.card, !n.read ? styles.cardUnread : null, shadow('xs')]}
                >
                  {!n.read ? <View style={styles.dot} /> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12 }}>
                    <View style={[styles.iconWrap, { backgroundColor: TYPE_BG[n.type] || tw.orange100 }]}>
                      <Icon size={20} color={twClass(n.iconColor, tw.gray700)} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                        <Text style={[styles.nTitle, { color: !n.read ? tw.gray900 : tw.gray700, flex: 1 }]}>{n.title}</Text>
                        <Press scale={0.9} onPress={() => handleDeleteOne(n.id, n.source)} accessibilityLabel="Delete notification" style={styles.del} hitSlop={8}>
                          <X size={16} color={tw.gray400} />
                        </Press>
                      </View>
                      <Text style={styles.nMsg}>{n.message}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color={tw.gray500} />
                        <Text style={styles.nTime}>{n.time}</Text>
                      </View>
                    </View>
                  </View>
                </Press>
              );
            })}
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Bell size={64} color={tw.gray300} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>You&apos;re all caught up!</Text>
          </View>
        )}
      </ScrollView>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  back: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, lineHeight: 28, color: tw.gray800, ...poppins(700) },
  badge: { backgroundColor: tw.green500, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(500) },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, height: 32, borderRadius: 6 },
  clearText: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(500) },
  sk: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: tw.gray200 },
  skBlock: { backgroundColor: tw.gray200, borderRadius: 4 },
  card: { position: 'relative', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, paddingVertical: 4 },
  cardUnread: { backgroundColor: 'rgba(254,242,242,0.5)', borderColor: tw.red200 },
  dot: { position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: F.green, zIndex: 2 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nTitle: { fontSize: 14, lineHeight: 20, ...poppins(600) },
  del: { padding: 4, borderRadius: 999 },
  nMsg: { fontSize: 12, lineHeight: 16, color: tw.gray600, marginBottom: 8, ...poppins(400) },
  nTime: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  emptyTitle: { fontSize: 18, lineHeight: 28, color: tw.gray700, marginBottom: 8, ...poppins(600) },
  emptyText: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
});
