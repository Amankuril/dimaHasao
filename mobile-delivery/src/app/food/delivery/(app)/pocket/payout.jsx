import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Clock, XCircle } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { Card, EmptyState, Money, ScreenHeader, StatusBadge, formatINR } from '../../../../../components/ds';
import { Spinner } from '../../../../../components/Loader';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../lib/notify';
import { color, radii, space, tone, type } from '../../../../../theme';

// Web: pages/pocket/PayoutV2.jsx. Styled per DESIGN_SYSTEM.md.

const DATE_OPTS = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };

const statusInfo = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'approved':
      return { Icon: CheckCircle2, tone: 'success' };
    case 'pending':
      return { Icon: Clock, tone: 'warning' };
    case 'denied':
    case 'rejected':
      return { Icon: XCircle, tone: 'danger' };
    default:
      return { Icon: Clock, tone: 'neutral' };
  }
};
const sentence = (s) => {
  const t = String(s || '');
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t;
};

export default function PayoutV2() {
  const goBack = useDeliveryBackNavigation();
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await deliveryAPI.getWalletTransactions({ type: 'withdrawal', limit: 100 });
        if (response?.data?.success) {
          const txs = (response.data.data.transactions || []).filter((t) => String(t?.type || '').toLowerCase() === 'withdrawal');
          setWithdrawals(
            txs.map((t) => ({
              id: t._id || t.id,
              amount: t.amount || 0,
              status: t.status || 'Pending',
              date: new Date(t.date || t.createdAt).toLocaleDateString('en-IN', DATE_OPTS),
              processedAt: t.processedAt ? new Date(t.processedAt).toLocaleDateString('en-IN', DATE_OPTS) : null,
              failureReason: t.failureReason || null,
            })),
          );
        }
      } catch {
        toast.error('Failed to load payout history');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.page}>
      <ScreenHeader title="Payout history" onBack={goBack} />
      <FlatList
        data={loading ? [] : withdrawals}
        keyExtractor={(w, index) => String(w.id || index)}
        contentContainerStyle={[styles.body, { paddingBottom: space.xxxl + insets.bottom }]}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <Spinner size={32} color={color.primary} />
              <Text style={[type.small, { color: color.textMuted }]}>Loading payout history…</Text>
            </View>
          ) : (
            <Card>
              <EmptyState icon={Clock} title="No payout history" message="You haven't made any payout/withdrawal requests yet. Your history will appear here." />
            </Card>
          )
        }
        renderItem={({ item: w }) => {
          const s = statusInfo(w.status);
          return (
            <Card style={styles.card}>
              <View style={styles.top}>
                <StatusBadge label={sentence(w.status)} tone={s.tone} icon={s.Icon} />
                <Text style={[type.caption, { color: color.textMuted }]}>Withdrawal</Text>
              </View>
              <Money value={formatINR(w.amount)} style={styles.amount} />
              <Text style={[type.small, { color: color.textSecondary }]}>Requested: {w.date}</Text>
              {w.processedAt ? <Text style={[type.small, { color: color.textSecondary }]}>Processed: {w.processedAt}</Text> : null}
              {w.failureReason ? (
                <View style={styles.reason}>
                  <Text style={[type.small, { color: color.danger }]}>Reason: {w.failureReason}</Text>
                </View>
              ) : null}
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
  loading: { paddingVertical: space.xxxl + space.lg, alignItems: 'center', gap: space.md },
  card: { gap: space.xs },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: space.xs },
  amount: { ...type.metric },
  reason: { marginTop: space.sm, padding: space.md, borderRadius: radii.md, backgroundColor: tone.danger.bg },
});
