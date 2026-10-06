import apiClient, { getRefreshToken } from './client';
import * as authService from './auth';
import { localStore } from '../lib/storage';
import { prepareUploadFile } from '../lib/images';

/*
 * The restaurant slice of the web's services/api/index.js. The web tags every
 * call with `contextModule: "restaurant"` so its axios instance picks that
 * module's token; this app has one role, so the app session is the restaurant
 * session and the tag is not needed. Methods, paths, payloads and the short
 * caches are the web's.
 */

// AuthContext keeps the device push token under this key and sends it with logout.
export const FCM_TOKEN_KEY = 'fcm_registered_token_restaurant';

/* ------------------------------ orders cache ------------------------------ */
let ordersCache = null;
let ordersCacheKey = '';
let ordersCacheAt = 0;
let ordersInFlight = null;
let ordersInFlightKey = '';

export const invalidateRestaurantOrdersCache = () => {
  ordersCache = null;
  ordersCacheKey = '';
  ordersCacheAt = 0;
  ordersInFlight = null;
  ordersInFlightKey = '';
};

export const optimisticallyUpdateRestaurantOrderStatus = (orderId, targetStatus) => {
  if (!ordersCache?.data?.data?.orders) return;
  const targetStr = String(orderId);
  ordersCache.data.data.orders.forEach((o) => {
    if (String(o._id || o.orderId || o.id) !== targetStr) return;
    o.orderStatus = targetStatus;
    o.status = String(targetStatus).includes('cancel') ? 'cancelled' : targetStatus;
    if (String(targetStatus).includes('cancel')) {
      o.cancelledAt = new Date().toISOString();
      o.cancelledBy = 'restaurant';
    }
  });
  ordersCacheAt = Date.now();
};

/* --------------------- one in-flight request + short cache --------------------- */
const once = (ttl, load) => {
  let inFlight = null;
  let cached = null;
  let cachedAt = 0;
  const get = () => {
    if (cached && Date.now() - cachedAt < ttl) return Promise.resolve(cached);
    if (!inFlight) {
      inFlight = load()
        .then((res) => {
          cached = res;
          cachedAt = Date.now();
          return res;
        })
        .finally(() => {
          inFlight = null;
        });
    }
    return inFlight;
  };
  get.reset = () => {
    inFlight = null;
    cached = null;
    cachedAt = 0;
  };
  get.set = (res) => {
    cached = res;
    cachedAt = Date.now();
    return res;
  };
  return get;
};

const currentRestaurant = once(15000, () => apiClient.get('/food/restaurant/current'));
const restaurantSettings = once(15000, () => apiClient.get('/food/public/restaurant-settings'));
const pendingDining = once(10000, () => apiClient.get('/food/restaurant/dining-settings/pending'));

/** Clears every cached restaurant answer (sign-in, sign-out). */
export const clearRestaurantCaches = () => {
  currentRestaurant.reset();
  restaurantSettings.reset();
  pendingDining.reset();
  invalidateRestaurantOrdersCache();
};

const normalizeIncomingStatus = (s, orderType) => {
  const v = String(s || '').toLowerCase();
  if (v === 'created') return 'confirmed';
  if (v === 'ready_for_pickup') return 'ready';
  if (v === 'picked_up') return orderType === 'takeaway' ? 'completed' : 'out_for_delivery';
  if (v.includes('cancel')) return 'cancelled';
  return v || 'confirmed';
};

const normalizeOutgoingStatus = (s) => {
  const v = String(s || '').toLowerCase().trim();
  if (v === 'ready') return 'ready_for_pickup';
  if (v === 'out_for_delivery') return 'picked_up';
  if (v === 'cancelled') return 'cancelled_by_restaurant';
  return v;
};

const multipart = async (path, files, field, timeout, prepareOptions) => {
  const list = (Array.isArray(files) ? files : [files]).filter(Boolean);
  const formData = new FormData();
  for (const file of list) formData.append(field, await prepareUploadFile(file, prepareOptions));
  return apiClient.post(path, formData, { timeout });
};

