import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Clock, XCircle } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import PlainHeader from '../../../../../components/delivery/PlainHeader';
import { Spinner } from '../../../../../components/Loader';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../lib/notify';
import { ff, shadow, tw } from '../../../../../theme';

// Web: pages/pocket/PayoutV2.jsx. `font-poppins` -> Nunito; bg-[#f6e9dc] -> #FAF6ED.

const DATE_OPTS = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };

const statusInfo = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'approved':
      // text-green-600 / bg-green-50 -> primary / #E8F2EC; border-green-200 is untouched
      return { Icon: CheckCircle2, color: tw.primary, bg: tw.primarySoft, border: '#B9F8CF' };
    case 'pending':
      return { Icon: Clock, color: tw.primary, bg: tw.primarySoft, border: tw.primaryBorder };
    case 'denied':
    case 'rejected':
      return { Icon: XCircle, color: tw.red600, bg: tw.red50, border: tw.red200 };
    default:
      return { Icon: Clock, color: tw.gray600, bg: tw.gray50, border: tw.gray200 };
  }
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

  return (
    <View style={styles.page}>
      <PlainHeader title="Payout History" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        {loading ? (
          <View style={styles.loading}>
            <Spinner size={32} color={tw.gray400} />
            <Text style={styles.loadingText}>Loading payout history...</Text>
          </View>
        ) : withdrawals.length > 0 ? (
          <View style={{ gap: 16 }}>
            {withdrawals.map((w, index) => {
              const s = statusInfo(w.status);
              const { Icon } = s;
              return (
                <View key={w.id || index} style={[styles.card, shadow('sm'), { borderColor: s.border }]}>
                  <View style={styles.row}>
                    <Icon size={20} color={s.color} />
                    <Text style={[styles.badge, { backgroundColor: s.bg, color: s.color }]}>{w.status}</Text>
                  </View>
                  <Text style={styles.amount}>₹{w.amount}</Text>
                  <Text style={styles.meta}>Requested: {w.date}</Text>
                  {w.processedAt ? <Text style={[styles.meta, { marginTop: 4 }]}>Processed: {w.processedAt}</Text> : null}
                  {w.failureReason ? <Text style={styles.reason}>Reason: {w.failureReason}</Text> : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, shadow('sm')]}>
              <Clock size={32} color={tw.gray200} />
            </View>
            <Text style={styles.emptyTitle}>No payout history</Text>
            <Text style={styles.emptyText}>You haven&apos;t made any payout/withdrawal requests yet. Your history will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FAF6ED' },
  body: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 96 + 24 },
  loading: { paddingVertical: 48, alignItems: 'center' },
  loadingText: { marginTop: 16, color: tw.gray600, fontSize: 16, lineHeight: 24, ...ff(500) },
  // rounded-xl p-4 border; the card's mb-3 inner row has a single child, so its spacing collapses into the card
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, paddingBottom: 28, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  badge: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, textTransform: 'uppercase', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', ...ff(700) },
  amount: { color: tw.gray900, fontSize: 20, lineHeight: 28, marginBottom: 4, ...ff(700) },
  meta: { color: tw.gray500, fontSize: 11, lineHeight: 16.5, ...ff(500) },
  reason: { color: tw.red600, fontSize: 11, lineHeight: 16.5, marginTop: 8, ...ff(700) },
  empty: { paddingVertical: 80, paddingHorizontal: 32, alignItems: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { color: tw.gray900, fontSize: 18, lineHeight: 28, marginBottom: 8, ...ff(700) },
  emptyText: { color: tw.gray400, fontSize: 14, lineHeight: 20, textAlign: 'center', ...ff(500) },
});
