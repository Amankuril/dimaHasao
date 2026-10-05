/*
 * Driving routes. The web calls Route.computeRoutes from the Maps JS SDK,
 * which is the Google Routes API; this calls the same API over REST with the
 * same browser key (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY).
 */

const KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

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
  if (!KEY) throw new Error('No Google Maps key');
  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: 'DRIVE',
    }),
  });
  if (!res.ok) throw new Error(`Routes API ${res.status}`);
  const body = await res.json();
  const encoded = body?.routes?.[0]?.polyline?.encodedPolyline;
  if (!encoded) throw new Error('No route path returned');
  return decodePath(encoded);
}
