/*
 * Port of Frontend/src/shared/utils/userSession.js. The session itself is
 * owned by context/AuthContext; clearModuleAuth('user') clears it. The web's
 * Firebase sign-out has no counterpart (the app has no Firebase web session).
 */
import { logout as logoutApi } from '../../api/auth';
import { getRefreshToken } from '../../api/client';
import { clearModuleAuth } from '../../food/utils/auth';
import { events } from '../../lib/events';
import { localStore } from '../../lib/storage';

export const USER_SESSION_PREFERENCE_KEYS = ['userVegMode', 'userVegModeOption', 'userOrderType', 'food-under-250-filters'];

export function formatSavedAddressSubtitle(addresses, preferredAddress) {
  if (!addresses?.length) return 'No address saved. Tap to save.';
  const addr = preferredAddress || addresses.find((item) => item.isDefault) || addresses[0];
  const line = [addr?.additionalDetails, addr?.street, addr?.city, addr?.state, addr?.zipCode].filter(Boolean).join(', ');
  return line || 'Tap to save.';
}

export function readCachedUserAddresses() {
  try {
    const saved = localStore.getItem('userAddresses');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function clearLocalUserSessionData() {
  clearModuleAuth('user');
  ['accessToken', 'user_authenticated', 'user_user', 'user', 'cart', ...USER_SESSION_PREFERENCE_KEYS].forEach((key) => localStore.removeItem(key));
  events.emit('userAuthChanged');
}

export async function performUserLogout({ beforeClear, afterClear } = {}) {
  try {
    await logoutApi(getRefreshToken(), localStore.getItem('fcm_registered_token_user') || null, 'mobile');
  } catch {
    // continue local cleanup even if API logout fails
  }
  await beforeClear?.();
  clearLocalUserSessionData();
  await afterClear?.();
}
