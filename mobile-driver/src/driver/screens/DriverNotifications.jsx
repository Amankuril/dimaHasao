import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CalendarClock,
  CheckCircle2,
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
import { outfit, shadow, tw } from '../../theme';
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
    <Skeleton style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tw.slate200 }} />
    <View style={{ flex: 1, gap: 8 }}>
      <Skeleton style={{ height: 12, borderRadius: 999, width: '66%', backgroundColor: tw.slate200 }} />
      <Skeleton style={{ height: 10, borderRadius: 999, width: '100%', backgroundColor: tw.slate100 }} />
      <Skeleton style={{ height: 10, borderRadius: 999, width: '80%', backgroundColor: tw.slate100 }} />
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
      <AlertCircle size={28} color={tw.red400} strokeWidth={2} />
    </View>
    <Text style={styles.errorTitle}>{message}</Text>
    <Press onPress={onRetry} accessibilityLabel="Retry" style={styles.retry}>
      <RefreshCw size={13} color="#fff" strokeWidth={2.5} />
      <Text style={styles.retryText}>RETRY</Text>
    </Press>
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
    <LinearGradient colors={['#F8FAFC', '#F3F4F6', '#EEF2F7']} locations={[0, 0.38, 1]} style={{ flex: 1 }}>
      <IncomingRideRequest
        visible={Boolean(selectedScheduledRide)}
        requestData={selectedScheduledRide}
        mode="preview"
        onClose={() => setSelectedScheduledRide(null)}
        onDecline={() => setSelectedScheduledRide(null)}
      />

      <View pointerEvents="none" style={[styles.blob, { top: -64, right: -40, width: 176, height: 176, backgroundColor: 'rgba(219,234,254,0.35)' }]} />
      <View pointerEvents="none" style={[styles.blob, { top: 208, left: -60, width: 208, height: 208, backgroundColor: 'rgba(241,245,249,0.45)' }]} />

      <View style={[styles.header, { paddingTop: 40 + insets.top }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Press onPress={() => navigate(`${routePrefix}/home`)} accessibilityLabel="Back" style={styles.back}>
            <ArrowLeft size={18} color={tw.slate900} strokeWidth={2.5} />
          </Press>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.kicker}>INBOX</Text>
            <Text style={styles.title} accessibilityRole="header">Notifications</Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{totalCount}</Text>
          </View>
        </View>
        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <Press
            onPress={() => loadAllData(currentPage)}
            disabled={busy}
            accessibilityLabel="Refresh"
            style={[styles.pill, { borderColor: tw.slate200, backgroundColor: '#fff' }, busy ? { opacity: 0.5 } : null]}
          >
            {busy ? <Spinner size={12} color={tw.slate600} strokeWidth={2.5} /> : <RefreshCw size={12} color={tw.slate600} strokeWidth={2.5} />}
            <Text style={[styles.pillText, { color: tw.slate600 }]}>REFRESH</Text>
          </Press>
          {activeTab === 'alerts' ? (
            <Press
              onPress={handleClearAll}
              disabled={clearing || loading || alertItems.length === 0}
              accessibilityLabel="Clear All"
              style={[styles.pill, { borderColor: tw.rose100, backgroundColor: tw.rose50 }, clearing || loading || alertItems.length === 0 ? { opacity: 0.5 } : null]}
            >
              <Trash2 size={12} color={tw.rose500} strokeWidth={2.5} />
              <Text style={[styles.pillText, { color: tw.rose500 }]}>CLEAR ALL</Text>
            </Press>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 + insets.bottom, gap: 10 }}>
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
                {tab.id === 'schedule' ? <CalendarClock size={14} color={isActive ? '#fff' : tw.slate500} strokeWidth={2.4} /> : <Radio size={14} color={isActive ? '#fff' : tw.slate500} strokeWidth={2.4} />}
                <Text style={[styles.tabText, { color: isActive ? '#fff' : tw.slate500 }]}>{tab.label.toUpperCase()}</Text>
                <Text style={[styles.tabCount, isActive ? { backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' } : { backgroundColor: tw.slate100, color: tw.slate500 }]}>{tab.count}</Text>
              </Press>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <Text style={styles.label}>{activeTab === 'schedule' ? 'SCHEDULED RIDES' : 'ADMIN & SYSTEM ALERTS'}</Text>
          <Text style={styles.label2}>{totalCount} VISIBLE</Text>
        </View>

        {activeTab === 'alerts' && loading && Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)}
        {activeTab === 'schedule' && scheduledLoading && Array.from({ length: 3 }).map((_, index) => <SkeletonCard key={index} />)}

        {activeTab === 'alerts' && error && !loading ? <ErrorState message={error} onRetry={() => loadAllData(1)} /> : null}
        {activeTab === 'schedule' && scheduledError && !scheduledLoading ? <ErrorState message={scheduledError} onRetry={() => loadAllData(1)} /> : null}

        {activeTab === 'alerts' && !loading && !error && alertItems.length === 0 ? (
          <View style={styles.state}>
            <View style={[styles.stateIcon, { width: 80, height: 80 }]}>
              <Bell size={36} color={tw.slate300} strokeWidth={1.5} />
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
              <CalendarClock size={34} color={tw.slate300} strokeWidth={1.7} />
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.emptyTitle}>No scheduled rides yet</Text>
              <Text style={styles.emptyBody}>Scheduled bookings tied to this driver will show here with pickup, drop, rider info, and time.</Text>
            </View>
          </View>
        ) : null}

        {activeTab === 'alerts' && !loading && !error && alertItems.map((notification) => (
          <View key={notification.id || notification._id} style={styles.card}>
            <View style={[styles.cardIcon, { backgroundColor: tw.emerald50 }]}>
              <Radio size={16} color={tw.emerald500} strokeWidth={2.3} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <Text style={[styles.cardTitle, { flex: 1 }]}>{notification.title || 'Notification'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={styles.time}>{formatNotificationTime(notification.sentAt)}</Text>
                  <Press scale={1} onPress={() => handleRemoveSingle(notification.id)} accessibilityLabel="Remove notification" hitSlop={6} style={{ padding: 6 }}>
                    <Trash2 size={13} color={tw.slate300} strokeWidth={2.5} />
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
              <View style={[styles.cardIcon, { backgroundColor: tw.blue50 }]}>
                <CalendarClock size={16} color={tw.blue600} strokeWidth={2.3} />
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
                  <ChevronRight size={16} color={tw.slate300} strokeWidth={2.5} style={{ marginTop: 2 }} />
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
                    <Clock3 size={13} color={tw.blue500} strokeWidth={2.3} style={{ marginTop: 2 }} />
                    <Text style={styles.infoText}>{ride.user?.name || 'Customer'}{ride.user?.phone ? ` • ${ride.user.phone}` : ''}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MapPin size={13} color={tw.emerald500} strokeWidth={2.3} style={{ marginTop: 2 }} />
                    <Text style={styles.infoText} numberOfLines={1}>{ride.pickupAddress || 'Pickup point'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MapPin size={13} color={tw.orange500} strokeWidth={2.3} style={{ marginTop: 2 }} />
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
              <ArrowLeft size={14} color={tw.slate600} strokeWidth={2.5} />
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
              <ChevronRight size={14} color={tw.slate600} strokeWidth={2.5} />
            </Press>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', borderRadius: 999 },
  header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: 'rgba(255,255,255,0.9)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.8)', ...shadow('0 4px 20px rgba(15,23,42,0.05)') },
  back: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  kicker: { fontSize: 9, lineHeight: 13.5, letterSpacing: 2.34, color: tw.slate400, ...outfit(900) },
  title: { fontSize: 19, lineHeight: 20.9, letterSpacing: -0.475, color: tw.slate900, ...outfit(900) },
  countPill: { backgroundColor: tw.slate900, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, ...shadow('sm') },
  countPillText: { fontSize: 10, lineHeight: 15, color: '#fff', ...outfit(900) },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  pillText: { fontSize: 10, lineHeight: 15, letterSpacing: 1, ...outfit(900) },
  tabs: { flexDirection: 'row', gap: 8, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.7)', padding: 4, ...shadow('0 8px 24px rgba(15,23,42,0.05)') },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 12 },
  tabOn: { backgroundColor: tw.slate900, ...shadow('0 10px 24px rgba(15,23,42,0.18)') },
  tabText: { fontSize: 11, lineHeight: 16.5, letterSpacing: 1.76, ...outfit(900) },
  tabCount: { fontSize: 9, lineHeight: 13.5, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden', ...outfit(900) },
  label: { fontSize: 10, lineHeight: 15, letterSpacing: 2.6, color: tw.slate400, ...outfit(900) },
  label2: { fontSize: 10, lineHeight: 15, letterSpacing: 1.8, color: tw.slate400, ...outfit(900) },
  skeletonCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', padding: 16 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 16 },
  stateIcon: { backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { fontSize: 14, lineHeight: 21, color: tw.slate700, textAlign: 'center', ...outfit(900) },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: tw.slate900, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  retryText: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: '#fff', ...outfit(900) },
  emptyTitle: { fontSize: 16, lineHeight: 24, color: tw.slate700, textAlign: 'center', ...outfit(900) },
  emptyBody: { fontSize: 12, lineHeight: 16, color: tw.slate400, marginTop: 4, textAlign: 'center', ...outfit(700) },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: '#fff', padding: 16, ...shadow('0 4px 14px rgba(15,23,42,0.07)') },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 13, lineHeight: 16.25, color: tw.slate900, ...outfit(900) },
  time: { fontSize: 9, lineHeight: 13.5, color: tw.slate400, marginTop: 2, ...outfit(700) },
  body: { fontSize: 11, lineHeight: 17.9, color: tw.slate500, marginTop: 4, ...outfit(700) },
  image: { marginTop: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: tw.slate100, backgroundColor: tw.slate50, ...shadow('sm') },
  serviceLocation: { fontSize: 9, lineHeight: 13.5, letterSpacing: 0.9, color: tw.slate300, marginTop: 8, ...outfit(900) },
  scheduleAt: { marginTop: 4, fontSize: 10, lineHeight: 15, letterSpacing: 1.8, color: tw.blue500, ...outfit(900) },
  countdown: { marginTop: 4, fontSize: 11, lineHeight: 16.5, color: tw.emerald600, ...outfit(900) },
  stat: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, backgroundColor: tw.slate50, paddingHorizontal: 12, paddingVertical: 8 },
  statLabel: { fontSize: 8, lineHeight: 12, letterSpacing: 0.8, color: tw.slate400, ...outfit(900) },
  statValue: { marginTop: 4, fontSize: 13, lineHeight: 19.5, color: tw.slate900, ...outfit(900) },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { flex: 1, fontSize: 11, lineHeight: 17.9, color: tw.slate600, ...outfit(700) },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate200, ...shadow('sm') },
  pagerText: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: tw.slate600, ...outfit(900) },
  page: { fontSize: 11, lineHeight: 16.5, letterSpacing: 1.1, color: tw.slate400, ...outfit(900) },
});
