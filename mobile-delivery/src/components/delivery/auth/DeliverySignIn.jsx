import { useEffect, useId, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, {
  Defs,
  FeComposite,
  FeFlood,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode,
  FeOffset,
  Filter,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, Lock, Pencil, ShieldCheck, X } from 'lucide-react-native';
import { deliveryApi } from '../../../api/delivery';
import { useAuth } from '../../../context/AuthContext';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { getUserFacingApiError, showUserFacingApiError } from '../../../lib/apiError';
import { toast } from '../../../lib/notify';
import { sessionStore } from '../../../lib/storage';
import { collectFcmTokenFast, finalizeDeliveryPendingSubmission, persistModuleFcmToken, prefetchModuleFcmToken } from '../../../delivery/push';
import AuthLegalLinks from '../../AuthLegalLinks';
import { Button, IconButton } from '../../ds';
import { Dialog } from '../../kit';
import { Press } from '../../ui';
import { color, elevation, radii, space, tone, type } from '../../../theme';

/*
 * Port of pages/auth/SignIn.jsx. The web renders this one component for
 * /login and /otp and decides the step from the path; here both routes
 * render it with `isOtpStep`.
 *
 * Not ported: the name step (showNameInput) and the pending/rejected panel
 * (pendingMessage). Nothing on the web ever sets them, so neither can show.
 * The hidden iOS "keyboard keeper" input is a browser workaround; native
 * autoFocus opens the keyboard without it.
 */

const DEFAULT_COUNTRY_CODE = '+91';
const DRIVER_LOGO = require('../../../../assets/images/driver-logo.png');
const FLOAT_1 = require('../../../../assets/images/Driver_logo_1.png');
const FLOAT_2 = require('../../../../assets/images/Driver_logo_2.png');

const defaultTestPhone =
  process.env.EXPO_PUBLIC_USE_DEFAULT_TEST_PHONE === 'true'
    ? String(process.env.EXPO_PUBLIC_DEFAULT_TEST_PHONE || '').replace(/\D/g, '').slice(0, 10)
    : '';

const getBlockKey = (phoneStr) => {
  const clean = phoneStr?.replace(/\D/g, '') || '';
  return clean ? `delivery_block_expires_at_${clean}` : 'delivery_block_expires_at';
};
const getResendKey = (phoneStr) => {
  const clean = phoneStr?.replace(/\D/g, '') || '';
  return clean ? `delivery_resend_expires_at_${clean}` : 'delivery_resend_expires_at';
};
const isBlockedMessage = (msg) => {
  const lower = String(msg || '').toLowerCase();
  return lower.includes('blocked') || lower.includes('too many attempts') || lower.includes('try again after');
};

/** @keyframes floatDish1/2: 12 s ease-in-out, 0 -> 50 % -> 100 %. */
function useFloat(dx, rotateDeg) {
  const t = useAnimatedValue(0);
  useEffect(() => {
    const ease = Easing.bezier(0.42, 0, 0.58, 1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 6000, easing: ease, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 6000, easing: ease, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  return {
    transform: [
      { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
      { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -15] }) },
      { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${rotateDeg}deg`] }) },
    ],
  };
}

/* filter="drop-shadow(0px +-5px 15px rgba(0,0,0,0.15))" on the wave path. */
function Wave({ id: base, d, height, top }) {
  const dy = top ? 5 : -5;
  // Unique per instance: /login stays mounted under /otp, and on web a
  // duplicate id would resolve url(#id) to the hidden copy.
  const id = `${base}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  // `scale-[1.05] origin-center` on the wrapper.
  return (
    <View pointerEvents="none" style={[styles.wave, { height, transform: [{ scale: 1.05 }] }, top ? { top: 0 } : { bottom: 0 }]}>
      <Svg width="100%" height="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <Defs>
          <SvgGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#0A4D2B" />
            <Stop offset="100%" stopColor="#06381E" />
          </SvgGradient>
          <Filter id={`${id}-shadow`} x="-10%" y="-30%" width="120%" height="160%">
            <FeGaussianBlur in="SourceAlpha" stdDeviation="7.5" result="blur" />
            <FeOffset in="blur" dx="0" dy={dy} result="offset" />
            <FeFlood floodColor="#000000" floodOpacity="0.15" result="color" />
            <FeComposite in="color" in2="offset" operator="in" result="shadow" />
            <FeMerge>
              <FeMergeNode in="shadow" />
              <FeMergeNode in="SourceGraphic" />
            </FeMerge>
          </Filter>
        </Defs>
        <Path fill={`url(#${id})`} d={d} filter={`url(#${id}-shadow)`} />
      </Svg>
    </View>
  );
}

function formatResendTimer(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function DeliverySignIn({ isOtpStep }) {
  const params = useLocalSearchParams();
  const { login } = useAuth();
  const { width: vw, height: vh } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState(() => {
    try {
      if (sessionStore.getItem('deliveryClearLoginPhone') === '1') {
        sessionStore.removeItem('deliveryClearLoginPhone');
        sessionStore.removeItem('deliveryAuthData');
        return defaultTestPhone;
      }
      const stored = sessionStore.getItem('deliveryAuthData');
      if (stored) {
        const data = JSON.parse(stored);
        return data.phone ? data.phone.replace('+91', '').trim() : defaultTestPhone;
      }
    } catch {
      return defaultTestPhone;
    }
    return defaultTestPhone;
  });
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [blockTimer, setBlockTimer] = useState(0);
  const [authData, setAuthData] = useState(null);
  const [showRestorePopup, setShowRestorePopup] = useState(false);
  const inputRefs = useRef([]);
  const [focusedBox, setFocusedBox] = useState(-1);
  const [phoneFocused, setPhoneFocused] = useState(false);

  // AnimatePresence step transition: content slides in from +-20 px.
  const enter = useAnimatedValue(0);
  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [isOtpStep, enter]);

  const float1 = useFloat(vw * 0.25, 8);
  const float2 = useFloat(-vw * 0.25, -8);

  useEffect(() => {
    prefetchModuleFcmToken('delivery');
  }, []);

  // Restore the OTP step's phone and timers, as the web does on route change.
  useEffect(() => {
    if (!isOtpStep) {
      setOtp(['', '', '', '']);
      setError('');
      return;
    }
    const stored = sessionStore.getItem('deliveryAuthData');
    if (!stored) {
      router.replace('/food/delivery/login');
      return;
    }
    const data = JSON.parse(stored);
    setAuthData(data);
    const currentPhone = data.phone || '';
    const blockKey = getBlockKey(currentPhone);
    const resendKey = getResendKey(currentPhone);

    const savedBlockExpiry = sessionStore.getItem(blockKey);
    if (savedBlockExpiry) {
      const remaining = Math.max(0, Math.floor((parseInt(savedBlockExpiry, 10) - Date.now()) / 1000));
      if (remaining > 0) setBlockTimer(remaining);
      else sessionStore.removeItem(blockKey);
    } else if (params.initialBlockMins) {
      const seconds = Math.ceil(Number(params.initialBlockMins) * 60);
      setBlockTimer(seconds);
      sessionStore.setItem(blockKey, (Date.now() + seconds * 1000).toString());
    }

    const savedResendExpiry = sessionStore.getItem(resendKey);
    if (savedResendExpiry) {
      const remaining = Math.max(0, Math.floor((parseInt(savedResendExpiry, 10) - Date.now()) / 1000));
      if (remaining > 0) setResendTimer(remaining);
      else sessionStore.removeItem(resendKey);
    } else {
      setResendTimer(59);
      sessionStore.setItem(resendKey, (Date.now() + 59 * 1000).toString());
    }
  }, [isOtpStep, params.initialBlockMins]);

  useEffect(() => {
    if (resendTimer <= 0) return undefined;
    const timer = setInterval(() => setResendTimer((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  useEffect(() => {
    if (blockTimer <= 0) return undefined;
    const timer = setInterval(() => setBlockTimer((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [blockTimer]);

  // Focus the first OTP box so the keyboard opens.
  useEffect(() => {
    if (!isOtpStep) return undefined;
    const timer = setTimeout(() => inputRefs.current[0]?.focus(), 250);
    return () => clearTimeout(timer);
  }, [isOtpStep]);

  const validatePhone = (num) => {
    const digits = num.replace(/\D/g, '');
    return digits.length === 10 && ['6', '7', '8', '9'].includes(digits[0]);
  };

  const handleBackToLogin = () => {
    router.dismissTo('/food/delivery/login');
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
    const nextAuthData = { method: 'phone', phone: fullPhone, isSignUp: false, purpose: 'login', module: 'delivery' };
    try {
      await deliveryApi.sendOTP(fullPhone, 'login');
      sessionStore.setItem('deliveryAuthData', JSON.stringify(nextAuthData));
      router.push('/food/delivery/otp');
    } catch (err) {
      const msg = getUserFacingApiError(err, 'Failed to send OTP. Please try again.');
      if (isBlockedMessage(msg)) {
        let totalMins = 3;
        const timeMatch = msg.match(/(\d+)(?::(\d+))?/);
        if (timeMatch) totalMins = parseInt(timeMatch[1], 10) + (timeMatch[2] ? parseInt(timeMatch[2], 10) / 60 : 0);
        sessionStore.setItem('deliveryAuthData', JSON.stringify(nextAuthData));
        router.push({ pathname: '/food/delivery/otp', params: { initialBlockMins: String(totalMins) } });
        return;
      }
      showUserFacingApiError(err, 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  const applyBlock = (message) => {
    let totalSeconds = 180;
    const timeMatch = message.match(/(\d+)(?::(\d+))?/);
    if (timeMatch) totalSeconds = parseInt(timeMatch[1], 10) * 60 + (timeMatch[2] ? parseInt(timeMatch[2], 10) : 0);
    setBlockTimer(totalSeconds);
    sessionStore.setItem(getBlockKey(authData?.phone || ''), (Date.now() + totalSeconds * 1000).toString());
    setError('');
  };

  const handleVerify = async (otpValue = null, confirmAction = null) => {
    const code = otpValue || otp.join('');
    if (code.length !== 4) {
      toast.error('Please enter the complete 4-digit code');
      return;
    }
    if (loading || blockTimer > 0) return;
    setLoading(true);
    setError('');
    try {
      const phoneVal = authData?.phone;
      const purpose = authData?.purpose || 'login';
      const providedName = authData?.isSignUp ? authData?.name || null : null;
      if (!phoneVal) {
        setError('Phone number not found. Please try again.');
        setLoading(false);
        return;
      }
      const { fcmToken, platform } = await collectFcmTokenFast('delivery');
      const response = await deliveryApi.verifyOTP(phoneVal, code, purpose, providedName, fcmToken, platform, confirmAction);
      const data = response?.data?.data || response?.data || {};

      if (data?.deletedAccountFound) {
        setShowRestorePopup(true);
        setLoading(false);
        return;
      }

      const clearPhoneKeys = () => {
        sessionStore.removeItem('deliveryAuthData');
        sessionStore.removeItem(getBlockKey(phoneVal));
        sessionStore.removeItem(getResendKey(phoneVal));
      };

      if (data.pendingApproval === true) {
        clearPhoneKeys();
        const digits = String(phoneVal || '').replace(/\D/g, '').slice(-10);
        setLoading(false);
        finalizeDeliveryPendingSubmission(digits, {
          fcmToken,
          platform,
          status: data.isRejected ? 'rejected' : 'pending',
          message: data.message,
          rejectionReason: data.rejectionReason,
        });
        return;
      }

      if (data.nextStep === 'onboarding') {
        clearPhoneKeys();
        sessionStore.setItem('deliveryNeedsRegistration', 'true');
        const digits = String(phoneVal || '').replace(/\D/g, '');
        sessionStore.setItem('deliverySignupDetails', JSON.stringify({ name: '', phone: digits.slice(-10), countryCode: '+91' }));
        router.replace('/food/delivery/signup/details');
        return;
      }

      const accessToken = data.accessToken;
      const refreshToken = data.refreshToken || null;
      const user = data.user;
      if (!accessToken || !user) throw new Error('Invalid response from server');

      clearPhoneKeys();
      try {
        await login(accessToken, user, refreshToken);
      } catch {
        setError('Failed to save authentication. Please try again.');
        setLoading(false);
        return;
      }
      // Signing in drops the guest screens; the stack lands on the feed.
      persistModuleFcmToken('delivery').catch(() => {});
    } catch (err) {
      const message = getUserFacingApiError(err, 'Failed to verify OTP. Please try again.');
      setOtp(['', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
      if (isBlockedMessage(message)) {
        applyBlock(message);
      } else if (/invalid/i.test(message)) {
        setError('Invalid OTP');
        toast.error('Invalid OTP', { id: 'user-facing-api-error' });
      } else {
        setError(message);
        showUserFacingApiError(err, message);
      }
      setLoading(false);
    }
  };

  const handleRestoreAction = async (action) => {
    setShowRestorePopup(false);
    await handleVerify(otp.join(''), action);
  };

  const handleResend = async () => {
    if (resendTimer > 0 || blockTimer > 0) return;
    setLoading(true);
    setError('');
    try {
      const phoneVal = authData?.phone;
      const purpose = authData?.purpose || 'login';
      if (!phoneVal) {
        setError('Phone number not found. Please go back and try again.');
        setLoading(false);
        return;
      }
      await deliveryApi.sendOTP(phoneVal, purpose);
      setResendTimer(59);
      sessionStore.setItem(getResendKey(phoneVal), (Date.now() + 59 * 1000).toString());
      setOtp(['', '', '', '']);
      inputRefs.current[0]?.focus();
      toast.success('OTP resent successfully.');
    } catch (err) {
      const message = getUserFacingApiError(err, 'Failed to resend OTP. Please try again.');
      if (isBlockedMessage(message)) applyBlock(message);
      else {
        setError(message);
        showUserFacingApiError(err, 'Failed to resend OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index, value) => {
    if (index === 0 && value) setError('');
    if (value.length > 1) {
      // Paste or SMS autofill: spread the digits across the boxes.
      const digits = value.replace(/\D/g, '').slice(0, 4 - index).split('');
      if (digits.length > 0) {
        const newOtp = [...otp];
        digits.forEach((digit, i) => {
          if (index + i < 4) newOtp[index + i] = digit;
        });
        setOtp(newOtp);
        inputRefs.current[Math.min(3, index + digits.length)]?.focus();
      }
      return;
    }
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (index, key) => {
    if (key !== 'Backspace') return;
    if (!otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const getPhoneNumber = () => {
    const p = authData?.phone || `${DEFAULT_COUNTRY_CODE} ${phone}`;
    const cleaned = p.replace(/\s/g, '');
    return cleaned.startsWith('+91') && cleaned.length > 3 ? `${cleaned.slice(0, 3)} ${cleaned.slice(3)}` : cleaned;
  };

  const isOtpComplete = otp.every((digit) => digit !== '');
  const contentAnim = {
    opacity: enter,
    transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [isOtpStep ? 20 : -20, 0] }) }],
  };
  const otpLocked = loading || blockTimer > 0;
  const logoSize = Math.round(Math.min(104, Math.max(72, vh * 0.12)));

  return (
    <View style={styles.root}>
      <Wave id="topBlueGrad" top height={vh * 0.4} d="M -50,-50 L -50,280 C 200,100 800,100 1490,100 L 1490,-50 Z" />
      <Animated.Image
        source={FLOAT_1}
        resizeMode="contain"
        style={[styles.float, { top: insets.top + vh * 0.4 * 0.04, left: vw * 0.05, width: vh * 0.14, height: vh * 0.14 }, float1]}
      />
      <Wave id="botBlueGrad" height={vh * 0.5} d="M -50,370 L -50,220 C 640,220 1240,220 1490,40 L 1490,370 Z" />
      <Animated.Image
        source={FLOAT_2}
        resizeMode="contain"
        style={[styles.float, { bottom: insets.bottom + vh * 0.5 * 0.06, right: vw * 0.05, width: vh * 0.18, height: vh * 0.18 }, float2]}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.main,
            { paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.xxxl },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            <View style={styles.header}>
              <Image
                source={DRIVER_LOGO}
                // Shrinks on short phones so the CTA clears the bottom illustration.
                style={[styles.logo, { width: logoSize, height: logoSize }]}
                resizeMode="contain"
                accessibilityLabel="Dima Hasao"
              />
              <Text style={styles.title} accessibilityRole="header">
                Delivery Partner
              </Text>
              {!isOtpStep ? (
                <Text style={styles.subtitle}>Enter your registered mobile number to start earning</Text>
              ) : (
                <View style={styles.sentBlock}>
                  <Text style={styles.sentText}>We&apos;ve sent a 4-digit code to</Text>
                  <View style={styles.sentRow}>
                    <Text style={styles.sentPhone} numberOfLines={1}>
                      {getPhoneNumber()}
                    </Text>
                    <Press onPress={handleBackToLogin} accessibilityLabel="Edit phone number" scale={0.96} style={styles.editBtn}>
                      <Pencil size={16} color={color.primary} strokeWidth={2.4} />
                      <Text style={styles.editText}>Edit</Text>
                    </Press>
                  </View>
                </View>
              )}
            </View>

            <Animated.View style={contentAnim}>
              {!isOtpStep ? (
                <View style={{ gap: space.lg }}>
                  <View style={[styles.phoneField, phoneFocused && styles.phoneFieldFocused]}>
                    <Text style={styles.prefixText}>+91</Text>
                    <View style={styles.prefixDivider} />
                    <TextInput
                      autoFocus
                      value={phone}
                      onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                      onFocus={() => setPhoneFocused(true)}
                      onBlur={() => setPhoneFocused(false)}
                      maxLength={10}
                      keyboardType="phone-pad"
                      textContentType="telephoneNumber"
                      autoComplete={Platform.OS === 'web' ? 'off' : 'tel'}
                      placeholder="Mobile number"
                      placeholderTextColor={color.textDisabled}
                      returnKeyType="done"
                      onSubmitEditing={handleSendOTP}
                      accessibilityLabel="Mobile number"
                      style={styles.phoneInput}
                    />
                  </View>
                  <Button title="Log in" size="lg" onPress={handleSendOTP} disabled={loading || phone.length < 10} loading={loading} />
                </View>
              ) : (
                <View>
                  {error ? (
                    <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
                      <AlertCircle size={18} color={color.danger} strokeWidth={2.4} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}
                  <View style={styles.otpRow}>
                    {[0, 1, 2, 3].map((index) => (
                      <TextInput
                        key={index}
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        value={otp[index]}
                        editable={!(loading || blockTimer > 0)}
                        onChangeText={(v) => handleChange(index, v)}
                        onKeyPress={(e) => handleKeyPress(index, e.nativeEvent.key)}
                        onFocus={() => setFocusedBox(index)}
                        onBlur={() => setFocusedBox(-1)}
                        keyboardType="number-pad"
                        textContentType={index === 0 ? 'oneTimeCode' : 'none'}
                        // SMS autofill on device; off in the web preview, where Chrome's autofill tint muddies comparisons.
                        autoComplete={index === 0 && Platform.OS !== 'web' ? 'sms-otp' : 'off'}
                        maxLength={index === 0 ? 4 : 1}
                        placeholder="•"
                        placeholderTextColor={color.textDisabled}
                        accessibilityLabel={`Digit ${index + 1} of 4`}
                        selectTextOnFocus
                        style={[
                          styles.otpBox,
                          otp[index] !== '' && styles.otpBoxFilled,
                          error && styles.otpBoxError,
                          focusedBox === index && !otpLocked && styles.otpBoxFocused,
                          blockTimer > 0 && styles.otpBoxLocked,
                        ]}
                      />
                    ))}
                  </View>

                  <View style={styles.resendRow}>
                    {blockTimer > 0 ? (
                      <Text style={styles.resendMuted}>Resend SMS</Text>
                    ) : resendTimer > 0 ? (
                      <Text style={styles.resendMuted} accessibilityLiveRegion="none">
                        Resend SMS in <Text style={styles.resendTime}>{formatResendTimer(resendTimer)}</Text>
                      </Text>
                    ) : (
                      <Press onPress={handleResend} scale={1} accessibilityLabel="Resend SMS" style={styles.resendBtn}>
                        <Text style={styles.resendHint}>
                          Didn&apos;t receive SMS? <Text style={styles.resendLink}>Resend SMS</Text>
                        </Text>
                      </Press>
                    )}
                  </View>

                  <Button
                    title={loading ? 'Verifying...' : 'Verify & Continue'}
                    size="lg"
                    onPress={() => handleVerify()}
                    disabled={loading || !isOtpComplete || blockTimer > 0}
                    loading={loading}
                    accessibilityLabel="Verify & Continue"
                    style={{ marginTop: space.xl }}
                  />

                  {blockTimer > 0 ? (
                    <View style={styles.blockBox} accessibilityRole="alert">
                      <Lock size={20} color={tone.danger.fg} strokeWidth={2.2} />
                      <View style={styles.blockTextWrap}>
                        <Text style={styles.blockKicker}>Too many failed attempts</Text>
                        <Text style={styles.blockText}>
                          Try again after {Math.floor((blockTimer - 1) / 60)}:{String((blockTimer - 1) % 60).padStart(2, '0')}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              )}
            </Animated.View>

            {!isOtpStep ? <AuthLegalLinks module="food" containerStyle={{ marginTop: space.xxl }} /> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Dialog
        visible={showRestorePopup}
        onClose={() => {
          setShowRestorePopup(false);
          router.dismissTo('/food/delivery/login');
        }}
        blur={8}
        panelStyle={styles.restore}
      >
        <IconButton
          icon={X}
          label="Close and return to login"
          iconColor={color.textMuted}
          onPress={() => {
            setShowRestorePopup(false);
            router.dismissTo('/food/delivery/login');
          }}
          style={styles.restoreClose}
        />
        <View style={styles.restoreIcon}>
          <ShieldCheck size={32} color={color.primary} strokeWidth={2} />
        </View>
        <Text style={styles.restoreTitle} accessibilityRole="header">
          Account found
        </Text>
        <Text style={styles.restoreBody}>
          An existing deleted delivery account for <Text style={styles.restoreBold}>{getPhoneNumber()}</Text> was found. Do you want to
          restore your old data or start fresh with a new account?
        </Text>
        <View style={{ gap: space.md }}>
          <Button title="Restore my account" size="lg" onPress={() => handleRestoreAction('restore')} />
          <Button title="Create new account" size="lg" variant="outline" onPress={() => handleRestoreAction('new')} />
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface, overflow: 'hidden' },
  flex: { flex: 1 },
  wave: { position: 'absolute', left: 0, width: '100%' },
  float: { position: 'absolute' },
  main: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  column: { width: '100%', maxWidth: 400 },
  header: { marginBottom: space.xxl, alignItems: 'center' },
  logo: { marginBottom: space.sm, filter: [{ dropShadow: { offsetX: 0, offsetY: 3, standardDeviation: 3, color: 'rgba(0,0,0,0.12)' } }] },
  title: { ...type.title, color: color.primary, textAlign: 'center' },
  subtitle: { ...type.body, marginTop: space.sm, maxWidth: 300, color: color.textSecondary, textAlign: 'center' },

  sentBlock: { marginTop: space.sm, alignItems: 'center' },
  sentText: { ...type.body, color: color.textSecondary, textAlign: 'center' },
  sentRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, maxWidth: '100%' },
  sentPhone: { ...type.subheading, color: color.text, flexShrink: 1 },
  editBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, borderRadius: radii.md },
  editText: { ...type.label, color: color.primary },

  phoneField: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: color.borderStrong,
    borderRadius: radii.md,
    backgroundColor: color.surface,
    paddingLeft: space.lg,
  },
  phoneFieldFocused: { borderColor: color.primary, boxShadow: `0 0 0 3px ${color.primarySoft}` },
  prefixText: { ...type.bodyStrong, fontSize: 17, color: color.text },
  prefixDivider: { width: 1, height: 24, backgroundColor: color.borderStrong, marginHorizontal: space.md },
  // No lineHeight on TextInput: it misaligns the caret on Android and web.
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingRight: space.lg,
    fontFamily: type.bodyStrong.fontFamily,
    fontSize: 17,
    letterSpacing: 0.5,
    color: color.text,
    outlineWidth: 0,
    outlineStyle: 'none',
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.md,
    backgroundColor: tone.danger.bg,
  },
  errorText: { ...type.bodyStrong, color: tone.danger.fg, flex: 1 },

  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: space.md },
  otpBox: {
    width: 60,
    height: 64,
    textAlign: 'center',
    fontFamily: type.subheading.fontFamily,
    fontSize: 26,
    color: color.text,
    backgroundColor: color.surface,
    borderWidth: 1.5,
    borderColor: color.borderStrong,
    borderRadius: radii.md,
    padding: 0,
    outlineWidth: 0,
    outlineStyle: 'none',
  },
  otpBoxFilled: { borderColor: color.primaryBorder, backgroundColor: color.primarySoft },
  otpBoxError: { borderColor: color.danger },
  otpBoxFocused: { borderColor: color.primary, borderWidth: 2, boxShadow: `0 0 0 3px ${color.primarySoft}` },
  otpBoxLocked: { backgroundColor: color.surfaceMuted, borderColor: color.border, color: color.textDisabled },

  resendRow: { marginTop: space.md, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  resendMuted: { ...type.small, color: color.textMuted, textAlign: 'center' },
  resendTime: { ...type.label, color: color.text },
  resendBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm },
  resendHint: { ...type.small, color: color.textSecondary, textAlign: 'center' },
  resendLink: { ...type.label, color: color.primary, textDecorationLine: 'underline' },

  blockBox: {
    marginTop: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: tone.danger.bg,
  },
  blockTextWrap: { flex: 1, minWidth: 0 },
  blockKicker: { ...type.label, color: tone.danger.fg },
  blockText: { ...type.bodyStrong, color: color.text },

  restore: { width: '100%', maxWidth: 384, backgroundColor: color.surface, borderRadius: radii.xl, padding: space.xxl, alignItems: 'stretch', ...elevation.float },
  restoreClose: { position: 'absolute', top: space.sm, right: space.sm, zIndex: 2 },
  restoreIcon: { width: 64, height: 64, borderRadius: radii.pill, backgroundColor: color.primarySoft, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: space.lg, marginTop: space.sm },
  restoreTitle: { ...type.title, color: color.text, textAlign: 'center', marginBottom: space.sm },
  restoreBody: { ...type.body, color: color.textSecondary, textAlign: 'center', marginBottom: space.xxl },
  restoreBold: { ...type.bodyStrong, color: color.text },
});
