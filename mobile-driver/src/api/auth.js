import api from './client';

/*
 * Port of Frontend/src/services/auth/otpAuthClient.js: the single OTP surface for every app, at the
 * platform root (/api/v1/auth/otp/*), not the taxi router. The driver app signs in with the
 * "taxi-driver" audience. These calls carry no token.
 */

export const AUDIENCE = {
  USER: 'user',
  RESTAURANT: 'restaurant',
  DELIVERY: 'delivery',
  TAXI_DRIVER: 'taxi-driver',
  HOTEL_PARTNER: 'hotel-partner',
};

/** What to do once a code is verified. */
export const NEXT_STEP = {
  AUTHENTICATED: 'authenticated',
  COLLECT_NAME: 'collect_name',
  ONBOARDING: 'onboarding',
};

/** Digits only, last 10 — accepts "+91 98765 43210" and friends. */
export const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);

const unwrap = (res) => res?.data?.data ?? res?.data ?? {};

/** @returns {Promise<{phone, audience, isRegistered, nextStepIfVerified, otp?}>} */
export const requestOtp = async (audience, phone, extra = {}) => {
  const digits = normalizePhone(phone);
  if (digits.length !== 10) throw new Error('Phone number must be exactly 10 digits');
  return unwrap(await api.post('/auth/otp/request', { audience, phone: digits, ...extra }, { auth: false }));
};

/** @returns {Promise<{verified, isRegistered, nextStep, ...session}>} */
export const verifyOtp = async (audience, phone, otp, payload = {}) => {
  const digits = normalizePhone(phone);
  const code = String(otp || '').replace(/\D/g, '');
  if (!code) throw new Error('Please enter the OTP');
  return unwrap(await api.post('/auth/otp/verify', { audience, phone: digits, otp: code, ...payload }, { auth: false }));
};

/** Finishes a signup that verify answered with collect_name / onboarding. */
export const completeSignup = async (audience, signupToken, payload = {}) => {
  if (!signupToken) throw new Error('Your verification has expired. Please request a new OTP.');
  return unwrap(await api.post('/auth/otp/complete', { audience, signupToken, ...payload }, { auth: false }));
};

export default { requestOtp, verifyOtp, completeSignup, AUDIENCE, NEXT_STEP, normalizePhone };
