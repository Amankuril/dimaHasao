import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Modal, Pressable, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, ChevronRight, Gift, History, Info, Plus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, EmptyState, IconButton, SectionHeader, StatusBadge } from '../../../components/ds';
import { initRazorpayPayment } from '../../../lib/razorpay';
import { localStore } from '../../../lib/storage';
import { color, elevation, radii, space, tone, type } from '../../../theme';
import { getReferralSettingsContent } from '../../api/accountApi';
import { userAuthService } from '../../services/authService';
import { useSettings } from '../../context/SettingsContext';
import { LoadingState, PageTitle, goBack, useNavPad } from '../ui';

// Web: Taxi/modules/user/pages/Wallet.jsx (/taxi/user/wallet)

const formatInr = (value) => {
  const fixed = Math.round(Number(value || 0) * 100) / 100;
  return fixed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const splitMoney = (formatted) => {
  const [whole, decimals = '00'] = String(formatted).split('.');
  return { whole, decimals: (decimals || '00').padEnd(2, '0').slice(0, 2) };
};

const readWallet = (data = {}) => ({
  balance: Number(data.balance || 0),
  currency: data.currency || 'INR',
  recentTransactions: Array.isArray(data.recentTransactions) ? data.recentTransactions : [],
});

export default function Wallet() {
  const insets = useSafeAreaInsets();
  const bottomPad = useNavPad(space.xxl);
  const { settings } = useSettings();
  const appName = settings.general?.app_name || 'App';
  const gateway = settings.paymentGateway || null;

  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState('');
  const [wallet, setWallet] = useState({ balance: 0, currency: 'INR', recentTransactions: [] });
  const [referral, setReferral] = useState({ enabled: false, amount: 0 });

  useEffect(() => {
    let active = true;
    getReferralSettingsContent('user')
      .then((r) => {
        if (!active) return;
        const p = r?.data?.data || r?.data || r || {};
        setReferral({ enabled: Boolean(p.enabled), amount: Number(p.amount || 0) });
      })
      .catch(() => active && setReferral({ enabled: false, amount: 0 }));
    return () => { active = false; };
  }, []);

  const showReferralBanner = referral.enabled && referral.amount > 0;
  const balanceText = useMemo(() => splitMoney(formatInr(wallet.balance)), [wallet.balance]);
  const gatewayLabel = gateway?.label || 'payment gateway';
  const supportsTopUp = gateway?.supportsWalletTopUp === true;
  const mode = gateway?.walletTopUpMode || '';
  const canTopUp = supportsTopUp && ['razorpay_checkout', 'phonepe_redirect'].includes(mode);

  const refreshWallet = useCallback(async () => {
    setWalletError('');
    setWalletLoading(true);
    try {
      const res = await userAuthService.getWallet();
      setWallet(readWallet(res?.data || {}));
    } catch (e) {
      setWalletError(e?.message || 'Failed to load wallet');
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => { refreshWallet(); }, [refreshWallet]);

  const handleAddMoney = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    setIsAdding(true);
    setWalletError('');
    try {
      if (!gateway) throw new Error('No payment gateway is enabled by admin right now.');
      if (!supportsTopUp || !canTopUp) throw new Error(`${gatewayLabel} is enabled by admin, but wallet top-up is not implemented for it yet.`);

      if (mode === 'phonepe_redirect') {
        const res = await userAuthService.createPhonePeWalletTopupOrder(value);
        const session = res?.data || {};
        if (!session.checkoutUrl) throw new Error('Unable to start PhonePe payment');
        await Linking.openURL(session.checkoutUrl);
        setIsAdding(false);
        return;
      }

      const orderRes = await userAuthService.createWalletTopupOrder(value);
      const order = orderRes?.data || {};
      if (!order.keyId || !order.orderId) throw new Error('Unable to start payment');

      let info = {};
      try {
        info = JSON.parse(localStore.getItem('userInfo') || '{}') || {};
      } catch {
        info = {};
      }

      await initRazorpayPayment({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: appName,
        description: 'Wallet Topup',
        order_id: order.orderId,
        prefill: { name: info?.name || '', email: info?.email || '', contact: info?.phone ? `+91${info.phone}` : '' },
        themeColor: '#E85D04',
        onClose: () => setIsAdding(false),
        onError: (event) => {
          setWalletError(event?.error?.description || event?.error?.reason || event?.description || 'Payment failed');
          setIsAdding(false);
        },
        handler: async (response) => {
          try {
            const v = await userAuthService.verifyWalletTopup(response);
            setWallet(readWallet(v?.data || {}));
            setIsSuccess(true);
            setTimeout(() => {
              setIsSuccess(false);
              setShowAdd(false);
              setAmount('');
            }, 1400);
          } catch (e) {
            setWalletError(e?.message || 'Payment verification failed');
          } finally {
            setIsAdding(false);
          }
        },
      });
    } catch (e) {
      setWalletError(e?.message || 'Topup failed');
      setIsAdding(false);
    }
  };

  const txs = wallet.recentTransactions || [];
  const openAdd = () => { setWalletError(''); setShowAdd(true); };

  const header = (
    <View style={{ gap: space.md }}>
        <Card style={st.balanceCard}>
          <View style={{ gap: space.xs }} accessible accessibilityLabel={`Available balance ₹${walletLoading ? '0' : balanceText.whole}.${walletLoading ? '00' : balanceText.decimals}`}>
            <Text style={[type.label, { color: color.textMuted }]}>Available balance</Text>
            {walletLoading ? (
              <View style={st.balanceLoading}>
                <ActivityIndicator color={color.primary} />
                <Text style={[type.small, { color: color.textMuted }]}>Loading balance...</Text>
              </View>
            ) : (
              <Text style={[type.priceLg, { color: color.text }]}>
                ₹{balanceText.whole}
                <Text style={[type.price, { color: color.textMuted }]}>.{balanceText.decimals}</Text>
              </Text>
            )}
          </View>
          {walletError ? (
            <View style={[st.notice, { backgroundColor: color.dangerSoft }]}>
              <AlertCircle size={16} color={color.danger} />
              <Text style={[type.small, st.noticeText, { color: color.danger }]}>{walletError}</Text>
            </View>
          ) : null}
          {gateway && !canTopUp ? (
            <View style={[st.notice, { backgroundColor: color.warningSoft }]}>
              <Info size={16} color={color.warning} />
              <Text style={[type.small, st.noticeText, { color: color.warning }]}>{gatewayLabel} is active, but wallet top-up is not available for it yet.</Text>
            </View>
          ) : null}
          <Button title="Add money" icon={Plus} onPress={openAdd} disabled={!canTopUp} />
        </Card>

        {showReferralBanner ? (
          <Card onPress={() => router.push('/taxi/user/referral')} accessibilityLabel={`Refer and earn ₹${referral.amount}. Invite friends to ${appName}`} style={st.refer}>
            <View style={st.referIcon}>
              <Gift size={20} color={color.goldText} />
            </View>
            <View style={st.grow}>
              <View style={st.referHead}>
                <Text style={[type.subheading, { color: color.text }]}>Refer & earn</Text>
                <StatusBadge label={`₹${referral.amount}`} tone="gold" />
              </View>
              <Text style={[type.small, { color: color.textMuted }]} numberOfLines={2}>
                Invite friends to {appName}
              </Text>
            </View>
            <ChevronRight size={20} color={color.textDisabled} />
          </Card>
        ) : null}

        <View style={{ marginTop: space.md }}>
          <SectionHeader title="Transaction history" action="View all" onAction={() => router.push('/taxi/user/activity')} />
        </View>
    </View>
  );

  const renderTx = ({ item: tx, index: i }) => {
    const debit = tx.kind === 'debit';
    const when = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const t = debit ? tone.danger : tone.success;
    const last = i === txs.length - 1;
    return (
      <View
        style={[st.tx, i === 0 && st.txFirst, last && st.txLast, i > 0 && st.txDivider]}
        accessible
        accessibilityLabel={`${tx.title || (debit ? 'Debit' : 'Credit')}, ${debit ? 'debit' : 'credit'} ₹${formatInr(tx.amount)}${when ? `, ${when}` : ''}`}
      >
        <View style={[st.txIcon, { backgroundColor: t.bg }]}>
          {debit ? <ArrowUpRight size={18} color={t.fg} /> : <ArrowDownLeft size={18} color={t.fg} />}
        </View>
        <View style={st.grow}>
          <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={2}>{tx.title || (debit ? 'Debit' : 'Credit')}</Text>
          {when ? <Text style={[type.caption, { color: color.textMuted }]}>{when}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: space.xxs }}>
          <Text style={[type.bodyStrong, { color: t.fg }]}>{debit ? '-' : '+'}₹{formatInr(tx.amount)}</Text>
          <Text style={[type.caption, { color: t.fg }]}>{debit ? 'Debit' : 'Credit'}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={st.flex}>
      <PageTitle title="My wallet" subtitle="Balance and transactions" onBack={() => goBack()} />

      <FlatList
        data={walletLoading ? [] : txs}
        keyExtractor={(tx, i) => String(tx.id ?? i)}
        renderItem={renderTx}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Card padded={false} style={st.listEmpty}>
            {walletLoading ? (
              <LoadingState label="Loading transactions..." style={{ paddingVertical: space.xxl }} />
            ) : (
              <EmptyState icon={History} title="No transactions yet" message="Top-ups, ride payments and refunds will appear here." />
            )}
          </Card>
        }
        contentContainerStyle={[st.content, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.modalWrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowAdd(false)} accessibilityLabel="Close" />
          <View style={[st.sheet, { paddingBottom: space.xxl + insets.bottom }]}>
            <View style={st.sheetHead}>
              <View style={st.grow}>
                <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">Add money</Text>
                <Text style={[type.small, { color: color.textMuted }]}>{gateway ? `Top-up via ${gatewayLabel}` : 'Select amount to top-up'}</Text>
              </View>
              <IconButton icon={X} label="Close" variant="soft" onPress={() => setShowAdd(false)} />
            </View>
            {isSuccess ? (
              <View style={st.success}>
                <View style={st.okIcon}><CheckCircle2 size={32} color={color.success} /></View>
                <Text style={[type.heading, { color: color.text }]}>Wallet refilled!</Text>
                <Text style={[type.small, { color: color.textMuted }]}>Balance updated successfully</Text>
              </View>
            ) : (
              <View style={{ gap: space.lg }}>
                <View style={{ gap: space.xs + 2 }}>
                  <Text style={[type.label, { color: color.text }]}>Amount</Text>
                  <View style={st.amountBox}>
                    <Text style={[type.price, { color: color.textMuted }]}>₹</Text>
                    <TextInput
                      value={amount}
                      onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={color.textDisabled}
                      accessibilityLabel="Amount in rupees"
                      style={st.amountInput}
                    />
                  </View>
                </View>
                <View style={st.quickRow}>
                  {['100', '500', '1000'].map((v) => (
                    <Chip key={v} label={`+₹${v}`} selected={amount === v} onPress={() => setAmount(v)} style={st.quick} />
                  ))}
                </View>
                <Button title={isAdding ? 'Processing...' : 'Refill wallet'} size="lg" loading={isAdding} disabled={isAdding || !amount} onPress={handleAddMoney} />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  grow: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xs },
  balanceCard: { gap: space.lg, backgroundColor: color.goldSoft, borderColor: color.borderStrong },
  balanceLoading: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 32 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, padding: space.md, borderRadius: radii.md },
  noticeText: { flex: 1, minWidth: 0 },
  refer: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  referIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.goldSoft, alignItems: 'center', justifyContent: 'center' },
  referHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  tx: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 64, backgroundColor: color.surface, borderLeftWidth: 1, borderRightWidth: 1, borderColor: color.border },
  txFirst: { borderTopWidth: 1, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  txLast: { borderBottomWidth: 1, borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
  listEmpty: { overflow: 'hidden' },
  txDivider: { borderTopWidth: StyleSheet.hairlineWidth },
  txIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: color.overlay },
  sheet: { borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, backgroundColor: color.surface, padding: space.xxl, gap: space.xl, ...elevation.sheet },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  success: { alignItems: 'center', paddingVertical: space.xxl, gap: space.xs },
  okIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  amountBox: { height: 56, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  amountInput: { flex: 1, minWidth: 0, height: '100%', ...type.priceLg, color: color.text, outlineStyle: 'none' },
  quickRow: { flexDirection: 'row', gap: space.sm },
  quick: { flex: 1, justifyContent: 'center', height: 44 },
});
