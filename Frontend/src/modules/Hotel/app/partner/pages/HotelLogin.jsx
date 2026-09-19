import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, User, Mail, ArrowRight, Loader2, Shield, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../../services/apiService';
import { HOTEL_BRAND_LOGO } from '@/shared/constants/brandLogo';
import DimaHasaoAuthShell, {
    authFieldClass,
    authLabelClass,
    authInputClass,
    authButtonClass,
} from '@/shared/components/auth/DimaHasaoAuthShell';

const HotelLogin = () => {
    const navigate = useNavigate();
    // 1 = phone, 2 = OTP, 3 = details (only when the number has no account yet)
    const [step, setStep] = useState(1);
    const [contact, setContact] = useState('');
    const [otp, setOtp] = useState(['', '', '', '']);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    // Proof the phone passed its OTP, exchanged for a session in step 3.
    const [signupToken, setSignupToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const goToPartnerArea = () => navigate('/hotel/partner/dashboard', { replace: true });

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');

        const digits = String(contact).replace(/\D/g, '');
        if (digits.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        setLoading(true);
        try {
            await authService.sendOtp(digits, 'login', 'partner');
            setOtp(['', '', '', '']);
            setStep(2);
        } catch (err) {
            setError(err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleOTPChange = (index, value) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < otp.length - 1) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        const otpString = otp.join('');
        if (otpString.length !== 4) {
            setError('Please enter complete OTP');
            return;
        }

        setLoading(true);
        try {
            const result = await authService.verifyOtp({
                phone: String(contact).replace(/\D/g, ''),
                otp: otpString,
                role: 'partner',
            });

            // An unknown number has no account to sign into yet — it carries a
            // signup ticket into step 3 and registers on this same screen.
            if (result?.nextStep === 'onboarding') {
                setSignupToken(result.signupToken || '');
                setError('');
                setStep(3);
                return;
            }

            goToPartnerArea();
        } catch (err) {
            setError(err.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (name.trim().length < 2) {
            setError('Please enter your full name');
            return;
        }

        setLoading(true);
        try {
            await authService.completePartnerSignup(signupToken, {
                name: name.trim(),
                email: email.trim(),
            });
            goToPartnerArea();
        } catch (err) {
            setError(err.message || 'Could not complete registration');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DimaHasaoAuthShell
      logo={HOTEL_BRAND_LOGO}
            width="760px"
            blurb="List your hotel, resort, lodge or homestay and take bookings from travellers exploring Dima Hasao."
            points={["Resorts", "Hotels", "Lodges", "Homestays"]}
        >
            <AnimatePresence mode="wait">
                {step === 1 ? (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <h2 className="dh-playfair text-[26px] font-black text-[#f4efe2]">Partner sign in</h2>
                        <p className="mt-1.5 text-sm text-[#9fb3a4]">
                            Enter your phone number — we'll sign you in, or set you up if you're new.
                        </p>

                        <form onSubmit={handleSendOTP} className="mt-7 space-y-5">
                            <div>
                                <label className={authLabelClass}>Phone Number</label>
                                <div className={authFieldClass(Boolean(error))}>
                                    <Phone size={17} className="ml-3.5 shrink-0 text-[#caa83e]" />
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={10}
                                        value={contact}
                                        onChange={(e) => setContact(e.target.value.replace(/\D/g, ''))}
                                        placeholder="9876543210"
                                        className={`${authInputClass} px-3`}
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-sm text-red-300"
                                >
                                    {error}
                                </motion.p>
                            )}

                            <button type="submit" disabled={loading} className={authButtonClass}>
                                {loading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        Send OTP
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                ) : step === 2 ? (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <div className="mb-7 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#caa83e]/30 bg-[#caa83e]/10">
                                <Shield size={28} className="text-[#caa83e]" />
                            </div>
                            <h2 className="dh-playfair text-[24px] font-black text-[#f4efe2]">Enter OTP</h2>
                            <p className="mt-1.5 text-sm text-[#9fb3a4]">Code sent to +91 {contact}</p>
                        </div>

                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                            <div className="flex justify-center gap-2.5">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOTPChange(index, e.target.value)}
                                        className="h-13 w-12 rounded-xl border border-[#caa83e]/35 bg-[#02130a] text-center text-xl font-black text-[#f4efe2] outline-none transition-colors focus:border-[#caa83e]"
                                    />
                                ))}
                            </div>

                            {error && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center text-sm text-red-300"
                                >
                                    {error}
                                </motion.p>
                            )}

                            <button type="submit" disabled={loading} className={authButtonClass}>
                                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify & Login'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full text-sm text-[#9fb3a4] transition-colors hover:text-[#caa83e]"
                            >
                                Change number
                            </button>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <div className="mb-7 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#caa83e]/30 bg-[#caa83e]/10">
                                <Building2 size={28} className="text-[#caa83e]" />
                            </div>
                            <h2 className="dh-playfair text-[24px] font-black text-[#f4efe2]">Create your partner account</h2>
                            <p className="mt-1.5 text-sm text-[#9fb3a4]">
                                +91 {contact} verified. Tell us who you are to finish.
                            </p>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-5">
                            <div>
                                <label className={authLabelClass}>Full Name</label>
                                <div className={authFieldClass(false)}>
                                    <User size={17} className="ml-3.5 shrink-0 text-[#caa83e]" />
                                    <input
                                        type="text"
                                        autoFocus
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Your full name"
                                        className={`${authInputClass} px-3`}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={authLabelClass}>
                                    Email <span className="normal-case tracking-normal text-[#5d7264]">(optional)</span>
                                </label>
                                <div className={authFieldClass(false)}>
                                    <Mail size={17} className="ml-3.5 shrink-0 text-[#caa83e]" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="partner@hotel.com"
                                        className={`${authInputClass} px-3`}
                                    />
                                </div>
                            </div>

                            {error && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-sm text-red-300"
                                >
                                    {error}
                                </motion.p>
                            )}

                            <button type="submit" disabled={loading} className={authButtonClass}>
                                {loading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        Create Account
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs text-[#5d7264]">
                                You can add property and KYC details once you're in.
                            </p>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </DimaHasaoAuthShell>
    );
};

export default HotelLogin;
