import { useEffect, useMemo, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, Clock, Gift, Search, X } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../api/delivery';
import useDeliveryBackNavigation from '../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../lib/notify';
import { localStore } from '../../../lib/storage';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { BottomSheet, SoraMoney } from '../../kit';
import Skeleton from '../../Skeleton';
import { Spinner } from '../../Loader';
import { Press } from '../../ui';
import { display, ff, shadow, tw } from '../../../theme';

/*
 * Port of pages/HistoryV2.jsx. Root `font-poppins` -> Nunito Sans.
 * #10B981 text/background classes -> primary; bg-[#121212] -> the blue-black
 * gradient; px-6 -> 17.6 px; rounded-2xl -> #E5DDC3 border + card shadow.
 */

const HISTORY_PREFS_KEY = 'delivery_trip_history_prefs_v1';
const TABS = ['daily', 'weekly', 'monthly'];
const TRIP_TYPES = ['ALL TRIPS', 'Completed', 'Cancelled', 'Pending'];

const toLocalDateKey = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const parseLocalDateKey = (key) => {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(String(key))) return null;
  const [y, m, d] = String(key).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
};
const loadHistoryPrefs = () => {
  try {
    const raw = localStore.getItem(HISTORY_PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const formatDateDisplay = (date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const day = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  if (date.toDateString() === today.toDateString()) return `Today: ${day}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday: ${day}`;
  return day;
};

const extractItems = (trip) => {
  const items = trip.items || trip.orderItems || [];
  if (items.length === 0) return 'Standard Delivery';
  const first = items[0];
  return `${first.quantity || first.qty || 1}x ${first.name || first.itemName || 'Item'}${items.length > 1 ? ` +${items.length - 1} more` : ''}`;
};

const codAmount = (trip) => {
  const collected = Number(trip.codCollectedAmount);
  const due = Number(trip.codAmount);
  const total = Number(trip.orderTotal);
  if (Number.isFinite(collected) && collected > 0) return collected;
  if (Number.isFinite(due) && due > 0) return due;
  return Number.isFinite(total) ? total : 0;
};

function Dropdown({ visible, style, children }) {
  const a = useAnimatedValue(0);
  useEffect(() => {
    if (visible) {
      a.setValue(0);
      Animated.timing(a, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, a]);
  if (!visible) return null;
  // `fixed ... z-[200]`: an overlay, not a modal; taps elsewhere still reach the page.
  return <Animated.View style={[style, { zIndex: 200, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-5, 0] }) }] }]}>{children}</Animated.View>;
}

