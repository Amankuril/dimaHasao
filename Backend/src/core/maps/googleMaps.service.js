/**
 * Centralized Google Maps access.
 *
 * The API key was resolved in three places with three different rules, and all
 * five call sites across food and hotel hit the same Geocoding API:
 *   - food/orders/utils/googleMaps.js        → GOOGLE_MAPS_API_KEY | VITE_…
 *   - food/landing/…/geocodePublic.controller → same pair, duplicated
 *   - hotel/controllers/hotelController.js   → documented as preferring
 *     GOOGLE_MAP_API_KEY (no "S"), but the code read GOOGLE_MAPS_API_KEY twice,
 *     so that spelling never actually worked.
 *
 * One resolver here accepts every spelling, so setting any one of them works
 * everywhere instead of half the app.
 */
import { logger } from '../../utils/logger.js';

const GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

/** Strip accidental surrounding quotes picked up from .env values. */
const sanitize = (value) => (value ? String(value).trim().replace(/^['"]|['"]$/g, '') : '');

/**
 * The Maps key, accepting every spelling in use across the merged projects.
 * @returns {string} empty string when unset
 */
export const getGoogleMapsApiKey = () =>
    sanitize(process.env.GOOGLE_MAPS_API_KEY) ||
    sanitize(process.env.GOOGLE_MAP_API_KEY) ||
    sanitize(process.env.VITE_GOOGLE_MAPS_API_KEY) ||
    '';

export const isMapsConfigured = () => Boolean(getGoogleMapsApiKey());

/**
 * Call the Geocoding API and return its parsed payload.
 *
 * Never throws — callers get `null` when Maps is unconfigured or the request
 * fails, so a geocoding outage degrades a screen instead of 500-ing a booking.
 *
 * @param {Record<string, string|number>} params - Query params (address, latlng, place_id…)
 * @returns {Promise<Object|null>}
 */
export const geocodeRequest = async (params = {}) => {
    const key = getGoogleMapsApiKey();

    if (!key) {
        logger.warn('[Maps] Skipped geocode: no Google Maps API key configured');
        return null;
    }

    const url = new URL(GEOCODE_ENDPOINT);
    for (const [name, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(name, String(value));
        }
    }
    url.searchParams.set('key', key);

    try {
        const response = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
        const payload = await response.json();

        if (payload?.status !== 'OK') {
            logger.warn(`[Maps] Geocode returned ${payload?.status || response.status}`);
            return payload?.status === 'ZERO_RESULTS' ? payload : null;
        }

        return payload;
    } catch (error) {
        logger.error(`[Maps] Geocode request failed: ${error.message}`);
        return null;
    }
};

/**
 * Address → coordinates.
 * @returns {Promise<{lat: number, lng: number, formattedAddress: string, placeId: string}|null>}
 */
export const geocodeAddress = async (addressQuery) => {
    const address = String(addressQuery || '').trim();
    if (!address) return null;

    const payload = await geocodeRequest({ address });
    const result = payload?.results?.[0];
    const location = result?.geometry?.location;

    if (!location) return null;

    return {
        lat: Number(location.lat),
        lng: Number(location.lng),
        formattedAddress: result.formatted_address || '',
        placeId: result.place_id || '',
    };
};

/**
 * Coordinates → address.
 * @returns {Promise<Object|null>} the first geocoding result
 */
export const reverseGeocode = async ({ lat, lng } = {}) => {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null;

    const payload = await geocodeRequest({ latlng: `${lat},${lng}` });
    return payload?.results?.[0] || null;
};

export default { getGoogleMapsApiKey, isMapsConfigured, geocodeRequest, geocodeAddress, reverseGeocode };
