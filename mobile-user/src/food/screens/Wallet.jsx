import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowDownCircle, ArrowLeft, ArrowUpCircle, History, IndianRupee, Plus, RefreshCw } from 'lucide-react-native';
import { Press } from '../../components/ui';
import Skeleton from '../../components/Skeleton';
import { userAPI } from '../../api/food';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import AddMoneyModal from '../components/profile/AddMoneyModal';
import RequireUser from '../components/profile/RequireUser';
import { toast } from '../../lib/notify';
import { poppins, shadow, tw } from '../../theme';

const FILTERS = [
  { id: 'all', label: 'All Transactions' },
  { id: 'additions', label: 'Additions' },
  { id: 'deductions', label: 'Deductions' },
  { id: 'refunds', label: 'Refunds' },
];

const formatAmount = (amount) => {
  const numeric = Number(amount ?? 0);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return `₹${safe.toLocaleString('en-IN')}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const d = date.toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const t = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${d} | ${t}`;
};

const TYPE_COLOR = { addition: tw.green600, deduction: tw.red600, refund: tw.blue600 };

function TxIcon({ type }) {
  if (type === 'addition') return <ArrowDownCircle size={24} color={tw.green600} />;
  if (type === 'deduction') return <ArrowUpCircle size={24} color={tw.red600} />;
  if (type === 'refund') return <RefreshCw size={24} color={tw.blue600} />;
  return null;
}

