import { useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Calendar, Check, Tag, Info, Trash2, CheckCircle, Circle } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { confirm, toast } from '../../lib/notify';
import { EmptyState, IconButton, StatusBadge } from '../../components/ds';
import HeritageHeader from '../../components/HeritageHeader';
import { color, radii, space, tone, type } from '../../theme';
import { hotelService } from '../services/apiService';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerNotificationsPage.jsx
 * (the live partner notification list; the web does not mount it on a route).
 *
 * The header is the shared heritage bar (HeritageHeader) with the Select /
 * Cancel toggle on the right.
 */
const PartnerNotificationsPage = () => {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await hotelService.getNotifications(1, 100);
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // First mark all as read
        await hotelService.markAllNotificationsRead();
        // Then fetch the latest list
        await fetchNotifications();
      } catch (err) {
        console.warn(err); // Non-blocking
        fetchNotifications();
      }
    };
    init();
  }, []);

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setSelectedIds([]); // Clear selection when exiting
    }
    setIsSelectionMode(!isSelectionMode);
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((itemId) => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map((n) => n._id));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;

    if (!(await confirm(`Delete ${selectedIds.length} notification(s)?`, undefined, { confirmText: 'OK' }))) return;

    try {
      await hotelService.deleteNotifications(selectedIds);
      toast.success('Notifications deleted');
      // Remove from local state
      setNotifications(notifications.filter((n) => !selectedIds.includes(n._id)));
      setSelectedIds([]);
      if (notifications.length - selectedIds.length === 0) {
        setIsSelectionMode(false);
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'booking': return <Calendar size={20} color={tone.success.fg} />;
      case 'offer': return <Tag size={20} color={tone.gold.fg} />;
      default: return <Info size={20} color={tone.info.fg} />;
    }
  };

  const getBg = (type) => {
    switch (type) {
      case 'booking': return tone.success.bg;
      case 'offer': return tone.gold.bg;
      default: return tone.info.bg;
    }
  };

  const allSelected = selectedIds.length === notifications.length;

  return (
    <View style={styles.page}>
      {/* Header */}
      <HeritageHeader
        title="Notifications"
        onBack={() => navigate(-1)}
        right={
          notifications.length > 0 ? (
            <Press scale={1} onPress={toggleSelectionMode} accessibilityLabel={isSelectionMode ? 'Cancel selection' : 'Select notifications'} style={styles.selectBtn}>
              <Text style={[type.label, { color: color.goldOnDark }]}>{isSelectionMode ? 'Cancel' : 'Select'}</Text>
            </Press>
          ) : null
        }
      />

      <View style={styles.subBar}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.subheading, { color: color.text }]}>Recent updates</Text>
          <Text style={[type.small, { color: color.textMuted }]}>
            {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
            {isSelectionMode ? ` · ${selectedIds.length} selected` : ''}
          </Text>
        </View>

        {/* Delete Action Bar */}
        {isSelectionMode && (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <IconButton icon={allSelected ? CheckCircle : Circle} label={allSelected ? 'Clear selection' : 'Select all'} variant="primary" onPress={selectAll} />
            {selectedIds.length > 0 && <IconButton icon={Trash2} label="Delete selected" variant="danger" onPress={deleteSelected} />}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl + insets.bottom, gap: space.md }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ alignItems: 'center', paddingTop: space.xxxl * 2 }}>
            <ActivityIndicator size="large" color={color.primary} />
          </View>
        ) : (
          <>
            {notifications.map((notif) => {
              const selected = selectedIds.includes(notif._id);
              return (
                <Pressable
                  key={notif._id}
                  onPress={() => isSelectionMode && toggleSelect(notif._id)}
                  accessibilityRole={isSelectionMode ? 'checkbox' : undefined}
                  accessibilityState={isSelectionMode ? { checked: selected } : undefined}
                  style={[styles.card, isSelectionMode && selected ? { borderColor: color.primary, backgroundColor: color.primarySoft } : null]}
                >
                  {/* Selection Checkbox */}
                  {isSelectionMode && (
                    <View style={[styles.check, selected ? { backgroundColor: color.primary, borderColor: color.primary } : null]}>
                      {selected && <Check size={14} color={color.onPrimary} strokeWidth={3} />}
                    </View>
                  )}

                  <View style={[styles.icon, { backgroundColor: getBg(notif.type) }]}>{getIcon(notif.type || 'general')}</View>
                  <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm }}>
                      <Text style={[styles.title, { color: notif.isRead ? color.textSecondary : color.text }]} numberOfLines={2}>
                        {notif.title}
                      </Text>
                      {!notif.isRead && !isSelectionMode && <StatusBadge label="New" tone="primary" />}
                    </View>
                    <Text style={styles.body} numberOfLines={2}>
                      {notif.body}
                    </Text>
                    <Text style={styles.date}>
                      {new Date(notif.createdAt).toLocaleDateString()} • {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            {notifications.length === 0 && <EmptyState icon={Bell} title="No new notifications" />}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  selectBtn: { minHeight: 44, minWidth: 44, paddingHorizontal: space.sm, alignItems: 'center', justifyContent: 'center' },
  subBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: color.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  card: { backgroundColor: color.surface, borderRadius: radii.lg, padding: space.lg, borderWidth: 1, borderColor: color.border, flexDirection: 'row', alignItems: 'flex-start', gap: space.md, overflow: 'hidden' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center', marginTop: space.md },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, ...type.bodyStrong },
  body: { ...type.small, color: color.textSecondary },
  date: { ...type.caption, color: color.textMuted, marginTop: space.xs },
});

export default PartnerNotificationsPage;
