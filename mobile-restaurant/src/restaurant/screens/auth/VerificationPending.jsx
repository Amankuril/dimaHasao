import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AlertTriangle, Clock3, ShieldCheck, XCircle } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { restaurantAPI } from '../../../api/restaurant';
import { useAuth } from '../../../context/AuthContext';
import { persistModuleFcmToken, syncPendingPartnerFcmQuick } from '../../../lib/push';
import { localStore } from '../../../lib/storage';
import { useLocation, useNavigate } from '../../../lib/webRouter';
import { color, elevation, radii, space, type } from '../../../theme';
import { AUTH, authStyles } from '../../components/AuthShell';
import { getModuleToken } from '../../utils/auth';
import { clearOnboardingFromLocalStorage } from '../../utils/onboardingUtils';

const clearPending = () => {
  localStore.removeItem('restaurant_pendingStatus');
  localStore.removeItem('restaurant_pendingMessage');
};

/** Port of Food/pages/restaurant/auth/VerificationPending.jsx (/food/restaurant/pending-verification). */
export default function VerificationPending() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const location = useLocation();
  const { clearSession, updateUser } = useAuth();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [localStatus, setLocalStatus] = useState(() => {
    if (location.state?.isDisabled) return 'banned';
    if (location.state?.isRejected !== undefined) return location.state.isRejected ? 'rejected' : 'pending';
    return localStore.getItem('restaurant_pendingStatus') || 'pending';
  });
  const [localMessage, setLocalMessage] = useState(() => location.state?.message || localStore.getItem('restaurant_pendingMessage') || '');
  const pendingPhone = useMemo(() => location.state?.phone || localStore.getItem('restaurant_pendingPhone') || '', [location.state?.phone]);

  const parsedMessage = useMemo(() => {
    if (localStatus === 'banned') return { text: 'Your restaurant has been disabled.', reason: 'Disabled by admin' };
    if (!localMessage) return { text: 'Your restaurant registration has been rejected. Please contact support.', reason: '' };
    const parts = localMessage.split(/Reason:\s*/i);
    if (parts.length > 1) return { text: parts[0].trim(), reason: parts[1].trim() };
    const colonParts = localMessage.split(/:\s*/);
    if (colonParts.length > 1 && colonParts[0].toLowerCase().includes('rejected')) return { text: `${colonParts[0].trim()}.`, reason: colonParts[1].trim() };
    return { text: localMessage, reason: '' };
  }, [localMessage, localStatus]);

  const isDisabledByAdmin = localStatus === 'banned';
  const isStopped = localStatus === 'rejected' || isDisabledByAdmin;

  // The approval is announced by push: make sure this device's token is on file.
  useEffect(() => {
    const phone = pendingPhone || localStore.getItem('restaurant_pendingPhone') || '';
    if (phone) syncPendingPartnerFcmQuick('restaurant', phone);
    if (getModuleToken('restaurant')) persistModuleFcmToken('restaurant').catch(() => {});
  }, [pendingPhone]);

  const checkApprovalStatus = useCallback(async () => {
    if (!getModuleToken('restaurant')) {
      setCheckingStatus(false);
      return;
    }
    try {
      const response = await restaurantAPI.refreshCurrentRestaurant();
      const restaurant = response?.data?.data?.restaurant || response?.data?.restaurant || response?.data?.data?.user || response?.data?.user;
      const status = String(restaurant?.status || '').toLowerCase();
      // The shell reads the status from the cached restaurant; keep it current.
      if (status) updateUser({ status, ...(restaurant?.rejectionReason ? { rejectionReason: restaurant.rejectionReason } : {}) });

      if (status === 'approved') {
        localStore.removeItem('restaurant_pendingPhone');
        clearPending();
        navigate('/food/restaurant', { replace: true });
        return;
      }
      if (status === 'banned') {
        const msg = 'Your restaurant has been disabled. Reason: Disabled by admin';
        setLocalStatus('banned');
        setLocalMessage(msg);
        localStore.setItem('restaurant_pendingStatus', 'banned');
        localStore.setItem('restaurant_pendingMessage', msg);
      } else if (status === 'rejected') {
        const msg = restaurant.rejectionReason
          ? `Your restaurant registration has been rejected. Reason: ${restaurant.rejectionReason}`
          : 'Your restaurant registration has been rejected. Please contact support.';
        setLocalStatus('rejected');
        setLocalMessage(msg);
        localStore.setItem('restaurant_pendingStatus', 'rejected');
        localStore.setItem('restaurant_pendingMessage', msg);
      } else if (status === 'pending') {
        setLocalStatus('pending');
        localStore.setItem('restaurant_pendingStatus', 'pending');
      }
    } catch {
      // keep showing the last known status
    } finally {
      setCheckingStatus(false);
    }
  }, [navigate, updateUser]);

  // Web: on mount, and again whenever the tab regains focus.
  useEffect(() => {
    checkApprovalStatus();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkApprovalStatus();
    });
    return () => sub.remove();
  }, [checkApprovalStatus]);

  // The web leaves the server session (and this device's push token) alone: only the local sign-in is
  // cleared, so the approval push still reaches this phone. The token is synced first, as the web does.
  const backToLogin = async () => {
    const phone = pendingPhone || localStore.getItem('restaurant_pendingPhone') || '';
    if (phone) await Promise.race([Promise.resolve(syncPendingPartnerFcmQuick('restaurant', phone)).catch(() => {}), new Promise((resolve) => setTimeout(resolve, 2000))]);
    await clearSession();
    localStore.removeItem('restaurant_pendingPhone');
    clearPending();
    navigate('/food/restaurant/login', { replace: true });
  };

  const reapply = () => {
    clearOnboardingFromLocalStorage();
    clearPending();
    navigate('/food/restaurant/onboarding?step=1', { replace: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: AUTH.bg }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.lg, paddingTop: space.xxl + insets.top, paddingBottom: space.xxl + insets.bottom }}>
        <View style={styles.card}>
          <View style={styles.top}>
            <View style={[styles.disc, isStopped ? styles.discStop : null]}>
              {isStopped ? <XCircle size={32} color={ERROR_ON_DARK} /> : <Clock3 size={32} color={color.goldOnDark} />}
            </View>
            <View style={[styles.pill, isStopped ? styles.pillStop : null]}>
              <Text style={[styles.pillText, isStopped ? { color: ERROR_ON_DARK } : null]}>{isStopped ? (isDisabledByAdmin ? 'Disabled' : 'Rejected') : 'Verification pending'}</Text>
            </View>
          </View>

          <View style={{ marginBottom: space.xl, alignItems: 'center' }}>
            {isStopped ? (
              <>
                <Text style={styles.h1} accessibilityRole="header">{isDisabledByAdmin ? 'Restaurant disabled' : 'Registration rejected'}</Text>
                <Text style={styles.body}>{isDisabledByAdmin ? 'Your restaurant has been disabled.' : parsedMessage.text}</Text>
                {parsedMessage.reason && !isDisabledByAdmin ? (
                  <View style={styles.reason}>
                    <Text style={styles.reasonLabel}>Reason for rejection</Text>
                    <Text style={styles.reasonText}>{parsedMessage.reason}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.h1} accessibilityRole="header">Your restaurant is under review</Text>
                <Text style={styles.body}>
                  Admin received your onboarding details successfully. Our team will verify your restaurant and activate your dashboard once approval is complete.
                </Text>
              </>
            )}
            <View style={styles.checkingRow}>
              {checkingStatus ? <ActivityIndicator size="small" color={AUTH.muted} /> : null}
              <Text style={styles.checking}>{checkingStatus ? 'Checking latest approval status…' : ' '}</Text>
            </View>
          </View>

          <View style={styles.next}>
            {isStopped ? <AlertTriangle size={20} color={ERROR_ON_DARK} style={{ marginTop: 2 }} /> : <ShieldCheck size={20} color={color.goldOnDark} style={{ marginTop: 2 }} />}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.nextTitle}>{isStopped ? 'What to do next' : 'What happens next'}</Text>
              <Text style={styles.nextBody}>
                {isDisabledByAdmin
                  ? 'Please reach out to support for more details or assistance regarding your account status.'
                  : localStatus === 'rejected'
                    ? 'Please review the reason above or reach out to support. You can register a new account if you need to submit new details.'
                    : 'We will notify you by email and push notification once verification is approved.'}
              </Text>
              {pendingPhone ? (
                <Text style={styles.phone}>
                  Registered phone: <Text style={{ color: AUTH.cream, fontFamily: 'Poppins_600SemiBold' }}>{pendingPhone}</Text>
                </Text>
              ) : null}
            </View>
          </View>

          <View style={{ gap: space.md }}>
            {isDisabledByAdmin ? (
              <Press scale={0.98} onPress={() => navigate('/food/restaurant/help-content')} style={authStyles.button}>
                <Text style={authStyles.buttonText}>Contact support</Text>
              </Press>
            ) : localStatus === 'rejected' ? (
              <Press scale={0.98} onPress={reapply} style={authStyles.button}>
                <Text style={authStyles.buttonText}>Re-apply</Text>
              </Press>
            ) : null}
            <Press scale={0.98} onPress={backToLogin} style={isStopped ? styles.outline : authStyles.button}>
              <Text style={isStopped ? styles.outlineText : authStyles.buttonText}>Back to login</Text>
            </Press>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const ERROR_ON_DARK = '#fca5a5'; // red-300: the only error tint with AA contrast on the deep-green panel

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1, borderColor: 'rgba(202,168,62,0.3)', backgroundColor: color.primaryDeep, padding: space.xxl, ...elevation.float },
  top: { alignItems: 'center', gap: space.md, marginBottom: space.lg },
  disc: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(202,168,62,0.15)', alignItems: 'center', justifyContent: 'center' },
  discStop: { backgroundColor: 'rgba(239,68,68,0.15)' },
  pill: { paddingHorizontal: space.md, height: 28, borderRadius: radii.pill, backgroundColor: 'rgba(202,168,62,0.15)', justifyContent: 'center' },
  pillStop: { backgroundColor: 'rgba(239,68,68,0.15)' },
  pillText: { ...type.label, color: color.goldOnDark },
  h1: { ...type.heading, fontSize: 20, lineHeight: 28, color: AUTH.cream, textAlign: 'center' },
  body: { marginTop: space.md, ...type.body, color: AUTH.muted, textAlign: 'center' },
  reason: { alignSelf: 'stretch', marginTop: space.lg, padding: space.md + 2, borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', backgroundColor: 'rgba(239,68,68,0.1)', gap: space.xs },
  reasonLabel: { ...type.label, color: ERROR_ON_DARK },
  reasonText: { ...type.body, color: AUTH.cream },
  checkingRow: { marginTop: space.md, minHeight: 20, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  checking: { ...type.caption, color: AUTH.muted, textAlign: 'center' },
  next: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, marginBottom: space.xl, borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(202,168,62,0.2)', backgroundColor: AUTH.field, padding: space.lg },
  nextTitle: { ...type.bodyStrong, color: AUTH.cream },
  nextBody: { marginTop: space.xs, ...type.small, color: AUTH.muted },
  phone: { marginTop: space.sm, ...type.small, color: AUTH.muted },
  outline: { height: 54, borderRadius: radii.md, borderWidth: 1.5, borderColor: 'rgba(202,168,62,0.45)', alignItems: 'center', justifyContent: 'center' },
  outlineText: { ...type.button, fontSize: 16, color: AUTH.cream },
});
