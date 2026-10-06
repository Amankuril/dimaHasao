import { GOOGLE_MAPS_API_KEY, HAS_VALID_GOOGLE_MAPS_KEY } from './googleMaps';

/*
 * Port of Taxi/shared/utils/googleRoutes.js. The web calls the Maps JS Routes / DirectionsService; native has no JS
 * SDK, so this asks the same two Google services over HTTPS with the public Maps key: the Routes API first, then the
 * classic Directions API. Same result shape: { status, path: [{lat,lng}], legs: [{distanceMeters, duration:'123s'}], route }.
 */
const isFinitePoint = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));

const normalizePoint = (point) => {
  if (!point) return null;
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const toWaypoint = (p) => {
  if (!p) return null;
  if (typeof p === 'string') return p.trim() ? { address: p.trim() } : null;
  const loc = p.location || p;
  if (typeof loc === 'string') return { address: loc };
  const pt = normalizePoint(loc);
  return pt ? { location: { latLng: { latitude: pt.lat, longitude: pt.lng } } } : null;
};

export const sumComputedRouteLegs = (legs = []) =>
  (Array.isArray(legs) ? legs : []).reduce(
    (totals, leg) => ({
      distanceMeters: totals.distanceMeters + Number(leg?.distanceMeters || 0),
      durationSeconds:
        totals.durationSeconds +
        (Number.isFinite(Number(leg?.duration)) ? Number(leg.duration) : Number((/^([\d.]+)s$/i.exec(String(leg?.duration || '').trim()) || [])[1] || 0)),
    }),
    { distanceMeters: 0, durationSeconds: 0 },
  );

/** Google's encoded polyline -> [{lat,lng}] */
export function decodePolyline(encoded = '') {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

const viaRoutesApi = async ({ origin, destination, intermediates, region }) => {
  const o = toWaypoint(origin);
  const d = toWaypoint(destination);
  if (!o || !d) return null;
  const body = { origin: o, destination: d, travelMode: 'DRIVE' };
  const mids = (intermediates || []).map(toWaypoint).filter(Boolean);
  if (mids.length) body.intermediates = mids;
  if (region) body.regionCode = String(region).trim().toLowerCase();
  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const route = json?.routes?.[0];
  const path = route?.polyline?.encodedPolyline ? decodePolyline(route.polyline.encodedPolyline) : [];
  if (!route || !path.length) return null;
  return { status: 'OK', path, legs: Array.isArray(route.legs) ? route.legs : [], route };
};

const asParam = (p) => {
  if (typeof p === 'string') return p;
  const pt = normalizePoint(p?.location || p);
  return pt ? `${pt.lat},${pt.lng}` : '';
};

const viaDirectionsApi = async ({ origin, destination, intermediates, region }) => {
  const params = new URLSearchParams({ origin: asParam(origin), destination: asParam(destination), mode: 'driving', key: GOOGLE_MAPS_API_KEY });
  const mids = (intermediates || []).map(asParam).filter(Boolean);
  if (mids.length) params.set('waypoints', mids.join('|'));
  if (region) params.set('region', String(region).trim().toLowerCase());
  const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`);
  const json = await res.json();
  const route = json?.routes?.[0];
  if (json?.status !== 'OK' || !route) return { status: json?.status || 'DIRECTIONS_FAILED', path: [], legs: [], route: null };
  return {
    status: 'OK',
    path: decodePolyline(route.overview_polyline?.points || ''),
    legs: (route.legs || []).map((leg) => ({ distanceMeters: leg.distance?.value || 0, duration: `${leg.duration?.value || 0}s` })),
    route,
  };
};

export const computeDrivingRoute = async ({ origin, destination, intermediates = [], region } = {}) => {
  if (!HAS_VALID_GOOGLE_MAPS_KEY || !isFinitePoint(origin) || !isFinitePoint(destination)) {
    return { status: 'LIBRARY_UNAVAILABLE', path: [], legs: [], route: null };
  }
  try {
    const first = await viaRoutesApi({ origin, destination, intermediates, region });
    if (first) return first;
  } catch {
    /* fall back to Directions */
  }
  try {
    return await viaDirectionsApi({ origin, destination, intermediates, region });
  } catch {
    return { status: 'ROUTE_COMPUTE_FAILED', path: [], legs: [], route: null };
  }
};
