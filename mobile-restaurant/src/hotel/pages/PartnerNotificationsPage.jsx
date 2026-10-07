import { useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Calendar, Tag, Info, Trash2, CheckCircle, Circle } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { confirm, toast } from '../../lib/notify';
import { poppins, shadow, tw } from '../../theme';
import { hotelService } from '../services/apiService';
import { HT } from '../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerNotificationsPage.jsx
 * (the live partner notification list; the web does not mount it on a route).
 *
 * The web header is `bg-surface text-white`, but no `surface` colour exists in
 * its Tailwind theme, so it renders without a ground; here the header is
 * painted in the partner primary (HT.primary), which is what `surface` stands
 * for in the rest of that file (title / border / checkbox colour).
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
      case 'booking': return <Calendar size={20} color={tw.green600} />;
      case 'offer': return <Tag size={20} color={tw.purple600} />;
      default: return <Info size={20} color={tw.blue600} />;
    }
  };

  const getBg = (type) => {
    switch (type) {
      case 'booking': return tw.green100;
      case 'offer': return tw.purple100;
      default: return tw.blue100;
    }
  };

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 24 + insets.top }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Press scale={1} onPress={() => navigate(-1)} accessibilityLabel="Back" style={styles.roundBtn}>
              <ArrowLeft size={20} color="#fff" />
            </Press>
            <Text style={styles.headerTitle}>Partner Notifications</Text>
          </View>

          {notifications.length > 0 && (
            <Press
              scale={1}
              onPress={toggleSelectionMode}
              style={[styles.selectBtn, { backgroundColor: isSelectionMode ? '#fff' : 'rgba(255,255,255,0.1)' }]}
            >
              <Text style={[styles.selectText, { color: isSelectionMode ? HT.primary : '#fff' }]}>{isSelectionMode ? 'Cancel' : 'Select'}</Text>
            </Press>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.recentTitle}>Recent Updates</Text>
            <Text style={styles.count}>
              {notifications.length} {notifications.length === 1 ? 'Notification' : 'Notifications'}
            </Text>
          </View>

          {/* Delete Action Bar */}
          {isSelectionMode && (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Press scale={1} onPress={selectAll} accessibilityLabel="Select All" style={[styles.roundBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                {selectedIds.length === notifications.length ? <CheckCircle size={18} color="#fff" /> : <Circle size={18} color="#fff" />}
              </Press>
              {selectedIds.length > 0 && (
                <Press scale={1} onPress={deleteSelected} accessibilityLabel="Delete Selected" style={[styles.roundBtn, { backgroundColor: tw.red500, ...shadow('lg') }]}>
                  <Trash2 size={18} color="#fff" />
                </Press>
              )}
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 96, gap: 16 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <ActivityIndicator size="large" color={HT.primary} />
          </View>
        ) : (
          <>
            {notifications.map((notif) => {
              const selected = selectedIds.includes(notif._id);
              return (
                <Pressable
                  key={notif._id}
                  onPress={() => isSelectionMode && toggleSelect(notif._id)}
                  style={[styles.card, isSelectionMode && selected ? { borderColor: HT.primary, backgroundColor: tw.gray50 } : { borderColor: tw.gray100 }]}
                >
                  {/* Selection Checkbox */}
                  {isSelectionMode && (
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                      <View style={[styles.check, selected ? { backgroundColor: HT.primary, borderColor: HT.primary } : { borderColor: tw.gray300 }]}>
                        {selected && <CheckCircle size={12} color="#fff" />}
                      </View>
                    </View>
                  )}

                  <View style={[styles.icon, { backgroundColor: getBg(notif.type) }]}>{getIcon(notif.type || 'general')}</View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={[styles.title, { color: notif.isRead ? tw.gray600 : HT.primary }]} numberOfLines={1}>
                        {notif.title}
                      </Text>
                      {!notif.isRead && !isSelectionMode && <View style={styles.dot} />}
                    </View>
                    <Text style={styles.body} numberOfLines={2}>{notif.body}</Text>
                    <Text style={styles.date}>
                      {new Date(notif.createdAt).toLocaleDateString()} • {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            {notifications.length === 0 && (
              <View style={{ alignItems: 'center', paddingTop: 80, opacity: 0.5 }}>
                <Bell size={48} color={tw.gray300} style={{ marginBottom: 8 }} />
                <Text style={{ color: tw.gray500, ...poppins(700) }}>No new notifications</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: HT.bg },
  header: { backgroundColor: HT.primary, paddingHorizontal: 24, paddingBottom: 32, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, ...shadow('lg') },
  roundBtn: { padding: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { fontSize: 20, lineHeight: 28, color: '#fff', ...poppins(700) },
  selectBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  selectText: { fontSize: 12, lineHeight: 16, ...poppins(700) },
  recentTitle: { fontSize: 24, lineHeight: 32, color: '#fff', ...poppins(900) },
  count: { fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.7)', ...poppins(400) },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, flexDirection: 'row', gap: 16, overflow: 'hidden', ...shadow('sm') },
  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 14, lineHeight: 20, paddingRight: 8, ...poppins(700) },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tw.red500, marginTop: 6 },
  body: { fontSize: 12, lineHeight: 19.5, color: tw.gray500, marginTop: 4, ...poppins(400) },
  date: { fontSize: 10, lineHeight: 15, color: tw.gray400, marginTop: 8, ...poppins(500) },
});

export default PartnerNotificationsPage;
