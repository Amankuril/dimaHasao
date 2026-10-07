import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MinusCircle, Receipt } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { Card, EmptyState, Money, ScreenHeader, formatINR } from '../../../../../components/ds';
import WeekSelector from '../../../../../components/delivery/WeekSelector';
import { Spinner } from '../../../../../components/Loader';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../lib/notify';
import { color, radii, space, tone, type } from '../../../../../theme';

// Web: pages/pocket/DeductionStatementV2.jsx. Styled per DESIGN_SYSTEM.md.

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

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.page}>
      <ScreenHeader title="Deduction statement" onBack={goBack} />
      <FlatList
        data={loading ? [] : deductions}
        keyExtractor={(item, index) => String(item._id || index)}
        contentContainerStyle={[styles.body, { paddingBottom: space.xxxl + insets.bottom }]}
        ListHeaderComponent={
          <WeekSelector onChange={setWeekRange} style={{ paddingVertical: space.xs, marginBottom: space.xs }} />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <Spinner size={32} color={color.primary} />
              <Text style={[type.small, { color: color.textMuted }]}>Loading deductions…</Text>
            </View>
          ) : (
            <Card>
              <EmptyState icon={Receipt} title="No transactions" message="Is hafton mein koi deduction nahi hui." />
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Card style={styles.item} accessibilityLabel={item.description || 'System Deduction'}>
            <View style={styles.icon}>
              <MinusCircle size={20} color={color.danger} />
            </View>
            <View style={styles.itemText}>
              <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={2}>
                {item.description || 'System Deduction'}
              </Text>
              <Text style={[type.caption, { color: color.textMuted }]}>
                {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={styles.amountCol}>
              <Money value={`−${formatINR(item.amount, { decimals: 2 })}`} style={styles.amount} />
              <Text style={[type.caption, { color: color.danger }]}>Debited</Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, gap: space.md },
  loading: { paddingVertical: space.xxxl + space.lg, alignItems: 'center', gap: space.md },
  // Wraps: a very large amount drops to its own line instead of clipping.
  item: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.md, rowGap: space.sm },
  icon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: tone.danger.bg, alignItems: 'center', justifyContent: 'center' },
  itemText: { flexGrow: 1, flexShrink: 1, flexBasis: 140, minWidth: 0, gap: space.xxs },
  amountCol: { alignItems: 'flex-end', marginLeft: 'auto', flexShrink: 0, maxWidth: '100%' },
  amount: { ...type.money, color: color.danger, textAlign: 'right' },
});
