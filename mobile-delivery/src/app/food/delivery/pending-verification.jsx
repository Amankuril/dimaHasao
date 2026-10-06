import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polygon } from 'react-native-svg';
import * as Notifications from 'expo-notifications';
import { AlertTriangle, Clock3, ShieldCheck, X } from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { Press } from '../../../components/ui';
import { ShrinkIcon } from '../../../components/kit';
import { persistModuleFcmToken, persistPendingModuleFcmToken, syncPendingPartnerFcmQuick } from '../../../delivery/push';
import { getAuthToken } from '../../../api/client';
import { sessionStore } from '../../../lib/storage';
import { display, ff, gradients, shadow, tw } from '../../../theme';

/*
 * Web: pages/auth/VerificationPending.jsx. The root has font-['Poppins'],
 * which deliveryTheme.css turns into Nunito Sans for the whole page.
 *
 * "Allow Mail Notifications" exists on the web because a browser needs a tap
 * to grant notification permission. Here it shows while the OS permission
 * is not granted, and the tap requests it and saves the token by phone.
 */

function PrimaryButton({ title, onPress }) {
  return (
    <Press onPress={onPress} scale={0.98} accessibilityLabel={title} style={[styles.pill, { boxShadow: '0 8px 20px rgba(14,75,156,0.25)' }]}>
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pillInner}>
        <Text style={styles.pillText}>{title}</Text>
      </LinearGradient>
    </Press>
  );
}

