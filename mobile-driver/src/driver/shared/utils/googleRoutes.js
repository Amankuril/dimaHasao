import apiClient from '../../../api/client';

/*
 * Driving routes. The Google key lives on the server, so the app asks the
 * backend (POST /maps/route), which calls Routes API with a Directions API
 * fallback. Result shape is unchanged:
 * { status, path: [{lat,lng}], legs: [{distanceMeters, duration:'123s'}], route }.
 */
const isFinitePoint = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));

const normalizePoint = (point) => {
  if (!point) return null;
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
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

export const computeDrivingRoute = async ({ origin, destination, intermediates = [], region } = {}) => {
  if (!isFinitePoint(origin) || !isFinitePoint(destination)) {
    return { status: 'LIBRARY_UNAVAILABLE', path: [], legs: [], route: null };
  }
  try {
    const response = await apiClient.post(
      '/maps/route',
      {
        origin: normalizePoint(origin),
        destination: normalizePoint(destination),
        intermediates: (intermediates || []).map((p) => normalizePoint(p?.location || p)).filter(Boolean),
        region,
      },
      { auth: 'taxi' },
    );
    const data = response?.data?.data;
    const path = data?.encodedPolyline ? decodePolyline(data.encodedPolyline) : [];
    if (data?.status !== 'OK' || !path.length) {
      return { status: data?.status || 'DIRECTIONS_FAILED', path: [], legs: [], route: null };
    }
    return {
      status: 'OK',
      path,
      legs: (data.legs || []).map((leg) => ({ distanceMeters: leg.distanceMeters || 0, duration: `${leg.durationSeconds || 0}s` })),
      route: data,
    };
  } catch {
    return { status: 'ROUTE_COMPUTE_FAILED', path: [], legs: [], route: null };
  }
};
