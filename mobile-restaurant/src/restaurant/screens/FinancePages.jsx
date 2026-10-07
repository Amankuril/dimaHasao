import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Mail, Wallet } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import BottomNavOrders, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavOrders';
import { PageHeader, RadioRow } from '../components/ui';
import { useDownloadReport } from '../hooks/pages/useDownloadReport';
import { useWithdrawalHistoryPage } from '../hooks/pages/useWithdrawalHistoryPage';
import { RT_GRADIENT } from '../theme';

const when = (value) => (value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A');

/** Port of Food/pages/restaurant/WithdrawalHistoryPage.jsx (/food/restaurant/withdrawal-history). */
export function WithdrawalHistoryPage() {
  const { goBack, withdrawalHistoryTab, setWithdrawalHistoryTab, withdrawalRequests, loadingWithdrawalRequests } = useWithdrawalHistoryPage();
  const pending = withdrawalHistoryTab === 'pending';
  const rows = withdrawalRequests.filter((req) => (pending ? req.status === 'Pending' : req.status === 'Approved' || req.status === 'Processed'));

  const tab = (id, label) => {
    const on = withdrawalHistoryTab === id;
    return (
      <Press scale={0.98} onPress={() => setWithdrawalHistoryTab(id)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1 }}>
        <LinearGradient colors={on ? RT_GRADIENT : [tw.gray100, tw.gray100]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tab}>
          <Text style={[styles.tabText, { color: on ? '#fff' : tw.gray600 }]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
        </LinearGradient>
      </Press>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: tw.gray100 }}>
      <PageHeader title="Withdrawal History" onBack={goBack} />
      <View style={styles.tabs}>
        {tab('pending', 'Withdrawal Pending')}
        {tab('successful', 'Withdrawal Successful')}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24, paddingBottom: 24 + BOTTOM_NAV_HEIGHT, gap: 12 }}>
        {loadingWithdrawalRequests ? (
          <Text style={styles.loading}>Loading...</Text>
        ) : rows.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Wallet size={64} color={tw.gray300} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>{pending ? 'No pending withdrawal requests' : 'No successful withdrawals'}</Text>
          </View>
        ) : (
          rows.map((request) => (
            <View key={request.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.amount}>₹{request.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                <Text style={styles.date}>{pending ? `Requested: ${when(request.requestedAt)}` : `Processed: ${when(request.processedAt)}`}</Text>
              </View>
              <Text style={[styles.badge, pending ? { backgroundColor: '#fef9c3', color: '#854d0e' } : { backgroundColor: tw.green100, color: tw.green800 }]}>
                {pending ? 'Pending' : request.status === 'Approved' ? 'Approved' : 'Processed'}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
      <BottomNavOrders />
    </View>
  );
}

/** Port of Food/pages/restaurant/DownloadReport.jsx (/food/restaurant/download-report). */
export function DownloadReport() {
  const insets = useSafeAreaInsets();
  const { goBack, reportView, setReportView, viewType, setViewType, durations, duration, setDuration, showSuccess, handleSend, REPORT_VIEWS, VIEW_TYPES } = useDownloadReport();
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageHeader title="Download report" onBack={goBack} backLabel="Back" />
      <Text style={styles.scope}>
        You are generating a report for <Text style={poppins(600)}>All Outlets</Text>
      </Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20, gap: 24 }}>
        <View style={{ gap: 12 }}>
          <Text style={styles.question}>Select the report view:</Text>
          {REPORT_VIEWS.map((opt) => (
            <RadioRow key={opt.id} label={opt.label} selected={reportView === opt.id} onPress={() => setReportView(opt.id)} />
          ))}
        </View>

        <View style={{ gap: 12 }}>
          <Text style={styles.question}>Select view for data:</Text>
          <View style={styles.segments}>
            {VIEW_TYPES.map((type) => {
              const on = viewType === type;
              return (
                <Press key={type} scale={1} onPress={() => setViewType(type)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1 }}>
                  <LinearGradient colors={on ? RT_GRADIENT : ['#fff', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, lineHeight: 20, color: on ? '#fff' : tw.gray800, ...poppins(600) }}>{type}</Text>
                  </LinearGradient>
                </Press>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Text style={styles.question}>Select duration for report:</Text>
          {durations.map((opt) => (
            <RadioRow key={opt.id} label={opt.label} selected={duration === opt.id} onPress={() => setDuration(opt.id)} />
          ))}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingBottom: 24 + insets.bottom }}>
        <Press scale={0.98} onPress={handleSend} accessibilityRole="button">
          <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12 }}>
            <Mail size={20} color="#fff" />
            <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) }}>Send an email</Text>
          </LinearGradient>
        </Press>
      </View>

      {showSuccess ? (
        <View style={[styles.success, { bottom: 32 + insets.bottom }]} pointerEvents="none" accessibilityRole="alert">
          <CheckCircle size={24} color={tw.green600} />
          <View>
            <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) }}>Report queued</Text>
            <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) }}>We’ll email it to you shortly.</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 1, borderBottomWidth: 1, borderBottomColor: tw.gray200, flexDirection: 'row', gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  tabText: { fontSize: 14, lineHeight: 20, ...poppins(500) },
  loading: { paddingVertical: 32, textAlign: 'center', fontSize: 16, color: tw.gray500, ...poppins(400) },
  emptyText: { fontSize: 18, lineHeight: 28, color: tw.gray500, textAlign: 'center', ...poppins(500) },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: tw.gray200, ...shadow('sm') },
  amount: { fontSize: 18, lineHeight: 28, color: tw.gray900, marginBottom: 8, ...poppins(700) },
  date: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', fontSize: 12, lineHeight: 16, ...poppins(500) },
  scope: { backgroundColor: '#f8e7a0', color: tw.gray900, fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingVertical: 8, ...poppins(400) },
  question: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  segments: { flexDirection: 'row', borderWidth: 1, borderColor: tw.gray300, borderRadius: 12, overflow: 'hidden' },
  success: { position: 'absolute', left: 24, right: 24, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.gray200, padding: 16, ...shadow('lg') },
});
