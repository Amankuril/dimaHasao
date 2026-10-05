import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CheckCircle, Clock } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import PlainHeader from '../../../../../components/delivery/PlainHeader';
import WeekSelector from '../../../../../components/delivery/WeekSelector';
import Skeleton from '../../../../../components/Skeleton';
import { Spinner } from '../../../../../components/Loader';
import { Press } from '../../../../../components/ui';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../lib/notify';
import { ff, shadow, tw } from '../../../../../theme';

// Web: pages/pocket/PocketStatementV2.jsx. `font-poppins` -> Nunito; #ff8100 / emerald-500/600 -> primary.

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

const earningOf = (trip) => trip.deliveryEarning || trip.deliveryPayout || trip.payout || trip.estimatedEarnings?.totalEarning || 0;
// bg-green-500 and bg-orange-500 -> #E8F2EC (substring rule), bg-blue-500 -> primary
const DOTS = [tw.primarySoft, tw.primarySoft, tw.primary];

export default function PocketStatementV2() {
  const goBack = useDeliveryBackNavigation();
  const [weekRange, setWeekRange] = useState(initialWeek);
  const [orders, setOrders] = useState([]);
  const [bonusTransactions, setBonusTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [tripRes, walletRes] = await Promise.all([
          deliveryAPI.getTripHistory({ period: 'weekly', date: toLocalDateKey(weekRange.start), status: 'Completed', limit: 1000 }),
          deliveryAPI.getWalletTransactions({ type: 'bonus', limit: 1000 }),
        ]);
        setOrders(tripRes?.data?.data?.trips || []);
        setBonusTransactions(walletRes?.data?.data?.transactions || []);
      } catch {
        toast.error('Error loading pocket statement');
      } finally {
        setLoading(false);
      }
    })();
  }, [weekRange]);

  const summary = useMemo(() => {
    let totalEarning = 0;
    let totalBonus = 0;
    orders.forEach((trip) => {
      totalEarning += earningOf(trip);
    });
    bonusTransactions.forEach((b) => {
      const base = b.date || b.createdAt;
      if (!base) return;
      const d = new Date(base);
      if (d >= weekRange.start && d <= weekRange.end) totalBonus += b.amount || 0;
    });
    return { totalEarning, totalBonus, grandTotal: totalEarning + totalBonus };
  }, [orders, bonusTransactions, weekRange]);

  const amountsFor = (trip) => {
    const earning = earningOf(trip);
    const orderId = trip.orderId || trip.id || trip._id;
    const bonus = bonusTransactions.filter((b) => b.orderId === orderId).reduce((s, b) => s + (b.amount || 0), 0);
    return { earning, bonus, total: earning + bonus };
  };

  return (
    <View style={styles.page}>
      <PlainHeader title="Pocket statement" size={20} leadingNone onBack={goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <WeekSelector onChange={setWeekRange} weekStartsOn={1} />

        <View style={[styles.summary, shadow('sm')]}>
          <View style={styles.summaryHead}>
            <CheckCircle size={16} color={tw.primary} />
            <Text style={styles.summaryTitle}>Pocket summary</Text>
          </View>
          <View style={styles.grid}>
            {[
              ['Orders', summary.totalEarning, 'flex-start', '#000'],
              ['Bonus', summary.totalBonus, 'center', '#000'],
              ['Total', summary.grandTotal, 'flex-end', tw.primary],
            ].map(([label, value, align, color]) => (
              <View key={label} style={[styles.cell, { alignItems: align }]}>
                <Text style={styles.cellLabel}>{label}</Text>
                <View style={{ minHeight: 20 }}>
                  {loading ? <Skeleton style={{ height: 16, width: 56 }} /> : <Text style={[styles.cellValue, { color }]}>₹{value.toFixed(0)}</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <Spinner size={32} color={tw.primary} />
            <Text style={styles.loadingText}>Loading Statement...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={[styles.empty, shadow('sm')]}>
            <Clock size={40} color={tw.gray200} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No transactions</Text>
            <Text style={styles.emptyText}>Koi transaction nahi mili is hafta k liye.</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {orders.map((trip, index) => {
              const a = amountsFor(trip);
              const createdAt = trip.deliveredAt || trip.completedAt || trip.createdAt || trip.orderTime;
              const dateText = createdAt
                ? new Date(createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                : 'N/A';
              const orderId = trip.orderId || trip.id || trip._id;
              return (
                <Press key={orderId || index} scale={0.98} accessibilityLabel={`Order ${orderId}`} style={[styles.order, shadow('sm')]}>
                  <View style={styles.orderLeft}>
                    <View style={[styles.dot, { backgroundColor: DOTS[index % 3] }]} />
                    <View style={{ flexShrink: 1 }}>
                      <Text style={styles.orderId}>Order #{orderId?.slice(-6) || '...'}</Text>
                      <Text style={styles.orderDate}>{dateText}</Text>
                      {/* `italic` renders upright on the web (no italic face loaded) */}
                      {trip.restaurantName ? <Text style={styles.orderRest}>{trip.restaurantName}</Text> : null}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ marginBottom: 8, alignItems: 'flex-end' }}>
                      <Text style={styles.small}>Earning</Text>
                      <Text style={styles.value}>₹{a.earning}</Text>
                    </View>
                    {a.bonus > 0 ? (
                      <View style={{ marginBottom: 8, alignItems: 'flex-end' }}>
                        <Text style={[styles.small, { color: tw.primary }]}>Bonus</Text>
                        <Text style={[styles.value, { color: tw.primary }]}>+ ₹{a.bonus}</Text>
                      </View>
                    ) : null}
                    <View style={styles.total}>
                      <Text style={[styles.small, { color: tw.gray800 }]}>Total</Text>
                      <Text style={styles.totalValue}>₹{a.total}</Text>
                    </View>
                  </View>
                </Press>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FAF6ED' },
  body: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 128 + 24 },
  summary: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: tw.gray100, padding: 20, marginTop: 16, marginBottom: 24 },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  summaryTitle: { fontSize: 14, lineHeight: 20, color: tw.gray800, letterSpacing: -0.35, textTransform: 'uppercase', ...ff(700) },
  grid: { flexDirection: 'row', gap: 16 },
  cell: { flex: 1 },
  cellLabel: { fontSize: 10, lineHeight: 15, color: tw.gray400, textTransform: 'uppercase', marginBottom: 4, ...ff(700) },
  cellValue: { fontSize: 16, lineHeight: 16, ...ff(700) },
  loading: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  loadingText: { color: tw.gray400, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', ...ff(700) },
  empty: { backgroundColor: '#fff', borderRadius: 12, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: tw.gray100 },
  emptyTitle: { color: tw.gray900, fontSize: 18, lineHeight: 28, marginBottom: 4, ...ff(700) },
  emptyText: { color: tw.gray400, fontSize: 14, lineHeight: 20, textAlign: 'center', ...ff(500) },
  order: { backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: tw.gray100, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  orderLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  orderId: { color: tw.gray900, fontSize: 14, lineHeight: 20, marginBottom: 2, ...ff(700) },
  orderDate: { color: tw.gray400, fontSize: 11, lineHeight: 16.5, marginBottom: 4, letterSpacing: -0.275, textTransform: 'uppercase', ...ff(700) },
  orderRest: { color: tw.gray500, fontSize: 12, lineHeight: 16, ...ff(500) },
  small: { fontSize: 10, lineHeight: 15, color: tw.gray400, textTransform: 'uppercase', ...ff(700) },
  value: { fontSize: 14, lineHeight: 20, color: '#000', ...ff(700) },
  total: { paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray50, alignItems: 'flex-end' },
  totalValue: { fontSize: 16, lineHeight: 24, color: tw.primary, ...ff(700) },
});
