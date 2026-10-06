import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ArrowLeft, Bike, Calendar, CheckCircle2, Clock, Filter, IndianRupee, MapPin, Package, TrendingUp, User } from 'lucide-react-native';
import { Spinner } from '../../components/Loader';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { outfit as fo, shadow, tw } from '../../theme';
import DriverBottomNav from '../components/DriverBottomNav';
import { getDriverRideHistory } from '../services/registrationService';

// Web: Taxi/modules/driver/pages/RideRequests.jsx (/taxi/driver/history)

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'ride', label: 'Rides' },
];

const STATUS_FILTERS = [
  { id: 'all', label: 'All statuses' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'active', label: 'Active / Pending' },
];

const unwrap = (response) => response?.data?.results || response?.results || response?.data?.data?.results || [];

const formatCurrency = (value) =>
  `Rs ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateLabel = (value) => {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatShortDate = (value) => {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const formatStatus = (status) => {
  const normalized = String(status || 'searching').toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getRideTimeSource = (ride) => ride.completedAt || ride.startedAt || ride.acceptedAt || ride.createdAt || ride.updatedAt;

const buildLocationLabel = (address, point, fallback) => {
  if (address) {
    return address;
  }

  const [lng, lat] = point?.coordinates || [];
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
  }

  return fallback;
};

const getDriverEarnings = (ride) => {
  const storedEarnings = Number(ride?.driverEarnings);
  if (Number.isFinite(storedEarnings) && storedEarnings > 0) {
    return storedEarnings;
  }

  const fare = Number(ride?.fare || 0);
  const commission = Number(ride?.commissionAmount || 0);
  if (commission > 0) {
    return Math.max(fare - commission, 0);
  }

  return fare;
};

const normalizePaymentLabel = (ride = {}) => {
  const rawValue = ride?.paymentMethod || ride?.payment_method || ride?.paymentType || ride?.payment_type || '';
  const normalized = String(rawValue || '').trim().toLowerCase();

  if (!normalized) {
    const collectionStatus = String(ride?.driverPaymentCollection?.status || '').trim().toLowerCase();
    const providerMode = String(ride?.driverPaymentCollection?.providerMode || '').trim().toLowerCase();

    if (['paid', 'captured', 'completed'].includes(collectionStatus) && (providerMode.includes('upi') || providerMode.includes('card') || providerMode.includes('qr') || providerMode.includes('online'))) {
      return 'ONLINE';
    }

    return 'CASH';
  }

  if (normalized.includes('online') || normalized.includes('upi') || normalized.includes('card') || normalized.includes('qr')) {
    return 'ONLINE';
  }

  if (normalized === 'cash') {
    return 'CASH';
  }

  return normalized.toUpperCase();
};

const normalizeRide = (ride) => {
  const type = String(ride?.serviceType || ride?.type || 'ride').toLowerCase() === 'parcel' ? 'parcel' : 'ride';
  const status = formatStatus(ride?.status || ride?.liveStatus);
  const timeSource = getRideTimeSource(ride);
  const passengerName = ride?.user?.name || 'Passenger';
  const earnings = getDriverEarnings(ride);

  return {
    id: ride?.rideId || ride?._id || '',
    type,
    title: type === 'parcel' ? 'Delivery job' : 'Ride trip',
    subtitle: type === 'parcel' ? `Customer: ${passengerName}` : `Rider: ${passengerName}`,
    dateLabel: formatDateLabel(timeSource),
    shortDate: formatShortDate(timeSource),
    earnings,
    earningsLabel: formatCurrency(earnings),
    fareLabel: formatCurrency(ride?.fare || 0),
    pickup: buildLocationLabel(ride?.pickupAddress, ride?.pickupLocation, 'Pickup'),
    drop: buildLocationLabel(ride?.dropAddress, ride?.dropLocation, 'Drop'),
    status,
    paymentMethod: normalizePaymentLabel(ride),
    distanceKm: Number(ride?.estimatedDistanceMeters || 0) / 1000,
  };
};

const statusBadge = (status) => {
  if (status === 'Completed' || status === 'Delivered') {
    return { bg: tw.emerald50, fg: tw.emerald700, border: tw.emerald100 };
  }

  if (status === 'Cancelled') {
    return { bg: tw.rose50, fg: tw.rose700, border: tw.rose100 };
  }

  return { bg: tw.amber50, fg: tw.amber700, border: tw.amber100 };
};

export default function RideHistory() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getDriverRideHistory({ limit: 100 });
        const results = unwrap(response);

        if (!active) {
          return;
        }

        setRides(results.map(normalizeRide).filter((ride) => ride.id));
      } catch (loadError) {
        if (!active) {
          return;
        }

        setRides([]);
        setError(loadError?.message || 'Could not load driver history.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filteredHistory = useMemo(() => {
    const byType = activeTab === 'all' ? rides : rides.filter((item) => item.type === activeTab);

    if (statusFilter === 'completed') {
      return byType.filter((item) => ['Completed', 'Delivered'].includes(item.status));
    }

    if (statusFilter === 'cancelled') {
      return byType.filter((item) => item.status === 'Cancelled');
    }

    if (statusFilter === 'active') {
      return byType.filter((item) => !['Completed', 'Delivered', 'Cancelled'].includes(item.status));
    }

    return byType;
  }, [activeTab, rides, statusFilter]);

  const categoryHistory = useMemo(() => (activeTab === 'all' ? rides : rides.filter((item) => item.type === activeTab)), [activeTab, rides]);

  const stats = useMemo(() => {
    const completedTrips = categoryHistory.filter((item) => ['Completed', 'Delivered'].includes(item.status));
    const totalEarnings = completedTrips.reduce((sum, item) => sum + item.earnings, 0);
    const completionRate = categoryHistory.length ? Math.round((completedTrips.length / categoryHistory.length) * 100) : 0;

    return {
      totalEarnings: formatCurrency(totalEarnings),
      completionRate: `${completionRate}%`,
      totalTrips: categoryHistory.length,
    };
  }, [categoryHistory]);

  const filterOn = isFilterOpen || statusFilter !== 'all';

  return (
    <View style={st.root}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 128 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={st.header}>
          <Press onPress={() => navigate(-1)} style={st.sq}>
            <ArrowLeft size={16} color={tw.slate900} />
          </Press>
          <View style={{ alignItems: 'center' }}>
            <Text style={st.eyebrow}>Driver log</Text>
            <Text style={st.h1}>History</Text>
          </View>
          <Press onPress={() => setIsFilterOpen((value) => !value)} style={[st.sq, { borderColor: filterOn ? tw.slate900 : tw.slate100 }]}>
            <Filter size={16} color={filterOn ? tw.slate900 : tw.slate400} />
          </Press>
        </View>

        {isFilterOpen ? (
          <View style={st.filterBox}>
            <Text style={st.filterTitle}>Filter history</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {STATUS_FILTERS.map((filter) => {
                const on = statusFilter === filter.id;
                return (
                  <Press
                    key={filter.id}
                    scale={1}
                    onPress={() => {
                      setStatusFilter(filter.id);
                      setIsFilterOpen(false);
                    }}
                    style={[st.filterBtn, { backgroundColor: on ? tw.slate900 : tw.slate50 }]}
                  >
                    <Text style={[st.filterBtnText, { color: on ? '#fff' : tw.slate500 }]}>{filter.label}</Text>
                  </Press>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={st.tabs}>
          {TABS.map((tab) => {
            const on = activeTab === tab.id;
            return (
              <Press key={tab.id} scale={1} onPress={() => setActiveTab(tab.id)} style={[st.tab, on && [{ backgroundColor: '#fff' }, shadow('sm')]]}>
                <Text style={[st.tabText, { color: on ? tw.slate900 : tw.slate400 }]}>{tab.label}</Text>
              </Press>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <View style={[st.stat, { flex: 1, backgroundColor: '#fff', borderColor: tw.slate50, ...shadow('sm') }]}>
            <Text style={st.statLabel}>Completion Rate</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[st.statIcon, { backgroundColor: tw.emerald50 }]}>
                <TrendingUp size={14} color={tw.emerald500} />
              </View>
              <Text style={[st.statValue, { color: tw.slate900 }]}>{stats.completionRate}</Text>
            </View>
          </View>
          <View style={[st.stat, { flex: 1, backgroundColor: tw.slate900, ...shadow('xl') }]}>
            <Text style={[st.statLabel, { color: 'rgba(255,255,255,0.4)' }]}>Total Earned</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[st.statIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <IndianRupee size={12} color="#fff" />
              </View>
              <Text style={[st.statValue, { color: '#fff', flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>
                {stats.totalEarnings}
              </Text>
            </View>
          </View>
        </View>

        <View style={st.trips}>
          <Text style={st.tripsLabel}>Trips on record</Text>
          <Text style={st.tripsValue}>{stats.totalTrips}</Text>
        </View>

        <View style={{ gap: 12 }}>
          <Text style={st.logTitle}>Activity Log</Text>

          {loading ? (
            <View style={st.msg}>
              <Spinner size={22} color={tw.slate500} />
              <Text style={[st.msgText, { color: tw.slate600 }]}>Loading trip history</Text>
            </View>
          ) : error ? (
            <View style={st.msg}>
              <AlertCircle size={22} color={tw.rose500} />
              <Text style={[st.msgText, { color: tw.slate700 }]}>{error}</Text>
              <Press onPress={() => setReloadKey((k) => k + 1)} style={st.retry}>
                <Text style={st.retryText}>Retry</Text>
              </Press>
            </View>
          ) : filteredHistory.length === 0 ? (
            <View style={st.msg}>
              <Clock size={22} color={tw.slate300} />
              <Text style={[st.msgText, { color: tw.slate600 }]}>No trips found in this filter</Text>
            </View>
          ) : (
            filteredHistory.map((item) => {
              const badge = statusBadge(item.status);
              return (
                <View key={item.id} style={st.item}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
                      <View style={[st.typeIcon, { backgroundColor: item.type === 'parcel' ? tw.orange50 : tw.slate100 }]}>
                        {item.type === 'parcel' ? <Package size={18} strokeWidth={2.5} color={tw.orange600} /> : <Bike size={18} strokeWidth={2.5} color={tw.slate900} />}
                      </View>
                      <View style={{ gap: 2, flexShrink: 1 }}>
                        <Text style={st.itemTitle}>{item.title}</Text>
                        <Text style={st.itemSub}>{item.subtitle}</Text>
                        <Text style={st.itemDate}>{item.dateLabel}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={st.earn}>{item.earningsLabel}</Text>
                      <View style={[st.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                        <Text style={[st.badgeText, { color: badge.fg }]}>{item.status}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={st.mini}>
                      <Text style={st.miniLabel}>Trip Date</Text>
                      <View style={st.miniRow}>
                        <Calendar size={12} color={tw.slate700} />
                        <Text style={st.miniValue}>{item.shortDate}</Text>
                      </View>
                    </View>
                    <View style={st.mini}>
                      <Text style={st.miniLabel}>Payment</Text>
                      <View style={st.miniRow}>
                        <IndianRupee size={12} color={tw.slate700} />
                        <Text style={st.miniValue}>{item.paymentMethod}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ gap: 10, paddingHorizontal: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <View style={[st.dot, { borderColor: tw.slate900 }]} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={st.locLabel}>Pickup</Text>
                        <Text style={st.loc}>{item.pickup}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <View style={[st.dot, { borderColor: tw.rose500 }]} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={st.locLabel}>Drop</Text>
                        <Text style={st.loc}>{item.drop}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={st.foot}>
                    <View style={[st.footGroup, { flexShrink: 1 }]}>
                      <User size={12} color={tw.slate500} />
                      <Text style={st.footText} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    </View>
                    <View style={[st.footGroup, { gap: 12 }]}>
                      <View style={[st.footGroup, { gap: 4 }]}>
                        <MapPin size={12} color={tw.slate500} />
                        <Text style={st.footText}>{item.distanceKm.toFixed(1)} km</Text>
                      </View>
                      <View style={[st.footGroup, { gap: 4 }]}>
                        <CheckCircle2 size={12} color={tw.slate500} />
                        <Text style={st.footText}>{item.fareLabel}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <DriverBottomNav />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8f9fb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingTop: 8 },
  sq: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  eyebrow: { fontSize: 9, letterSpacing: 1.98, textTransform: 'uppercase', color: tw.slate400, ...fo(900) },
  h1: { fontSize: 18, letterSpacing: -0.45, textTransform: 'uppercase', color: tw.slate900, ...fo(900) },
  filterBox: { marginBottom: 20, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', padding: 12, ...shadow('sm') },
  filterTitle: { paddingHorizontal: 4, paddingBottom: 8, fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase', color: tw.slate400, ...fo(900) },
  filterBtn: { width: '48.5%', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  filterBtnText: { fontSize: 11, letterSpacing: 0.55, textTransform: 'uppercase', ...fo(900) },
  tabs: { flexDirection: 'row', backgroundColor: tw.slate100, padding: 4, borderRadius: 12, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabText: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', ...fo(900) },
  stat: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'transparent', gap: 4 },
  statLabel: { fontSize: 9, letterSpacing: 0.9, textTransform: 'uppercase', color: tw.slate400, lineHeight: 9, marginBottom: 4, ...fo(900) },
  statIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, lineHeight: 20, ...fo(900) },
  trips: { marginBottom: 24, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, ...shadow('sm') },
  tripsLabel: { fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase', color: tw.slate400, ...fo(900) },
  tripsValue: { marginTop: 4, fontSize: 24, color: tw.slate900, ...fo(900) },
  logTitle: { paddingLeft: 4, marginBottom: 4, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tw.slate400, ...fo(900) },
  msg: { backgroundColor: '#fff', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: tw.slate50, alignItems: 'center', justifyContent: 'center', gap: 12, ...shadow('sm') },
  msgText: { fontSize: 13, textAlign: 'center', ...fo(900) },
  retry: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: tw.slate900 },
  retryText: { fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: '#fff', ...fo(900) },
  item: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: tw.slate50, gap: 16, ...shadow('sm') },
  typeIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 14, lineHeight: 14, letterSpacing: -0.35, textTransform: 'uppercase', color: tw.slate900, ...fo(900) },
  itemSub: { fontSize: 10, color: tw.slate500, ...fo(700) },
  itemDate: { fontSize: 9, letterSpacing: 0.9, textTransform: 'uppercase', color: tw.slate400, ...fo(700) },
  earn: { fontSize: 16, lineHeight: 16, color: tw.slate900, ...fo(900) },
  badge: { marginTop: 4, borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 8, letterSpacing: 0.8, textTransform: 'uppercase', ...fo(900) },
  mini: { flex: 1, borderRadius: 12, backgroundColor: tw.slate50, borderWidth: 1, borderColor: tw.slate100, paddingHorizontal: 12, paddingVertical: 10 },
  miniLabel: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tw.slate400, ...fo(900) },
  miniRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniValue: { fontSize: 10, color: tw.slate700, ...fo(900) },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 2, backgroundColor: '#fff', marginTop: 5 },
  locLabel: { fontSize: 9, letterSpacing: 0.9, textTransform: 'uppercase', color: tw.slate400, ...fo(900) },
  loc: { fontSize: 12, lineHeight: 15, color: tw.slate600, ...fo(900) },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: tw.slate100, backgroundColor: tw.slate50, paddingHorizontal: 12, paddingVertical: 10 },
  footGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footText: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tw.slate500, ...fo(900) },
});
