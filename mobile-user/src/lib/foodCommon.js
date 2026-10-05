import { API_ORIGIN } from '../api/client';

/*
 * Port of Frontend/src/modules/Food/utils/common.js. /uploads is served from
 * the API's own origin (the web's ASSET_BASE_URL fallback).
 */

const ASSET_BASE_URL = API_ORIGIN;

const rewriteUploadsUrl = (absoluteUrl) => {
  const match = String(absoluteUrl).match(/^https?:\/\/[^/]+(\/[^?#]*)?(\?[^#]*)?/i);
  if (!match) return absoluteUrl;
  const pathname = match[1] || '';
  const up = pathname.match(/\/uploads\/(.+)$/i);
  if (!up) return absoluteUrl;
  const filename = up[1];
  if (!filename || filename.includes('..')) return absoluteUrl;
  return `${ASSET_BASE_URL}/uploads/${filename}${match[2] || ''}`;
};

/** Normalizes an image URL: relative paths and /uploads always load from the live server. */
export const normalizeImageUrl = (imageUrl, backendOrigin = '') => {
  if (typeof imageUrl !== 'string') return '';
  const trimmed = imageUrl.trim();
  if (!trimmed || /^data:/i.test(trimmed) || /^(blob|file|content):/i.test(trimmed)) return trimmed;

  const originToUse = backendOrigin || ASSET_BASE_URL;

  let normalized = trimmed
    .replace(/\\/g, '/')
    .replace(/^(https?):\/(?!\/)/i, '$1://')
    .replace(/^(https?:\/\/)(https?:\/\/)/i, '$1');

  if (/^\/\//.test(normalized)) normalized = `https:${normalized}`;

  if (/^https?:\/\//i.test(normalized)) return rewriteUploadsUrl(normalized);

  if (/uploads\//i.test(normalized) || normalized.startsWith('/uploads')) {
    const filename = normalized.replace(/^.*\/uploads\//i, '').replace(/^\/+/, '');
    if (filename && !filename.includes('..')) return `${ASSET_BASE_URL}/uploads/${filename}`;
  }

  const absolutePath = normalized.startsWith('/')
    ? `${originToUse}${normalized}`
    : `${originToUse}/${normalized.replace(/^\.?\/*/, '')}`;
  return rewriteUploadsUrl(absolutePath);
};

export const extractImages = (source, backendOrigin = '') => {
  if (!source) return [];
  const normalize = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return normalizeImageUrl(val, backendOrigin);
    if (typeof val === 'object') {
      const src = val.url || val.secure_url || val.imageUrl || val.image || val.src || '';
      return typeof src === 'string' ? normalizeImageUrl(src, backendOrigin) : '';
    }
    return '';
  };
  const candidates = Array.isArray(source) ? source.map(normalize) : [normalize(source)];
  return candidates.filter(Boolean);
};

/** Haversine distance in kilometres. */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const formatDistance = (distanceInKm) => {
  if (distanceInKm === null || distanceInKm === undefined) return '1.2 km';
  if (distanceInKm >= 1) return `${distanceInKm.toFixed(1)} km`;
  return `${Math.round(distanceInKm * 1000)} m`;
};

export const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Removes Google Plus Codes (e.g. RW52+FGM) from address strings. */
export const removePlusCode = (addressStr) => {
  if (!addressStr || typeof addressStr !== 'string') return addressStr;
  return addressStr
    .replace(/\b[A-Z0-9]{2,8}\+[A-Z0-9]{2,5}[,\s]*/gi, '')
    .replace(/^[A-Z0-9]{2,8}\+[A-Z0-9]{2,5}[,\s]*/gi, '')
    .trim()
    .replace(/^,\s*/, '')
    .replace(/,\s*$/, '');
};
