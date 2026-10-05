import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import PlainHeader from '../../../../../components/delivery/PlainHeader';
import { SoraMoney } from '../../../../../components/kit';
import { Spinner } from '../../../../../components/Loader';
import { Press } from '../../../../../components/ui';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { showUserFacingApiError } from '../../../../../lib/apiError';
import { formatCurrency } from '../../../../../lib/format';
import { toast } from '../../../../../lib/notify';
import { display, ff, shadow, tw } from '../../../../../theme';

// Web: pages/pocket/PocketBalanceV2.jsx. `font-poppins` -> Nunito; bg-yellow-400 -> #FAF6ED.

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

export default function PocketBalanceV2() {
  const goBack = useDeliveryBackNavigation();
  const [loading, setLoading] = useState(true);
  const [w, setW] = useState({
    pocketBalance: 0,
    weeklyEarnings: 0,
    totalBonus: 0,
    totalWithdrawn: 0,
    cashCollected: 0,
    deductions: 0,
    withdrawalLimit: 100,
    withdrawableAmount: 0,
    canWithdraw: false,
  });
  const [withdrawalStatus, setWithdrawalStatus] = useState({ status: 'No request', updatedAt: null });
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [, earningsRes, walletRes, withdrawalRes] = await Promise.all([
          deliveryAPI.getProfile(),
          deliveryAPI.getEarnings({ period: 'week' }),
          deliveryAPI.getWallet(),
          deliveryAPI.getWalletTransactions({ type: 'withdrawal', limit: 1 }),
        ]);
        const summary = earningsRes?.data?.data?.summary || {};
        const wallet = walletRes?.data?.data?.wallet || {};
        const tx = withdrawalRes?.data?.data?.transactions?.[0] || null;
        const pocketBalance = Number(wallet.pocketBalance) || 0;
        const withdrawalLimit = Number(wallet.deliveryWithdrawalLimit) || 100;
        setW({
          pocketBalance,
          weeklyEarnings: Number(summary.totalEarnings) || 0,
          totalBonus: Number(wallet.totalBonus) || 0,
          totalWithdrawn: Number(wallet.totalWithdrawn) || 0,
          cashCollected: Number(wallet.cashInHand) || 0,
          deductions: 0,
          withdrawalLimit,
          withdrawableAmount: pocketBalance,
          canWithdraw: pocketBalance >= withdrawalLimit,
        });
        if (tx) {
          const raw = String(tx.status || 'Pending').toLowerCase();
          const label = raw === 'approved' || raw === 'completed' ? 'Approved' : raw === 'rejected' || raw === 'denied' ? 'Rejected' : 'Pending';
          const updatedAt = tx.processedAt || tx.updatedAt || tx.createdAt || null;
          setWithdrawalStatus({
            status: label,
            updatedAt: updatedAt ? new Date(updatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
          });
        } else {
          setWithdrawalStatus({ status: 'No request', updatedAt: null });
        }
      } catch {
        toast.error('Failed to load pocket details');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const parsed = parseFloat(withdrawAmount);
  const hasPendingWithdrawal = String(withdrawalStatus.status || '').toLowerCase() === 'pending';
  const isValid = Number.isFinite(parsed) && parsed >= w.withdrawalLimit && parsed <= w.withdrawableAmount;
  const inputDisabled = !w.canWithdraw || hasPendingWithdrawal || withdrawSubmitting;
  const enabled = w.canWithdraw && !hasPendingWithdrawal && isValid;

  const onAmountChange = (text) => {
    let val = String(text || '').replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = `${parts[0]}.${parts.slice(1).join('')}`;
    if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
    setWithdrawAmount(val);
  };

  const handleWithdraw = async () => {
    if (hasPendingWithdrawal) {
      toast.error('You already have a pending withdrawal request');
      return;
    }
    if (!isValid) {
      if (!Number.isFinite(parsed) || parsed <= 0) toast.error('Please enter the amount you want to withdraw');
      else if (parsed < w.withdrawalLimit) toast.error(`Minimum withdrawal amount is ₹${w.withdrawalLimit}`);
      else toast.error('Amount cannot exceed withdrawable balance');
      return;
    }
    const profileRes = await deliveryAPI.getProfile();
    const bank = profileRes?.data?.data?.profile?.documents?.bankDetails;
    if (!bank?.accountNumber) {
      toast.error('Please add bank details first');
      router.push('/food/delivery/profile/details');
      return;
    }
    setWithdrawSubmitting(true);
    try {
      const res = await deliveryAPI.createWithdrawalRequest({ amount: parsed, paymentMethod: 'bank_transfer' });
      if (res?.data?.success) {
        toast.success('Withdrawal request submitted');
        setWithdrawAmount('');
        goBack();
      }
    } catch (err) {
      showUserFacingApiError(err, 'Withdrawal failed');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      <PlainHeader title="Pocket balance" leadingNone onBack={goBack} />
      {loading ? (
        <View style={styles.loading}>
          <Spinner size={32} color={tw.primary} />
          <Text style={styles.loadingText}>Loading Balance...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 128 }}>
            {!w.canWithdraw ? (
              <View style={styles.warn}>
                <AlertTriangle size={20} color="#1F1F24" />
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.warnTitle}>Withdraw currently disabled</Text>
                  <Text style={styles.warnText}>
                    {w.withdrawableAmount <= 0 ? 'Withdrawable amount is ₹0' : `Minimum withdrawal requirement is ₹${w.withdrawalLimit}`}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={[styles.top, shadow('sm')]}>
              <Text style={styles.kicker}>Withdrawable Amount</Text>
              <SoraMoney style={styles.big}>{`₹${w.withdrawableAmount.toFixed(0)}`}</SoraMoney>
              <View style={{ marginBottom: 16, alignSelf: 'stretch' }}>
                <Text style={styles.label}>Enter amount to withdraw</Text>
                <View style={[{ borderRadius: 16, padding: 4, margin: -4 }, focused && { backgroundColor: 'rgba(21,73,139,0.15)' }]}>
                  <TextInput
                    value={withdrawAmount}
                    onChangeText={onAmountChange}
                    keyboardType="decimal-pad"
                    editable={!inputDisabled}
                    placeholder={`Min ₹${w.withdrawalLimit}`}
                    placeholderTextColor="rgba(31,31,36,0.5)"
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    accessibilityLabel="Amount to withdraw"
                    style={[styles.input, focused && { borderColor: '#789D8A' }, inputDisabled && { opacity: 0.5 }]}
                  />
                  <Text pointerEvents="none" style={styles.inputRupee}>
                    ₹
                  </Text>
                </View>
                {withdrawAmount && Number.isFinite(parsed) && parsed > w.withdrawableAmount ? (
                  <Text style={styles.err}>Amount cannot exceed ₹{w.withdrawableAmount.toFixed(0)}</Text>
                ) : null}
                {withdrawAmount && Number.isFinite(parsed) && parsed > 0 && parsed < w.withdrawalLimit ? (
                  <Text style={styles.err}>Minimum withdrawal is ₹{w.withdrawalLimit}</Text>
                ) : null}
                {hasPendingWithdrawal ? <Text style={[styles.err, { color: tw.amber600 }]}>A withdrawal request is already pending admin approval.</Text> : null}
              </View>
              <Press
                onPress={handleWithdraw}
                disabled={!enabled || withdrawSubmitting}
                scale={0.98}
                accessibilityLabel="Withdraw"
                style={[styles.withdraw, shadow('lg'), { backgroundColor: enabled ? '#000' : tw.gray100 }]}
              >
                {withdrawSubmitting ? <Spinner size={16} color={enabled ? '#fff' : tw.gray400} /> : null}
                <Text style={[styles.withdrawText, { color: enabled ? '#fff' : tw.gray400 }]}>{withdrawSubmitting ? 'Processing...' : 'Withdraw'}</Text>
              </Press>
            </View>

            <View style={styles.band}>
              <Text style={styles.bandText}>Pocket Details</Text>
            </View>
            <View style={{ backgroundColor: '#fff', paddingHorizontal: 16 }}>
              <DetailRow label="Earnings" value={formatCurrency(w.weeklyEarnings)} />
              <DetailRow label="Bonus" value={formatCurrency(w.totalBonus)} />
              <DetailRow label="Amount withdrawn" value={formatCurrency(w.totalWithdrawn)} />
              <DetailRow label="Cash collected" value={formatCurrency(w.cashCollected)} />
              <DetailRow label="Deductions" value={formatCurrency(w.deductions)} />
              <DetailRow label="Pocket balance" value={formatCurrency(w.pocketBalance)} />
              <DetailRow
                label="Withdrawal status"
                value={withdrawalStatus.status}
                subLabel={withdrawalStatus.updatedAt ? `Updated: ${withdrawalStatus.updatedAt}` : 'Admin approval status'}
              />
              <DetailRow label="Min. withdrawal amount" value={formatCurrency(w.withdrawalLimit)} subLabel="Withdrawal allowed only when withdrawable amount reaches this limit." />
              <DetailRow label="Withdrawable amount" value={formatCurrency(w.withdrawableAmount)} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FAF6ED' },
  loading: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  loadingText: { color: tw.gray400, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', ...ff(700) },
  warn: { backgroundColor: '#FAF6ED', padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(240,177,0,0.1)' },
  warnTitle: { fontSize: 12, lineHeight: 16, color: '#1F1F24', ...ff(700) },
  warnText: { fontSize: 10, lineHeight: 12.5, color: '#1F1F24', opacity: 0.8, marginTop: 4, ...ff(500) },
  top: { backgroundColor: '#fff', padding: 32, marginBottom: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  kicker: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', color: tw.gray400, marginBottom: 8, ...ff(700) },
  big: { fontSize: 48, lineHeight: 48, color: '#000', marginBottom: 16, ...display(900, 48) },
  label: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, marginBottom: 8, ...ff(700) },
  // An <input>: the theme paints it white with a #E8DEE7 border.
  input: { height: 58, paddingLeft: 32, paddingRight: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E8DEE7', backgroundColor: '#fff', fontSize: 18, color: '#1F1F24', outlineWidth: 0, ...ff(700) },
  inputRupee: { position: 'absolute', left: 20, top: 0, bottom: 0, textAlignVertical: 'center', lineHeight: 66, fontSize: 16, color: tw.gray400, ...ff(700) },
  err: { fontSize: 11, lineHeight: 16.5, color: tw.red500, marginTop: 8, ...ff(600) },
  withdraw: { width: '100%', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  withdrawText: { fontSize: 14, lineHeight: 20, ...ff(700) },
  band: { backgroundColor: 'rgba(243,244,246,0.5)', paddingVertical: 8, paddingHorizontal: 16 },
  bandText: { fontSize: 10, lineHeight: 15, textTransform: 'uppercase', color: tw.gray400, textAlign: 'center', ...display(900, 10) },
  detail: { paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  detailLabel: { fontSize: 14, lineHeight: 20, color: tw.gray800, ...ff(600) },
  detailSub: { fontSize: 10, lineHeight: 12.5, color: tw.gray400, marginTop: 2, ...ff(500) },
  detailValue: { fontSize: 14, lineHeight: 20, color: '#000', ...ff(700) },
});
