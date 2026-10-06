import api from './client';

/*
 * Port of the restaurant half of Frontend/src/services/api/auth.js (the
 * shared logout / delete-account / me calls are the same for every role).
 * One OTP surface for every app; the audience says which one is signing in.
 */

const OTP_REQUEST = '/auth/otp/request';
const OTP_VERIFY = '/auth/otp/verify';
const OTP_COMPLETE = '/auth/otp/complete';
const AUDIENCE_USER = 'user';
const AUDIENCE_RESTAURANT = 'restaurant';
const AUDIENCE_PARTNER = 'partner';

const AUTH = {
  LOGOUT: '/food/auth/logout',
  LOGOUT_ALL: '/food/auth/logout-all',
  DELETE_ACCOUNT: '/food/auth/delete-account',
  CHECK_BALANCE: '/food/auth/delete-account/check-balance',
  ME: '/food/auth/me',
  RESTAURANT_REAPPLY: '/food/auth/restaurant/reapply',
};

function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '').slice(-15);
}

const USER_PHONE_LENGTH = 10;

export function requestUserOtp(phone) {
  const digits = normalizePhone(phone);
  if (!digits) return Promise.reject(new Error('Phone number is required'));
  const normalized = digits.length > USER_PHONE_LENGTH ? digits.slice(-USER_PHONE_LENGTH) : digits;
  if (normalized.length !== USER_PHONE_LENGTH) {
    return Promise.reject(new Error('Phone number must be exactly 10 digits'));
  }
  return api.post(OTP_REQUEST, { audience: AUDIENCE_USER, phone: normalized });
}

export function verifyUserOtp(phone, otp, ref, name = null, fcmToken = null, platform = 'mobile', confirmAction = null) {
  const digits = normalizePhone(phone);
  if (!digits) return Promise.reject(new Error('Phone number is required'));
  const normalized = digits.length > USER_PHONE_LENGTH ? digits.slice(-USER_PHONE_LENGTH) : digits;
  if (normalized.length !== USER_PHONE_LENGTH) {
    return Promise.reject(new Error('Phone number must be exactly 10 digits'));
  }
  const otpStr = String(otp ?? '').replace(/\D/g, '').slice(0, 4);
  if (!otpStr) return Promise.reject(new Error('OTP is required'));
  if (otpStr.length !== 4) return Promise.reject(new Error('OTP must be exactly 4 digits'));
  const refValue = typeof ref === 'string' ? ref.trim() : '';
  return api.post(OTP_VERIFY, {
    audience: AUDIENCE_USER,
    phone: normalized,
    otp: otpStr,
    ...(refValue ? { ref: refValue } : {}),
    ...(name ? { name } : {}),
    ...(fcmToken ? { fcmToken, platform } : {}),
    ...(confirmAction ? { confirmAction } : {}),
  });
}

/** Restaurant OTP: same phone format as the user app, 4-digit OTP. */
export function requestRestaurantOtp(phone) {
  const normalized = normalizePhone(phone);
  if (normalized.length < 8) return Promise.reject(new Error('Phone must be at least 8 digits'));
  return api.post(OTP_REQUEST, { audience: AUDIENCE_RESTAURANT, phone: normalized });
}

export function verifyRestaurantOtp(phone, otp, fcmToken = null, platform = 'mobile', confirmAction = null) {
  const normalized = normalizePhone(phone);
  const otpStr = String(otp).replace(/D/g, '').slice(0, 6);
  if (!normalized || otpStr.length < 4) return Promise.reject(new Error('Phone and 4-digit OTP are required'));
  return api.post(OTP_VERIFY, {
    audience: AUDIENCE_RESTAURANT,
    phone: normalized,
    otp: otpStr,
    ...(fcmToken ? { fcmToken, platform } : {}),
    ...(confirmAction ? { confirmAction } : {}),
  });
}

/**
 * Partner OTP: answers for the restaurant and the hotel at once. Verify returns
 * whichever halves the number owns (`restaurant`: access + refresh, `hotel`: a
 * token), or neither plus `nextStep: 'onboarding'` and a signup ticket.
 */
export function requestPartnerOtp(phone) {
  const normalized = normalizePhone(phone);
  if (normalized.length < 8) return Promise.reject(new Error('Phone must be at least 8 digits'));
  return api.post(OTP_REQUEST, { audience: AUDIENCE_PARTNER, phone: normalized });
}

export function verifyPartnerOtp(phone, otp, fcmToken = null, platform = 'mobile') {
  const normalized = normalizePhone(phone);
  const otpStr = String(otp).replace(/D/g, '').slice(0, 6);
  if (!normalized || otpStr.length < 4) return Promise.reject(new Error('Phone and 4-digit OTP are required'));
  return api.post(OTP_VERIFY, {
    audience: AUDIENCE_PARTNER,
    phone: normalized,
    otp: otpStr,
    ...(fcmToken ? { fcmToken, platform } : {}),
  });
}

export function reapplyRestaurant(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return Promise.reject(new Error('Phone number is required'));
  return api.post(AUTH.RESTAURANT_REAPPLY, { phone: normalized });
}

export function completeUserSignup(signupToken, payload = {}) {
  if (!signupToken) {
    return Promise.reject(new Error('Your verification has expired. Please request a new OTP.'));
  }
  return api.post(OTP_COMPLETE, { audience: AUDIENCE_USER, signupToken, ...payload });
}

export function logout(refreshToken, fcmToken = null, platform = 'mobile') {
  if (!refreshToken) return Promise.resolve({ data: { success: true } });
  const payload = { refreshToken };
  if (fcmToken) {
    payload.fcmToken = fcmToken;
    payload.platform = platform;
  }
  clearMeCache();
  return api.post(AUTH.LOGOUT, payload);
}

export function logoutFromAllDevices() {
  clearMeCache();
  return api.post(AUTH.LOGOUT_ALL, {});
}

export function deleteAccount() {
  return api.delete(AUTH.DELETE_ACCOUNT).then((res) => {
    clearMeCache();
    return res;
  });
}

export function checkAccountBalance() {
  return api.get(AUTH.CHECK_BALANCE);
}

// ---- /me: one request in flight, 3 s cache, 10 s back-off after a 429 ----
const ME_CACHE_MS = 3000;
const BACKOFF_MS = 10000;
let meCache = null;
let meInFlight = null;
let meBackoffUntil = 0;

export function clearMeCache() {
  meCache = null;
  meInFlight = null;
}

export function getMe() {
  const now = Date.now();
  if (now < meBackoffUntil) return Promise.reject(new Error('Rate limited. Retrying too soon.'));
  if (meCache && now - meCache.at < ME_CACHE_MS) return Promise.resolve(meCache.res);
  if (meInFlight) return meInFlight;
  meInFlight = api
    .get(AUTH.ME)
    .then((res) => {
      meCache = { at: Date.now(), res };
      return res;
    })
    .catch((err) => {
      if (err?.response?.status === 429) meBackoffUntil = Date.now() + BACKOFF_MS;
      throw err;
    })
    .finally(() => {
      meInFlight = null;
    });
  return meInFlight;
}
