import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, Plus, X } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { Button, Card, EmptyState, IconButton, SectionHeader, SegmentedControl, StatusBadge } from '../../components/ds';
import HeritageHeader from '../../components/HeritageHeader';
import { useNavigate } from '../../lib/webRouter';
import { color, elevation, radii, space, type } from '../../theme';
import paymentService from '../services/paymentService';
import walletService from '../services/walletService';
import { HT } from '../theme';
import { Field, KeyValue, PageLoader } from '../components/dashboard/partnerUi';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerWallet.jsx
 * (/hotel/partner/wallet).
 *
 * Add money opens Razorpay checkout through paymentService.openCheckout
 * (WebView host) instead of react-razorpay. The web passes an undefined
 * `amount` to addMoney / verifyAddMoney (a ReferenceError, so its add-money
 * never worked); here it is the parsed amount the partner typed.
 */

const fmtDateTime = (value) =>
  new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const inr = (n) => n?.toLocaleString('en-IN');

const txnStatus = (st) =>
  st === 'completed'
    ? { tone: 'success', label: 'Success' }
    : st === 'pending'
      ? { tone: 'warning', label: 'Pending' }
      : { tone: 'danger', label: st ? st.charAt(0).toUpperCase() + st.slice(1) : 'Failed' };

// --- Transaction Item (Compact) ---
const TransactionItem = ({ txn, onPress, last }) => {
  const isCredit = txn.type === 'credit';
  const st = txnStatus(txn.status);

  return (
    <Press
      scale={1}
      onPress={onPress}
      accessibilityLabel={`${isCredit ? 'Credit' : 'Debit'} ${inr(txn.amount)} rupees, ${txn.description}, ${st.label}`}
      style={[styles.txnRow, !last && styles.txnDivider]}
    >
      <View style={[styles.txnIcon, { backgroundColor: isCredit ? color.successSoft : color.surfaceMuted }]}>
        {isCredit ? <ArrowDownLeft size={18} color={color.success} /> : <ArrowUpRight size={18} color={color.textSecondary} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={2} style={styles.txnTitle}>
          {txn.description}
        </Text>
        <Text numberOfLines={1} style={styles.txnDate}>
          {isCredit ? 'Credit' : 'Debit'} · {fmtDateTime(txn.createdAt)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: space.xs }}>
        <Text style={[styles.txnAmount, { color: isCredit ? color.success : color.text }]}>
          {isCredit ? '+' : '−'}₹{inr(txn.amount)}
        </Text>
        <StatusBadge label={st.label} tone={st.tone} />
      </View>
    </Press>
  );
};

const StatCard = ({ label, value }) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
  </View>
);

