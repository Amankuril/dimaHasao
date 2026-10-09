/**
 * Ported from Frontend/src/modules/Taxi/shared/api/axiosInstance.js.
 *
 * Simplified for RN: this app only ever holds the 'user' role (driver/admin
 * are separate future APKs), so all the multi-role token juggling
 * (driver/owner/admin, pathname-based role sniffing) is dropped — there is
 * exactly one token to resolve. AsyncStorage being async (vs. localStorage)
 * is the other real change: the request interceptor awaits it, which axios
 * supports natively.
 *
 * Kept as-is because downstream screens rely on the exact behaviour:
 *  - the deduped-GET cache for a few hot, frequently-remounted endpoints
 *  - the "compatible response view" Proxy, which lets a screen read
 *    `response.someField` whether the server nested it under `.data` zero,
 *    one or two times — the web screens being ported assume this shape.
 */
import axios from 'axios';
import {DeviceEventEmitter} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {TAXI_API_BASE_URL} from './config';
import {base64Decode} from '../../utils/base64';

const api = axios.create({
  baseURL: TAXI_API_BASE_URL,
  timeout: 30000,
  headers: {'Content-Type': 'application/json'},
});

const compatibleResponseCache = new WeakMap();

const isCompatibleResponseCandidate = value => {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return false;
  if (typeof FormData !== 'undefined' && value instanceof FormData) return false;
  if (value instanceof Date) return false;
  return Array.isArray(value) || Object.prototype.toString.call(value) === '[object Object]';
};

const createCompatibleResponseView = payload => {
  if (!isCompatibleResponseCandidate(payload)) return payload;
  if (compatibleResponseCache.has(payload)) return compatibleResponseCache.get(payload);

  const proxy = new Proxy(payload, {
    get(target, prop, receiver) {
      if (prop === '__raw') return target;

      if (prop === 'data') {
        const nestedData = target?.data;
        if (nestedData === undefined || nestedData === target) return receiver;
        return createCompatibleResponseView(nestedData);
      }

      const directValue = Reflect.get(target, prop, receiver);
      if (directValue !== undefined) return createCompatibleResponseView(directValue);

      const nestedData = target?.data;
      if (nestedData && (Array.isArray(nestedData) || Object.prototype.toString.call(nestedData) === '[object Object]')) {
        if (prop in nestedData) return createCompatibleResponseView(nestedData[prop]);
        if (prop === 'results' && Array.isArray(nestedData)) return createCompatibleResponseView(nestedData);
      }

      return undefined;
    },
    has(target, prop) {
      if (prop in target) return true;
      const nestedData = target?.data;
      return Boolean(
        nestedData &&
          (Array.isArray(nestedData) || Object.prototype.toString.call(nestedData) === '[object Object]') &&
          prop in nestedData,
      );
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
    /^\/rides\/active\/me$/.test(requestPath) ||
    /^\/deliveries\/active\/me$/.test(requestPath) ||
    /^\/common\/payment-gateway$/.test(requestPath) ||
    /^\/(countries|common\/ride_modules)$/.test(requestPath)
  );
};

const getTokenPayload = token => {
  if (!token || typeof token !== 'string') return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(base64Decode(normalized));
    if (decoded && typeof decoded.exp === 'number' && Date.now() / 1000 >= decoded.exp) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

/** The one user token, wherever this login actually wrote it. */
async function readUserToken() {
  const [userToken, genericToken, foodToken] = await AsyncStorage.multiGet([
    'userToken',
    'token',
    'user_accessToken',
  ]).then(pairs => pairs.map(([, v]) => v));

  return [userToken, genericToken, foodToken].find(token => {
    if (!token) return false;
    const role = String(getTokenPayload(token)?.role || '').toLowerCase();
    return !role || role === 'user';
  });
}

async function getDedupedRequestKey(url, config) {
  const params = config?.params ? JSON.stringify(config.params) : '';
  const token = (await readUserToken()) || '';
  return `${String(url || '')}|${params}|${token}`;
}

api.interceptors.request.use(
  async config => {
    const existingAuthorization = config.headers?.Authorization || config.headers?.authorization;
    if (existingAuthorization) return config;

    const token = await readUserToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

api.interceptors.response.use(
  response => createCompatibleResponseView(response.data),
  async error => {
    if (error.response) {
      const serverMessage = String(error.response.data?.message || '');
      const authHeader = error.config?.headers?.Authorization || error.config?.headers?.authorization || '';
      const token = String(authHeader).startsWith('Bearer ') ? String(authHeader).slice(7) : '';

      const is401 = error.response.status === 401;
      const is403 = error.response.status === 403;
      const isStaleMessage = ['jwt expired', 'invalid authorization token'].includes(
        serverMessage.trim().toLowerCase(),
      );
      const isDeactivatedOrDeleted =
        serverMessage === 'Authenticated account no longer exists' ||
        serverMessage === 'User account is not active';

      const shouldClearAuth = (is401 || isStaleMessage || (is403 && isDeactivatedOrDeleted)) && Boolean(token);

      if (shouldClearAuth) {
        await AsyncStorage.multiRemove(['userToken', 'userInfo', 'token', 'role', 'chatRole']);
        DeviceEventEmitter.emit('app:auth-stale', {role: 'user', message: serverMessage, token});
      }

      return Promise.reject({...error.response.data, status: error.response.status});
    }

    return Promise.reject({message: 'Network error or server down.'});
  },
);

const rawGet = api.get.bind(api);

api.get = async (url, config = {}) => {
  if (!isDedupedGet(url)) {
    return rawGet(url, config);
  }

  const key = await getDedupedRequestKey(url, config);
  const now = Date.now();
  const cached = recentDedupedGetResponses.get(key);
  if (cached && now - cached.timestamp < DEDUPED_GET_TTL_MS) {
    return cached.data;
  }

  const pending = dedupedGetRequests.get(key);
  if (pending) return pending;

  const request = rawGet(url, config)
    .then(data => {
      recentDedupedGetResponses.set(key, {data, timestamp: Date.now()});
      return data;
    })
    .finally(() => dedupedGetRequests.delete(key));

  dedupedGetRequests.set(key, request);
  return request;
};

export default api;
