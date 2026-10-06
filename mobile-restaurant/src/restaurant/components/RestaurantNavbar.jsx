import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Bell, MapPin, Search, Utensils, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { restaurantAPI } from '../../api/restaurant';
import { events } from '../../lib/events';
import { localStore } from '../../lib/storage';
import { useLocation, useNavigate } from '../../lib/webRouter';
import { poppins, shadow, tw } from '../../theme';
import useNotificationInbox from '../hooks/useNotificationInbox';
import { useRestaurantNotifications } from '../hooks/useRestaurantNotifications';
import { RT, RT_GRADIENT } from '../theme';
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
      <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.row}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
            <Text style={styles.name} numberOfLines={1} accessibilityRole="header">{loading ? 'Loading...' : restaurantName || 'Restaurant'}</Text>
            {!loading && restaurantAddress && restaurantAddress.trim() !== '' ? (
              <View style={styles.addressRow}>
                <MapPin size={10} color="rgba(255,255,255,0.8)" />
                <Text style={styles.address} numberOfLines={1}>{restaurantAddress}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            {showOfflineOnlineTag ? (
              <Press onPress={() => navigate('/food/restaurant/status', from)} accessibilityLabel={`Restaurant is ${status}. Change status`} style={[styles.tag, online ? styles.tagOn : styles.tagOff]} hitSlop={6}>
                <View style={[styles.tagDot, { backgroundColor: online ? tw.emerald400 : 'rgba(255,255,255,0.3)' }]} />
                <Text style={[styles.tagText, { color: online ? '#fff' : 'rgba(255,255,255,0.7)' }]}>{status}</Text>
              </Press>
            ) : null}
            {showNotifications ? (
              <Press onPress={() => navigate('/food/restaurant/notifications', from)} accessibilityLabel="Notifications" style={{ padding: 10 }}>
                <Bell size={20} color="#fff" />
                {unreadCount > 0 ? <View style={styles.bellDot} /> : null}
              </Press>
            ) : null}
          </View>
        </View>
      </LinearGradient>

      {showSearch && !hideSearch ? (
        <View style={styles.searchWrap}>
          <View style={styles.search}>
            <Search size={18} color={tw.slate400} />
            <TextInput
              value={searchValue}
              onChangeText={setSearchValue}
              placeholder="Search by order ID or dish name"
              placeholderTextColor={tw.slate400}
              returnKeyType="search"
              accessibilityLabel="Search orders"
              style={styles.searchInput}
            />
            {searchValue ? (
              <Press onPress={() => setSearchValue('')} accessibilityLabel="Clear search" hitSlop={10}>
                <X size={16} color={tw.slate400} />
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
                <Utensils size={24} color={RT.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.popupTitle}>New Table Request!</Text>
                <Text style={styles.popupBody} numberOfLines={1}>
                  {newReservation.user?.name || 'A Guest'} has requested a table for {newReservation.guests} people.
                </Text>
              </View>
              <Press onPress={clearNewReservation} accessibilityLabel="Dismiss" style={styles.popupClose}>
                <X size={16} color={tw.slate400} />
              </Press>
            </View>
            <View style={styles.popupActions}>
              <Press
                onPress={() => {
                  clearNewReservation();
                  // The web points this at /dining-reservations, a path its router does not have; the reservations screen is the target.
                  navigate('/food/restaurant/reservations');
                }}
                style={{ flex: 1 }}
              >
                <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.popupPrimary}>
                  <Text style={styles.popupPrimaryText}>VIEW REQUEST</Text>
                </LinearGradient>
              </Press>
              <Press onPress={clearNewReservation} style={styles.popupLater}>
                <Text style={styles.popupLaterText}>LATER</Text>
              </Press>
            </View>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomLeftRadius: 35, borderBottomRightRadius: 35, paddingBottom: 8, zIndex: 10, ...shadow('0 10px 30px rgba(184,11,61,0.25)') },
  row: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 17, lineHeight: 19, letterSpacing: -0.4, color: '#fff', ...poppins(700) },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, opacity: 0.9 },
  address: { flex: 1, fontSize: 11, lineHeight: 16, color: 'rgba(255,255,255,0.9)', ...poppins(500) },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, ...shadow('sm') },
  tagOn: { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)' },
  tagOff: { backgroundColor: 'rgba(6,56,30,0.2)', borderColor: 'rgba(255,255,255,0.1)' },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontSize: 11, lineHeight: 16, letterSpacing: -0.3, paddingHorizontal: 2, ...poppins(700) },
  bellDot: { position: 'absolute', top: 8, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: tw.emerald400, borderWidth: 2, borderColor: RT.primary },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, backgroundColor: tw.slate50, borderWidth: 1, borderColor: tw.slate100, borderRadius: 16, ...shadow('sm') },
  searchInput: { flex: 1, height: 46, paddingVertical: 0, fontSize: 14, color: tw.slate900, ...poppins(600) },
  popupWrap: { position: 'absolute', left: 16, right: 16, zIndex: 100 },
  popup: { backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(10,77,43,0.1)', overflow: 'hidden', ...shadow('0 20px 50px rgba(0,0,0,0.15)') },
  popupTop: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  popupIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: tw.red50, alignItems: 'center', justifyContent: 'center' },
  popupTitle: { fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(800) },
  popupBody: { fontSize: 12, lineHeight: 16, color: tw.slate500, marginTop: 2, ...poppins(500) },
  popupClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' },
  popupActions: { backgroundColor: tw.slate50, padding: 12, flexDirection: 'row', gap: 8 },
  popupPrimary: { height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  popupPrimaryText: { fontSize: 12, letterSpacing: 1.2, color: '#fff', ...poppins(700) },
  popupLater: { height: 40, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate200, alignItems: 'center', justifyContent: 'center' },
  popupLaterText: { fontSize: 12, letterSpacing: 1.2, color: tw.slate600, ...poppins(700) },
});
