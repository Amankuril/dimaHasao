import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Gift, History, Plus } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { initRazorpayPayment } from '../../../lib/razorpay';
import { localStore } from '../../../lib/storage';
import { tw } from '../../../theme';
import { getReferralSettingsContent } from '../../api/accountApi';
import { userAuthService } from '../../services/authService';
import { useSettings } from '../../context/SettingsContext';
import { fo, goBack, useHeaderTop } from '../ui';

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
  const top = useHeaderTop();
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

  return (
    <View style={[st.flex, { backgroundColor: tw.slate50 }]}>
      <View style={[st.header, { paddingTop: top }]}>
        <Press onPress={() => goBack()} accessibilityLabel="Back" style={st.back}>
          <ArrowLeft size={18} color={tw.slate900} />
        </Press>
        <Text style={st.title}>My Wallet</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 112 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <View style={st.balanceCard}>
            <View style={{ gap: 4 }}>
              <Text style={st.avail}>Available Balance</Text>
              <Text style={st.balance}>
                ₹ {walletLoading ? '0' : balanceText.whole}
                <Text style={st.decimals}>.{walletLoading ? '00' : balanceText.decimals}</Text>
              </Text>
              {walletError ? <Text style={st.err}>{walletError}</Text> : null}
              {gateway && !canTopUp ? <Text style={st.warn}>{gatewayLabel} is active, but wallet top-up is not available for it yet.</Text> : null}
            </View>
            <Press
              onPress={() => { setWalletError(''); setShowAdd(true); }}
              disabled={!canTopUp}
              scale={0.95}
              style={[st.addBtn, !canTopUp && { backgroundColor: tw.slate100, boxShadow: 'none' }]}
            >
              <Plus size={16} color={canTopUp ? tw.slate900 : tw.slate400} strokeWidth={2.5} />
              <Text style={[st.addText, !canTopUp && { color: tw.slate400 }]}>Add Money</Text>
            </Press>
          </View>
        </View>

        {showReferralBanner ? (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Press onPress={() => router.push('/taxi/user/referral')} scale={0.98} style={st.refer}>
              <View style={st.referIcon}><Gift size={20} color="#fff" /></View>
              <View style={st.flex}>
                <Text style={st.referTitle}>Refer & Earn <Text style={{ color: tw.emerald600, ...fo(800) }}>  ₹{referral.amount}</Text></Text>
                <Text style={st.referSub}>Invite friends to {appName}</Text>
              </View>
              <ArrowLeft size={18} color={tw.slate900} style={{ transform: [{ rotate: '180deg' }] }} />
            </Press>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 20, marginTop: 40 }}>
          <View style={st.histHead}>
            <Text style={st.histTitle}>Transaction History</Text>
            <Press onPress={() => router.push('/taxi/user/activity')}><Text style={st.viewAll}>View All</Text></Press>
          </View>
          <View style={st.list}>
            {walletLoading ? (
              <Text style={st.listEmpty}>Loading transactions...</Text>
            ) : txs.length ? (
              txs.map((tx, i) => {
                const debit = tx.kind === 'debit';
                const when = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                return (
                  <View key={tx.id ?? i} style={[st.tx, i > 0 && { borderTopWidth: 1, borderTopColor: tw.slate50 }]}>
                    <View style={[st.txIcon, { backgroundColor: debit ? tw.slate50 : tw.emerald50 }]}>
                      {debit
                        ? <ArrowLeft size={16} color={tw.slate600} style={{ transform: [{ rotate: '45deg' }] }} />
                        : <Plus size={16} color={tw.emerald600} />}
                    </View>
                    <View style={st.flex}>
                      <Text style={st.txTitle} numberOfLines={1}>{tx.title || (debit ? 'Debit' : 'Credit')}</Text>
                      <Text style={st.txDate}>{when}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[st.txAmt, { color: debit ? tw.slate900 : tw.emerald600 }]}>{debit ? '-' : '+'}₹{formatInr(tx.amount)}</Text>
                      <Text style={[st.txKind, { color: debit ? tw.slate400 : tw.emerald400 }]}>{debit ? 'Debit' : 'Credit'}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={st.listEmpty}>No transactions yet</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.modalWrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowAdd(false)} accessibilityLabel="Close" />
          <View style={st.sheet}>
            <Press onPress={() => setShowAdd(false)} accessibilityLabel="Close" style={st.close}>
              <Plus size={20} color={tw.slate400} style={{ transform: [{ rotate: '45deg' }] }} />
            </Press>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={st.sheetTitle}>Add Money</Text>
              <Text style={st.sheetSub}>{gateway ? `Top-up via ${gatewayLabel}` : 'Select amount to top-up'}</Text>
            </View>
            {isSuccess ? (
              <View style={{ alignItems: 'center', paddingVertical: 32, gap: 16 }}>
                <View style={st.okIcon}><History size={32} color={tw.emerald600} /></View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, color: tw.slate900, ...fo(700) }}>Wallet Refilled!</Text>
                  <Text style={{ fontSize: 12, color: tw.slate400, marginTop: 4, ...fo(500) }}>Balance updated successfully</Text>
                </View>
              </View>
            ) : (
              <View style={{ gap: 32 }}>
                <View style={{ justifyContent: 'center' }}>
                  <Text style={st.rupee}>₹</Text>
                  <TextInput
                    value={amount}
                    onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={tw.slate200}
                    style={st.amountInput}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {['100', '500', '1000'].map((v) => (
                    <Press key={v} onPress={() => setAmount(v)} style={[st.chip, amount === v && { backgroundColor: tw.slate900, borderColor: tw.slate900 }]}>
                      <Text style={[st.chipText, { color: amount === v ? '#fff' : tw.slate600 }]}>+₹{v}</Text>
                    </Press>
                  ))}
                </View>
                <Press onPress={handleAddMoney} disabled={isAdding || !amount} style={[st.refill, (isAdding || !amount) && { backgroundColor: tw.slate100 }]}>
                  {isAdding ? <ActivityIndicator color={tw.slate400} /> : null}
                  <Text style={[st.refillText, (isAdding || !amount) && { color: tw.slate400 }]}>{isAdding ? 'Processing...' : 'Refill Wallet'}</Text>
                  {!isAdding ? <Plus size={18} color={!amount ? tw.slate400 : '#fff'} /> : null}
                </Press>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1 },
  header: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: tw.slate100, boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' },
  back: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, color: tw.slate900, ...fo(900) },
  balanceCard: { borderRadius: 24, padding: 32, gap: 32, backgroundColor: '#FFFDF0', borderWidth: 1, borderColor: 'rgba(254,249,194,0.7)', boxShadow: '0 20px 25px -5px rgba(113,63,18,0.05)' },
  avail: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tw.slate500, ...fo(700) },
  balance: { fontSize: 30, color: tw.slate900, ...fo(900) },
  decimals: { fontSize: 20, color: tw.slate500 },
  err: { fontSize: 12, color: tw.rose400, marginTop: 8, ...fo(700) },
  warn: { fontSize: 12, color: tw.amber300, marginTop: 8, ...fo(700) },
  addBtn: { height: 48, borderRadius: 12, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  addText: { fontSize: 14, color: tw.slate900, ...fo(700) },
  refer: { borderRadius: 24, borderWidth: 1, borderColor: tw.yellow200, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#FEF9C3', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  referIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#6D5BF0', alignItems: 'center', justifyContent: 'center' },
  referTitle: { fontSize: 14, color: tw.slate900, ...fo(700) },
  referSub: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tw.slate500, marginTop: 2, ...fo(700) },
  histHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 },
  histTitle: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tw.slate400, ...fo(700) },
  viewAll: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tw.slate900, ...fo(700) },
  list: { borderRadius: 24, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' },
  listEmpty: { padding: 32, textAlign: 'center', fontSize: 12, color: tw.slate400, ...fo(700) },
  tx: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontSize: 14, color: tw.slate900, ...fo(700) },
  txDate: { fontSize: 10, textTransform: 'uppercase', color: tw.slate400, marginTop: 2, ...fo(700) },
  txAmt: { fontSize: 16, ...fo(700) },
  txKind: { fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', ...fo(700) },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,6,24,0.4)', padding: 16 },
  sheet: { borderRadius: 24, backgroundColor: '#fff', padding: 32, paddingBottom: 40, gap: 32, boxShadow: '0 25px 50px -12px rgba(15,23,42,0.1)' },
  close: { position: 'absolute', top: 24, right: 24, width: 40, height: 40, borderRadius: 20, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  sheetTitle: { fontSize: 20, color: tw.slate900, ...fo(700) },
  sheetSub: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tw.slate400, ...fo(700) },
  okIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: tw.emerald50, alignItems: 'center', justifyContent: 'center' },
  rupee: { position: 'absolute', left: 24, zIndex: 2, fontSize: 20, color: tw.slate400, ...fo(700) },
  amountInput: { height: 64, backgroundColor: tw.slate50, borderWidth: 1, borderColor: tw.slate100, borderRadius: 16, paddingLeft: 48, paddingRight: 24, fontSize: 24, textAlign: 'center', color: tw.slate900, ...fo(700) },
  chip: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: tw.slate50, borderWidth: 1, borderColor: tw.slate100 },
  chipText: { fontSize: 14, ...fo(700) },
  refill: { height: 56, borderRadius: 16, backgroundColor: tw.slate900, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  refillText: { fontSize: 16, color: '#fff', ...fo(700) },
});
