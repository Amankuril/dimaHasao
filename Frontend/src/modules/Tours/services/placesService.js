/**
 * Google place suggestions for the tours admin, through the backend proxies
 * every other module uses (the key never reaches the browser):
 *   POST /v1/maps/autocomplete           → suggestions
 *   GET  /v1/food/geocode/place?place_id → coordinates + formatted address
 */
import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

const ROOT = API_BASE_URL.replace(/\/tours$/, '');

// Haflong — results are biased towards the district.
const BIAS = { latitude: 25.1667, longitude: 93.0167 };

export async function searchPlaces(input) {
  const query = String(input || '').trim();
  if (query.length < 3) return [];
  const res = await axios.post(`${ROOT}/maps/autocomplete`, { input: query, ...BIAS }, { timeout: 8000 });
  const suggestions = res?.data?.data?.suggestions || [];
  return suggestions
    .map((s) => s.placePrediction)
    .filter(Boolean)
    .map((p) => ({
      placeId: String(p.placeId || '').replace(/^places\//, ''),
      name: p.structuredFormat?.mainText?.text || p.text?.text || '',
      secondary: p.structuredFormat?.secondaryText?.text || '',
    }))
    .filter((p) => p.placeId && p.name);
}

export async function resolvePlace(suggestion) {
  const res = await axios.get(`${ROOT}/food/geocode/place`, { params: { place_id: suggestion.placeId }, timeout: 8000 });
  const first = res?.data?.data?.results?.[0];
  const loc = first?.geometry?.location;
  return {
    name: suggestion.name,
    address: first?.formatted_address || suggestion.secondary || '',
    placeId: suggestion.placeId,
    lat: Number(loc?.lat),
    lng: Number(loc?.lng),
  };
}
