/**
 * Ported from the public/user-facing methods of Frontend/src/services/api/index.js's
 * restaurantAPI (that one object mixes restaurant-partner management with
 * public reads — only the public reads are relevant to this app). The
 * in-flight+short-TTL dedup wrappers (getPublicRestaurantsOnce etc.) are
 * ported too, same purpose here as on web: multiple screens/effects asking
 * for the same list within a few seconds share one request.
 */
import apiClient from '../api/axios';

function stableStringify(value) {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function createInFlightCache({ttlMs}) {
  const inFlight = new Map();
  const cached = new Map();

  const getCached = key => {
    const hit = cached.get(key);
    if (!hit) return null;
    if (Date.now() - hit.t > ttlMs) {
      cached.delete(key);
      return null;
    }
    return hit.v;
  };

  const getOrCreate = (key, factory) => {
    const cachedValue = getCached(key);
    if (cachedValue) return Promise.resolve(cachedValue);
    if (inFlight.has(key)) return inFlight.get(key);
    const p = Promise.resolve()
      .then(factory)
      .then(res => {
        cached.set(key, {t: Date.now(), v: res});
        return res;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, p);
    return p;
  };

  return {getOrCreate};
}

const publicRestaurantsCache = createInFlightCache({ttlMs: 3000});
const publicRestaurantsUnder250Cache = createInFlightCache({ttlMs: 3000});
const publicRestaurantMenuCache = createInFlightCache({ttlMs: 3000});
const publicRestaurantOutletTimingsCache = createInFlightCache({ttlMs: 3000});
const serviceabilityInflight = new Map();

const getPublicRestaurantsOnce = (params = {}, config = {}) => {
  const {noCache, ...axiosConfig} = config || {};
  if (noCache) return apiClient.get('/food/restaurant/restaurants', {params: {limit: 40, ...params}, ...axiosConfig});
  const keyParams = {limit: 40, ...params};
  delete keyParams._ts;
  const key = `restaurants:${stableStringify(keyParams)}`;
  return publicRestaurantsCache.getOrCreate(key, () => apiClient.get('/food/restaurant/restaurants', {params: {limit: 40, ...params}, ...axiosConfig}));
};

const getPublicRestaurantsUnder250Once = (params = {}, config = {}) => {
  const {noCache, ...axiosConfig} = config || {};
  if (noCache) return apiClient.get('/food/restaurant/under-250', {params: params ?? {}, ...axiosConfig});
  const keyParams = params ?? {};
  delete keyParams._ts;
  const key = `under-250:${stableStringify(keyParams)}`;
  return publicRestaurantsUnder250Cache.getOrCreate(key, () => apiClient.get('/food/restaurant/under-250', {params: params ?? {}, ...axiosConfig}));
};

const getPublicRestaurantMenuOnce = (id, config = {}) => {
  const safeId = String(id || '').trim();
  const {noCache, ...axiosConfig} = config || {};
  if (!safeId) return Promise.resolve({data: {success: false, data: null}});
  if (noCache) return apiClient.get(`/food/restaurant/restaurants/${safeId}/menu`, {...axiosConfig});
  const key = `menu:${safeId}`;
  return publicRestaurantMenuCache.getOrCreate(key, () => apiClient.get(`/food/restaurant/restaurants/${safeId}/menu`, {...axiosConfig}));
};

const getPublicRestaurantOutletTimingsOnce = (id, config = {}) => {
  const safeId = String(id || '').trim();
  const {noCache, ...axiosConfig} = config || {};
  if (!safeId) return Promise.resolve({data: {success: false, data: null}});
  if (noCache) return apiClient.get(`/food/restaurant/restaurants/${safeId}/outlet-timings`, {...axiosConfig});
  const key = `outletTimings:${safeId}`;
  return publicRestaurantOutletTimingsCache.getOrCreate(key, () => apiClient.get(`/food/restaurant/restaurants/${safeId}/outlet-timings`, {...axiosConfig}));
};

export const restaurantApi = {
  getRestaurants: (params = {}, config = {}) => getPublicRestaurantsOnce(params, config),
  getRestaurantsUnder250: (params = {}, config = {}) => getPublicRestaurantsUnder250Once(params, config),
  getRestaurantById: (id, config = {}) => apiClient.get(`/food/restaurant/restaurants/${String(id)}`, {...config}),
  getRestaurantServiceability: (id, zoneId, config = {}) => {
    const key = `${String(id)}:${String(zoneId || '')}`;
    const pending = serviceabilityInflight.get(key);
    if (pending) return pending;
    const request = apiClient
      .get(`/food/restaurant/restaurants/${String(id)}/serviceability`, {params: {zoneId: String(zoneId || '')}, ...config})
      .finally(() => serviceabilityInflight.delete(key));
    serviceabilityInflight.set(key, request);
    return request;
  },
  getMenuByRestaurantId: (id, config = {}) => getPublicRestaurantMenuOnce(id, config),
  getOutletTimingsByRestaurantId: (id, config = {}) => getPublicRestaurantOutletTimingsOnce(id, config),
  getAddonsByRestaurantId: (id, config = {}) => apiClient.get(`/food/restaurant/restaurants/${String(id)}/addons`, {...config}),
  getPublicOffers: (params = {}, config = {}) => apiClient.get('/food/restaurant/offers', {params, ...config}),
};

export default restaurantApi;
