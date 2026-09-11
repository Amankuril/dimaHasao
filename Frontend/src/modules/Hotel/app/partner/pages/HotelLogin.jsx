import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, User, Mail, ArrowRight, Loader2, Shield, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../../services/apiService';
import logo from '../../../assets/rokologin-removebg-preview.png';

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
        <div className="min-h-screen bg-gradient-to-br from-[#002240] via-[#003768] to-[#005CA8] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-md z-10"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.2 }}
                        className="inline-block mb-4"
                    >
                        <img src={logo} alt="HoomZo Partner" className="w-32 h-auto" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-white">Partner Login</h1>
                    <p className="text-blue-100 mt-2">Access your hotel dashboard</p>
                </div>

                {/* Main Card */}
                <motion.div
                    layout
                    className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20"
                >
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h2 className="text-xl font-bold text-gray-900 mb-2">Login or Register</h2>
                                <p className="text-sm text-gray-500 mb-6">
                                    Enter your phone number — we'll sign you in, or set you up if you're new.
                                </p>

                                <form onSubmit={handleSendOTP} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Phone Number
                                        </label>
                                        <div className="relative">
                                            <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="tel"
                                                inputMode="numeric"
                                                maxLength={10}
                                                value={contact}
                                                onChange={(e) => setContact(e.target.value.replace(/\D/g, ''))}
                                                placeholder="9876543210"
                                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005CA8] focus:border-transparent outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-red-500 text-sm"
                                        >
                                            {error}
                                        </motion.p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-[#005CA8] hover:bg-[#004b8a] text-white py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            <>
                                                Send OTP
                                                <ArrowRight size={20} />
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
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-[#005CA8]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Shield size={32} className="text-[#005CA8]" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">Enter OTP</h2>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Code sent to +91 {contact}
                                    </p>
                                </div>

                                <form onSubmit={handleVerifyOTP} className="space-y-6">
                                    <div className="flex gap-2 justify-center">
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                id={`otp-${index}`}
                                                type="text"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOTPChange(index, e.target.value)}
                                                className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-400 rounded-xl focus:border-[#005CA8] focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                            />
                                        ))}
                                    </div>

                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-red-500 text-sm text-center"
                                        >
                                            {error}
                                        </motion.p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-[#005CA8] hover:bg-[#004b8a] text-white py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            'Verify & Login'
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="w-full text-gray-500 text-sm hover:text-gray-700"
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
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-[#005CA8]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Building2 size={32} className="text-[#005CA8]" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">Create your partner account</h2>
                                    <p className="text-sm text-gray-500 mt-2">
                                        +91 {contact} verified. Tell us who you are to finish.
                                    </p>
                                </div>

                                <form onSubmit={handleRegister} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Full Name
                                        </label>
                                        <div className="relative">
                                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                autoFocus
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Your full name"
                                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005CA8] focus:border-transparent outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email <span className="text-gray-400 font-normal">(optional)</span>
                                        </label>
                                        <div className="relative">
                                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="partner@hotel.com"
                                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005CA8] focus:border-transparent outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-red-500 text-sm"
                                        >
                                            {error}
                                        </motion.p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-[#005CA8] hover:bg-[#004b8a] text-white py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            <>
                                                Create Account
                                                <ArrowRight size={20} />
                                            </>
                                        )}
                                    </button>

                                    <p className="text-xs text-gray-400 text-center">
                                        You can add property and KYC details once you're in.
                                    </p>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                <p className="text-center text-blue-100 text-sm mt-6">
                    New here? Just enter your number above — we'll register you.
                </p>
            </motion.div>
        </div>
    );
};

export default HotelLogin;
