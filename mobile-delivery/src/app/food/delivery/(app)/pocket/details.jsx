import { useEffect, useMemo, useState } from 'react';
import { Animated, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Package } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { Card, EmptyState, Money, ScreenHeader, StatusBadge, formatINR } from '../../../../../components/ds';
import WeekSelector from '../../../../../components/delivery/WeekSelector';
import Skeleton from '../../../../../components/Skeleton';
import { Spinner } from '../../../../../components/Loader';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { useAnimatedValue } from '../../../../../lib/useAnimatedValue';
import { color, radii, space, type } from '../../../../../theme';

// Web: pages/pocket/PocketDetailsV2.jsx. Styled per DESIGN_SYSTEM.md.

const inr = (n) => formatINR(n, { decimals: 2 });

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

  const header = (
    <View style={styles.headerBlock}>
      <WeekSelector onChange={setWeekRange} weekStartsOn={1} style={{ paddingVertical: space.xs }} />

      <Card>
        <Text style={[type.overline, { color: color.textMuted }]}>Total payout</Text>
        <View style={styles.totalBox}>
          {loading ? <Skeleton style={{ height: 32, width: 144 }} /> : <Money value={inr(summary.grandTotal)} style={type.display} />}
        </View>
        <View style={styles.grid}>
          <View style={styles.mini}>
            <Text style={[type.label, { color: color.textSecondary }]}>Trip earnings</Text>
            <View style={styles.miniValueBox}>
              {loading ? <Skeleton style={{ height: 20, width: 80 }} /> : <Money value={inr(summary.totalEarning)} style={styles.miniValue} />}
            </View>
          </View>
          <View style={styles.mini}>
            <Text style={[type.label, { color: color.textSecondary }]}>Weekly bonus</Text>
            <View style={styles.miniValueBox}>
              {loading ? (
                <Skeleton style={{ height: 20, width: 80 }} />
              ) : (
                <Money value={`+${inr(summary.totalBonus)}`} style={[styles.miniValue, { color: color.success }]} />
              )}
            </View>
          </View>
        </View>
      </Card>

      <View style={styles.listHead}>
        <Text style={[type.overline, { color: color.textMuted }]} accessibilityRole="header">
          Trips history
        </Text>
        <StatusBadge label={`${orders.length} orders`} tone="neutral" />
      </View>
    </View>
  );

  return (
    <View style={styles.page}>
      <ScreenHeader title="Pocket details" subtitle="Trips and earnings history" onBack={goBack} />
      <FlatList
        data={loading ? [] : orders}
        keyExtractor={(order, idx) => String(order.orderId || order._id || order.id || idx)}
        contentContainerStyle={[styles.body, { paddingBottom: space.xxxl + insets.bottom }]}
        ListHeaderComponent={header}
        initialNumToRender={12}
        windowSize={7}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <Spinner size={32} color={color.primary} />
              <Text style={[type.small, { color: color.textMuted }]}>Syncing history…</Text>
            </View>
          ) : (
            <Card>
              <EmptyState icon={Package} title="No trips found" message="Try another week." />
            </Card>
          )
        }
        renderItem={({ item: order, index: idx }) => {
          const oid = order.orderId || order._id || order.id;
          const earning = earningFor(oid);
          const bonus = bonusFor(oid);
          const cod = order.paymentMethod?.toLowerCase() === 'cod';
          return (
            <FadeIn delay={Math.min(idx, 10) * 50}>
              <Card style={styles.order} accessibilityLabel={`Order ${oid}`}>
                <View style={styles.pkg}>
                  <Package size={20} color={color.text} />
                </View>
                <View style={styles.orderText}>
                  <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={1}>
                    #{oid.toString().slice(-6)}
                  </Text>
                  <Text style={[type.caption, { color: color.textMuted }]}>
                    {new Date(order.deliveredAt || order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </Text>
                  <Text numberOfLines={1} style={[type.small, { color: color.textSecondary }]}>
                    {order.restaurantName || order.restaurantId?.name || 'Premium Restaurant'}
                  </Text>
                  <StatusBadge label={cod ? 'COD' : String(order.paymentMethod || 'Online').replace(/^./, (c) => c.toUpperCase())} tone={cod ? 'warning' : 'info'} style={{ marginTop: space.xs }} />
                </View>
                <View style={styles.amountCol}>
                  <Money value={`+${inr(earning + bonus)}`} style={styles.orderTotal} />
                  <Text style={[type.caption, { color: color.success }]}>Earned</Text>
                  {bonus > 0 ? <Text style={[type.caption, { color: color.success }]}>incl. +{inr(bonus)} bonus</Text> : null}
                </View>
              </Card>
            </FadeIn>
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
  totalBox: { minHeight: 40, justifyContent: 'center', marginTop: space.xs, marginBottom: space.lg },
  grid: { flexDirection: 'row', gap: space.md },
  mini: { flex: 1, minWidth: 0, backgroundColor: color.surfaceMuted, padding: space.md, borderRadius: radii.md, gap: space.xxs },
  miniValueBox: { minHeight: 24, justifyContent: 'center' },
  miniValue: { ...type.money, fontSize: 16, lineHeight: 22 },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xs, marginTop: space.sm },
  loading: { paddingVertical: space.xxxl + space.lg, alignItems: 'center', gap: space.md },
  // Wraps: a very large amount drops to its own line instead of clipping.
  order: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', columnGap: space.md, rowGap: space.sm },
  pkg: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  orderText: { flexGrow: 1, flexShrink: 1, flexBasis: 120, minWidth: 0, gap: space.xxs },
  amountCol: { alignItems: 'flex-end', marginLeft: 'auto', flexShrink: 0, maxWidth: '100%', gap: space.xxs },
  orderTotal: { ...type.money, color: color.success, textAlign: 'right' },
});
