/**
 * Step 2 — the code.
 *
 * Serves both doors: a returning driver signing in, and a new one partway
 * through onboarding. The branch is `session.loginMode`, set when the code was
 * requested, because only the server knows whether that number already has an
 * account.
 *
 * The role picker that used to sit here is gone — a phone number resolves to a
 * driver now, and there is nothing to choose between.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, MessageSquare } from 'lucide-react';

import {
  buildDriverOnboardingSessionSnapshot,
  clearDriverRegistrationSession,
  getDriverOnboardingResumeStep,
  getStoredDriverRegistrationSession,
  persistDriverAuthSession,
  saveDriverRegistrationSession,
  sendDriverLoginOtp,
  sendDriverOtp,
  verifyDriverLoginOtp,
  verifyDriverOtp,
} from '../../services/registrationService';
import AuthLegalLinks from '@/shared/components/auth/AuthLegalLinks';

import './onboarding.css';

const ROUTE_PREFIX = '/taxi/driver';
const OTP_LENGTH = 4;
const RESEND_SECONDS = 60;

const unwrap = (response) => response?.data?.data || response?.data || response;

const isDriverApproved = (driver) => {
  if (!driver) return false;
  const approval = String(driver.approve ?? '').toLowerCase();
  const status = String(driver.status || '').toLowerCase();
  return (
    driver.approve === true ||
    driver.approve === 1 ||
    ['true', '1', 'yes', 'approved'].includes(approval) ||
    ['approved', 'active', 'verified'].includes(status)
  );
};

const syncPushTokens = async () => {
  await Promise.allSettled([
    window.__flushNativeFcmToken?.(),
    window.__registerBrowserFcmToken?.({ interactive: true }),
  ]);
};

export default function OTPVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const inputs = useRef([]);

  const session = { ...getStoredDriverRegistrationSession(), ...(location.state || {}) };
  const phone = String(session.phone || '').replace(/\D/g, '').slice(-10);
  const registrationId = String(session.registrationId || '').trim();
  const isLoginFlow = Boolean(session.loginMode);
  const entryPath = String(session.entryPath || (isLoginFlow ? `${ROUTE_PREFIX}/login` : `${ROUTE_PREFIX}/reg-phone`));

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!phone) navigate(entryPath, { replace: true });
  }, [entryPath, navigate, phone]);

  // A driver who already verified and came back should land where they stopped,
  // not be asked for the same code twice.
  useEffect(() => {
    if (isLoginFlow || !phone || !registrationId || !session.otpVerified) return;
    navigate(`${ROUTE_PREFIX}/${getDriverOnboardingResumeStep(session)}`, {
      replace: true,
      state: saveDriverRegistrationSession(session),
    });
  }, [isLoginFlow, navigate, phone, registrationId, session.otpVerified]);

  useEffect(() => {
    if (timer <= 0) return undefined;
    const id = window.setInterval(() => setTimer((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [timer]);

  useEffect(() => {
    const id = window.setTimeout(() => inputs.current[0]?.focus(), 250);
    return () => window.clearTimeout(id);
  }, []);

  const handleVerify = async (override) => {
    const code = override || digits.join('');

    if (code.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code.`);
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (isLoginFlow) {
        const payload = unwrap(await verifyDriverLoginOtp({ phone, otp: code }));

        if (payload?.token) {
          persistDriverAuthSession({ token: payload.token, role: 'driver' });
          await syncPushTokens();
        }

        clearDriverRegistrationSession();
        navigate(
          isDriverApproved(payload?.driver) ? '/taxi/driver/home' : `${ROUTE_PREFIX}/registration-status`,
          { replace: true },
        );
        return;
      }

      const payload = unwrap(await verifyDriverOtp({ registrationId, phone, otp: code }));

      saveDriverRegistrationSession({
        ...session,
        otpVerified: true,
        role: 'driver',
        roleConfirmed: true,
        status: payload?.session?.status || 'otp_verified',
        otpSession: payload?.session || null,
      });

      navigate(`${ROUTE_PREFIX}/step-personal`);
    } catch (verifyError) {
      setError(verifyError?.message || 'That code did not match. Please try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);

    if (value && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
    if (next.join('').length === OTP_LENGTH) handleVerify(next.join(''));
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
  };

  const handlePaste = (event) => {
    const pasted = String(event.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((digit, index) => { next[index] = digit; });
    setDigits(next);
    if (pasted.length === OTP_LENGTH) handleVerify(pasted);
  };

  const handleResend = async () => {
    if (timer > 0) return;

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const response = isLoginFlow
        ? await sendDriverLoginOtp({ phone })
        : await sendDriverOtp({ phone });

      const next = isLoginFlow
        ? saveDriverRegistrationSession({ ...session, phone, loginMode: true, entryPath })
        : saveDriverRegistrationSession(
            buildDriverOnboardingSessionSnapshot(unwrap(response), { ...session, phone, entryPath }),
          );

      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
      setTimer(RESEND_SECONDS);
      setNotice(next?.debugOtp ? `Code sent. Test code: ${next.debugOtp}` : 'A new code is on its way.');
    } catch (resendError) {
      setError(resendError?.message || 'Could not resend the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dh-onboarding flex min-h-dvh flex-col justify-between px-5 pb-8 pt-14 select-none">
      <div className="mx-auto w-full max-w-md">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--dh-primary-soft)] text-[var(--dh-primary)]">
          <MessageSquare size={24} strokeWidth={2.2} />
        </span>

        <h1 className="mt-6 text-[30px] font-black leading-tight tracking-[-0.02em] text-[var(--dh-text)]">
          Enter the code
        </h1>
        <p className="mt-2 text-[14px] font-medium text-[var(--dh-muted)]">
          Sent to <span className="font-bold text-[var(--dh-text)]">+91 {phone}</span>{' '}
          <button type="button" onClick={() => navigate(entryPath)} className="dh-ghost">
            Change
          </button>
        </p>

        <div className="mt-8 grid grid-cols-4 gap-3" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => { inputs.current[index] = element; }}
              value={digit}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              inputMode="numeric"
              maxLength={1}
              aria-label={`Digit ${index + 1}`}
              className="dh-field h-16 w-full min-w-0 text-center text-[24px] font-black text-[var(--dh-text)] outline-none"
            />
          ))}
        </div>

        {error && <p role="alert" className="dh-alert mt-4 px-4 py-3">{error}</p>}

        {notice && !error && (
          <p className="mt-4 rounded-[14px] border border-[var(--dh-primary)]/20 bg-[var(--dh-primary-soft)] px-4 py-3 text-[13px] font-semibold text-[var(--dh-primary)]">
            {notice}
          </p>
        )}

        <div className="mt-5 text-center text-[13px] font-semibold text-[var(--dh-muted)]">
          {timer > 0 ? (
            <span>Resend in {timer}s</span>
          ) : (
            <button type="button" onClick={handleResend} className="dh-ghost">
              Resend code
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-md space-y-5">
        <button
          type="button"
          onClick={() => handleVerify()}
          disabled={digits.join('').length !== OTP_LENGTH || loading}
          className="dh-cta flex h-14 w-full items-center justify-center gap-2 text-[15px]"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify'}
        </button>

        <AuthLegalLinks
          module="taxi"
          className="text-center text-[12px] font-semibold text-[var(--dh-muted)]"
          linkClassName="hover:text-[var(--dh-primary)]"
        />
      </div>
    </div>
  );
}
