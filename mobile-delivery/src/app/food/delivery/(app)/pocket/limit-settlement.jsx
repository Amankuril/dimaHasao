import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Clock, XCircle } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { Card, EmptyState, Money, ScreenHeader, StatusBadge, formatINR } from '../../../../../components/ds';
import { Spinner } from '../../../../../components/Loader';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../lib/notify';
import { color, space, type } from '../../../../../theme';

// Web: pages/pocket/LimitSettlementV2.jsx. Styled per DESIGN_SYSTEM.md.

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

export default function LimitSettlementV2() {
  const goBack = useDeliveryBackNavigation();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await deliveryAPI.getWalletTransactions({ type: 'deposit', limit: 100 });
        if (response?.data?.success) {
          setTransactions(
            (response.data.data.transactions || []).map((t) => ({
              id: t._id || t.id,
              amount: t.amount || 0,
              status: t.status || 'Pending',
              description: t.description || 'Available limit settlement',
              date: new Date(t.date || t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            })),
          );
        }
      } catch {
        toast.error('Failed to load settlement history');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.page}>
      <ScreenHeader title="Available limit settlement" onBack={goBack} />
      <FlatList
        data={loading ? [] : transactions}
        keyExtractor={(tx, index) => String(tx.id || index)}
        contentContainerStyle={[styles.body, { paddingBottom: space.xxxl + insets.bottom }]}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <Spinner size={32} color={color.primary} />
              <Text style={[type.small, { color: color.textMuted }]}>Loading transactions…</Text>
            </View>
          ) : (
            <Card>
              <EmptyState icon={Clock} title="No settlement transactions" message="Whenever you settle the available limit, the payment transactions will appear here." />
            </Card>
          )
        }
        renderItem={({ item: tx }) => {
          const s = statusInfo(tx.status);
          return (
            <Card style={styles.card} accessibilityLabel={tx.description}>
              <View style={styles.top}>
                <StatusBadge label={sentence(tx.status)} tone={s.tone} icon={s.Icon} />
                <Text style={[type.caption, { color: color.textMuted }]}>Deposit</Text>
              </View>
              <Money value={formatINR(tx.amount)} style={styles.amount} />
              <Text style={[type.body, { color: color.textSecondary }]}>{tx.description}</Text>
              <Text style={[type.caption, { color: color.textMuted }]}>Date: {tx.date}</Text>
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
});