export const restaurantAPI = {
  sendOTP: (phone) => (phone ? authService.requestRestaurantOtp(phone) : Promise.reject(new Error('Phone is required'))),
  verifyOTP: (phone, otp, _purpose, _name, _email, fcmToken = null, platform = 'mobile', confirmAction = null) => {
    if (!phone || !otp) return Promise.reject(new Error('Phone and OTP are required'));
    return authService.verifyRestaurantOtp(phone, otp, fcmToken, platform, confirmAction);
  },
  reapply: (phone) => (phone ? authService.reapplyRestaurant(phone) : Promise.reject(new Error('Phone is required'))),
  getMe: () => authService.getMe(),

  getCurrentRestaurant: () => currentRestaurant(),
  refreshCurrentRestaurant: () => {
    currentRestaurant.reset();
    return currentRestaurant();
  },
  getRestaurantSettings: () => restaurantSettings(),
  /** The web's stub for an endpoint the backend does not have. */
  getRestaurantByOwner: () =>
    Promise.resolve({ data: { success: true, data: { restaurant: { name: 'Your Restaurant', restaurantId: 'REST000001', address: 'Your address' } } } }),

  /* finance */
  getFinance: (params = {}) => apiClient.get('/food/restaurant/finance', { params: params || {} }),
  createWithdrawalRequest: (amount) => apiClient.post('/food/restaurant/withdraw', { amount: Number(amount) }),
  getWithdrawalHistory: () => apiClient.get('/food/restaurant/withdrawals'),

  /* profile and settings: each answer replaces the cached profile, as on the web */
  updateProfile: (body) => apiClient.patch('/food/restaurant/profile', body ?? {}).then(currentRestaurant.set),
  updateDiningSettings: (body) => apiClient.patch('/food/restaurant/dining-settings', body ?? {}).then(currentRestaurant.set),
  updateTakeawaySettings: (body) => apiClient.patch('/food/restaurant/takeaway-settings', body ?? {}).then(currentRestaurant.set),
  requestDiningUpdate: (body) => apiClient.post('/food/restaurant/dining-settings/request', body ?? {}),
  getPendingDiningRequest: () => pendingDining(),
  updateAcceptingOrders: (isAcceptingOrders) =>
    apiClient.patch('/food/restaurant/availability', { isAcceptingOrders: Boolean(isAcceptingOrders) }).then(currentRestaurant.set),

  /* images (multipart) */
  uploadProfileImage: (file) =>
    file ? multipart('/food/restaurant/profile/profile-image', file, 'file', 60000, { preset: 'profile' }) : Promise.reject(new Error('File is required')),
  uploadMenuImage: (file) => (file ? multipart('/food/restaurant/profile/menu-image', file, 'file', 60000) : Promise.reject(new Error('File is required'))),
  uploadCoverImages: (files = []) => {
    const list = Array.from(files || []).filter(Boolean);
    return list.length ? multipart('/food/restaurant/profile/cover-images', list, 'files', 90000) : Promise.reject(new Error('At least one file is required'));
  },
  uploadMenuImages: (files = []) => {
    const list = Array.from(files || []).filter(Boolean);
    return list.length ? multipart('/food/restaurant/profile/menu-images', list, 'files', 90000) : Promise.reject(new Error('At least one file is required'));
  },

  /* categories, menu, foods, add-ons */
  getCategories: (params = {}) => apiClient.get('/food/restaurant/categories', { params: { compact: true, limit: 1000, ...params } }),
  getAllCategories: (params = {}) =>
    apiClient.get('/food/restaurant/categories', { params: { includeInactive: true, withCounts: true, limit: 1000, ...params } }),
  createCategory: (body) => apiClient.post('/food/restaurant/categories', body ?? {}),
  updateCategory: (id, body) => apiClient.patch(`/food/restaurant/categories/${String(id)}`, body ?? {}),
  deleteCategory: (id) => apiClient.delete(`/food/restaurant/categories/${String(id)}`),
  getMenu: (params = {}) => apiClient.get('/food/restaurant/menu', { params }),
  updateMenu: (body) => apiClient.patch('/food/restaurant/menu', body ?? {}),
  createFood: (body) => apiClient.post('/food/restaurant/foods', body ?? {}),
  updateFood: (id, body) => apiClient.patch(`/food/restaurant/foods/${String(id)}`, body ?? {}),
  deleteFood: (id) => apiClient.delete(`/food/restaurant/foods/${String(id)}`),
  getAddons: (params = {}) => apiClient.get('/food/restaurant/addons', { params: { limit: 100, page: 1, ...params } }),
  addAddon: (body) => apiClient.post('/food/restaurant/addons', body ?? {}),
  updateAddon: (id, body) => apiClient.patch(`/food/restaurant/addons/${String(id)}`, body ?? {}),
  deleteAddon: (id) => apiClient.delete(`/food/restaurant/addons/${String(id)}`),

  /* outlet timings */
  getOutletTimings: () => apiClient.get('/food/restaurant/outlet-timings'),
  saveOutletTimings: (outletTimings) => apiClient.put('/food/restaurant/outlet-timings', { outletTimings: outletTimings || {} }),

  /* orders */
  invalidateOrdersCache: () => invalidateRestaurantOrdersCache(),
  optimisticallyUpdateOrderStatus: (orderId, targetStatus) => optimisticallyUpdateRestaurantOrderStatus(orderId, targetStatus),
  getOrders: (params = {}) => {
    const merged = { limit: 50, page: 1, ...params };
    const key = JSON.stringify(merged);
    if (ordersCache && ordersCacheKey === key && Date.now() - ordersCacheAt < 3000) return Promise.resolve(ordersCache);
    if (ordersInFlight && ordersInFlightKey === key) return ordersInFlight;
    ordersInFlightKey = key;
    ordersInFlight = apiClient
      .get('/food/restaurant/orders', { params: merged })
      .then((res) => {
        const payload = res?.data?.data || {};
        const rows = (Array.isArray(payload.data) ? payload.data : []).map((o) => ({
          ...o,
          status: normalizeIncomingStatus(o.orderStatus || o.status, o.orderType),
          address: o.deliveryAddress || o.address,
          total: o.pricing?.total ?? o.total ?? 0,
          paymentMethod: o.payment?.method || o.paymentMethod || null,
        }));
        const normalized = { ...res, data: { ...res.data, data: { orders: rows, meta: payload.meta || {} } } };
        ordersCache = normalized;
        ordersCacheKey = key;
        ordersCacheAt = Date.now();
        return normalized;
      })
      .finally(() => {
        ordersInFlight = null;
        ordersInFlightKey = '';
      });
    return ordersInFlight;
  },
  getOrderById: (orderId) => apiClient.get(`/food/restaurant/orders/${String(orderId)}`),
  updateOrderStatus: (orderId, body) => {
    const outgoing = { ...(body ?? {}) };
    if (outgoing.orderStatus) outgoing.orderStatus = normalizeOutgoingStatus(outgoing.orderStatus);
    const target = outgoing.orderStatus || outgoing.status || 'cancelled_by_restaurant';
    optimisticallyUpdateRestaurantOrderStatus(orderId, target);
    return apiClient.patch(`/food/restaurant/orders/${String(orderId)}/status`, outgoing).then((res) => {
      optimisticallyUpdateRestaurantOrderStatus(orderId, target);
      return res;
    });
  },
  completeTakeawayOrder: (orderId, otp) => {
    invalidateRestaurantOrdersCache();
    return apiClient.post(`/food/restaurant/orders/${String(orderId)}/complete-takeaway`, { otp }).then((res) => {
      invalidateRestaurantOrdersCache();
      return res;
    });
  },
  /** Accept moves the order to "preparing"; a 400 falls back to "confirmed", as on the web. */
  acceptOrder: async (orderId, prepTimeMins = null) => {
    try {
      return await restaurantAPI.updateOrderStatus(orderId, { orderStatus: 'preparing', preparationTime: prepTimeMins });
    } catch (error) {
      if (Number(error?.response?.status || 0) === 400) {
        return restaurantAPI.updateOrderStatus(orderId, { orderStatus: 'confirmed', preparationTime: prepTimeMins });
      }
      throw error;
    }
  },
  rejectOrder: (orderId, reason = '') => restaurantAPI.updateOrderStatus(orderId, { orderStatus: 'cancelled_by_restaurant', note: reason }),
  markOrderReady: (orderId) => restaurantAPI.updateOrderStatus(orderId, { orderStatus: 'ready_for_pickup' }),
  resendDeliveryNotification: (orderId) => apiClient.post(`/food/restaurant/orders/${String(orderId)}/resend-notification`, {}),

  /* complaints and support */
  getComplaints: (params = {}) => apiClient.get('/food/restaurant/complaints', { params }),
  createSupportTicket: (body = {}) => apiClient.post('/food/restaurant/support/tickets', body ?? {}),
  getSupportTickets: (params = {}) => apiClient.get('/food/restaurant/support/tickets', { params }),

  /* push token */
  saveFcmToken: (token, platform = 'mobile') => {
    if (!token) return Promise.reject(new Error('FCM token is required'));
    return apiClient.post(platform === 'mobile' ? '/fcm-tokens/mobile/save' : '/fcm-tokens/save', { token: String(token), platform });
  },
  removeFcmToken: (token, platform = 'mobile') => {
    if (!token) return Promise.reject(new Error('FCM token is required'));
    return apiClient.delete(`/fcm-tokens/remove/${encodeURIComponent(String(token))}`, { data: { token: String(token), platform } });
  },

  /* account */
  logout: (refreshToken) => {
    clearRestaurantCaches();
    // The web falls back to the stored refresh token when a page calls logout() bare.
    return authService.logout(refreshToken || getRefreshToken(), localStore.getItem(FCM_TOKEN_KEY), 'mobile');
  },
  /** The backend has no email/password login; the web rejects the same way. */
  login: () => Promise.reject(new Error('Please use phone number and OTP to sign in.')),
  register: (formData) => {
    if (!formData || !(formData instanceof FormData)) return Promise.reject(new Error('FormData is required'));
    return apiClient.post('/food/restaurant/register', formData);
  },
  deleteAccount: () => apiClient.delete('/food/restaurant/account'),
};

