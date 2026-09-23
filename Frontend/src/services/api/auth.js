/**
 * Auth API – new backend (USER, ADMIN, RESTAURANT, DELIVERY).
 * Food-prefixed: POST /food/auth/...
 */

import apiClient from "./axios.js";
import { EMAIL_REGEX } from "@/shared/utils/emailValidation";

// One OTP surface for every app; the audience says which one is signing in.
// apiClient's baseURL is already the platform root, so these resolve to
// /api/v1/auth/otp/* .
const OTP_REQUEST = "/auth/otp/request";
const OTP_VERIFY = "/auth/otp/verify";
const OTP_COMPLETE = "/auth/otp/complete";

export const AUDIENCE = {
  USER: "user",
  RESTAURANT: "restaurant",
  DELIVERY: "delivery",
  // One login for both partner businesses. RESTAURANT stays for the
  // single-app sign-in, which is stricter about approval.
  PARTNER: "partner",
};

const AUTH = {
  ADMIN_LOGIN: "/food/auth/admin/login",
  RESTAURANT_REAPPLY: "/food/auth/restaurant/reapply",
  REFRESH_TOKEN: "/food/auth/refresh-token",
  LOGOUT: "/food/auth/logout",
  LOGOUT_ALL: "/food/auth/logout-all",
  DELETE_ACCOUNT: "/food/auth/delete-account",
  CHECK_BALANCE: "/food/auth/delete-account/check-balance",
  ME: "/food/auth/me",
};

/**
 * Normalize phone to digits only (for backend 8–15 digits).
 * @param {string} phone - e.g. "+91 9876543210" or "9876543210"
 */
function normalizePhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  return digits.slice(-15);
}

/** User phone: exactly 10 digits, numeric only. */
const USER_PHONE_LENGTH = 10;

/**
 * Request OTP for user login.
 * Validation: phone required, numeric only, exactly 10 digits (last 10 if country code included).
 * @param {string} phone - Phone (with or without country code, e.g. "+91 9876543210")
 * @returns {Promise<{ data }>}
 */
export function requestUserOtp(phone) {
  const digits = normalizePhone(phone);
  if (!digits) {
    return Promise.reject(new Error("Phone number is required"));
  }
  if (!/^\d+$/.test(digits)) {
    return Promise.reject(new Error("Phone must contain only digits"));
  }
  const normalized =
    digits.length > USER_PHONE_LENGTH
      ? digits.slice(-USER_PHONE_LENGTH)
      : digits;
  if (normalized.length !== USER_PHONE_LENGTH) {
    return Promise.reject(new Error("Phone number must be exactly 10 digits"));
  }
  return apiClient.post(OTP_REQUEST, { audience: AUDIENCE.USER, phone: normalized });
}

/**
 * Verify OTP and login (user).
 * Validation: phone 10 digits, OTP required, exactly 4 digits numeric.
 * Backend returns { accessToken, refreshToken, user }.
 * @param {string} phone - Same format as request
 * @param {string} otp - 4-digit OTP only
 */
export function verifyUserOtp(
  phone,
  otp,
  ref,
  name = null,
  fcmToken = null,
  platform = "web",
  confirmAction = null,
) {
  const digits = normalizePhone(phone);
  if (!digits) {
    return Promise.reject(new Error("Phone number is required"));
  }
  const normalized =
    digits.length > USER_PHONE_LENGTH
      ? digits.slice(-USER_PHONE_LENGTH)
      : digits;
  if (normalized.length !== USER_PHONE_LENGTH) {
    return Promise.reject(new Error("Phone number must be exactly 10 digits"));
  }
  const otpStr = String(otp ?? "")
    .replace(/\D/g, "")
    .slice(0, 4);
  if (!otpStr) {
    return Promise.reject(new Error("OTP is required"));
  }
  if (otpStr.length !== 4) {
    return Promise.reject(new Error("OTP must be exactly 4 digits"));
  }
  const refValue = typeof ref === "string" ? ref.trim() : "";
  return apiClient.post(OTP_VERIFY, {
    audience: AUDIENCE.USER,
    phone: normalized,
    otp: otpStr,
    ...(refValue ? { ref: refValue } : {}),
    ...(name ? { name } : {}),
    ...(fcmToken ? { fcmToken, platform } : {}),
    ...(confirmAction ? { confirmAction } : {}),
  });
}

/**
 * Finish a user signup that verify answered with `collect_name`.
 * @param {string} signupToken - From the verify response.
 * @param {{name: string, ref?: string}} payload
 */
export function completeUserSignup(signupToken, payload = {}) {
  if (!signupToken) {
    return Promise.reject(new Error("Your verification has expired. Please request a new OTP."));
  }
  return apiClient.post(OTP_COMPLETE, {
    audience: AUDIENCE.USER,
    signupToken,
    ...payload,
  });
}

