import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { Button, Card, Money, ScreenHeader, SectionHeader, StatusBadge, formatINR } from '../../../../../components/ds';
import { Spinner } from '../../../../../components/Loader';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { showUserFacingApiError } from '../../../../../lib/apiError';
import { toast } from '../../../../../lib/notify';
import { color, radii, space, tone, type } from '../../../../../theme';

// Web: pages/pocket/PocketBalanceV2.jsx. Styled per DESIGN_SYSTEM.md.

const STATUS_TONE = { Approved: 'success', Rejected: 'danger', Pending: 'warning' };

function DetailRow({ label, value, subLabel, strong, last }) {
  return (
    <View style={[styles.detail, !last && styles.detailDivider]}>
      <View style={styles.detailText}>
        <Text style={[strong ? type.bodyStrong : type.body, { color: color.text }]}>{label}</Text>
        {subLabel ? <Text style={[type.caption, { color: color.textMuted }]}>{subLabel}</Text> : null}
      </View>
      {typeof value === 'string' ? <Money value={value} style={[styles.detailValue, strong && { fontSize: 18, lineHeight: 24 }]} /> : value}
    </View>
  );
}

/** ₹-prefixed amount input (local primitive; PocketV2 has the same one). */
function AmountField({ value, onChangeText, placeholder, editable = true, accessibilityLabel, invalid }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, focused && styles.fieldFocused, invalid && styles.fieldInvalid, !editable && styles.fieldDisabled]}>
      <Text style={[styles.fieldRupee, !editable && { color: color.textDisabled }]}>₹</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={color.textMuted}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={accessibilityLabel}
        style={[styles.fieldInput, !editable && { color: color.textDisabled }]}
      />
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

  const insets = useSafeAreaInsets();
  const overMax = Boolean(withdrawAmount) && Number.isFinite(parsed) && parsed > w.withdrawableAmount;
  const underMin = Boolean(withdrawAmount) && Number.isFinite(parsed) && parsed > 0 && parsed < w.withdrawalLimit;

  return (
    <View style={styles.page}>
      <ScreenHeader title="Pocket balance" onBack={goBack} />
      {loading ? (
        <View style={styles.loading}>
          <Spinner size={32} color={color.primary} />
          <Text style={[type.small, { color: color.textMuted }]}>Loading balance…</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.body, { paddingBottom: space.xxxl + insets.bottom }]}>
            {!w.canWithdraw ? (
              <View style={styles.warn} accessibilityRole="alert">
                <AlertTriangle size={20} color={color.warning} style={{ marginTop: 1 }} />
                <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
                  <Text style={[type.bodyStrong, { color: color.text }]}>Withdraw currently disabled</Text>
                  <Text style={[type.small, { color: color.textSecondary }]}>
                    {w.withdrawableAmount <= 0 ? 'Withdrawable amount is ₹0' : `Minimum withdrawal requirement is ₹${w.withdrawalLimit}`}
                  </Text>
                </View>
              </View>
            ) : null}

            <Card>
              <Text style={[type.overline, { color: color.textMuted }]}>Withdrawable amount</Text>
              <Money value={formatINR(w.withdrawableAmount, { decimals: 0 })} style={styles.big} />

              <Text style={[type.label, styles.label]}>Amount to withdraw</Text>
              <AmountField
                value={withdrawAmount}
                onChangeText={onAmountChange}
                editable={!inputDisabled}
                placeholder={`Min ₹${w.withdrawalLimit}`}
                accessibilityLabel="Amount to withdraw"
                invalid={overMax || underMin}
              />
              <View style={styles.messages}>
                {overMax ? <Text style={[type.small, { color: color.danger }]}>Amount cannot exceed ₹{w.withdrawableAmount.toFixed(0)}</Text> : null}
                {underMin ? <Text style={[type.small, { color: color.danger }]}>Minimum withdrawal is ₹{w.withdrawalLimit}</Text> : null}
                {hasPendingWithdrawal ? <Text style={[type.small, { color: color.warning }]}>A withdrawal request is already pending admin approval.</Text> : null}
              </View>
              <Button
                title={withdrawSubmitting ? 'Processing...' : 'Withdraw'}
                size="lg"
                onPress={handleWithdraw}
                disabled={!enabled || withdrawSubmitting}
                loading={withdrawSubmitting}
                accessibilityLabel="Withdraw"
              />
            </Card>

            <View style={{ marginTop: space.md }}>
              <SectionHeader title="Pocket details" />
              <Card padded={false}>
                <DetailRow label="Earnings" value={formatINR(w.weeklyEarnings, { decimals: 2 })} />
                <DetailRow label="Bonus" value={formatINR(w.totalBonus, { decimals: 2 })} />
                <DetailRow label="Amount withdrawn" value={formatINR(w.totalWithdrawn, { decimals: 2 })} />
                <DetailRow label="Cash collected" value={formatINR(w.cashCollected, { decimals: 2 })} />
                <DetailRow label="Deductions" value={formatINR(w.deductions, { decimals: 2 })} />
                <DetailRow label="Pocket balance" value={formatINR(w.pocketBalance, { decimals: 2 })} strong />
                <DetailRow
                  label="Withdrawal status"
                  value={<StatusBadge label={withdrawalStatus.status} tone={STATUS_TONE[withdrawalStatus.status] || 'neutral'} />}
                  subLabel={withdrawalStatus.updatedAt ? `Updated: ${withdrawalStatus.updatedAt}` : 'Admin approval status'}
                />
                <DetailRow
                  label="Min. withdrawal amount"
                  value={formatINR(w.withdrawalLimit, { decimals: 2 })}
                  subLabel="Withdrawal allowed only when withdrawable amount reaches this limit."
                />
                <DetailRow label="Withdrawable amount" value={formatINR(w.withdrawableAmount, { decimals: 2 })} strong last />
              </Card>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  loading: { paddingVertical: space.xxxl * 2, alignItems: 'center', gap: space.md },
  body: { padding: space.lg, gap: space.md },
  warn: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg, borderRadius: radii.lg, backgroundColor: tone.warning.bg },
  big: { ...type.display, marginTop: space.xs, marginBottom: space.lg },
  label: { color: color.textSecondary, marginBottom: space.sm },
  messages: { gap: space.xs, marginTop: space.sm, marginBottom: space.lg },
  detail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 56 },
  detailDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  detailText: { flex: 1, minWidth: 0, gap: space.xxs },
  detailValue: { ...type.money, fontSize: 16, lineHeight: 22, flexShrink: 1, maxWidth: '55%', textAlign: 'right' },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  fieldFocused: { borderColor: color.primary },
  fieldInvalid: { borderColor: color.danger },
  fieldDisabled: { backgroundColor: color.surfaceMuted, borderColor: color.border },
  fieldRupee: { ...type.subheading, fontSize: 20, lineHeight: 26, color: color.textSecondary },
  fieldInput: { flex: 1, minWidth: 0, height: '100%', ...type.subheading, fontSize: 20, lineHeight: 26, color: color.text, outlineWidth: 0, outlineStyle: 'none', padding: 0 },
});
