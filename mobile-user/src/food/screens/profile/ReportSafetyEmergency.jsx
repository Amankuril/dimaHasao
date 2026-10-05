import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, ArrowLeft, Phone, Shield, X } from 'lucide-react-native';
import { Dialog } from '../../../components/kit';
import { Spinner } from '../../../components/Loader';
import { Press } from '../../../components/ui';
import { openExternal } from '../../../lib/links';
import { toast } from '../../../lib/notify';
import { userAPI } from '../../../api/food';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { Card, CardContent, UI } from '../../components/cart/ui';
import { F } from '../../components/shell';
import { poppins, shadow, tw } from '../../../theme';

const STATUS = {
  unread: [tw.blue100, tw.blue700],
  read: [tw.slate100, tw.slate700],
  urgent: [tw.red100, tw.red700],
  resolved: [tw.green100, tw.green700],
};
const PRIORITY = {
  low: [tw.gray100, tw.gray700, 600],
  medium: [tw.yellow100, tw.yellow700, 600],
  high: [tw.orange100, tw.orange700, 600],
  critical: [tw.red100, tw.red700, 700],
};
const cap = (s) => String(s).replace(/^\w/, (c) => c.toUpperCase());

function Pill({ map, value, fallback, def }) {
  const [bg, color, weight = 600] = map[String(value)] || map[fallback];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }, poppins(weight)]}>{cap(value || def)}</Text>
    </View>
  );
}

const formatDateTime = (iso) => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  } catch {
    return '';
  }
};

