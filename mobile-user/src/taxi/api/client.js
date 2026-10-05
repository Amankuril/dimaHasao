import api, { getTaxiToken } from '../../api/client';
import { events } from '../../lib/events';
import { API_BASE_URL } from './runtimeConfig';

/*
 * Port of Taxi/shared/api/axiosInstance.js on top of the app's client:
 * - base URL <api>/taxi;
 * - the response is the response BODY (`res.data` is the nested `data` when there is one), wrapped in the web's
 *   "compatible view" proxy so `res.results` / `res.data.results` / `res.data.data.results` all read the same;
 * - errors reject with `{ ...responseBody, status }` (or `{ message: 'Network error or server down.' }`);
 * - which token goes out follows the web interceptor: user routes carry the taxi token, public user routes
 *   and the admin routes carry none (the user app holds no admin token).
 */
const cache = new WeakMap();

const isCandidate = (value) => {
  if (!value || typeof value !== 'object') return false;
  if (typeof FormData !== 'undefined' && value instanceof FormData) return false;
  if (value instanceof Date) return false;
  return Array.isArray(value) || Object.prototype.toString.call(value) === '[object Object]';
};

const createCompatibleResponseView = (payload) => {
  if (!isCandidate(payload)) return payload;
  if (cache.has(payload)) return cache.get(payload);
  const proxy = new Proxy(payload, {
    get(target, prop, receiver) {
      if (prop === '__raw') return target;
      if (prop === 'data') {
        const nested = target?.data;
        if (nested === undefined || nested === target) return receiver;
        return createCompatibleResponseView(nested);
      }
      const direct = Reflect.get(target, prop, receiver);
      if (direct !== undefined) return createCompatibleResponseView(direct);
      const nested = target?.data;
      if (nested && isCandidate(nested) && typeof prop === 'string' && prop in nested) {
        return createCompatibleResponseView(nested[prop]);
      }
      return undefined;
    },
    has(target, prop) {
      if (prop in target) return true;
      const nested = target?.data;
      return Boolean(nested && isCandidate(nested) && prop in nested);
    },
  });
  cache.set(payload, proxy);
  return proxy;
};

const PUBLIC_USER = /^\/users\/(bootstrap|app-modules|settings|vehicle-types|register|signup|login|profile-image|auth\/send-otp|auth\/verify-otp|otp-login)(\/|$)/;
const ADMIN_ROUTE = /^\/(admin(\/|$)|countries|common\/ride_modules|types\/|on-boarding(?:-|\/|$)|roles\/|permissions\/)/;

const authFor = (path) => {
  const p = String(path || '').split('?')[0];
  if (PUBLIC_USER.test(p) || ADMIN_ROUTE.test(p)) return false;
  return 'taxi';
};

const STALE = new Set(['jwt expired', 'invalid authorization token']);

const call = async (method, path, body, config = {}) => {
  const explicit = config?.headers?.Authorization || config?.headers?.authorization;
  const auth = explicit ? undefined : authFor(path);
  const hadToken = auth !== false && Boolean(getTaxiToken());
  const opts = {
    params: config.params,
    signal: config.signal,
    timeout: config.timeout,
    headers: config.headers,
    ...(explicit ? {} : { auth }),
  };
  const url = `${API_BASE_URL}${String(path).startsWith('/') ? '' : '/'}${path}`;
  try {
    const res = method === 'get' || method === 'delete' ? await api[method](url, { ...opts, data: body }) : await api[method](url, body, opts);
    return createCompatibleResponseView(res.data);
  } catch (error) {
    if (error?.response) {
      const data = error.response.data;
      const message = String(data?.message || '');
      const stale = error.response.status === 401 || STALE.has(message.trim().toLowerCase());
      if (stale && hadToken) events.emit('app:auth-stale', { role: 'user', message, token: getTaxiToken() });
      throw { ...(data && typeof data === 'object' ? data : {}), status: error.response.status };
    }
    if (error?.code === 'ABORTED') throw error;
    throw { message: 'Network error or server down.' };
  }
};

const taxiApi = {
  get: (path, config) => call('get', path, undefined, config),
  delete: (path, config) => call('delete', path, config?.data, config),
  post: (path, body, config) => call('post', path, body, config),
  put: (path, body, config) => call('put', path, body, config),
  patch: (path, body, config) => call('patch', path, body, config),
};

export default taxiApi;
