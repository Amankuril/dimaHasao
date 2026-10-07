import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CalendarClock,
  ChevronRight,
  Clock3,
  MapPin,
  Radio,
  RefreshCw,
  Trash2,
} from 'lucide-react-native';
import { Spinner } from '../../components/Loader';
import Skeleton from '../../components/Skeleton';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { useNavigate } from '../../lib/webRouter';
import { outfit, shadow } from '../../theme';
import { DT } from '../ui/dt';
import ScreenHeader from '../ui/ScreenHeader';
import { CtaButton } from '../ui/Surface';
import { getDriverNotifications, getDriverScheduledRides } from '../services/registrationService';
import {
  getVisibleDriverNotifications,
  getMergedDriverNotifications,
  hideAllDriverNotifications,
  hideDriverNotification,
  markDriverNotificationsAsRead,
} from '../utils/notificationState';
import IncomingRideRequest from './IncomingRideRequest';
import { getScheduledRideCountdown } from '../utils/scheduledRideTime';

const formatNotificationTime = (value) => {
  if (!value) {
    return 'Recently';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatScheduledDateTime = (value) => {
  if (!value) {
    return 'Schedule time not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Schedule time not available';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDistanceLabel = (meters) => {
  const value = Number(meters || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return 'Nearby';
  }

  if (value < 1000) {
    return `${Math.round(value)} m`;
  }

  return `${(value / 1000).toFixed(1)} km`;
};

const formatFareLabel = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Rs 0';
  }

  return `Rs ${amount}`;
};

const createScheduledRidePreview = (ride) => ({
  rideId: ride.rideId,
  type: ride.type || ride.serviceType || 'ride',
  fare: formatFareLabel(ride.fare || ride.baseFare),
  distance: formatDistanceLabel(ride.estimatedDistanceMeters),
  payment: ride.paymentMethod || 'cash',
  pickup: ride.pickupAddress || 'Pickup point',
  drop: ride.dropAddress || 'Drop point',
  scheduledAt: ride.scheduledAt || null,
  customer: {
    name: ride.user?.name || 'Customer',
    phone: ride.user?.phone || '',
  },
  raw: {
    fare: ride.fare,
    baseFare: ride.baseFare,
    bookingMode: ride.bookingMode || 'normal',
    parcel: ride.parcel || null,
    intercity: ride.intercity || null,
    user: ride.user || null,
    pickupAddress: ride.pickupAddress || '',
    dropAddress: ride.dropAddress || '',
    scheduledAt: ride.scheduledAt || null,
    ride,
  },
});

const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <Skeleton style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: DT.border }} />
    <View style={{ flex: 1, gap: 8 }}>
      <Skeleton style={{ height: 12, borderRadius: 999, width: '66%', backgroundColor: DT.border }} />
      <Skeleton style={{ height: 10, borderRadius: 999, width: '100%', backgroundColor: DT.borderSoft }} />
      <Skeleton style={{ height: 10, borderRadius: 999, width: '80%', backgroundColor: DT.borderSoft }} />
    </View>
  </View>
);

// <img class="w-full h-auto max-h-[180px] object-cover">
function NotificationImage({ uri }) {
  const [ratio, setRatio] = useState(0);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    let active = true;
    Image.getSize(uri, (w, h) => {
      if (active && w && h) setRatio(w / h);
    }, () => {});
    return () => {
      active = false;
    };
  }, [uri]);
  const height = ratio && width ? Math.min(180, width / ratio) : 180;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.image}>
      <Image source={{ uri }} accessibilityLabel="Notification content" style={{ width: '100%', height }} resizeMode="cover" />
    </View>
  );
}

const ErrorState = ({ message, onRetry }) => (
  <View style={styles.state}>
    <View style={[styles.stateIcon, { width: 64, height: 64 }]}>
      <AlertCircle size={28} color={DT.danger} strokeWidth={2} />
    </View>
    <Text style={styles.errorTitle}>{message}</Text>
    <CtaButton variant="brand" title="RETRY" onPress={onRetry} accessibilityLabel="Retry" icon={<RefreshCw size={14} color={DT.onBrand} strokeWidth={2.5} />} style={{ minWidth: 160 }} />
  </View>
);

