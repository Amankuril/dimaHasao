/**
 * Ported from Frontend/src/services/api/index.js's publicGetOnce helper and
 * adminAPI.getPublicCategories (the one adminAPI method that's actually a
 * public, user-facing read — the rest of that object is admin-dashboard-only
 * and out of scope for this app).
 */
import apiClient from '../api/axios';

function stableStringify(value) {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

const inFlight = new Map();
const cached = new Map();
const CACHE_TTL_MS = 3000;

export const publicGetOnce = (url, config = {}) => {
  const safeUrl = typeof url === 'string' ? url.trim() : '';
  const {noCache, params, ...axiosConfig} = config || {};
  if (!safeUrl) return Promise.reject(new Error('url is required'));

  if (noCache) return apiClient.get(safeUrl, {params, ...axiosConfig});

  const keyParams = params && typeof params === 'object' ? {...params} : params;
  if (keyParams && typeof keyParams === 'object') delete keyParams._ts;
  const key = `GET:${safeUrl}:${stableStringify(keyParams)}`;

  const now = Date.now();
  const hit = cached.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) return Promise.resolve(hit.res);
  if (inFlight.has(key)) return inFlight.get(key);

  const p = apiClient
    .get(safeUrl, {params, ...axiosConfig})
    .then(res => {
      cached.set(key, {at: Date.now(), res});
      return res;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
};

export const getPublicCategories = (params = {}, config = {}) => apiClient.get('/food/restaurant/categories/public', {params: params ?? {}, ...config});

export default {publicGetOnce, getPublicCategories};
