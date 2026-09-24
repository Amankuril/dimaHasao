import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '../router';
import { useBooking } from '../context/BookingContext';
import { motion, AnimatePresence } from 'framer-motion';
import { requestUserOtp, verifyUserOtp, completeUserSignup } from '../../../services/api/auth';
import { setUnifiedAuthData } from '../../../shared/utils/moduleAuth';
import { CONSUMER_BRAND_LOGO, logoFallback } from "@/shared/constants/brandLogo";
import AuthLegalLinks from '@/shared/components/auth/AuthLegalLinks';

const readApiError = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

export const LoginScreen = () => {
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpInputRefs = useRef([]);
  // 'phone' → 'otp' → 'name' (name step only for unregistered numbers).
  const [step, setStep] = useState('phone');
  const [needsName, setNeedsName] = useState(false);
  // Proof the phone passed its OTP, exchanged for a session at the name step.
  const [signupToken, setSignupToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, showToast } = useBooking();
  const navigate = useNavigate();

  // The OTP boxes only exist in the DOM once step becomes 'otp', so autoFocus
  // on the first box normally covers it — this is the belt-and-braces fallback
  // for when the card's enter animation delays the box past React's mount.
  useEffect(() => {
    if (step !== 'otp') return;
    const timer = setTimeout(() => otpInputRefs.current[0]?.focus(), 60);
    return () => clearTimeout(timer);
  }, [step]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
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

    if (value && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
      setOtp((prev) => {
        const next = [...prev];
        next[index - 1] = '';
        return next;
      });
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4).split('');
    if (!digits.length) return;
    setOtp((prev) => {
      const next = [...prev];
      digits.forEach((digit, i) => {
        if (i < 4) next[i] = digit;
      });
      return next;
    });
    otpInputRefs.current[Math.min(digits.length, 3)]?.focus();
  };

  const finishLogin = (digits, user, message) => {
    login(digits, user);
    showToast(message);
    navigate('/');
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length !== 10) {
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
      setOtp(['', '', '', '']);
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
    const code = otp.join('');
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
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  // The field took anything: letters, and as many digits as you
                  // cared to type. An Indian mobile number is exactly ten.
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Phone Number"
                  className="block w-full pl-10 pr-3 h-11 border border-[#caa83e]/50 rounded-xl bg-[#02130a] text-gray-100 placeholder-[#5d7264] focus:outline-none focus:border-[#caa83e] focus:ring-1 focus:ring-[#caa83e] text-sm transition-all disabled:opacity-75"
                />
                {step === 'otp' && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setOtp(['', '', '', '']);
                    }}
                    aria-label="Edit phone number"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#caa83e] hover:text-[#efc04c] transition-colors cursor-pointer"
                  >
                    <i className="fa-solid fa-pen text-[11px]"></i>
                  </button>
                )}
              </div>
            )}

            {/* OTP Input — four boxes, first one auto-focused as soon as this
                step mounts so the digits can be typed straight away. */}
            {step === 'otp' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-center gap-2.5">
                  {[0, 1, 2, 3].map((index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="tel"
                      inputMode="numeric"
                      maxLength={1}
                      autoFocus={index === 0}
                      value={otp[index]}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      className="h-12 w-12 rounded-xl border border-[#caa83e] bg-[#02130a] text-center text-lg font-mono font-black text-amber-300 outline-none transition-all focus:ring-1 focus:ring-[#caa83e]"
                    />
                  ))}
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

          <div className="mt-3.5 relative z-10">
            {/* Leaf-flanked divider, echoing the card's top border, to give
                the footer its own space now that it's just the three links. */}
            <div className="flex items-center justify-center gap-2 opacity-60">
              <div className="h-px flex-1 max-w-[72px] bg-gradient-to-r from-transparent to-[#caa83e]/70"></div>
              <i className="fa-solid fa-leaf text-[#caa83e] text-[9px] transform -scale-x-100"></i>
              <div className="h-px flex-1 max-w-[72px] bg-gradient-to-l from-transparent to-[#caa83e]/70"></div>
            </div>
            <AuthLegalLinks
              module="platform"
              variant="icons"
              className="mt-2.5 flex items-center justify-center gap-6"
              linkClassName="group flex flex-col items-center gap-1 cursor-pointer"
              iconWrapClassName="w-9 h-9 rounded-full border border-[#caa83e]/50 bg-[#02130a] flex items-center justify-center text-[#caa83e] transition-all group-hover:bg-[#caa83e]/15 group-hover:border-[#caa83e]"
              iconClassName="text-[13px]"
              labelClassName="text-[9px] font-semibold uppercase tracking-[0.1em] text-emerald-200/70 transition-colors group-hover:text-[#caa83e]"
            />
          </div>
        </motion.div>
      </div>
    </motion.main>
  );
};