/** Port of Taxi/modules/driver/pages/settings/Notifications.jsx (/taxi/driver/notifications). */
export default function DriverNotifications() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const routePrefix = '/taxi/driver';
  const [activeTab, setActiveTab] = useState('alerts');
  const [alertItems, setAlertItems] = useState([]);
  const [scheduledRides, setScheduledRides] = useState([]);
  const [selectedScheduledRide, setSelectedScheduledRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduledLoading, setScheduledLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduledError, setScheduledError] = useState('');
  const [clearing, setClearing] = useState(false);
  const [scheduleNow, setScheduleNow] = useState(() => Date.now());

  const [alertsPage, setAlertsPage] = useState(1);
  const [schedulePage, setSchedulePage] = useState(1);
  const [hasMoreAlerts, setHasMoreAlerts] = useState(false);
  const [hasMoreSchedule, setHasMoreSchedule] = useState(false);
  const pageSize = 10;

  const handleClearAll = async () => {
    if (alertItems.length === 0) return;

    setClearing(true);
    try {
      hideAllDriverNotifications(alertItems.map((notification) => notification.id || notification._id));
      setAlertItems([]);
      toast.success('All notifications cleared');
    } catch {
      toast.error('Failed to clear notifications');
    } finally {
      setClearing(false);
    }
  };

  const handleRemoveSingle = async (id) => {
    try {
      hideDriverNotification(id);
      setAlertItems((prev) => prev.filter((notification) => String(notification.id || notification._id) !== String(id)));
      toast.success('Notification removed');
    } catch {
      toast.error('Failed to remove notification');
    }
  };

  const loadAllData = async (targetPage = 1) => {
    if (activeTab === 'alerts') setLoading(true);
    else setScheduledLoading(true);

    setError('');
    setScheduledError('');

    try {
      if (activeTab === 'alerts') {
        const res = await getDriverNotifications({ page: targetPage, limit: pageSize });
        const results = res?.data?.results || [];
        const total = res?.data?.totalCount || results.length;

        const visibleNotifications = getVisibleDriverNotifications(results);
        setAlertItems(visibleNotifications);
        setHasMoreAlerts(targetPage * pageSize < total);
        setAlertsPage(targetPage);

        if (results.length > 0) {
          markDriverNotificationsAsRead(getMergedDriverNotifications(results).map((n) => n.id || n._id));
        }
      } else {
        const res = await getDriverScheduledRides({ page: targetPage, limit: pageSize });
        const results = res?.data?.results || [];
        const total = res?.data?.totalCount || results.length;

        const nextScheduledRides = results
          .filter((ride) => ride?.scheduledAt)
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

        setScheduledRides(nextScheduledRides);
        setHasMoreSchedule(targetPage * pageSize < total);
        setSchedulePage(targetPage);
      }
    } catch (err) {
      if (activeTab === 'alerts') setError(err?.message || 'Failed to load notifications');
      else setScheduledError(err?.message || 'Failed to load scheduled rides');
    } finally {
      setLoading(false);
      setScheduledLoading(false);
    }
  };

  useEffect(() => {
    loadAllData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'schedule' || scheduledRides.length === 0) {
      return undefined;
    }

    const interval = setInterval(() => {
      setScheduleNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [activeTab, scheduledRides.length]);

  const totalCount = useMemo(
    () => (activeTab === 'schedule' ? scheduledRides.length : alertItems.length),
    [activeTab, alertItems.length, scheduledRides.length],
  );

  const currentPage = activeTab === 'alerts' ? alertsPage : schedulePage;
  const hasMore = activeTab === 'alerts' ? hasMoreAlerts : hasMoreSchedule;
  const busy = loading || scheduledLoading;

  return (
    <View style={{ flex: 1, backgroundColor: DT.bg }}>
      <IncomingRideRequest
        visible={Boolean(selectedScheduledRide)}
        requestData={selectedScheduledRide}
        mode="preview"
        onClose={() => setSelectedScheduledRide(null)}
        onDecline={() => setSelectedScheduledRide(null)}
      />

      <ScreenHeader
        title="Notifications"
        subtitle="Admin alerts and scheduled rides"
        onBack={() => navigate(`${routePrefix}/home`)}
        right={
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{totalCount}</Text>
          </View>
        }
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 + insets.bottom, gap: 12 }}>
        <View style={styles.tabs}>
          {[
            { id: 'alerts', label: 'Alerts', count: alertItems.length },
            { id: 'schedule', label: 'Schedule', count: scheduledRides.length },
          ].map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <Press
                key={tab.id}
                scale={1}
                onPress={() => setActiveTab(tab.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={tab.label}
                style={[styles.tab, isActive ? styles.tabOn : null]}
              >
                {tab.id === 'schedule' ? <CalendarClock size={15} color={isActive ? DT.onBrand : DT.muted} strokeWidth={2.4} /> : <Radio size={15} color={isActive ? DT.onBrand : DT.muted} strokeWidth={2.4} />}
                <Text style={[styles.tabText, { color: isActive ? DT.onBrand : DT.muted }]}>{tab.label.toUpperCase()}</Text>
                <Text style={[styles.tabCount, isActive ? { backgroundColor: 'rgba(255,255,255,0.18)', color: DT.accent } : { backgroundColor: DT.bgSoft, color: DT.muted }]}>{tab.count}</Text>
              </Press>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.label} numberOfLines={1}>{activeTab === 'schedule' ? 'SCHEDULED RIDES' : 'ADMIN & SYSTEM ALERTS'}</Text>
            <Text style={styles.label2}>{totalCount} VISIBLE</Text>
          </View>
          <Press
            onPress={() => loadAllData(currentPage)}
            disabled={busy}
            accessibilityLabel="Refresh"
            style={[styles.pill, { borderColor: DT.border, backgroundColor: DT.card }, busy ? { opacity: 0.5 } : null]}
          >
            {busy ? <Spinner size={14} color={DT.brand} strokeWidth={2.5} /> : <RefreshCw size={14} color={DT.brand} strokeWidth={2.5} />}
            <Text style={[styles.pillText, { color: DT.brand }]}>REFRESH</Text>
          </Press>
          {activeTab === 'alerts' ? (
            <Press
              onPress={handleClearAll}
              disabled={clearing || loading || alertItems.length === 0}
              accessibilityLabel="Clear All"
              style={[styles.pill, { borderColor: DT.dangerSoft, backgroundColor: DT.dangerSoft }, clearing || loading || alertItems.length === 0 ? { opacity: 0.5 } : null]}
            >
              <Trash2 size={14} color={DT.danger} strokeWidth={2.5} />
              <Text style={[styles.pillText, { color: DT.dangerInk }]}>CLEAR ALL</Text>
            </Press>
          ) : null}
        </View>

        {activeTab === 'alerts' && loading && Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)}
        {activeTab === 'schedule' && scheduledLoading && Array.from({ length: 3 }).map((_, index) => <SkeletonCard key={index} />)}

        {activeTab === 'alerts' && error && !loading ? <ErrorState message={error} onRetry={() => loadAllData(1)} /> : null}
        {activeTab === 'schedule' && scheduledError && !scheduledLoading ? <ErrorState message={scheduledError} onRetry={() => loadAllData(1)} /> : null}

        {activeTab === 'alerts' && !loading && !error && alertItems.length === 0 ? (
          <View style={styles.state}>
            <View style={[styles.stateIcon, { width: 80, height: 80 }]}>
              <Bell size={36} color={DT.faint} strokeWidth={1.5} />
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyBody}>Admin and payment notifications will appear here automatically</Text>
            </View>
          </View>
        ) : null}

        {activeTab === 'schedule' && !scheduledLoading && !scheduledError && scheduledRides.length === 0 ? (
          <View style={styles.state}>
            <View style={[styles.stateIcon, { width: 80, height: 80 }]}>
              <CalendarClock size={34} color={DT.faint} strokeWidth={1.7} />
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.emptyTitle}>No scheduled rides yet</Text>
              <Text style={styles.emptyBody}>Scheduled bookings tied to this driver will show here with pickup, drop, rider info, and time.</Text>
            </View>
          </View>
        ) : null}

        {activeTab === 'alerts' && !loading && !error && alertItems.map((notification) => (
          <View key={notification.id || notification._id} style={styles.card}>
            <View style={[styles.cardIcon, { backgroundColor: DT.brandSoft }]}>
              <Radio size={18} color={DT.brand} strokeWidth={2.3} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <Text style={[styles.cardTitle, { flex: 1 }]}>{notification.title || 'Notification'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={styles.time}>{formatNotificationTime(notification.sentAt)}</Text>
                  <Press scale={1} onPress={() => handleRemoveSingle(notification.id)} accessibilityLabel="Remove notification" hitSlop={6} style={{ padding: 10, margin: -6 }}>
                    <Trash2 size={16} color={DT.faint} strokeWidth={2.5} />
                  </Press>
                </View>
              </View>
              <Text style={styles.body}>{notification.body || 'No message'}</Text>

              {notification.image ? <NotificationImage uri={notification.image} /> : null}

              {notification.serviceLocationName ? (
                <Text style={styles.serviceLocation}>{String(notification.serviceLocationName).toUpperCase()}</Text>
              ) : null}
            </View>
          </View>
        ))}

        {activeTab === 'schedule' && !scheduledLoading && !scheduledError && scheduledRides.map((ride) => (
          <Press
            key={ride.rideId}
            scale={0.99}
            onPress={() => setSelectedScheduledRide(createScheduledRidePreview(ride))}
            accessibilityLabel={ride.type === 'parcel' ? 'Scheduled delivery' : ride.type === 'intercity' ? 'Scheduled intercity ride' : 'Scheduled ride'}
            style={[styles.card, { flexDirection: 'column', alignItems: 'stretch', gap: 0 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={[styles.cardIcon, { backgroundColor: DT.brandSoft }]}>
                <CalendarClock size={18} color={DT.brand} strokeWidth={2.3} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.cardTitle}>
                      {ride.type === 'parcel' ? 'Scheduled delivery' : ride.type === 'intercity' ? 'Scheduled intercity ride' : 'Scheduled ride'}
                    </Text>
                    <Text style={styles.scheduleAt}>{formatScheduledDateTime(ride.scheduledAt).toUpperCase()}</Text>
                    <Text style={styles.countdown}>{getScheduledRideCountdown(ride.scheduledAt, scheduleNow)}</Text>
                  </View>
                  <ChevronRight size={18} color={DT.faint} strokeWidth={2.5} style={{ marginTop: 2 }} />
                </View>

                <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>FARE</Text>
                    <Text style={styles.statValue}>{formatFareLabel(ride.fare || ride.baseFare)}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>DISTANCE</Text>
                    <Text style={styles.statValue}>{formatDistanceLabel(ride.estimatedDistanceMeters)}</Text>
                  </View>
                </View>

                <View style={{ marginTop: 12, gap: 8 }}>
                  <View style={styles.infoRow}>
                    <Clock3 size={13} color={DT.info} strokeWidth={2.3} style={{ marginTop: 2 }} />
                    <Text style={styles.infoText}>{ride.user?.name || 'Customer'}{ride.user?.phone ? ` • ${ride.user.phone}` : ''}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MapPin size={13} color={DT.success} strokeWidth={2.3} style={{ marginTop: 2 }} />
                    <Text style={styles.infoText} numberOfLines={1}>{ride.pickupAddress || 'Pickup point'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MapPin size={13} color={DT.warn} strokeWidth={2.3} style={{ marginTop: 2 }} />
                    <Text style={styles.infoText} numberOfLines={1}>{ride.dropAddress || 'Drop point'}</Text>
                  </View>
                </View>
              </View>
            </View>
          </Press>
        ))}

        {/* Pagination Controls */}
        {((activeTab === 'alerts' && alertItems.length > 0) || (activeTab === 'schedule' && scheduledRides.length > 0)) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 24, paddingHorizontal: 4 }}>
            <Press
              disabled={currentPage === 1 || busy}
              onPress={() => loadAllData(currentPage - 1)}
              accessibilityLabel="Previous page"
              style={[styles.pager, currentPage === 1 || busy ? { opacity: 0.4 } : null]}
            >
              <ArrowLeft size={14} color={DT.brand} strokeWidth={2.5} />
              <Text style={styles.pagerText}>PREV</Text>
            </Press>
            <Text style={styles.page}>PAGE {currentPage}</Text>
            <Press
              disabled={!hasMore || busy}
              onPress={() => loadAllData(currentPage + 1)}
              accessibilityLabel="Next page"
              style={[styles.pager, !hasMore || busy ? { opacity: 0.4 } : null]}
            >
              <Text style={styles.pagerText}>NEXT</Text>
              <ChevronRight size={14} color={DT.brand} strokeWidth={2.5} />
            </Press>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  countPill: { minWidth: 36, alignItems: 'center', backgroundColor: DT.gold, paddingHorizontal: 12, paddingVertical: 6, borderRadius: DT.radius.pill },
  countPillText: { fontSize: 13, lineHeight: 18, color: DT.ctaInk, ...outfit(800) },
  pill: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: DT.radius.pill, borderWidth: 1, paddingHorizontal: 12 },
  pillText: { fontSize: 10, lineHeight: 15, letterSpacing: 0.8, minWidth: 48, ...outfit(800) },
  tabs: { flexDirection: 'row', gap: 6, borderRadius: DT.radius.pill, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.card, padding: 4, ...shadow('sm') },
  tab: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: DT.radius.pill, paddingHorizontal: 12 },
  tabOn: { backgroundColor: DT.brand },
  tabText: { fontSize: 11, lineHeight: 16, letterSpacing: 1, minWidth: 64, textAlign: 'center', ...outfit(800) },
  tabCount: { fontSize: 10, lineHeight: 14, borderRadius: DT.radius.pill, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden', ...outfit(800) },
  label: { fontSize: 11, lineHeight: 16, letterSpacing: 0.8, minWidth: 120, color: DT.ink, ...outfit(800) },
  label2: { fontSize: 10, lineHeight: 15, letterSpacing: 0.8, minWidth: 80, color: DT.muted, ...outfit(700) },
  skeletonCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: DT.radius.lg, backgroundColor: DT.card, borderWidth: 1, borderColor: DT.borderSoft, padding: 16 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 16 },
  stateIcon: { backgroundColor: DT.card, borderWidth: 1, borderColor: DT.borderSoft, borderRadius: DT.radius.xl, alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  errorTitle: { fontSize: 14, lineHeight: 21, color: DT.inkSoft, textAlign: 'center', ...outfit(800) },
  emptyTitle: { fontSize: 16, lineHeight: 24, color: DT.ink, textAlign: 'center', ...outfit(800) },
  emptyBody: { fontSize: 13, lineHeight: 19, color: DT.muted, marginTop: 4, textAlign: 'center', paddingHorizontal: 16, ...outfit(500) },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.card, padding: 16, ...shadow('sm') },
  cardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, lineHeight: 20, color: DT.ink, ...outfit(700) },
  time: { fontSize: 10, lineHeight: 14, color: DT.muted, marginTop: 2, ...outfit(600) },
  body: { fontSize: 13, lineHeight: 19, color: DT.inkSoft, marginTop: 4, ...outfit(500) },
  image: { marginTop: 12, borderRadius: DT.radius.md, overflow: 'hidden', borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.bg },
  serviceLocation: { fontSize: 10, lineHeight: 14, letterSpacing: 0.8, color: DT.muted, marginTop: 8, ...outfit(700) },
  scheduleAt: { marginTop: 4, fontSize: 10, lineHeight: 15, letterSpacing: 0.8, color: DT.info, ...outfit(800) },
  countdown: { marginTop: 4, fontSize: 12, lineHeight: 17, color: DT.successInk, ...outfit(800) },
  stat: { flex: 1, borderRadius: DT.radius.md, backgroundColor: DT.bg, borderWidth: 1, borderColor: DT.borderSoft, paddingHorizontal: 12, paddingVertical: 8 },
  statLabel: { fontSize: 9, lineHeight: 12, letterSpacing: 0.8, minWidth: 50, color: DT.muted, ...outfit(800) },
  statValue: { marginTop: 4, fontSize: 14, lineHeight: 20, color: DT.ink, ...outfit(800) },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, color: DT.inkSoft, ...outfit(600) },
  pager: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderRadius: DT.radius.pill, backgroundColor: DT.card, borderWidth: 1, borderColor: DT.border, ...shadow('sm') },
  pagerText: { fontSize: 12, lineHeight: 16, letterSpacing: 1, minWidth: 40, color: DT.brand, ...outfit(800) },
  page: { fontSize: 11, lineHeight: 16, letterSpacing: 1, minWidth: 60, textAlign: 'center', color: DT.muted, ...outfit(800) },
});
