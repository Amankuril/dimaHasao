import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, ArrowLeft, X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from '../../lib/webRouter';
import { shadow, tw } from '../../theme';
import { fo } from '../account/ui';
import { socketService } from '../api/socket';
import { userAuthService } from '../services/authService';
import { clearCurrentRide } from '../services/currentRideService';

const REASONS = ['I use another app', 'Too expensive', 'Privacy concerns', 'Technical issues', 'Taking a break', 'Other'];
const CONSEQUENCES = [
  'An admin will review your deletion request',
  'Your account stays active until the request is approved',
  'After approval, ride history, addresses, and preferences may be removed',
  'Active bookings may be cancelled after approval',
  'Rejected requests keep your account unchanged',
];

/** Port of Taxi/modules/user/pages/profile/DeleteAccount.jsx (/taxi/user/profile/delete-account). */
export default function DeleteAccount() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const { clearSession } = useAuth();
  const [reason, setReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await userAuthService.requestAccountDeletion(reason);
      clearCurrentRide();
      socketService.disconnect();
      setShowConfirm(false);
      // Web: clears the local session and returns to the login page.
      await clearSession?.();
      navigate('/app/login', { replace: true });
    } catch (requestError) {
      setError(requestError?.message || 'Something went wrong. Please try again.');
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <LinearGradient colors={['#F8FAFC', '#F3F4F6', '#EEF2F7']} locations={[0, 0.38, 1]} style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: 40 + insets.top }]}>
        <Press scale={0.95} onPress={() => navigate('/taxi/user/profile')} accessibilityLabel="Go back" style={styles.back} hitSlop={6}>
          <ArrowLeft size={18} color={tw.slate900} strokeWidth={2.5} />
        </Press>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>DANGER ZONE</Text>
          <Text style={styles.title} accessibilityRole="header">Delete Account</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 + insets.bottom, gap: 16 }}>
        {error ? (
          <View style={styles.error} accessibilityLiveRegion="polite">
            <AlertTriangle size={14} color={tw.red500} strokeWidth={2.5} />
            <Text style={styles.errorText}>{error}</Text>
            <Press scale={0.9} onPress={() => setError(null)} accessibilityLabel="Dismiss" hitSlop={12}>
              <X size={13} color={tw.red400} />
            </Press>
          </View>
        ) : null}

        <View style={styles.warning}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={styles.warningIcon}>
              <AlertTriangle size={18} color={tw.red500} strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.warningTitle}>Delete acccount</Text>
              <Text style={styles.warningSub}>Admin approval is required</Text>
            </View>
          </View>
          <View style={{ gap: 8 }}>
            {CONSEQUENCES.map((c) => (
              <View key={c} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <View style={styles.bullet} />
                <Text style={styles.consequence}>{c}</Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.section}>WHY ARE YOU LEAVING?</Text>
          <View style={styles.reasons} accessibilityRole="radiogroup">
            {REASONS.map((r, i) => {
              const on = reason === r;
              return (
                <Press key={r} scale={1} onPress={() => setReason(r)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={r} style={[styles.reason, i < REASONS.length - 1 ? styles.reasonBorder : null, on ? { backgroundColor: 'rgba(254,242,242,0.6)' } : null]}>
                  <View style={[styles.radio, on ? { borderColor: tw.red500, backgroundColor: tw.red500 } : null]}>{on ? <View style={styles.radioDot} /> : null}</View>
                  <Text style={[styles.reasonText, on ? { color: tw.red600 } : null]}>{r}</Text>
                </Press>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 10, paddingTop: 8 }}>
          <Press scale={0.97} disabled={!reason} onPress={() => setShowConfirm(true)} accessibilityLabel="Delete my account" accessibilityState={{ disabled: !reason }} style={[styles.delete, reason ? null : { backgroundColor: tw.slate100, elevation: 0, shadowOpacity: 0 }]}>
            <AlertTriangle size={15} color={reason ? '#fff' : tw.slate400} strokeWidth={2.5} />
            <Text style={[styles.deleteText, reason ? null : { color: tw.slate400 }]}>DELETE MY ACCOUNT</Text>
          </Press>
          <Press scale={0.98} onPress={() => navigate('/taxi/user/profile')} accessibilityLabel="Cancel" style={styles.cancel}>
            <Text style={styles.cancelText}>CANCEL</Text>
          </Press>
        </View>
      </ScrollView>

      <Dialog visible={showConfirm} onClose={() => !loading && setShowConfirm(false)} backdrop="rgba(0,0,0,0.6)" panelStyle={styles.dialog}>
        <View style={styles.dialogIcon}>
          <AlertTriangle size={30} color={tw.red500} strokeWidth={2} />
        </View>
        <Text style={styles.dialogTitle}>Send deletion request?</Text>
        <Text style={styles.dialogBody}>Admin will review this request before your account is deleted.</Text>
        <Text style={styles.dialogNote}>Your account remains active until approval.</Text>
        <Press scale={0.97} disabled={loading} onPress={handleDelete} accessibilityLabel="Yes, send request" accessibilityState={{ busy: loading }} style={styles.dialogYes}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.dialogYesText}>YES, SEND REQUEST</Text>}
        </Press>
        <Press scale={0.97} disabled={loading} onPress={() => setShowConfirm(false)} accessibilityLabel="No, keep my account" style={{ paddingVertical: 14, alignSelf: 'stretch' }}>
          <Text style={styles.dialogNo}>NO, KEEP MY ACCOUNT</Text>
        </Press>
      </Dialog>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: 'rgba(255,255,255,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.8)', ...shadow('0 4px 20px rgba(15,23,42,0.05)') },
  back: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  kicker: { fontSize: 9, lineHeight: 14, letterSpacing: 2.3, color: tw.red400, ...fo(900) },
  title: { fontSize: 19, lineHeight: 26, letterSpacing: -0.475, color: tw.red600, ...fo(900) },
  error: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red100, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.red600, ...fo(900) },
  warning: { borderRadius: 20, borderWidth: 2, borderColor: tw.red100, backgroundColor: 'rgba(254,242,242,0.6)', padding: 20 },
  warningIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: tw.red100, alignItems: 'center', justifyContent: 'center' },
  warningTitle: { fontSize: 14, lineHeight: 17.5, color: tw.red700, ...fo(900) },
  warningSub: { fontSize: 11, lineHeight: 16, color: tw.red400, ...fo(700) },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: tw.red400, marginTop: 7 },
  consequence: { flex: 1, fontSize: 12, lineHeight: 19.5, color: tw.red600, ...fo(700) },
  section: { fontSize: 10, lineHeight: 15, letterSpacing: 2.6, color: tw.slate400, marginBottom: 8, ...fo(900) },
  reasons: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', overflow: 'hidden', ...shadow('0 4px 14px rgba(15,23,42,0.05)') },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  reasonBorder: { borderBottomWidth: 1, borderBottomColor: tw.slate50 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: tw.slate200, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  reasonText: { fontSize: 13, lineHeight: 18, color: tw.slate700, ...fo(900) },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 18, backgroundColor: tw.red500, ...shadow('0 6px 20px rgba(239,68,68,0.25)') },
  deleteText: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: '#fff', ...fo(900) },
  cancel: { paddingVertical: 16, borderRadius: 18, borderWidth: 1, borderColor: tw.slate100, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center' },
  cancelText: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: tw.slate500, ...fo(900) },
  dialog: { width: '82%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 28, padding: 28, alignItems: 'center', ...shadow('2xl') },
  dialogIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: tw.red50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  dialogTitle: { fontSize: 18, lineHeight: 28, color: tw.slate900, marginBottom: 8, ...fo(900) },
  dialogBody: { fontSize: 13, lineHeight: 21, color: tw.slate500, marginBottom: 4, textAlign: 'center', ...fo(700) },
  dialogNote: { fontSize: 12, lineHeight: 16, color: tw.red400, marginBottom: 24, textAlign: 'center', ...fo(700) },
  dialogYes: { alignSelf: 'stretch', backgroundColor: tw.red500, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  dialogYesText: { fontSize: 13, lineHeight: 18, letterSpacing: 1.3, color: '#fff', ...fo(900) },
  dialogNo: { fontSize: 13, lineHeight: 18, letterSpacing: 1.3, color: tw.slate400, textAlign: 'center', ...fo(900) },
});
