/**
 * Ported from Frontend/src/modules/Food/utils/common.js (normalizeImageUrl)
 * + shared/utils/assetUrl.js (apiOrigin). A mobile build always carries an
 * absolute API_BASE_URL (no same-origin trick like the web app), so
 * `apiOrigin` is just that URL's origin, and there's no `window` to read a
 * protocol from — uploads always resolve to https.
 */
import Config from 'react-native-config';
import {API_BASE_URL} from '../services/api/config';

export const apiOrigin = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return '';
  }
})();

const ASSET_BASE_URL = String(Config.ASSET_BASE_URL || apiOrigin).replace(/\/$/, '');

const rewriteUploadsUrl = absoluteUrl => {
  try {
    const parsed = new URL(absoluteUrl);
    const match = parsed.pathname.match(/\/uploads\/(.+)$/i);
    if (!match) return absoluteUrl;
    const filename = match[1];
    if (!filename || filename.includes('..')) return absoluteUrl;
    return `${ASSET_BASE_URL}/uploads/${filename}${parsed.search || ''}`;
  } catch {
    return absoluteUrl;
  }
};

/** Normalize a stored image path/URL so /uploads always loads from the live server. */
export const normalizeImageUrl = (imageUrl, backendOrigin = '') => {
  if (typeof imageUrl !== 'string') return '';
  const trimmed = imageUrl.trim();
  if (!trimmed || /^data:/i.test(trimmed) || /^blob:/i.test(trimmed)) return trimmed;

  const originToUse = backendOrigin || ASSET_BASE_URL;

  let normalized = trimmed
    .replace(/\\/g, '/')
    .replace(/^(https?):\/(?!\/)/i, '$1://')
    .replace(/^(https?:\/\/)(https?:\/\/)/i, '$1');

  if (/^\/\//.test(normalized)) normalized = `https:${normalized}`;

  if (/^(https?:)?\/\//i.test(normalized)) {
    return rewriteUploadsUrl(normalized);
  }

  if (/uploads\//i.test(normalized) || normalized.startsWith('/uploads')) {
    const filename = normalized.replace(/^.*\/uploads\//i, '').replace(/^\/+/, '');
    if (filename && !filename.includes('..')) {
      return `${ASSET_BASE_URL}/uploads/${filename}`;
    }
  }

  const absolutePath = normalized.startsWith('/')
    ? `${originToUse}${normalized}`
    : `${originToUse}/${normalized.replace(/^\.?\/*/, '')}`;
  return rewriteUploadsUrl(absolutePath);
};

/** Extract a list of image URLs from a string, array, or object with image fields. */
export const extractImages = (source, backendOrigin = '') => {
  if (!source) return [];
  const normalize = val => {
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
