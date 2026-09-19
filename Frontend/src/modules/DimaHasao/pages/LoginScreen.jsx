import { useState } from 'react';
import { useNavigate } from '../router';
import { useBooking } from '../context/BookingContext';
import { motion, AnimatePresence } from 'framer-motion';
import { requestUserOtp, verifyUserOtp, completeUserSignup } from '../../../services/api/auth';
import { setUnifiedAuthData } from '../../../shared/utils/moduleAuth';
import { CONSUMER_BRAND_LOGO, logoFallback } from "@/shared/constants/brandLogo";

const TEST_PHONE =
  String(import.meta.env?.VITE_USE_DEFAULT_TEST_PHONE) === 'true'
    ? String(import.meta.env?.VITE_DEFAULT_TEST_PHONE || '')
    : '';

const readApiError = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

export const LoginScreen = () => {
  const [phone, setPhone] = useState(TEST_PHONE);
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  // 'phone' → 'otp' → 'name' (name step only for unregistered numbers).
  const [step, setStep] = useState('phone');
  const [needsName, setNeedsName] = useState(false);
  // Proof the phone passed its OTP, exchanged for a session at the name step.
  const [signupToken, setSignupToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, showToast } = useBooking();
  const navigate = useNavigate();

  const finishLogin = (digits, user, message) => {
    login(digits, user);
    showToast(message);
    navigate('/');
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length < 10) {
      showToast('Enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestUserOtp(digits);
      const data = res?.data?.data ?? res?.data ?? {};
      // Backend tells us up front whether this number already has an account,
      // so the OTP step can present itself as sign-in vs. registration.
      setNeedsName(data.nextStepIfVerified === 'collect_name');
      /*
       * Dev and staging backends return the code in the response. It is
       * deliberately not used: filling the field, printing it under the input
       * or putting it in the toast all mean nobody ever types an OTP, so the
       * one step this screen exists to test is never exercised. The code still
       * arrives by SMS, and in dev it is the fixed one.
       */
      setOtp('');
      setStep('otp');
      showToast('OTP sent to your phone 📱');
    } catch (err) {
      showToast(readApiError(err, 'Could not send OTP. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const digits = String(phone).replace(/\D/g, '');
    const code = String(otp).replace(/\D/g, '');
    if (code.length !== 4) {
      showToast('Please enter the 4-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyUserOtp(digits, code);
      const data = res?.data?.data ?? res?.data ?? {};

      // A number with no account yet has no session to establish — it carries a
      // signup ticket to the name step instead.
      if (data.nextStep === 'collect_name') {
        setSignupToken(data.signupToken || '');
        setNeedsName(true);
        setStep('name');
        return;
      }

      // Establishes BOTH the food and taxi sessions from one login.
      setUnifiedAuthData(data);
      finishLogin(digits, data.user, '✨ Welcome back!');
    } catch (err) {
      showToast(readApiError(err, 'Invalid or expired OTP.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async (e) => {
    if (e) e.preventDefault();
    const digits = String(phone).replace(/\D/g, '');
    const name = fullName.trim();
    if (name.length < 2) {
      showToast('Please enter your full name');
      return;
    }

    setIsLoading(true);
    try {
      const res = await completeUserSignup(signupToken, { name });
      const data = res?.data?.data ?? res?.data ?? {};

      // The account exists now, so this is the first real session.
      setUnifiedAuthData(data);
      finishLogin(digits, data.user, '✨ Account created! Welcome to Dima Hasao!');
    } catch (err) {
      showToast(readApiError(err, 'Could not save your name. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step === 'phone') return handleSendOtp(e);
    if (step === 'otp') return handleVerifyOtp(e);
    return handleCompleteRegistration(e);
  };

  const handleGuestLogin = () => {
    login('Guest Explorer');
    showToast('🌿 Exploring Dima Hasao as Guest');
    navigate('/');
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative w-full h-dvh min-h-dvh max-h-dvh mx-auto overflow-hidden shadow-2xl flex flex-col justify-between select-none p-2.5 sm:p-3 bg-[#04190c]"
    >
      {/* 100% Full-bleed Continuous Background with /updated.png */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <img
          src="/updated.png"
          alt="Dima Hasao Heritage Gate"
          className="w-full h-full object-cover object-top"
        />

        {/* Top Sky Overlay for Typography Crispness */}
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white/20 via-white/5 to-transparent z-10" />

        {/* Soft Ambient Vignette behind bottom login card */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/50 via-black/15 to-transparent z-10" />
      </div>

      {/* Top Header: Official Seal & Typography (Matching Reference) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="pt-1 text-center relative z-20 flex flex-col items-center px-2"
      >
        {/* Official Tourism Seal with Falcon */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)] mb-1"
        >
          <img
            alt="Dima Hasao Tourism Logo"
            className="w-full h-full object-contain"
            src={CONSUMER_BRAND_LOGO}
            onError={logoFallback}
          />
        </motion.div>

        {/* JUTHAI Header */}
        <h1 className="font-playfair font-black text-2xl sm:text-[28px] tracking-wider text-[#062c14] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)] leading-none mt-0.5">
          JUTHAI
        </h1>

        {/* —• WELCOME TO •— */}
        <div className="flex items-center justify-center gap-1.5 my-0.5">
          <div className="h-[1.5px] bg-[#062c14] w-6"></div>
          <span className="text-[8.5px] sm:text-[9px] font-black tracking-[0.25em] text-[#062c14] uppercase">
            • WELCOME TO •
          </span>
          <div className="h-[1.5px] bg-[#062c14] w-6"></div>
        </div>

        {/* DIMA HASAO */}
        <h2 className="font-montserrat font-black text-lg sm:text-xl text-[#062c14] tracking-wide leading-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
          DIMA HASAO
        </h2>
      </motion.div>

      {/* Heritage Gate Viewing Space */}
      <div className="flex-1 min-h-[40px] pointer-events-none" />

      {/* Bottom Login / Sign Up Card (Matching Reference Image) */}
      <div className="relative z-20 w-full max-w-[390px] mx-auto pb-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="dh-login-card bg-[#051f11]/96 backdrop-blur-md border-2 border-[#caa83e] rounded-[22px] p-4 sm:p-5 shadow-[0_15px_40px_rgba(0,0,0,0.85)] relative overflow-hidden"
        >
          {/* Leaf flourishes & Card Title */}
          {/* The weave that edges every other Dima Hasao surface, so the card
              belongs to the same platform as the panels behind it. */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1.5"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg,#04190c 0,#04190c 7px,#caa83e 7px,#caa83e 14px,#0d3d20 14px,#0d3d20 21px,#8c1c13 21px,#8c1c13 28px)',
            }}
          />

          <div className="flex items-center justify-center space-x-2 mb-3 mt-1 relative z-10">
            <i className="fa-solid fa-leaf text-[#caa83e] text-[11px] transform -scale-x-100"></i>
            <h3 className="text-[#caa83e] font-extrabold tracking-wider text-[11px] uppercase font-cinzel">
              {step === 'name'
                ? 'CREATE YOUR ACCOUNT'
                : step === 'otp' && needsName
                ? 'VERIFY YOUR NUMBER'
                : 'LOGIN TO YOUR ACCOUNT'}
            </h3>
            <i className="fa-solid fa-leaf text-[#caa83e] text-[13px]"></i>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 relative z-10">
            {/* Full Name — only for a number with no account yet, asked after
                the OTP has already been verified. */}
            <AnimatePresence mode="wait">
              {step === 'name' && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative overflow-hidden"
                >
                  <p className="text-[10px] text-emerald-200/90 mb-1.5 text-center">
                    Number verified — tell us your name to finish signing up.
                  </p>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <i className="fa-solid fa-user text-[#caa83e] text-[13px]"></i>
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoFocus
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name"
                      className="block w-full pl-10 pr-3 h-11 border border-[#caa83e]/50 rounded-xl bg-[#02130a] text-gray-100 placeholder-[#5d7264] focus:outline-none focus:border-[#caa83e] focus:ring-1 focus:ring-[#caa83e] text-sm transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Phone Number Input */}
            {step !== 'name' && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <i className="fa-solid fa-phone text-[#caa83e] text-[13px]"></i>
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  disabled={step === 'otp'}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone Number"
                  className="block w-full pl-10 pr-3 h-11 border border-[#caa83e]/50 rounded-xl bg-[#02130a] text-gray-100 placeholder-[#5d7264] focus:outline-none focus:border-[#caa83e] focus:ring-1 focus:ring-[#caa83e] text-sm transition-all disabled:opacity-75"
                />
                {step === 'otp' && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setOtp('');
                      setDevOtp('');
                    }}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#caa83e] text-[10px] hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}

            {/* OTP Input */}
            {step === 'otp' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1"
              >
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <i className="fa-solid fa-shield-halved text-[#caa83e] text-[13px]"></i>
                  </div>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 4-Digit OTP"
                    className="block w-full pl-10 pr-3 h-12 border border-[#caa83e] rounded-xl bg-[#02130a] text-amber-300 font-mono font-black tracking-[0.45em] text-center focus:outline-none focus:ring-1 focus:ring-[#caa83e] text-lg transition-all"
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] px-1 pt-0.5">
                  <span className="text-amber-200/80">Sent to your phone</span>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-[#caa83e] hover:underline cursor-pointer font-semibold"
                  >
                    Resend OTP
                  </button>
                </div>
              </motion.div>
            )}

            {/* GET OTP / VERIFY / REGISTER Button */}
            <motion.button
              whileHover={{ scale: 1.02, filter: 'brightness(1.06)' }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center h-12 px-4 rounded-xl text-sm font-black text-[#04190c] bg-[#e5b33b] hover:bg-[#efc04c] shadow-[0_10px_24px_rgba(229,179,59,0.28)] transition-all cursor-pointer uppercase tracking-[0.16em]"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>
                  {step === 'phone'
                    ? 'GET OTP'
                    : step === 'otp'
                    ? 'VERIFY & EXPLORE'
                    : 'CREATE ACCOUNT & EXPLORE'}
                </span>
              )}
            </motion.button>
          </form>

          <div className="mt-2.5 relative z-10">
            {/* Quick Guest Bypass */}
            <div className="mt-0.5 text-center">
              <motion.button
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={handleGuestLogin}
                className="text-[11px] text-emerald-300 hover:text-[#caa83e] transition-colors cursor-pointer font-semibold inline-flex items-center gap-1"
              >
                <span>Continue as Guest Explorer →</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.main>
  );
};


