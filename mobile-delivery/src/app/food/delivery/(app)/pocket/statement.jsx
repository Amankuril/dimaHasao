import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, Clock } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { Card, EmptyState, Money, ScreenHeader, formatINR } from '../../../../../components/ds';
import WeekSelector from '../../../../../components/delivery/WeekSelector';
import Skeleton from '../../../../../components/Skeleton';
import { Spinner } from '../../../../../components/Loader';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../lib/notify';
import { color, radii, space, type } from '../../../../../theme';

// Web: pages/pocket/PocketStatementV2.jsx. Styled per DESIGN_SYSTEM.md.

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

  const insets = useSafeAreaInsets();
  const whole = (n) => formatINR(n, { decimals: 0 });

  const header = (
    <View style={styles.headerBlock}>
      <WeekSelector onChange={setWeekRange} weekStartsOn={1} style={{ paddingVertical: space.xs }} />

      <Card>
        <View style={styles.summaryHead}>
          <CheckCircle size={18} color={color.primary} />
          <Text style={[type.subheading, { color: color.text }]} accessibilityRole="header">
            Pocket summary
          </Text>
        </View>
        <Text style={[type.label, { color: color.textSecondary }]}>Total</Text>
        <View style={styles.totalBox}>
          {loading ? <Skeleton style={{ height: 28, width: 120 }} /> : <Money value={whole(summary.grandTotal)} style={[type.metric, { color: color.primary }]} />}
        </View>
        <View style={styles.grid}>
          {[
            ['Orders', summary.totalEarning, ''],
            ['Bonus', summary.totalBonus, '+'],
          ].map(([label, value, sign]) => (
            <View key={label} style={styles.cell}>
              <Text style={[type.label, { color: color.textSecondary }]}>{label}</Text>
              <View style={{ minHeight: 24, justifyContent: 'center' }}>
                {loading ? (
                  <Skeleton style={{ height: 16, width: 56 }} />
                ) : (
                  <Money value={`${sign}${whole(value)}`} style={[styles.cellValue, sign && { color: color.success }]} />
                )}
              </View>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );

  return (
    <View style={styles.page}>
      <ScreenHeader title="Pocket statement" onBack={goBack} />
      <FlatList
        data={loading ? [] : orders}
        keyExtractor={(trip, index) => String(trip.orderId || trip.id || trip._id || index)}
        contentContainerStyle={[styles.body, { paddingBottom: space.xxxl + insets.bottom }]}
        ListHeaderComponent={header}
        initialNumToRender={12}
        windowSize={7}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <Spinner size={32} color={color.primary} />
              <Text style={[type.small, { color: color.textMuted }]}>Loading statement…</Text>
            </View>
          ) : (
            <Card>
              <EmptyState icon={Clock} title="No transactions" message="Koi transaction nahi mili is hafta k liye." />
            </Card>
          )
        }
        renderItem={({ item: trip }) => {
          const a = amountsFor(trip);
          const createdAt = trip.deliveredAt || trip.completedAt || trip.createdAt || trip.orderTime;
          const dateText = createdAt
            ? new Date(createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
            : 'N/A';
          const orderId = trip.orderId || trip.id || trip._id;
          return (
            <Card style={styles.order} accessibilityLabel={`Order ${orderId}`}>
              <View style={styles.orderText}>
                <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={1}>
                  Order #{orderId?.slice(-6) || '...'}
                </Text>
                <Text style={[type.caption, { color: color.textMuted }]}>{dateText}</Text>
                {trip.restaurantName ? (
                  <Text style={[type.small, { color: color.textSecondary }]} numberOfLines={2}>
                    {trip.restaurantName}
                  </Text>
                ) : null}
              </View>
              <View style={styles.amounts}>
                <View style={styles.amountRow}>
                  <Text style={[type.caption, { color: color.textMuted }]}>Earning</Text>
                  <Money value={formatINR(a.earning)} style={styles.value} />
                </View>
                {a.bonus > 0 ? (
                  <View style={styles.amountRow}>
                    <Text style={[type.caption, { color: color.success }]}>Bonus</Text>
                    <Money value={`+${formatINR(a.bonus)}`} style={[styles.value, { color: color.success }]} />
                  </View>
                ) : null}
                <View style={[styles.amountRow, styles.totalRow]}>
                  <Text style={[type.label, { color: color.text }]}>Total</Text>
                  <Money value={formatINR(a.total)} style={styles.totalValue} />
                </View>
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, gap: space.md },
  headerBlock: { gap: space.md, marginBottom: space.xs },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  totalBox: { minHeight: 32, justifyContent: 'center', marginBottom: space.md },
  grid: { flexDirection: 'row', gap: space.md },
  cell: { flex: 1, minWidth: 0, backgroundColor: color.surfaceMuted, borderRadius: radii.md, padding: space.md, gap: space.xxs },
  cellValue: { ...type.money, fontSize: 16, lineHeight: 22 },
  loading: { paddingVertical: space.xxxl + space.lg, alignItems: 'center', gap: space.md },
  // Wraps: when the amounts need the room, they move below the order info.
  order: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', columnGap: space.md, rowGap: space.md },
  orderText: { flexGrow: 1, flexShrink: 1, flexBasis: 130, minWidth: 0, gap: space.xxs },
  amounts: { flexGrow: 1, flexShrink: 0, minWidth: 140, maxWidth: '100%', gap: space.xs },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  totalRow: { paddingTop: space.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  value: { ...type.bodyStrong, fontFamily: type.money.fontFamily, flexShrink: 1, textAlign: 'right' },
  totalValue: { ...type.money, fontSize: 16, lineHeight: 22, color: color.primary, flexShrink: 1, textAlign: 'right' },
});
