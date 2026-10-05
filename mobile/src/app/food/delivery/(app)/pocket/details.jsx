import { useEffect, useMemo, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Package, Receipt, TrendingUp } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import WeekSelector from '../../../../../components/delivery/WeekSelector';
import { SoraMoney } from '../../../../../components/kit';
import Skeleton from '../../../../../components/Skeleton';
import { Spinner } from '../../../../../components/Loader';
import { Press } from '../../../../../components/ui';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { formatCurrency } from '../../../../../lib/format';
import { useAnimatedValue } from '../../../../../lib/useAnimatedValue';
import { display, ff, shadow, tw } from '../../../../../theme';

// Web: pages/pocket/PocketDetailsV2.jsx. `font-poppins` -> Nunito; rounded-2xl/3xl -> #E5DDC3 + card shadow.

const toLocalDateKey = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const initialWeek = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

function FadeIn({ delay, children }) {
  const a = useAnimatedValue(0);
  useEffect(() => {
    Animated.spring(a, { toValue: 1, delay, stiffness: 100, damping: 10, useNativeDriver: true }).start();
  }, [a, delay]);
  return <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>{children}</Animated.View>;
}

export default function PocketDetailsV2() {
  const goBack = useDeliveryBackNavigation();
  const insets = useSafeAreaInsets();
  const [weekRange, setWeekRange] = useState(initialWeek);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [summaryData, setSummaryData] = useState({ totalEarning: 0, totalBonus: 0, grandTotal: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await deliveryAPI.getPocketDetails({ date: toLocalDateKey(weekRange.start), limit: 2000 });
        const payload = response?.data?.data || {};
        const trips = payload?.trips || payload?.orders || [];
        const s = payload?.summary || {};
        setOrders(Array.isArray(trips) ? trips : []);
        setPayments(Array.isArray(payload?.transactions?.payment) ? payload.transactions.payment : []);
        setBonuses(Array.isArray(payload?.transactions?.bonus) ? payload.transactions.bonus : []);
        setSummaryData({ totalEarning: Number(s.totalEarning) || 0, totalBonus: Number(s.totalBonus) || 0, grandTotal: Number(s.grandTotal) || 0 });
      } catch {
        setOrders([]);
        setPayments([]);
        setBonuses([]);
        setSummaryData({ totalEarning: 0, totalBonus: 0, grandTotal: 0 });
      } finally {
        setLoading(false);
      }
    })();
  }, [weekRange]);

  const summary = useMemo(() => {
    const e = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const b = bonuses.reduce((s, x) => s + (x.amount || 0), 0);
    const totalEarning = summaryData.totalEarning || e;
    const totalBonus = summaryData.totalBonus || b;
    return { totalEarning, totalBonus, grandTotal: summaryData.grandTotal || totalEarning + totalBonus };
  }, [payments, bonuses, summaryData]);

  const earningFor = (oid) => {
    const p = payments.find((x) => (x.orderId || x.metadata?.orderId) === oid);
    if (p) return p.amount || 0;
    const o = orders.find((x) => (x.orderId || x._id || x.id) === oid);
    return o?.deliveryEarning || o?.earningAmount || o?.amount || 0;
  };
  const bonusFor = (oid) => {
    const b = bonuses.find((x) => (x.orderId || x.metadata?.orderId) === oid);
    return b ? b.amount : 0;
  };

  return (
    <ScrollView style={styles.page} stickyHeaderIndices={[0]} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={[styles.header, { paddingTop: 20 + insets.top }]}>
        <View style={styles.headerLeft}>
          <Press onPress={goBack} scale={0.9} accessibilityLabel="Back" style={styles.back}>
            <ArrowLeft size={20} color={tw.gray900} />
          </Press>
          <View>
            <Text style={styles.h1}>Pocket Details</Text>
            <Text style={styles.sub}>Trips & Earnings History</Text>
          </View>
        </View>
        <View style={styles.receipt}>
          <Receipt size={20} color={tw.primary} />
        </View>
      </View>

      <View style={styles.body}>
        <View style={[styles.weekBox, shadow('card')]}>
          <WeekSelector onChange={setWeekRange} weekStartsOn={1} />
        </View>

        <View style={[styles.summary, shadow('card')]}>
          {/* The web's blur-2xl blob is effectively invisible; RN's blur filter has no iOS support, so it is left out. */}
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.kicker}>Total Payout</Text>
              <View style={{ minHeight: 40, justifyContent: 'center' }}>
                {loading ? <Skeleton style={{ height: 36, width: 144 }} /> : <SoraMoney style={styles.total}>{formatCurrency(summary.grandTotal)}</SoraMoney>}
              </View>
            </View>
            <View style={[styles.trend, shadow('card')]}>
              <TrendingUp size={24} color={tw.primary} />
            </View>
          </View>
          <View style={styles.grid}>
            <View style={[styles.mini, shadow('card')]}>
              <Text style={styles.miniLabel}>Trip Earnings</Text>
              <View style={{ minHeight: 28 }}>
                {loading ? <Skeleton style={{ height: 20, width: 80 }} /> : <SoraMoney style={styles.miniValue}>{formatCurrency(summary.totalEarning)}</SoraMoney>}
              </View>
            </View>
            <View style={[styles.mini, shadow('card')]}>
              <Text style={styles.miniLabel}>Weekly Bonus</Text>
              <View style={{ minHeight: 24 }}>
                {loading ? (
                  <Skeleton style={{ height: 20, width: 80 }} />
                ) : (
                  <SoraMoney style={[styles.miniValue, { color: tw.primary }]}>{`+${formatCurrency(summary.totalBonus)}`}</SoraMoney>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <View style={styles.listHead}>
            <Text style={styles.listTitle}>Trips History</Text>
            <Text style={styles.count}>{orders.length} Orders</Text>
          </View>
          {loading ? (
            <View style={{ paddingVertical: 80, alignItems: 'center' }}>
              <Spinner size={40} color={tw.primary} />
              <Text style={styles.syncing}>Syncing History...</Text>
            </View>
          ) : orders.length > 0 ? (
            <View style={{ gap: 12 }}>
              {orders.map((order, idx) => {
                const oid = order.orderId || order._id || order.id;
                const earning = earningFor(oid);
                const bonus = bonusFor(oid);
                const cod = order.paymentMethod?.toLowerCase() === 'cod';
                return (
                  <FadeIn key={oid} delay={idx * 50}>
                    <Press scale={0.98} accessibilityLabel={`Order ${oid}`} style={[styles.order, shadow('card')]}>
                      <View style={styles.orderLeft}>
                        <View style={[styles.pkg, shadow('card')]}>
                          <Package size={24} color={tw.gray900} />
                        </View>
                        <View style={{ flexShrink: 1 }}>
                          <View style={styles.orderIdRow}>
                            <Text style={styles.orderId}>#{oid.toString().slice(-6)}</Text>
                            <Text style={styles.orderDate}>• {new Date(order.deliveredAt || order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
                          </View>
                          <Text numberOfLines={1} style={styles.rest}>
                            {order.restaurantName || order.restaurantId?.name || 'Premium Restaurant'}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <SoraMoney style={styles.orderTotal}>{formatCurrency(earning + bonus)}</SoraMoney>
                        <View style={styles.chips}>
                          {bonus > 0 ? <Text style={styles.bp}>+{formatCurrency(bonus)} BP</Text> : null}
                          <Text style={[styles.method, cod ? styles.methodCod : styles.methodOnline]}>{order.paymentMethod || 'Online'}</Text>
                        </View>
                      </View>
                    </Press>
                  </FadeIn>
                );
              })}
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, shadow('card')]}>
                <Package size={32} color={tw.gray200} />
              </View>
              <Text style={styles.emptyTitle}>No Trips Found</Text>
              <Text style={styles.emptyText}>Check another week Range</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tw.gray50 },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray100, paddingHorizontal: 17.6, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.gray50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tw.gray100 },
  h1: { fontSize: 20, lineHeight: 28, color: tw.gray950, textTransform: 'uppercase', ...display(900, 20) },
  sub: { marginTop: 2, fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, ...ff(700) },
  receipt: { width: 40, height: 40, borderRadius: 12, backgroundColor: tw.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tw.primaryBorder },
  body: { paddingHorizontal: 20, paddingVertical: 24, gap: 24 },
  weekBox: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5DDC3' },
  summary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5DDC3', borderRadius: 24, padding: 17.6, overflow: 'hidden' },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  kicker: { fontSize: 10, lineHeight: 15, letterSpacing: 2, textTransform: 'uppercase', color: tw.gray400, marginBottom: 4, ...ff(700) },
  total: { fontSize: 36, lineHeight: 40, color: tw.gray950, ...display(900, 36) },
  trend: { width: 48, height: 48, backgroundColor: tw.gray100, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5DDC3' },
  grid: { flexDirection: 'row', gap: 16 },
  mini: { flex: 1, backgroundColor: tw.gray50, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5DDC3' },
  miniLabel: { fontSize: 9, lineHeight: 13.5, letterSpacing: 0.9, textTransform: 'uppercase', color: tw.gray400, marginBottom: 4, ...ff(700) },
  miniValue: { fontSize: 18, lineHeight: 28, color: tw.gray950, ...display(900, 18) },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  listTitle: { fontSize: 12, lineHeight: 16, color: tw.gray950, textTransform: 'uppercase', ...display(900, 12) },
  count: { backgroundColor: tw.gray200, color: tw.gray600, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', fontSize: 10, lineHeight: 15, ...ff(700) },
  syncing: { marginTop: 16, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', color: tw.gray400, ...ff(700) },
  order: { backgroundColor: '#fff', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#E5DDC3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flexShrink: 1 },
  pkg: { width: 48, height: 48, backgroundColor: tw.gray50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5DDC3' },
  orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  orderId: { fontSize: 14, lineHeight: 20, color: tw.gray950, textTransform: 'uppercase', ...display(900, 14) },
  orderDate: { fontSize: 9, lineHeight: 13.5, letterSpacing: 0.9, textTransform: 'uppercase', color: tw.gray400, ...ff(700) },
  rest: { maxWidth: 140, fontSize: 10, lineHeight: 15, letterSpacing: -0.25, textTransform: 'uppercase', color: tw.gray500, ...ff(700) },
  orderTotal: { fontSize: 16, lineHeight: 16, color: tw.gray950, marginBottom: 4, ...display(900, 16) },
  chips: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  bp: { fontSize: 9, lineHeight: 13.5, textTransform: 'uppercase', color: tw.primary, ...ff(700) },
  method: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden', fontSize: 8, lineHeight: 12, textTransform: 'uppercase', borderWidth: 1, ...display(900, 8) },
  methodCod: { backgroundColor: tw.amber50, color: tw.amber600, borderColor: tw.amber100 },
  methodOnline: { backgroundColor: tw.primarySoft, color: tw.primary, borderColor: tw.primaryBorder },
  empty: { paddingVertical: 80, alignItems: 'center', backgroundColor: '#fff', borderRadius: 32, borderWidth: 2, borderStyle: 'dashed', borderColor: tw.gray100 },
  emptyIcon: { width: 64, height: 64, backgroundColor: tw.gray50, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, lineHeight: 28, color: tw.gray950, textTransform: 'uppercase', ...display(900, 18) },
  emptyText: { marginTop: 4, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', color: tw.gray400, ...ff(700) },
});