const PartnerWallet = () => {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const [wallet, setWallet] = useState(null);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [bankDetailsInput, setBankDetailsInput] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
  });

  // Modal States
  const [activeModal, setActiveModal] = useState(null); // 'withdraw' | 'add_money' | null
  const [amountInput, setAmountInput] = useState('');

  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [walletRes, statsRes, txnRes] = await Promise.all([
        walletService.getWallet({ viewAs: 'partner' }),
        walletService.getWalletStats({ viewAs: 'partner' }),
        walletService.getTransactions({ limit: 10, viewAs: 'partner' }),
      ]);

      setWallet(walletRes.wallet);
      setStats(statsRes.stats);
      setTransactions(txnRes.transactions);
    } catch (err) {
      console.error('Error fetching wallet:', err);
      setError(err.response?.data?.message || 'Failed to load wallet data');
      toast.error('Failed to load wallet details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const handleTransaction = async () => {
    try {
      if (activeModal === 'withdraw') {
        // Check if bank details exist
        if (!wallet?.bankDetails?.accountNumber) {
          const { accountNumber, ifscCode, accountHolderName, bankName } = bankDetailsInput;
          if (!accountNumber || !ifscCode || !accountHolderName || !bankName) {
            toast.error('Please fill all bank details');
            return;
          }
          if (accountHolderName.trim().length < 3) {
            toast.error('Account holder name must be at least 3 characters');
            return;
          }
          if (!/^[0-9]{9,18}$/.test(accountNumber)) {
            toast.error('Enter a valid account number (9-18 digits)');
            return;
          }
          if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
            toast.error('Enter a valid IFSC code');
            return;
          }
          if (bankName.trim().length < 2) {
            toast.error('Enter a valid bank name');
            return;
          }
          await walletService.updateBankDetails(bankDetailsInput);
          toast.success('Bank details saved!');
          fetchWalletData();
          return;
        }

        const amount = parseFloat(amountInput);
        if (!amount || amount <= 0) {
          toast.error('Please enter a valid amount');
          return;
        }

        if (amount < 500) {
          toast.error('Minimum withdrawal is ₹500');
          return;
        }
        if (amount > wallet?.balance) {
          toast.error('Insufficient balance');
          return;
        }

        await walletService.requestWithdrawal(amount);
        toast.success('Withdrawal successful (Test Simulation)');
        setActiveModal(null);
        setAmountInput('');
        fetchWalletData();
      } else if (activeModal === 'add_money') {
        const amount = parseFloat(amountInput);

        // 1. Create Order
        const { order } = await walletService.addMoney(amount);

        // 2. Open Razorpay
        const options = {
          key: order.key,
          amount: order.amount,
          currency: order.currency,
          name: 'Dima Hasao Partner',
          description: 'Wallet Top-up',
          order_id: order.id,
          prefill: {
            name: 'Partner',
            contact: '',
          },
          theme: {
            color: HT.primary,
          },
        };

        let response;
        try {
          response = await paymentService.openCheckout(options);
        } catch (payError) {
          // Closing checkout is not an error; the modal stays open as on the web.
          if (payError?.message !== 'Payment cancelled by user') toast.error(payError?.message || 'Transaction failed');
          return;
        }

        try {
          // 3. Verify Payment
          await walletService.verifyAddMoney({
            ...response,
            amount, // Pass amount for reference
          });
          toast.success('Money added successfully!');
          setActiveModal(null);
          setAmountInput('');
          fetchWalletData();
        } catch (err) {
          toast.error('Payment verification failed');
          console.error(err);
        }
        return; // Don't close modal immediately, let the verification do it
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Transaction failed');
    }
  };

  if (loading) {
    return (
      <View style={styles.fill}>
        <HeritageHeader title="Wallet" onBack={() => navigate(-1)} />
        <PageLoader />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.fill}>
        <HeritageHeader title="Wallet" onBack={() => navigate(-1)} />
        <View style={[styles.fill, styles.center, { padding: space.xxl }]}>
          <EmptyState icon={AlertCircle} title="Connection error" message={error} actionLabel="Retry" onAction={fetchWalletData} />
        </View>
      </View>
    );
  }

  // Modal Content Helper
  const isWithdraw = activeModal === 'withdraw';
  // Logic: If in withdraw mode AND bank details (accountNumber) are missing, show bank form
  const showBankForm = isWithdraw && !wallet?.bankDetails?.accountNumber;
  const amountNum = Number(amountInput);
  const disabled = showBankForm
    ? !bankDetailsInput.accountNumber || !bankDetailsInput.ifscCode
    : !amountInput ||
      (activeModal === 'withdraw' && (amountNum < 500 || amountNum > (wallet?.balance || 0))) ||
      (activeModal === 'add_money' && amountNum < 10);

  const closeModal = () => setActiveModal(null);
  const setBank = (patch) => setBankDetailsInput((b) => ({ ...b, ...patch }));

  const balance = Number(wallet?.balance || 0);
  const owes = balance < 0;

  return (
    <View style={styles.fill}>
      <HeritageHeader title="Wallet" onBack={() => navigate(-1)} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxxl + insets.bottom }}>
        {/* --- Balance --- */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>{owes ? 'Balance due' : 'Available balance'}</Text>
            {owes ? <StatusBadge label="Due" tone="danger" /> : null}
          </View>
          <Text style={[styles.heroAmount, owes && { color: color.dangerSoft }]} numberOfLines={1} adjustsFontSizeToFit accessibilityLabel={owes ? `Due ${Math.abs(balance)} rupees` : `${balance} rupees available`}>
            {owes ? '−' : ''}₹{Math.abs(balance).toLocaleString('en-IN')}
          </Text>
          {owes ? <Text style={styles.heroNote}>You owe this amount to the platform.</Text> : null}

          <View style={styles.heroActions}>
            <Button title="Add money" icon={Plus} variant="gold" onPress={() => setActiveModal('add_money')} style={{ flex: 1 }} />
            <Press onPress={() => setActiveModal('withdraw')} accessibilityLabel="Withdraw" style={styles.heroGhost}>
              <ArrowUpRight size={18} color={color.textInverse} />
              <Text style={[type.button, { color: color.textInverse }]}>Withdraw</Text>
            </Press>
          </View>
        </View>

        {/* --- Toggle --- */}
        <SegmentedControl
          options={[
            { value: 'transactions', label: 'Transactions' },
            { value: 'analytics', label: 'Analytics' },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />

        <View style={{ maxWidth: 512, width: '100%', alignSelf: 'center' }}>
          {activeTab === 'transactions' ? (
            <>
              <SectionHeader title="Recent activity" />
              {transactions.length > 0 ? (
                <Card padded={false}>
                  {transactions.map((txn, idx) => (
                    <TransactionItem key={txn._id || idx} txn={txn} last={idx === transactions.length - 1} onPress={() => setSelectedTxn(txn)} />
                  ))}
                </Card>
              ) : (
                <Card>
                  <EmptyState icon={Clock} title="No recent transactions" style={{ paddingVertical: space.xxl }} />
                </Card>
              )}
            </>
          ) : (
            <View style={{ gap: space.md }}>
              <SectionHeader title="Performance stats" style={{ marginBottom: 0 }} />

              <View style={styles.grid}>
                <StatCard label="Total earnings" value={`₹${inr(stats?.totalEarnings) || 0}`} />
                <StatCard label="This month" value={`₹${inr(stats?.thisMonthEarnings) || 0}`} />
                <StatCard label="Withdrawals" value={`₹${inr(stats?.totalWithdrawals) || 0}`} />
                <StatCard label="Transactions" value={String(stats?.transactionCount || 0)} />
              </View>

              <View style={styles.pending}>
                <View style={styles.pendingIcon}>
                  <Clock size={20} color={color.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statLabel}>Pending clearance</Text>
                  <Text style={styles.statValue}>₹{inr(stats?.pendingClearance) || 0}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal for Withdraw / Add Money */}
      <BottomSheet visible={Boolean(activeModal)} onClose={closeModal} backdrop={color.overlay} panelStyle={styles.sheetPanel}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false} style={styles.modal} contentContainerStyle={{ padding: space.xl, paddingBottom: space.xl + insets.bottom }}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>{showBankForm ? 'Add bank details' : activeModal === 'withdraw' ? 'Withdraw funds' : 'Add money'}</Text>
              <IconButton icon={X} label="Close" variant="soft" onPress={closeModal} />
            </View>

            <Text style={styles.modalHint}>
              {showBankForm
                ? 'We need your bank details to process payouts via Razorpay.'
                : activeModal === 'withdraw'
                  ? 'Transfer funds directly to your verified bank account.'
                  : 'Add funds to your wallet using UPI or Cards.'}
            </Text>

            <View style={{ marginBottom: space.lg }}>
              {showBankForm ? (
                <View style={{ gap: space.md }}>
                  <Field label="Account holder name" placeholder="As on your bank account" value={bankDetailsInput.accountHolderName} onChangeText={(v) => setBank({ accountHolderName: v })} />
                  <Field label="Account number" placeholder="9–18 digits" keyboardType="number-pad" value={bankDetailsInput.accountNumber} onChangeText={(v) => setBank({ accountNumber: v })} />
                  <Field label="IFSC code" placeholder="e.g. SBIN0001234" autoCapitalize="characters" value={bankDetailsInput.ifscCode} onChangeText={(v) => setBank({ ifscCode: v.toUpperCase() })} />
                  <Field label="Bank name" placeholder="e.g. State Bank of India" value={bankDetailsInput.bankName} onChangeText={(v) => setBank({ bankName: v })} />
                </View>
              ) : (
                <>
                  <Field
                    label="Amount (₹)"
                    autoFocus
                    keyboardType="decimal-pad"
                    value={amountInput}
                    onChangeText={setAmountInput}
                    placeholder="0"
                    inputStyle={styles.amountInput}
                  />

                  {/* Inline Validation */}
                  <View style={{ marginTop: space.sm }}>
                    {activeModal === 'withdraw' &&
                      (!amountInput ? (
                        <View style={styles.between}>
                          <Text style={[styles.valText, { color: color.textMuted }]}>Min. withdrawal: ₹500</Text>
                          <Text style={[styles.valText, { color: owes ? color.danger : color.primary }]}>Available: ₹{wallet?.balance}</Text>
                        </View>
                      ) : amountNum < 500 ? (
                        <View style={styles.valRow}>
                          <AlertCircle size={14} color={color.danger} />
                          <Text style={[styles.valText, { color: color.danger }]}>Minimum withdrawal is ₹500</Text>
                        </View>
                      ) : amountNum > (wallet?.balance || 0) ? (
                        <View style={styles.between}>
                          <View style={styles.valRow}>
                            <AlertCircle size={14} color={color.danger} />
                            <Text style={[styles.valText, { color: color.danger }]}>Insufficient balance</Text>
                          </View>
                          <StatusBadge label={`Max: ₹${wallet?.balance}`} tone="danger" />
                        </View>
                      ) : (
                        <View style={styles.valRow}>
                          <CheckCircle2 size={14} color={color.success} />
                          <Text style={[styles.valText, { color: color.success }]}>Valid for withdrawal</Text>
                        </View>
                      ))}

                    {activeModal === 'add_money' &&
                      (!amountInput ? (
                        <Text style={[styles.valText, { color: color.textMuted }]}>Min. amount: ₹10</Text>
                      ) : amountNum < 10 ? (
                        <View style={styles.valRow}>
                          <AlertCircle size={14} color={color.danger} />
                          <Text style={[styles.valText, { color: color.danger }]}>Minimum amount is ₹10</Text>
                        </View>
                      ) : (
                        <View style={styles.valRow}>
                          <CheckCircle2 size={14} color={color.success} />
                          <Text style={[styles.valText, { color: color.success }]}>Valid amount</Text>
                        </View>
                      ))}
                  </View>
                </>
              )}
            </View>

            <Button size="lg" title={showBankForm ? 'Save bank details' : 'Proceed securely'} onPress={handleTransaction} disabled={disabled} />
          </ScrollView>
        </KeyboardAvoidingView>
      </BottomSheet>

      {/* --- Transaction Detail Sheet --- */}
      <BottomSheet visible={Boolean(selectedTxn)} onClose={() => setSelectedTxn(null)} backdrop={color.overlay} panelStyle={styles.sheetPanel}>
        {selectedTxn ? (
          <View style={[styles.detail, { paddingBottom: space.xxl + insets.bottom }]}>
            <View style={styles.handle} />

            <View style={{ alignItems: 'center', marginBottom: space.xl, gap: space.xs }}>
              <View style={[styles.detailIcon, { backgroundColor: selectedTxn.type === 'credit' ? color.successSoft : color.surfaceMuted }]}>
                {selectedTxn.type === 'credit' ? <ArrowDownLeft size={28} color={color.success} /> : <ArrowUpRight size={28} color={color.textSecondary} />}
              </View>
              <Text style={[styles.detailAmount, { color: selectedTxn.type === 'credit' ? color.success : color.text }]}>
                {selectedTxn.type === 'credit' ? '+' : '−'}₹{inr(selectedTxn.amount)}
              </Text>
              <Text style={[type.small, { color: color.textMuted }]}>{selectedTxn.type === 'credit' ? 'Credit' : 'Debit'}</Text>
              <StatusBadge label={selectedTxn.status ? txnStatus(selectedTxn.status).label : 'Success'} tone={selectedTxn.status ? txnStatus(selectedTxn.status).tone : 'success'} />
            </View>

            <View style={styles.detailBox}>
              <KeyValue label="Description" value={<Text style={styles.detailDesc}>{selectedTxn.description}</Text>} />
              <KeyValue label="Date & time" value={fmtDateTime(selectedTxn.createdAt)} />
              <KeyValue label="Transaction ID" value={`#${selectedTxn._id?.slice(-8).toUpperCase()}`} valueStyle={styles.detailMono} />
              {selectedTxn.referenceId ? <KeyValue label="Reference" value={`#${selectedTxn.referenceId}`} valueStyle={[styles.detailMono, { flexShrink: 1 }]} /> : null}
            </View>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  hero: { backgroundColor: color.primaryDeep, borderRadius: radii.xl, padding: space.xl, gap: space.xs, ...elevation.card },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  heroLabel: { ...type.label, color: color.textOnDarkMuted },
  heroAmount: { ...type.priceLg, fontSize: 36, lineHeight: 44, color: color.textInverse },
  heroNote: { ...type.small, color: color.textOnDarkMuted },
  heroActions: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  heroGhost: { flex: 1, height: 48, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },

  txnRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg, minHeight: 64 },
  txnDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  txnIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txnTitle: { ...type.bodyStrong, color: color.text },
  txnDate: { ...type.caption, color: color.textMuted, marginTop: space.xxs },
  txnAmount: { ...type.bodyStrong, fontSize: 15 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  statCard: { width: '47%', flexGrow: 1, backgroundColor: color.surface, padding: space.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, gap: space.xs },
  statLabel: { ...type.label, color: color.textSecondary },
  statValue: { ...type.price, fontSize: 20, lineHeight: 28, color: color.text },
  pending: { flexDirection: 'row', alignItems: 'center', gap: space.lg, backgroundColor: color.warningSoft, padding: space.lg, borderRadius: radii.lg },
  pendingIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },

  sheetPanel: { width: '100%' },
  modal: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, ...elevation.sheet },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs },
  modalTitle: { ...type.heading, color: color.text, flex: 1 },
  modalHint: { ...type.small, color: color.textMuted, marginBottom: space.xl },
  amountInput: { ...type.priceLg, minHeight: 56 },
  valText: { ...type.caption },
  valRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },

  detail: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: space.xl, ...elevation.sheet },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, alignSelf: 'center', marginBottom: space.xl },
  detailIcon: { width: 56, height: 56, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  detailAmount: { ...type.priceLg },
  detailBox: { backgroundColor: color.surfaceMuted, borderRadius: radii.lg, padding: space.lg, gap: space.sm },
  detailDesc: { ...type.bodyStrong, color: color.text, flex: 1, textAlign: 'right' },
  detailMono: { ...type.small, color: color.textSecondary, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
});

export default PartnerWallet;
