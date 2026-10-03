/**
 * Module-scoped auth storage — ported from Frontend/src/shared/utils/moduleAuth.js.
 *
 * Same key scheme (`${module}_accessToken`, `${module}_user`, ...) so the
 * backend's module-aware tokens (user/admin/restaurant/delivery) work
 * unchanged. The only real change is localStorage (sync) -> AsyncStorage
 * (async), so every function here returns a Promise and call sites must
 * `await` them — the web version didn't need to.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {base64Decode} from './base64';

export function decodeToken(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(base64Decode(payload));
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

export function getRoleFromToken(token) {
  return decodeToken(token)?.role || null;
}

export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
}

export function getUserIdFromToken(token) {
  const decoded = decodeToken(token);
  return decoded?.userId || decoded?.id || null;
}

export async function getModuleToken(module) {
  return AsyncStorage.getItem(`${module}_accessToken`);
}

export async function getModuleRefreshToken(module) {
  return AsyncStorage.getItem(`${module}_refreshToken`);
}

export async function getCurrentUser(module) {
  if (!module) return null;
  const userStr = await AsyncStorage.getItem(`${module}_user`);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export async function getCurrentUserRole(module = null) {
  if (module) {
    const user = await getCurrentUser(module);
    return user?.role || module;
  }
  return module || 'user';
}

export async function isModuleAuthenticated(module) {
  const token = await getModuleToken(module);
  if (!token) return false;
  if (isTokenExpired(token)) {
    await clearModuleAuth(module);
    return false;
  }
  return true;
}

export async function clearModuleAuth(module) {
  const keys = [
    `${module}_accessToken`,
    `${module}_refreshToken`,
    `${module}_authenticated`,
    `${module}_user`,
    `fcm_web_registered_token_${module}`,
  ];
  if (module === 'user') {
    keys.push('userToken', 'token', 'userInfo', 'role', 'chatRole');
  }
  await AsyncStorage.multiRemove(keys);
}

export async function clearAuthData() {
  const modules = ['admin', 'restaurant', 'delivery', 'user'];
  await Promise.all(modules.map(clearModuleAuth));
  await AsyncStorage.multiRemove(['accessToken', 'user']);
}

export async function setAuthData(module, token, user, refreshToken = null) {
  if (!module || !token) {
    throw new Error(`Invalid parameters: module=${module}, token=${!!token}`);
  }

  const pairs = [
    [`${module}_accessToken`, token],
    [`${module}_authenticated`, 'true'],
  ];
  if (refreshToken && typeof refreshToken === 'string') {
    pairs.push([`${module}_refreshToken`, refreshToken]);
  }
  if (module === 'user') {
    pairs.push(['userToken', token], ['token', token], ['role', 'user'], ['chatRole', 'user']);
  }
  if (user) {
    const serialized = JSON.stringify(user);
    pairs.push([`${module}_user`, serialized]);
    if (module === 'user') {
      pairs.push(['userInfo', serialized]);
    }
  }

  await AsyncStorage.multiSet(pairs);
}

/**
 * Merge fields into the cached user for a module (and the shared `userInfo`
 * mirror) without touching tokens.
 */
export async function patchStoredUser(module, patch) {
  if (!module || !patch || typeof patch !== 'object') return;
  try {
    const key = `${module}_user`;
    const current = JSON.parse((await AsyncStorage.getItem(key)) || '{}');
    await AsyncStorage.setItem(key, JSON.stringify({...current, ...patch}));

    const info = JSON.parse((await AsyncStorage.getItem('userInfo')) || 'null');
    if (info && typeof info === 'object') {
      await AsyncStorage.setItem('userInfo', JSON.stringify({...info, ...patch}));
    }
  } catch {
    // The cached copy is only a convenience — never block login on it.
  }
}

/**
 * Set unified authentication data for both Food and Taxi modules — a single
 * OTP login establishes both sessions at once.
 */
export async function setUnifiedAuthData(data) {
  if (!data) return;

  const foodToken = data.accessToken || data.foodAuth?.accessToken;
  const foodUser = data.user || data.foodAuth?.user;
  const foodRefreshToken = data.refreshToken || data.foodAuth?.refreshToken;
  if (foodToken && foodUser) {
    await setAuthData('user', foodToken, foodUser, foodRefreshToken);
  }

  const taxiAuth = data.taxiAuth;
  if (taxiAuth && taxiAuth.token && taxiAuth.user) {
    await AsyncStorage.multiSet([
      ['userToken', taxiAuth.token],
      ['token', taxiAuth.token],
      ['userInfo', JSON.stringify(taxiAuth.user)],
      ['role', 'user'],
      ['chatRole', 'user'],
    ]);
    return;
  }

  if (foodToken && foodUser) {
    await AsyncStorage.multiSet([
      ['userToken', foodToken],
      ['token', foodToken],
      ['userInfo', JSON.stringify(foodUser)],
      ['role', 'user'],
      ['chatRole', 'user'],
    ]);
  }
}

export async function isUnifiedAuthenticated() {
  const [foodToken, taxiToken] = await Promise.all([
    AsyncStorage.getItem('user_accessToken'),
    AsyncStorage.getItem('userToken'),
  ]);
  return !!(foodToken && taxiToken);
}