export default function VerificationPending() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { clearSession } = useAuth();

  const localStatus = params.isRejected ? 'rejected' : sessionStore.getItem('delivery_pendingStatus') || 'pending';
  const localMessage = params.message || sessionStore.getItem('delivery_pendingMessage') || '';
  const pendingPhone = params.phone || sessionStore.getItem('delivery_pendingPhone') || '';
  const rejectionReason = params.rejectionReason || sessionStore.getItem('delivery_pendingRejectionReason') || '';

  const parsedMessage = useMemo(() => {
    if (!localMessage) {
      return { text: 'Your delivery partner application has been rejected. Please contact support.', reason: rejectionReason || '' };
    }
    const parts = localMessage.split(/Reason:\s*/i);
    if (parts.length > 1) return { text: parts[0].trim(), reason: parts[1].trim() };
    return { text: localMessage, reason: rejectionReason || '' };
  }, [localMessage, rejectionReason]);

  const isRejected = localStatus === 'rejected';
  const [pushPermission, setPushPermission] = useState('default');
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Notifications.getPermissionsAsync()
      .then((p) => !cancelled && setPushPermission(p.granted ? 'granted' : p.canAskAgain ? 'default' : 'denied'))
      .catch(() => !cancelled && setPushPermission('unsupported'));
    if (pendingPhone) {
      syncPendingPartnerFcmQuick('delivery', pendingPhone);
      if (getAuthToken()) void persistModuleFcmToken('delivery').catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [pendingPhone]);

  const handleEnablePush = async () => {
    if (!pendingPhone || enablingPush) return;
    setEnablingPush(true);
    try {
      const res = await Notifications.requestPermissionsAsync();
      setPushPermission(res.granted ? 'granted' : 'denied');
      if (res.granted) await persistPendingModuleFcmToken('delivery', pendingPhone, { maxAttempts: 2 });
    } finally {
      setEnablingPush(false);
    }
  };

  const clearPendingState = () => {
    ['delivery_pendingPhone', 'delivery_pendingStatus', 'delivery_pendingMessage', 'delivery_pendingRejectionReason', 'deliverySignupDetails', 'deliveryNeedsRegistration'].forEach(
      (k) => sessionStore.removeItem(k),
    );
  };

  const handleBackToLogin = async () => {
    if (pendingPhone) syncPendingPartnerFcmQuick('delivery', pendingPhone);
    await clearSession();
    clearPendingState();
    router.replace('/food/delivery/login');
  };

  const handleReapply = () => {
    const digits = String(pendingPhone || '').replace(/\D/g, '').slice(-10);
    sessionStore.setItem('deliveryNeedsRegistration', 'true');
    sessionStore.setItem('deliverySignupDetails', JSON.stringify({ name: '', phone: digits, countryCode: '+91' }));
    // Web bug reproduced: clearPendingState() removes the two keys just set, so
    // step 1 opens without the phone (CONVERSION.md, web bugs).
    clearPendingState();
    router.replace('/food/delivery/signup/details');
  };

  return (
    <LinearGradient
      colors={isRejected ? ['#FFF5F5', '#FFEBEB', '#FEF2F2'] : [tw.slate50, 'rgba(239,246,255,0.4)', tw.slate100]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          // px-4, but the class list also holds `sm:px-6`, which the theme's
          // [class*="px-6"] rule matches at every width: 1.1rem.
          paddingHorizontal: 17.6,
          paddingTop: Math.max(16, insets.top),
          paddingBottom: Math.max(16, insets.bottom),
        }}
      >
        <View style={[styles.column, { minHeight: height - 32 - (Math.max(16, insets.top) - 16) - (Math.max(16, insets.bottom) - 16) }]}>
          <View style={styles.card}>
            <View style={styles.iconRow}>
              {isRejected ? (
                <View style={styles.rejectedWrap}>
                  <View style={styles.banner}>
                    {/* clip-path: polygon(0 0, 82% 0, 100% 50%, 82% 100%, 0 100%); the clip also hides its shadow */}
                    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
                      <Polygon points="0,0 82,0 100,50 82,100 0,100" fill="#0A4D2B" />
                    </Svg>
                    <Text style={styles.bannerText}>REJECTED</Text>
                  </View>
                  <View style={[styles.diamond, shadow('lg')]}>
                    <X size={16} color="#fff" strokeWidth={4} style={{ transform: [{ rotate: '-45deg' }] }} />
                  </View>
                </View>
              ) : (
                <View style={styles.clock}>
                  <Clock3 size={32} color={tw.amber600} />
                </View>
              )}
            </View>

            <View style={styles.textBlock}>
              {isRejected ? (
                <>
                  <Text style={styles.rejTitle}>Application Rejected</Text>
                  <Text style={styles.body}>{parsedMessage.text}</Text>
                  {parsedMessage.reason ? (
                    <View style={[styles.reasonBox, shadow('card')]}>
                      <Text style={styles.reasonKicker}>Reason for Rejection:</Text>
                      <Text style={styles.reasonText}>{parsedMessage.reason}</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={styles.kicker}>Verification Pending</Text>
                  <Text style={styles.pendTitle}>
                    {'Your delivery account is\nunder review'}
                  </Text>
                  <Text style={styles.body}>
                    Admin received your onboarding details successfully. Our team will verify your delivery account and activate your
                    dashboard once approval is complete.
                  </Text>
                </>
              )}
            </View>

            <View style={[styles.infoBox, shadow('card')]}>
              {/* h-5 w-5 without shrink-0: the browser squeezes it (10.5 px wide here) */}
              <ShrinkIcon Icon={isRejected ? AlertTriangle : ShieldCheck} color={isRejected ? tw.red600 : '#0A4D2B'} style={{ marginTop: 2 }} />
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.infoTitle}>{isRejected ? 'What to do next' : 'What happens next'}</Text>
                <Text style={[styles.infoText, { marginTop: 4 }]}>
                  {isRejected
                    ? 'Please review the reason above or reach out to support. You can register a new account if you need to submit new details.'
                    : 'We will notify you by email and push notification once verification is approved.'}
                </Text>
                {pendingPhone ? (
                  <Text style={[styles.infoText, { marginTop: 8, color: tw.slate500 }]}>
                    Registered phone: <Text style={styles.phone}>{pendingPhone}</Text>
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={{ gap: 12 }}>
              {isRejected ? (
                <>
                  <PrimaryButton title="Re-apply" onPress={handleReapply} />
                  <Press onPress={handleBackToLogin} scale={0.98} accessibilityLabel="Back to login" style={[styles.pill, styles.outline]}>
                    <Text style={[styles.pillText, { color: tw.slate700 }]}>Back to login</Text>
                  </Press>
                </>
              ) : (
                <>
                  {pushPermission !== 'granted' && pushPermission !== 'unsupported' ? (
                    <Press
                      onPress={handleEnablePush}
                      disabled={enablingPush}
                      scale={0.98}
                      accessibilityLabel="Allow Mail Notifications"
                      style={[styles.pill, styles.pillInner, { backgroundColor: tw.primary }, enablingPush && { opacity: 0.7 }]}
                    >
                      <Text style={styles.pillText}>{enablingPush ? 'Enabling...' : 'Allow Mail Notifications'}</Text>
                    </Press>
                  ) : null}
                  <PrimaryButton title="Back to login" onPress={handleBackToLogin} />
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: 448, alignSelf: 'center', justifyContent: 'center', paddingVertical: 8 },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tw.slate200,
    backgroundColor: '#fff',
    padding: 20,
    boxShadow: '0 24px 70px rgba(14,75,156,0.08)',
  },
  iconRow: { marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  clock: { width: 64, height: 64, borderRadius: 32, backgroundColor: tw.amber100, alignItems: 'center', justifyContent: 'center' },
  rejectedWrap: { marginVertical: 8, height: 36, justifyContent: 'center' },
  banner: { height: 36, paddingLeft: 32, paddingRight: 40, justifyContent: 'center', borderTopLeftRadius: 6, borderBottomLeftRadius: 6, overflow: 'hidden' },
  // font-extrabold: Sora, .01em (beats tracking-[0.2em])
  bannerText: { color: '#fff', fontSize: 13, lineHeight: 13, ...display(800, 13) },
  diamond: {
    position: 'absolute',
    left: -16,
    top: 2,
    width: 32,
    height: 32,
    backgroundColor: '#0A4D2B',
    borderWidth: 3,
    borderColor: '#fff',
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  textBlock: { marginBottom: 16, alignItems: 'center' },
  rejTitle: { fontSize: 20, lineHeight: 28, color: tw.slate950, textAlign: 'center', ...display(800, 20) },
  kicker: { marginBottom: 8, fontSize: 12, lineHeight: 16, letterSpacing: 3.84, textTransform: 'uppercase', color: tw.amber600, ...ff(600) },
  pendTitle: { maxWidth: 304, fontSize: 14, lineHeight: 20, color: tw.slate950, textAlign: 'center', ...display(800, 14) },
  body: { marginTop: 12, fontSize: 14, lineHeight: 24, color: tw.slate600, textAlign: 'center', ...ff(500) },
  reasonBox: { alignSelf: 'stretch', marginTop: 16, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E5DDC3', backgroundColor: 'rgba(254,242,242,0.5)' },
  reasonKicker: { color: tw.red600, fontSize: 12, lineHeight: 16, textTransform: 'uppercase', marginBottom: 4, ...display(800, 12) },
  reasonText: { color: tw.slate800, fontSize: 14, lineHeight: 22.75, ...ff(500) },
  infoBox: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5DDC3',
    backgroundColor: tw.slate50,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoTitle: { fontSize: 14, lineHeight: 20, color: tw.slate900, ...ff(600) },
  infoText: { fontSize: 14, lineHeight: 20, color: tw.slate700, ...ff(500) },
  phone: { color: tw.slate700, ...ff(500) },
  pill: { height: 48, width: '100%', borderRadius: 999 },
  pillInner: { height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: '#fff', fontSize: 16, lineHeight: 24, ...ff(600) },
  outline: { borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
