/**
 * Operator sign-in and sign-up on one screen.
 *
 * Phone → 4-digit OTP → (if the number is new) name, agency and email. That
 * third step only appears when the server answers `onboarding`, so a returning
 * operator never sees it. Copied in shape from the hotel partner login.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Phone, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { requestOtp, verifyOtp, completeSignup, AUDIENCE, NEXT_STEP } from '@/services/auth/otpAuthClient';
import { saveOperatorSession } from '../../../services/operatorService';
import { DEFAULT_BRAND_LOGO } from '@/shared/constants/brandLogo';
import '../toursTheme.css';
import DimaHasaoAuthShell, {
  authFieldClass,
  authLabelClass,
  authInputClass,
  authButtonClass,
} from '@/shared/components/auth/DimaHasaoAuthShell';

const OPERATOR_AUDIENCE = AUDIENCE.TOURS_OPERATOR;

const OperatorLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [signupToken, setSignupToken] = useState('');
  const [profile, setProfile] = useState({ name: '', agencyName: '', email: '' });
  const [loading, setLoading] = useState(false);

  const digits = phone.replace(/\D/g, '').slice(-10);

  const finish = (session) => {
    saveOperatorSession(session.token, session.user);
    toast.success('Signed in');
    navigate('/tours/operator/dashboard', { replace: true });
  };

  const sendOtp = async (event) => {
    event.preventDefault();
    if (digits.length !== 10) return toast.error('Enter a 10-digit mobile number');
    try {
      setLoading(true);
      await requestOtp(OPERATOR_AUDIENCE, digits);
      toast.success('OTP sent');
      setStep('otp');
    } catch (error) {
      toast.error(error?.message || 'Could not send the OTP');
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (event) => {
    event.preventDefault();
    if (otp.length !== 4) return toast.error('Enter the 4-digit OTP');
    try {
      setLoading(true);
      const result = await verifyOtp(OPERATOR_AUDIENCE, digits, otp);

      if (result?.nextStep === NEXT_STEP.ONBOARDING) {
        setSignupToken(result.signupToken);
        setStep('profile');
        return;
      }
      finish(result);
    } catch (error) {
      toast.error(error?.message || 'That OTP did not work');
    } finally {
      setLoading(false);
    }
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    if (!profile.name.trim()) return toast.error('Your name is required');
    try {
      setLoading(true);
      const result = await completeSignup(OPERATOR_AUDIENCE, signupToken, {
        name: profile.name.trim(),
        agencyName: profile.agencyName.trim() || profile.name.trim(),
        email: profile.email.trim(),
      });
      finish(result);
    } catch (error) {
      toast.error(error?.message || 'Could not complete your registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DimaHasaoAuthShell
      width="760px"
      blurb="Publish guided treks, curated journeys and day trips across Dima Hasao, and take bookings from travellers."
      points={["Guided treks", "Curated journeys", "Day trips", "Cultural tours"]}
    >
      {step === 'phone' && (
        <form onSubmit={sendOtp} className="space-y-5">
          <div>
            <h2 className="dh-playfair text-[26px] font-black text-[#f4efe2]">Tour operator</h2>
            <p className="mt-1.5 text-sm text-[#9fb3a4]">
              Enter your phone number — we'll sign you in, or set you up if you're new.
            </p>
          </div>
          <div>
            <label className={authLabelClass} htmlFor="phone">Phone number</label>
            <div className={authFieldClass(false)}>
              <Phone size={17} className="ml-3.5 shrink-0 text-[#caa83e]" />
              <input
                id="phone" type="tel" inputMode="numeric" className={`${authInputClass} px-3`}
                placeholder="9876543210" value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className={authButtonClass}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : null} Send OTP <ArrowRight size={16} />
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={submitOtp} className="space-y-5">
          <div>
            <h2 className="dh-playfair flex items-center gap-2 text-[24px] font-black text-[#f4efe2]">
              <ShieldCheck size={20} className="text-[#caa83e]" /> Enter the code
            </h2>
            <p className="mt-1.5 text-sm text-[#9fb3a4]">Sent to +91 {digits}</p>
          </div>
          <div className={authFieldClass(false)}>
            <input
              className={`${authInputClass} px-3 text-center text-2xl font-black tracking-[0.5em]`}
              inputMode="numeric" maxLength={4} placeholder="••••"
              value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>
          <button type="submit" disabled={loading} className={authButtonClass}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : null} Verify
          </button>
          <button
            type="button"
            onClick={() => setStep('phone')}
            className="w-full text-xs text-[#9fb3a4] transition-colors hover:text-[#caa83e]"
          >
            Use a different number
          </button>
        </form>
      )}

      {step === 'profile' && (
        <form onSubmit={submitProfile} className="space-y-5">
          <div>
            <h2 className="dh-playfair text-[24px] font-black text-[#f4efe2]">Tell us about your agency</h2>
            <p className="mt-1.5 text-sm text-[#9fb3a4]">
              Documents come later — an admin reviews your account before packages go live.
            </p>
          </div>
          <div>
            <label className={authLabelClass}>Your name <span className="text-red-300">*</span></label>
            <div className={authFieldClass(false)}>
              <input className={`${authInputClass} px-3`} value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={authLabelClass}>Agency name</label>
            <div className={authFieldClass(false)}>
              <input className={`${authInputClass} px-3`} placeholder="e.g. Borail Expeditions" value={profile.agencyName}
                onChange={(e) => setProfile((p) => ({ ...p, agencyName: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={authLabelClass}>Email</label>
            <div className={authFieldClass(false)}>
              <input className={`${authInputClass} px-3`} type="email" value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
            </div>
          </div>
          <button type="submit" disabled={loading} className={authButtonClass}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : null} Create my account
          </button>
        </form>
      )}
    </DimaHasaoAuthShell>
  );
};

export default OperatorLogin;
