import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import AuthLegalLinks from '../../../components/AuthLegalLinks';
import { Press } from '../../../components/ui';
import { requestPartnerOtp, verifyPartnerOtp } from '../../../api/auth';
import { useAuth } from '../../../context/AuthContext';
import { events } from '../../../lib/events';
import { toast } from '../../../lib/notify';
import { collectFcmTokenFast, persistModuleFcmToken } from '../../../lib/push';
import { localStore, sessionStore } from '../../../lib/storage';
import { useLocation, useNavigate } from '../../../lib/webRouter';
import { montserrat, poppins } from '../../../theme';
import AuthShell, { AUTH, AuthTitle, authStyles } from '../../components/AuthShell';
import { checkOnboardingStatus, clearOnboardingFromLocalStorage, isRestaurantOnboardingComplete } from '../../utils/onboardingUtils';
import { RESTAURANT_HOME, WORKSPACE, clearOnboardingIntent, setActiveWorkspace, setOnboardingIntent, storePartnerSession } from '../../utils/partnerSession';

const DEFAULT_COUNTRY_CODE = '+91';
const clean = (value) => String(value || '').replace(/\D/g, '');
const blockKey = (phone) => (clean(phone) ? `restaurant_block_expires_at_${clean(phone)}` : 'restaurant_block_expires_at');
const resendKey = (phone) => (clean(phone) ? `restaurant_resend_expires_at_${clean(phone)}` : 'restaurant_resend_expires_at');
const isBlockedMessage = (msg) => /blocked|too many attempts|try again after/i.test(msg);
const timer = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const setPendingPhone = (phone) => phone && localStore.setItem('restaurant_pendingPhone', String(phone));

