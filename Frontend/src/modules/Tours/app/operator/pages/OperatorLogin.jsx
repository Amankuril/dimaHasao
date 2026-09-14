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
    <div className="tours-operator min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#04301b] via-[#06381e] to-[#0a4d2b]">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src={DEFAULT_BRAND_LOGO} alt="Dima Hasao" className="w-20 h-auto mx-auto mb-3" />
          <h1 className="text-2xl font-black text-white">Tour Operator</h1>
          <p className="text-sm text-white/70 mt-1">Manage your packages and bookings</p>
        </div>

        <div className="to-card p-6 space-y-5">
          {step === 'phone' && (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <h2 className="font-bold text-gray-900">Sign in or register</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Enter your phone number — we'll sign you in, or set you up if you're new.
                </p>
              </div>
              <div>
                <label className="to-label" htmlFor="phone">Phone number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="phone" type="tel" inputMode="numeric" className="to-input pl-10"
                    placeholder="9876543210" value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="to-btn w-full">
                {loading ? <Loader2 size={16} className="animate-spin" /> : null} Send OTP <ArrowRight size={16} />
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={submitOtp} className="space-y-4">
              <div>
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#0a4d2b]" /> Enter the code
                </h2>
                <p className="text-xs text-gray-500 mt-1">Sent to +91 {digits}</p>
              </div>
              <input
                className="to-input text-center text-2xl tracking-[0.5em] font-bold"
                inputMode="numeric" maxLength={4} placeholder="••••"
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
              <button type="submit" disabled={loading} className="to-btn w-full">
                {loading ? <Loader2 size={16} className="animate-spin" /> : null} Verify
              </button>
              <button type="button" onClick={() => setStep('phone')} className="w-full text-xs text-gray-500 hover:text-gray-900">
                Use a different number
              </button>
            </form>
          )}

          {step === 'profile' && (
            <form onSubmit={submitProfile} className="space-y-4">
              <div>
                <h2 className="font-bold text-gray-900">Tell us about your agency</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Documents come later — an admin reviews your account before packages go live.
                </p>
              </div>
              <div>
                <label className="to-label">Your name <span className="text-red-500">*</span></label>
                <input className="to-input" value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="to-label">Agency name</label>
                <input className="to-input" placeholder="e.g. Borail Expeditions" value={profile.agencyName}
                  onChange={(e) => setProfile((p) => ({ ...p, agencyName: e.target.value }))} />
              </div>
              <div>
                <label className="to-label">Email</label>
                <input className="to-input" type="email" value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <button type="submit" disabled={loading} className="to-btn w-full">
                {loading ? <Loader2 size={16} className="animate-spin" /> : null} Create my account
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default OperatorLogin;
