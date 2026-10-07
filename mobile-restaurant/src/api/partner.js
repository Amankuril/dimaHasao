import api, { getAuthToken, getHotelToken, upload } from './client';

/*
 * Port of Frontend/src/shared/partner/partnerApi.js: the two cross-business
 * endpoints.
 *
 * These are the only calls that answer for both businesses, so they accept
 * either token. client.js sends the restaurant token for these paths by
 * default; when only the hotel half of the session exists, authFor() asks for
 * the hotel token instead (web: getModuleToken('restaurant') || getPartnerToken()).
 */

/** Either token resolves to the same phone on the server. */
// Explicit, because client.js would otherwise infer the hotel token from the /partner/profiles/hotel path.
const authFor = () => (getAuthToken() ? 'restaurant' : getHotelToken() ? 'hotel' : undefined);

const unwrap = (res) => res?.data?.data ?? res?.data ?? {};

/** What this partner currently has: refreshes the workspace switcher. */
export const fetchPartnerProfiles = async () => unwrap(await api.get('/partner/profiles', { auth: authFor(), quiet: true }));

/**
 * Add the hotel business to an existing partner.
 *
 * Serves both ways in: the "both" onboarding path, and "also list a hotel" in
 * restaurant settings.
 *
 * @returns {Promise<{token: string, partnerApprovalStatus: string, user: Object}>}
 */
export const createHotelProfile = async ({ name, email } = {}) =>
  unwrap(await api.post('/partner/profiles/hotel', { name, email }, { auth: authFor(), quiet: true }));

/**
 * Owner details + address + Aadhaar/PAN, for whichever hotel account the
 * caller's token resolves to. Called right after createHotelProfile, with
 * whichever session that call (or restaurant registration, on the "both"
 * path) just established.
 *
 * @param {FormData} formData see buildHotelKycFormData in hotel/onboarding/hotelOnboardingFields.jsx
 */
export const submitHotelKyc = async (formData) =>
  unwrap(await upload('/partner/profiles/hotel/kyc', formData, { method: 'PATCH', auth: authFor() }));
