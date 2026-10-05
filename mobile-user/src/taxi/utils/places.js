import * as Location from 'expo-location';
import { geocodeAPI } from '../../api/food';

/*
 * The web pages use the Google Maps JS SDK (Autocomplete, Geocoder,
 * PlacesService). There is no JS SDK on native, so place search and reverse
 * geocoding go through the backend geocode proxy, the same one the
 * select-location screen uses.
 */

/** Device position: high accuracy first, then a relaxed retry. Asks for permission at first use. */
export async function getDevicePosition() {
  let perm = await Location.getForegroundPermissionsAsync();
  if (!perm.granted && perm.canAskAgain !== false) perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) throw new Error('Location permission denied');
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
  } catch {
    return Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);
  }
}

export const reverseGeocodeAddress = async (lat, lng) => {
  try {
    const response = await geocodeAPI.reverse(lat, lng);
    const data = response?.data?.data;
    if (data?.status === 'OK' && data.results?.[0]?.formatted_address) return data.results[0].formatted_address;
  } catch {
    // fall through to the caller's fallback label
  }
  return null;
};

const placeToResult = (p) => {
  const lat = Number(p?.location?.latitude);
  const lng = Number(p?.location?.longitude);
  const name = p?.displayName?.text || p?.displayName || '';
  const addr = p?.formattedAddress || '';
  return {
    title: name || addr,
    address: addr || name,
    placeId: p?.id,
    coords: Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : undefined,
  };
};

/** Up to six places for a query, biased to `center` ({ lat, lng }). Each result carries `coords` as [lng, lat]. */
export const searchPlaces = async (textQuery, center) => {
  const body = { textQuery, maxResultCount: 6 };
  if (center) {
    body.latitude = center.lat;
    body.longitude = center.lng;
  }
  const res = await geocodeAPI.textSearch(body);
  const places = res?.data?.data?.places;
  return (Array.isArray(places) ? places : []).map(placeToResult).filter((r) => r.coords);
};
