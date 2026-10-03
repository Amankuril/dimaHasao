/**
 * User-app auth API — ported from Frontend/src/services/api/auth.js, trimmed
 * to the User-app surface (OTP login/signup, logout, account deletion, /me).
 * The admin/restaurant/delivery/partner OTP helpers stay in the web app and
 * in their own future RN apps.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './axios';

const OTP_REQUEST = '/auth/otp/request';
const OTP_VERIFY = '/auth/otp/verify';
const OTP_COMPLETE = '/auth/otp/complete';

export const AUDIENCE = {USER: 'user'};

const AUTH = {
  REFRESH_TOKEN: '/food/auth/refresh-token',
  LOGOUT: '/food/auth/logout',
  LOGOUT_ALL: '/food/auth/logout-all',
  DELETE_ACCOUNT: '/food/auth/delete-account',
  CHECK_BALANCE: '/food/auth/delete-account/check-balance',
  ME: '/food/auth/me',
};

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.slice(-15);
}

const USER_PHONE_LENGTH = 10;

export function requestUserOtp(phone) {
  const digits = normalizePhone(phone);
  if (!digits) return Promise.reject(new Error('Phone number is required'));
  if (!/^\d+$/.test(digits)) return Promise.reject(new Error('Phone must contain only digits'));
  const normalized = digits.length > USER_PHONE_LENGTH ? digits.slice(-USER_PHONE_LENGTH) : digits;
  if (normalized.length !== USER_PHONE_LENGTH) {
    return Promise.reject(new Error('Phone number must be exactly 10 digits'));
  }
  return apiClient.post(OTP_REQUEST, {audience: AUDIENCE.USER, phone: normalized});
}

export function verifyUserOtp(phone, otp, ref, name = null, fcmToken = null, platform = 'android') {
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
  return apiClient.post(OTP_VERIFY, {
    audience: AUDIENCE.USER,
    phone: normalized,
    otp: otpStr,
    ...(refValue ? {ref: refValue} : {}),
    ...(name ? {name} : {}),
    ...(fcmToken ? {fcmToken, platform} : {}),
  });
}

export function completeUserSignup(signupToken, payload = {}) {
  if (!signupToken) {
    return Promise.reject(new Error('Your verification has expired. Please request a new OTP.'));
  }
  return apiClient.post(OTP_COMPLETE, {audience: AUDIENCE.USER, signupToken, ...payload});
}

export function refreshToken(token) {
  if (!token) return Promise.reject(new Error('Refresh token is required'));
  return apiClient.post(AUTH.REFRESH_TOKEN, {refreshToken: token});
}

export function logout(token, fcmToken = null, platform = 'android') {
  if (!token) return Promise.resolve({data: {success: true}});
  const payload = {refreshToken: token};
  if (fcmToken) {
    payload.fcmToken = fcmToken;
    payload.platform = platform;
  }
  clearMeCache();
  return apiClient.post(AUTH.LOGOUT, payload);
}

export function logoutFromAllDevices() {
  clearMeCache();
  return apiClient.post(AUTH.LOGOUT_ALL, {}, {contextModule: 'user'});
}

export function deleteAccount() {
  return apiClient.delete(AUTH.DELETE_ACCOUNT, {contextModule: 'user'}).then(res => {
    meCache.delete('user');
    meInFlight.delete('user');
    return res;
  });
}

export function checkAccountBalance() {
  return apiClient.get(AUTH.CHECK_BALANCE, {contextModule: 'user'});
}

export function clearMeCache() {
  meCache.clear();
  meInFlight.clear();
}

// ---- /me in-flight + short cache, same dedup strategy as the web client ----
const ME_CACHE_MS = 3000;
const meCache = new Map();
const meInFlight = new Map();
const meBackoff = new Map();
const BACKOFF_MS = 10000;

export function getMe() {
  return getMeOnce('user');
}

async function hasAccessToken(module) {
  try {
    return Boolean(await AsyncStorage.getItem(`${module}_accessToken`));
  } catch {
    return false;
  }
}

function getMeOnce(module) {
  const now = Date.now();

  const backoff = meBackoff.get(module);
  if (backoff && now < backoff) {
    return Promise.reject(new Error('Rate limited. Retrying too soon.'));
  }

  const cached = meCache.get(module);
  if (cached && now - cached.at < ME_CACHE_MS) {
    return Promise.resolve(cached.res);
  }

  const existing = meInFlight.get(module);
  if (existing) return existing;

  const p = hasAccessToken(module).then(hasToken => {
    if (!hasToken) throw new Error('Not authenticated');
    return apiClient
      .get(AUTH.ME, {contextModule: module})
      .then(res => {
        meCache.set(module, {at: Date.now(), res});
        return res;
      })
      .catch(err => {
        if (err?.response?.status === 429) {
          meBackoff.set(module, Date.now() + BACKOFF_MS);
        }
        throw err;
      });
  });

  const tracked = p.finally(() => meInFlight.delete(module));
  meInFlight.set(module, tracked);
  return tracked;
}
