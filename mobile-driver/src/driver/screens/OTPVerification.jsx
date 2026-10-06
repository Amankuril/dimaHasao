import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Loader2, MessageSquare } from 'lucide-react-native';
import { useLocation, useNavigate } from '../../lib/webRouter';
import {
  buildDriverOnboardingSessionSnapshot,
  clearDriverRegistrationSession,
  getDriverOnboardingResumeStep,
  getStoredDriverRegistrationSession,
  persistDriverAuthSession,
  saveDriverRegistrationSession,
  sendDriverLoginOtp,
  sendDriverOtp,
  verifyDriverLoginOtp,
  verifyDriverOtp,
} from '../services/registrationService';
import AuthLegalLinks from '../../components/AuthLegalLinks';
import { Press } from '../../components/ui';
import { Alert, CtaButton, FieldBox, Spin } from '../components/OnboardingFields';
import { OB, jk } from '../components/onboardingTheme';

/*
 * Port of driver/pages/registration/OTPVerification.jsx. Serves both doors: a
 * returning driver signing in, and a new one partway through onboarding.
 * Push tokens are registered by the shell after sign-in (the web's syncPushTokens).
 */

const ROUTE_PREFIX = '/taxi/driver';
const OTP_LENGTH = 4;
const RESEND_SECONDS = 60;

const unwrap = (response) => response?.data?.data || response?.data || response;

const isDriverApproved = (driver) => {
  if (!driver) return false;
  const approval = String(driver.approve ?? '').toLowerCase();
  const status = String(driver.status || '').toLowerCase();
  return (
    driver.approve === true ||
    driver.approve === 1 ||
    ['true', '1', 'yes', 'approved'].includes(approval) ||
    ['approved', 'active', 'verified'].includes(status)
  );
};

