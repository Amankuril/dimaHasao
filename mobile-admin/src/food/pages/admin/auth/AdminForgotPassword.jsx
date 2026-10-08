/* Ported from Frontend/src/modules/Food/pages/admin/auth/AdminForgotPassword.jsx (tools/port.js first pass). */
import { useState, useRef, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigate } from '../../../../lib/webRouter';
import { ArrowLeft, KeyRound, Mail, Shield, Eye, EyeOff } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import AdminAuthShell, { CINZEL, MONTSERRAT, authFieldClass, authLabelClass, authInputClass, authButtonClass, authButtonTextClass } from './AdminAuthShell';
import { TextInput } from '../../../../components/Text';

/**
 * Admin password reset: email → 6-digit code → new password.
 *
 * Shares AdminAuthShell with the login it is reached from, so the two read as
 * one flow. Nothing linked here before, so this page existed and worked but was
 * unreachable.
 */
import { Button, Div, Form, H2, Input, Label, P, Span, Icon as UiIcon } from '../../../../components/web';
export default function AdminForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: email, 2: OTP, 3: new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef(
    Array(6)
      .fill(null)
      .map(() => null),
  );
  const timerRef = useRef(null);
  useEffect(() => () => clearInterval(timerRef.current), []);
  const startResendCountdown = () => {
    setResendTimer(60);
    clearInterval(timerRef.current);
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = timer;
  };
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Email is required');
      return;
    }
    setIsLoading(true);
    try {
      await adminAPI.requestForgotPasswordOtp(trimmedEmail);
      setEmail(trimmedEmail);
      setStep(2);
      startResendCountdown();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'This email is not registered as an admin account or something went wrong.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };
  // A paste arrives as one multi-digit change; it fills the row as the web's onPaste did.
  const handleOtpPaste = (pastedData) => {
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');
    const newOtp = [...otp];
    digits.forEach((digit, i) => {
      if (i < 6) {
        newOtp[i] = digit;
      }
    });
    setOtp(newOtp);
    if (digits.length === 6) {
      inputRefs.current[5]?.focus();
    } else {
      inputRefs.current[digits.length]?.focus();
    }
  };
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    if (index === 0 && value.length > 2) {
      handleOtpPaste(value);
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  const handleOtpSubmit = (e) => {
    e.preventDefault();
    setError('');
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    setStep(3);
  };
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    setError('');
    try {
      await adminAPI.requestForgotPasswordOtp(email);
      startResendCountdown();
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to resend the code. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await adminAPI.resetPasswordWithOtp(email, otp.join(''), newPassword);
      navigate('/admin/login', {
        state: {
          message: 'Password reset successfully. Please login with your new password.',
        },
      });
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to reset password. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };
  const heading = {
    1: 'Forgot password',
    2: 'Check your email',
    3: 'Set a new password',
  }[step];
  const subheading = {
    1: "We'll email you a 6-digit verification code.",
    2: `Enter the code we sent to ${email}.`,
    3: 'Choose a password you have not used before.',
  }[step];
  return (
    <AdminAuthShell>
      <Div className="flex items-center justify-center gap-2.5">
        <UiIcon as={KeyRound} size={15} className="text-[#caa83e]" />
        <Span style={CINZEL} className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#caa83e]">
          Step {step} of 3
        </Span>
      </Div>

      <H2 style={MONTSERRAT} className="mt-3 text-center text-2xl font-black tracking-wide text-[#f4efe2]">
        {heading}
      </H2>
      <P className="mt-1.5 text-center text-[13px] text-[#9fb3a4]">{subheading}</P>

      {error && <P className="mt-5 rounded-xl border border-red-400/40 bg-red-500/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-red-200">{error}</P>}

      {step === 1 && (
        <Form onSubmit={handleEmailSubmit} className="mt-6 gap-4">
          <Div>
            <Label className={authLabelClass} style={MONTSERRAT}>
              Email
            </Label>
            <Div className={authFieldClass(false)}>
              <Div className="w-11 h-12 shrink-0 items-center justify-center">
                <UiIcon as={Mail} size={16} className="text-[#caa83e]" />
              </Div>
              <Input
                nativeID="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="admin@dimahasao.in"
                placeholderTextColor="#5d7264"
                className={`${authInputClass} pr-3`}
              />
            </Div>
          </Div>

          <Button type="submit" disabled={isLoading} className={authButtonClass} style={isLoading ? { opacity: 0.7 } : null}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#04190c" />
            ) : (
              <Span className={authButtonTextClass} style={MONTSERRAT}>
                Send code
              </Span>
            )}
          </Button>
        </Form>
      )}

      {step === 2 && (
        <Form onSubmit={handleOtpSubmit} className="mt-6 gap-4">
          <Div>
            <Label className={authLabelClass} style={MONTSERRAT}>
              Verification code
            </Label>
            <Div className="flex flex-row justify-between gap-1.5">
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(el) => {
                    if (inputRefs.current) inputRefs.current[index] = el;
                  }}
                  keyboardType="number-pad"
                  // Only the first box takes a paste, so one paste fills the row.
                  maxLength={index === 0 ? 6 : 2}
                  accessibilityLabel={`Verification code digit ${index + 1} of 6`}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(index, text)}
                  onKeyPress={(e) => handleOtpKeyDown(index, { key: e.nativeEvent.key })}
                  editable={!isLoading}
                  selectTextOnFocus
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(202,168,62,0.35)',
                    backgroundColor: '#02130a',
                    textAlign: 'center',
                    fontSize: 20,
                    fontWeight: '700',
                    color: '#f4efe2',
                    paddingVertical: 0,
                  }}
                />
              ))}
            </Div>
          </Div>

          <Div className="flex-row items-center justify-between">
            <Button type="button" onClick={() => setStep(1)} disabled={isLoading} accessibilityLabel="Change email" className="h-11 flex-row items-center gap-1.5 pr-3">
              <UiIcon as={ArrowLeft} size={13} className="text-[#9fb3a4]" />
              <Span className="text-[12px] font-semibold text-[#9fb3a4]">Change email</Span>
            </Button>
            <Button type="button" onClick={handleResendOtp} disabled={resendTimer > 0 || isLoading} accessibilityLabel="Resend code" className="h-11 items-center justify-center pl-3">
              <Span className={`text-[12px] font-semibold ${resendTimer > 0 || isLoading ? 'text-[#5d7264]' : 'text-[#caa83e]'}`}>
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
              </Span>
            </Button>
          </Div>

          <Button type="submit" disabled={isLoading} className={authButtonClass} style={isLoading ? { opacity: 0.7 } : null}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#04190c" />
            ) : (
              <Span className={authButtonTextClass} style={MONTSERRAT}>
                Verify code
              </Span>
            )}
          </Button>
        </Form>
      )}

      {step === 3 && (
        <Form onSubmit={handlePasswordSubmit} className="mt-6 gap-4">
          {[
            {
              id: 'new-password',
              label: 'New password',
              value: newPassword,
              onChange: setNewPassword,
              visible: showPassword,
              toggle: () => setShowPassword((c) => !c),
              placeholder: 'At least 6 characters',
            },
            {
              id: 'confirm-password',
              label: 'Confirm password',
              value: confirmPassword,
              onChange: setConfirmPassword,
              visible: showConfirmPassword,
              toggle: () => setShowConfirmPassword((c) => !c),
              placeholder: 'Type it again',
            },
          ].map((field) => (
            <Div key={field.id}>
              <Label className={authLabelClass} style={MONTSERRAT}>
                {field.label}
              </Label>
              <Div className={authFieldClass(false)}>
                <Div className="w-11 h-12 shrink-0 items-center justify-center">
                  <UiIcon as={Shield} size={16} className="text-[#caa83e]" />
                </Div>
                <Input
                  nativeID={field.id}
                  type={field.visible ? 'text' : 'password'}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  disabled={isLoading}
                  placeholder={field.placeholder}
                  placeholderTextColor="#5d7264"
                  className={authInputClass}
                />
                <Button
                  type="button"
                  onClick={field.toggle}
                  disabled={isLoading}
                  accessibilityLabel={field.visible ? 'Hide password' : 'Show password'}
                  className="w-11 h-12 shrink-0 items-center justify-center"
                >
                  <UiIcon as={field.visible ? EyeOff : Eye} size={16} className="text-[#5d7264]" />
                </Button>
              </Div>
            </Div>
          ))}

          <Button type="submit" disabled={isLoading} className={authButtonClass} style={isLoading ? { opacity: 0.7 } : null}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#04190c" />
            ) : (
              <Span className={authButtonTextClass} style={MONTSERRAT}>
                Reset password
              </Span>
            )}
          </Button>
        </Form>
      )}

      <Button type="button" onClick={() => navigate('/admin/login')} accessibilityLabel="Back to sign in" className="mt-6 h-11 w-full flex-row items-center justify-center gap-1.5">
        <UiIcon as={ArrowLeft} size={13} className="text-[#9fb3a4]" />
        <Span className="text-[12px] font-semibold text-[#9fb3a4]">Back to sign in</Span>
      </Button>
    </AdminAuthShell>
  );
}
