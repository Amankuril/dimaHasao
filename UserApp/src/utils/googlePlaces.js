/**
 * Shared Google Places/Geocoding REST helpers, extracted from the pattern
 * first written in SelectLocationScreen.jsx so the Intercity screens (which
 * need the same autocomplete/reverse-geocode/place-details calls against a
 * city-biased search instead of a district-wide one) don't each reimplement
 * it.
 */
import {GOOGLE_MAPS_API_KEY} from '../services/api/config';

export async function geocodeAddress(address, fallback = null) {
  if (!address?.trim() || !GOOGLE_MAPS_API_KEY) return fallback;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const body = await res.json();
    const loc = body?.results?.[0]?.geometry?.location;
    return loc ? [loc.lng, loc.lat] : fallback;
  } catch {
    return fallback;
  }
}

export async function reverseGeocode(lat, lng) {
  if (!GOOGLE_MAPS_API_KEY) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const body = await res.json();
    return body?.results?.[0]?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export async function fetchAutocomplete(query, sessionToken, {center, radius = 30000} = {}) {
  if (!GOOGLE_MAPS_API_KEY || query.trim().length < 3) return [];
  try {
    const biasParam = center ? `&locationbias=circle:${radius}@${center.lat},${center.lng}` : '';
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query,
      )}&components=country:in${biasParam}&sessiontoken=${sessionToken}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const body = await res.json();
    if (body?.status !== 'OK') return [];
    return (body.predictions || []).slice(0, 6).map(p => ({
      title: p.structured_formatting?.main_text || p.description,
      address: p.description,
      placeId: p.place_id,
    }));
  } catch {
    return [];
  }
}

export async function resolvePlaceSelection(result) {
  if (Array.isArray(result?.coords) && result.coords.length === 2) {
    return {title: result.title, address: result.address || result.title, coords: result.coords};
  }
  if (result?.placeId && GOOGLE_MAPS_API_KEY) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${result.placeId}&fields=formatted_address,geometry,name&key=${GOOGLE_MAPS_API_KEY}`,
      );
      const body = await res.json();
      const loc = body?.result?.geometry?.location;
      if (loc) {
        return {
          title: result.title || body.result.name,
          address: body.result.formatted_address || result.address || result.title,
          coords: [loc.lng, loc.lat],
        };
      }
    } catch {
      // fall through to plain geocode below
    }
  }
  const coords = await geocodeAddress(result?.address || result?.title || '');
  return {title: result?.title || '', address: result?.address || result?.title || '', coords};
}