/** Port of Food/pages/restaurant/auth/Login.jsx: the phone step at /food/restaurant/login, the code step at /food/restaurant/otp. */
export default function RestaurantLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signedIn, booting } = useAuth();
  const isOtpStep = location.pathname.endsWith('/otp');

  const [phone, setPhone] = useState(() => sessionStore.getItem('restaurantLoginPhone') || '');
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [blockTimer, setBlockTimer] = useState(0);
  const [authData, setAuthData] = useState(null);
  const [contactInfo, setContactInfo] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRefs = useRef([]);
  const hasSubmittedRef = useRef(false);
  const isSuccessRef = useRef(false);
  // A sign-in in progress navigates itself; the "already signed in" redirect must not race it.
  const [leaving, setLeaving] = useState(false);

  // A fresh visit to sign-in starts from a clean onboarding draft.
  useEffect(() => {
    clearOnboardingFromLocalStorage();
  }, []);

  useEffect(() => {
    if (!isOtpStep) {
      setOtp(['', '', '', '']);
      setOtpError('');
      return;
    }
    const stored = sessionStore.getItem('restaurantAuthData');
    if (!stored) {
      navigate('/food/restaurant/login', { replace: true });
      return;
    }
    const data = JSON.parse(stored);
    setAuthData(data);
    const match = String(data.phone || '').match(/(\+\d+)\s*(.+)/);
    const formatted = match ? `${match[1]} ${clean(match[2])}` : data.phone || '';
    setContactInfo(formatted);

    const savedBlock = sessionStore.getItem(blockKey(formatted));
    if (savedBlock) {
      const remaining = Math.max(0, Math.floor((parseInt(savedBlock, 10) - Date.now()) / 1000));
      if (remaining > 0) setBlockTimer(remaining);
      else sessionStore.removeItem(blockKey(formatted));
    } else if (location.state?.initialBlockMins) {
      const seconds = Math.ceil(location.state.initialBlockMins * 60);
      setBlockTimer(seconds);
      sessionStore.setItem(blockKey(formatted), String(Date.now() + seconds * 1000));
    }

    const savedResend = sessionStore.getItem(resendKey(formatted));
    if (savedResend) {
      const remaining = Math.max(0, Math.floor((parseInt(savedResend, 10) - Date.now()) / 1000));
      if (remaining > 0) setResendTimer(remaining);
      else sessionStore.removeItem(resendKey(formatted));
    } else {
      setResendTimer(59);
      sessionStore.setItem(resendKey(formatted), String(Date.now() + 59 * 1000));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOtpStep]);

  useEffect(() => {
    if (resendTimer <= 0) return undefined;
    const id = setInterval(() => setResendTimer((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [resendTimer > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (blockTimer <= 0) return undefined;
    const id = setInterval(() => setBlockTimer((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [blockTimer > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOtpStep) return undefined;
    const id = setTimeout(() => inputRefs.current[0]?.focus(), 250);
    return () => clearTimeout(id);
  }, [isOtpStep]);

  // AuthRedirect: a signed-in partner has no business on the sign-in screen.
  if (!booting && signedIn && !leaving) return <Redirect href={RESTAURANT_HOME} />;

  const validatePhone = (num) => {
    const digits = clean(num);
    return digits.length === 10 && ['6', '7', '8', '9'].includes(digits[0]);
  };

  const rememberAuthData = (fullPhone) => {
    sessionStore.setItem('restaurantAuthData', JSON.stringify({ method: 'phone', phone: fullPhone, isSignUp: false, module: 'restaurant' }));
    sessionStore.setItem('restaurantLoginPhone', phone);
  };

  const handleSendOTP = async () => {
    if (!validatePhone(phone)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    const fullPhone = `${DEFAULT_COUNTRY_CODE} ${phone}`.trim();
    try {
      await requestPartnerOtp(fullPhone);
      rememberAuthData(fullPhone);
      navigate('/food/restaurant/otp');
    } catch (apiErr) {
      const msg = apiErr?.response?.data?.error || apiErr?.response?.data?.message || apiErr?.message || 'Failed to send OTP.';
      if (isBlockedMessage(msg)) {
        let totalMins = 3;
        const timeMatch = msg.match(/(\d+)(?::(\d+))?/);
        if (timeMatch) totalMins = parseInt(timeMatch[1], 10) + (timeMatch[2] ? parseInt(timeMatch[2], 10) / 60 : 0);
        rememberAuthData(fullPhone);
        navigate('/food/restaurant/otp', { state: { initialBlockMins: totalMins } });
        return;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  const goPending = (phoneVal, { isRejected, isDisabled, message }) => {
    setPendingPhone(phoneVal);
    localStore.setItem('restaurant_pendingStatus', isDisabled ? 'banned' : isRejected ? 'rejected' : 'pending');
    localStore.setItem(
      'restaurant_pendingMessage',
      message || (isRejected ? 'Your restaurant registration has been rejected. Please contact support.' : 'Your restaurant registration is pending approval.'),
    );
    navigate('/food/restaurant/pending-verification', { replace: true, state: { phone: phoneVal || '', isRejected, isDisabled, ...(message ? { message } : {}) } });
  };

  const handleVerify = async (otpValue = null) => {
    const code = otpValue || otp.join('');
    if (code.length !== 4) {
      toast.error('Please enter the complete 4-digit code');
      hasSubmittedRef.current = false;
      return;
    }
    if (isSuccessRef.current || loading || blockTimer > 0 || hasSubmittedRef.current) return;
    setLoading(true);
    hasSubmittedRef.current = true;

    try {
      if (!authData) throw new Error('Session expired. Please login again.');
      const phoneVal = authData.phone;
      const { fcmToken, platform } = await collectFcmTokenFast('restaurant');
      const response = await verifyPartnerOtp(phoneVal, code, fcmToken, platform);
      const data = response?.data?.data || response?.data || {};

      const clearOtpSession = () => {
        sessionStore.removeItem('restaurantAuthData');
        sessionStore.removeItem(blockKey(phoneVal));
        sessionStore.removeItem(resendKey(phoneVal));
      };

      // A verified number with no business yet. The web asks "restaurant, hotel or both";
      // this is the restaurant app, so it opens the restaurant's own onboarding.
      if (data.nextStep === 'onboarding' || !(data.profiles || []).length) {
        isSuccessRef.current = true;
        setLeaving(true);
        setPendingPhone(phoneVal);
        clearOtpSession();
        setOnboardingIntent('restaurant');
        setActiveWorkspace(WORKSPACE.RESTAURANT);
        navigate('/food/restaurant/onboarding', { replace: true });
        return;
      }

      // The number owns a stay but no restaurant: that business lives in the hotel partner app.
      if (!data.restaurant?.accessToken) {
        hasSubmittedRef.current = false;
        setOtp(['', '', '', '']);
        setLoading(false);
        toast.error('This number is registered for a hotel or stay. Please use the Dima Hasao hotel partner app.');
        return;
      }

      isSuccessRef.current = true;
      setLeaving(true);
      const profiles = await storePartnerSession(data);
      clearOnboardingIntent();
      events.emit('restaurantAuthChanged');
      try {
        await persistModuleFcmToken('restaurant', { fcmToken, platform });
      } catch {
        // push can be registered later; sign-in continues
      }
      clearOtpSession();

      const restaurantStatus = String(data.restaurant?.status || '').toLowerCase();
      if (profiles.length === 1 && restaurantStatus && restaurantStatus !== 'approved') {
        setLoading(false);
        goPending(phoneVal, { isRejected: restaurantStatus === 'rejected', isDisabled: restaurantStatus === 'banned' || restaurantStatus === 'deleted' });
        return;
      }

      setActiveWorkspace(WORKSPACE.RESTAURANT);
      if (!isRestaurantOnboardingComplete(data.restaurant?.user)) {
        const incompleteStep = await checkOnboardingStatus();
        if (incompleteStep) {
          navigate(`/food/restaurant/onboarding?step=${incompleteStep}`, { replace: true });
          return;
        }
      }
      navigate(RESTAURANT_HOME, { replace: true });
    } catch (err) {
      const message = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Invalid OTP. Please try again.';
      setOtp(['', '', '', '']);
      if (isBlockedMessage(message)) {
        let totalSeconds = 180;
        const timeMatch = message.match(/(\d+)(?::(\d+))?/);
        if (timeMatch) totalSeconds = parseInt(timeMatch[1], 10) * 60 + (timeMatch[2] ? parseInt(timeMatch[2], 10) : 0);
        setBlockTimer(totalSeconds);
        sessionStore.setItem(blockKey(authData?.phone || ''), String(Date.now() + totalSeconds * 1000));
      } else if (/pending approval|rejected|disabled|banned/i.test(message)) {
        goPending(authData?.phone || contactInfo, { isRejected: /rejected/i.test(message), isDisabled: /disabled|banned/i.test(message), message });
        return;
      } else if (/invalid/i.test(message)) {
        setOtpError('Invalid OTP');
      } else {
        toast.error(message);
      }
      hasSubmittedRef.current = false;
      setLoading(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || blockTimer > 0 || !authData) return;
    setLoading(true);
    try {
      await requestPartnerOtp(authData.phone);
      setResendTimer(59);
      sessionStore.setItem(resendKey(authData.phone), String(Date.now() + 59 * 1000));
      toast.success('OTP resent successfully.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index, value) => {
    if (index === 0 && value) setOtpError('');
    if (value.length > 1) {
      // A pasted or auto-filled code lands in one box.
      const digits = clean(value).slice(0, 4 - index).split('');
      if (digits.length > 0) {
        const next = [...otp];
        digits.forEach((digit, i) => {
          if (index + i < 4) next[index + i] = digit;
        });
        setOtp(next);
        inputRefs.current[Math.min(3, index + digits.length)]?.focus();
      }
      return;
    }
    if (value && !/^\d$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (index, key) => {
    if (key !== 'Backspace' || otp[index] || index === 0) return;
    inputRefs.current[index - 1]?.focus();
    const next = [...otp];
    next[index - 1] = '';
    setOtp(next);
  };

  const isOtpComplete = otp.every((digit) => digit !== '');
  const phoneDisabled = loading || phone.length < 10;
  const verifyDisabled = loading || !isOtpComplete || blockTimer > 0;

  return (
    <AuthShell>
      <AuthTitle title="Partner Sign In" kicker={isOtpStep ? 'Verify' : 'Sign in'}>
        {!isOtpStep ? (
          <Text style={styles.lead}>Enter your mobile number to manage your restaurant or your stay.</Text>
        ) : (
          <View style={styles.sentRow}>
            <Text style={[styles.lead, { marginTop: 0, flexShrink: 1 }]}>We&apos;ve sent a code to {contactInfo}</Text>
            <Press onPress={() => navigate('/food/restaurant/login')} accessibilityLabel="Edit phone number" style={styles.edit} hitSlop={8}>
              <Pencil size={14} color={AUTH.gold} strokeWidth={2.5} />
            </Press>
          </View>
        )}
      </AuthTitle>

      {!isOtpStep ? (
        <View style={{ gap: 24 }}>
          <View>
            <Text style={authStyles.label}>Mobile number</Text>
            <View style={[authStyles.field, focused ? authStyles.fieldFocused : null]}>
              <Text style={styles.code}>{DEFAULT_COUNTRY_CODE}</Text>
              <TextInput
                value={phone}
                onChangeText={(text) => setPhone(clean(text).slice(0, 10))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={handleSendOTP}
                keyboardType="phone-pad"
                maxLength={10}
                autoFocus
                placeholder="10-digit number"
                placeholderTextColor={AUTH.dim}
                accessibilityLabel="Mobile number"
                style={[authStyles.input, { paddingHorizontal: 16, letterSpacing: 1.7 }]}
              />
            </View>
          </View>
          <Press scale={0.99} disabled={phoneDisabled} onPress={handleSendOTP} accessibilityState={{ disabled: phoneDisabled, busy: loading }} style={[authStyles.button, phoneDisabled ? authStyles.buttonDisabled : null]}>
            {loading ? <ActivityIndicator size="small" color={AUTH.bg} /> : <Text style={authStyles.buttonText}>Log in</Text>}
          </Press>
        </View>
      ) : (
        <View style={{ gap: 24 }}>
          {otpError ? <Text style={styles.otpError} accessibilityRole="alert">{otpError}</Text> : null}
          <View style={styles.otpRow}>
            {[0, 1, 2, 3].map((index) => (
              <TextInput
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                value={otp[index]}
                onChangeText={(value) => handleChange(index, value)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                editable={!loading && blockTimer <= 0}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete={index === 0 ? 'sms-otp' : 'off'}
                maxLength={index === 0 ? 4 : 1}
                placeholder="•"
                placeholderTextColor={AUTH.dim}
                accessibilityLabel={`Digit ${index + 1}`}
                style={[styles.otpBox, blockTimer > 0 ? styles.otpBoxBlocked : null]}
              />
            ))}
          </View>

          <View style={{ alignItems: 'center' }}>
            {blockTimer > 0 ? (
              <Text style={styles.resendOff}>RESEND SMS</Text>
            ) : resendTimer > 0 ? (
              <Text style={styles.resendWait}>
                Resend SMS in <Text style={styles.resendTime}>{timer(resendTimer)}</Text>
              </Text>
            ) : (
              <Press onPress={handleResend} hitSlop={8}>
                <Text style={styles.resend}>Didn&apos;t receive SMS? Resend SMS</Text>
              </Press>
            )}
          </View>

          <Press scale={0.99} disabled={verifyDisabled} onPress={() => handleVerify()} accessibilityState={{ disabled: verifyDisabled, busy: loading }} style={[authStyles.button, verifyDisabled ? authStyles.buttonDisabled : null]}>
            {loading ? <ActivityIndicator size="small" color={AUTH.bg} /> : null}
            <Text style={authStyles.buttonText}>{loading ? 'Verifying...' : 'Verify & Continue'}</Text>
          </Press>

          {blockTimer > 0 ? (
            <View style={styles.blocked}>
              <Text style={styles.blockedTitle}>TOO MANY FAILED ATTEMPTS</Text>
              <Text style={styles.blockedTime}>
                Try again after {Math.floor((blockTimer - 1) / 60)}:{String((blockTimer - 1) % 60).padStart(2, '0')}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      <AuthLegalLinks module="food" containerStyle={{ marginTop: 32 }} style={styles.legal} linkStyle={styles.legal} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: 16, fontSize: 13, lineHeight: 21, color: AUTH.muted, textAlign: 'center', ...poppins(400) },
  sentRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  edit: { borderRadius: 8, borderWidth: 1, borderColor: 'rgba(202,168,62,0.35)', padding: 6 },
  code: { borderRightWidth: 1, borderRightColor: 'rgba(202,168,62,0.25)', paddingHorizontal: 16, fontSize: 14, lineHeight: 20, color: AUTH.muted, ...montserrat(700) },
  otpError: { textAlign: 'center', fontSize: 13, lineHeight: 18, letterSpacing: 0.3, color: '#fca5a5', ...poppins(700) },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  otpBox: { width: 56, height: 56, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(202,168,62,0.35)', backgroundColor: AUTH.field, textAlign: 'center', fontSize: 24, paddingVertical: 0, color: AUTH.cream, ...poppins(700) },
  otpBoxBlocked: { borderColor: 'rgba(248,113,113,0.7)', opacity: 0.5 },
  resendOff: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: AUTH.dim, ...poppins(600) },
  resendWait: { fontSize: 12, lineHeight: 16, color: AUTH.muted, ...poppins(600) },
  resendTime: { color: AUTH.gold, ...poppins(800) },
  resend: { fontSize: 12, lineHeight: 16, color: AUTH.gold, ...poppins(700) },
  blocked: { alignSelf: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 24, paddingVertical: 10, alignItems: 'center' },
  blockedTitle: { fontSize: 11, lineHeight: 16, letterSpacing: 0.55, color: '#fca5a5', ...poppins(700) },
  blockedTime: { fontSize: 14, lineHeight: 20, color: AUTH.cream, ...poppins(700) },
  legal: { fontSize: 10, lineHeight: 15, letterSpacing: 1.8, color: AUTH.dim, textTransform: 'uppercase', textAlign: 'center', ...montserrat(600) },
});
