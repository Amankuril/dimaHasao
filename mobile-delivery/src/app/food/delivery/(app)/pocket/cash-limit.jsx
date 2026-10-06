import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { HelpCircle, ShieldCheck } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import PlainHeader from '../../../../../components/delivery/PlainHeader';
import { Spinner } from '../../../../../components/Loader';
import { SoraMoney } from '../../../../../components/kit';
import { Press } from '../../../../../components/ui';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { formatCurrency } from '../../../../../lib/format';
import { toast } from '../../../../../lib/notify';
import { display, ff, shadow, tw } from '../../../../../theme';

// Web: pages/pocket/CashLimitInfoV2.jsx. `font-poppins` -> Nunito; emerald-50/600 -> soft/primary.

function DetailRow({ label, value, subLabel }) {
  return (
    <View style={styles.detail}>
      <View style={{ flex: 1, paddingRight: 16 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        {subLabel ? <Text style={styles.detailSub}>{subLabel}</Text> : null}
      </View>
      <Text style={styles.detailValue}>{value}</Text>
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

  return (
    <View style={styles.page}>
      <PlainHeader title="Available cash limit" leadingNone onBack={goBack} />
      {loading ? (
        <View style={styles.loading}>
          <Spinner size={32} color={tw.primary} />
          <Text style={styles.loadingText}>Checking Limits...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.card, shadow('sm')]}>
            <View style={styles.head}>
              <View style={styles.headIcon}>
                <ShieldCheck size={24} color={tw.primary} />
              </View>
              <View>
                <Text style={styles.headTitle}>Total cash limit</Text>
                <Text style={styles.headSub}>{formatCurrency(w.totalCashLimit)}</Text>
              </View>
            </View>
            <View style={{ gap: 4 }}>
              <DetailRow label="Total cash limit" value={formatCurrency(w.totalCashLimit)} subLabel="Max COD cash you can hold. Restored when you deposit/settle." />
              <DetailRow label="Cash in hand" value={formatCurrency(w.cashInHand)} />
              <DetailRow label="Deductions" value={formatCurrency(w.deductions)} />
              <DetailRow label="Pocket withdrawals" value={formatCurrency(w.pocketWithdrawals)} />
              {/* mt-2 collapses with space-y-1: 8 px = gap 4 + 4 */}
              <View style={styles.available}>
                <Text style={styles.availableLabel}>Available cash limit</Text>
                <SoraMoney style={styles.availableValue}>{formatCurrency(w.availableCashLimit)}</SoraMoney>
              </View>
            </View>
          </View>

          <View style={[styles.how, shadow('sm')]}>
            <HelpCircle size={32} color={tw.gray200} style={{ marginBottom: 16 }} />
            <Text style={styles.howTitle}>How it works?</Text>
            <Text style={styles.howText}>
              Your available limit is how much more COD cash you can collect. Cash orders reduce it. When you deposit (pay) your cash in hand, available limit
              increases automatically — the total limit itself does not change.
            </Text>
          </View>

          <View style={{ paddingHorizontal: 8 }}>
            <Press onPress={goBack} accessibilityLabel="Okay" style={[styles.ok, shadow('lg')]}>
              <Text style={styles.okText}>Okay</Text>
            </Press>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FAF6ED' },
  loading: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  loadingText: { color: tw.gray400, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', ...ff(700) },
  body: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 128 + 24 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: tw.gray100, padding: 20, marginBottom: 24, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  headIcon: { width: 40, height: 40, backgroundColor: tw.primarySoft, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  // h3 font-black -> Sora
  headTitle: { fontSize: 17, lineHeight: 17, color: '#1F1F24', marginBottom: 4, ...display(900, 17) },
  headSub: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, ...ff(700) },
  detail: { paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  detailLabel: { fontSize: 14, lineHeight: 20, color: tw.gray800, ...ff(600) },
  detailSub: { fontSize: 10, lineHeight: 12.5, color: tw.gray400, marginTop: 2, ...ff(500) },
  detailValue: { fontSize: 14, lineHeight: 20, color: '#000', ...ff(700) },
  // bg-emerald-50/50 hits [class*="bg-emerald-50"]: opaque #E8F2EC
  available: { paddingVertical: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: tw.primarySoft, marginHorizontal: -20, paddingHorizontal: 20, marginTop: 4 },
  availableLabel: { fontSize: 14, lineHeight: 20, textTransform: 'uppercase', color: '#004F3B', ...display(900, 14) },
  availableValue: { fontSize: 18, lineHeight: 28, color: tw.primary, ...display(900, 18) },
  how: { backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: tw.gray100, marginBottom: 24 },
  howTitle: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', color: tw.gray400, marginBottom: 8, ...ff(700) },
  howText: { fontSize: 11, lineHeight: 17.875, color: tw.gray500, textAlign: 'center', paddingHorizontal: 16, ...ff(500) },
  ok: { width: '100%', paddingVertical: 16, backgroundColor: '#000', borderRadius: 12, alignItems: 'center' },
  okText: { color: '#fff', fontSize: 14, lineHeight: 20, ...ff(700) },
});
