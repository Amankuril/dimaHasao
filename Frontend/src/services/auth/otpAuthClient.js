/**
 * The single frontend client for the unified OTP auth surface.
 *
 * Every app authenticates through these two calls — the consumer super-app
 * (food + taxi + hotel + tours on one account) and the four partner apps.
 *
 * It deliberately does NOT reuse a module's axios instance: those are scoped to
 * `/api/v1/taxi` and `/api/v1/hotel`, while auth lives at the platform root.
 * One client, one surface.
 */
import axios from 'axios';

/** Mirrors the resolution in services/api/axios.js. */
const baseURL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')
    : '/api/v1';

const authClient = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

/** The apps that can sign in. Must match the backend audience registry. */
export const AUDIENCE = {
  USER: 'user',
  RESTAURANT: 'restaurant',
  DELIVERY: 'delivery',
  TAXI_DRIVER: 'taxi-driver',
  HOTEL_PARTNER: 'hotel-partner',
};

/** What to do once a code is verified — the vocabulary shared by all apps. */
export const NEXT_STEP = {
  AUTHENTICATED: 'authenticated',
  COLLECT_NAME: 'collect_name',
  ONBOARDING: 'onboarding',
};

/** Digits only, last 10 — accepts "+91 98765 43210" and friends. */
export const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);

const unwrap = (res) => res?.data?.data ?? res?.data ?? {};

/**
 * Request an OTP.
 * @returns {Promise<{phone, audience, isRegistered, nextStepIfVerified, otp?}>}
 *   `otp` is only present on dev/staging backends.
 */
export const requestOtp = async (audience, phone, extra = {}) => {
  const digits = normalizePhone(phone);

  if (digits.length !== 10) {
    throw new Error('Phone number must be exactly 10 digits');
  }

  return unwrap(await authClient.post('/auth/otp/request', { audience, phone: digits, ...extra }));
};

/**
 * Verify an OTP.
 * @returns {Promise<{verified, isRegistered, nextStep, ...session}>}
 *   `nextStep` is `authenticated` (tokens included), `collect_name`, or
 *   `onboarding`.
 */
export const verifyOtp = async (audience, phone, otp, payload = {}) => {
  const digits = normalizePhone(phone);
  const code = String(otp || '').replace(/\D/g, '');

  if (!code) {
    throw new Error('Please enter the OTP');
  }

  return unwrap(
    await authClient.post('/auth/otp/verify', { audience, phone: digits, otp: code, ...payload }),
  );
};

export default { requestOtp, verifyOtp, AUDIENCE, NEXT_STEP, normalizePhone };
