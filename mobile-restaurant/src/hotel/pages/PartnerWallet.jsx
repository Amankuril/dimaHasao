import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, Menu, Plus } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { poppins, shadow, tw } from '../../theme';
import paymentService from '../services/paymentService';
import walletService from '../services/walletService';
import { HT } from '../theme';

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

// --- Transaction Item (Compact) ---
const TransactionItem = ({ txn, onPress }) => {
  const isCredit = txn.type === 'credit';
  const status =
    txn.status === 'completed'
      ? { bg: tw.green50, fg: tw.green700 }
      : txn.status === 'pending'
        ? { bg: tw.yellow50, fg: tw.yellow700 }
        : { bg: tw.red50, fg: tw.red600 };

  return (
    <Press scale={1} onPress={onPress} style={styles.txnRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, marginRight: 12 }}>
        <View style={[styles.txnIcon, { backgroundColor: isCredit ? '#E8F5E9' : '#F5F5F5' }]}>
          {isCredit ? (
            <ArrowDownLeft size={16} strokeWidth={2.5} color="#2E7D32" />
          ) : (
            <ArrowUpRight size={16} strokeWidth={2.5} color={tw.gray500} />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={styles.txnTitle}>{txn.description}</Text>
          <Text numberOfLines={1} style={styles.txnDate}>{fmtDateTime(txn.createdAt)}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.txnAmount, { color: isCredit ? '#2E7D32' : tw.slate900 }]}>
          {isCredit ? '+' : '-'}₹{inr(txn.amount)}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.fg }]}>{txn.status === 'completed' ? 'Success' : txn.status}</Text>
        </View>
      </View>
    </Press>
  );
};

