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
import { LinearGradient } from 'expo-linear-gradient';
import { Pencil, ShieldCheck, X } from 'lucide-react-native';
import { deliveryApi } from '../../../api/delivery';
import { useAuth } from '../../../context/AuthContext';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { getUserFacingApiError, showUserFacingApiError } from '../../../lib/apiError';
import { toast } from '../../../lib/notify';
import { sessionStore } from '../../../lib/storage';
import { collectFcmTokenFast, finalizeDeliveryPendingSubmission, persistModuleFcmToken, prefetchModuleFcmToken } from '../../../delivery/push';
import AuthLegalLinks from '../../AuthLegalLinks';
import { Dialog, GradientText } from '../../kit';
import { GradientButton, Press, ThemedInput } from '../../ui';
import { display, ff, gradients, shadow, tw } from '../../../theme';

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

  return (
    <View style={styles.root}>
      <Wave id="topBlueGrad" top height={vh * 0.4} d="M -50,-50 L -50,280 C 200,100 800,100 1490,100 L 1490,-50 Z" />
      <Animated.Image
        source={FLOAT_1}
        resizeMode="contain"
        style={[styles.float, { top: vh * 0.4 * 0.08, left: vw * 0.05, width: vh * 0.14, height: vh * 0.14 }, float1]}
      />
      <Wave id="botBlueGrad" height={vh * 0.5} d="M -50,370 L -50,220 C 640,220 1240,220 1490,40 L 1490,370 Z" />
      <Animated.Image
        source={FLOAT_2}
        resizeMode="contain"
        style={[styles.float, { bottom: vh * 0.5 * 0.08, right: vw * 0.05, width: vh * 0.18, height: vh * 0.18 }, float2]}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.main}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            <View style={styles.header}>
              <Image source={DRIVER_LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Dima Hasao" />
              <GradientText colors={['#0A4D2B', '#06336B']} style={styles.title}>
                Delivery Partner
              </GradientText>
              {!isOtpStep ? (
                <Text style={styles.subtitle}>Enter your registered mobile number to start earning</Text>
              ) : (
                <View style={styles.sentRow}>
                  <Text style={styles.sentText} numberOfLines={1}>
                    {`We've sent a code to ${getPhoneNumber()}`}
                  </Text>
                  <Press onPress={handleBackToLogin} accessibilityLabel="Edit phone number" hitSlop={12} style={[styles.editBtn, shadow('md')]}>
                    <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.editGrad}>
                      <Pencil size={14} color="#fff" strokeWidth={2.5} />
                    </LinearGradient>
                  </Press>
                </View>
              )}
            </View>

            <Animated.View style={contentAnim}>
              {!isOtpStep ? (
                <View style={{ gap: 24 }}>
                  <View>
                    <ThemedInput
                      autoFocus
                      value={phone}
                      onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                      keyboardType="phone-pad"
                      textContentType="telephoneNumber"
                      autoComplete={Platform.OS === 'web' ? 'off' : 'tel'}
                      placeholder="Mobile number"
                      placeholderTextColor={tw.gray400}
                      returnKeyType="done"
                      onSubmitEditing={handleSendOTP}
                      accessibilityLabel="Mobile number"
                      style={styles.phoneInput}
                    />
                    <View pointerEvents="none" style={styles.prefix}>
                      <Text style={styles.prefixText}>+91</Text>
                    </View>
                  </View>
                  <GradientButton title="Log in" onPress={handleSendOTP} disabled={loading || phone.length < 10} loading={loading} />
                </View>
              ) : (
                <View>
                  {error ? <Text style={styles.error}>{error}</Text> : null}
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
                        placeholderTextColor={tw.gray400}
                        accessibilityLabel={`Digit ${index + 1}`}
                        selectTextOnFocus
                        style={[
                          styles.otpBox,
                          focusedBox === index && !(loading || blockTimer > 0) && styles.otpBoxFocused,
                          blockTimer > 0 && { opacity: 0.5 },
                        ]}
                      />
                    ))}
                  </View>

                  <View style={styles.resendRow}>
                    {blockTimer > 0 ? (
                      <Text style={[styles.resendMuted, { textTransform: 'uppercase' }]}>Resend SMS</Text>
                    ) : resendTimer > 0 ? (
                      <Text style={styles.resendMuted}>
                        Resend SMS in <Text style={styles.resendTime}>{formatResendTimer(resendTimer)}</Text>
                      </Text>
                    ) : (
                      <Press onPress={handleResend} scale={1} hitSlop={10} accessibilityLabel="Resend SMS">
                        <Text style={styles.resendLink}>{"Didn't receive SMS? Resend SMS"}</Text>
                      </Press>
                    )}
                  </View>

                  <GradientButton
                    title="Verify & Continue"
                    loadingTitle="Verifying..."
                    onPress={() => handleVerify()}
                    disabled={loading || !isOtpComplete || blockTimer > 0}
                    loading={loading}
                    style={{ marginTop: 24 }}
                  />

                  {blockTimer > 0 ? (
                    <View style={styles.blockBox}>
                      <Text style={styles.blockKicker}>Too many failed attempts</Text>
                      <Text style={styles.blockText}>
                        Try again after {Math.floor((blockTimer - 1) / 60)}:{String((blockTimer - 1) % 60).padStart(2, '0')}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </Animated.View>

            {!isOtpStep ? (
              <AuthLegalLinks module="food" containerStyle={{ marginTop: 32 }} style={styles.legal} linkStyle={styles.legalLink} />
            ) : null}
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
        // rounded-3xl: the theme's card shadow replaces shadow-2xl.
        panelStyle={[styles.restore, shadow('card')]}
      >
        <Press
          onPress={() => {
            setShowRestorePopup(false);
            router.dismissTo('/food/delivery/login');
          }}
          accessibilityLabel="Close and return to login"
          style={styles.restoreClose}
        >
          <X size={20} color={tw.gray400} />
        </Press>
        <View style={styles.restoreIcon}>
          <ShieldCheck size={40} color="#0A4D2B" />
        </View>
        <Text style={styles.restoreTitle}>Account Found!</Text>
        <Text style={styles.restoreBody}>
          An existing deleted delivery account for <Text style={styles.restoreBold}>{getPhoneNumber()}</Text> was found. Do you want to
          restore your old data or start fresh with a new account?
        </Text>
        <View style={{ gap: 16 }}>
          <Press onPress={() => handleRestoreAction('restore')} scale={0.98} style={[styles.restoreBtnWrap, shadow('card')]}>
            <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.restoreBtn}>
              <Text style={styles.restoreBtnText}>Restore My Account</Text>
            </LinearGradient>
          </Press>
          <Press onPress={() => handleRestoreAction('new')} scale={0.98} style={[styles.restoreBtn, styles.restoreOutline, shadow('card')]}>
            <Text style={[styles.restoreBtnText, { color: tw.gray700 }]}>Create New Account</Text>
          </Press>
        </View>
      </Dialog>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', overflow: 'hidden' },
  flex: { flex: 1 },
  wave: { position: 'absolute', left: 0, width: '100%' },
  float: { position: 'absolute' },
  // px-6 -> 1.1rem (deliveryTheme.css at <=640 px), py-12 pb-24
  main: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 17.6, paddingTop: 48, paddingBottom: 96 },
  column: { width: '100%', maxWidth: 384, top: -40 },
  header: { marginBottom: 20, alignItems: 'center' },
  // drop-shadow-md
  logo: { height: 112, width: 112, marginBottom: -14, filter: [{ dropShadow: { offsetX: 0, offsetY: 3, standardDeviation: 3, color: 'rgba(0,0,0,0.12)' } }] },
  // h2 text-[25px] font-extrabold: Sora with the theme's .01em tracking; line-height inherits 1.5.
  title: { fontSize: 25, lineHeight: 37.5, paddingBottom: 2, ...display(800, 25) },
  subtitle: {
    marginTop: 12,
    maxWidth: 310,
    paddingHorizontal: 16,
    fontSize: 13.5,
    lineHeight: 21.94,
    letterSpacing: 0.34,
    color: tw.slate600,
    textAlign: 'center',
    ...ff(500),
  },
  sentRow: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  sentText: { fontSize: 13, lineHeight: 21.1, letterSpacing: 0.2, color: 'rgba(98,116,142,0.9)', ...ff(600) },
  editBtn: { marginLeft: 4, borderRadius: 10 },
  editGrad: { padding: 6, borderRadius: 10 },
  phoneInput: { paddingLeft: 80, paddingRight: 24, height: 56, fontSize: 16 },
  prefix: { position: 'absolute', top: 0, bottom: 0, left: 24, justifyContent: 'center' },
  prefixText: { fontSize: 14, lineHeight: 20, color: tw.gray500, paddingRight: 12, borderRightWidth: 1, borderRightColor: tw.gray300, ...ff(500) },
  error: { marginTop: 8, marginBottom: 16, fontSize: 15, lineHeight: 22.5, letterSpacing: 0.375, color: tw.red600, textAlign: 'center', ...ff(700) },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  otpBox: {
    width: 56,
    height: 56,
    textAlign: 'center',
    fontSize: 24,
    color: '#1F1F24',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E8DEE7',
    borderRadius: 20,
    padding: 0,
    ...ff(700),
  },
  otpBoxFocused: { borderColor: '#789D8A', boxShadow: '0 0 0 4px rgba(21,73,139,0.15)' },
  resendRow: { marginTop: 24, alignItems: 'center' },
  resendMuted: { fontSize: 12, lineHeight: 16, color: tw.gray400, ...display(800, 12) },
  resendTime: { color: tw.slate800, ...display(900, 12) },
  resendLink: { fontSize: 12, lineHeight: 16, color: tw.slate800, ...display(800, 12) },
  blockBox: {
    alignSelf: 'center',
    // space-y-6 margin and mt-4 collapse to 24 px in block layout
    marginTop: 24,
    paddingHorizontal: 17.6,
    paddingVertical: 10,
    backgroundColor: tw.primarySoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tw.primaryBorder,
    alignItems: 'center',
  },
  blockKicker: { fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, textTransform: 'uppercase', color: '#0A4D2B', ...ff(700) },
  blockText: { fontSize: 14, lineHeight: 20, color: '#0A4D2B', ...ff(700) },
  legal: { fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, textTransform: 'uppercase', color: 'rgba(153,161,175,0.8)', textAlign: 'center', ...ff(500) },
  legalLink: { color: tw.gray400, ...ff(600) },
  restore: { width: '100%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 24, padding: 32, borderWidth: 1, borderColor: '#E5DDC3', alignItems: 'stretch' },
  restoreClose: { position: 'absolute', top: 16, right: 16, padding: 8, borderRadius: 12, zIndex: 2 },
  restoreIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(10,77,43,0.1)', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  restoreTitle: { fontSize: 24, lineHeight: 32, color: tw.gray900, textAlign: 'center', marginBottom: 12, ...display(700, 24) },
  restoreBody: { fontSize: 16, lineHeight: 26, color: tw.gray500, textAlign: 'center', marginBottom: 32, ...ff(500) },
  restoreBold: { color: tw.gray900, ...ff(700) },
  restoreBtnWrap: { borderRadius: 16 },
  restoreBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  // rounded-2xl: deliveryTheme.css repaints border-gray-200 as #E5DDC3.
  restoreOutline: { borderWidth: 2, borderColor: '#E5DDC3', backgroundColor: '#fff' },
  restoreBtnText: { fontSize: 16, color: '#fff', ...ff(700) },
});
