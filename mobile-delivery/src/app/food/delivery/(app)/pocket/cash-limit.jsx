import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HelpCircle, ShieldCheck } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { Button, Card, Money, ScreenHeader, formatINR } from '../../../../../components/ds';
import { Spinner } from '../../../../../components/Loader';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../lib/notify';
import { color, radii, space, type } from '../../../../../theme';

// Web: pages/pocket/CashLimitInfoV2.jsx. Styled per DESIGN_SYSTEM.md.

function DetailRow({ label, value, subLabel }) {
  return (
    <View style={styles.detail}>
      <View style={styles.detailText}>
        <Text style={[type.body, { color: color.text }]}>{label}</Text>
        {subLabel ? <Text style={[type.caption, { color: color.textMuted }]}>{subLabel}</Text> : null}
      </View>
      <Money value={value} style={styles.detailValue} />
    </View>
  );
}

export default function CashLimitInfoV2() {
  const goBack = useDeliveryBackNavigation();
  const [loading, setLoading] = useState(true);
  const [w, setW] = useState({ totalCashLimit: 0, cashInHand: 0, deductions: 0, pocketWithdrawals: 0, availableCashLimit: 0 });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [walletRes, limitRes] = await Promise.all([deliveryAPI.getWallet(), deliveryAPI.getCashLimit().catch(() => null)]);
        const wallet = walletRes?.data?.data?.wallet || {};
        const limitSettings = limitRes?.data?.data || {};
        const totalLimit = Number(wallet.totalCashLimit ?? limitSettings.deliveryCashLimit ?? 0) || 0;
        const cashInHand = Number(wallet.cashInHand) || 0;
        const deductions = Number(wallet.deductions) || 0;
        const availableRaw = Number(wallet.availableCashLimit);
        setW({
          totalCashLimit: totalLimit,
          cashInHand,
          deductions,
          pocketWithdrawals: Number(wallet.totalWithdrawn) || 0,
          availableCashLimit: Number.isFinite(availableRaw) ? availableRaw : Math.max(0, totalLimit - cashInHand - deductions),
        });
      } catch {
        toast.error('Failed to load cash limit details');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const insets = useSafeAreaInsets();
  const inr = (n) => formatINR(n, { decimals: 2 });

  return (
    <View style={styles.page}>
      <ScreenHeader title="Available cash limit" onBack={goBack} />
      {loading ? (
        <View style={styles.loading}>
          <Spinner size={32} color={color.primary} />
          <Text style={[type.small, { color: color.textMuted }]}>Checking limits…</Text>
        </View>
      ) : (
        <>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
            <Card padded={false}>
              <View style={styles.head}>
                <View style={styles.headIcon}>
                  <ShieldCheck size={22} color={color.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.label, { color: color.textSecondary }]}>Total cash limit</Text>
                  <Money value={inr(w.totalCashLimit)} style={type.metric} />
                </View>
              </View>
              <DetailRow label="Total cash limit" value={inr(w.totalCashLimit)} subLabel="Max COD cash you can hold. Restored when you deposit/settle." />
              <DetailRow label="Cash in hand" value={inr(w.cashInHand)} />
              <DetailRow label="Deductions" value={inr(w.deductions)} />
              <DetailRow label="Pocket withdrawals" value={inr(w.pocketWithdrawals)} />
              <View style={styles.available}>
                <Text style={[type.subheading, styles.availableLabel]}>Available cash limit</Text>
                <Money value={inr(w.availableCashLimit)} style={styles.availableValue} />
              </View>
            </Card>

            <Card style={styles.how}>
              <HelpCircle size={24} color={color.textMuted} />
              <Text style={[type.subheading, { color: color.text }]} accessibilityRole="header">
                How it works
              </Text>
              <Text style={[type.small, { color: color.textSecondary, textAlign: 'center' }]}>
                Your available limit is how much more COD cash you can collect. Cash orders reduce it. When you deposit (pay) your cash in hand, available limit
                increases automatically — the total limit itself does not change.
              </Text>
            </Card>
          </ScrollView>
          <View style={[styles.bar, { paddingBottom: space.lg + insets.bottom }]}>
            <Button title="Okay" size="lg" onPress={goBack} accessibilityLabel="Okay" />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  loading: { paddingVertical: space.xxxl * 2, alignItems: 'center', gap: space.md },
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  headIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  detailText: { flex: 1, minWidth: 0, gap: space.xxs },
  detailValue: { ...type.money, fontSize: 16, lineHeight: 22, flexShrink: 1, maxWidth: '55%', textAlign: 'right' },
  available: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space.sm,
    padding: space.lg,
    backgroundColor: color.primarySoft,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
  },
  availableLabel: { color: color.primary, flexShrink: 1 },
  availableValue: { ...type.metric, color: color.primary, flexShrink: 1 },
  how: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  bar: { backgroundColor: color.surface, padding: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.borderStrong },
});
