import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle2, Phone, RefreshCw, Shield, X } from 'lucide-react-native';
import { Dialog } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { openExternal } from '../../../lib/links';
import { toast } from '../../../lib/notify';
import { userAPI } from '../../../api/food';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { Button, Card, IconButton, SectionHeader, StatusBadge } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { PageHeader } from '../../components/profile/ProfileChrome';
import { color, elevation, radii, space, type } from '../../../theme';

const STATUS = { unread: 'primary', read: 'neutral', urgent: 'danger', resolved: 'success' };
const PRIORITY = { low: 'neutral', medium: 'warning', high: 'danger', critical: 'danger' };
const cap = (s) => String(s).replace(/^\w/, (c) => c.toUpperCase());

function Pill({ map, value, fallback, def }) {
  const t = map[String(value)] || map[fallback];
  return <StatusBadge label={cap(value || def)} tone={t} />;
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
  const insets = useSafeAreaInsets();
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageHeader title="Report an Emergency" onBack={goBack} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={styles.emergency}>
          <View style={styles.redIcon}>
            <Phone size={20} color={color.danger} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.h3}>Emergency Contact</Text>
            <Text style={styles.p}>For immediate emergencies, please call your local emergency services directly for immediate assistance.</Text>
            <Button title="Call 100" icon={Phone} variant="danger" fullWidth={false} onPress={() => openExternal('tel:100')} accessibilityLabel="Call 100" style={{ marginTop: space.md }} />
          </View>
        </View>

        {!isSubmitted ? (
          <>
            <Card style={styles.rowCard}>
              <View style={styles.shieldIcon}>
                <Shield size={20} color={color.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.h3}>Safety is our priority</Text>
                <Text style={styles.p}>Report any safety concerns, incidents, or emergencies related to your order or delivery experience. We take these reports very seriously.</Text>
              </View>
            </Card>

            <Card style={{ gap: space.xs }}>
              <Text style={styles.label}>Describe the safety concern or emergency</Text>
              <TextInput
                placeholder="Please provide details about the safety issue..."
                placeholderTextColor={color.textMuted}
                value={report}
                onChangeText={setReport}
                multiline
                textAlignVertical="top"
                accessibilityLabel="Describe the safety concern or emergency"
                style={styles.textarea}
              />
              <View style={styles.counter}>
                <Text style={[styles.counterText, { color: tooShort ? color.warning : color.textMuted }]}>{report.length} characters</Text>
                <Text style={[styles.counterText, { color: tooShort ? color.warning : color.textMuted }]}>Min 10 characters</Text>
              </View>
            </Card>

            <Button
              title={isSubmitting ? 'Submitting Report...' : 'Submit Safety Report'}
              size="lg"
              loading={isSubmitting}
              onPress={handleSubmit}
              disabled={submitDisabled}
              accessibilityLabel="Submit Safety Report"
            />

            <View style={{ marginTop: space.md }}>
              <View style={styles.histHead}>
                <SectionHeader title="Your report history" style={{ marginBottom: 0, flexShrink: 1 }} />
                <Button
                  title={historyLoading ? 'Loading' : 'Refresh'}
                  icon={RefreshCw}
                  variant="outline"
                  size="sm"
                  fullWidth={false}
                  loading={historyLoading}
                  onPress={fetchHistory}
                  accessibilityLabel="Refresh"
                  style={{ minHeight: 44 }}
                />
              </View>

              {historyLoading && historySorted.length === 0 ? (
                <Text style={styles.histMuted}>Loading your reports...</Text>
              ) : historySorted.length === 0 ? (
                <Text style={styles.histMuted}>No reports yet.</Text>
              ) : (
                <View style={{ marginTop: space.md, gap: space.sm }}>
                  {historySorted.map((item, i) => (
                    <Press
                      key={item?._id || item?.id || `${item?.createdAt}-${i}`}
                      scale={0.99}
                      onPress={() => {
                        setSelected(item);
                        setDialogOpen(true);
                      }}
                      accessibilityLabel="Open report"
                      style={styles.histItem}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.histMsg} numberOfLines={1}>
                          {item?.message || '—'}
                        </Text>
                        <Text style={styles.histDate}>{formatDateTime(item?.createdAt)}</Text>
                      </View>
                      <Pill map={STATUS} value={item?.status} fallback="unread" def="unread" />
                    </Press>
                  ))}
                </View>
              )}
            </View>

            <Dialog
              visible={dialogOpen}
              onClose={() => setDialogOpen(false)}
              backdrop={color.overlay}
              panelStyle={[styles.dialog, { width: Math.min(width - 24, 576), maxHeight: height * 0.85 }]}
            >
              <View style={styles.dialogHead}>
                <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <AlertTriangle size={20} color={color.danger} />
                    <Text style={styles.dialogTitle}>Report Details</Text>
                  </View>
                  <Text style={styles.dialogDesc}>Full details of your safety emergency report.</Text>
                </View>
                <IconButton icon={X} label="Close" variant="soft" onPress={() => setDialogOpen(false)} />
              </View>
              <ScrollView contentContainerStyle={{ padding: space.xl, paddingTop: 0 }}>
                {selected ? (
                  <View style={{ gap: space.lg }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm }}>
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
            </Dialog>
          </>
        ) : (
          <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
            <View style={styles.okIcon}>
              <CheckCircle2 size={30} color={color.success} />
            </View>
            <Text style={styles.okTitle}>Report Submitted</Text>
            <Text style={styles.okP}>Your safety report has been submitted. Our team will review it immediately and take appropriate action.</Text>
            <Text style={styles.okRed}>If this is a life-threatening emergency, please call 100 immediately.</Text>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md },
  emergency: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg, borderRadius: radii.lg, backgroundColor: color.dangerSoft },
  redIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  rowCard: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  shieldIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  h3: { ...type.subheading, color: color.text, marginBottom: space.xxs },
  p: { ...type.body, color: color.textSecondary },
  label: { ...type.label, color: color.text },
  textarea: { minHeight: 160, width: '100%', ...type.body, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, padding: space.md, color: color.text },
  counter: { marginTop: space.xs, flexDirection: 'row', justifyContent: 'space-between' },
  counterText: { ...type.caption },
  histHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  histMuted: { ...type.body, color: color.textMuted, marginTop: space.md },
  histItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, padding: space.md, backgroundColor: color.surface },
  histMsg: { ...type.bodyStrong, color: color.text },
  histDate: { ...type.caption, color: color.textMuted, marginTop: space.xxs },
  dialog: { backgroundColor: color.surface, borderRadius: radii.xl, overflow: 'hidden', ...elevation.float },
  dialogHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.xl, paddingRight: space.md, paddingBottom: space.lg },
  dialogTitle: { ...type.heading, color: color.text },
  dialogDesc: { ...type.small, color: color.textSecondary },
  dialogDate: { ...type.caption, color: color.textMuted },
  msgBox: { borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, padding: space.lg },
  msgText: { ...type.body, color: color.text },
  adminBox: { borderRadius: radii.md, backgroundColor: color.successSoft, padding: space.lg },
  adminLabel: { ...type.overline, color: color.success, marginBottom: space.sm },
  adminText: { ...type.body, color: color.text },
  adminAt: { ...type.caption, color: color.textSecondary, marginTop: space.sm },
  okIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  okTitle: { ...type.heading, color: color.text, marginBottom: space.xs },
  okP: { ...type.body, color: color.textSecondary, marginBottom: space.md, textAlign: 'center' },
  okRed: { ...type.small, color: color.danger, textAlign: 'center' },
});
