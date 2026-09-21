/**
 * The hotel partner session, stored the way every other panel stores its own.
 *
 * It used to live in the bare `token` / `user` entries. Those are not this
 * module's to own: the consumer app writes `token` on sign-in,
 * `clearModuleAuth('user')` deletes it by name, and the Taxi axios instance
 * removes it on any 401 it sees. Whichever ran first signed the partner out,
 * while every namespaced panel carried on — which is why closing the wrapper
 * and reopening the hotel module landed back on the login screen.
 *
 * This goes through the shared moduleAuth helpers under the module name
 * `partner`, so the keys are `partner_accessToken`, `partner_user` and
 * `partner_authenticated`, exactly like admin, restaurant and delivery.
 *
 * Every reader goes through here. The previous attempt moved only the write
 * side, so the sidebar, dashboard, profile and reviews screens carried on
 * reading `user` and saw an empty session.
 */
import {
  setAuthData,
  clearModuleAuth,
  getModuleToken,
  getCurrentUser,
  isModuleAuthenticated,
} from '@/shared/utils/moduleAuth';

const MODULE = 'partner';

/**
 * Sessions created before the move still sit in the legacy keys. Reading them
 * means a partner who is already signed in is not ejected by this change; they
 * land on the namespaced keys at their next sign-in.
 */
const legacyToken = () => localStorage.getItem('token');

const legacyUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

export const setPartnerSession = (token, user, refreshToken = null) =>
  setAuthData(MODULE, token, user, refreshToken);

export const getPartnerToken = () => getModuleToken(MODULE) || legacyToken();

export const getPartnerUser = () => getCurrentUser(MODULE) || legacyUser();

export const isPartnerSignedIn = () =>
  isModuleAuthenticated(MODULE) || Boolean(legacyToken());

/** Clears the partner's own session and the legacy copy it may have come from. */
export const clearPartnerSession = () => {
  clearModuleAuth(MODULE);
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export default {
  setPartnerSession,
  getPartnerToken,
  getPartnerUser,
  isPartnerSignedIn,
  clearPartnerSession,
};