const StatCard = ({ label, value }) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const PartnerWallet = () => {
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
      <View style={[styles.fill, styles.center, { backgroundColor: HT.bg }]}>
        <ActivityIndicator size="large" color={HT.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: HT.bg, padding: 24 }]}>
        <AlertCircle size={40} color={tw.red500} style={{ marginBottom: 12 }} />
        <Text style={styles.errTitle}>Connection Error</Text>
        <Press onPress={fetchWalletData} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Press>
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

  return (
    <View style={[styles.fill, { backgroundColor: '#fff' }]}>
      {/* --- Fixed Header Section --- */}
      <View style={[styles.hero, { paddingTop: 40 + insets.top }]}>
        <Text style={styles.heroLabel}>Available Balance</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 40 }}>
          <Text style={styles.heroRupee}>₹</Text>
          <Text style={styles.heroAmount}>{wallet?.balance?.toLocaleString('en-IN') || '0'}</Text>
        </View>

        <View style={styles.heroActions}>
          <Press onPress={() => setActiveModal('add_money')} style={[styles.heroBtn, { backgroundColor: '#fff' }, shadow('2xl')]}>
            <Plus size={16} strokeWidth={3} color={HT.primary} />
            <Text style={[styles.heroBtnText, { color: HT.primary }]}>Add Money</Text>
          </Press>
          <Press
            onPress={() => setActiveModal('withdraw')}
            style={[styles.heroBtn, { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}
          >
            <ArrowUpRight size={16} strokeWidth={3} color="#fff" />
            <Text style={[styles.heroBtnText, { color: '#fff' }]}>Withdraw</Text>
          </Press>
        </View>
      </View>

      {/* --- Fixed Toggle Pills --- */}
      <View style={styles.pillsWrap}>
        <View style={styles.pills}>
          {[
            ['transactions', 'Transactions'],
            ['analytics', 'Analytics'],
          ].map(([key, label]) => (
            <Press key={key} scale={1} onPress={() => setActiveTab(key)} style={[styles.pill, activeTab === key && styles.pillActive]}>
              <Text style={[styles.pillText, { color: activeTab === key ? '#fff' : tw.gray400 }]}>{label}</Text>
            </Press>
          ))}
        </View>
      </View>

      {/* --- Scrollable Content --- */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 96 + insets.bottom }}>
        <View style={{ maxWidth: 512, width: '100%', alignSelf: 'center' }}>
          {activeTab === 'transactions' ? (
            <>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <View style={{ gap: 4 }}>
                {transactions.length > 0 ? (
                  transactions.map((txn, idx) => <TransactionItem key={txn._id || idx} txn={txn} onPress={() => setSelectedTxn(txn)} />)
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 80, opacity: 0.5 }}>
                    <Clock size={40} color={tw.gray300} style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyText}>No recent transactions</Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <View style={{ gap: 16, paddingTop: 8 }}>
              <Text style={styles.sectionTitle}>Performance Stats</Text>

              <View style={styles.grid}>
                <StatCard label="Total Earnings" value={`₹${inr(stats?.totalEarnings) || 0}`} />
                <StatCard label="This Month" value={`₹${inr(stats?.thisMonthEarnings) || 0}`} />
                <StatCard label="Withdrawals" value={`₹${inr(stats?.totalWithdrawals) || 0}`} />
                <StatCard label="Transactions" value={String(stats?.transactionCount || 0)} />
              </View>

              <View style={styles.pending}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={styles.pendingIcon}>
                    <Clock size={20} color={HT.primary} />
                  </View>
                  <View>
                    <Text style={styles.pendingLabel}>Pending Clearance</Text>
                    <Text style={styles.statValue}>₹{inr(stats?.pendingClearance) || 0}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal for Withdraw / Add Money */}
      <BottomSheet visible={Boolean(activeModal)} onClose={closeModal} backdrop="rgba(0,0,0,0.6)" panelStyle={styles.sheetPanel}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modal, { paddingBottom: 32 + insets.bottom }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={styles.modalTitle}>
                {showBankForm ? 'Add Bank Details' : activeModal === 'withdraw' ? 'Withdraw Funds' : 'Add Money'}
              </Text>
              <Press onPress={closeModal} accessibilityLabel="Close" style={styles.modalClose}>
                <View style={{ transform: [{ rotate: '45deg' }] }}>
                  <Menu size={16} color={tw.gray400} />
                </View>
              </Press>
            </View>

            <Text style={styles.modalHint}>
              {showBankForm
                ? 'We need your bank details to process payouts via Razorpay.'
                : activeModal === 'withdraw'
                  ? 'Transfer funds directly to your verified bank account.'
                  : 'Add funds to your wallet using UPI or Cards.'}
            </Text>

            <View style={{ marginBottom: 8 }}>
              {showBankForm ? (
                <View style={{ gap: 12 }}>
                  <TextInput
                    placeholder="Account Holder Name"
                    placeholderTextColor={tw.gray400}
                    value={bankDetailsInput.accountHolderName}
                    onChangeText={(v) => setBank({ accountHolderName: v })}
                    style={styles.input}
                  />
                  <TextInput
                    placeholder="Account Number"
                    placeholderTextColor={tw.gray400}
                    value={bankDetailsInput.accountNumber}
                    onChangeText={(v) => setBank({ accountNumber: v })}
                    style={styles.input}
                  />
                  <TextInput
                    placeholder="IFSC Code"
                    placeholderTextColor={tw.gray400}
                    autoCapitalize="characters"
                    value={bankDetailsInput.ifscCode}
                    onChangeText={(v) => setBank({ ifscCode: v.toUpperCase() })}
                    style={styles.input}
                  />
                  <TextInput
                    placeholder="Bank Name"
                    placeholderTextColor={tw.gray400}
                    value={bankDetailsInput.bankName}
                    onChangeText={(v) => setBank({ bankName: v })}
                    style={styles.input}
                  />
                </View>
              ) : (
                <>
                  <Text style={styles.amountLabel}>Amount (₹)</Text>
                  <TextInput
                    autoFocus
                    keyboardType="decimal-pad"
                    value={amountInput}
                    onChangeText={setAmountInput}
                    placeholder="0"
                    placeholderTextColor={tw.gray300}
                    style={styles.amountInput}
                  />

                  {/* Inline Validation */}
                  <View style={{ marginTop: 8 }}>
                    {activeModal === 'withdraw' &&
                      (!amountInput ? (
                        <View style={styles.between}>
                          <Text style={[styles.valText, { color: tw.gray400 }]}>Min. withdrawal: ₹500</Text>
                          <Text style={[styles.valText, { color: HT.primary }]}>Available: ₹{wallet?.balance}</Text>
                        </View>
                      ) : amountNum < 500 ? (
                        <View style={styles.valRow}>
                          <AlertCircle size={12} color={tw.red500} />
                          <Text style={[styles.valText, { color: tw.red500 }]}>Minimum withdrawal is ₹500</Text>
                        </View>
                      ) : amountNum > (wallet?.balance || 0) ? (
                        <View style={styles.between}>
                          <View style={styles.valRow}>
                            <AlertCircle size={12} color={tw.red500} />
                            <Text style={[styles.valText, { color: tw.red500 }]}>Insufficient balance</Text>
                          </View>
                          <View style={{ backgroundColor: tw.red50, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, lineHeight: 15, color: tw.red500, ...poppins(500) }}>Max: ₹{wallet?.balance}</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.valRow}>
                          <CheckCircle2 size={12} color={tw.green600} />
                          <Text style={[styles.valText, { color: tw.green600 }]}>Valid for withdrawal</Text>
                        </View>
                      ))}

                    {activeModal === 'add_money' &&
                      (!amountInput ? (
                        <Text style={[styles.valText, { color: tw.gray400 }]}>Min. amount: ₹10</Text>
                      ) : amountNum < 10 ? (
                        <View style={styles.valRow}>
                          <AlertCircle size={12} color={tw.red500} />
                          <Text style={[styles.valText, { color: tw.red500 }]}>Minimum amount is ₹10</Text>
                        </View>
                      ) : (
                        <View style={styles.valRow}>
                          <CheckCircle2 size={12} color={tw.green600} />
                          <Text style={[styles.valText, { color: tw.green600 }]}>Valid amount</Text>
                        </View>
                      ))}
                  </View>
                </>
              )}
            </View>

            <Press
              onPress={handleTransaction}
              disabled={disabled}
              style={[styles.proceed, disabled ? { backgroundColor: tw.gray200 } : [{ backgroundColor: HT.primary }, shadow('0 10px 15px -3px rgba(10,77,43,0.2)')]]}
            >
              <Text style={[styles.proceedText, { color: disabled ? tw.gray400 : '#fff' }]}>
                {showBankForm ? 'Save Bank Details' : 'Proceed Securely'}
              </Text>
            </Press>
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>

      {/* --- Transaction Detail Sheet --- */}
      <BottomSheet visible={Boolean(selectedTxn)} onClose={() => setSelectedTxn(null)} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.sheetPanel}>
        {selectedTxn ? (
          <View style={[styles.detail, { paddingBottom: 48 + insets.bottom }]}>
            <View style={styles.handle} />

            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={[styles.detailIcon, { backgroundColor: selectedTxn.type === 'credit' ? tw.green50 : tw.gray50 }]}>
                {selectedTxn.type === 'credit' ? (
                  <ArrowDownLeft size={28} color={tw.green600} />
                ) : (
                  <ArrowUpRight size={28} color={tw.gray600} />
                )}
              </View>
              <Text style={styles.detailAmount}>
                {selectedTxn.type === 'credit' ? '+' : '-'}₹{inr(selectedTxn.amount)}
              </Text>
              <Text style={styles.detailStatus}>{selectedTxn.status || 'Success'}</Text>
            </View>

            <View style={styles.detailBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <Text style={[styles.detailKey, { marginTop: 2 }]}>Description</Text>
                <Text style={styles.detailDesc}>{selectedTxn.description}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Date & Time</Text>
                <Text style={styles.detailVal}>{fmtDateTime(selectedTxn.createdAt)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Transaction ID</Text>
                <Text style={styles.detailMono}>#{selectedTxn._id?.slice(-8).toUpperCase()}</Text>
              </View>
              {selectedTxn.referenceId ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Reference</Text>
                  <Text style={[styles.detailVal, { color: tw.gray600, ...poppins(500), fontSize: 10 }]}>#{selectedTxn.referenceId}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  errTitle: { fontSize: 18, lineHeight: 28, color: tw.gray800, ...poppins(700) },
  retryBtn: { marginTop: 16, backgroundColor: HT.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12, ...shadow('lg') },
  retryText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(700) },

  hero: {
    backgroundColor: HT.primary,
    paddingBottom: 64,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    ...shadow('lg'),
    zIndex: 30,
  },
  heroLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 2, textTransform: 'uppercase', color: '#fff', opacity: 0.6, textAlign: 'center', marginBottom: 8, ...poppins(700) },
  heroRupee: { fontSize: 30, lineHeight: 36, color: '#fff', opacity: 0.8, marginRight: 4, ...poppins(500) },
  heroAmount: { fontSize: 48, lineHeight: 48, letterSpacing: -1.2, color: '#fff', ...poppins(900) },
  heroActions: { flexDirection: 'row', gap: 16, justifyContent: 'center', maxWidth: 384, width: '100%', alignSelf: 'center' },
  heroBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16 },
  heroBtnText: { fontSize: 12, lineHeight: 16, ...poppins(700) },

  pillsWrap: { paddingHorizontal: 24, marginTop: -28, marginBottom: 24, zIndex: 40 },
  pills: { backgroundColor: '#fff', padding: 6, borderRadius: 999, borderWidth: 1, borderColor: tw.gray100, flexDirection: 'row', maxWidth: 280, width: '100%', alignSelf: 'center', ...shadow('lg') },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  pillActive: { backgroundColor: HT.primary, ...shadow('md') },
  pillText: { fontSize: 12, lineHeight: 16, ...poppins(700) },

  sectionTitle: { fontSize: 12, lineHeight: 16, letterSpacing: 1.8, textTransform: 'uppercase', color: tw.gray400, marginBottom: 24, paddingLeft: 8, ...poppins(700) },
  emptyText: { fontSize: 14, lineHeight: 20, color: tw.gray400, ...poppins(500) },

  txnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  txnIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txnTitle: { fontSize: 12, lineHeight: 15, color: tw.slate900, ...poppins(700) },
  txnDate: { fontSize: 10, lineHeight: 15, color: tw.gray400, marginTop: 2, ...poppins(700) },
  txnAmount: { fontSize: 14, lineHeight: 20, ...poppins(900) },
  statusPill: { marginTop: 2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusText: { fontSize: 9, lineHeight: 13.5, letterSpacing: 0.45, textTransform: 'uppercase', ...poppins(700) },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  statCard: { width: '47.5%', flexGrow: 1, backgroundColor: tw.gray50, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: tw.gray100 },
  statLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, marginBottom: 8, ...poppins(700) },
  statValue: { fontSize: 20, lineHeight: 28, color: tw.slate900, ...poppins(900) },
  pending: { backgroundColor: HT.primaryTint, padding: 24, borderRadius: 40, marginTop: 16, borderWidth: 1, borderColor: HT.primarySoft },
  pendingIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  pendingLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(10,77,43,0.7)', ...poppins(700) },

  sheetPanel: { width: '100%' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, ...shadow('2xl') },
  modalTitle: { fontSize: 20, lineHeight: 28, color: tw.slate900, ...poppins(900) },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(243,244,246,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalHint: { fontSize: 12, lineHeight: 16, color: tw.gray400, marginBottom: 32, ...poppins(500) },
  input: { width: '100%', backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray100, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: tw.slate900, ...poppins(700) },
  amountLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, marginBottom: 12, ...poppins(700) },
  amountInput: { width: '100%', backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray100, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, fontSize: 24, color: tw.slate900, ...poppins(900) },
  valText: { fontSize: 12, lineHeight: 16, ...poppins(500) },
  valRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proceed: { width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  proceedText: { fontSize: 14, lineHeight: 20, ...poppins(700) },

  detail: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, ...shadow('2xl') },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: tw.gray200, alignSelf: 'center', marginBottom: 24 },
  detailIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  detailAmount: { fontSize: 20, lineHeight: 25, color: tw.slate900, textAlign: 'center', marginBottom: 4, ...poppins(900) },
  detailStatus: { fontSize: 10, lineHeight: 15, letterSpacing: 1.5, textTransform: 'uppercase', color: tw.gray400, ...poppins(700) },
  detailBox: { backgroundColor: tw.gray50, borderRadius: 16, padding: 12, gap: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.5)', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: tw.gray100 },
  detailKey: { fontSize: 10, lineHeight: 15, letterSpacing: 1.5, textTransform: 'uppercase', color: tw.gray400, ...poppins(700) },
  detailDesc: { flex: 1, fontSize: 12, lineHeight: 19.5, color: tw.gray900, textAlign: 'right', ...poppins(700) },
  detailVal: { fontSize: 11, lineHeight: 16.5, color: tw.gray900, ...poppins(700) },
  detailMono: { fontSize: 10, lineHeight: 15, color: tw.gray500, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
});

export default PartnerWallet;
