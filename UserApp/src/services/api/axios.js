/**
 * Central API client for the backend (auth + taxi/food/hotel/tours/festivals).
 *
 * Ported from Frontend/src/services/api/axios.js. The module-aware token
 * storage/refresh logic is unchanged; the one real difference is that
 * AsyncStorage is async where localStorage was sync, so the interceptors
 * below `await` every read/write (axios supports an interceptor returning a
 * Promise).
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from './config';

const baseURL = API_BASE_URL || undefined;

const apiClient = axios.create({
  baseURL,
  timeout: 30000,
  headers: {'Content-Type': 'application/json'},
});

function getModuleFromUrl(url = '') {
  const u = typeof url === 'string' ? url : url?.url || '';
  if (!u) return 'user';

  const normalized = u.toLowerCase();

  if (
    normalized.includes('/admin/') ||
    normalized.includes('/food/admin/') ||
    normalized.includes('/food/auth/admin') ||
    normalized.includes('/auth/admin') ||
    normalized.includes('admin/login')
  ) {
    return 'admin';
  }

  if (
    normalized.includes('/food/delivery') ||
    normalized.includes('/auth/delivery') ||
    normalized.includes('/delivery/')
  ) {
    return 'delivery';
  }

  if (
    normalized.includes('/food/restaurant/') ||
    normalized.includes('/auth/restaurant') ||
    normalized.includes('/restaurant/')
  ) {
    if (normalized.includes('/food/restaurants') && !normalized.includes('/food/restaurant/')) {
      return 'user';
    }
    return 'restaurant';
  }

  return 'user';
}

function getModuleFromConfig(config) {
  if (config?.contextModule) return config.contextModule;
  return getModuleFromUrl(config?.url);
}

async function getAccessToken(config) {
  const module = getModuleFromConfig(config);
  try {
    const moduleToken = await AsyncStorage.getItem(`${module}_accessToken`);
    if (moduleToken) return moduleToken;
    return await AsyncStorage.getItem('accessToken');
  } catch {
    return null;
  }
}

async function getRefreshToken(module) {
  try {
    const moduleRefreshToken = await AsyncStorage.getItem(`${module}_refreshToken`);
    if (moduleRefreshToken) return moduleRefreshToken;
    return await AsyncStorage.getItem('refreshToken');
  } catch {
    return null;
  }
}

async function clearModuleAuth(module) {
  try {
    await AsyncStorage.multiRemove([
      `${module}_accessToken`,
      `${module}_refreshToken`,
      `${module}_authenticated`,
      `${module}_user`,
    ]);
  } catch {
    // best-effort
  }
}

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeToRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(newToken, module) {
  refreshSubscribers.forEach(cb => cb(newToken, module));
  refreshSubscribers = [];
}

function onRefreshFailed(module) {
  clearModuleAuth(module);
  refreshSubscribers.forEach(cb => cb(null, module));
  refreshSubscribers = [];
  authEvents.emit('authRefreshFailed', {module});
}

// RN has no `window` to dispatch CustomEvents on — a tiny emitter stands in
// so AuthProvider/BookingContext can react to a refresh failing or landing.
export const authEvents = {
  _listeners: {},
  on(event, cb) {
    (this._listeners[event] ||= []).push(cb);
    return () => {
      this._listeners[event] = (this._listeners[event] || []).filter(l => l !== cb);
    };
  },
  emit(event, detail) {
    (this._listeners[event] || []).forEach(cb => cb(detail));
  },
};

apiClient.interceptors.request.use(
  async config => {
    config.contextModule = getModuleFromConfig(config);

    // Let RN's FormData set its own multipart boundary (e.g. image uploads).
    if (config.data instanceof FormData && config.headers?.['Content-Type']) {
      delete config.headers['Content-Type'];
    }

    const token = await getAccessToken(config);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  err => Promise.reject(err),
);

apiClient.interceptors.response.use(
  response => response,
  async err => {
    const original = err?.config;
    if (err?.response?.status === 429) {
      return Promise.reject(err);
    }
    if (err?.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(err);
    }
    const module = original.contextModule || getModuleFromUrl(original.url);
    const refreshToken = await getRefreshToken(module);
    if (!refreshToken) {
      await clearModuleAuth(module);
      return Promise.reject(err);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeToRefresh(newToken => {
          if (newToken) {
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(original));
          } else {
            reject(err);
          }
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshUrl = baseURL
        ? `${baseURL}/food/auth/refresh-token`
        : '/food/auth/refresh-token';
      const {data} = await axios.post(refreshUrl, {refreshToken}, {timeout: 10000});
      const newAccessToken = data?.data?.accessToken || data?.accessToken;
      if (newAccessToken) {
        try {
          await AsyncStorage.setItem(`${module}_accessToken`, newAccessToken);
          authEvents.emit('authRefreshed', {module, token: newAccessToken});
        } catch {
          // token refreshed but caching the write failed — request still proceeds
        }
        onRefreshed(newAccessToken, module);
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(original);
      }
    } catch (refreshErr) {
      const status = refreshErr?.response?.status;
      if (status === 401 || status === 403 || status === 400) {
        onRefreshFailed(module);
      } else {
        refreshSubscribers.forEach(cb => cb(null, module));
        refreshSubscribers = [];
      }
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }

    onRefreshFailed(module);
    return Promise.reject(err);
  },
);

export default apiClient;
