import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AlertTriangle, Clock3, ShieldCheck, X } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { restaurantAPI } from '../../../api/restaurant';
import { useAuth } from '../../../context/AuthContext';
import { persistModuleFcmToken, syncPendingPartnerFcmQuick } from '../../../lib/push';
import { localStore } from '../../../lib/storage';
import { useLocation, useNavigate } from '../../../lib/webRouter';
import { poppins, shadow } from '../../../theme';
import { AUTH } from '../../components/AuthShell';
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
    <View style={{ flex: 1, backgroundColor: isDisabledByAdmin ? '#1b0b09' : AUTH.bg }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingTop: 24 + insets.top, paddingBottom: 24 + insets.bottom }}>
        <View style={styles.card}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            {isStopped ? (
              <View style={styles.banner}>
                <View style={styles.diamond}>
                  <View style={{ transform: [{ rotate: '-45deg' }] }}>
                    <X size={16} color="#fff" strokeWidth={4} />
                  </View>
                </View>
                <Text style={styles.bannerText}>{isDisabledByAdmin ? 'DISABLED' : 'REJECTED'}</Text>
                <View style={styles.bannerTip} />
              </View>
            ) : (
              <View style={styles.clock}>
                <Clock3 size={32} color={AUTH.gold} />
              </View>
            )}
          </View>

          <View style={{ marginBottom: 16, alignItems: 'center' }}>
            {isStopped ? (
              <>
                <Text style={styles.h1} accessibilityRole="header">{isDisabledByAdmin ? 'Restaurant Disabled' : 'Registration Rejected'}</Text>
                <Text style={styles.body}>{isDisabledByAdmin ? 'Your restaurant has been disabled.' : parsedMessage.text}</Text>
                {parsedMessage.reason && !isDisabledByAdmin ? (
                  <View style={styles.reason}>
                    <Text style={styles.reasonLabel}>REASON FOR REJECTION:</Text>
                    <Text style={styles.reasonText}>{parsedMessage.reason}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.kicker}>VERIFICATION PENDING</Text>
                <Text style={styles.h1Small} accessibilityRole="header">{'Your restaurant is\nunder review'}</Text>
                <Text style={styles.body}>
                  Admin received your onboarding details successfully. Our team will verify your restaurant and activate your dashboard once approval is complete.
                </Text>
              </>
            )}
            <Text style={styles.checking}>{checkingStatus ? 'CHECKING LATEST APPROVAL STATUS...' : ' '}</Text>
          </View>

          <View style={styles.next}>
            {isStopped ? <AlertTriangle size={20} color="#fca5a5" style={{ marginTop: 2 }} /> : <ShieldCheck size={20} color={AUTH.gold} style={{ marginTop: 2 }} />}
            <View style={{ flex: 1 }}>
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
                  Registered phone: <Text style={{ color: AUTH.muted, ...poppins(500) }}>{pendingPhone}</Text>
                </Text>
              ) : null}
            </View>
          </View>

          <View style={{ gap: 12 }}>
            {isDisabledByAdmin ? (
              <Press scale={0.98} onPress={() => navigate('/food/restaurant/help-content')} style={styles.primary}>
                <Text style={styles.primaryText}>Contact Support</Text>
              </Press>
            ) : localStatus === 'rejected' ? (
              <Press scale={0.98} onPress={reapply} style={styles.primary}>
                <Text style={styles.primaryText}>Re-apply</Text>
              </Press>
            ) : null}
            <Press scale={0.98} onPress={backToLogin} style={isStopped ? styles.outline : styles.primary}>
              <Text style={isStopped ? styles.outlineText : styles.primaryText}>Back to login</Text>
            </Press>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const RED = '#E51A21';

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(202,168,62,0.3)', backgroundColor: AUTH.card, padding: 20, ...shadow('0 28px 80px rgba(0,0,0,0.65)') },
  banner: { height: 36, marginVertical: 8, marginLeft: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: RED, borderTopLeftRadius: 6, borderBottomLeftRadius: 6, paddingLeft: 32, paddingRight: 12 },
  bannerText: { flexShrink: 0, paddingRight: 3, fontSize: 13, lineHeight: 15, letterSpacing: 2.6, color: '#fff', ...poppins(800) },
  bannerTip: { position: 'absolute', right: -13, top: 5, width: 26, height: 26, backgroundColor: RED, transform: [{ rotate: '45deg' }] },
  diamond: { position: 'absolute', left: -16, top: 2, width: 32, height: 32, backgroundColor: RED, borderWidth: 3, borderColor: AUTH.card, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }], zIndex: 2 },
  clock: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(202,168,62,0.15)', alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 20, lineHeight: 28, color: AUTH.cream, textAlign: 'center', ...poppins(800) },
  h1Small: { fontSize: 15, lineHeight: 20, color: AUTH.cream, textAlign: 'center', ...poppins(800) },
  kicker: { marginBottom: 8, fontSize: 12, lineHeight: 16, letterSpacing: 3.84, color: AUTH.gold, ...poppins(600) },
  body: { marginTop: 12, fontSize: 14, lineHeight: 24, color: AUTH.muted, textAlign: 'center', ...poppins(400) },
  reason: { alignSelf: 'stretch', marginTop: 16, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', backgroundColor: 'rgba(239,68,68,0.1)' },
  reasonLabel: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: '#fca5a5', marginBottom: 4, ...poppins(800) },
  reasonText: { fontSize: 14, lineHeight: 23, color: AUTH.cream, ...poppins(500) },
  checking: { marginTop: 12, minHeight: 16, fontSize: 12, lineHeight: 16, letterSpacing: 2.16, color: AUTH.dim, textAlign: 'center', ...poppins(500) },
  next: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(202,168,62,0.2)', backgroundColor: AUTH.field, padding: 14 },
  nextTitle: { fontSize: 14, lineHeight: 20, color: AUTH.cream, ...poppins(600) },
  nextBody: { marginTop: 4, fontSize: 14, lineHeight: 20, color: AUTH.muted, ...poppins(400) },
  phone: { marginTop: 8, fontSize: 14, lineHeight: 20, color: AUTH.dim, ...poppins(400) },
  primary: { height: 48, borderRadius: 12, backgroundColor: AUTH.gold, alignItems: 'center', justifyContent: 'center', ...shadow('0 10px 24px rgba(202,168,62,0.25)') },
  primaryText: { fontSize: 16, color: AUTH.bg, ...poppins(600) },
  outline: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(202,168,62,0.35)', alignItems: 'center', justifyContent: 'center' },
  outlineText: { fontSize: 16, color: AUTH.muted, ...poppins(600) },
});
