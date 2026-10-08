import apiClient from './client';

/*
 * Geocode lookups go through the backend proxy (/food/geocode/*). When the
 * server has no Maps key configured the proxy answers 503; the lookups then
 * go straight to Google with the app's own public Maps key (the one the map
 * tiles already use), with the same requests the proxy makes and the same
 * response shape, so callers see no difference.
 */

const MAPS_KEY = String(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '')
  .trim()
  .replace(/^['"]|['"]$/g, '');
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const PLACES_URL = 'https://places.googleapis.com/v1/places';
const TIMEOUT_MS = 15000;

// Set once the proxy says it has no key, so later lookups skip the failing round trip.
let proxyUnavailable = false;

const toFinite = (value) => {
  const n = Number(value);
  return value !== null && value !== undefined && value !== '' && Number.isFinite(n) ? n : null;
};

async function google(url, { body, fieldMask } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json', 'X-Goog-Api-Key': MAPS_KEY, 'X-Goog-FieldMask': fieldMask } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'Location lookup failed');
    return { data: { success: true, data } };
  } finally {
    clearTimeout(timer);
  }
}

const geocodeUrl = (params) => {
  const query = Object.entries({ ...params, key: MAPS_KEY, language: 'en', region: 'in' })
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${GEOCODE_URL}?${query}`;
};

const direct = {
  reverse: (lat, lng, params = {}) => google(geocodeUrl({ latlng: `${lat},${lng}`, result_type: params.result_type })),
  place: (placeId) => google(geocodeUrl({ place_id: placeId })),
  nearby: (body = {}) => {
    const radius = Math.min(Math.max(toFinite(body.radius) ?? 60, 1), 500);
    return google(`${PLACES_URL}:searchNearby`, {
      fieldMask: 'places.displayName,places.formattedAddress,places.addressComponents,places.location,places.types',
      body: {
        locationRestriction: { circle: { center: { latitude: toFinite(body.latitude ?? body.lat), longitude: toFinite(body.longitude ?? body.lng) }, radius } },
        maxResultCount: Math.min(Math.max(Number(body.maxResultCount) || 5, 1), 10),
        rankPreference: 'DISTANCE',
      },
    });
  },
  textSearch: (body = {}) => {
    const lat = toFinite(body.latitude ?? body.lat);
    const lng = toFinite(body.longitude ?? body.lng);
    const request = {
      textQuery: String(body.textQuery || body.query || ''),
      languageCode: 'en',
      regionCode: 'IN',
      maxResultCount: Math.min(Math.max(Number(body.maxResultCount) || 6, 1), 10),
    };
    if (lat !== null && lng !== null) request.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 50000 } };
    return google(`${PLACES_URL}:searchText`, { fieldMask: 'places.id,places.displayName,places.formattedAddress,places.location', body: request });
  },
};

const viaProxy = (name, proxyCall) => async (...args) => {
  if (!proxyUnavailable) {
    try {
      return await proxyCall(...args);
    } catch (error) {
      const status = error?.response?.status ?? error?.status;
      if (status !== 503 || !MAPS_KEY) throw error;
      proxyUnavailable = true;
    }
  }
  return direct[name](...args);
};

export const geocodeAPI = {
  reverse: viaProxy('reverse', (lat, lng, params = {}, config = {}) => apiClient.get('/food/geocode/reverse', { params: { lat, lng, ...params }, ...config })),
  place: viaProxy('place', (placeId, config = {}) => apiClient.get('/food/geocode/place', { params: { place_id: placeId }, ...config })),
  nearby: viaProxy('nearby', (body, config = {}) => apiClient.post('/food/geocode/nearby', body, config)),
  textSearch: viaProxy('textSearch', (body, config = {}) => apiClient.post('/food/geocode/text-search', body, config)),
};
