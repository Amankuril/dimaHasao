/**
 * The partner session, which is really two sessions.
 *
 * One login now answers for both businesses, but restaurant and hotel keep
 * their own tokens, guards and storage keys — merging them would mean
 * re-subjecting every restaurant route. So a sign-in can hand back a restaurant
 * half, a hotel half, or both, and this module puts each where its own module
 * already looks for it.
 *
 * What is new is only the record of which businesses exist, and which one the
 * partner was last looking at, so the workspace switcher can render without
 * another round trip.
 */
import { setAuthData, clearModuleAuth, isModuleAuthenticated } from '@/shared/utils/moduleAuth';
import {
  setPartnerSession,
  clearPartnerSession,
  isPartnerSignedIn,
} from '@/modules/Hotel/utils/partnerAuth';

const PROFILES_KEY = 'partner_profiles';
const WORKSPACE_KEY = 'partner_active_workspace';
const INTENT_KEY = 'partner_onboarding_intent';

export const WORKSPACE = { RESTAURANT: 'restaurant', HOTEL: 'hotel' };

export const WORKSPACE_HOME = {
  [WORKSPACE.RESTAURANT]: '/food/restaurant',
  [WORKSPACE.HOTEL]: '/hotel/partner/dashboard',
};

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

/** Which businesses this partner has, as the last sign-in reported them. */
export const getPartnerProfiles = () => {
  const profiles = readJson(PROFILES_KEY, []);
  return Array.isArray(profiles) ? profiles : [];
};

/*
 * Having a business means holding a live session for it, not merely having it
 * listed. The list is written at sign-in and survives a sign-out from the
 * other side, an expired token, or a browser that kept storage from an older
 * visit — and on its own it offered "Switch to Hotel" to someone with no hotel
 * session at all, who then landed on the dashboard and was bounced to login.
 */
export const hasRestaurantProfile = () =>
  getPartnerProfiles().includes(WORKSPACE.RESTAURANT) && isModuleAuthenticated('restaurant');

export const hasHotelProfile = () =>
  getPartnerProfiles().includes(WORKSPACE.HOTEL) && isPartnerSignedIn();

export const hasBothProfiles = () => hasRestaurantProfile() && hasHotelProfile();

export const setPartnerProfiles = (profiles = []) => {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles.filter(Boolean)));
  } catch {
    /* storage full or blocked — the switcher just will not render */
  }
};

/** The dashboard the partner was last on, so a fresh sign-in returns there. */
export const getActiveWorkspace = () => {
  const stored = localStorage.getItem(WORKSPACE_KEY);
  return stored === WORKSPACE.HOTEL || stored === WORKSPACE.RESTAURANT ? stored : null;
};

export const setActiveWorkspace = (workspace) => {
  try {
    localStorage.setItem(WORKSPACE_KEY, workspace);
  } catch {
    /* non-fatal */
  }
};

/**
 * Onboarding intent, for the "both" path only.
 *
 * Restaurant onboarding takes far longer than the ten-minute signup ticket, so
 * the second business is added afterwards with a real session. This flag is all
 * that has to survive in between. Losing it (a different device) is harmless —
 * settings offers the same route.
 */
export const setOnboardingIntent = (intent) => {
  try {
    localStorage.setItem(INTENT_KEY, intent);
  } catch {
    /* non-fatal */
  }
};

export const getOnboardingIntent = () => localStorage.getItem(INTENT_KEY) || '';
export const clearOnboardingIntent = () => localStorage.removeItem(INTENT_KEY);

/**
 * Store whichever halves came back from /auth/otp/verify.
 *
 * @param {{profiles?: string[], restaurant?: Object|null, hotel?: Object|null}} result
 * @returns {string[]} the profiles that were stored
 */
export const storePartnerSession = (result = {}) => {
  const { restaurant, hotel } = result;
  const profiles = [];

  if (restaurant?.accessToken) {
    setAuthData('restaurant', restaurant.accessToken, restaurant.user, restaurant.refreshToken);
    profiles.push(WORKSPACE.RESTAURANT);
  }

  if (hotel?.token) {
    setPartnerSession(hotel.token, hotel.user);
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
export const clearPartnerSessions = () => {
  clearModuleAuth('restaurant');
  clearPartnerSession();
  localStorage.removeItem(PROFILES_KEY);
  localStorage.removeItem(WORKSPACE_KEY);
  clearOnboardingIntent();
};
