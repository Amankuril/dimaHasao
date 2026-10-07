import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, Bike, Calendar, CheckCircle2, Clock, Filter, IndianRupee, MapPin, Package, TrendingUp, User } from 'lucide-react-native';
import { Spinner } from '../../components/Loader';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { outfit as fo, shadow } from '../../theme';
import DriverBottomNav, { NAV_BAR_HEIGHT } from '../components/DriverBottomNav';
import { getDriverRideHistory } from '../services/registrationService';
import { DT } from '../ui/dt';
import ScreenHeader from '../ui/ScreenHeader';
import { Card, Chip, CtaButton, SectionLabel } from '../ui/Surface';

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

const statusTone = (status) => {
  if (status === 'Completed' || status === 'Delivered') return 'success';
  if (status === 'Cancelled') return 'danger';
  return 'warn';
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
      <ScreenHeader
        title="HISTORY"
        subtitle="Driver log"
        onBack={() => navigate(-1)}
        right={
          <Press
            onPress={() => setIsFilterOpen((value) => !value)}
            accessibilityLabel="Filter history"
            style={[st.sq, filterOn && { backgroundColor: DT.accent, borderColor: DT.accent }]}
          >
            <Filter size={18} color={filterOn ? DT.ctaInk : DT.onBrand} />
          </Press>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: NAV_BAR_HEIGHT + insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
        {isFilterOpen ? (
          <Card style={st.filterBox}>
            <SectionLabel style={{ paddingBottom: 10 }}>FILTER HISTORY</SectionLabel>
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
                    style={[st.filterBtn, on ? { backgroundColor: DT.brand, borderColor: DT.brand } : { backgroundColor: DT.card, borderColor: DT.border }]}
                  >
                    <Text style={[st.filterBtnText, { color: on ? DT.onBrand : DT.inkSoft }]}>{filter.label.toUpperCase()}</Text>
                  </Press>
                );
              })}
            </View>
          </Card>
        ) : null}

        <View style={st.tabs}>
          {TABS.map((tab) => {
            const on = activeTab === tab.id;
            return (
              <Press
                key={tab.id}
                scale={1}
                onPress={() => setActiveTab(tab.id)}
                style={[st.tab, on ? { backgroundColor: DT.brand, borderColor: DT.brand } : { backgroundColor: DT.card, borderColor: DT.border }]}
              >
                <Text style={[st.tabText, { color: on ? DT.onBrand : DT.inkSoft }]}>{tab.label.toUpperCase()}</Text>
              </Press>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <Card style={[st.stat, { flex: 1 }]}>
            <Text style={st.statLabel}>COMPLETION RATE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[st.statIcon, { backgroundColor: DT.successSoft }]}>
                <TrendingUp size={14} color={DT.successInk} />
              </View>
              <Text style={[st.statValue, { color: DT.ink }]}>{stats.completionRate}</Text>
            </View>
          </Card>
          <Card tone="dark" style={[st.stat, { flex: 1 }]}>
            <Text style={[st.statLabel, { color: DT.gold }]}>TOTAL EARNED</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[st.statIcon, { backgroundColor: 'rgba(202,168,62,0.16)' }]}>
                <IndianRupee size={12} color={DT.gold} />
              </View>
              <Text style={[st.statValue, { color: DT.onBrand, flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>
                {stats.totalEarnings}
              </Text>
            </View>
          </Card>
        </View>

        <Card style={st.trips}>
          <Text style={st.tripsLabel}>TRIPS ON RECORD</Text>
          <Text style={st.tripsValue}>{stats.totalTrips}</Text>
        </Card>

        <View style={{ gap: 12 }}>
          <SectionLabel style={{ paddingLeft: 4 }}>ACTIVITY LOG</SectionLabel>

          {loading ? (
            <View style={st.msg}>
              <Spinner size={22} color={DT.brand} />
              <Text style={[st.msgText, { color: DT.inkSoft }]}>Loading trip history</Text>
            </View>
          ) : error ? (
            <View style={st.msg}>
              <AlertCircle size={22} color={DT.danger} />
              <Text style={[st.msgText, { color: DT.ink }]}>{error}</Text>
              <CtaButton title="RETRY" variant="brand" onPress={() => setReloadKey((k) => k + 1)} style={{ minHeight: 44 }} />
            </View>
          ) : filteredHistory.length === 0 ? (
            <View style={st.msg}>
              <Clock size={22} color={DT.faint} />
              <Text style={[st.msgText, { color: DT.inkSoft }]}>No trips found in this filter</Text>
            </View>
          ) : (
            filteredHistory.map((item) => {
              const tone = statusTone(item.status);
              return (
                <View key={item.id} style={st.item}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
                      <View style={[st.typeIcon, { backgroundColor: item.type === 'parcel' ? DT.warnSoft : DT.brandSoft }]}>
                        {item.type === 'parcel' ? <Package size={18} strokeWidth={2.5} color={DT.warnInk} /> : <Bike size={18} strokeWidth={2.5} color={DT.brand} />}
                      </View>
                      <View style={{ gap: 2, flexShrink: 1 }}>
                        <Text style={st.itemTitle}>{item.title.toUpperCase()}</Text>
                        <Text style={st.itemSub}>{item.subtitle}</Text>
                        <Text style={st.itemDate}>{item.dateLabel.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <Text style={st.earn}>{item.earningsLabel}</Text>
                      <Chip label={item.status} tone={tone} />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={st.mini}>
                      <Text style={st.miniLabel}>TRIP DATE</Text>
                      <View style={st.miniRow}>
                        <Calendar size={12} color={DT.inkSoft} />
                        <Text style={st.miniValue}>{item.shortDate}</Text>
                      </View>
                    </View>
                    <View style={st.mini}>
                      <Text style={st.miniLabel}>PAYMENT</Text>
                      <View style={st.miniRow}>
                        <IndianRupee size={12} color={DT.inkSoft} />
                        <Text style={st.miniValue}>{item.paymentMethod}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ paddingHorizontal: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <View style={st.rail}>
                        <View style={[st.dot, { backgroundColor: DT.brand }]} />
                        <View style={st.line} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, paddingBottom: 12 }}>
                        <Text style={st.locLabel}>PICKUP</Text>
                        <Text style={st.loc}>{item.pickup}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <View style={st.rail}>
                        <View style={[st.dot, { backgroundColor: DT.danger }]} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={st.locLabel}>DROP</Text>
                        <Text style={st.loc}>{item.drop}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={st.foot}>
                    <View style={[st.footGroup, { flexShrink: 1 }]}>
                      <User size={12} color={DT.muted} />
                      <Text style={[st.footText, { flexShrink: 1 }]}>{item.subtitle.toUpperCase()}</Text>
                    </View>
                    <View style={[st.footGroup, { gap: 12 }]}>
                      <View style={[st.footGroup, { gap: 4 }]}>
                        <MapPin size={12} color={DT.muted} />
                        <Text style={st.footText}>{item.distanceKm.toFixed(1)} KM</Text>
                      </View>
                      <View style={[st.footGroup, { gap: 4 }]}>
                        <CheckCircle2 size={12} color={DT.muted} />
                        <Text style={st.footText}>{item.fareLabel.toUpperCase()}</Text>
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
  root: { flex: 1, backgroundColor: DT.bg },
  sq: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  filterBox: { marginBottom: 16, padding: 14 },
  filterBtn: { minHeight: 44, justifyContent: 'center', borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  filterBtnText: { fontSize: 11, letterSpacing: 0.6, minWidth: 40, ...fo(800) },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, minHeight: 44, justifyContent: 'center', borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  tabText: { fontSize: 11, letterSpacing: 0.8, minWidth: 40, textAlign: 'center', ...fo(800) },
  stat: { padding: 16, gap: 4 },
  statLabel: { fontSize: 10, letterSpacing: 0.8, minWidth: 90, color: DT.muted, lineHeight: 14, marginBottom: 4, ...fo(800) },
  statIcon: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, lineHeight: 26, fontVariant: ['tabular-nums'], ...fo(800) },
  trips: { marginBottom: 20, paddingVertical: 14 },
  tripsLabel: { fontSize: 11, letterSpacing: 0.8, minWidth: 100, color: DT.muted, ...fo(800) },
  tripsValue: { marginTop: 4, fontSize: 26, color: DT.ink, ...fo(800) },
  msg: { backgroundColor: DT.card, padding: 24, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, alignItems: 'center', justifyContent: 'center', gap: 12, ...shadow('sm') },
  msgText: { fontSize: 13, textAlign: 'center', ...fo(700) },
  item: { backgroundColor: DT.card, padding: 16, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, gap: 14, ...shadow('sm') },
  typeIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 14, lineHeight: 18, color: DT.ink, ...fo(800) },
  itemSub: { fontSize: 11, color: DT.inkSoft, ...fo(600) },
  itemDate: { fontSize: 10, letterSpacing: 0.6, color: DT.muted, ...fo(600) },
  earn: { fontSize: 18, lineHeight: 24, color: DT.ink, fontVariant: ['tabular-nums'], ...fo(800) },
  mini: { flex: 1, borderRadius: DT.radius.md, backgroundColor: DT.bgSoft, paddingHorizontal: 12, paddingVertical: 10 },
  miniLabel: { fontSize: 10, letterSpacing: 0.8, minWidth: 60, color: DT.muted, ...fo(800) },
  miniRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniValue: { fontSize: 12, color: DT.ink, ...fo(700) },
  rail: { width: 12, alignItems: 'center', alignSelf: 'stretch' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  line: { flex: 1, width: 2, marginTop: 2, backgroundColor: DT.border },
  locLabel: { fontSize: 10, letterSpacing: 0.8, minWidth: 40, color: DT.muted, ...fo(800) },
  loc: { fontSize: 13, lineHeight: 18, color: DT.ink, ...fo(600) },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: DT.radius.md, backgroundColor: DT.bg, borderWidth: 1, borderColor: DT.borderSoft, paddingHorizontal: 12, paddingVertical: 10 },
  footGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footText: { fontSize: 10, letterSpacing: 0.6, color: DT.inkSoft, ...fo(700) },
});
