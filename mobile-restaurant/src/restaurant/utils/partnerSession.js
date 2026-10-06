import { localStore } from '../../lib/storage';
import { setAuthData } from './auth';

/*
 * The restaurant half of Frontend/src/shared/partner/partnerSession.js.
 * One partner sign-in can answer for a restaurant and a hotel. This app is the
 * restaurant app, so only the restaurant session is kept; a hotel profile is
 * remembered by name (the list of profiles) but its token is not stored here,
 * because nothing in this app can use it. The hotel business has its own app.
 */

const PROFILES_KEY = 'partner_profiles';
const WORKSPACE_KEY = 'partner_active_workspace';
const INTENT_KEY = 'partner_onboarding_intent';

export const WORKSPACE = { RESTAURANT: 'restaurant', HOTEL: 'hotel' };
export const RESTAURANT_HOME = '/food/restaurant';

export const getPartnerProfiles = () => {
  try {
    const profiles = JSON.parse(localStore.getItem(PROFILES_KEY) || '[]');
    return Array.isArray(profiles) ? profiles : [];
  } catch {
    return [];
  }
};

export const setPartnerProfiles = (profiles = []) => localStore.setItem(PROFILES_KEY, JSON.stringify(profiles.filter(Boolean)));
export const setActiveWorkspace = (workspace) => localStore.setItem(WORKSPACE_KEY, workspace);
export const setOnboardingIntent = (intent) => localStore.setItem(INTENT_KEY, intent);
export const getOnboardingIntent = () => localStore.getItem(INTENT_KEY) || '';
export const clearOnboardingIntent = () => localStore.removeItem(INTENT_KEY);

/** Stores the restaurant session from a partner verify answer and returns the profiles the number owns. */
export const storePartnerSession = async (result = {}) => {
  const { restaurant, hotel } = result;
  const profiles = [];
  if (restaurant?.accessToken) {
    await setAuthData('restaurant', restaurant.accessToken, restaurant.user, restaurant.refreshToken);
    profiles.push(WORKSPACE.RESTAURANT);
  }
  if (hotel?.token) profiles.push(WORKSPACE.HOTEL);
  setPartnerProfiles(profiles);
  return profiles;
};

/** The hotel business is managed in the hotel partner app; this app never reports a hotel workspace. */
export const hasHotelProfile = () => false;
export const hasBothProfiles = () => false;
