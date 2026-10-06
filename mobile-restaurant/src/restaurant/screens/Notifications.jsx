import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, RefreshCw, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { poppins, tw } from '../../theme';
import { PageHeader } from '../components/ui';
import { useNotifications } from '../hooks/pages/useNotifications';
import { RT } from '../theme';

/** Port of Food/pages/restaurant/Notifications.jsx (/food/restaurant/notifications). */
export default function Notifications() {
  const { goBack, loading, broadcastLoading, notifications, markBroadcastAsRead, removeNotification, clearAll, handleRefresh } = useNotifications();
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageHeader
        title="Notifications"
        large={false}
        onBack={goBack}
        backLabel="Back"
        right={
          <Press onPress={handleRefresh} accessibilityLabel="Refresh" hitSlop={8} style={{ padding: 8 }}>
            <RefreshCw size={16} color={tw.gray700} />
          </Press>
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 112 }}>
        {!loading && notifications.length > 0 ? (
          <Press onPress={clearAll} hitSlop={8} style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
            <Text style={styles.clear}>Clear all</Text>
          </Press>
        ) : null}

        {loading || broadcastLoading ? (
          <Text style={styles.state}>Loading notifications...</Text>
        ) : notifications.length === 0 ? (
          <Text style={styles.state}>No notifications</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {notifications.map((item) => {
              const broadcast = item.source === 'broadcast';
              const unread = broadcast && !item.read;
              return (
                <Press
                  key={item.id}
                  scale={1}
                  disabled={!broadcast}
                  onPress={() => markBroadcastAsRead(item.id)}
                  accessibilityRole={broadcast ? 'button' : 'text'}
                  style={[styles.row, unread ? { borderColor: tw.blue200, backgroundColor: 'rgba(239,246,255,0.4)' } : null]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {broadcast ? <Bell size={16} color={RT.primary} /> : null}
                      <Text style={styles.message}>{item.message}</Text>
                    </View>
                    <Text style={styles.detail}>{broadcast ? item.detail || 'Admin notification' : `Order: ${item.orderId}`}</Text>
                    <Text style={styles.time}>{item.time}</Text>
                  </View>
                  <Press onPress={() => removeNotification(item.id, item.source)} accessibilityLabel="Remove notification" hitSlop={8} style={{ padding: 6 }}>
                    <X size={16} color={tw.gray600} />
                  </Press>
                </Press>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  clear: { fontSize: 12, lineHeight: 16, color: RT.primary, ...poppins(500) },
  state: { textAlign: 'center', fontSize: 14, lineHeight: 20, color: tw.gray600, paddingVertical: 48, ...poppins(400) },
  row: { borderWidth: 1, borderColor: tw.gray200, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  message: { flexShrink: 1, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  detail: { fontSize: 12, lineHeight: 16, color: tw.gray600, marginTop: 2, ...poppins(400) },
  time: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 4, ...poppins(400) },
});