/**
 * Admin login (email + password).
 * Validation: email required and valid format, password required and min 6 characters.
 * Backend returns { accessToken, refreshToken, user } (key is "user" not "admin").
 */
export function adminLogin(email, password) {
  const trimmedEmail = typeof email === "string" ? email.trim() : "";
  if (!trimmedEmail) {
    return Promise.reject(new Error("Email is required"));
  }
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return Promise.reject(new Error("Please enter a valid email address"));
  }
  const passwordStr = String(password ?? "");
  if (!passwordStr) {
    return Promise.reject(new Error("Password is required"));
  }
  if (passwordStr.length < 6) {
    return Promise.reject(new Error("Password must be at least 6 characters"));
  }
  return apiClient.post(AUTH.ADMIN_LOGIN, {
    email: trimmedEmail,
    password: passwordStr,
  });
}

/**
 * Refresh access token.
 * @param {string} refreshToken
 * @returns {Promise<{ data }>} data.accessToken
 */
export function refreshToken(refreshToken) {
  if (!refreshToken)
    return Promise.reject(new Error("Refresh token is required"));
  return apiClient.post(AUTH.REFRESH_TOKEN, { refreshToken });
}

/**
 * Logout (invalidate refresh token).
 * @param {string} refreshToken
 * @param {string} fcmToken
 * @param {string} platform
 */
export function logout(refreshToken, fcmToken = null, platform = "web") {
  if (!refreshToken) return Promise.resolve({ data: { success: true } });

  const payload = { refreshToken };
  if (fcmToken) {
    payload.fcmToken = fcmToken;
    payload.platform = platform;
  }

  clearMeCache();
  return apiClient.post(AUTH.LOGOUT, payload);
}

/**
 * Logout from all devices (invalidates all refresh tokens and FCM tokens for the user).
 * @param {string} [module] - "user" | "admin" | "restaurant" | "delivery"
 */
export function logoutFromAllDevices(module = "user") {
  const m = String(module || "user");
  clearMeCache();
  return apiClient.post(AUTH.LOGOUT_ALL, {}, { contextModule: m });
}

/**
 * Delete account (invalidate and destroy everything).
 * @param {string} [module] - "user" | "admin" | "restaurant" | "delivery"
 */
export function deleteAccount(module = "user") {
  const m = String(module || "user");
  return apiClient.delete(AUTH.DELETE_ACCOUNT, { contextModule: m }).then((res) => {
    meCache.delete(m);
    meInFlight.delete(m);
  });
}

/**
 * Check account balance before deletion.
 * @param {string} [module] - "user" | "restaurant" | "delivery"
 * @returns {Promise<{ data: { success: boolean, balance: number, type: string } }>}
 */
export function checkAccountBalance(module = "user") {
  const m = String(module || "user");
  return apiClient.get(AUTH.CHECK_BALANCE, { contextModule: m });
}

/** 
 * Clear all local /me caches (resets on logout or new login) 
 */
export function clearMeCache() {
  meCache.clear();
  meInFlight.clear();
}

/**
 * Get current profile (requires Bearer).
 * @param {string} [module] - "user" | "admin" | "restaurant" | "delivery" (which token to send; default "user")
 */
export function getMe(module = "user") {
  const m = String(module || "user");
  // Deduplicate /me calls to avoid request storms (and accidental 429s)
  // across multiple components mounting at once.
  return getMeOnce(m);
}

// ---- /me in-flight + short cache (per module) ----
const ME_CACHE_MS = 3000;
const meCache = new Map(); // module -> { at, res }
const meInFlight = new Map(); // module -> Promise

function hasAccessToken(module) {
  try {
    return Boolean(localStorage.getItem(`${module}_accessToken`));
  } catch {
    return false;
  }
}

// module -> { at, backoffUntil }
const meBackoff = new Map();
const BACKOFF_MS = 10000; // 10s wait on 429

function getMeOnce(module) {
  const now = Date.now();
  
  // 1. Check Backoff (e.g. from previous 429)
  const backoff = meBackoff.get(module);
  if (backoff && now < backoff) {
    return Promise.reject(new Error("Rate limited. Retrying too soon."));
  }

  // 2. Check Cache
  const cached = meCache.get(module);
  if (cached && now - cached.at < ME_CACHE_MS) {
    return Promise.resolve(cached.res);
  }

  // 3. Check Auth Status
  if (!hasAccessToken(module)) {
    return Promise.reject(new Error("Not authenticated"));
  }

  // 4. Return In-Flight Promise
  const existing = meInFlight.get(module);
  if (existing) return existing;

  const p = apiClient
    .get(AUTH.ME, { contextModule: module })
    .then((res) => {
      meCache.set(module, { at: Date.now(), res });
      return res;
    })
    .catch((err) => {
      if (err?.response?.status === 429) {
        meBackoff.set(module, Date.now() + BACKOFF_MS);
      }
      throw err;
    })
    .finally(() => {
      meInFlight.delete(module);
    });

  meInFlight.set(module, p);
  return p;
}

