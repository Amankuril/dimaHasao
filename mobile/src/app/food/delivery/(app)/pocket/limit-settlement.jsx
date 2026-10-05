import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Clock, XCircle } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import PlainHeader from '../../../../../components/delivery/PlainHeader';
import { Spinner } from '../../../../../components/Loader';
import { Press } from '../../../../../components/ui';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../lib/notify';
import { ff, shadow, tw } from '../../../../../theme';

// Web: pages/pocket/LimitSettlementV2.jsx. `font-poppins` -> Nunito.

const statusInfo = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'approved':
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

  return (
    <View style={styles.page}>
      <PlainHeader title="Available limit settlement" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        {loading ? (
          <View style={styles.loading}>
            <Spinner size={32} color={tw.primary} />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : transactions.length > 0 ? (
          <View style={{ gap: 16 }}>
            {transactions.map((tx, index) => {
              const s = statusInfo(tx.status);
              const { Icon } = s;
              return (
                <Press key={tx.id || index} scale={0.98} accessibilityLabel={tx.description} style={[styles.card, shadow('sm'), { borderColor: s.border }]}>
                  <View style={styles.row}>
                    <Icon size={16} color={s.color} />
                    <Text style={[styles.badge, { backgroundColor: s.bg, color: s.color }]}>{tx.status}</Text>
                  </View>
                  <Text style={styles.amount}>₹{tx.amount}</Text>
                  <Text style={styles.desc}>{tx.description}</Text>
                  <Text style={styles.date}>Date: {tx.date}</Text>
                </Press>
              );
            })}
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Clock size={32} color={tw.gray200} />
            </View>
            <Text style={styles.emptyTitle}>No settlement transactions</Text>
            <Text style={styles.emptyText}>Whenever you settle the available limit, the payment transactions will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FAF6ED' },
  body: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 128 + 24 },
  loading: { paddingVertical: 48, alignItems: 'center' },
  loadingText: { marginTop: 16, color: tw.gray600, fontSize: 14, lineHeight: 20, ...ff(500) },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, paddingBottom: 28, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  badge: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, textTransform: 'uppercase', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', ...ff(700) },
  amount: { color: tw.gray900, fontSize: 20, lineHeight: 28, marginBottom: 4, ...ff(700) },
  desc: { color: tw.gray600, fontSize: 14, lineHeight: 20, marginBottom: 4, ...ff(500) },
  date: { color: tw.gray400, fontSize: 11, lineHeight: 16.5, ...ff(600) },
  empty: { paddingVertical: 80, paddingHorizontal: 16, alignItems: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: tw.gray100 },
  emptyTitle: { color: tw.gray900, fontSize: 18, lineHeight: 28, marginBottom: 8, textAlign: 'center', ...ff(700) },
  emptyText: { color: tw.gray400, fontSize: 12, lineHeight: 19.5, textAlign: 'center', ...ff(600) },
});
