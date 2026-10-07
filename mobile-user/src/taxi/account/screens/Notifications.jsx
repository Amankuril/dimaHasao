import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, Megaphone, RefreshCw, Trash2 } from 'lucide-react-native';
import { Button, Card, EmptyState, IconButton, StatusBadge } from '../../../components/ds';
import { toast, confirm } from '../../../lib/notify';
import { events } from '../../../lib/events';
import { color, radii, space, type } from '../../../theme';
import { userAuthService } from '../../services/authService';
import {
  USER_NOTIFICATIONS_UPDATED_EVENT, clearRealtimeNotifications, getRealtimeNotifications,
  isRealtimeNotification, removeRealtimeNotification,
} from '../../store/realtimeNotificationStore';
import { ErrorState, PageTitle, Pulse, useNavPad } from '../ui';

// Web: Taxi/modules/user/pages/Notifications.jsx (/taxi/user/notifications, /taxi/user/profile/notifications)

const formatTime = (value) => {
  if (!value) return 'Recently';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Recently';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const SkeletonCard = () => (
  <Card style={st.skel}>
    <Pulse style={{ width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.surfaceMuted }} />
    <View style={{ flex: 1, gap: space.sm }}>
      <Pulse style={{ height: 12, borderRadius: 6, backgroundColor: color.surfaceMuted, width: '66%' }} />
      <Pulse style={{ height: 10, borderRadius: 5, backgroundColor: color.surfaceMuted }} />
      <Pulse style={{ height: 10, borderRadius: 5, backgroundColor: color.surfaceMuted, width: '80%' }} />
    </View>
  </Card>
);

export default function Notifications() {
  const bottomPad = useNavPad(space.xxl);
  const [server, setServer] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clearing, setClearing] = useState(false);

  // Realtime items live in the store; `server` changes (also re-set by the
  // store's update event) make this recompute.
  const notifications = useMemo(() => {
    const merged = [...server, ...getRealtimeNotifications()];
    return merged
      .filter((n) => n?.id)
      .sort((a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime());
  }, [server]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await userAuthService.getNotifications();
      setServer(res?.data?.results || []);
    } catch (e) {
      setError(e?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useEffect(() => events.on(USER_NOTIFICATIONS_UPDATED_EVENT, () => setServer((c) => [...c])), []);

  const clearAll = async () => {
    if (notifications.length === 0) return;
    if (!(await confirm('Clear all', 'Are you sure you want to clear all notifications?', { confirmText: 'Clear', destructive: true }))) return;
    setClearing(true);
    try {
      await userAuthService.clearAllNotifications();
      clearRealtimeNotifications();
      setServer([]);
      toast.success('All notifications cleared');
    } catch (e) {
      toast.error(e?.message || 'Failed to clear notifications');
    } finally {
      setClearing(false);
    }
  };

  const removeOne = async (id) => {
    if (isRealtimeNotification(id)) {
      removeRealtimeNotification(id);
      toast.success('Notification removed');
      return;
    }
    try {
      await userAuthService.deleteNotification(id);
      setServer((p) => p.filter((n) => n.id !== id));
      toast.success('Notification removed');
    } catch {
      toast.error('Failed to remove notification');
    }
  };

  const renderItem = ({ item: n }) => (
    <Card style={st.card}>
      <View style={st.iconBox}>
        <Megaphone size={18} color={color.info} />
      </View>
      <View style={st.grow}>
        <View style={st.cardHead}>
          <View style={st.grow}>
            <Text style={[type.bodyStrong, { color: color.text }]}>{n.title || 'Notification'}</Text>
            <Text style={[type.caption, { color: color.textMuted }]}>{formatTime(n.sentAt)}</Text>
          </View>
          <IconButton icon={Trash2} label={`Remove ${n.title || 'notification'}`} iconSize={18} iconColor={color.textMuted} onPress={() => removeOne(n.id)} style={st.remove} />
        </View>
        <Text style={[type.small, { color: color.textSecondary }]}>{n.body || 'No message'}</Text>
        {n.image ? (
          <View style={st.imgWrap}>
            <Image source={{ uri: n.image }} style={st.img} resizeMode="cover" />
          </View>
        ) : null}
        {n.serviceLocationName ? (
          <View style={{ marginTop: space.sm }}>
            <StatusBadge label={n.serviceLocationName} tone="neutral" />
          </View>
        ) : null}
      </View>
    </Card>
  );

  const header = (
    <View style={st.bar}>
      <Text style={[type.label, st.grow, { color: color.textMuted }]}>Admin & system alerts</Text>
      {notifications.length > 0 ? (
        <Button title="Clear all" icon={Trash2} variant="dangerSoft" size="sm" fullWidth={false} disabled={clearing || loading} loading={clearing} onPress={clearAll} style={st.barBtn} />
      ) : null}
      <Button title="Refresh" icon={RefreshCw} variant="secondary" size="sm" fullWidth={false} onPress={fetchNotifications} style={st.barBtn} />
    </View>
  );

  const empty = loading ? (
    <View style={{ gap: space.md }}>
      {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
    </View>
  ) : error ? (
    <ErrorState title={error} actionLabel="Retry" onAction={fetchNotifications} />
  ) : (
    <EmptyState icon={Bell} title="You're all caught up" message="No new notifications right now" />
  );

  return (
    <View style={st.flex}>
      <PageTitle
        title="Notifications"
        subtitle="Inbox"
        onBack={() => router.replace('/taxi/user/profile')}
        right={<StatusBadge label={`${notifications.length}`} tone={notifications.length ? 'primary' : 'neutral'} style={st.count} />}
      />
      <FlatList
        data={!loading && !error ? notifications : []}
        keyExtractor={(n) => String(n.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={[st.content, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  grow: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xs, gap: space.md },
  count: { alignSelf: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  barBtn: { minHeight: 40 },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginBottom: space.xs },
  remove: { marginTop: -space.sm, marginRight: -space.sm },
  iconBox: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.infoSoft, alignItems: 'center', justifyContent: 'center' },
  imgWrap: { marginTop: space.md, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted, aspectRatio: 16 / 9 },
  img: { width: '100%', height: '100%' },
  skel: { flexDirection: 'row', gap: space.md },
});
