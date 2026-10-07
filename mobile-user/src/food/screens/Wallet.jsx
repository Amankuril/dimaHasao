import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { AlertCircle, ArrowDownCircle, ArrowLeft, ArrowUpCircle, History, IndianRupee, Plus, RefreshCw } from 'lucide-react-native';
import Skeleton from '../../components/Skeleton';
import { Button, Chip, ChipRow, EmptyState, IconButton, SectionHeader } from '../../components/ds';
import { NAV_CLEARANCE, isImmersiveRoute } from '../../components/dh/AppBottomNav';
import { userAPI } from '../../api/food';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import AddMoneyModal from '../components/profile/AddMoneyModal';
import RequireUser from '../components/profile/RequireUser';
import { toast } from '../../lib/notify';
import { color, elevation, radii, space, tone as tones, type } from '../../theme';

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

/** Transaction type -> tone, icon and word (colour is never the only cue). */
const TX = {
  addition: { tone: 'success', Icon: ArrowDownCircle, word: 'Added', sign: '+' },
  deduction: { tone: 'danger', Icon: ArrowUpCircle, word: 'Paid', sign: '−' },
  refund: { tone: 'info', Icon: RefreshCw, word: 'Refund', sign: '+' },
};

function WalletSkeleton() {
  return (
    <View style={{ gap: space.xxl, padding: space.lg }} accessibilityRole="progressbar" accessibilityLabel="Loading wallet">
      <Skeleton style={{ height: 200, borderRadius: radii.lg }} />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Skeleton style={{ width: 96, height: 38, borderRadius: 999 }} />
        <Skeleton style={{ width: 112, height: 38, borderRadius: 999 }} />
        <Skeleton style={{ width: 112, height: 38, borderRadius: 999 }} />
      </View>
      <View style={{ gap: space.md }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.skRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <Skeleton style={{ width: 44, height: 44, borderRadius: 22 }} />
              <View style={{ gap: space.sm }}>
                <Skeleton style={{ width: 150, height: 16, borderRadius: 999 }} />
                <Skeleton style={{ width: 100, height: 12, borderRadius: 999 }} />
              </View>
            </View>
            <Skeleton style={{ width: 64, height: 16, borderRadius: 999 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

function WalletContent() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
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

  const header = (
    <View style={{ gap: space.lg, marginBottom: space.md }}>
      <View style={styles.balanceCard}>
        <View style={styles.coin}>
          <IndianRupee size={26} color={color.onGold} strokeWidth={2.5} />
        </View>
        <Text style={[type.overline, { color: color.gold, marginTop: space.md }]}>Current balance</Text>
        <Text style={[type.priceLg, { color: color.textInverse }]} accessibilityLabel={`Current balance ${formatAmount(currentBalance)}`}>
          {formatAmount(currentBalance)}
        </Text>
        <Text style={[type.small, { color: color.textOnDarkMuted, textAlign: 'center' }]}>Add money to enjoy one-tap, seamless payments</Text>
        <Button title="Add money" icon={Plus} variant="gold" onPress={() => setAddMoneyModalOpen(true)} accessibilityLabel="Add money" style={{ marginTop: space.lg }} />
      </View>
      <SectionHeader title="Transaction history" style={{ marginTop: space.sm, marginBottom: 0 }} />
      <ChipRow contentStyle={{ paddingHorizontal: 0 }}>
        {FILTERS.map((f) => (
          <Chip key={f.id} label={f.label} selected={selectedFilter === f.id} onPress={() => setSelectedFilter(f.id)} />
        ))}
      </ChipRow>
    </View>
  );

  const renderTx = ({ item: t }) => {
    const meta = TX[t.type];
    const tn = tones[meta?.tone] || tones.neutral;
    const Icon = meta?.Icon;
    return (
      <View style={styles.txCard}>
        <View style={[styles.txIcon, { backgroundColor: tn.bg }]}>{Icon ? <Icon size={22} color={tn.fg} /> : null}</View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={2}>
            {t.description}
          </Text>
          <Text style={[type.caption, { color: color.textMuted }]}>{formatDate(t.date || t.createdAt)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[type.bodyStrong, { color: tn.fg }]}>
            {meta ? meta.sign : t.type === 'deduction' ? '−' : '+'}
            {formatAmount(t.amount)}
          </Text>
          {meta ? <Text style={[type.caption, { color: color.textMuted }]}>{meta.word}</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={styles.header}>
        <IconButton icon={ArrowLeft} label="Back" onPress={goBack} />
        <Text style={[type.heading, { color: color.text, flex: 1 }]} accessibilityRole="header">
          My wallet
        </Text>
      </View>

      {loading ? (
        <WalletSkeleton />
      ) : error ? (
        <EmptyState icon={AlertCircle} title="Couldn't load your wallet" message={error} actionLabel="Try again" onAction={onRefresh} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t, i) => String(t.id || t._id || i)}
          renderItem={renderTx}
          ListHeaderComponent={header}
          ListEmptyComponent={<EmptyState icon={History} title="No transaction history" message="Your transactions will appear here when you add money or make a purchase." style={{ paddingVertical: space.xxxl }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.primary} colors={[color.primary]} />}
          contentContainerStyle={{ padding: space.lg, gap: space.sm, paddingBottom: (isImmersiveRoute(pathname) ? 0 : NAV_CLEARANCE) + insets.bottom + space.xxl }}
        />
      )}

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
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.xs, minHeight: 56, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  balanceCard: { backgroundColor: color.primaryDeep, borderRadius: radii.lg, padding: space.xl, alignItems: 'center', gap: space.xs, ...elevation.card },
  coin: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.goldBright, alignItems: 'center', justifyContent: 'center' },
  txCard: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md },
  txIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  skRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, padding: space.lg },
});
