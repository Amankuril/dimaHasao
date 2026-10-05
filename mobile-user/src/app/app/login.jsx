import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { cinzel, dh, montserrat, playfair, poppins, shadow, tw } from '../../theme';

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

  const title = step === 'name' ? 'CREATE YOUR ACCOUNT' : step === 'otp' && needsName ? 'VERIFY YOUR NUMBER' : 'LOGIN TO YOUR ACCOUNT';
  const cta = step === 'phone' ? 'GET OTP' : step === 'otp' ? 'VERIFY & EXPLORE' : 'CREATE ACCOUNT & EXPLORE';

  return (
    <View style={styles.root}>
      <Image source={{ uri: webAsset('/updated.png') }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Dima Hasao Heritage Gate" />
      <LinearGradient colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)', 'transparent']} style={styles.sky} pointerEvents="none" />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.5)']} style={styles.vignette} pointerEvents="none" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.top}>
            <Image source={require('../../../assets/images/user-logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Dima Hasao Tourism Logo" />
            <Text style={styles.juthai}>JUTHAI</Text>
            <View style={styles.welcomeRow}>
              <View style={styles.welcomeLine} />
              <Text style={styles.welcome}>• WELCOME TO •</Text>
              <View style={styles.welcomeLine} />
            </View>
            <Text style={styles.district}>DIMA HASAO</Text>
          </View>

          <View style={styles.spacer} />

          <View style={styles.card}>
            <StripeBorder height={6} band={5} colors={['#04190C', '#CAA83E', '#0D3D20', '#8C1C13']} style={styles.weave} />

            <View style={styles.cardTitleRow}>
              <Fa name="fa-solid fa-leaf" size={11} color={dh.gold} style={{ transform: [{ scaleX: -1 }] }} />
              <Text style={styles.cardTitle}>{title}</Text>
              <Fa name="fa-solid fa-leaf" size={13} color={dh.gold} />
            </View>

            <View style={{ gap: 12 }}>
              {step === 'name' ? (
                <View>
                  <Text style={styles.verified}>Number verified — tell us your name to finish signing up.</Text>
                  <View>
                    <View style={styles.fieldIcon}>
                      <Fa name="fa-solid fa-user" size={13} color={dh.gold} />
                    </View>
                    <TextInput
                      value={fullName}
                      onChangeText={setFullName}
                      autoFocus
                      placeholder="Full Name"
                      placeholderTextColor="#5D7264"
                      autoCapitalize="words"
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                      onFocus={() => setFocused('name')}
                      onBlur={() => setFocused(null)}
                      style={[styles.input, focused === 'name' && styles.inputFocused]}
                      accessibilityLabel="Full Name"
                    />
                  </View>
                </View>
              ) : (
                <View>
                  <View style={styles.fieldIcon}>
                    <Fa name="fa-solid fa-phone" size={13} color={dh.gold} />
                  </View>
                  <TextInput
                    value={phone}
                    editable={step !== 'otp'}
                    onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                    keyboardType="number-pad"
                    autoComplete="tel"
                    maxLength={10}
                    placeholder="Phone Number"
                    placeholderTextColor="#5D7264"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    onFocus={() => setFocused('phone')}
                    onBlur={() => setFocused(null)}
                    style={[styles.input, focused === 'phone' && styles.inputFocused, step === 'otp' && { opacity: 0.75 }]}
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
                      hitSlop={8}
                    >
                      <Fa name="fa-solid fa-pen" size={11} color={dh.gold} />
                    </Press>
                  ) : null}
                </View>
              )}

              {step === 'otp' ? (
                <View style={{ gap: 8 }}>
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
                    <Text style={styles.sentTo}>Sent to your phone</Text>
                    <Text onPress={handleSendOtp} style={styles.resend} accessibilityRole="button">
                      Resend OTP
                    </Text>
                  </View>
                </View>
              ) : null}

              <Press onPress={handleSubmit} disabled={isLoading} scale={0.97} style={styles.cta} accessibilityLabel={cta}>
                {isLoading ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.ctaText}>{cta}</Text>}
              </Press>
            </View>

            <View style={{ marginTop: 14 }}>
              <View style={styles.dividerRow}>
                <LinearGradient colors={['transparent', 'rgba(202,168,62,0.7)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dividerLine} />
                <Fa name="fa-solid fa-leaf" size={9} color={dh.gold} style={{ transform: [{ scaleX: -1 }] }} />
                <LinearGradient colors={['rgba(202,168,62,0.7)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dividerLine} />
              </View>
              <AuthLegalLinks
                module="platform"
                variant="icons"
                containerStyle={{ marginTop: 10 }}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dh.greenDeep },
  flex: { flex: 1 },
  sky: { position: 'absolute', top: 0, left: 0, right: 0, height: 176 },
  vignette: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 192 },
  content: { flexGrow: 1, paddingHorizontal: 10, justifyContent: 'space-between' },
  top: { alignItems: 'center', paddingTop: 4, paddingHorizontal: 8 },
  logo: { width: 96, height: 96, marginBottom: 4 },
  juthai: { fontSize: 24, lineHeight: 24, letterSpacing: 1.2, color: '#062C14', marginTop: 2, ...playfair(700), textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: 2 },
  welcomeLine: { height: 1.5, width: 24, backgroundColor: '#062C14' },
  welcome: { fontSize: 8.5, lineHeight: 13, letterSpacing: 2.1, color: '#062C14', ...poppins(900) },
  district: { fontSize: 18, lineHeight: 22.5, letterSpacing: 0.45, color: '#062C14', ...montserrat(900), textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  spacer: { flex: 1, minHeight: 40 },
  card: {
    width: '100%', maxWidth: 390, alignSelf: 'center', marginBottom: 4, backgroundColor: 'rgba(5,31,17,0.96)', borderWidth: 2, borderColor: dh.gold,
    borderRadius: 22, padding: 16, overflow: 'hidden', ...shadow('0 15px 40px rgba(0,0,0,0.85)'),
  },
  weave: { position: 'absolute', top: 0, left: 0, right: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
  cardTitle: { fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, color: dh.gold, ...cinzel() },
  verified: { fontSize: 10, lineHeight: 15, color: 'rgba(164,244,207,0.9)', marginBottom: 6, textAlign: 'center', ...poppins(400) },
  fieldIcon: { position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 },
  input: {
    height: 44, paddingLeft: 40, paddingRight: 12, paddingVertical: 0, borderWidth: 1, borderColor: 'rgba(202,168,62,0.5)', borderRadius: 12,
    backgroundColor: dh.field, color: tw.gray100, fontSize: 14, ...poppins(400),
  },
  inputFocused: { borderColor: dh.gold, borderWidth: 2 },
  editBtn: { position: 'absolute', right: 0, top: 0, bottom: 0, paddingRight: 12, justifyContent: 'center' },
  otpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  otpBox: {
    width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: dh.gold, backgroundColor: dh.field, textAlign: 'center',
    fontSize: 18, color: tw.amber300, padding: 0, fontFamily: Platform.select({ android: 'monospace', default: 'Courier' }), fontWeight: '900',
  },
  otpFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingTop: 2 },
  sentTo: { fontSize: 11, lineHeight: 16.5, color: 'rgba(254,230,133,0.8)', ...poppins(400) },
  resend: { fontSize: 11, lineHeight: 16.5, color: dh.gold, ...poppins(600) },
  cta: { height: 48, borderRadius: 12, backgroundColor: dh.goldBright, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, ...shadow('button') },
  ctaText: { fontSize: 14, lineHeight: 20, letterSpacing: 2.24, color: dh.greenDeep, ...poppins(900) },
  dividerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0.6 },
  dividerLine: { height: 1, width: 72 },
  legalIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(202,168,62,0.5)', backgroundColor: dh.field, alignItems: 'center', justifyContent: 'center' },
  legalLabel: { fontSize: 9, lineHeight: 13.5, letterSpacing: 0.9, textTransform: 'uppercase', color: 'rgba(164,244,207,0.7)', ...poppins(600) },
});
