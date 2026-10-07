import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AlertTriangle, Bell, Clock3, Phone, ShieldCheck, XCircle } from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { Button, Card, StatusBadge } from '../../../components/ds';
import { ShrinkIcon } from '../../../components/kit';
import { persistModuleFcmToken, persistPendingModuleFcmToken, syncPendingPartnerFcmQuick } from '../../../delivery/push';
import { getAuthToken } from '../../../api/client';
import { sessionStore } from '../../../lib/storage';
import { color, radii, space, tone, type } from '../../../theme';

/*
 * Web: pages/auth/VerificationPending.jsx. The root has font-['Poppins'],
 * which deliveryTheme.css turns into Nunito Sans for the whole page.
 *
 * "Allow Mail Notifications" exists on the web because a browser needs a tap
 * to grant notification permission. Here it shows while the OS permission
 * is not granted, and the tap requests it and saves the token by phone.
 */

export default function VerificationPending() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
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

  const statusTone = isRejected ? tone.danger : tone.warning;

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xxl },
        ]}
      >
        <View style={styles.column}>
          <Card style={styles.card}>
            <View style={styles.hero}>
              <View style={[styles.statusIcon, { backgroundColor: statusTone.bg }]}>
                {isRejected ? (
                  <XCircle size={32} color={statusTone.fg} strokeWidth={2} />
                ) : (
                  <Clock3 size={32} color={statusTone.fg} strokeWidth={2} />
                )}
              </View>
              <StatusBadge
                label={isRejected ? 'Rejected' : 'Verification pending'}
                tone={isRejected ? 'danger' : 'warning'}
                style={styles.badge}
              />
              {isRejected ? (
                <>
                  <Text style={styles.title} accessibilityRole="header">
                    Application rejected
                  </Text>
                  <Text style={styles.body}>{parsedMessage.text}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.title} accessibilityRole="header">
                    Your delivery account is under review
                  </Text>
                  <Text style={styles.body}>
                    Admin received your onboarding details successfully. Our team will verify your delivery account and activate your
                    dashboard once approval is complete.
                  </Text>
                </>
              )}
            </View>

            {isRejected && parsedMessage.reason ? (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonKicker}>Reason for rejection</Text>
                <Text style={styles.reasonText}>{parsedMessage.reason}</Text>
              </View>
            ) : null}

            <View style={styles.infoBox}>
              <ShrinkIcon Icon={isRejected ? AlertTriangle : ShieldCheck} color={isRejected ? color.danger : color.primary} style={{ marginTop: 2 }} />
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoTitle}>{isRejected ? 'What to do next' : 'What happens next'}</Text>
                <Text style={styles.infoText}>
                  {isRejected
                    ? 'Please review the reason above or reach out to support. You can register a new account if you need to submit new details.'
                    : 'We will notify you by email and push notification once verification is approved.'}
                </Text>
                {pendingPhone ? (
                  <View style={styles.phoneRow}>
                    <Phone size={16} color={color.textMuted} strokeWidth={2} />
                    <Text style={styles.phoneLabel}>
                      Registered phone: <Text style={styles.phone}>{pendingPhone}</Text>
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.actions}>
              {isRejected ? (
                <>
                  <Button title="Re-apply" size="lg" onPress={handleReapply} />
                  <Button title="Back to login" size="lg" variant="outline" onPress={handleBackToLogin} />
                </>
              ) : (
                <>
                  {pushPermission !== 'granted' && pushPermission !== 'unsupported' ? (
                    <Button
                      title={enablingPush ? 'Enabling...' : 'Allow mail notifications'}
                      icon={Bell}
                      size="lg"
                      variant="secondary"
                      onPress={handleEnablePush}
                      disabled={enablingPush}
                      accessibilityLabel="Allow Mail Notifications"
                    />
                  ) : null}
                  <Button title="Back to login" size="lg" onPress={handleBackToLogin} />
                </>
              )}
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.lg },
  column: { width: '100%', maxWidth: 448, alignSelf: 'center' },
  card: { padding: space.xl, gap: space.lg },
  hero: { alignItems: 'center' },
  statusIcon: { width: 64, height: 64, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  badge: { alignSelf: 'center', marginTop: space.md },
  title: { ...type.heading, color: color.text, textAlign: 'center', marginTop: space.md, maxWidth: 320 },
  body: { ...type.body, color: color.textSecondary, textAlign: 'center', marginTop: space.sm },
  reasonBox: { padding: space.md, borderRadius: radii.md, backgroundColor: tone.danger.bg, gap: space.xs },
  reasonKicker: { ...type.label, color: tone.danger.fg },
  reasonText: { ...type.bodyStrong, color: color.text },
  infoBox: {
    borderRadius: radii.md,
    backgroundColor: color.surfaceMuted,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  infoTextWrap: { flex: 1, minWidth: 0, gap: space.xs },
  infoTitle: { ...type.subheading, color: color.text },
  infoText: { ...type.small, color: color.textSecondary },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  phoneLabel: { ...type.small, color: color.textMuted, flexShrink: 1 },
  phone: { ...type.label, color: color.text },
  actions: { gap: space.md },
});