function WalletSkeleton() {
  return (
    <View style={{ gap: 24 }} accessibilityRole="progressbar" accessibilityLabel="Loading wallet">
      <View style={{ alignItems: 'center', gap: 24 }}>
        <View style={{ alignItems: 'center', gap: 20 }}>
          <Skeleton style={{ width: 96, height: 96, borderRadius: 28 }} />
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Skeleton style={{ width: 192, height: 32, borderRadius: 999 }} />
            <Skeleton style={{ width: 160, height: 48, borderRadius: 16 }} />
            <Skeleton style={{ width: 128, height: 20, borderRadius: 999 }} />
            <Skeleton style={{ width: 256, height: 16, borderRadius: 999 }} />
          </View>
        </View>
        <Skeleton style={{ height: 56, alignSelf: 'stretch', borderRadius: 16 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton style={{ width: 96, height: 40, borderRadius: 999 }} />
        <Skeleton style={{ width: 112, height: 40, borderRadius: 999 }} />
        <Skeleton style={{ width: 112, height: 40, borderRadius: 999 }} />
      </View>
      <View style={{ gap: 16 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.skRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Skeleton style={{ width: 48, height: 48, borderRadius: 16 }} />
              <View style={{ gap: 8 }}>
                <Skeleton style={{ width: 160, height: 16, borderRadius: 999 }} />
                <Skeleton style={{ width: 112, height: 12, borderRadius: 999 }} />
              </View>
            </View>
            <View style={{ gap: 8, alignItems: 'flex-end' }}>
              <Skeleton style={{ width: 80, height: 16, borderRadius: 999 }} />
              <Skeleton style={{ width: 64, height: 12, borderRadius: 999 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function WalletContent() {
  const insets = useSafeAreaInsets();
  const goBack = useAppBackNavigation();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addMoneyModalOpen, setAddMoneyModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWalletData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userAPI.getWallet();
      const walletData = response?.data?.data?.wallet || response?.data?.wallet;
      if (walletData) {
        setWallet(walletData);
        setTransactions(walletData.transactions || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load wallet');
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    setRefreshing(false);
  };

  const currentBalance = wallet?.balance || 0;
  const filtered = useMemo(() => {
    if (selectedFilter === 'all') return transactions;
    const want = { additions: 'addition', deductions: 'deduction', refunds: 'refund' }[selectedFilter];
    return transactions.filter((t) => t.type === want);
  }, [selectedFilter, transactions]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.header}>
        <Press scale={0.92} onPress={goBack} accessibilityLabel="Back" style={styles.back}>
          <ArrowLeft size={20} color={tw.gray700} />
        </Press>
        <Text style={styles.headerTitle}>My Wallet</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24 + insets.bottom, gap: 24 }}
      >
        {loading ? <WalletSkeleton /> : null}

        {error && !loading ? (
          <View style={styles.errBox}>
            <Text style={styles.errText}>{error}</Text>
          </View>
        ) : null}

        {!loading && !error ? (
          <>
            <View style={{ alignItems: 'center', gap: 24 }}>
              <View style={{ alignItems: 'center', gap: 16 }}>
                <View style={{ width: 80, height: 80 }}>
                  <View style={styles.coinShadow} />
                  <LinearGradient colors={[tw.red500, tw.red600, tw.red700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coin}>
                    <View style={styles.coinInner}>
                      <IndianRupee size={40} color="#fff" strokeWidth={2.5} />
                    </View>
                  </LinearGradient>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.title}>My Wallet</Text>
                  <View style={{ marginBottom: 8, alignItems: 'center' }}>
                    <Text style={styles.small}>Current Balance</Text>
                    <Text style={styles.balance}>{formatAmount(currentBalance)}</Text>
                  </View>
                  <Text style={[styles.small, { textAlign: 'center', maxWidth: 448 }]}>Add money to enjoy one-tap, seamless payments</Text>
                </View>
              </View>
              <Press scale={0.98} onPress={() => setAddMoneyModalOpen(true)} accessibilityLabel="Add money" style={styles.addBtn}>
                <Plus size={16} color="#fff" />
                <Text style={styles.addText}>Add money</Text>
              </Press>
            </View>

            <View style={{ gap: 16 }}>
              <Text style={styles.histTitle}>TRANSACTION HISTORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
                {FILTERS.map((f) => {
                  const on = selectedFilter === f.id;
                  return (
                    <Press key={f.id} scale={0.97} onPress={() => setSelectedFilter(f.id)} accessibilityState={{ selected: on }} style={[styles.filter, on ? styles.filterOn : null]}>
                      <Text style={[styles.filterText, on ? { color: tw.green600 } : null]}>{f.label}</Text>
                    </Press>
                  );
                })}
              </ScrollView>

              {filtered.length > 0 ? (
                <View style={{ gap: 12 }}>
                  {filtered.map((t, i) => (
                    <View key={t.id || t._id || i} style={[styles.txCard, shadow('sm')]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                        <View style={styles.txIcon}>
                          <TxIcon type={t.type} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.txDesc} numberOfLines={1}>{t.description}</Text>
                          <Text style={styles.txDate}>{formatDate(t.date || t.createdAt)}</Text>
                        </View>
                      </View>
                      <Text style={[styles.txAmount, { color: TYPE_COLOR[t.type] || tw.gray600 }]}>
                        {t.type === 'deduction' ? '-' : '+'}
                        {formatAmount(t.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <History size={32} color={tw.gray300} />
                  </View>
                  <Text style={styles.emptyTitle}>No Transaction History</Text>
                  <Text style={styles.emptyText}>Your transactions will appear here when you add money or make a purchase.</Text>
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <AddMoneyModal open={addMoneyModalOpen} onOpenChange={setAddMoneyModalOpen} onSuccess={fetchWalletData} />
    </View>
  );
}

export default function Wallet() {
  return (
    <RequireUser>
      <WalletContent />
    </RequireUser>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  errBox: { backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red200, borderRadius: 8, padding: 16 },
  errText: { fontSize: 14, lineHeight: 20, color: tw.red600, ...poppins(400) },
  coinShadow: { position: 'absolute', top: 4, left: 0, right: 0, bottom: -4, borderRadius: 12, backgroundColor: 'rgba(130,24,26,0.25)', transform: [{ rotate: '-5deg' }] },
  coin: { width: 80, height: 80, borderRadius: 12, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }], ...shadow('lg') },
  coinInner: { width: 64, height: 64, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, lineHeight: 28, color: tw.gray900, marginBottom: 8, ...poppins(700) },
  small: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginBottom: 4, ...poppins(400) },
  balance: { fontSize: 24, lineHeight: 32, color: tw.gray900, ...poppins(700) },
  addBtn: { alignSelf: 'stretch', height: 48, borderRadius: 12, backgroundColor: tw.green600, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) },
  histTitle: { fontSize: 12, lineHeight: 16, letterSpacing: 1.8, color: tw.gray400, ...poppins(600) },
  filter: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff' },
  filterOn: { borderWidth: 2, borderColor: tw.green600, ...shadow('sm') },
  filterText: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(500) },
  txCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: tw.gray100, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  txIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: tw.gray50, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 14, lineHeight: 20, color: tw.gray900, marginBottom: 4, ...poppins(600) },
  txDate: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  txAmount: { fontSize: 18, lineHeight: 28, ...poppins(700) },
  empty: { paddingVertical: 64, paddingHorizontal: 16, alignItems: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 20, ...shadow('sm') },
  emptyTitle: { fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 8, ...poppins(700) },
  emptyText: { fontSize: 12, lineHeight: 19.5, color: tw.gray500, textAlign: 'center', maxWidth: 320, ...poppins(400) },
  skRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', padding: 16 },
});
