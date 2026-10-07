import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowDownLeft, ArrowUpRight, Calendar, Download, FileText, Search } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import walletService from '../services/walletService';
import { HT } from '../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerTransactions.jsx
 * (/hotel/partner/transactions). The web's gsap list fade-in is dropped; the
 * search box, date and download buttons do nothing there either.
 */

const TransactionRow = ({ txn }) => {
  const isCredit = txn.type === 'credit';
  const statusColor = txn.status === 'completed' || txn.status === 'success' ? tw.green500 : txn.status === 'pending' ? tw.orange500 : tw.red500;

  return (
    <View style={styles.row}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
        <View style={[styles.icon, { backgroundColor: isCredit ? tw.green50 : tw.red50 }]}>
          {isCredit ? <ArrowDownLeft size={18} color={tw.green600} /> : <ArrowUpRight size={18} color={tw.red600} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.desc}>{txn.description}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <View style={styles.idChip}>
              <Text style={styles.idText}>{txn._id?.slice(-8).toUpperCase()}</Text>
            </View>
            <Text style={styles.meta}>•</Text>
            <Text style={styles.meta}>
              {new Date(txn.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
        <Text style={[styles.amount, { color: isCredit ? tw.green600 : tw.slate900 }]}>
          {isCredit ? '+' : '-'}₹{txn.amount?.toLocaleString('en-IN')}
        </Text>
        <Text style={[styles.status, { color: statusColor }]}>{txn.status}</Text>
      </View>
    </View>
  );
};

const FILTERS = [
  ['all', 'All', HT.primary],
  ['credit', 'Credits', tw.green600],
  ['debit', 'Debits', tw.red600],
];

const PartnerTransactions = () => {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await walletService.getTransactions({
        viewAs: 'partner',
        type: filter === 'all' ? undefined : filter,
      });
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <View style={{ flex: 1, backgroundColor: HT.bg }}>
      <PartnerHeader title="Transactions" subtitle="History & Statements" />

      {/* Filters & Actions */}
      <View style={styles.bar}>
        <View style={{ maxWidth: 768, width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {/* Segmented Control */}
          <View style={styles.segment}>
            {FILTERS.map(([key, label, color]) => (
              <Press key={key} scale={1} onPress={() => setFilter(key)} style={[styles.segBtn, filter === key && [{ backgroundColor: '#fff' }, shadow('sm')]]}>
                <Text style={[styles.segText, { color: filter === key ? color : tw.gray500 }]}>{label}</Text>
              </Press>
            ))}
          </View>

          {/* Date / Download */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Press accessibilityLabel="Filter by date" style={styles.action}>
              <Calendar size={16} color={tw.gray500} />
            </Press>
            <Press accessibilityLabel="Download report" style={styles.action}>
              <Download size={16} color={tw.gray500} />
            </Press>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 80 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={{ maxWidth: 768, width: '100%', alignSelf: 'center' }}>
          {/* Search */}
          <View style={{ marginBottom: 24, justifyContent: 'center' }}>
            <TextInput placeholder="Search by ID or Description..." placeholderTextColor={tw.gray400} style={styles.search} />
            <View pointerEvents="none" style={{ position: 'absolute', left: 16 }}>
              <Search size={18} color={tw.gray300} />
            </View>
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <ActivityIndicator size="large" color={HT.primary} />
            </View>
          ) : (
            <View style={styles.list}>
              {transactions.length > 0 ? (
                transactions.map((txn, idx) => <TransactionRow key={txn._id || idx} txn={txn} />)
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                  <FileText size={32} color={tw.gray300} style={{ marginBottom: 8 }} />
                  <Text style={styles.empty}>No transactions found</Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.foot}>Showing latest transactions</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray100, paddingHorizontal: 16, paddingVertical: 12, zIndex: 30, ...shadow('sm') },
  segment: { flexDirection: 'row', backgroundColor: tw.gray100, padding: 4, borderRadius: 12 },
  segBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  segText: { fontSize: 12, lineHeight: 16, ...poppins(700) },
  action: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: tw.gray50, borderRadius: 8 },
  search: { width: '100%', height: 48, backgroundColor: '#fff', borderRadius: 16, paddingLeft: 48, paddingRight: 16, fontSize: 14, color: tw.slate900, borderWidth: 1, borderColor: tw.gray200, ...poppins(500), ...shadow('sm') },
  list: { backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: tw.gray100, overflow: 'hidden', ...shadow('sm') },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray50 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  desc: { fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(700) },
  idChip: { backgroundColor: tw.gray100, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  idText: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: tw.gray500, textTransform: 'uppercase', ...poppins(500) },
  meta: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(500) },
  amount: { fontSize: 14, lineHeight: 20, ...poppins(900) },
  status: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2, ...poppins(700) },
  empty: { fontSize: 14, lineHeight: 20, color: tw.gray400, ...poppins(700) },
  foot: { textAlign: 'center', fontSize: 10, lineHeight: 15, letterSpacing: 1.5, textTransform: 'uppercase', color: tw.gray400, marginTop: 24, ...poppins(500) },
});

export default PartnerTransactions;
