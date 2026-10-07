import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Image from '../../components/Img';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Fa from '../../components/Fa';
import { Press } from '../../components/ui';
import AuthLegalLinks from '../../components/AuthLegalLinks';
import { StripeBorder } from '../../components/dh/Header';
import { useBooking } from '../../context/BookingContext';
import { completeUserSignup, requestUserOtp, verifyUserOtp } from '../../api/auth';
import { webAsset } from '../../lib/webAsset';
import { Button } from '../../components/ds';
import { color, elevation, playfair, radii, space, type } from '../../theme';

// Web: DimaHasao/pages/LoginScreen.jsx (/app/login). 'phone' -> 'otp' -> 'name'.

const readApiError = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { user, login, showToast } = useBooking();
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpInputRefs = useRef([]);
  const [step, setStep] = useState('phone');
  const [needsName, setNeedsName] = useState(false);
  // Proof the phone passed its OTP, exchanged for a session at the name step.
  const [signupToken, setSignupToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState(null);
  const done = useRef(false);

  useEffect(() => {
    if (step !== 'otp') return undefined;
    const timer = setTimeout(() => otpInputRefs.current[0]?.focus(), 60);
    return () => clearTimeout(timer);
  }, [step]);

  // Already signed in (e.g. the back button reached this screen): go home.
  if (user.isLoggedIn && !done.current) return <Redirect href="/app" />;

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // A pasted or auto-filled code lands in one box.
      const digits = value.replace(/\D/g, '').slice(0, 4 - index).split('');
      if (digits.length > 0) {
        setOtp((prev) => {
          const next = [...prev];
          digits.forEach((digit, i) => {
            if (index + i < 4) next[index + i] = digit;
          });
          return next;
        });
        otpInputRefs.current[Math.min(3, index + digits.length)]?.focus();
      }
      return;
    }
    if (value && !/^\d$/.test(value)) return;
    setOtp((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < 3) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (index, e) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
      setOtp((prev) => {
        const next = [...prev];
        next[index - 1] = '';
        return next;
      });
    }
  };

  const finishLogin = async (data, message) => {
    done.current = true;
    await login(data);
    showToast(message);
    router.replace('/app');
  };

  const handleSendOtp = async () => {
    if (isLoading) return;
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length !== 10) {
      showToast('Enter a valid 10-digit phone number');
      return;
    }
    setIsLoading(true);
    try {
      const res = await requestUserOtp(digits);
      const data = res?.data?.data ?? res?.data ?? {};
      setNeedsName(data.nextStepIfVerified === 'collect_name');
      setOtp(['', '', '', '']);
      setStep('otp');
      showToast('OTP sent to your phone 📱');
    } catch (err) {
      showToast(readApiError(err, 'Could not send OTP. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (isLoading) return;
    const digits = String(phone).replace(/\D/g, '');
    const code = otp.join('');
    if (code.length !== 4) {
      showToast('Please enter the 4-digit OTP');
      return;
    }
    setIsLoading(true);
    try {
      const res = await verifyUserOtp(digits, code);
      const data = res?.data?.data ?? res?.data ?? {};
      // A number with no account yet carries a signup ticket to the name step.
      if (data.nextStep === 'collect_name') {
        setSignupToken(data.signupToken || '');
        setNeedsName(true);
        setStep('name');
        return;
      }
      await finishLogin(data, '✨ Welcome back!');
    } catch (err) {
      showToast(readApiError(err, 'Invalid or expired OTP.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (isLoading) return;
    const name = fullName.trim();
    if (name.length < 2) {
      showToast('Please enter your full name');
      return;
    }
    setIsLoading(true);
    try {
      const res = await completeUserSignup(signupToken, { name });
      const data = res?.data?.data ?? res?.data ?? {};
      await finishLogin(data, '✨ Account created! Welcome to Dima Hasao!');
    } catch (err) {
      showToast(readApiError(err, 'Could not save your name. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (step === 'phone') return handleSendOtp();
    if (step === 'otp') return handleVerifyOtp();
    return handleCompleteRegistration();
  };

  const title = step === 'name' ? 'Create your account' : step === 'otp' && needsName ? 'Verify your number' : 'Login to your account';
  const cta = step === 'phone' ? 'Get OTP' : step === 'otp' ? 'Verify & explore' : 'Create account & explore';

  return (
    <View style={styles.root}>
      <Image source={{ uri: webAsset('/updated.png') }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Dima Hasao Heritage Gate" />
      <LinearGradient colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)', 'transparent']} style={styles.sky} pointerEvents="none" />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.5)']} style={styles.vignette} pointerEvents="none" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.md }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.top}>
            <Image source={require('../../../assets/images/user-logo.webp')} style={styles.logo} resizeMode="contain" accessibilityLabel="Dima Hasao Tourism Logo" />
            <Text style={styles.juthai}>JUTHAI</Text>
            <View style={styles.welcomeRow}>
              <View style={styles.welcomeLine} />
              <Text style={styles.welcome}>Welcome to</Text>
              <View style={styles.welcomeLine} />
            </View>
            <Text style={styles.district} accessibilityRole="header">
              DIMA HASAO
            </Text>
          </View>

          <View style={styles.spacer} />

          <View style={styles.card}>
            <StripeBorder height={6} band={5} colors={WEAVE} style={styles.weave} />

            <View style={styles.cardTitleRow}>
              <Fa name="fa-solid fa-leaf" size={12} color={color.gold} style={{ transform: [{ scaleX: -1 }] }} />
              <Text style={styles.cardTitle} accessibilityRole="header" numberOfLines={1}>
                {title}
              </Text>
              <Fa name="fa-solid fa-leaf" size={12} color={color.gold} />
            </View>

            <View style={{ gap: space.md }}>
              {step === 'name' ? (
                <View style={{ gap: space.sm }}>
                  <View style={styles.verifiedRow}>
                    <Fa name="fa-solid fa-circle-check" size={14} color={VERIFIED} />
                    <Text style={styles.verified}>Number verified. Tell us your name to finish signing up.</Text>
                  </View>
                  <Text style={styles.fieldLabel}>Full name</Text>
                  <View style={[styles.inputWrap, focused === 'name' && styles.inputFocused]}>
                    <Fa name="fa-solid fa-user" size={16} color={color.gold} />
                    <TextInput
                      value={fullName}
                      onChangeText={setFullName}
                      autoFocus
                      placeholder="Full Name"
                      placeholderTextColor={PLACEHOLDER}
                      autoCapitalize="words"
                      autoComplete="name"
                      textContentType="name"
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                      onFocus={() => setFocused('name')}
                      onBlur={() => setFocused(null)}
                      style={styles.input}
                      accessibilityLabel="Full Name"
                    />
                  </View>
                </View>
              ) : (
                <View style={{ gap: space.sm }}>
                  <Text style={styles.fieldLabel}>Mobile number</Text>
                  <View style={[styles.inputWrap, focused === 'phone' && styles.inputFocused, step === 'otp' && styles.inputLocked]}>
                    <Fa name="fa-solid fa-phone" size={16} color={color.gold} />
                    <Text style={styles.prefix}>+91</Text>
                    <TextInput
                      value={phone}
                      editable={step !== 'otp'}
                      onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                      keyboardType="number-pad"
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                      maxLength={10}
                      placeholder="Phone Number"
                      placeholderTextColor={PLACEHOLDER}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                      onFocus={() => setFocused('phone')}
                      onBlur={() => setFocused(null)}
                      style={styles.input}
                      accessibilityLabel="Phone Number"
                    />
                    {step === 'otp' ? (
                      <Press
                        onPress={() => {
                          setStep('phone');
                          setOtp(['', '', '', '']);
                        }}
                        accessibilityLabel="Edit phone number"
                        style={styles.editBtn}
                      >
                        <Fa name="fa-solid fa-pen" size={14} color={color.gold} />
                      </Press>
                    ) : null}
                  </View>
                </View>
              )}

              {step === 'otp' ? (
                <View style={{ gap: space.sm }}>
                  <Text style={styles.fieldLabel}>Enter the 4-digit OTP</Text>
                  <View style={styles.otpRow}>
                    {[0, 1, 2, 3].map((index) => (
                      <TextInput
                        key={index}
                        ref={(el) => {
                          otpInputRefs.current[index] = el;
                        }}
                        value={otp[index]}
                        onChangeText={(v) => handleOtpChange(index, v)}
                        onKeyPress={(e) => handleOtpKeyPress(index, e)}
                        keyboardType="number-pad"
                        // One box takes a whole pasted / auto-filled code.
                        maxLength={index === 0 ? 4 : 1}
                        autoComplete={index === 0 ? 'sms-otp' : 'off'}
                        textContentType="oneTimeCode"
                        selectTextOnFocus
                        onFocus={() => setFocused(`otp${index}`)}
                        onBlur={() => setFocused(null)}
                        style={[styles.otpBox, focused === `otp${index}` && styles.inputFocused]}
                        accessibilityLabel={`OTP digit ${index + 1}`}
                      />
                    ))}
                  </View>
                  <View style={styles.otpFoot}>
                    <Text style={styles.sentTo}>Sent to +91 {phone}</Text>
                    <Press onPress={handleSendOtp} scale={0.96} accessibilityLabel="Resend OTP" style={styles.resendBtn}>
                      <Text style={styles.resend}>Resend OTP</Text>
                    </Press>
                  </View>
                </View>
              ) : null}

              <Button title={cta} onPress={handleSubmit} loading={isLoading} variant="gold" size="lg" accessibilityLabel={cta} />
            </View>

            <View style={{ marginTop: space.lg }}>
              <View style={styles.dividerRow}>
                <LinearGradient colors={['transparent', 'rgba(202,168,62,0.7)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dividerLine} />
                <Fa name="fa-solid fa-leaf" size={12} color={color.gold} style={{ transform: [{ scaleX: -1 }] }} />
                <LinearGradient colors={['rgba(202,168,62,0.7)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dividerLine} />
              </View>
              <AuthLegalLinks
                module="platform"
                variant="icons"
                iconSize={16}
                iconColor={color.gold}
                containerStyle={{ marginTop: space.sm }}
                iconWrapStyle={styles.legalIcon}
                labelStyle={styles.legalLabel}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// The login panel's own heritage palette (the dark field and weave are part of the gate art).
const FIELD = '#02130A';
const WEAVE = ['#04190C', '#CAA83E', '#0D3D20', '#8C1C13'];
const PLACEHOLDER = 'rgba(254,243,198,0.55)';
const VERIFIED = '#86EFAC';
const INK = '#062C14';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.primaryDeep },
  flex: { flex: 1 },
  sky: { position: 'absolute', top: 0, left: 0, right: 0, height: 176 },
  vignette: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 192 },
  content: { flexGrow: 1, paddingHorizontal: space.md, justifyContent: 'space-between' },
  top: { alignItems: 'center', paddingTop: space.xs, paddingHorizontal: space.sm },
  logo: { width: 96, height: 96, marginBottom: space.xs },
  juthai: { fontSize: 26, lineHeight: 32, letterSpacing: 1.2, color: INK, marginTop: 2, ...playfair(700), textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, marginVertical: 2 },
  welcomeLine: { height: 1.5, width: 24, backgroundColor: INK },
  welcome: { ...type.overline, letterSpacing: 2, color: INK, textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  district: { ...type.heroSerif, color: INK, textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  spacer: { flex: 1, minHeight: space.xxl },
  card: {
    width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: 'rgba(5,31,17,0.96)', borderWidth: 2, borderColor: color.gold,
    borderRadius: radii.xl, padding: space.xl, paddingTop: space.xl + space.xs, overflow: 'hidden', ...elevation.float,
  },
  weave: { position: 'absolute', top: 0, left: 0, right: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, marginBottom: space.lg },
  cardTitle: { ...type.sectionSerif, color: color.gold, flexShrink: 1 },
  fieldLabel: { ...type.label, color: color.textOnDarkMuted },
  verifiedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginBottom: space.xs },
  verified: { flex: 1, ...type.small, color: VERIFIED },
  inputWrap: {
    height: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.lg, paddingRight: space.xs,
    borderWidth: 1, borderColor: 'rgba(202,168,62,0.5)', borderRadius: radii.md, backgroundColor: FIELD,
  },
  inputLocked: { opacity: 0.8 },
  inputFocused: { borderColor: color.gold, borderWidth: 2 },
  prefix: { ...type.bodyStrong, fontSize: 16, color: color.textOnDarkMuted },
  input: { flex: 1, minWidth: 0, height: '100%', paddingVertical: 0, paddingHorizontal: 0, ...type.body, fontSize: 16, color: color.textInverse },
  editBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  otpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md },
  otpBox: {
    width: 56, height: 56, borderRadius: radii.md, borderWidth: 1, borderColor: 'rgba(202,168,62,0.7)', backgroundColor: FIELD, textAlign: 'center',
    padding: 0, ...type.priceLg, fontSize: 24, color: color.goldOnDark,
  },
  otpFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  sentTo: { ...type.small, color: color.textOnDarkMuted, flexShrink: 1 },
  resendBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm, marginRight: -space.sm },
  resend: { ...type.label, color: color.goldOnDark, textDecorationLine: 'underline' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, opacity: 0.7 },
  dividerLine: { height: 1, width: 72 },
  legalIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(202,168,62,0.5)', backgroundColor: FIELD, alignItems: 'center', justifyContent: 'center' },
  legalLabel: { ...type.caption, color: color.textOnDarkMuted, marginTop: space.xs },
});
