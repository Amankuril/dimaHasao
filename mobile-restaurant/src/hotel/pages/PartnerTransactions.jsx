import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowDownLeft, ArrowUpRight, Calendar, Download, FileText, Search } from 'lucide-react-native';
import { Card, EmptyState, IconButton, SegmentedControl, StatusBadge } from '../../components/ds';
import { color, radii, space, type } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import walletService from '../services/walletService';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerTransactions.jsx
 * (/hotel/partner/transactions). The web's gsap list fade-in is dropped; the
 * search box, date and download buttons do nothing there either.
 */

const statusTone = (st) =>
  st === 'completed' || st === 'success' ? 'success' : st === 'pending' ? 'warning' : 'danger';

const TransactionRow = ({ txn }) => {
  const isCredit = txn.type === 'credit';
  const st = String(txn.status || '');

  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: isCredit ? color.successSoft : color.dangerSoft }]}>
        {isCredit ? <ArrowDownLeft size={18} color={color.success} /> : <ArrowUpRight size={18} color={color.danger} />}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
        <Text style={styles.desc} numberOfLines={2}>
          {txn.description}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {isCredit ? 'Credit' : 'Debit'} · #{txn._id?.slice(-8).toUpperCase()}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {new Date(txn.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: space.xs }}>
        <Text style={[styles.amount, { color: isCredit ? color.success : color.text }]}>
          {isCredit ? '+' : '−'}₹{txn.amount?.toLocaleString('en-IN')}
        </Text>
        <StatusBadge label={st ? st.charAt(0).toUpperCase() + st.slice(1) : 'Unknown'} tone={statusTone(st)} />
      </View>
    </View>
  );
};

const FILTERS = [
  ['all', 'All'],
  ['credit', 'Credits'],
  ['debit', 'Debits'],
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
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PartnerHeader title="Transactions" subtitle="History & Statements" />

      {/* Filters & Actions */}
      <View style={styles.bar}>
        <SegmentedControl options={FILTERS.map(([value, label]) => ({ value, label }))} value={filter} onChange={setFilter} style={{ flex: 1 }} />
        {/* Date / Download */}
        <IconButton icon={Calendar} label="Filter by date" variant="soft" />
        <IconButton icon={Download} label="Download report" variant="soft" />
      </View>

      <FlatList
        data={loading ? [] : transactions}
        keyExtractor={(txn, idx) => String(txn._id || idx)}
        renderItem={({ item, index }) => (
          <View style={[styles.listItem, index === 0 && styles.first, index === transactions.length - 1 && styles.last]}>
            <TransactionRow txn={item} />
            {index < transactions.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        )}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl + insets.bottom, maxWidth: 768, width: '100%', alignSelf: 'center' }}
        ListHeaderComponent={
          <View style={styles.searchBox}>
            <Search size={18} color={color.textMuted} />
            <TextInput placeholder="Search by ID or description..." placeholderTextColor={color.textDisabled} accessibilityLabel="Search transactions" style={styles.search} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: space.xxxl * 2 }}>
              <ActivityIndicator size="large" color={color.primary} />
            </View>
          ) : (
            <Card>
              <EmptyState icon={FileText} title="No transactions found" style={{ paddingVertical: space.xxl }} />
            </Card>
          )
        }
        ListFooterComponent={<Text style={styles.foot}>Showing latest transactions</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, paddingHorizontal: space.lg, paddingVertical: space.md },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 48, backgroundColor: color.surface, borderRadius: radii.md, paddingHorizontal: space.md, borderWidth: 1, borderColor: color.border, marginBottom: space.lg },
  search: { flex: 1, minWidth: 0, height: 46, ...type.body, color: color.text, outlineStyle: 'none' },
  listItem: { backgroundColor: color.surface, borderLeftWidth: 1, borderRightWidth: 1, borderColor: color.border },
  first: { borderTopWidth: 1, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  last: { borderBottomWidth: 1, borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.border, marginHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  desc: { ...type.bodyStrong, color: color.text },
  meta: { ...type.caption, color: color.textMuted },
  amount: { ...type.bodyStrong, fontSize: 15 },
  foot: { ...type.caption, textAlign: 'center', color: color.textMuted, marginTop: space.xl },
});

export default PartnerTransactions;
