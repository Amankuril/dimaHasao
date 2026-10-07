import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Bell, MapPin, Search, Utensils, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { restaurantAPI } from '../../api/restaurant';
import { events } from '../../lib/events';
import { localStore } from '../../lib/storage';
import { useLocation, useNavigate } from '../../lib/webRouter';
import { color, elevation, radii, space, type } from '../../theme';
import { Button } from '../../components/ds';
import Fa from '../../components/Fa';
import useNotificationInbox from '../hooks/useNotificationInbox';
import { useRestaurantNotifications } from '../hooks/useRestaurantNotifications';
import { formatRestaurantDisplayAddress } from '../utils/restaurantLocation';

const extractRestaurantPayload = (response) =>
  response?.data?.data?.restaurant || response?.data?.restaurant || response?.data?.data?.user || response?.data?.user || response?.data?.data || null;

/** Port of Food/components/restaurant/RestaurantNavbar.jsx: the rounded gradient header, the order search and the table-request popup. */
export default function RestaurantNavbar({
  restaurantName: propRestaurantName,
  location: propLocation,
  showSearch = true,
  hideSearch = false,
  showOfflineOnlineTag = true,
  showNotifications = true,
}) {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [searchValue, setSearchValue] = useState('');
  const [status, setStatus] = useState('Offline');
  const [restaurantData, setRestaurantData] = useState(null);
  const [loading, setLoading] = useState(true);
  const searchTimeoutRef = useRef(null);
  const { unreadCount } = useNotificationInbox('restaurant', { limit: 20, pollMs: 5 * 60 * 1000 });
  const { newReservation, clearNewReservation } = useRestaurantNotifications();

  // Debounced order search; the orders screen listens for the results.
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchValue.trim() === '') {
      events.emit('restaurantSearchUpdated', { query: '', results: [], isLoading: false });
      return undefined;
    }
    events.emit('restaurantSearchUpdated', { query: searchValue, results: [], isLoading: true });
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await restaurantAPI.getOrders({ page: 1, limit: 100, search: searchValue });
        if (response.data.success) events.emit('restaurantSearchUpdated', { query: searchValue, results: response.data.data.orders || [], isLoading: false });
      } catch (error) {
        events.emit('restaurantSearchUpdated', { query: searchValue, results: [], isLoading: false, error });
      }
    }, 500);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchValue]);

  useEffect(() => {
    let alive = true;
    const fetchRestaurantData = async () => {
      try {
        setLoading(true);
        const data = extractRestaurantPayload(await restaurantAPI.refreshCurrentRestaurant());
        if (alive && data) setRestaurantData(data);
      } catch {
        // the header falls back to its placeholders
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchRestaurantData();
    events.on('ownerDataUpdated', fetchRestaurantData);
    events.on('addressUpdated', fetchRestaurantData);
    return () => {
      alive = false;
      events.off('ownerDataUpdated', fetchRestaurantData);
      events.off('addressUpdated', fetchRestaurantData);
    };
  }, []);

  const restaurantName = propRestaurantName || restaurantData?.name || 'Restaurant';
  const restaurantAddress =
    propLocation && propLocation.trim() !== '' ? propLocation.trim() : restaurantData ? formatRestaurantDisplayAddress(restaurantData.location, restaurantData) : '';

  useEffect(() => {
    const fromData = () => setStatus(restaurantData?.isAcceptingOrders ? 'Online' : 'Offline');
    try {
      const saved = localStore.getItem('restaurant_online_status');
      if (saved !== null) setStatus(JSON.parse(saved) ? 'Online' : 'Offline');
      else fromData();
    } catch {
      fromData();
    }
    const handleStatusChange = (event) => setStatus(event.detail?.isOnline ? 'Online' : 'Offline');
    events.on('restaurantStatusChanged', handleStatusChange);
    return () => events.off('restaurantStatusChanged', handleStatusChange);
  }, [restaurantData]);

  const from = { state: { from: routerLocation.pathname } };
  const online = status === 'Online';

  return (
    <>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.row}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
            <View style={styles.nameRow}>
              <Fa name="fa-solid fa-leaf" size={11} color={color.gold} />
              <Text style={styles.name} numberOfLines={1} accessibilityRole="header">{loading ? 'Loading…' : restaurantName || 'Restaurant'}</Text>
            </View>
            {!loading && restaurantAddress && restaurantAddress.trim() !== '' ? (
              <View style={styles.addressRow}>
                <MapPin size={13} color={color.textOnDarkMuted} />
                <Text style={styles.address} numberOfLines={1}>{restaurantAddress}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            {showOfflineOnlineTag ? (
              <Press onPress={() => navigate('/food/restaurant/status', from)} accessibilityLabel={`Restaurant is ${status}. Change status`} style={[styles.tag, online ? styles.tagOn : styles.tagOff]}>
                <View style={[styles.tagDot, { backgroundColor: online ? color.onPrimary : color.textDisabled }]} />
                <Text style={[styles.tagText, { color: online ? color.onPrimary : color.textOnDarkMuted }]}>{status}</Text>
              </Press>
            ) : null}
            {showNotifications ? (
              <Press onPress={() => navigate('/food/restaurant/notifications', from)} accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'} style={styles.bell}>
                <Bell size={22} color={color.textInverse} />
                {unreadCount > 0 ? <View style={styles.bellDot} /> : null}
              </Press>
            ) : null}
          </View>
        </View>
      </View>

      {showSearch && !hideSearch ? (
        <View style={styles.searchWrap}>
          <View style={styles.search}>
            <Search size={18} color={color.textMuted} />
            <TextInput
              value={searchValue}
              onChangeText={setSearchValue}
              placeholder="Search by order ID or dish name"
              placeholderTextColor={color.textMuted}
              returnKeyType="search"
              accessibilityLabel="Search orders"
              style={styles.searchInput}
            />
            {searchValue ? (
              <Press onPress={() => setSearchValue('')} accessibilityLabel="Clear search" style={styles.clear}>
                <X size={18} color={color.textMuted} />
              </Press>
            ) : null}
          </View>
        </View>
      ) : null}

      {newReservation ? (
        <View style={[styles.popupWrap, { top: 80 + insets.top }]} pointerEvents="box-none">
          <View style={styles.popup}>
            <View style={styles.popupTop}>
              <View style={styles.popupIcon}>
                <Utensils size={24} color={color.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.popupTitle}>New table request</Text>
                <Text style={styles.popupBody} numberOfLines={2}>
                  {newReservation.user?.name || 'A Guest'} has requested a table for {newReservation.guests} people.
                </Text>
              </View>
              <Press onPress={clearNewReservation} accessibilityLabel="Dismiss" style={styles.popupClose}>
                <X size={18} color={color.textMuted} />
              </Press>
            </View>
            <View style={styles.popupActions}>
              <Button
                title="View request"
                onPress={() => {
                  clearNewReservation();
                  // The web points this at /dining-reservations, a path its router does not have; the reservations screen is the target.
                  navigate('/food/restaurant/reservations');
                }}
                style={{ flex: 1 }}
              />
              <Button title="Later" variant="outline" fullWidth={false} onPress={clearNewReservation} />
            </View>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: color.primaryDeep, borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl, paddingBottom: space.sm, zIndex: 10, ...elevation.card },
  row: { paddingLeft: space.lg, paddingRight: space.sm, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { flexShrink: 1, ...type.subheading, fontSize: 17, color: color.goldOnDark },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: 2 },
  address: { flex: 1, ...type.caption, color: color.textOnDarkMuted },
  tag: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, paddingHorizontal: space.md, height: 36, borderRadius: radii.pill, borderWidth: 1 },
  tagOn: { backgroundColor: color.success, borderColor: 'rgba(255,255,255,0.25)' },
  tagOff: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.25)' },
  tagDot: { width: 8, height: 8, borderRadius: 4 },
  tagText: { ...type.label },
  bell: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 9, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: color.goldBright, borderWidth: 2, borderColor: color.primaryDeep },
  searchWrap: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.md, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md },
  searchInput: { flex: 1, height: 48, paddingVertical: 0, ...type.body, color: color.text, outlineWidth: 0 },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  popupWrap: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 100 },
  popup: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden', ...elevation.float },
  popupTop: { padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md },
  popupIcon: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  popupTitle: { ...type.subheading, color: color.text },
  popupBody: { ...type.small, color: color.textSecondary, marginTop: 2 },
  popupClose: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  popupActions: { backgroundColor: color.surfaceMuted, padding: space.md, flexDirection: 'row', gap: space.sm },
});
