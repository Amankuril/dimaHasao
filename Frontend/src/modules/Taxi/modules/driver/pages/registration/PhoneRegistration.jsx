/**
 * Step 1 — the phone number, and the only door into the driver app.
 *
 * Mounted at both /taxi/driver/login and /taxi/driver/reg-phone. On the second
 * it resumes a half-finished application rather than starting a new one, which
 * is what makes dropping out mid-onboarding survivable.
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Phone } from 'lucide-react';

import {
  buildDriverOnboardingSessionSnapshot,
  clearDriverRegistrationSession,
  getDriverOnboardingResumeStep,
  getDriverOnboardingSession,
  getStoredDriverRegistrationSession,
  saveDriverRegistrationSession,
  sendDriverOtp,
} from '../../services/registrationService';
import { DRIVER_BRAND_LOGO, logoFallback } from '@/shared/constants/brandLogo';
import AuthLegalLinks from '@/shared/components/auth/AuthLegalLinks';
import usePlatformSettings from '@/shared/hooks/usePlatformSettings';

import './onboarding.css';

const ROUTE_PREFIX = '/taxi/driver';

const errorMessage = (error) =>
  String(error?.message || error?.error || error?.response?.data?.message || '').trim();

export default function PhoneRegistration() {
  const navigate = useNavigate();
  const location = useLocation();
  const brand = usePlatformSettings({ brandName: 'Dima Hasao' });

  const stored = getStoredDriverRegistrationSession();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const referralCode = String(
    searchParams.get('ref') || searchParams.get('referral') || searchParams.get('code') || stored.referralCode || '',
  ).trim().toUpperCase();

  const storedPhone = String(stored.phone || '').replace(/\D/g, '').slice(-10);
  const storedRegistrationId = String(stored.registrationId || '').trim();
  const isLoginPage = location.pathname.replace(/\/$/, '') === `${ROUTE_PREFIX}/login`;

  const [phone, setPhone] = useState(() =>
    String(location.state?.phone || stored.phone || '').replace(/\D/g, '').slice(-10),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Resume, but only on /reg-phone. On /login a driver is deliberately starting
  // over, and silently bouncing them into an old half-application is the bug
  // this guard exists to prevent.
  useEffect(() => {
    let active = true;

    (async () => {
      if (isLoginPage || !storedPhone || !storedRegistrationId) return;

      if (stored.otpVerified) {
        navigate(`${ROUTE_PREFIX}/${getDriverOnboardingResumeStep(stored)}`, { replace: true, state: stored });
        return;
      }

      try {
        const response = await getDriverOnboardingSession({
          registrationId: storedRegistrationId,
          phone: storedPhone,
        });

        if (!active) return;

        const payload = response?.data?.data || response?.data || response;
        const next = saveDriverRegistrationSession(buildDriverOnboardingSessionSnapshot(payload, stored));

        navigate(
          next.otpVerified ? `${ROUTE_PREFIX}/${getDriverOnboardingResumeStep(next)}` : `${ROUTE_PREFIX}/otp-verify`,
          { replace: true, state: next },
        );
      } catch {
        if (active) navigate(`${ROUTE_PREFIX}/otp-verify`, { replace: true, state: stored });
      }
    })();

    return () => {
      active = false;
    };
  }, [isLoginPage, navigate, storedPhone, storedRegistrationId]);

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      setError('Enter all 10 digits of your mobile number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      clearDriverRegistrationSession();

      const response = await sendDriverOtp({ phone });
      const payload = response?.data?.data || response?.data || response;
      const sessionData = payload?.session || {};

      const next = saveDriverRegistrationSession({
        phone,
        role: sessionData.role || 'driver',
        roleConfirmed: true,
        registrationId: sessionData.registrationId || '',
        debugOtp: sessionData.debugOtp || '',
        loginMode: Boolean(payload?.loginMode || sessionData?.loginMode),
        existingAccount: Boolean(payload?.existingAccount || sessionData?.existingAccount),
        entryPath: `${ROUTE_PREFIX}/login`,
        referralCode,
        status: sessionData.status || '',
      });

      navigate(`${ROUTE_PREFIX}/otp-verify`, { state: next });
    } catch (requestError) {
      setError(errorMessage(requestError) || 'Could not send the code. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dh-onboarding flex min-h-dvh flex-col justify-between px-5 pb-8 pt-14 select-none">
      <div className="mx-auto w-full max-w-md">
        <img
          src={DRIVER_BRAND_LOGO}
          onError={logoFallback}
          alt=""
          className="h-16 w-16 rounded-full object-cover"
        />

        <h1 className="mt-6 text-[30px] font-black leading-tight tracking-[-0.02em] text-[var(--dh-text)]">
          Drive with {brand.brandName || 'Dima Hasao'}
        </h1>
        <p className="mt-2 max-w-[32ch] text-[14px] font-medium leading-relaxed text-[var(--dh-muted)]">
          Enter your mobile number. We will send a code to confirm it is you.
        </p>

        <div className="mt-8">
          <span className="dh-label mb-1.5 block px-1">Mobile number</span>
          <span className="dh-field flex items-center gap-3 px-4 py-3.5">
            <Phone size={18} strokeWidth={2.2} className="shrink-0 text-[var(--dh-muted)]" />
            <span className="text-[15px] font-bold text-[var(--dh-muted)]">+91</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric"
              maxLength={10}
              autoFocus
              placeholder="98765 43210"
              className="tracking-[0.08em]"
            />
          </span>
        </div>

        {error && (
          <p role="alert" className="dh-alert mt-4 px-4 py-3">
            {error}
          </p>
        )}
      </div>

      <div className="mx-auto w-full max-w-md space-y-5">
        <button
          type="button"
          onClick={handleSendOtp}
          disabled={phone.length !== 10 || loading}
          className="dh-cta flex h-14 w-full items-center justify-center gap-2 text-[15px]"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send code'}
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
