import api from './client';
import { EMAIL_REGEX } from '../lib/emailValidation';

/*
 * The admin slice of Frontend/src/services/api/auth.js: email + password
 * sign-in, /me, refresh and logout.
 */

const AUTH = {
  ADMIN_LOGIN: '/food/auth/admin/login',
  REFRESH_TOKEN: '/food/auth/refresh-token',
  LOGOUT: '/food/auth/logout',
  LOGOUT_ALL: '/food/auth/logout-all',
  ME: '/food/auth/me',
};

/** Validation as on the web: email required and valid, password required and at least 6 characters. */
export function adminLogin(email, password) {
  const trimmedEmail = typeof email === 'string' ? email.trim() : '';
  if (!trimmedEmail) return Promise.reject(new Error('Email is required'));
  if (!EMAIL_REGEX.test(trimmedEmail)) return Promise.reject(new Error('Please enter a valid email address'));
  const passwordStr = String(password ?? '');
  if (!passwordStr) return Promise.reject(new Error('Password is required'));
  if (passwordStr.length < 6) return Promise.reject(new Error('Password must be at least 6 characters'));
  return api.post(AUTH.ADMIN_LOGIN, { email: trimmedEmail, password: passwordStr }, { auth: false });
}

export function refreshToken(token) {
  if (!token) return Promise.reject(new Error('Refresh token is required'));
  return api.post(AUTH.REFRESH_TOKEN, { refreshToken: token }, { auth: false });
}

/** Invalidates the refresh token on the server. */
export function logout(token, fcmToken = null, platform = 'mobile') {
  clearMeCache();
  if (!token) return Promise.resolve({ data: { success: true } });
  const payload = { refreshToken: token };
  if (fcmToken) {
    payload.fcmToken = fcmToken;
    payload.platform = platform;
  }
  return api.post(AUTH.LOGOUT, payload);
}

export function logoutFromAllDevices() {
  clearMeCache();
  return api.post(AUTH.LOGOUT_ALL, {});
}

/* /me, de-duplicated for 3 s as on the web (several panels ask at mount). */
const ME_CACHE_MS = 3000;
let meCache = null;
let meInFlight = null;

export function getMe() {
  if (meCache && Date.now() - meCache.at < ME_CACHE_MS) return Promise.resolve(meCache.res);
  if (meInFlight) return meInFlight;
  meInFlight = api
    .get(AUTH.ME)
    .then((res) => {
      meCache = { at: Date.now(), res };
      return res;
    })
    .finally(() => {
      meInFlight = null;
    });
  return meInFlight;
}

export function clearMeCache() {
  meCache = null;
  meInFlight = null;
}