/**
 * Restaurant OTP auth (backend: same phone format as user, 4-digit OTP e.g. 1234).
 */
export function requestRestaurantOtp(phone) {
  const normalized = normalizePhone(phone);
  if (normalized.length < 8) {
    return Promise.reject(new Error("Phone must be at least 8 digits"));
  }
  return apiClient.post(OTP_REQUEST, { audience: AUDIENCE.RESTAURANT, phone: normalized });
}

export function verifyRestaurantOtp(phone, otp, fcmToken = null, platform = "web", confirmAction = null) {
  const normalized = normalizePhone(phone);
  const otpStr = String(otp).replace(/\D/g, "").slice(0, 6);
  if (!normalized || otpStr.length < 4) {
    return Promise.reject(new Error("Phone and 4-digit OTP are required"));
  }
  return apiClient.post(OTP_VERIFY, {
    audience: AUDIENCE.RESTAURANT,
    phone: normalized,
    otp: otpStr,
    ...(fcmToken ? { fcmToken, platform } : {}),
    ...(confirmAction ? { confirmAction } : {}),
  });
}

/**
 * Partner OTP auth — answers for the restaurant and the hotel at once.
 *
 * Verify returns whichever halves the number owns: `restaurant` (access +
 * refresh), `hotel` (a 30-day token), or neither plus `nextStep: 'onboarding'`
 * and a signup ticket, which is what puts the business chooser on screen.
 */
export function requestPartnerOtp(phone) {
  const normalized = normalizePhone(phone);
  if (normalized.length < 8) {
    return Promise.reject(new Error("Phone must be at least 8 digits"));
  }
  return apiClient.post(OTP_REQUEST, { audience: AUDIENCE.PARTNER, phone: normalized });
}

export function verifyPartnerOtp(phone, otp, fcmToken = null, platform = "web") {
  const normalized = normalizePhone(phone);
  const otpStr = String(otp).replace(/\D/g, "").slice(0, 6);
  if (!normalized || otpStr.length < 4) {
    return Promise.reject(new Error("Phone and 4-digit OTP are required"));
  }
  return apiClient.post(OTP_VERIFY, {
    audience: AUDIENCE.PARTNER,
    phone: normalized,
    otp: otpStr,
    ...(fcmToken ? { fcmToken, platform } : {}),
  });
}

/**
 * Finish a brand-new partner signup with the ticket handed out by verify.
 *
 * Only the hotel half can be created this way — a restaurant is built by its
 * own onboarding wizard. An existing partner adding a second business uses
 * POST /partner/profiles/hotel instead, because the ticket expires in ten
 * minutes and onboarding takes longer than that.
 */
export function completePartnerSignup(signupToken, { name, email } = {}) {
  if (!signupToken) {
    return Promise.reject(new Error("Signup session expired. Please sign in again."));
  }
  return apiClient.post(OTP_COMPLETE, {
    audience: AUDIENCE.PARTNER,
    signupToken,
    name,
    ...(email ? { email } : {}),
  });
}

export function reapplyRestaurant(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return Promise.reject(new Error("Phone number is required"));
  }
  return apiClient.post(AUTH.RESTAURANT_REAPPLY, { phone: normalized });
}

/**
 * Delivery partner OTP auth (backend: same phone + 4-digit OTP).
 */
export function requestDeliveryOtp(phone) {
  const normalized = normalizePhone(phone);
  if (normalized.length < 8) {
    return Promise.reject(new Error("Phone must be at least 8 digits"));
  }
  return apiClient.post(OTP_REQUEST, { audience: AUDIENCE.DELIVERY, phone: normalized });
}

export function verifyDeliveryOtp(phone, otp, fcmToken = null, platform = "web", confirmAction = null) {
  const normalized = normalizePhone(phone);
  const otpStr = String(otp).replace(/\D/g, "").slice(0, 6);
  if (!normalized || otpStr.length < 4) {
    return Promise.reject(new Error("Phone and 4-digit OTP are required"));
  }
  return apiClient.post(OTP_VERIFY, {
    audience: AUDIENCE.DELIVERY,
    phone: normalized,
    otp: otpStr,
    ...(fcmToken ? { fcmToken, platform } : {}),
    ...(confirmAction ? { confirmAction } : {}),
  });
}
