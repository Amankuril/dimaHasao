import { api } from '../api/client';

/*
 * Driving routes. The Google key lives on the server, so the app asks the
 * backend (POST /maps/route) instead of calling Google itself.
 */

/** Google encoded-polyline decoder. */
export function decodePath(encoded) {
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

/** google.maps.geometry.encoding.encodePath equivalent. */
export function encodePath(path) {
  if (!path?.length) return null;
  let out = '';
  let prevLat = 0;
  let prevLng = 0;
  const enc = (v) => {
    let n = v < 0 ? ~(v << 1) : v << 1;
    let s = '';
    while (n >= 0x20) {
      s += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    return s + String.fromCharCode(n + 63);
  };
  for (const p of path) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    out += enc(lat - prevLat) + enc(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return out;
}

export async function computeDrivingRoute(origin, destination) {
  const res = await api.post('/maps/route', {
    origin: { lat: origin.lat, lng: origin.lng },
    destination: { lat: destination.lat, lng: destination.lng },
  });
  const encoded = res?.data?.data?.encodedPolyline;
  if (!encoded) throw new Error('No route path returned');
  return decodePath(encoded);
}