export const notificationAPI = {
  getInbox: (params = {}, config = {}) => apiClient.get('/food/notifications/inbox', { params, ...config }),
  markAsRead: (id, config = {}) => apiClient.patch(`/food/notifications/${String(id)}/read`, {}, config),
  dismiss: (id, config = {}) => apiClient.delete(`/food/notifications/${String(id)}`, config),
  dismissAll: (config = {}) => apiClient.delete('/food/notifications/inbox/all', config),
};

export const diningAPI = {
  getCategories: (params = {}) => apiClient.get('/food/dining/categories/public', { params }),
  getRestaurantBookings: (restaurantRef) => {
    const idOrSlug = restaurantRef?._id || restaurantRef?.id || restaurantRef?.restaurantId || (typeof restaurantRef === 'string' ? restaurantRef : '');
    return apiClient.get(`/food/dining/bookings/by-restaurant/${idOrSlug}`);
  },
  updateBookingStatusRestaurant: (bookingId, status) => apiClient.patch(`/food/dining/bookings/${bookingId}/status`, { status }),
};

export const zoneAPI = {
  getPublicZones: (params = {}, config = {}) => apiClient.get('/food/zones/public', { params: params ?? {}, ...config }),
};

export const uploadAPI = {
  uploadMedia: async (file, options = {}) => {
    if (!file) return Promise.reject(new Error('File is required for upload'));
    const formData = new FormData();
    formData.append('file', await prepareUploadFile(file, options.compress));
    if (options.folder) formData.append('folder', options.folder);
    if (options.replaceUrl) formData.append('replaceUrl', options.replaceUrl);
    return apiClient.post('/uploads/image', formData, { timeout: 60000 });
  },
  deleteMedia: (url) => (url ? apiClient.delete('/uploads', { data: { url } }) : Promise.resolve()),
};

export const authAPI = {
  logoutFromAllDevices: () => authService.logoutFromAllDevices(),
  deleteAccount: () => authService.deleteAccount(),
  checkBalance: () => authService.checkAccountBalance(),
};

export { geocodeAPI } from './geocode';
export default apiClient;

/** The web's `api` export: the shared client itself. */
export const api = apiClient;
