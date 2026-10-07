import { localStore } from '../../lib/storage';
import { clearHotelSession, clearModuleAuth, isHotelAuthenticated, isModuleAuthenticated, setAuthData, setHotelSession } from './auth';

/*
 * Port of Frontend/src/shared/partner/partnerSession.js.
 *
 * The partner session is really two sessions. One login answers for both
 * businesses, but restaurant and hotel keep their own tokens and guards, so a
 * sign-in can hand back a restaurant half, a hotel half, or both. Each half is
 * stored where its own module looks for it (AuthContext owns the storage).
 * What this adds is the record of which businesses exist and which one the
 * partner was last looking at, so the workspace switcher can render.
 */

const PROFILES_KEY = 'partner_profiles';
const WORKSPACE_KEY = 'partner_active_workspace';
const INTENT_KEY = 'partner_onboarding_intent';

export const WORKSPACE = { RESTAURANT: 'restaurant', HOTEL: 'hotel' };

export const WORKSPACE_HOME = {
  [WORKSPACE.RESTAURANT]: '/food/restaurant',
  [WORKSPACE.HOTEL]: '/hotel/partner/dashboard',
};
export const RESTAURANT_HOME = WORKSPACE_HOME[WORKSPACE.RESTAURANT];
export const HOTEL_HOME = WORKSPACE_HOME[WORKSPACE.HOTEL];

/** Which businesses this partner has, as the last sign-in reported them. */
export const getPartnerProfiles = () => {
  try {
    const profiles = JSON.parse(localStore.getItem(PROFILES_KEY) || '[]');
    return Array.isArray(profiles) ? profiles : [];
  } catch {
    return [];
  }
};

/*
 * Having a business means holding a live session for it, not merely having it
 * listed: the list survives a sign-out from the other side or an expired token.
 */
export const hasRestaurantProfile = () => getPartnerProfiles().includes(WORKSPACE.RESTAURANT) && isModuleAuthenticated('restaurant');
export const hasHotelProfile = () => getPartnerProfiles().includes(WORKSPACE.HOTEL) && isHotelAuthenticated();
export const hasBothProfiles = () => hasRestaurantProfile() && hasHotelProfile();

export const setPartnerProfiles = (profiles = []) => localStore.setItem(PROFILES_KEY, JSON.stringify(profiles.filter(Boolean)));

/** The dashboard the partner was last on, so a fresh sign-in returns there. */
export const getActiveWorkspace = () => {
  const stored = localStore.getItem(WORKSPACE_KEY);
  return stored === WORKSPACE.HOTEL || stored === WORKSPACE.RESTAURANT ? stored : null;
};
export const setActiveWorkspace = (workspace) => localStore.setItem(WORKSPACE_KEY, workspace);

/** Onboarding intent, for the "both" path only (restaurant onboarding outlasts the signup ticket). */
export const setOnboardingIntent = (intent) => localStore.setItem(INTENT_KEY, intent);
export const getOnboardingIntent = () => localStore.getItem(INTENT_KEY) || '';
export const clearOnboardingIntent = () => localStore.removeItem(INTENT_KEY);

/** Stores whichever halves came back from /auth/otp/verify and returns the profiles that were stored. */
export const storePartnerSession = async (result = {}) => {
  const { restaurant, hotel } = result;
  const profiles = [];
  if (restaurant?.accessToken) {
    await setAuthData('restaurant', restaurant.accessToken, restaurant.user, restaurant.refreshToken);
    profiles.push(WORKSPACE.RESTAURANT);
  }
  if (hotel?.token) {
    await setHotelSession(hotel.token, hotel.user);
    profiles.push(WORKSPACE.HOTEL);
  }
  setPartnerProfiles(profiles);
  return profiles;
};

/** Where to land after signing in, given what the partner has. */
export const resolvePartnerHome = (profiles = []) => {
  if (profiles.length > 1) {
    const last = getActiveWorkspace();
    if (last && profiles.includes(last)) return WORKSPACE_HOME[last];
  }
  if (profiles.includes(WORKSPACE.RESTAURANT)) return WORKSPACE_HOME[WORKSPACE.RESTAURANT];
  if (profiles.includes(WORKSPACE.HOTEL)) return WORKSPACE_HOME[WORKSPACE.HOTEL];
  return '/food/restaurant/login';
};

/** Sign out of both businesses at once. */
export const clearPartnerSessions = async () => {
  await clearHotelSession();
  await clearModuleAuth('restaurant');
  localStore.removeItem(PROFILES_KEY);
  localStore.removeItem(WORKSPACE_KEY);
  clearOnboardingIntent();
};
