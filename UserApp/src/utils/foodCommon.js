/**
 * Ported from Frontend/src/modules/Food/utils/common.js — the pure helpers
 * only (normalizeImageUrl/extractImages already exist in src/utils/imageUrl.js).
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const formatDistance = distanceInKm => {
  if (distanceInKm === null || distanceInKm === undefined) return '1.2 km';
  if (distanceInKm >= 1) return `${distanceInKm.toFixed(1)} km`;
  return `${Math.round(distanceInKm * 1000)} m`;
};

export const slugify = value =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Removes Google Plus Codes (e.g. RW52+FGM) from address strings. */
export const removePlusCode = addressStr => {
  if (!addressStr || typeof addressStr !== 'string') return addressStr;
  return addressStr
    .replace(/\b[A-Z0-9]{2,8}\+[A-Z0-9]{2,5}[,\s]*/gi, '')
    .replace(/^[A-Z0-9]{2,8}\+[A-Z0-9]{2,5}[,\s]*/gi, '')
    .trim()
    .replace(/^,\s*/, '')
    .replace(/,\s*,/g, ', ')
    .replace(/,\s*$/, '');
};