export default function HistoryV2() {
  const goBack = useDeliveryBackNavigation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const savedPrefs = useMemo(() => loadHistoryPrefs(), []);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = String(savedPrefs?.activeTab || 'daily').toLowerCase();
    return TABS.includes(tab) ? tab : 'daily';
  });
  const [selectedDate, setSelectedDate] = useState(() => parseLocalDateKey(savedPrefs?.selectedDate) || new Date());
  const [selectedTripType, setSelectedTripType] = useState(() => {
    const type = savedPrefs?.selectedTripType || 'ALL TRIPS';
    return TRIP_TYPES.includes(type) ? type : 'ALL TRIPS';
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTripTypePicker, setShowTripTypePicker] = useState(false);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusTransactions, setBonusTransactions] = useState([]);
  const [bonusLoading, setBonusLoading] = useState(false);

  useEffect(() => {
    localStore.setItem(HISTORY_PREFS_KEY, JSON.stringify({ activeTab, selectedDate: toLocalDateKey(selectedDate), selectedTripType }));
  }, [activeTab, selectedDate, selectedTripType]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const response = await deliveryAPI.getTripHistory({
          period: activeTab,
          date: toLocalDateKey(selectedDate),
          status: selectedTripType !== 'ALL TRIPS' ? selectedTripType : undefined,
          limit: 1000,
        });
        if (response.data?.success) setTrips(response.data.data.trips || []);
      } catch {
        toast.error('Failed to load history');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDate, activeTab, selectedTripType]);

  useEffect(() => {
    if (!showBonusModal) return;
    (async () => {
      setBonusLoading(true);
      try {
        const res = await deliveryAPI.getWalletTransactions({ type: 'bonus', limit: 50 });
        if (res.data?.success) setBonusTransactions(res.data.data.transactions || []);
      } catch {
        toast.error('Failed to load bonuses');
      } finally {
        setBonusLoading(false);
      }
    })();
  }, [showBonusModal]);

  const recentDates = useMemo(
    () =>
      [...Array(30)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d;
      }),
    [],
  );

  const metrics = useMemo(
    () =>
      trips.reduce(
        (acc, trip) => {
          if (String(trip.status || '').toLowerCase() === 'completed') {
            acc.earnings += Number(trip.deliveryEarning ?? trip.amount ?? trip.earningAmount ?? 0) || 0;
            const method = String(trip.paymentMethod || '').toLowerCase();
            if (method === 'cash' || method === 'cod' || method === 'cash on delivery') acc.cod += codAmount(trip);
          }
          return acc;
        },
        { earnings: 0, cod: 0 },
      ),
    [trips],
  );

  // The page scrolls inside DeliveryHomeV2's content area; sticky bands stack under the status bar.
  const dropTop = insets.top + 185;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView stickyHeaderIndices={[0, 1, 2]} style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ paddingBottom: 128 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#15498B', '#000000']} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={[styles.header, { paddingTop: 12 + insets.top }]}>
          <View style={styles.headerLeft}>
            <Press onPress={goBack} scale={0.9} accessibilityLabel="Back" style={styles.back}>
              <ArrowLeft size={20} color="#fff" />
            </Press>
            <View>
              <Text style={styles.h1}>Trip History</Text>
              <Text style={styles.sub}>Your delivery milestones</Text>
            </View>
          </View>
          <Press onPress={() => setShowBonusModal(true)} scale={0.9} accessibilityLabel="Incentive records" style={styles.gift}>
            <Gift size={20} color={tw.primary} />
            {bonusTransactions.length > 0 ? (
              <View style={[styles.giftBadge, shadow('sm')]}>
                <Text style={styles.giftBadgeText}>{bonusTransactions.length}</Text>
              </View>
            ) : null}
          </Press>
        </LinearGradient>

        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <Press key={tab} onPress={() => setActiveTab(tab)} scale={1} accessibilityRole="tab" accessibilityState={{ selected: activeTab === tab }} style={styles.tab}>
              <Text style={[styles.tabText, { color: activeTab === tab ? tw.primary : tw.gray400 }]}>{tab}</Text>
              {activeTab === tab ? <View style={styles.indicator} /> : null}
            </Press>
          ))}
        </View>

        <View style={styles.filters}>
          <Press
            onPress={() => {
              setShowDatePicker(!showDatePicker);
              setShowTripTypePicker(false);
            }}
            scale={1}
            accessibilityLabel="Choose date"
            style={[styles.filter, { flex: 1 }]}
          >
            <Text style={styles.filterText}>{formatDateDisplay(selectedDate)}</Text>
            <ChevronDown size={16} color={tw.gray400} style={showDatePicker ? { transform: [{ rotate: '180deg' }] } : undefined} />
          </Press>
          <Press
            onPress={() => {
              setShowTripTypePicker(!showTripTypePicker);
              setShowDatePicker(false);
            }}
            scale={1}
            accessibilityLabel="Choose trip type"
            style={[styles.filter, { width: 140 }]}
          >
            <Text style={styles.filterText}>{selectedTripType}</Text>
            <ChevronDown size={16} color={tw.gray400} style={showTripTypePicker ? { transform: [{ rotate: '180deg' }] } : undefined} />
          </Press>
        </View>

        <View style={styles.content}>
          <View style={[styles.banner, shadow('card')]}>
            <View>
              <Text style={styles.bannerLabel}>COD Collected</Text>
              <View style={styles.bannerValueBox}>
                {loading ? <Skeleton style={{ height: 28, width: 96 }} /> : <SoraMoney style={styles.bannerValue}>{`₹${metrics.cod.toFixed(2)}`}</SoraMoney>}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.bannerLabel}>Earnings</Text>
              <View style={styles.bannerValueBox}>
                {loading ? <Skeleton style={{ height: 28, width: 96 }} /> : <SoraMoney style={styles.bannerValue}>{`₹${metrics.earnings.toFixed(2)}`}</SoraMoney>}
              </View>
            </View>
          </View>

          {loading ? (
            <View style={styles.loading}>
              <Spinner size={32} color={tw.primary} />
              <Text style={styles.loadingText}>Fetching trips...</Text>
            </View>
          ) : trips.length > 0 ? (
            <View style={{ gap: 16 }}>
              {trips.map((trip, idx) => {
                const status = (trip.status || '').toLowerCase();
                const isCompleted = status === 'completed';
                const isCancelled = status === 'cancelled';
                const payout = Number(trip.deliveryEarning ?? trip.amount ?? trip.earningAmount ?? 0) || 0;
                const method = (trip.paymentMethod || '').toLowerCase();
                const isQR = method === 'razorpay_qr';
                const isCOD = method === 'cash' || method === 'cod';
                return (
                  <Press key={trip.orderId || idx} scale={0.99} accessibilityLabel={`Trip ${trip.orderId || ''}`} style={[styles.trip, shadow('card')]}>
                    <View style={styles.tripTop}>
                      <View style={{ flexShrink: 1 }}>
                        <Text style={styles.tripId}>{trip.orderId || 'ORDER-ID'}</Text>
                        <Text style={styles.tripRest}>{trip.restaurant || trip.restaurantName || 'Sayaji'}</Text>
                        <Text numberOfLines={1} style={styles.tripItems}>
                          {extractItems(trip)}
                        </Text>
                      </View>
                      <Text style={[styles.tripStatus, { color: isCancelled ? tw.red500 : tw.primary }]}>{trip.status || 'Status'}</Text>
                    </View>
                    <View style={styles.badgeRow}>
                      {/* orange-50 / green-50 and orange-600 / #10B981 all resolve to the same pair */}
                      <Text style={styles.badge}>{isQR ? 'COD (QR)' : isCOD ? 'COD' : 'Online'}</Text>
                    </View>
                    <View style={styles.tripGrid}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cellLabel}>Time</Text>
                        <Text style={styles.cellValue}>{trip.time || '--:--'}</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={styles.cellLabel}>COD</Text>
                        <Text style={styles.cellValue}>₹{codAmount(trip).toFixed(2)}</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.cellLabel}>Earning</Text>
                        <Text style={styles.cellValue}>₹{payout.toFixed(2)}</Text>
                      </View>
                    </View>
                  </Press>
                );
              })}
            </View>
          ) : (
            <View style={styles.empty}>
              <Clock size={48} color={tw.gray100} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No Trips Recorded</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Dropdown visible={showDatePicker} style={[styles.dropdown, shadow('card'), { top: dropTop, left: 16, right: 16, maxHeight: 300 }]}>
        <ScrollView>
          {recentDates.map((date, idx) => {
            const on = date.toDateString() === selectedDate.toDateString();
            return (
              <Press
                key={idx}
                scale={1}
                onPress={() => {
                  setSelectedDate(date);
                  setShowDatePicker(false);
                }}
                style={[styles.option, on && { backgroundColor: tw.primarySoft }]}
              >
                <Text style={[styles.optionText, on && styles.optionOn]}>{formatDateDisplay(date)}</Text>
              </Press>
            );
          })}
        </ScrollView>
      </Dropdown>
      <Dropdown visible={showTripTypePicker} style={[styles.dropdown, shadow('card'), { top: dropTop, right: 16, width: 192 }]}>
        {TRIP_TYPES.map((type) => {
          const on = type === selectedTripType;
          return (
            <Press
              key={type}
              scale={1}
              onPress={() => {
                setSelectedTripType(type);
                setShowTripTypePicker(false);
              }}
              style={[styles.option, on && { backgroundColor: tw.primarySoft }]}
            >
              <Text style={[styles.optionText, on && styles.optionOn]}>{type}</Text>
            </Press>
          );
        })}
      </Dropdown>

      <BottomSheet visible={showBonusModal} onClose={() => setShowBonusModal(false)} backdrop="rgba(0,0,0,0.6)" blur={8} spring={{ stiffness: 200, damping: 25 }}>
        <View style={[styles.sheet, shadow('2xl'), { maxHeight: height * 0.85, paddingBottom: 32 + insets.bottom }]}>
          <View style={styles.sheetBar} />
          <View style={styles.sheetHead}>
            <View style={styles.sheetHeadLeft}>
              <View style={styles.sheetIcon}>
                <Gift size={24} color={tw.primary} />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Incentive Records</Text>
                <Text style={styles.sheetSub}>Extra bonuses credited by team</Text>
              </View>
            </View>
            <Press onPress={() => setShowBonusModal(false)} accessibilityLabel="Close" style={{ padding: 8 }}>
              <X size={20} color={tw.gray400} />
            </Press>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 16, paddingRight: 4 }}>
            {bonusLoading ? (
              <View style={{ paddingVertical: 80, alignItems: 'center' }}>
                <Spinner size={32} color={tw.primary} />
              </View>
            ) : bonusTransactions.length > 0 ? (
              bonusTransactions.map((tx, i) => (
                <View key={i} style={[styles.bonus, shadow('card')]}>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.bonusAmount}>₹{Number(tx.amount || 0).toFixed(2)}</Text>
                    <Text numberOfLines={1} style={styles.bonusDesc}>
                      {tx.description || 'Bonus Payout'}
                    </Text>
                    <Text style={styles.bonusDate}>{new Date(tx.createdAt || tx.date).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.delivered}>DELIVERED</Text>
                </View>
              ))
            ) : (
              <View style={styles.empty}>
                <Search size={48} color={tw.gray100} style={{ marginBottom: 16 }} />
                <Text style={[styles.emptyText, { textTransform: 'none', letterSpacing: 0 }]}>Nothing to show</Text>
              </View>
            )}
          </ScrollView>
          <Press onPress={() => setShowBonusModal(false)} accessibilityLabel="Okay, Got it" style={[styles.ok, shadow('card')]}>
            <Text style={styles.okText}>Okay, Got it</Text>
          </Press>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 17.6,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  h1: { fontSize: 20, lineHeight: 28, color: '#fff', textTransform: 'uppercase', ...display(900, 20) },
  sub: { marginTop: 2, fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray500, ...ff(700) },
  gift: { width: 40, height: 40, borderRadius: 12, backgroundColor: tw.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tw.primaryBorder },
  giftBadge: { position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: tw.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  giftBadgeText: { color: '#fff', fontSize: 10, lineHeight: 12, ...ff(700) },
  tabs: { backgroundColor: '#fff', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 32, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  tab: { paddingVertical: 16 },
  tabText: { fontSize: 16, lineHeight: 24, textTransform: 'capitalize', ...ff(500) },
  indicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: tw.primary },
  filters: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', gap: 12 },
  filter: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: tw.gray100, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterText: { fontSize: 14, lineHeight: 20, color: tw.gray800, ...ff(500) },
  content: { paddingHorizontal: 16, paddingVertical: 8, gap: 20 },
  banner: { backgroundColor: '#E9F9F4', borderRadius: 16, padding: 17.6, borderWidth: 1, borderColor: '#E5DDC3', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerLabel: { fontSize: 11, lineHeight: 16.5, color: tw.primary, marginBottom: 4, ...ff(700) },
  bannerValueBox: { minHeight: 28, justifyContent: 'center' },
  // h3 -> Sora
  bannerValue: { fontSize: 20, lineHeight: 28, color: tw.gray950, ...display(700, 20) },
  loading: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  loadingText: { color: tw.gray400, fontSize: 12, lineHeight: 16, ...ff(500) },
  trip: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5DDC3' },
  // mb-2 here and the badge row's mt-3 collapse to 12 px (block siblings)
  tripTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tripId: { fontSize: 16, lineHeight: 24, color: tw.gray950, ...display(700, 16) },
  tripRest: { marginTop: 2, fontSize: 14, lineHeight: 20, color: tw.gray500, ...ff(500) },
  tripItems: { marginTop: 2, fontSize: 12, lineHeight: 16, color: tw.gray400, ...ff(500) },
  tripStatus: { fontSize: 14, lineHeight: 20, ...ff(700) },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16, marginTop: 12 },
  badge: { fontSize: 10, lineHeight: 15, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', backgroundColor: tw.primarySoft, color: tw.primary, ...ff(700) },
  tripGrid: { flexDirection: 'row', gap: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: tw.gray50 },
  cellLabel: { fontSize: 11, lineHeight: 16.5, color: tw.gray400, marginBottom: 4, ...ff(500) },
  cellValue: { fontSize: 14, lineHeight: 20, color: tw.gray950, ...ff(700) },
  empty: { paddingVertical: 80, alignItems: 'center' },
  emptyText: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, textTransform: 'uppercase', color: tw.gray400, ...ff(700) },
  dropdown: { position: 'absolute', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5DDC3', padding: 8 },
  option: { width: '100%', padding: 16, borderRadius: 12 },
  optionText: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...ff(500) },
  optionOn: { color: tw.primary, ...ff(700) },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32 },
  sheetBar: { width: 48, height: 4, backgroundColor: tw.gray100, borderRadius: 999, alignSelf: 'center', marginBottom: 32 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  sheetHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  sheetIcon: { width: 48, height: 48, backgroundColor: tw.primarySoft, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tw.primaryBorder },
  sheetTitle: { fontSize: 18, lineHeight: 28, color: tw.gray950, ...display(700, 18) },
  sheetSub: { fontSize: 12, lineHeight: 16, color: tw.gray400, ...ff(500) },
  bonus: { backgroundColor: tw.gray50, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5DDC3', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bonusAmount: { fontSize: 18, lineHeight: 28, color: tw.gray950, marginBottom: 2, ...ff(700) },
  bonusDesc: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...ff(500) },
  bonusDate: { marginTop: 4, fontSize: 10, lineHeight: 15, color: tw.gray400, ...ff(500) },
  delivered: { backgroundColor: '#DCFCE7', color: tw.primary, fontSize: 10, lineHeight: 15, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', textTransform: 'uppercase', ...ff(700) },
  ok: { width: '100%', paddingVertical: 20, backgroundColor: '#000', borderRadius: 16, marginTop: 32, alignItems: 'center' },
  okText: { color: '#fff', fontSize: 16, lineHeight: 24, ...ff(700) },
});
