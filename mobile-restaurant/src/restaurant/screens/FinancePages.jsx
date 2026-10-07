import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, Mail, Store, Wallet } from 'lucide-react-native';
import { Button, Card, EmptyState, Money, SegmentedControl, StatusBadge } from '../../components/ds';
import { Press } from '../../components/ui';
import { color, elevation, radii, space, type } from '../../theme';
import BottomNavOrders, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavOrders';
import { PageHeader } from '../components/ui';
import { useDownloadReport } from '../hooks/pages/useDownloadReport';
import { useWithdrawalHistoryPage } from '../hooks/pages/useWithdrawalHistoryPage';
import { inr2, sentenceCase } from './finance/financeUi';
import { Notice, PinnedBar, Radio } from './inventory/partnerKit';

const when = (value) => (value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A');

/** Port of Food/pages/restaurant/WithdrawalHistoryPage.jsx (/food/restaurant/withdrawal-history). */
export function WithdrawalHistoryPage() {
  const insets = useSafeAreaInsets();
  const { goBack, withdrawalHistoryTab, setWithdrawalHistoryTab, withdrawalRequests, loadingWithdrawalRequests } = useWithdrawalHistoryPage();
  const pending = withdrawalHistoryTab === 'pending';
  const rows = withdrawalRequests.filter((req) => (pending ? req.status === 'Pending' : req.status === 'Approved' || req.status === 'Processed'));

  const renderRow = ({ item: request }) => (
    <Card style={styles.row}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Money value={request.amount != null ? inr2(request.amount) : '₹'} />
        <Text style={styles.date}>{pending ? `Requested: ${when(request.requestedAt)}` : `Processed: ${when(request.processedAt)}`}</Text>
      </View>
      <StatusBadge label={pending ? 'Pending' : request.status === 'Approved' ? 'Approved' : 'Processed'} tone={pending ? 'warning' : 'success'} />
    </Card>
  );

  return (
    <View style={styles.page}>
      <PageHeader title="Withdrawal History" onBack={goBack} />
      <View style={styles.tabs}>
        <SegmentedControl
          value={withdrawalHistoryTab}
          onChange={setWithdrawalHistoryTab}
          options={[
            { value: 'pending', label: 'Withdrawal pending' },
            { value: 'successful', label: 'Withdrawal successful' },
          ]}
        />
      </View>

      <FlatList
        data={loadingWithdrawalRequests ? [] : rows}
        keyExtractor={(request, index) => String(request.id ?? index)}
        renderItem={renderRow}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl + BOTTOM_NAV_HEIGHT + insets.bottom }}
        ListEmptyComponent={
          loadingWithdrawalRequests ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={color.primary} />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <EmptyState icon={Wallet} title={pending ? 'No pending withdrawal requests' : 'No successful withdrawals'} />
          )
        }
      />
      <BottomNavOrders />
    </View>
  );
}

/** Port of Food/pages/restaurant/DownloadReport.jsx (/food/restaurant/download-report). */
export function DownloadReport() {
  const insets = useSafeAreaInsets();
  const { goBack, reportView, setReportView, viewType, setViewType, durations, duration, setDuration, showSuccess, handleSend, REPORT_VIEWS, VIEW_TYPES } = useDownloadReport();

  const radioRow = (opt, selected, onPress, last) => (
    <Press key={opt.id} scale={1} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected, checked: selected }} accessibilityLabel={opt.label} style={[styles.radioRow, last ? null : styles.radioDivider]}>
      <Radio selected={selected} />
      <Text style={[styles.radioLabel, selected ? { color: color.primary, fontFamily: 'Poppins_600SemiBold' } : null]}>{opt.label}</Text>
    </Press>
  );

  return (
    <View style={styles.page}>
      <PageHeader title="Download report" onBack={goBack} backLabel="Back" />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: space.xxl }]}>
        <Notice tone="primary" icon={Store}>
          <Text style={[type.small, { color: color.text }]}>
            You are generating a report for <Text style={{ fontFamily: 'Poppins_600SemiBold' }}>All outlets</Text>
          </Text>
        </Notice>

        <View style={styles.group}>
          <Text style={styles.question}>Select the report view:</Text>
          <Card padded={false}>{REPORT_VIEWS.map((opt, i) => radioRow(opt, reportView === opt.id, () => setReportView(opt.id), i === REPORT_VIEWS.length - 1))}</Card>
        </View>

        <View style={styles.group}>
          <Text style={styles.question}>Select view for data:</Text>
          <SegmentedControl value={viewType} onChange={setViewType} options={VIEW_TYPES.map((vt) => ({ value: vt, label: sentenceCase(vt) }))} />
        </View>

        <View style={styles.group}>
          <Text style={styles.question}>Select duration for report:</Text>
          <Card padded={false}>{durations.map((opt, i) => radioRow(opt, duration === opt.id, () => setDuration(opt.id), i === durations.length - 1))}</Card>
        </View>
      </ScrollView>

      <PinnedBar>
        <Button title="Send an email" icon={Mail} size="lg" onPress={handleSend} />
      </PinnedBar>

      {showSuccess ? (
        <View style={[styles.success, { bottom: 54 + space.lg * 2 + space.md + insets.bottom }]} pointerEvents="none" accessibilityRole="alert">
          <View style={styles.successIcon}>
            <CheckCircle size={22} color={color.success} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[type.bodyStrong, { color: color.text }]}>Report queued</Text>
            <Text style={[type.caption, { color: color.textMuted }]}>We’ll email it to you shortly.</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  tabs: { paddingHorizontal: space.lg, paddingTop: space.md },
  loading: { paddingVertical: space.xxxl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  loadingText: { ...type.body, color: color.textMuted },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  date: { ...type.caption, color: color.textMuted, marginTop: space.xs },
  scroll: { padding: space.lg, gap: space.xxl },
  group: { gap: space.md },
  question: { ...type.bodyStrong, color: color.text },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, paddingHorizontal: space.lg },
  radioDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  radioLabel: { flex: 1, ...type.body, color: color.text },
  success: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, padding: space.lg, ...elevation.float },
  successIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.successSoft, alignItems: 'center', justifyContent: 'center' },
});
