import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Package, RefreshCw, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { Button, EmptyState, IconButton } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import { PageHeader } from '../components/ui';
import { useNotifications } from '../hooks/pages/useNotifications';

/** Port of Food/pages/restaurant/Notifications.jsx (/food/restaurant/notifications). */
export default function Notifications() {
  const insets = useSafeAreaInsets();
  const { goBack, loading, broadcastLoading, notifications, markBroadcastAsRead, removeNotification, clearAll, handleRefresh } = useNotifications();
  const busy = loading || broadcastLoading;

  const renderItem = ({ item }) => {
    const broadcast = item.source === 'broadcast';
    const unread = broadcast && !item.read;
    const Icon = broadcast ? Bell : Package;
    return (
      <Press
        scale={1}
        disabled={!broadcast}
        onPress={() => markBroadcastAsRead(item.id)}
        accessibilityRole={broadcast ? 'button' : 'text'}
        accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.message}`}
        style={[styles.row, unread ? styles.rowUnread : null]}
      >
        <View style={[styles.icon, { backgroundColor: broadcast ? color.primarySoft : color.surfaceMuted }]}>
          <Icon size={18} color={broadcast ? color.primary : color.textSecondary} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.message, unread ? { fontFamily: 'Poppins_600SemiBold' } : null]}>{item.message}</Text>
            {unread ? <View style={styles.dot} accessibilityElementsHidden /> : null}
          </View>
          <Text style={styles.detail}>{broadcast ? item.detail || 'Admin notification' : `Order: ${item.orderId}`}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <IconButton icon={X} iconSize={18} iconColor={color.textMuted} label="Remove notification" onPress={() => removeNotification(item.id, item.source)} style={{ marginTop: -space.sm, marginRight: -space.sm }} />
      </Press>
    );
  };

  return (
    <View style={styles.page}>
      <PageHeader title="Notifications" onBack={goBack} backLabel="Back" right={<IconButton icon={RefreshCw} iconSize={18} label="Refresh" variant="inverse" onPress={handleRefresh} />} />
      <FlatList
        data={busy ? [] : notifications}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl + insets.bottom }}
        ListHeaderComponent={
          !loading && notifications.length > 0 ? (
            <View style={styles.listHead}>
              <Button title="Clear all" variant="ghost" size="sm" fullWidth={false} onPress={clearAll} style={{ height: 44, alignSelf: 'flex-end' }} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          busy ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={color.primary} />
              <Text style={styles.loadingText}>Loading notifications…</Text>
            </View>
          ) : (
            <EmptyState icon={Bell} title="No notifications" message="New orders and updates from the admin will show up here." />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  listHead: { alignItems: 'flex-end', marginTop: -space.sm, marginBottom: space.xs },
  loading: { alignItems: 'center', gap: space.md, paddingVertical: space.xxxl + space.lg },
  loadingText: { ...type.body, color: color.textMuted },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.md + 2, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.lg, ...elevation.card },
  rowUnread: { borderColor: color.primaryBorder, backgroundColor: color.primarySoft },
  icon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  message: { flexShrink: 1, ...type.body, color: color.text },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.primary },
  detail: { ...type.small, color: color.textSecondary },
  time: { ...type.caption, color: color.textMuted, marginTop: 2 },
});
