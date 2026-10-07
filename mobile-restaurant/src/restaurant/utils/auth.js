import { getAuthToken, getHotelToken, getRefreshToken } from '../../api/client';
import { localStore, sessionStore } from '../../lib/storage';

/*
 * The slice of Frontend/src/modules/Food/utils/auth.js (shared/utils/moduleAuth.js)
 * the restaurant screens use. The session is owned by context/AuthContext
 * (tokens in SecureStore); these helpers answer the questions the web asks of
 * localStorage. Every helper is about the restaurant module: it is the app's
 * only role.
 */

const MODULE = 'restaurant';
let handlers = { login: null, logout: null, hotelLogin: null, hotelLogout: null };

/** AuthContext registers how to sign in / out so plain modules can ask for it. */
export function registerAuthHandlers(next) {
  handlers = { ...handlers, ...next };
}

export function decodeToken(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
}

export function getModuleToken(module = MODULE) {
  return module === MODULE ? getAuthToken() : null;
}

/**
 * Web: token present and not expired. Here an expired access token still
 * counts while a refresh token can renew it (the first 401 does that).
 */
export function isModuleAuthenticated(module = MODULE) {
  if (module !== MODULE) return false;
  const token = getAuthToken();
  return Boolean(token) && (!isTokenExpired(token) || Boolean(getRefreshToken()));
}

export function getCurrentUser(module = MODULE) {
  try {
    return JSON.parse(localStore.getItem(`${module}_user`) || 'null');
  } catch {
    return null;
  }
}

/** Web: removes the module's tokens and cached user, i.e. signs the partner out. */
export function clearModuleAuth(module = MODULE) {
  if (module === MODULE) return handlers.logout?.();
  return undefined;
}

export function clearAuthData() {
  return handlers.logout?.();
}

/** Web: setAuthData('restaurant', token, user, refreshToken). */
export function setAuthData(module, token, user, refreshToken = null) {
  if (module !== MODULE || !token) throw new Error(`Invalid parameters: module=${module}, token=${Boolean(token)}`);
  return handlers.login?.({ accessToken: token, user, refreshToken });
}

/*
 * The hotel partner half (web: Hotel/utils/partnerAuth.js over moduleAuth 'partner').
 * Same ownership as the restaurant half: AuthContext holds the session, these
 * helpers answer what the web asks of localStorage.
 */
export const setHotelSession = (token, user) => handlers.hotelLogin?.(token, user);
export const clearHotelSession = () => handlers.hotelLogout?.();
export const getHotelSessionToken = () => getHotelToken();

export function isHotelAuthenticated() {
  const token = getHotelToken();
  return Boolean(token) && !isTokenExpired(token);
}

export function getHotelUser() {
  try {
    return JSON.parse(localStore.getItem('partner_user') || 'null');
  } catch {
    return null;
  }
}
