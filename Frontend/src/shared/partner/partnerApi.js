/**
 * The two cross-business endpoints.
 *
 * These are the only calls that answer for both businesses, so they accept
 * either module's token. The module axios instances each pick a token by URL
 * and would not know what to do with /partner, so this client chooses the
 * token itself — whichever half of the session exists.
 */
import axios from 'axios';
import { getModuleToken } from '@/shared/utils/moduleAuth';
import { getPartnerToken } from '@/modules/Hotel/utils/partnerAuth';

const baseURL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')
    : '/api/v1';

const client = axios.create({ baseURL, timeout: 30000 });

/** Either token resolves to the same phone on the server. */
const authHeader = () => {
  const token = getModuleToken('restaurant') || getPartnerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const unwrap = (res) => res?.data?.data ?? res?.data ?? {};

/** What this partner currently has — refreshes the workspace switcher. */
export const fetchPartnerProfiles = async () =>
  unwrap(await client.get('/partner/profiles', { headers: authHeader() }));

/**
 * Add the hotel business to an existing partner.
 *
 * Serves both ways in: the "both" onboarding path, and "also list a hotel" in
 * restaurant settings.
 *
 * @returns {Promise<{token: string, partnerApprovalStatus: string, user: Object}>}
 */
export const createHotelProfile = async ({ name, email } = {}) =>
  unwrap(await client.post('/partner/profiles/hotel', { name, email }, { headers: authHeader() }));
