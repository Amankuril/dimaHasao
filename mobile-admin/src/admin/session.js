/*
 * The admin session as the web keeps it, ported from
 * Frontend/src/shared/utils/moduleAuth.js (which Food/utils/auth.js re-exports)
 * and Frontend/src/modules/Taxi/modules/admin/services/adminSession.js.
 *
 * Everything reads and writes the same localStorage keys the web uses
 * (`admin_accessToken`, `admin_user`, the Taxi bridge's `adminToken` /
 * `adminInfo`). localStorage here is lib/storage's synchronous store; token
 * keys in it are routed to SecureStore by context/AuthContext.
 */
import { localStore as localStorage, sessionStore as sessionStorage } from '../lib/storage';

const atobSafe = (b64) => {
  if (typeof atob === 'function') return atob(b64);
  throw new Error('atob unavailable');
};

export function decodeToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(atobSafe(padded));
  } catch {
    return null;
  }
}

export function getRoleFromToken(token) {
  return decodeToken(token)?.role || null;
}

export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;
  return decoded.exp * 1000 <= Date.now();
}

export function getUserIdFromToken(token) {
  const d = decodeToken(token);
  return d?.userId || d?.id || d?._id || d?.sub || null;
}

export function getModuleToken(module) {
  return localStorage.getItem(`${module}_accessToken`);
}

export function getModuleRefreshToken(module) {
  return localStorage.getItem(`${module}_refreshToken`);
}

export function getCurrentUserRole(module = null) {
  if (module) {
    const userStr = localStorage.getItem(`${module}_user`);
    if (userStr) {
      try {
        return JSON.parse(userStr).role || module;
      } catch {
        return module;
      }
    }
  }
  return module || 'user';
}

export function getCurrentUser(module) {
  if (!module) return null;
  const userStr = localStorage.getItem(`${module}_user`);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/*
 * The web checks for a present, unexpired access token. Here an expired one
 * still counts while a refresh token can renew it (the API client refreshes on
 * the first 401), so the admin stays signed in across app restarts.
 */
export function isModuleAuthenticated(module) {
  const token = getModuleToken(module);
  if (!token) return false;
  return !isTokenExpired(token) || Boolean(getModuleRefreshToken(module));
}

export function clearModuleAuth(module) {
  localStorage.removeItem(`${module}_accessToken`);
  localStorage.removeItem(`${module}_refreshToken`);
  localStorage.removeItem(`${module}_authenticated`);
  localStorage.removeItem(`${module}_user`);
  localStorage.removeItem(`fcm_web_registered_token_${module}`);
  sessionStorage.removeItem(`${module}AuthData`);
}

export function clearAuthData() {
  ['admin', 'restaurant', 'delivery', 'user'].forEach(clearModuleAuth);
}

export function setAuthData(module, token, user, refreshToken = null) {
  if (!module || !token) throw new Error(`Invalid parameters: module=${module}, token=${!!token}`);
  localStorage.setItem(`${module}_accessToken`, token);
  if (refreshToken && typeof refreshToken === 'string') localStorage.setItem(`${module}_refreshToken`, refreshToken);
  localStorage.setItem(`${module}_authenticated`, 'true');
  if (user) localStorage.setItem(`${module}_user`, JSON.stringify(user));
}

export function patchStoredUser(module, patch) {
  if (!module || !patch || typeof patch !== 'object') return;
  try {
    const key = `${module}_user`;
    const current = JSON.parse(localStorage.getItem(key) || '{}');
    localStorage.setItem(key, JSON.stringify({ ...current, ...patch }));
  } catch {
    // The cached copy is only a convenience.
  }
}

/* ---- Taxi/modules/admin/services/adminSession.js ---- */

const ADMIN_ACCESS_TOKEN_KEY = 'admin_accessToken';
const ADMIN_REFRESH_TOKEN_KEY = 'admin_refreshToken';
const ADMIN_USER_KEY = 'admin_user';
const LEGACY_ADMIN_TOKEN_KEY = 'adminToken';
const LEGACY_ADMIN_INFO_KEY = 'adminInfo';

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const normalizeAdminProfile = (profile = {}) => {
  const source = profile && typeof profile === 'object' ? profile : {};
  const adminLevel = String(source.adminLevel || source.admin_level || '').trim().toLowerCase();
  const adminType = String(source.admin_type || source.role || 'superadmin').toLowerCase() === 'subadmin' ? 'subadmin' : 'superadmin';
  const permissions = Array.isArray(source.permissions) ? [...new Set(source.permissions.map((item) => String(item || '').trim()).filter(Boolean))] : [];
  const isSuperLike = adminLevel === 'platform_superadmin' || adminLevel === 'food_superadmin' || adminLevel === 'taxi_superadmin' || adminType === 'superadmin';
  return {
    ...source,
    adminLevel: adminLevel || (adminType === 'subadmin' ? 'subadmin' : 'taxi_superadmin'),
    module: source.module || null,
    parentAdminId: source.parentAdminId ? String(source.parentAdminId) : null,
    admin_type: adminType,
    role: String(source.role || adminType).trim() || adminType,
    permissions: isSuperLike ? (permissions.includes('*') ? permissions : ['*', ...permissions]) : permissions,
    service_location_ids: Array.isArray(source.service_location_ids) ? source.service_location_ids : [],
    zone_ids: Array.isArray(source.zone_ids) ? source.zone_ids : [],
    food_zone_ids: Array.isArray(source.food_zone_ids) ? source.food_zone_ids : [],
    servicesAccess: Array.isArray(source.servicesAccess) ? source.servicesAccess : [],
  };
};

export const getUnifiedAdminToken = () => localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_ADMIN_TOKEN_KEY) || null;

export const getUnifiedAdminProfile = () => {
  const unified = safeParse(localStorage.getItem(ADMIN_USER_KEY) || 'null');
  if (unified) return normalizeAdminProfile(unified);
  const legacy = safeParse(localStorage.getItem(LEGACY_ADMIN_INFO_KEY) || 'null');
  return normalizeAdminProfile(legacy || {});
};

export const isUnifiedAdminAuthenticated = () => isModuleAuthenticated('admin');

export const syncAdminSessionBridge = () => {
  const token = getUnifiedAdminToken();
  if (!token || !isUnifiedAdminAuthenticated()) return { token: null, user: null, isAuthenticated: false };
  const user = getUnifiedAdminProfile();
  localStorage.setItem(LEGACY_ADMIN_TOKEN_KEY, token);
  localStorage.setItem(LEGACY_ADMIN_INFO_KEY, JSON.stringify(user));
  if (!localStorage.getItem(ADMIN_USER_KEY)) localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  return { token, user, isAuthenticated: true };
};

export const setUnifiedAdminSession = ({ token, user, refreshToken = null } = {}) => {
  if (!token) return;
  const normalizedUser = normalizeAdminProfile(user || {});
  localStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, token);
  localStorage.setItem(LEGACY_ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(normalizedUser));
  localStorage.setItem(LEGACY_ADMIN_INFO_KEY, JSON.stringify(normalizedUser));
  if (refreshToken && typeof refreshToken === 'string') localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, refreshToken);
};

export const clearUnifiedAdminSession = () => {
  localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
  localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
  localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
  localStorage.removeItem(LEGACY_ADMIN_INFO_KEY);
};

/** Same as the Taxi module's `getAdminToken` helpers. */
export const getAdminToken = getUnifiedAdminToken;
