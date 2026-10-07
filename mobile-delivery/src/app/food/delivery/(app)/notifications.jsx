import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Clock, Trash2 } from 'lucide-react-native';
import useNotificationInbox from '../../../../delivery/hooks/useNotificationInbox';
import { Press } from '../../../../components/ui';
import { Card, EmptyState, ScreenHeader } from '../../../../components/ds';
import { color, elevation, radii, space, type } from '../../../../theme';

/*
 * Web: pages/NotificationsV2.jsx. The local notification store
 * (utils/deliveryNotifications) always returns an empty list on the web, so
 * only the broadcast inbox appears here. Unread items carry a dot, a "New"
 * word and a tinted card, never colour alone.
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

  const renderItem = ({ item }) => {
    const unread = !item.read;
    return (
      <Press
        scale={1}
        onPress={() => markAsRead(item.id)}
        accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.title}`}
        style={[styles.item, unread && styles.itemUnread]}
      >
        <View style={[styles.itemIcon, unread && { backgroundColor: color.surface }]}>
          <Bell size={20} color={unread ? color.primary : color.textMuted} />
          {unread ? <View style={styles.dot} /> : null}
        </View>
        <View style={styles.itemMain}>
          <View style={styles.itemTitleRow}>
            <Text style={[styles.itemTitle, unread && styles.itemTitleUnread]} numberOfLines={2}>
              {item.title}
            </Text>
            {unread ? <Text style={styles.newTag}>New</Text> : null}
          </View>
          <Text style={styles.itemMsg}>{item.message || 'Delivery notification'}</Text>
          <View style={styles.timeRow}>
            <Clock size={14} color={color.textMuted} />
            <Text style={styles.time}>{toTimeLabel(item.createdAt)}</Text>
          </View>
        </View>
      </Press>
    );
  };

  return (
    <View style={styles.page}>
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : undefined}
        onBack={() => router.navigate('/food/delivery/profile')}
        right={
          merged.length > 0 ? (
            <Press onPress={dismissAll} scale={0.96} accessibilityLabel="Clear all" style={styles.clear}>
              <Trash2 size={18} color={color.danger} />
              <Text style={styles.clearText}>Clear all</Text>
            </Press>
          ) : null
        }
      />

      <FlatList
        data={loading ? [] : merged}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.body, { paddingBottom: space.xxxl + insets.bottom }]}
        ListEmptyComponent={
          loading ? (
            <View style={styles.state}>
              <ActivityIndicator color={color.primary} />
              <Text style={styles.stateText}>Loading notifications...</Text>
            </View>
          ) : (
            <Card>
              <EmptyState icon={Bell} title="No notifications" message="Updates from the team will show up here." style={styles.empty} />
            </Card>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  clear: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44, paddingHorizontal: space.md, borderRadius: radii.pill },
  clearText: { ...type.label, color: color.danger },
  body: { padding: space.lg, gap: space.sm, flexGrow: 1 },
  empty: { paddingVertical: space.xxl, paddingHorizontal: space.sm },
  state: { paddingVertical: space.xxxl + space.lg, alignItems: 'center', gap: space.md },
  stateText: { ...type.small, color: color.textMuted, textAlign: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    padding: space.lg,
    borderRadius: radii.lg,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    ...elevation.card,
  },
  itemUnread: { backgroundColor: color.primarySoft, borderColor: color.primaryBorder },
  itemIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: color.primary, borderWidth: 2, borderColor: color.surface },
  itemMain: { flex: 1, minWidth: 0, gap: space.xxs },
  itemTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  itemTitle: { ...type.bodyStrong, color: color.text, flex: 1, minWidth: 0 },
  itemTitleUnread: { fontFamily: 'NunitoSans_800ExtraBold' },
  newTag: { ...type.caption, color: color.primary, fontFamily: 'NunitoSans_800ExtraBold', marginTop: 2 },
  itemMsg: { ...type.small, color: color.textSecondary },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  time: { ...type.caption, color: color.textMuted },
});
