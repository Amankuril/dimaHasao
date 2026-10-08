/* Ported from Frontend/src/modules/Taxi/shared/api/axiosInstance.js. */
import { createApi, getAuthToken, API_URL } from '../../../api/client';
import { API_BASE_URL } from './runtimeConfig';

/*
 * The web's axios instance (baseURL = API_BASE_URL, i.e. /api/v1/taxi) on top
 * of the app client. The web picks a token per role from the URL; this app
 * only holds the admin session, so every request carries the admin token
 * (the client adds it). A request that passes its own Authorization header
 * (chatApi) keeps it, as on the web.
 */
const TAXI_PREFIX = API_BASE_URL.startsWith(API_URL) ? API_BASE_URL.slice(API_URL.length) || '/taxi' : '/taxi';
const client = createApi(TAXI_PREFIX);
const compatibleResponseCache = new WeakMap();
const isCompatibleResponseCandidate = (value) => {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    return false;
  }
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return false;
  }
  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return false;
  }
  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    return false;
  }
  if (value instanceof Date) {
    return false;
  }
  return Array.isArray(value) || Object.prototype.toString.call(value) === '[object Object]';
};
const createCompatibleResponseView = (payload) => {
  if (!isCompatibleResponseCandidate(payload)) {
    return payload;
  }
  if (compatibleResponseCache.has(payload)) {
    return compatibleResponseCache.get(payload);
  }
  const proxy = new Proxy(payload, {
    get(target, prop, receiver) {
      if (prop === '__raw') {
        return target;
      }
      if (prop === 'data') {
        const nestedData = target?.data;
        if (nestedData === undefined || nestedData === target) {
          return receiver;
        }
        return createCompatibleResponseView(nestedData);
      }
      const directValue = Reflect.get(target, prop, receiver);
      if (directValue !== undefined) {
        return createCompatibleResponseView(directValue);
      }
      const nestedData = target?.data;
      if (nestedData && (Array.isArray(nestedData) || Object.prototype.toString.call(nestedData) === '[object Object]')) {
        if (prop in nestedData) {
          return createCompatibleResponseView(nestedData[prop]);
        }
        if (prop === 'results' && Array.isArray(nestedData)) {
          return createCompatibleResponseView(nestedData);
        }
      }
      return undefined;
    },
    has(target, prop) {
      if (prop in target) {
        return true;
      }
      const nestedData = target?.data;
      return Boolean(nestedData && (Array.isArray(nestedData) || Object.prototype.toString.call(nestedData) === '[object Object]') && prop in nestedData);
    },
  });
  compatibleResponseCache.set(payload, proxy);
  return proxy;
};
const DEDUPED_GET_TTL_MS = 2500;
const dedupedGetRequests = new Map();
const recentDedupedGetResponses = new Map();
const isDedupedGet = (url = '') => {
  const requestPath = String(url || '').split('?')[0];
  return (
    /^\/users\/me$/.test(requestPath) ||
    /^\/drivers\/me$/.test(requestPath) ||
    /^\/rides\/active\/me$/.test(requestPath) ||
    /^\/deliveries\/active\/me$/.test(requestPath) ||
    /^\/admin\/general-settings\/[^/]+$/.test(requestPath) ||
    /^\/common\/payment-gateway$/.test(requestPath) ||
    /^\/admin\/(countries|service-locations|notification-channels)$/.test(requestPath) ||
    /^\/(countries|common\/ride_modules)$/.test(requestPath)
  );
};
const getDedupedRequestKey = (url = '', config = {}) => {
  const params = config?.params ? JSON.stringify(config.params) : '';
  const auth = config?.headers?.Authorization || config?.headers?.authorization || getAuthToken() || '';
  return `${String(url || '')}|${params}|${auth}`;
};

// Response handling as the web's interceptors: resolve with the response body
// (wrapped in the compatible view), reject with `{ ...body, status }`.
const toResponse = (response) => createCompatibleResponseView(response.data);
const toError = (error) => {
  if (error?.response) {
    const data = error.response.data;
    return Promise.reject({
      ...(data && typeof data === 'object' ? data : { message: error.message }),
      status: error.response.status,
    });
  }
  return Promise.reject({
    message: 'Network error or server down.',
  });
};

/*
 * `responseType: 'blob'` (report downloads): the body is a file, not JSON, so
 * it is fetched directly and resolved as a Blob, as axios does.
 */
const fetchBlob = async (url, config = {}) => {
  const params = config.params
    ? Object.entries(config.params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const full = `${API_BASE_URL}${String(url).startsWith('/') ? '' : '/'}${url}${params ? `${String(url).includes('?') ? '&' : '?'}${params}` : ''}`;
  const token = getAuthToken();
  let res;
  try {
    res = await fetch(full, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(config.headers || {}) } });
  } catch {
    return Promise.reject({ message: 'Network error or server down.' });
  }
  if (!res.ok) {
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    return Promise.reject({ ...data, status: res.status });
  }
  return res.blob();
};

// The web sends no token on the public rider/driver routes (bootstrap, OTP,
// onboarding); `auth: false` keeps that.
const isPublicRoute = (url = '') => {
  const requestPath = String(url || '').split('?')[0];
  return (
    /^\/users\/(bootstrap|app-modules|settings|vehicle-types|register|signup|login|profile-image|auth\/send-otp|auth\/verify-otp|otp-login)(\/|$)/.test(requestPath) ||
    /^\/drivers\/(register|login|auth\/send-otp|auth\/verify-otp|onboarding\/send-otp|onboarding\/verify-otp|onboarding\/personal|onboarding\/referral|onboarding\/vehicle|onboarding\/documents|onboarding\/complete|onboarding\/session\/|service-locations)(\/|$)/.test(
      requestPath,
    )
  );
};
const withAuth = (url, config = {}) => {
  const hasOwnAuth = config?.headers?.Authorization || config?.headers?.authorization;
  return !hasOwnAuth && isPublicRoute(url) ? { ...config, auth: false } : config;
};

const api = {
  get: (url, config = {}) =>
    config?.responseType === 'blob' || config?.responseType === 'arraybuffer'
      ? fetchBlob(url, config)
      : client.get(url, withAuth(url, config)).then(toResponse, toError),
  post: (url, data, config = {}) => client.post(url, data, withAuth(url, config)).then(toResponse, toError),
  put: (url, data, config = {}) => client.put(url, data, withAuth(url, config)).then(toResponse, toError),
  patch: (url, data, config = {}) => client.patch(url, data, withAuth(url, config)).then(toResponse, toError),
  delete: (url, config = {}) => client.delete(url, withAuth(url, config)).then(toResponse, toError),
};
const rawGet = api.get;
api.get = (url, config = {}) => {
  if (!isDedupedGet(url)) {
    return rawGet(url, config);
  }
  const key = getDedupedRequestKey(url, config);
  const now = Date.now();
  const cached = recentDedupedGetResponses.get(key);
  if (cached && now - cached.timestamp < DEDUPED_GET_TTL_MS) {
    return Promise.resolve(cached.data);
  }
  const pending = dedupedGetRequests.get(key);
  if (pending) {
    return pending;
  }
  const request = rawGet(url, config)
    .then((data) => {
      recentDedupedGetResponses.set(key, {
        data,
        timestamp: Date.now(),
      });
      return data;
    })
    .finally(() => {
      dedupedGetRequests.delete(key);
    });
  dedupedGetRequests.set(key, request);
  return request;
};
export default api;
