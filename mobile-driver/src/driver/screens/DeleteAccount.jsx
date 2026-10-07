import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { outfit as fo, shadow } from '../../theme';
import {
  clearDriverAuthState,
  deleteCurrentDriverAccount,
  getCurrentDriver,
  sendDriverLoginOtp,
  verifyDriverLoginOtp,
} from '../services/registrationService';
import { DT } from '../ui/dt';
import ScreenHeader from '../ui/ScreenHeader';
import { CtaButton, SectionLabel } from '../ui/Surface';

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
  const [otpFocused, setOtpFocused] = useState(false);

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
    <View style={{ flex: 1, backgroundColor: DT.bg }}>
      <ScreenHeader title="Delete Driver Account" subtitle="Danger zone" onBack={() => navigate(`${routePrefix}/profile`)} />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 48 + insets.bottom, gap: 16 }}>
        {success ? (
          <View style={styles.success}>
            <Text style={styles.successText}>{success}</Text>
            <Press scale={0.9} onPress={() => setSuccess(null)} accessibilityLabel="Dismiss" hitSlop={12}>
              <X size={16} color={DT.successInk} />
            </Press>
          </View>
        ) : null}
        {error ? (
          <View style={styles.error} accessibilityLiveRegion="polite">
            <AlertTriangle size={16} color={DT.danger} strokeWidth={2.5} />
            <Text style={styles.errorText}>{error}</Text>
            <Press scale={0.9} onPress={() => setError(null)} accessibilityLabel="Dismiss" hitSlop={12}>
              <X size={16} color={DT.danger} />
            </Press>
          </View>
        ) : null}

        <View style={styles.warning}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={styles.warningIcon}>
              <AlertTriangle size={20} color={DT.danger} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
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
          <SectionLabel style={styles.section}>Why are you leaving?</SectionLabel>
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
                  style={[styles.reason, i < REASONS.length - 1 ? styles.reasonBorder : null, on ? { backgroundColor: DT.dangerSoft } : null, hasPendingRequest ? { opacity: 0.6 } : null]}
                >
                  <View style={[styles.radio, on ? { borderColor: DT.danger, backgroundColor: DT.danger } : null]}>{on ? <View style={styles.radioDot} /> : null}</View>
                  <Text style={[styles.reasonText, on ? { color: DT.dangerInk } : null]}>{r}</Text>
                </Press>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 10, paddingTop: 8 }}>
          <CtaButton
            variant="danger"
            disabled={!canDelete}
            onPress={() => setShowConfirm(true)}
            title={hasPendingRequest ? 'REQUEST ALREADY SENT' : 'DELETE MY ACCOUNT'}
            accessibilityLabel={hasPendingRequest ? 'Request Already Sent' : 'Delete my account'}
            icon={<AlertTriangle size={16} color={DT.onBrand} strokeWidth={2.5} />}
            style={styles.delete}
            textStyle={styles.deleteText}
          />
          <CtaButton variant="outline" title="CANCEL" onPress={() => navigate(`${routePrefix}/profile`)} accessibilityLabel="Cancel" />
        </View>
      </ScrollView>

      <Dialog visible={showConfirm} onClose={() => setShowConfirm(false)} backdrop="rgba(0,0,0,0.6)" blur={8} panelStyle={styles.dialog}>
        <View style={styles.dialogIcon}>
          <AlertTriangle size={30} color={DT.danger} strokeWidth={2} />
        </View>
        <Text style={styles.dialogTitle}>Delete this account?</Text>
        <Text style={styles.dialogBody}>Your driver account will be marked inactive instead of being permanently removed.</Text>
        <Text style={styles.dialogNote}>Verify OTP first. We will then log you out on this device.</Text>
        {otpSent ? (
          <View style={{ alignSelf: 'stretch', marginBottom: 20 }}>
            <Text style={styles.otpLabel}>OTP SENT TO +91 {driverPhone}</Text>
            <View style={[styles.otpBox, otpFocused ? { borderColor: DT.brand } : null]}>
              <ShieldCheck size={16} color={DT.muted} strokeWidth={2.5} />
              <TextInput
                value={otp}
                onChangeText={(text) => setOtp(text.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="0000"
                placeholderTextColor={DT.faint}
                accessibilityLabel="OTP"
                onFocus={() => setOtpFocused(true)}
                onBlur={() => setOtpFocused(false)}
                style={styles.otpInput}
              />
            </View>
            {debugOtp ? <Text style={styles.debugOtp}>Dev OTP: {debugOtp}</Text> : null}
          </View>
        ) : null}
        <CtaButton
          variant="danger"
          loading={loading}
          onPress={otpSent ? handleDelete : handleSendOtp}
          title={otpSent ? 'VERIFY OTP & DELETE' : 'SEND OTP'}
          accessibilityLabel={otpSent ? 'Verify OTP & Delete' : 'Send OTP'}
          style={{ alignSelf: 'stretch', marginBottom: 8 }}
        />
        <Press scale={1} onPress={() => setShowConfirm(false)} accessibilityLabel="No, keep my account" style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'stretch' }}>
          <Text style={styles.dialogNo}>NO, KEEP MY ACCOUNT</Text>
        </Press>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  success: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: DT.successSoft, borderRadius: DT.radius.md, paddingHorizontal: 16, paddingVertical: 12 },
  successText: { flex: 1, fontSize: 13, lineHeight: 18, color: DT.successInk, ...fo(700) },
  error: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: DT.dangerSoft, borderRadius: DT.radius.md, paddingHorizontal: 16, paddingVertical: 12 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18, color: DT.dangerInk, ...fo(700) },
  warning: { borderRadius: DT.radius.xl, borderWidth: 1.5, borderColor: DT.danger, backgroundColor: DT.dangerSoft, padding: 20 },
  warningIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: DT.card, alignItems: 'center', justifyContent: 'center' },
  warningTitle: { fontSize: 16, lineHeight: 22, color: DT.dangerInk, ...fo(800) },
  warningSub: { fontSize: 12, lineHeight: 17, color: DT.dangerInk, ...fo(600) },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: DT.danger, marginTop: 7 },
  consequence: { flex: 1, fontSize: 13, lineHeight: 20, color: DT.dangerInk, ...fo(600) },
  section: { marginBottom: 10, paddingHorizontal: 4 },
  reasons: { borderRadius: DT.radius.xl, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.card, overflow: 'hidden', ...shadow('sm') },
  reason: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  reasonBorder: { borderBottomWidth: 1, borderBottomColor: DT.borderSoft },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: DT.border, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: DT.onBrand },
  reasonText: { fontSize: 14, lineHeight: 20, color: DT.ink, ...fo(700) },
  delete: { minHeight: 56 },
  deleteText: { minWidth: 180, letterSpacing: 1 },
  dialog: { width: '86%', maxWidth: 384, backgroundColor: DT.card, borderRadius: DT.radius.xl, padding: 24, alignItems: 'center', ...shadow('2xl') },
  dialogIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: DT.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  dialogTitle: { fontSize: 18, lineHeight: 28, color: DT.ink, marginBottom: 8, ...fo(800) },
  dialogBody: { fontSize: 13, lineHeight: 20, color: DT.inkSoft, marginBottom: 4, textAlign: 'center', ...fo(600) },
  dialogNote: { fontSize: 12, lineHeight: 17, color: DT.dangerInk, marginBottom: 20, textAlign: 'center', ...fo(700) },
  otpLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1.2, minWidth: 100, color: DT.muted, marginLeft: 4, ...fo(800) },
  otpBox: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.card, paddingHorizontal: 16, minHeight: 56 },
  otpInput: { flex: 1, padding: 0, minHeight: 28, textAlign: 'center', fontSize: 20, letterSpacing: 7, color: DT.ink, ...fo(800) },
  debugOtp: { marginTop: 4, textAlign: 'center', fontSize: 10, lineHeight: 15, color: DT.muted, ...fo(800) },
  dialogNo: { fontSize: 13, lineHeight: 18, letterSpacing: 1, minWidth: 140, color: DT.inkSoft, textAlign: 'center', ...fo(800) },
});
