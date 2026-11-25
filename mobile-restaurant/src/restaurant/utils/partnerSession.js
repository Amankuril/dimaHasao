import { localStore } from '../../lib/storage';
import { clearHotelSession, clearModuleAuth, getCurrentUser, getHotelUser, isHotelAuthenticated, isModuleAuthenticated, setAuthData, setHotelSession } from './auth';

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

/*
 * Having a business is not the same as being let into its panel. A restaurant
 * opens only once approved (RestaurantShell sends anything else to
 * pending-verification); a hotel is held on under-review once its KYC is in
 * and until it is approved (HotelShell; partners from before the KYC step have
 * onboardingComplete unset and stay open). These mirror those two guards, so
 * sign-in, app start and the switcher never send a partner to a panel that
 * would bounce them straight to a review screen. The user objects can be
 * passed in so a component re-renders off AuthContext state.
 */
export const isRestaurantOpen = (restaurant = getCurrentUser('restaurant')) => String(restaurant?.status || '').toLowerCase() === 'approved';
export const isHotelOpen = (hotel = getHotelUser()) => Boolean(hotel) && !(hotel.onboardingComplete && hotel.partnerApprovalStatus !== 'approved');
const isWorkspaceOpen = (workspace) => (workspace === WORKSPACE.RESTAURANT ? isRestaurantOpen() : workspace === WORKSPACE.HOTEL ? isHotelOpen() : false);

/** Both businesses exist AND both are approved: only then is there anything to switch between. */
export const hasBothProfiles = ({ restaurant, hotel } = {}) =>
  hasRestaurantProfile() && hasHotelProfile() && isRestaurantOpen(restaurant ?? getCurrentUser('restaurant')) && isHotelOpen(hotel ?? getHotelUser());

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

/**
 * The panel to land on after signing in (or at app start), given what the
 * partner has: the last workspace if it is open, else whichever one is open.
 * Null when no business is open yet: the caller shows the review screen. A
 * partner whose hotel is approved and whose restaurant is still pending
 * therefore lands on the hotel, even though applying for the restaurant made
 * it the last workspace.
 */
export const resolvePartnerHome = (profiles = []) => {
  const open = profiles.filter(isWorkspaceOpen);
  const last = getActiveWorkspace();
  if (last && open.includes(last)) return WORKSPACE_HOME[last];
  if (open.includes(WORKSPACE.RESTAURANT)) return WORKSPACE_HOME[WORKSPACE.RESTAURANT];
  if (open.includes(WORKSPACE.HOTEL)) return WORKSPACE_HOME[WORKSPACE.HOTEL];
  return null;
};

/** Sign out of both businesses at once. */
export const clearPartnerSessions = async () => {
  await clearHotelSession();
  await clearModuleAuth('restaurant');
  localStore.removeItem(PROFILES_KEY);
  localStore.removeItem(WORKSPACE_KEY);
  clearOnboardingIntent();
};
