import { getAuthToken, getRefreshToken } from '../../api/client';
import { localStore } from '../../lib/storage';

/*
 * The slice of Frontend/src/modules/Food/utils/auth.js the user screens use.
 * The session itself is owned by context/AuthContext (tokens in SecureStore);
 * these helpers answer the same questions the web asks of localStorage.
 */

let handlers = { login: null, logout: null };

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

export function getModuleToken(module = 'user') {
  return module === 'user' ? getAuthToken() : null;
}

/**
 * Web: token present and not expired. Here an expired access token still
 * counts while a refresh token can renew it (the first 401 does that).
 */
export function isModuleAuthenticated(module = 'user') {
  if (module !== 'user') return false;
  const token = getAuthToken();
  return Boolean(token) && (!isTokenExpired(token) || Boolean(getRefreshToken()));
}

export function getCurrentUser(module = 'user') {
  try {
    return JSON.parse(localStore.getItem(`${module}_user`) || 'null');
  } catch {
    return null;
  }
}

/** Web: removes the module's tokens and cached user, i.e. signs the user out. */
export function clearModuleAuth(module = 'user') {
  if (module === 'user') handlers.logout?.();
}

export function clearAuthData() {
  handlers.logout?.();
}

/** Web: setAuthData('user', token, user, refreshToken). */
export function setAuthData(module, token, user, refreshToken = null) {
  if (module !== 'user' || !token) throw new Error(`Invalid parameters: module=${module}, token=${Boolean(token)}`);
  return handlers.login?.({ accessToken: token, user, refreshToken });
}