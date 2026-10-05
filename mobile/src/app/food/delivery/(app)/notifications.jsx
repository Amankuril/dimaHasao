import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Clock, Trash2 } from 'lucide-react-native';
import useNotificationInbox from '../../../../delivery/hooks/useNotificationInbox';
import { Press } from '../../../../components/ui';
import { display, poppins, tw } from '../../../../theme';

/*
 * Web: pages/NotificationsV2.jsx. No font-poppins root: Poppins; h1 Sora.
 * The local notification store (utils/deliveryNotifications) always returns
 * an empty list on the web, so only the broadcast inbox appears here.
 * text-[#EB590E] -> primary; bg-[#EB590E] stays orange.
 */

const toTimeLabel = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
};

export default function NotificationsV2() {
  const insets = useSafeAreaInsets();
  const { items, unreadCount, loading, markAsRead, dismissAll } = useNotificationInbox('delivery', { limit: 100 });
  const merged = [...(items || [])].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
        <Press onPress={() => router.navigate('/food/delivery/profile')} scale={1} accessibilityLabel="Back" style={styles.back}>
          <ArrowLeft size={20} color={tw.gray900} />
        </Press>
        <View style={styles.titleRow}>
          <Bell size={20} color={tw.primary} />
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          ) : null}
        </View>
        {merged.length > 0 ? (
          <Press onPress={dismissAll} scale={1} accessibilityLabel="Clear all" style={styles.clear}>
            <Trash2 size={16} color={tw.red600} />
            <Text style={styles.clearText}>Clear all</Text>
          </Press>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {loading ? (
          <Text style={styles.state}>Loading notifications...</Text>
        ) : merged.length === 0 ? (
          <Text style={styles.state}>No notifications</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {merged.map((item) => (
              <Press
                key={item.id}
                scale={1}
                onPress={() => markAsRead(item.id)}
                accessibilityLabel={item.title}
                style={[styles.item, item.read ? { borderColor: tw.gray200 } : { borderColor: tw.primaryBorder, backgroundColor: tw.primarySoft }]}
              >
                <View style={{ minWidth: 0, flexShrink: 1 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemMsg}>{item.message || 'Delivery notification'}</Text>
                  <View style={styles.timeRow}>
                    <Clock size={14} color={tw.gray500} />
                    <Text style={styles.time}>{toTimeLabel(item.createdAt)}</Text>
                  </View>
                </View>
              </Press>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  back: { padding: 8, borderRadius: 999 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...display(600, 16) },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: '#EB590E', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, lineHeight: 12, ...poppins(600) },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  clearText: { fontSize: 12, lineHeight: 16, color: tw.red600, ...poppins(600) },
  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 112 },
  state: { textAlign: 'center', fontSize: 14, lineHeight: 20, color: tw.gray600, paddingVertical: 48, ...poppins(400) },
  item: { borderWidth: 1, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  itemTitle: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  itemMsg: { fontSize: 14, lineHeight: 20, color: tw.gray700, marginTop: 2, ...poppins(400) },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  time: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
});
