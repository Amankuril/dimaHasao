import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, ArrowLeft, ShieldCheck, X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { outfit as fo, shadow, tw } from '../../theme';
import {
  clearDriverAuthState,
  deleteCurrentDriverAccount,
  getCurrentDriver,
  sendDriverLoginOtp,
  verifyDriverLoginOtp,
} from '../services/registrationService';

const REASONS = [
  'Low earnings',
  'Too many technical issues',
  'Switching to another platform',
  'Privacy concerns',
  'Taking a break',
  'Other',
];

const CONSEQUENCES = [
  'Your driver account will be marked inactive with a soft delete',
  'You will be logged out on this device',
  'You cannot accept rides with this account after deletion',
  'Completed ride history may still keep trip records for receipts and reports',
];

/** Port of Taxi/modules/driver/pages/settings/DeleteAccount.jsx (/taxi/driver/delete-account). */
export default function DriverDeleteAccount() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const routePrefix = '/taxi/driver';
  const [reason, setReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [driverPhone, setDriverPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [debugOtp, setDebugOtp] = useState('');

  useEffect(() => {
    let active = true;

    const loadDriver = async () => {
      setIsFetching(true);
      setError(null);

      try {
        const response = await getCurrentDriver();
        const driver = response?.data || {};

        if (!active) {
          return;
        }

        setDriverPhone(String(driver.phone || '').replace(/\D/g, '').slice(-10));
        setPendingRequest(driver.deletionRequest || null);
      } catch (requestError) {
        if (active) {
          setError(requestError?.message || 'Unable to load driver account');
        }
      } finally {
        if (active) {
          setIsFetching(false);
        }
      }
    };

    loadDriver();

    return () => {
      active = false;
    };
  }, []);

  const hasPendingRequest = pendingRequest?.status === 'pending';

  const handleSendOtp = async () => {
    if (!driverPhone) {
      setError('Driver phone number is not available. Please login again.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await sendDriverLoginOtp({ phone: driverPhone });
      const session = response?.data?.session || response?.session || {};
      setDebugOtp(session.debugOtp || '');
      setOtp(String(session.debugOtp || '').slice(0, 4));
      setOtpSent(true);
      setSuccess(`OTP sent to +91 ${driverPhone}`);
    } catch (requestError) {
      setError(requestError?.message || 'Unable to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!/^\d{4}$/.test(otp)) {
      setError('Please enter the 4-digit OTP sent to your phone.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await verifyDriverLoginOtp({ phone: driverPhone, otp });
      await deleteCurrentDriverAccount(reason);
      clearDriverAuthState();
      setSuccess('Your driver account was soft deleted and you have been logged out.');
      setShowConfirm(false);
      setTimeout(() => {
        navigate(`${routePrefix}/login`, { replace: true });
      }, 900);
    } catch (requestError) {
      setError(requestError?.message || 'OTP verification or deletion failed. Please try again.');
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  const canDelete = Boolean(reason) && !hasPendingRequest && !isFetching;

  return (
    <LinearGradient colors={['#F8FAFC', '#F3F4F6', '#EEF2F7']} locations={[0, 0.38, 1]} style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: 40 + insets.top }]}>
        <Press scale={0.95} onPress={() => navigate(`${routePrefix}/profile`)} accessibilityLabel="Go back" style={styles.back} hitSlop={6}>
          <ArrowLeft size={18} color={tw.slate900} strokeWidth={2.5} />
        </Press>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>DANGER ZONE</Text>
          <Text style={styles.title} accessibilityRole="header">Delete Driver Account</Text>
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 + insets.bottom, gap: 16 }}>
        {success ? (
          <View style={styles.success}>
            <Text style={styles.successText}>{success}</Text>
            <Press scale={0.9} onPress={() => setSuccess(null)} accessibilityLabel="Dismiss" hitSlop={12}>
              <X size={13} color={tw.emerald400} />
            </Press>
          </View>
        ) : null}
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
              <Text style={styles.warningTitle}>Delete driver account</Text>
              <Text style={styles.warningSub}>This will soft delete and log you out</Text>
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
                <Press
                  key={r}
                  scale={1}
                  disabled={hasPendingRequest}
                  onPress={() => !hasPendingRequest && setReason(r)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on, disabled: hasPendingRequest }}
                  accessibilityLabel={r}
                  style={[styles.reason, i < REASONS.length - 1 ? styles.reasonBorder : null, on ? { backgroundColor: 'rgba(254,242,242,0.6)' } : null, hasPendingRequest ? { opacity: 0.6 } : null]}
                >
                  <View style={[styles.radio, on ? { borderColor: tw.red500, backgroundColor: tw.red500 } : null]}>{on ? <View style={styles.radioDot} /> : null}</View>
                  <Text style={[styles.reasonText, on ? { color: tw.red600 } : null]}>{r}</Text>
                </Press>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 10, paddingTop: 8 }}>
          <Press
            scale={hasPendingRequest ? 1 : 0.97}
            disabled={!canDelete}
            onPress={() => setShowConfirm(true)}
            accessibilityLabel={hasPendingRequest ? 'Request Already Sent' : 'Delete my account'}
            accessibilityState={{ disabled: !canDelete }}
            style={[styles.delete, canDelete ? shadow('0 6px 20px rgba(239,68,68,0.25)') : { backgroundColor: tw.slate100 }]}
          >
            <AlertTriangle size={15} color={canDelete ? '#fff' : tw.slate400} strokeWidth={2.5} />
            <Text style={[styles.deleteText, canDelete ? null : { color: tw.slate400 }]}>{hasPendingRequest ? 'REQUEST ALREADY SENT' : 'DELETE MY ACCOUNT'}</Text>
          </Press>
          <Press scale={1} onPress={() => navigate(`${routePrefix}/profile`)} accessibilityLabel="Cancel" style={styles.cancel}>
            <Text style={styles.cancelText}>CANCEL</Text>
          </Press>
        </View>
      </ScrollView>

      <Dialog visible={showConfirm} onClose={() => setShowConfirm(false)} backdrop="rgba(0,0,0,0.6)" blur={8} panelStyle={styles.dialog}>
        <View style={styles.dialogIcon}>
          <AlertTriangle size={30} color={tw.red500} strokeWidth={2} />
        </View>
        <Text style={styles.dialogTitle}>Delete this account?</Text>
        <Text style={styles.dialogBody}>Your driver account will be marked inactive instead of being permanently removed.</Text>
        <Text style={styles.dialogNote}>Verify OTP first. We will then log you out on this device.</Text>
        {otpSent ? (
          <View style={{ alignSelf: 'stretch', marginBottom: 20 }}>
            <Text style={styles.otpLabel}>OTP SENT TO +91 {driverPhone}</Text>
            <View style={styles.otpBox}>
              <ShieldCheck size={16} color={tw.slate400} strokeWidth={2.5} />
              <TextInput
                value={otp}
                onChangeText={(text) => setOtp(text.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="0000"
                placeholderTextColor="rgba(15,23,43,0.5)"
                accessibilityLabel="OTP"
                style={styles.otpInput}
              />
            </View>
            {debugOtp ? <Text style={styles.debugOtp}>Dev OTP: {debugOtp}</Text> : null}
          </View>
        ) : null}
        <Press scale={0.97} disabled={loading} onPress={otpSent ? handleDelete : handleSendOtp} accessibilityLabel={otpSent ? 'Verify OTP & Delete' : 'Send OTP'} accessibilityState={{ busy: loading }} style={styles.dialogYes}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.dialogYesText}>{otpSent ? 'VERIFY OTP & DELETE' : 'SEND OTP'}</Text>}
        </Press>
        <Press scale={1} onPress={() => setShowConfirm(false)} accessibilityLabel="No, keep my account" style={{ paddingVertical: 14, alignSelf: 'stretch' }}>
          <Text style={styles.dialogNo}>NO, KEEP MY ACCOUNT</Text>
        </Press>
      </Dialog>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: 'rgba(255,255,255,0.9)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.8)', ...shadow('0 4px 20px rgba(15,23,42,0.05)') },
  back: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  kicker: { fontSize: 9, lineHeight: 13.5, letterSpacing: 2.34, color: tw.red400, ...fo(900) },
  title: { fontSize: 19, lineHeight: 28.5, letterSpacing: -0.475, color: tw.red600, ...fo(900) },
  success: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: tw.emerald50, borderWidth: 1, borderColor: tw.emerald100, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  successText: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.emerald600, ...fo(900) },
  error: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red100, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.red600, ...fo(900) },
  warning: { borderRadius: 20, borderWidth: 2, borderColor: tw.red100, backgroundColor: 'rgba(254,242,242,0.6)', padding: 20 },
  warningIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: tw.red100, alignItems: 'center', justifyContent: 'center' },
  warningTitle: { fontSize: 14, lineHeight: 17.5, color: tw.red700, ...fo(900) },
  warningSub: { fontSize: 11, lineHeight: 16.5, color: tw.red400, ...fo(700) },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: tw.red400, marginTop: 6 },
  consequence: { flex: 1, fontSize: 12, lineHeight: 19.5, color: tw.red600, ...fo(700) },
  section: { fontSize: 10, lineHeight: 15, letterSpacing: 2.6, color: tw.slate400, marginBottom: 8, ...fo(900) },
  reasons: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', overflow: 'hidden', ...shadow('0 4px 14px rgba(15,23,42,0.05)') },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  reasonBorder: { borderBottomWidth: 1, borderBottomColor: tw.slate50 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: tw.slate200, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  reasonText: { fontSize: 13, lineHeight: 19.5, color: tw.slate700, ...fo(900) },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 18, backgroundColor: tw.red500 },
  deleteText: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: '#fff', ...fo(900) },
  cancel: { paddingVertical: 16, borderRadius: 18, borderWidth: 1, borderColor: tw.slate100, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center' },
  cancelText: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: tw.slate500, ...fo(900) },
  dialog: { width: '82%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 28, padding: 28, alignItems: 'center', ...shadow('2xl') },
  dialogIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: tw.red50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  dialogTitle: { fontSize: 18, lineHeight: 28, color: tw.slate900, marginBottom: 8, ...fo(900) },
  dialogBody: { fontSize: 13, lineHeight: 21.1, color: tw.slate500, marginBottom: 4, textAlign: 'center', ...fo(700) },
  dialogNote: { fontSize: 12, lineHeight: 16, color: tw.red400, marginBottom: 20, textAlign: 'center', ...fo(700) },
  otpLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 2.2, color: tw.slate400, marginLeft: 4, ...fo(900) },
  otpBox: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, borderWidth: 2, borderColor: tw.slate100, backgroundColor: tw.slate50, paddingHorizontal: 16, paddingVertical: 12 },
  otpInput: { flex: 1, padding: 0, textAlign: 'center', fontSize: 20, letterSpacing: 7, color: tw.slate900, ...fo(900) },
  debugOtp: { marginTop: 4, textAlign: 'center', fontSize: 10, lineHeight: 15, color: tw.slate400, ...fo(900) },
  dialogYes: { alignSelf: 'stretch', backgroundColor: tw.red500, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  dialogYesText: { fontSize: 13, lineHeight: 18, letterSpacing: 1.3, color: '#fff', ...fo(900) },
  dialogNo: { fontSize: 13, lineHeight: 18, letterSpacing: 1.3, color: tw.slate400, textAlign: 'center', ...fo(900) },
});