export default function OTPVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const insets = useSafeAreaInsets();
  const inputs = useRef([]);

  const session = { ...getStoredDriverRegistrationSession(), ...(location.state || {}) };
  const phone = String(session.phone || '').replace(/\D/g, '').slice(-10);
  const registrationId = String(session.registrationId || '').trim();
  const isLoginFlow = Boolean(session.loginMode);
  const entryPath = String(session.entryPath || (isLoginFlow ? `${ROUTE_PREFIX}/login` : `${ROUTE_PREFIX}/reg-phone`));

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    if (!phone) navigate(entryPath, { replace: true });
  }, [entryPath, navigate, phone]);

  // A driver who already verified and came back should land where they stopped,
  // not be asked for the same code twice.
  useEffect(() => {
    if (isLoginFlow || !phone || !registrationId || !session.otpVerified) return;
    navigate(`${ROUTE_PREFIX}/${getDriverOnboardingResumeStep(session)}`, {
      replace: true,
      state: saveDriverRegistrationSession(session),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoginFlow, navigate, phone, registrationId, session.otpVerified]);

  useEffect(() => {
    if (timer <= 0) return undefined;
    const id = setInterval(() => setTimer((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, [timer]);

  useEffect(() => {
    const id = setTimeout(() => inputs.current[0]?.focus(), 250);
    return () => clearTimeout(id);
  }, []);

  const handleVerify = async (override) => {
    const code = override || digits.join('');

    if (code.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code.`);
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (isLoginFlow) {
        const payload = unwrap(await verifyDriverLoginOtp({ phone, otp: code }));

        if (payload?.token) {
          persistDriverAuthSession({ token: payload.token, role: 'driver' });
        }

        clearDriverRegistrationSession();
        navigate(
          isDriverApproved(payload?.driver) ? '/taxi/driver/home' : `${ROUTE_PREFIX}/registration-status`,
          { replace: true },
        );
        return;
      }

      const payload = unwrap(await verifyDriverOtp({ registrationId, phone, otp: code }));

      saveDriverRegistrationSession({
        ...session,
        otpVerified: true,
        role: 'driver',
        roleConfirmed: true,
        status: payload?.session?.status || 'otp_verified',
        otpSession: payload?.session || null,
      });

      navigate(`${ROUTE_PREFIX}/step-personal`);
    } catch (verifyError) {
      setError(verifyError?.message || 'That code did not match. Please try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    // More than one digit at once is a paste / SMS autofill (the web's onPaste).
    if (value.length > 1) {
      const pasted = value.slice(0, OTP_LENGTH);
      const filled = Array(OTP_LENGTH).fill('');
      pasted.split('').forEach((digit, i) => { filled[i] = digit; });
      setDigits(filled);
      if (pasted.length === OTP_LENGTH) handleVerify(pasted);
      return;
    }

    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);

    if (value && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
    if (next.join('').length === OTP_LENGTH) handleVerify(next.join(''));
  };

  const handleKeyDown = (index, event) => {
    if (event.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
  };

  const handleResend = async () => {
    if (timer > 0) return;

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const response = isLoginFlow
        ? await sendDriverLoginOtp({ phone })
        : await sendDriverOtp({ phone });

      const next = isLoginFlow
        ? saveDriverRegistrationSession({ ...session, phone, loginMode: true, entryPath })
        : saveDriverRegistrationSession(
            buildDriverOnboardingSessionSnapshot(unwrap(response), { ...session, phone, entryPath }),
          );

      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
      setTimer(RESEND_SECONDS);
      setNotice(next?.debugOtp ? `Code sent. Test code: ${next.debugOtp}` : 'A new code is on its way.');
    } catch (resendError) {
      setError(resendError?.message || 'Could not resend the code.');
    } finally {
      setLoading(false);
    }
  };

  const disabled = digits.join('').length !== OTP_LENGTH || loading;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: OB.bg }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56 + insets.top, paddingBottom: 32 + insets.bottom }}
    >
      <View style={styles.maxW}>
        <View style={styles.iconBox}>
          <MessageSquare size={24} strokeWidth={2.2} color={OB.primary} />
        </View>

        <Text style={styles.h1}>Enter the code</Text>
        <Text style={styles.sub}>
          Sent to <Text style={{ ...jk(700), color: OB.text }}>+91 {phone}</Text>{' '}
          <Text onPress={() => navigate(entryPath)} style={styles.ghost}>
            Change
          </Text>
        </Text>

        <View style={{ marginTop: 32, flexDirection: 'row', gap: 12 }}>
          {digits.map((digit, index) => (
            <FieldBox key={index} focused={focusedIndex === index} style={styles.digitBox}>
              <TextInput
                ref={(element) => { inputs.current[index] = element; }}
                value={digit}
                onChangeText={(value) => handleChange(index, value)}
                onKeyPress={(event) => handleKeyDown(index, event)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex((current) => (current === index ? -1 : current))}
                keyboardType="number-pad"
                maxLength={index === 0 ? OTP_LENGTH : 1}
                accessibilityLabel={`Digit ${index + 1}`}
                style={styles.digit}
              />
            </FieldBox>
          ))}
        </View>

        {error ? <Alert style={{ marginTop: 16 }}>{error}</Alert> : null}

        {notice && !error ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: 20, alignItems: 'center' }}>
          {timer > 0 ? (
            <Text style={styles.resend}>Resend in {timer}s</Text>
          ) : (
            <Press scale={1} onPress={handleResend}>
              <Text style={[styles.resend, styles.ghost]}>Resend code</Text>
            </Press>
          )}
        </View>
      </View>

      <View style={[styles.maxW, { gap: 20, marginTop: 24 }]}>
        <CtaButton onPress={() => handleVerify()} disabled={disabled}>
          {loading ? (
            <Spin>
              <Loader2 size={18} color="#fff" />
            </Spin>
          ) : (
            'Verify'
          )}
        </CtaButton>

        <AuthLegalLinks module="taxi" style={styles.legal} linkStyle={styles.legal} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  maxW: { width: '100%', maxWidth: 448, alignSelf: 'center' },
  iconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: OB.primarySoft, alignItems: 'center', justifyContent: 'center' },
  h1: { ...jk(800), fontSize: 30, lineHeight: 37.5, letterSpacing: -0.6, color: OB.text, marginTop: 24 },
  sub: { ...jk(500), fontSize: 14, lineHeight: 21, color: OB.muted, marginTop: 8 },
  ghost: { ...jk(700), color: OB.primary },
  digitBox: { flex: 1, minWidth: 0, height: 64, paddingHorizontal: 0, paddingVertical: 0, justifyContent: 'center' },
  digit: { ...jk(800), fontSize: 24, color: OB.text, textAlign: 'center', padding: 0, width: '100%', flex: 0 },
  notice: { marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(10,77,43,0.2)', backgroundColor: OB.primarySoft, paddingHorizontal: 16, paddingVertical: 12 },
  noticeText: { ...jk(600), fontSize: 13, color: OB.primary, lineHeight: 19.5 },
  resend: { ...jk(600), fontSize: 13, color: OB.muted, textAlign: 'center' },
  legal: { ...jk(600), fontSize: 12, color: OB.muted, textAlign: 'center' },
});
