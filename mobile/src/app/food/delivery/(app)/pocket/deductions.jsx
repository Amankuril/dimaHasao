import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import PlainHeader from '../../../../../components/delivery/PlainHeader';
import WeekSelector from '../../../../../components/delivery/WeekSelector';
import { Spinner } from '../../../../../components/Loader';
import { Press } from '../../../../../components/ui';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { formatCurrency } from '../../../../../lib/format';
import { toast } from '../../../../../lib/notify';
import { ff, shadow, tw } from '../../../../../theme';

// Web: pages/pocket/DeductionStatementV2.jsx. `font-poppins` -> Nunito.

const DOTS = [tw.primarySoft, tw.primarySoft, tw.primary];

const initialRange = () => {
  const now = new Date();
  return {
    start: new Date(new Date().setDate(now.getDate() - now.getDay())),
    end: new Date(new Date().setDate(now.getDate() - now.getDay() + 6)),
  };
};

export default function DeductionStatementV2() {
  const goBack = useDeliveryBackNavigation();
  const [loading, setLoading] = useState(true);
  const [deductions, setDeductions] = useState([]);
  const [weekRange, setWeekRange] = useState(initialRange);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await deliveryAPI.getWalletTransactions({ type: 'deduction', limit: 100 });
        if (response?.data?.success) {
          const all = response.data.data.transactions || [];
          setDeductions(
            all.filter((t) => {
              const type = String(t.type || '').trim().toLowerCase();
              if (!(type === 'withdrawal' || type === 'deposit')) return false;
              const d = new Date(t.date || t.createdAt);
              return d >= weekRange.start && d <= weekRange.end;
            }),
          );
        }
      } catch {
        toast.error('Failed to load deductions');
      } finally {
        setLoading(false);
      }
    })();
  }, [weekRange]);

  return (
    <View style={styles.page}>
      <PlainHeader title="Deduction statement" size={20} leadingNone onBack={goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <WeekSelector onChange={setWeekRange} />
        {loading ? (
          <View style={styles.center}>
            <Spinner size={32} color={tw.primary} />
            <Text style={[styles.muted, { marginTop: 16 }]}>Loading deductions...</Text>
          </View>
        ) : deductions.length === 0 ? (
          <View style={styles.center}>
            <View style={{ gap: 8, marginBottom: 24 }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.ghost, shadow('sm')]}>
                  <View style={[styles.dot, { marginTop: 4, backgroundColor: DOTS[i] }]} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={[styles.line, { width: '75%' }]} />
                    <View style={[styles.line, { width: '50%' }]} />
                  </View>
                </View>
              ))}
            </View>
            <Text style={styles.emptyTitle}>No transactions</Text>
            <Text style={styles.emptyText}>Is hafton mein koi deduction nahi hui.</Text>
          </View>
        ) : (
          <View style={{ gap: 12, marginBottom: 24 }}>
            {deductions.map((item, index) => (
              <Press key={item._id || index} scale={0.98} accessibilityLabel={item.description || 'System Deduction'} style={[styles.item, shadow('sm')]}>
                <View style={styles.itemLeft}>
                  <View style={[styles.dot, { backgroundColor: DOTS[index % 3] }]} />
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.itemTitle}>{item.description || 'System Deduction'}</Text>
                    <Text style={styles.itemDate}>
                      {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
                <Text style={styles.amount}>-{formatCurrency(item.amount)}</Text>
              </Press>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FAF6ED' },
  body: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 128 + 24 },
  center: { paddingVertical: 48, alignItems: 'center' },
  muted: { color: tw.gray600, fontSize: 14, lineHeight: 20, ...ff(500) },
  ghost: { backgroundColor: '#fff', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: tw.gray100, width: 256, opacity: 0.5, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  line: { height: 6, backgroundColor: tw.gray100, borderRadius: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  emptyTitle: { color: tw.gray600, fontSize: 16, lineHeight: 24, ...ff(700) },
  emptyText: { color: tw.gray400, fontSize: 12, lineHeight: 16, marginTop: 4, ...ff(500) },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: tw.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  itemTitle: { color: tw.gray900, fontSize: 14, lineHeight: 17.5, ...ff(700) },
  itemDate: { color: tw.gray400, fontSize: 10, lineHeight: 15, marginTop: 4, letterSpacing: -0.25, textTransform: 'uppercase', ...ff(700) },
  amount: { color: tw.red600, fontSize: 16, lineHeight: 24, ...ff(700) },
});
