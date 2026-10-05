import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Bell, Megaphone, RefreshCw, Trash2 } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { toast, confirm } from '../../../lib/notify';
import { events } from '../../../lib/events';
import { tw } from '../../../theme';
import { userAuthService } from '../../services/authService';
import {
  USER_NOTIFICATIONS_UPDATED_EVENT, clearRealtimeNotifications, getRealtimeNotifications,
  isRealtimeNotification, removeRealtimeNotification,
} from '../../store/realtimeNotificationStore';
import { BackBtn, Eyebrow, Pulse, fo, headerShadow, sh, useHeaderTop } from '../ui';

// Web: Taxi/modules/user/pages/Notifications.jsx (/taxi/user/notifications, /taxi/user/profile/notifications)

const formatTime = (value) => {
  if (!value) return 'Recently';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Recently';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const SkeletonCard = () => (
  <View style={[st.card, { backgroundColor: 'rgba(255,255,255,0.7)' }]}>
    <Pulse style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tw.slate200 }} />
    <View style={{ flex: 1, gap: 8 }}>
      <Pulse style={{ height: 12, borderRadius: 6, backgroundColor: tw.slate200, width: '66%' }} />
      <Pulse style={{ height: 10, borderRadius: 5, backgroundColor: tw.slate100 }} />
      <Pulse style={{ height: 10, borderRadius: 5, backgroundColor: tw.slate100, width: '80%' }} />
    </View>
  </View>
);

export default function Notifications() {
  const top = useHeaderTop();
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

  return (
    <LinearGradient colors={['#F8FAFC', '#F3F4F6', '#EEF2F7']} locations={[0, 0.38, 1]} style={st.flex}>
      <View style={[st.header, headerShadow, { paddingTop: top }]}>
        <BackBtn onPress={() => router.replace('/taxi/user/profile')} />
        <View style={st.flex}>
          <Eyebrow>Inbox</Eyebrow>
          <Text style={st.title}>Notifications</Text>
        </View>
        <View style={st.count}><Text style={st.countText}>{notifications.length}</Text></View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 112, gap: 10 }} showsVerticalScrollIndicator={false}>
        <View style={st.bar}>
          <Eyebrow>Admin & System Alerts</Eyebrow>
          <View style={st.barRight}>
            {notifications.length > 0 ? (
              <Press onPress={clearAll} disabled={clearing || loading} style={[st.act, (clearing || loading) && { opacity: 0.5 }]}>
                <Trash2 size={12} color={tw.rose500} strokeWidth={2.5} />
                <Text style={[st.actText, { color: tw.rose500 }]}>Clear All</Text>
              </Press>
            ) : null}
            <Press onPress={fetchNotifications} style={st.act}>
              <RefreshCw size={12} color={tw.slate500} strokeWidth={2.5} />
              <Text style={[st.actText, { color: tw.slate500 }]}>Refresh</Text>
            </Press>
          </View>
        </View>

        {loading ? [0, 1, 2, 3].map((i) => <SkeletonCard key={i} />) : null}

        {error && !loading ? (
          <View style={st.center}>
            <View style={st.emptyIcon}><AlertCircle size={28} color={tw.red400} strokeWidth={2} /></View>
            <Text style={[st.emptyTitle, { fontSize: 14 }]}>{error}</Text>
            <Press onPress={fetchNotifications} style={st.retry}>
              <RefreshCw size={13} color="#fff" strokeWidth={2.5} />
              <Text style={st.retryText}>Retry</Text>
            </Press>
          </View>
        ) : null}

        {!loading && !error && notifications.length === 0 ? (
          <View style={st.center}>
            <View style={[st.emptyIcon, { width: 80, height: 80 }]}><Bell size={36} color={tw.slate300} strokeWidth={1.5} /></View>
            <View style={{ alignItems: 'center' }}>
              <Text style={st.emptyTitle}>You&apos;re all caught up</Text>
              <Text style={st.emptySub}>No new notifications right now</Text>
            </View>
          </View>
        ) : null}

        {!loading && !error ? notifications.map((n) => (
          <View key={n.id} style={[st.card, sh, { backgroundColor: '#fff', borderColor: 'rgba(255,255,255,0.8)', borderWidth: 1 }]}>
            <View style={st.iconBox}><Megaphone size={16} color={tw.blue500} strokeWidth={2} /></View>
            <View style={st.flex}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <Text style={[st.nTitle, st.flex]}>{n.title || 'Notification'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={st.nTime}>{formatTime(n.sentAt)}</Text>
                  <Press onPress={() => removeOne(n.id)} accessibilityLabel="Remove" style={{ padding: 6 }}>
                    <Trash2 size={13} color={tw.slate300} strokeWidth={2.5} />
                  </Press>
                </View>
              </View>
              <Text style={st.nBody}>{n.body || 'No message'}</Text>
              {n.image ? (
                <View style={st.imgWrap}>
                  <Image source={{ uri: n.image }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
                </View>
              ) : null}
              {n.serviceLocationName ? <Text style={st.loc}>{n.serviceLocationName}</Text> : null}
            </View>
          </View>
        )) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1 },
  header: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.8)' },
  title: { fontSize: 19, color: tw.slate900, lineHeight: 21, ...fo(900) },
  count: { backgroundColor: tw.slate900, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  countText: { color: '#fff', fontSize: 10, ...fo(900) },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  barRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actText: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', ...fo(900) },
  card: { borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: tw.blue50, alignItems: 'center', justifyContent: 'center' },
  nTitle: { fontSize: 13, lineHeight: 16, color: tw.slate900, ...fo(900) },
  nTime: { fontSize: 9, color: tw.slate400, ...fo(700) },
  nBody: { fontSize: 11, lineHeight: 18, color: tw.slate500, marginTop: 4, ...fo(700) },
  imgWrap: { marginTop: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: tw.slate100, backgroundColor: tw.slate50 },
  loc: { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: tw.slate300, marginTop: 8, ...fo(900) },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 16 },
  emptyIcon: { width: 64, height: 64, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, color: tw.slate700, textAlign: 'center', ...fo(900) },
  emptySub: { fontSize: 12, color: tw.slate400, marginTop: 4, ...fo(700) },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: tw.slate900, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  retryText: { color: '#fff', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', ...fo(900) },
});
