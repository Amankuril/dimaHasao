import apiClient from './client';
import * as authService from './auth';
import { localStore } from '../lib/storage';
import { prepareUploadFile } from '../lib/images';

/*
 * The user-app slice of Frontend/src/services/api/index.js, method for method.
 * Admin, restaurant-panel and delivery-partner methods are not here: they
 * belong to other apps.
 *
 * Two methods the web's user screens call do not exist on the web either
 * (`adminAPI.getPublicFeeSettings`, `restaurantAPI.getInventoryByRestaurantId`):
 * the call throws inside the screen's try/catch and the screen keeps its
 * defaults. They are left undefined here for the same result.
 */

export default apiClient;
export { API_ENDPOINTS } from './config';

/** Search API - unified search for user app */
export const searchAPI = {
  unifiedSearch: (params = {}) => apiClient.get('/food/search/unified', { params }),
  getAdminCategories: (params = {}) => apiClient.get('/food/search/categories/admin', { params }),
};

const emptyDataStub = () => Promise.resolve({ data: { success: false, data: null }, status: 200 });
const stub = () => Promise.resolve({ data: { success: false, message: 'Backend not connected', data: null }, status: 200 });

// The web stubs these so unimplemented routes are never hit.
export const api = {
  get: () => emptyDataStub(),
  post: () => emptyDataStub(),
  put: () => emptyDataStub(),
  patch: () => emptyDataStub(),
  delete: () => emptyDataStub(),
};

const getUserMeOnce = () => authService.getMe();

export const authAPI = {
  sendOTP: (phone) => (phone ? authService.requestUserOtp(phone) : Promise.reject(new Error('Phone is required'))),
  getCurrentUser: () => getUserMeOnce(),
  logoutFromAllDevices: () => authService.logoutFromAllDevices(),
  deleteAccount: () => authService.deleteAccount(),
  checkBalance: () => authService.checkAccountBalance(),
  saveLoginFcmToken: (token, platform = 'mobile') => {
    if (!token) return Promise.resolve();
    const path = platform === 'mobile' ? '/fcm-tokens/mobile/save' : '/fcm-tokens/save';
    return apiClient.post(path, { token: String(token), platform });
  },
};

export const supportAPI = {
  createTicket: (body) => apiClient.post('/food/user/support/ticket', body ?? {}),
  getMyTickets: (params = {}) => apiClient.get('/food/user/support/my-tickets', { params }),
};

export const notificationAPI = {
  getInbox: (params = {}, config = {}) => apiClient.get('/food/notifications/inbox', { params, ...config }),
  markAsRead: (id, config = {}) => apiClient.patch(`/food/notifications/${String(id)}/read`, {}, config),
  dismiss: (id, config = {}) => apiClient.delete(`/food/notifications/${String(id)}`, config),
  dismissAll: (config = {}) => apiClient.delete('/food/notifications/inbox/all', config),
};

/** The three public reads user screens make through the web's `adminAPI`. */
export const adminAPI = {
  getPublicCategories: (params = {}, config = {}) => apiClient.get('/food/restaurant/categories/public', { params: params ?? {}, ...config }),
  // Sent as the admin module on the web, i.e. with no token in the user app.
  getTakeawayCodStatus: () => apiClient.get('/food/admin/customization-settings/takeaway-cod', { contextModule: 'admin' }),
};