/** Port of pages/user/profile/ReportSafetyEmergency.jsx. */
export default function ReportSafetyEmergency() {
  const goBack = useAppBackNavigation();
  const { width, height } = useWindowDimensions();
  const [report, setReport] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const timer = useRef(null);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await userAPI.getMySafetyEmergencyReports({ page: 1, limit: 20 });
      const list = res?.data?.data?.safetyEmergencies ?? [];
      setHistory(Array.isArray(list) ? list : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    return () => clearTimeout(timer.current);
  }, []);

  const historySorted = useMemo(() => [...history].sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()), [history]);

  const handleSubmit = async () => {
    if (!report.trim()) {
      toast.error('Please describe the safety concern or emergency');
      return;
    }
    if (report.trim().length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await userAPI.createSafetyEmergencyReport(report.trim());
      if (response.data.success) {
        setIsSubmitted(true);
        setReport('');
        toast.success('Safety emergency report submitted successfully!');
        fetchHistory();
        timer.current = setTimeout(() => setIsSubmitted(false), 5000);
      }
    } catch (error) {
      const backendError = error.response?.data?.message || error.response?.data?.error;
      toast.error(backendError || 'Failed to submit safety emergency report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tooShort = report.trim().length < 10;
  const submitDisabled = tooShort || isSubmitting;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#faf6ed' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Press onPress={goBack} accessibilityLabel="Back" style={[styles.back, shadow('0 2px 10px rgba(0,0,0,0.05)')]}>
            <ArrowLeft size={20} color={tw.slate800} />
          </Press>
          <Text style={styles.h1}>Report an Emergency</Text>
        </View>

        <Card style={[styles.redCard, shadow('sm')]}>
          <LinearGradient colors={[tw.red50, '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <CardContent style={{ padding: 20 }}>
            <View style={styles.blob} pointerEvents="none" />
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
              <View style={[styles.redIcon, shadow('sm')]}>
                <Phone size={20} color={F.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.h3Lg}>Emergency Contact</Text>
                <Text style={styles.pSlate}>For immediate emergencies, please call your local emergency services directly for immediate assistance.</Text>
                <Press onPress={() => openExternal('tel:100')} accessibilityLabel="Call 100" style={[styles.callBtn, shadow('sm')]}>
                  <Phone size={16} color={F.green} style={{ marginRight: 8 }} />
                  <Text style={styles.callText}>Call 100</Text>
                </Press>
              </View>
            </View>
          </CardContent>
        </Card>

        {!isSubmitted ? (
          <>
            <Card style={[styles.slateCard, shadow('sm')]}>
              <CardContent style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
                  <View style={styles.shieldIcon}>
                    <Shield size={20} color={tw.slate700} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.h3}>Safety is our priority</Text>
                    <Text style={styles.pMuted}>Report any safety concerns, incidents, or emergencies related to your order or delivery experience. We take these reports very seriously.</Text>
                  </View>
                </View>
              </CardContent>
            </Card>

            <Card style={[styles.slateCard, shadow('0 2px 15px rgba(0,0,0,0.02)')]}>
              <CardContent style={{ padding: 20 }}>
                <Text style={styles.label}>Describe the safety concern or emergency</Text>
                <TextInput
                  placeholder="Please provide details about the safety issue..."
                  placeholderTextColor={tw.slate400}
                  value={report}
                  onChangeText={setReport}
                  multiline
                  textAlignVertical="top"
                  style={styles.textarea}
                />
                <View style={styles.counter}>
                  <Text style={[styles.counterText, { color: tooShort ? F.green : tw.gray500 }]}>{report.length} characters</Text>
                  <Text style={[styles.counterText, { color: tooShort ? F.green : tw.gray500 }]}>Min 10 characters</Text>
                </View>
              </CardContent>
            </Card>

            <Press
              onPress={handleSubmit}
              disabled={submitDisabled}
              scale={0.98}
              accessibilityLabel="Submit Safety Report"
              style={[styles.submit, shadow('0 4px 14px rgba(220,38,38,0.25)'), submitDisabled ? { opacity: 0.5 } : null]}
            >
              {isSubmitting ? (
                <>
                  <Spinner size={20} color="#fff" />
                  <Text style={[styles.submitText, { marginLeft: 8 }]}>Submitting Report...</Text>
                </>
              ) : (
                <Text style={styles.submitText}>Submit Safety Report</Text>
              )}
            </Press>

            <Card style={[styles.slateCard, { borderRadius: 12, borderWidth: 0, marginTop: 20 }, shadow('sm')]}>
              <CardContent style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={styles.histTitle}>Your report history</Text>
                  <Press scale={0.98} onPress={fetchHistory} disabled={historyLoading} accessibilityLabel="Refresh" style={[styles.refresh, historyLoading ? { opacity: 0.5 } : null]}>
                    {historyLoading ? (
                      <>
                        <Spinner size={16} color={UI.foreground} />
                        <Text style={styles.refreshText}>Loading</Text>
                      </>
                    ) : (
                      <Text style={styles.refreshText}>Refresh</Text>
                    )}
                  </Press>
                </View>

                {historyLoading && historySorted.length === 0 ? (
                  <Text style={styles.histMuted}>Loading your reports...</Text>
                ) : historySorted.length === 0 ? (
                  <Text style={styles.histMuted}>No reports yet.</Text>
                ) : (
                  <View style={{ marginTop: 16, gap: 12 }}>
                    {historySorted.map((item, i) => (
                      <Press
                        key={item?._id || item?.id || `${item?.createdAt}-${i}`}
                        scale={1}
                        onPress={() => {
                          setSelected(item);
                          setDialogOpen(true);
                        }}
                        accessibilityLabel="Open report"
                        style={styles.histItem}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.histMsg} numberOfLines={1}>{item?.message || '—'}</Text>
                            <Text style={styles.histDate}>{formatDateTime(item?.createdAt)}</Text>
                          </View>
                          <Pill map={STATUS} value={item?.status} fallback="unread" def="unread" />
                        </View>
                      </Press>
                    ))}
                  </View>
                )}
              </CardContent>
            </Card>

            <Dialog
              visible={dialogOpen}
              onClose={() => setDialogOpen(false)}
              backdrop="rgba(0,0,0,0.4)"
              panelStyle={[styles.dialog, { width: Math.min(width - 24, 576), maxHeight: height * 0.85 }]}
            >
              <ScrollView>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={20} color={tw.red600} />
                    <Text style={styles.dialogTitle}>Report Details</Text>
                  </View>
                  <Text style={styles.dialogDesc}>Full details of your safety emergency report.</Text>
                </View>
                {selected ? (
                  <View style={{ gap: 16, marginTop: 16 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <Pill map={STATUS} value={selected?.status} fallback="unread" def="unread" />
                      {selected?.priority ? <Pill map={PRIORITY} value={selected.priority} fallback="medium" def="medium" /> : null}
                      {selected?.createdAt ? <Text style={styles.dialogDate}>{formatDateTime(selected.createdAt)}</Text> : null}
                    </View>
                    <View style={styles.msgBox}>
                      <Text style={styles.msgText}>{selected?.message || '—'}</Text>
                    </View>
                    {selected?.adminResponse ? (
                      <View style={styles.adminBox}>
                        <Text style={styles.adminLabel}>Admin response</Text>
                        <Text style={styles.adminText}>{selected.adminResponse}</Text>
                        {selected?.respondedAt ? <Text style={styles.adminAt}>Responded at: {formatDateTime(selected.respondedAt)}</Text> : null}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </ScrollView>
              <Press onPress={() => setDialogOpen(false)} accessibilityLabel="Close" style={styles.closeBtn}>
                <X size={20} color={tw.gray500} strokeWidth={2.5} />
              </Press>
            </Dialog>
          </>
        ) : (
          <Card style={[styles.slateCard, { borderWidth: 0, overflow: 'hidden' }, shadow('md')]}>
            <CardContent style={{ padding: 24, alignItems: 'center' }}>
              <View style={styles.okIcon}>
                <AlertTriangle size={32} color={tw.red600} />
              </View>
              <Text style={styles.okTitle}>Report Submitted</Text>
              <Text style={styles.okP}>Your safety report has been submitted. Our team will review it immediately and take appropriate action.</Text>
              <Text style={styles.okRed}>If this is a life-threatening emergency, please call 100 immediately.</Text>
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 96 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  back: { height: 40, width: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tw.slate100 },
  h1: { marginLeft: 16, flex: 1, fontSize: 20, lineHeight: 28, color: tw.slate900, ...poppins(700) },
  redCard: { borderRadius: 16, borderColor: tw.red100, overflow: 'hidden', marginBottom: 20, backgroundColor: '#fff' },
  blob: { position: 'absolute', top: -40, right: -40, width: 128, height: 128, borderRadius: 64, backgroundColor: tw.red100, opacity: 0.4 },
  redIcon: { backgroundColor: tw.red100, borderRadius: 999, padding: 12, marginTop: 2 },
  h3Lg: { fontSize: 18, lineHeight: 28, color: tw.slate900, marginBottom: 6, ...poppins(700) },
  pSlate: { fontSize: 14, lineHeight: 22.75, color: tw.slate600, marginBottom: 16, ...poppins(400) },
  callBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: tw.red100, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  callText: { fontSize: 16, lineHeight: 24, color: F.green, ...poppins(700) },
  slateCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, marginBottom: 20 },
  shieldIcon: { backgroundColor: tw.slate50, borderRadius: 999, padding: 12, marginTop: 2, borderWidth: 1, borderColor: tw.slate100 },
  h3: { fontSize: 16, lineHeight: 24, color: tw.slate900, marginBottom: 6, ...poppins(700) },
  pMuted: { fontSize: 14, lineHeight: 22.75, color: tw.slate500, ...poppins(400) },
  label: { fontSize: 14, lineHeight: 20, color: tw.slate900, marginBottom: 12, ...poppins(600) },
  textarea: { minHeight: 160, width: '100%', fontSize: 14, lineHeight: 22.75, backgroundColor: tw.slate50, borderWidth: 1, borderColor: tw.slate200, borderRadius: 12, padding: 16, color: tw.slate900, ...poppins(400) },
  counter: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  counterText: { fontSize: 12, lineHeight: 16, ...poppins(500) },
  submit: { width: '100%', height: 48, borderRadius: 12, backgroundColor: F.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(600) },
  histTitle: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(600) },
  refresh: { height: 32, paddingHorizontal: 12, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#F3F2EC', backgroundColor: '#fff', ...shadow('xs') },
  refreshText: { fontSize: 14, lineHeight: 20, color: UI.foreground, ...poppins(500) },
  histMuted: { fontSize: 14, lineHeight: 20, color: tw.gray500, marginTop: 16, ...poppins(400) },
  histItem: { width: '100%', borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, padding: 12, backgroundColor: tw.gray50 },
  histMsg: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  histDate: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 4, ...poppins(400) },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 11, lineHeight: 16.5 },
  // DialogContent has no padding of its own on the web either (its body sits flush).
  dialog: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: UI.border, ...shadow('2xl') },
  dialogTitle: { fontSize: 18, lineHeight: 18, color: UI.foreground, ...poppins(600) },
  dialogDesc: { fontSize: 14, lineHeight: 20, color: UI.mutedForeground, ...poppins(400) },
  dialogDate: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  closeBtn: { position: 'absolute', right: 20, top: 20, borderRadius: 999, padding: 8, backgroundColor: tw.gray50, borderWidth: 1, borderColor: 'rgba(229,231,235,0.6)' },
  msgBox: { borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', padding: 16 },
  msgText: { fontSize: 14, lineHeight: 22.75, color: tw.gray800, ...poppins(400) },
  adminBox: { borderRadius: 8, borderWidth: 1, borderColor: tw.emerald200, backgroundColor: 'rgba(236,253,245,0.6)', padding: 16 },
  adminLabel: { fontSize: 12, lineHeight: 16, color: tw.emerald700, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, ...poppins(600) },
  adminText: { fontSize: 14, lineHeight: 22.75, color: tw.emerald900, ...poppins(400) },
  adminAt: { fontSize: 12, lineHeight: 16, color: 'rgba(0,122,85,0.8)', marginTop: 8, ...poppins(400) },
  okIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: tw.red100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  okTitle: { fontSize: 20, lineHeight: 28, color: tw.gray900, marginBottom: 8, ...poppins(700) },
  okP: { fontSize: 14, lineHeight: 20, color: tw.gray600, marginBottom: 12, textAlign: 'center', ...poppins(400) },
  okRed: { fontSize: 12, lineHeight: 16, color: tw.red600, textAlign: 'center', ...poppins(500) },
});
