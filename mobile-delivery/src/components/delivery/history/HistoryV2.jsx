import { useEffect, useMemo, useState } from 'react';
import { Animated, FlatList, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banknote, Calendar, Check, ChevronDown, Clock, CreditCard, Gift, QrCode, Search, Wallet, X } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../api/delivery';
import useDeliveryBackNavigation from '../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../lib/notify';
import { localStore } from '../../../lib/storage';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { BottomSheet, SoraMoney } from '../../kit';
import Skeleton from '../../Skeleton';
import { Spinner } from '../../Loader';
import { Press } from '../../ui';
import { Button, Card, EmptyState, IconButton, ScreenHeader, StatusBadge } from '../../ds';
import { color, elevation, radii, space, touch, type } from '../../../theme';

/*
 * Trip History tab: period switch, date + trip-type filters, COD / earnings
 * summary and the trip list. Port of pages/HistoryV2.jsx on the design tokens.
 */

const HISTORY_PREFS_KEY = 'delivery_trip_history_prefs_v1';
const TABS = ['daily', 'weekly', 'monthly'];
const TRIP_TYPES = ['ALL TRIPS', 'Completed', 'Cancelled', 'Pending'];
const TAB_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
// 'ALL TRIPS' stays the stored/compared value; it is only displayed in sentence case.
const tripTypeLabel = (t) => (t === 'ALL TRIPS' ? 'All trips' : t);
// Backend trip DTO status is Completed / Cancelled / Pending.
const STATUS_TONE = { completed: 'success', cancelled: 'danger', pending: 'warning' };

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
  const [topHeight, setTopHeight] = useState(0);

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

  // Dropdowns hang just under the filter row, measured rather than hard-coded.
  const dropTop = topHeight + space.xs;

  const renderTrip = ({ item: trip }) => {
    const status = (trip.status || '').toLowerCase();
    const isCompleted = status === 'completed';
    const payout = Number(trip.deliveryEarning ?? trip.amount ?? trip.earningAmount ?? 0) || 0;
    const method = (trip.paymentMethod || '').toLowerCase();
    const isQR = method === 'razorpay_qr';
    const isCOD = method === 'cash' || method === 'cod';
    const PayIcon = isQR ? QrCode : isCOD ? Banknote : CreditCard;
    const restaurant = trip.restaurant || trip.restaurantName || 'Restaurant';
    const credited = isCompleted && payout > 0;
    return (
      <Card accessibilityLabel={`Trip ${trip.orderId || ''}`}>
        <View style={styles.tripTop}>
          <View style={styles.tripMain}>
            <Text style={styles.tripId} numberOfLines={1}>
              {trip.orderId || 'Order'}
            </Text>
            <Text style={styles.tripRest} numberOfLines={2}>
              {restaurant}
            </Text>
            <Text numberOfLines={1} style={styles.tripItems}>
              {extractItems(trip)}
            </Text>
          </View>
          <StatusBadge label={trip.status || 'Status'} tone={STATUS_TONE[status] || 'neutral'} />
        </View>
        <View style={styles.badgeRow}>
          <StatusBadge label={isQR ? 'COD (QR)' : isCOD ? 'COD' : 'Online'} tone="neutral" icon={PayIcon} />
        </View>
        <View style={styles.tripGrid}>
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>Time</Text>
            <Text style={styles.cellValue}>{trip.time || '--:--'}</Text>
          </View>
          <View style={[styles.cell, { alignItems: 'center' }]}>
            <Text style={styles.cellLabel}>COD</Text>
            <SoraMoney style={styles.cellMoney} numberOfLines={1}>{`₹${codAmount(trip).toFixed(2)}`}</SoraMoney>
          </View>
          <View style={[styles.cell, { alignItems: 'flex-end' }]}>
            <Text style={styles.cellLabel}>Earning</Text>
            <SoraMoney style={[styles.cellMoney, credited && { color: color.success }]} numberOfLines={1}>{`${credited ? '+' : ''}₹${payout.toFixed(2)}`}</SoraMoney>
          </View>
        </View>
      </Card>
    );
  };

  const summary = (
    <Card style={styles.summary}>
      <View style={styles.stat}>
        <View style={styles.statHead}>
          <Banknote size={16} color={color.textMuted} />
          <Text style={styles.statLabel}>COD collected</Text>
        </View>
        <View style={styles.statValueBox}>
          {loading ? <Skeleton style={{ height: 28, width: 96 }} /> : <SoraMoney style={styles.statValue} numberOfLines={1}>{`₹${metrics.cod.toFixed(2)}`}</SoraMoney>}
        </View>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.stat}>
        <View style={styles.statHead}>
          <Wallet size={16} color={color.textMuted} />
          <Text style={styles.statLabel}>Earnings</Text>
        </View>
        <View style={styles.statValueBox}>
          {loading ? <Skeleton style={{ height: 28, width: 96 }} /> : <SoraMoney style={[styles.statValue, { color: color.success }]} numberOfLines={1}>{`₹${metrics.earnings.toFixed(2)}`}</SoraMoney>}
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.page}>
      <View style={styles.top} onLayout={(e) => setTopHeight(e.nativeEvent.layout.height)}>
        <ScreenHeader
          title="Trip history"
          subtitle="Your delivery milestones"
          onBack={goBack}
          border={false}
          right={
            <IconButton icon={Gift} label="Incentive records" variant="primary" iconColor={color.primary} onPress={() => setShowBonusModal(true)}>
              {bonusTransactions.length > 0 ? (
                <View style={styles.giftBadge}>
                  <Text style={styles.giftBadgeText}>{bonusTransactions.length}</Text>
                </View>
              ) : null}
            </IconButton>
          }
        />

        <View style={styles.controls}>
          <View style={styles.segment} accessibilityRole="tablist">
            {TABS.map((tab) => {
              const on = activeTab === tab;
              return (
                <Press
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  scale={1}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={TAB_LABELS[tab]}
                  style={[styles.segmentBtn, on && styles.segmentBtnOn]}
                >
                  <Text style={[styles.segmentText, { color: on ? color.text : color.textSecondary }]}>{TAB_LABELS[tab]}</Text>
                </Press>
              );
            })}
          </View>

          <View style={styles.filters}>
            <Press
              onPress={() => {
                setShowDatePicker(!showDatePicker);
                setShowTripTypePicker(false);
              }}
              scale={1}
              accessibilityLabel={`Choose date, ${formatDateDisplay(selectedDate)}`}
              accessibilityState={{ expanded: showDatePicker }}
              style={[styles.filter, styles.filterDate, showDatePicker && styles.filterOpen]}
            >
              <Calendar size={18} color={color.textSecondary} />
              <Text style={styles.filterText} numberOfLines={1}>
                {formatDateDisplay(selectedDate)}
              </Text>
              <ChevronDown size={18} color={color.textSecondary} style={showDatePicker ? { transform: [{ rotate: '180deg' }] } : undefined} />
            </Press>
            <Press
              onPress={() => {
                setShowTripTypePicker(!showTripTypePicker);
                setShowDatePicker(false);
              }}
              scale={1}
              accessibilityLabel={`Choose trip type, ${tripTypeLabel(selectedTripType)}`}
              accessibilityState={{ expanded: showTripTypePicker }}
              style={[styles.filter, styles.filterType, showTripTypePicker && styles.filterOpen]}
            >
              <Text style={styles.filterText} numberOfLines={1}>
                {tripTypeLabel(selectedTripType)}
              </Text>
              <ChevronDown size={18} color={color.textSecondary} style={showTripTypePicker ? { transform: [{ rotate: '180deg' }] } : undefined} />
            </Press>
          </View>
        </View>
      </View>

      <FlatList
        data={loading ? [] : trips}
        keyExtractor={(trip, idx) => String(trip.orderId || idx)}
        renderItem={renderTrip}
        ListHeaderComponent={summary}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <Spinner size={32} color={color.primary} />
              <Text style={styles.loadingText}>Fetching trips...</Text>
            </View>
          ) : (
            <Card>
              <EmptyState icon={Clock} title="No trips recorded" message="Trips for the selected date and type will show up here." style={styles.empty} />
            </Card>
          )
        }
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={7}
      />

      <Dropdown visible={showDatePicker} style={[styles.dropdown, { top: dropTop, left: space.lg, right: space.lg, maxHeight: 320 }]}>
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
                accessibilityState={{ selected: on }}
                style={[styles.option, on && styles.optionSelected]}
              >
                <Text style={[styles.optionText, on && styles.optionOn]}>{formatDateDisplay(date)}</Text>
                {on ? <Check size={18} color={color.primary} /> : null}
              </Press>
            );
          })}
        </ScrollView>
      </Dropdown>
      <Dropdown visible={showTripTypePicker} style={[styles.dropdown, { top: dropTop, right: space.lg, width: 200 }]}>
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
              accessibilityState={{ selected: on }}
              style={[styles.option, on && styles.optionSelected]}
            >
              <Text style={[styles.optionText, on && styles.optionOn]}>{tripTypeLabel(type)}</Text>
              {on ? <Check size={18} color={color.primary} /> : null}
            </Press>
          );
        })}
      </Dropdown>

      <BottomSheet visible={showBonusModal} onClose={() => setShowBonusModal(false)} backdrop="rgba(0,0,0,0.6)" blur={8} spring={{ stiffness: 200, damping: 25 }}>
        <View style={[styles.sheet, { maxHeight: height * 0.85, paddingBottom: space.lg + insets.bottom }]}>
          <View style={styles.sheetBar} />
          <View style={styles.sheetHead}>
            <View style={styles.sheetIcon}>
              <Gift size={22} color={color.primary} />
            </View>
            <View style={styles.sheetHeadText}>
              <Text style={styles.sheetTitle} accessibilityRole="header">
                Incentive records
              </Text>
              <Text style={styles.sheetSub}>Extra bonuses credited by team</Text>
            </View>
            <IconButton icon={X} label="Close" variant="soft" onPress={() => setShowBonusModal(false)} />
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: space.md }}>
            {bonusLoading ? (
              <View style={styles.loading}>
                <Spinner size={32} color={color.primary} />
              </View>
            ) : bonusTransactions.length > 0 ? (
              bonusTransactions.map((tx, i) => (
                <View key={i} style={styles.bonus}>
                  <View style={styles.bonusMain}>
                    <Text numberOfLines={2} style={styles.bonusDesc}>
                      {tx.description || 'Bonus Payout'}
                    </Text>
                    <Text style={styles.bonusDate}>{new Date(tx.createdAt || tx.date).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.bonusRight}>
                    <SoraMoney style={styles.bonusAmount} numberOfLines={1}>{`+₹${Number(tx.amount || 0).toFixed(2)}`}</SoraMoney>
                    <StatusBadge label="Credited" tone="success" />
                  </View>
                </View>
              ))
            ) : (
              <EmptyState icon={Search} title="Nothing to show" message="Bonuses credited to you will be listed here." />
            )}
          </ScrollView>
          <Button title="Okay, got it" size="lg" onPress={() => setShowBonusModal(false)} accessibilityLabel="Okay, Got it" style={{ marginTop: space.lg }} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  top: { backgroundColor: color.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.borderStrong, zIndex: 1 },
  giftBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 20,
    height: 20,
    paddingHorizontal: space.xs,
    borderRadius: radii.pill,
    backgroundColor: color.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: color.surface,
  },
  giftBadgeText: { ...type.caption, lineHeight: 14, color: color.onPrimary, fontFamily: 'NunitoSans_800ExtraBold' },
  controls: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.md },
  segment: { flexDirection: 'row', gap: space.xs, padding: space.xs, borderRadius: radii.md, backgroundColor: color.surfaceMuted },
  segmentBtn: { flex: 1, minHeight: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  segmentBtnOn: { backgroundColor: color.surface, ...elevation.card },
  segmentText: { ...type.buttonSm },
  filters: { flexDirection: 'row', gap: space.md },
  filter: {
    minHeight: touch,
    paddingHorizontal: space.md,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  filterDate: { flex: 1.4, minWidth: 0 },
  filterType: { flex: 1, minWidth: 0 },
  filterOpen: { borderColor: color.primary },
  filterText: { ...type.bodyStrong, color: color.text, flex: 1, minWidth: 0 },
  list: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  summary: { flexDirection: 'row', alignItems: 'stretch', marginBottom: space.xs },
  stat: { flex: 1, minWidth: 0, gap: space.xs },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  statLabel: { ...type.label, color: color.textSecondary },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: color.borderStrong, marginHorizontal: space.lg },
  statValueBox: { minHeight: 30, justifyContent: 'center' },
  statValue: { ...type.metric, color: color.text },
  empty: { paddingVertical: space.xxl, paddingHorizontal: space.sm },
  loading: { paddingVertical: space.xxxl * 2, alignItems: 'center', gap: space.md },
  loadingText: { ...type.small, color: color.textMuted },
  tripTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.md },
  tripMain: { flex: 1, minWidth: 0, gap: space.xxs },
  tripId: { ...type.subheading, color: color.text },
  tripRest: { ...type.body, color: color.textSecondary },
  tripItems: { ...type.small, color: color.textMuted },
  badgeRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md, marginBottom: space.md },
  tripGrid: { flexDirection: 'row', gap: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  cell: { flex: 1, minWidth: 0, gap: space.xxs },
  cellLabel: { ...type.caption, color: color.textMuted },
  cellValue: { ...type.bodyStrong, color: color.text },
  cellMoney: { ...type.bodyStrong, fontFamily: 'Sora_700Bold', color: color.text },
  dropdown: { position: 'absolute', backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: color.borderStrong, padding: space.sm, ...elevation.float },
  option: { minHeight: touch, paddingHorizontal: space.md, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  optionSelected: { backgroundColor: color.primarySoft },
  optionText: { ...type.body, color: color.text, flexShrink: 1 },
  optionOn: { ...type.bodyStrong, color: color.primary },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: space.lg, paddingTop: space.md, ...elevation.sheet },
  sheetBar: { width: 40, height: 4, backgroundColor: color.borderStrong, borderRadius: radii.pill, alignSelf: 'center', marginBottom: space.lg },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  sheetHeadText: { flex: 1, minWidth: 0 },
  sheetIcon: { width: 44, height: 44, backgroundColor: color.primarySoft, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { ...type.heading, color: color.text },
  sheetSub: { ...type.small, color: color.textMuted },
  bonus: { backgroundColor: color.surface, borderRadius: radii.lg, padding: space.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: color.border, flexDirection: 'row', alignItems: 'center', gap: space.md, ...elevation.card },
  bonusMain: { flex: 1, minWidth: 0, gap: space.xxs },
  bonusRight: { alignItems: 'flex-end', gap: space.xs },
  bonusAmount: { ...type.money, color: color.success },
  bonusDesc: { ...type.bodyStrong, color: color.text },
  bonusDate: { ...type.caption, color: color.textMuted },
});
