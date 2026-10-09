/**
 * Ported from Frontend/src/modules/DimaHasao/pages/LoginScreen.jsx — same
 * phone -> OTP -> name (new numbers only) flow, same JUTHAI/DIMA HASAO
 * branding. Markup is rebuilt with RN primitives (no DOM/Tailwind), but the
 * flow, validation and API calls are unchanged.
 */
import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Keyboard,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {requestUserOtp, verifyUserOtp, completeUserSignup} from '../services/api/auth';
import {setUnifiedAuthData} from '../utils/moduleAuth';
import {useBooking} from '../context/BookingContext';

const LOGIN_BG = require('../assets/images/login-bg.png');
const BRAND_LOGO = require('../assets/images/brand-logo.png');

const readApiError = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpInputRefs = useRef([]);
  // 'phone' -> 'otp' -> 'name' (name step only for a number with no account yet).
  const [step, setStep] = useState('phone');
  const [needsName, setNeedsName] = useState(false);
  const [signupToken, setSignupToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const {login, showToast} = useBooking();

  useEffect(() => {
    if (step !== 'otp') return;
    const timer = setTimeout(() => otpInputRefs.current[0]?.focus(), 60);
    return () => clearTimeout(timer);
  }, [step]);

  const handleOtpChange = (index, value) => {
    const digitsOnly = value.replace(/\D/g, '');

    if (digitsOnly.length > 1) {
      const digits = digitsOnly.slice(0, 4 - index).split('');
      setOtp(prev => {
        const next = [...prev];
        digits.forEach((digit, i) => {
          if (index + i < 4) next[index + i] = digit;
        });
        return next;
      });
      const nextIndex = Math.min(3, index + digits.length);
      otpInputRefs.current[nextIndex]?.focus();
      if (index + digits.length >= 4) Keyboard.dismiss();
      return;
    }

    setOtp(prev => {
      const next = [...prev];
      next[index] = digitsOnly;
      return next;
    });

    if (digitsOnly && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    } else if (digitsOnly && index === 3) {
      Keyboard.dismiss();
    }
  };

  const handleOtpKeyPress = (index, e) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
      setOtp(prev => {
        const next = [...prev];
        next[index - 1] = '';
        return next;
      });
    }
  };

  const finishLogin = async (digits, user, message) => {
    await login(digits, user);
    showToast(message);
    // No explicit navigation: RootNavigator switches to the Main stack as
    // soon as BookingContext's `user.isLoggedIn` flips.
  };

  const handleSendOtp = async () => {
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

      if (data.nextStep === 'collect_name') {
        setSignupToken(data.signupToken || '');
        setNeedsName(true);
        setStep('name');
        return;
      }

      await setUnifiedAuthData(data);
      await finishLogin(digits, data.user, '✨ Welcome back!');
    } catch (err) {
      showToast(readApiError(err, 'Invalid or expired OTP.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    const digits = String(phone).replace(/\D/g, '');
    const name = fullName.trim();
    if (name.length < 2) {
      showToast('Please enter your full name');
      return;
    }

    setIsLoading(true);
    try {
      const res = await completeUserSignup(signupToken, {name});
      const data = res?.data?.data ?? res?.data ?? {};

      await setUnifiedAuthData(data);
      await finishLogin(digits, data.user, '✨ Account created! Welcome to Dima Hasao!');
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

  const submitLabel =
    step === 'phone' ? 'GET OTP' : step === 'otp' ? 'VERIFY & EXPLORE' : 'CREATE ACCOUNT & EXPLORE';
  const cardTitle =
    step === 'name' ? 'CREATE YOUR ACCOUNT' : step === 'otp' && needsName ? 'VERIFY YOUR NUMBER' : 'LOGIN TO YOUR ACCOUNT';

  return (
    <ImageBackground source={LOGIN_BG} resizeMode="cover" className="flex-1 bg-[#04190c]">
      <SafeAreaView className="flex-1 justify-between p-3">
        {/* Header */}
        <View className="items-center pt-1 px-2">
          <Image source={BRAND_LOGO} className="w-24 h-24" resizeMode="contain" />
          <Text className="font-black text-2xl tracking-wider text-[#062c14] mt-1">JUTHAI</Text>
          <View className="flex-row items-center my-1">
            <View className="h-px bg-[#062c14] w-6" />
            <Text className="text-[9px] font-black tracking-[2px] text-[#062c14] uppercase mx-2">
              WELCOME TO
            </Text>
            <View className="h-px bg-[#062c14] w-6" />
          </View>
          <Text className="font-black text-lg text-[#062c14]">DIMA HASAO</Text>
        </View>

        <View className="flex-1 min-h-[40px]" />

        {/* Card */}
        <View className="w-full max-w-[390px] mx-auto pb-1">
          <View className="bg-[#051f11f5] border-2 border-[#caa83e] rounded-[22px] p-5">
            <Text className="text-[#caa83e] font-extrabold tracking-wider text-[11px] uppercase text-center mb-3">
              {cardTitle}
            </Text>

            {step === 'name' && (
              <View className="mb-3">
                <Text className="text-[10px] text-emerald-200/90 mb-1.5 text-center">
                  Number verified — tell us your name to finish signing up.
                </Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full Name"
                  placeholderTextColor="#5d7264"
                  autoFocus
                  className="h-11 px-3.5 border border-[#caa83e]/50 rounded-xl bg-[#02130a] text-gray-100 text-sm"
                />
              </View>
            )}

            {step !== 'name' && (
              <View className="mb-3 flex-row items-center">
                <TextInput
                  value={phone}
                  onChangeText={v => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Phone Number"
                  placeholderTextColor="#5d7264"
                  keyboardType="number-pad"
                  maxLength={10}
                  editable={step !== 'otp'}
                  className="flex-1 h-11 px-3.5 border border-[#caa83e]/50 rounded-xl bg-[#02130a] text-gray-100 text-sm"
                />
                {step === 'otp' && (
                  <Pressable
                    onPress={() => {
                      setStep('phone');
                      setOtp(['', '', '', '']);
                    }}
                    className="absolute right-3">
                    <Text className="text-[#caa83e] text-xs font-semibold">Edit</Text>
                  </Pressable>
                )}
              </View>
            )}

            {step === 'otp' && (
              <View className="mb-1">
                <View className="flex-row justify-center gap-2.5 mb-2">
                  {[0, 1, 2, 3].map(index => (
                    <TextInput
                      key={index}
                      ref={el => (otpInputRefs.current[index] = el)}
                      value={otp[index]}
                      onChangeText={v => handleOtpChange(index, v)}
                      onKeyPress={e => handleOtpKeyPress(index, e)}
                      keyboardType="number-pad"
                      maxLength={4}
                      autoFocus={index === 0}
                      className="h-12 w-12 rounded-xl border border-[#caa83e] bg-[#02130a] text-center text-lg font-bold text-amber-300"
                    />
                  ))}
                </View>
                <View className="flex-row justify-between items-center px-1">
                  <Text className="text-amber-200/80 text-[11px]">Sent to your phone</Text>
                  <Pressable onPress={handleSendOtp}>
                    <Text className="text-[#caa83e] text-[11px] font-semibold">Resend OTP</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-[#e5b33b] items-center justify-center mt-3 active:opacity-80">
              {isLoading ? (
                <ActivityIndicator color="#04190c" />
              ) : (
                <Text className="text-[#04190c] font-black text-sm uppercase tracking-[2px]">
                  {submitLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