function stableStringify(value) {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function createInFlightCache({ ttlMs }) {
  const inFlight = new Map();
  const cached = new Map(); // key -> { t, v }

  const getCached = (key) => {
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
      .then((res) => {
        cached.set(key, { t: Date.now(), v: res });
        return res;
      })
      .finally(() => {
        inFlight.delete(key);
      });
    inFlight.set(key, p);
    return p;
  };

  return { getOrCreate };
}

// A small in-flight + short TTL cache collapses duplicate public requests.
const publicRestaurantsCache = createInFlightCache({ ttlMs: 3000 });
const publicRestaurantsUnder250Cache = createInFlightCache({ ttlMs: 3000 });
const publicRestaurantMenuCache = createInFlightCache({ ttlMs: 3000 });
const publicRestaurantOutletTimingsCache = createInFlightCache({ ttlMs: 3000 });
const publicGenericGetCache = createInFlightCache({ ttlMs: 3000 });

export const publicGetOnce = (url, config = {}) => {
  const safeUrl = typeof url === 'string' ? url.trim() : '';
  const { noCache, params, ...axiosConfig } = config || {};
  if (!safeUrl) return Promise.reject(new Error('url is required'));
  if (noCache) return apiClient.get(safeUrl, { params, ...axiosConfig });

  const keyParams = params && typeof params === 'object' ? { ...params } : params;
  // `_ts` is a cache-buster in some call sites; ignore it for dedupe purposes.
  if (keyParams && typeof keyParams === 'object') delete keyParams._ts;

  const key = `GET:${safeUrl}:${stableStringify(keyParams)}`;
  return publicGenericGetCache.getOrCreate(key, () => apiClient.get(safeUrl, { params, ...axiosConfig }));
};

const getPublicRestaurantsUnder250Once = (params = {}, config = {}) => {
  const { noCache, ...axiosConfig } = config || {};
  if (noCache) return apiClient.get('/food/restaurant/under-250', { params: params ?? {}, ...axiosConfig });
  const keyParams = { ...(params ?? {}) };
  delete keyParams._ts;
  const key = `under-250:${stableStringify(keyParams)}`;
  return publicRestaurantsUnder250Cache.getOrCreate(key, () => apiClient.get('/food/restaurant/under-250', { params: params ?? {}, ...axiosConfig }));
};

const getPublicRestaurantsOnce = (params = {}, config = {}) => {
  const { noCache, ...axiosConfig } = config || {};
  if (noCache) return apiClient.get('/food/restaurant/restaurants', { params: { limit: 40, ...params }, ...axiosConfig });
  const keyParams = { limit: 40, ...params };
  delete keyParams._ts;
  const key = `restaurants:${stableStringify(keyParams)}`;
  return publicRestaurantsCache.getOrCreate(key, () => apiClient.get('/food/restaurant/restaurants', { params: { limit: 40, ...params }, ...axiosConfig }));
};

const emptyOk = () => Promise.resolve({ data: { success: false, data: null }, status: 200 });

const getPublicRestaurantMenuOnce = (id, config = {}) => {
  const safeId = String(id || '').trim();
  const { noCache, ...axiosConfig } = config || {};
  if (!safeId) return emptyOk();
  if (noCache) return apiClient.get(`/food/restaurant/restaurants/${safeId}/menu`, { ...axiosConfig });
  return publicRestaurantMenuCache.getOrCreate(`menu:${safeId}`, () => apiClient.get(`/food/restaurant/restaurants/${safeId}/menu`, { ...axiosConfig }));
};

const getPublicRestaurantOutletTimingsOnce = (id, config = {}) => {
  const safeId = String(id || '').trim();
  const { noCache, ...axiosConfig } = config || {};
  if (!safeId) return emptyOk();
  if (noCache) return apiClient.get(`/food/restaurant/restaurants/${safeId}/outlet-timings`, { ...axiosConfig });
  return publicRestaurantOutletTimingsCache.getOrCreate(`outletTimings:${safeId}`, () =>
    apiClient.get(`/food/restaurant/restaurants/${safeId}/outlet-timings`, { ...axiosConfig }),
  );
};

const serviceabilityInflight = new Map();

/** The public (user-app) methods of the web's `restaurantAPI`. */
export const restaurantAPI = {
  /** Public: list approved restaurants */
  getRestaurants: (params = {}, config = {}) => getPublicRestaurantsOnce(params, config),
  /** Public: list restaurants with dishes under ₹250 */
  getRestaurantsUnder250: (params = {}, config = {}) => getPublicRestaurantsUnder250Once(params, config),
  /** Public: get single approved restaurant by id or slug */
  getRestaurantById: (id, config = {}) => apiClient.get(`/food/restaurant/restaurants/${String(id)}`, { ...config }),
  /** Public: does this restaurant deliver to this zone? Shared while in flight. */
  getRestaurantServiceability: (id, zoneId, config = {}) => {
    const key = `${String(id)}:${String(zoneId || '')}`;
    const pending = serviceabilityInflight.get(key);
    if (pending) return pending;
    const request = apiClient
      .get(`/food/restaurant/restaurants/${String(id)}/serviceability`, { params: { zoneId: String(zoneId || '') }, ...config })
      .finally(() => {
        serviceabilityInflight.delete(key);
      });
    serviceabilityInflight.set(key, request);
    return request;
  },
  /** Public: get approved menu by restaurant id or slug */
  getMenuByRestaurantId: (id, config = {}) => getPublicRestaurantMenuOnce(id, config),
  /** Public: get outlet timings by restaurant id */
  getOutletTimingsByRestaurantId: (id, config = {}) => getPublicRestaurantOutletTimingsOnce(id, config),
  /** Public: approved add-ons by restaurant id/slug */
  getAddonsByRestaurantId: (id, config = {}) => apiClient.get(`/food/restaurant/restaurants/${String(id)}/addons`, { ...config }),
  getPublicOffers: (params = {}, config = {}) => apiClient.get('/food/restaurant/offers', { params, ...config }),
};

export const userAPI = {
  getCustomizationSettings: () => apiClient.get('/food/public/customization-settings'),
  /** Get current user profile (Bearer USER). */
  getProfile: () =>
    getUserMeOnce().then((res) => {
      const user = res?.data?.data?.user ?? res?.data?.user ?? res?.data?.data ?? res?.data;
      return { ...res, data: { ...res.data, data: { user } } };
    }),
  /** PATCH /food/user/profile (Bearer USER) */
  updateProfile: (body) => apiClient.patch('/food/user/profile', body ?? {}),
  /** Upload and set user profile image (multipart). Field name: file */
  uploadProfileImage: async (file) => {
    if (!file) return Promise.reject(new Error('File is required'));
    const prepared = await prepareUploadFile(file, { preset: 'profile' });
    const formData = new FormData();
    formData.append('file', prepared);
    return apiClient.post('/food/user/profile/profile-image', formData, { timeout: 60000 });
  },
  /** GET /food/user/wallet (Bearer USER). Deduped + short-cached. */
  getWallet: (() => {
    let inFlight = null;
    let cached = null;
    let cacheTime = 0;
    const CACHE_MS = 3000;
    return () => {
      const now = Date.now();
      if (cached && now - cacheTime < CACHE_MS) return Promise.resolve(cached);
      if (!inFlight) {
        inFlight = apiClient
          .get('/food/user/wallet')
          .then((res) => {
            cached = res;
            cacheTime = Date.now();
            return res;
          })
          .finally(() => {
            inFlight = null;
          });
      }
      return inFlight;
    };
  })(),
  getReferralStats: () => apiClient.get('/food/user/referrals/stats'),
  getReferralDetails: () => apiClient.get('/food/user/referrals/details'),
  /** POST /food/user/wallet/topup/order. Body: { amount } */
  createWalletTopupOrder: (amount) => apiClient.post('/food/user/wallet/topup/order', { amount: Number(amount) }),
  verifyWalletTopupPayment: (body) => apiClient.post('/food/user/wallet/topup/verify', body ?? {}),
  /** GET /food/user/addresses (Bearer USER). Deduped + short-cached. */
  getAddresses: (() => {
    let inFlight = null;
    let cached = null;
    let cacheTime = 0;
    const CACHE_MS = 3000;
    return () => {
      const now = Date.now();
      if (cached && now - cacheTime < CACHE_MS) return Promise.resolve(cached);
      if (!inFlight) {
        inFlight = apiClient
          .get('/food/user/addresses')
          .then((res) => {
            cached = res;
            cacheTime = Date.now();
            return res;
          })
          .finally(() => {
            inFlight = null;
          });
      }
      return inFlight;
    };
  })(),
  addAddress: (body) => apiClient.post('/food/user/addresses', body ?? {}),
  updateAddress: (id, body) => apiClient.patch(`/food/user/addresses/${String(id)}`, body ?? {}),
  deleteAddress: (id) => apiClient.delete(`/food/user/addresses/${String(id)}`),
  setDefaultAddress: (id) => apiClient.patch(`/food/user/addresses/${String(id)}/default`, {}),
  createSafetyEmergencyReport: (message) => apiClient.post('/food/user/safety-emergency-reports', { message: String(message || '') }),
  getMySafetyEmergencyReports: (params) => apiClient.get('/food/user/safety-emergency-reports', { params: params ?? {} }),
  /** Legacy no-op: the selected location is kept on the device. */
  updateLocation: () => Promise.resolve({ data: { success: true, message: 'Location saved (client)', data: null } }),
  saveFcmToken: (token, options = {}) => {
    if (!token) return Promise.reject(new Error('FCM token is required'));
    const platform = options?.platform === 'web' ? 'web' : 'mobile';
    const path = platform === 'mobile' ? '/fcm-tokens/mobile/save' : '/fcm-tokens/save';
    return apiClient.post(path, { token: String(token), platform });
  },
  removeFcmToken: (token, options = {}) => {
    if (!token) return Promise.reject(new Error('FCM token is required'));
    const platform = options?.platform === 'web' ? 'web' : 'mobile';
    return apiClient.delete(`/fcm-tokens/remove/${encodeURIComponent(String(token))}`, { data: { token: String(token), platform } });
  },
  /** DELETE /food/user/account - permanently delete user account */
  deleteAccount: () => apiClient.delete('/food/user/account'),
};

// Stubbed on the web (`createStubAPI()`): every method resolves "not connected".
const createStubAPI = () =>
  new Proxy(
    {},
    {
      get() {
        return () => stub();
      },
    },
  );

export const locationAPI = createStubAPI();
export const heroBannerAPI = createStubAPI();
export const publicAPI = createStubAPI();

export const zoneAPI = {
  /** Public: detect active service zone for a lat/lng point. */
  detectZone: (lat, lng) => apiClient.get('/food/zones/detect', { params: { lat, lng } }),
  getPublicZones: (params = {}, config = {}) => apiClient.get('/food/zones/public', { params: params ?? {}, ...config }),
};

/** Public geocode proxies, with a direct fallback when the server has no Maps key (see ./geocode). */
export { geocodeAPI } from './geocode';

export const uploadAPI = {
  /** Upload a single image; the backend converts it to WebP. */
  uploadMedia: async (file, options = {}) => {
    if (!file) return Promise.reject(new Error('File is required for upload'));
    const prepared = await prepareUploadFile(file, options.compress);
    const formData = new FormData();
    formData.append('file', prepared);
    if (options.folder) formData.append('folder', options.folder);
    if (options.replaceUrl) formData.append('replaceUrl', options.replaceUrl);
    return apiClient.post('/uploads/image', formData, { timeout: 60000 });
  },
  deleteMedia: (url) => (url ? apiClient.delete('/uploads', { data: { url } }) : Promise.resolve()),
};

export const foodCartAPI = {
  getCart: () => apiClient.get('/food/cart'),
  addItem: (payload) => apiClient.post('/food/cart/items', payload ?? {}),
  updateItem: (lineId, payload) => apiClient.patch(`/food/cart/items/${encodeURIComponent(String(lineId))}`, payload ?? {}),
  removeItem: (lineId) => apiClient.delete(`/food/cart/items/${encodeURIComponent(String(lineId))}`),
  clearCart: () => apiClient.delete('/food/cart/clear'),
  setCoupon: (couponCode) => apiClient.put('/food/cart/coupon', { couponCode: couponCode || '' }),
};

export const orderAPI = {
  calculateOrder: (payload) => apiClient.post('/food/orders/calculate', payload ?? {}),
  initiateOnlinePayment: (payload) => apiClient.post('/food/orders/initiate-online-payment', payload ?? {}),
  createOrder: (payload) => apiClient.post('/food/orders', payload ?? {}),
  verifyPayment: (body) => apiClient.post('/food/orders/verify-payment', body ?? {}),
  getOrders: (params = {}) =>
    apiClient.get('/food/orders', { params: { limit: 20, page: 1, ...params } }).then((res) => {
      const payload = res?.data?.data;
      // { data: { data: [...], meta } } -> { data: { orders: [...], pagination } }
      if (payload && typeof payload === 'object' && Array.isArray(payload.data) && payload.meta && typeof payload.meta === 'object') {
        const meta = payload.meta;
        return {
          ...res,
          data: {
            ...res.data,
            data: {
              ...payload,
              orders: payload.data,
              pagination: {
                total: Number(meta.total || 0),
                page: Number(meta.page || 1),
                limit: Number(meta.limit || params.limit || 20),
                pages: Number(meta.totalPages || 1),
              },
            },
          },
        };
      }
      return res;
    }),
  getOrderDetails: (() => {
    const inFlight = new Map();
    const cache = new Map();
    /** Dedupes overlapping calls (poll + socket) without hiding fresh data for long. */
    const CACHE_MS = 800;

    return (orderId, options = {}) => {
      const key = String(orderId ?? '').trim();
      if (!key) return Promise.reject(new Error('orderId required'));

      const force = options.force === true;
      const now = Date.now();
      if (!force) {
        const hit = cache.get(key);
        if (hit && now - hit.at < CACHE_MS) return Promise.resolve(hit.res);
      }

      const pending = inFlight.get(key);
      if (pending) return pending;

      const p = apiClient
        .get(`/food/orders/${key}`)
        .then((res) => {
          cache.set(key, { at: Date.now(), res });
          return res;
        })
        .finally(() => {
          inFlight.delete(key);
        });

      inFlight.set(key, p);
      return p;
    };
  })(),
  cancelOrder: (orderId, body = {}) => apiClient.patch(`/food/orders/${String(orderId)}/cancel`, body ?? {}),
  updateOrderInstructions: (orderId, instructions) => apiClient.patch(`/food/orders/${String(orderId)}/instructions`, { instructions }),
  submitOrderRatings: (orderId, body = {}) => apiClient.patch(`/food/orders/${String(orderId)}/ratings`, body ?? {}),
  /** Submit a complaint for an order (user). */
  submitComplaint: (payload) =>
    apiClient.post('/food/user/support/ticket', {
      type: 'order',
      orderId: payload.orderId,
      issueType: payload.complaintType,
      description: payload.subject ? `${payload.subject}: ${payload.description}` : payload.description,
    }),
};

export const diningAPI = {
  getCategories: (params = {}) => apiClient.get('/food/dining/categories/public', { params }),
  getRestaurants: (params = {}) => apiClient.get('/food/dining/restaurants/public', { params }),
  getHeroBanners: () => apiClient.get('/food/hero-banners/dining/public'),
  getRestaurantBySlug: (slug) => apiClient.get(`/food/restaurant/restaurants/${String(slug)}`),
  // The web resolves these three to empty lists (no backend yet).
  getOfferBanners: () => Promise.resolve({ data: { success: true, data: [] } }),
  getStories: () => Promise.resolve({ data: { success: true, data: [] } }),
  getBankOffers: () => Promise.resolve({ data: { success: true, data: [] } }),
  getBookings: () => apiClient.get('/food/dining/bookings'),
  getBookingById: (id) => apiClient.get(`/food/dining/bookings/${id}`),
  getRestaurantBookings: (restaurantRef) => {
    const idOrSlug = restaurantRef?._id || restaurantRef?.id || restaurantRef?.restaurantId || (typeof restaurantRef === 'string' ? restaurantRef : '');
    return apiClient.get(`/food/dining/bookings/by-restaurant/${idOrSlug}`, { contextModule: 'user' });
  },
  createReview: (payload = {}) =>
    apiClient.post(`/food/dining/bookings/${payload?.bookingId}/review`, { rating: payload?.rating, comment: payload?.comment }, { contextModule: 'user' }),
  createBooking: (payload = {}) => apiClient.post('/food/dining/bookings', payload, { contextModule: 'user' }),
};

/** The stored food user (web: localStorage `user_user`). */
export const getStoredUser = () => {
  try {
    const parsed = JSON.parse(localStore.getItem('user_user') || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};
