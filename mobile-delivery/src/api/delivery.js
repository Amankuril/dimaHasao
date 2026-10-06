import { api, upload } from './client';
import { localStore } from '../lib/storage';

/*
 * One method per function in the web's deliveryAPI / authService
 * (Frontend/src/services/api/index.js and auth.js): same method, path,
 * query and payload. Every method resolves to the axios-style { data } the
 * web screens read.
 */

const OTP_REQUEST = '/auth/otp/request';
const OTP_VERIFY = '/auth/otp/verify';
const AUTH = {
  REFRESH_TOKEN: '/food/auth/refresh-token',
  LOGOUT: '/food/auth/logout',
  LOGOUT_ALL: '/food/auth/logout-all',
  DELETE_ACCOUNT: '/food/auth/delete-account',
  CHECK_BALANCE: '/food/auth/delete-account/check-balance',
  ME: '/food/auth/me',
};

function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '').slice(-15);
}

const oid = (v) => encodeURIComponent(String(v));

/* /me: shared in-flight request, 3 s cache, 10 s back-off after a 429. */
let meCache = null;
let meInFlight = null;
let meBackoffUntil = 0;
const ME_CACHE_MS = 3000;

export function clearMeCache() {
  meCache = null;
  meInFlight = null;
}

function getMeOnce() {
  const now = Date.now();
  if (now < meBackoffUntil) return Promise.reject(new Error('Rate limited. Retrying too soon.'));
  if (meCache && now - meCache.at < ME_CACHE_MS) return Promise.resolve(meCache.res);
  if (meInFlight) return meInFlight;
  meInFlight = api
    .get(AUTH.ME)
    .then((res) => {
      meCache = { at: Date.now(), res };
      return res;
    })
    .catch((err) => {
      if (err?.status === 429) meBackoffUntil = Date.now() + 10000;
      throw err;
    })
    .finally(() => {
      meInFlight = null;
    });
  return meInFlight;
}

/* Short result caches the web keeps for orders (StrictMode + many effects). */
function cachedGetter(fetcher, ttl) {
  const cache = new Map();
  const inflight = new Map();
  return (key, ...args) => {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.res);
    if (inflight.has(key)) return inflight.get(key);
    const p = fetcher(...args)
      .then((res) => {
        cache.set(key, { at: Date.now(), res });
        return res;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  };
}

const ordersGetter = cachedGetter(
  (params) => api.get('/food/delivery/orders/available', { params: { limit: 50, page: 1, ...params } }),
  2500,
);
const orderDetailsGetter = cachedGetter((id) => api.get(`/food/delivery/orders/${id}`), 1200);

const stableKey = (p = {}) => {
  const n = { limit: 50, page: 1, ...(p && typeof p === 'object' ? p : {}) };
  delete n._ts;
  return JSON.stringify(Object.keys(n).sort().reduce((acc, k) => ({ ...acc, [k]: n[k] }), {}));
};

const requireForm = (fd, msg) => {
  if (!fd || !(fd instanceof FormData)) return Promise.reject(new Error(msg));
  return null;
};

export const authApi = {
  refreshToken: (refreshToken) => api.post(AUTH.REFRESH_TOKEN, { refreshToken }),
  logout: (refreshToken, fcmToken = null, platform = 'android') => {
    if (!refreshToken) return Promise.resolve({ data: { success: true } });
    const payload = { refreshToken };
    if (fcmToken) {
      payload.fcmToken = fcmToken;
      payload.platform = platform;
    }
    clearMeCache();
    return api.post(AUTH.LOGOUT, payload);
  },
  logoutFromAllDevices: () => {
    clearMeCache();
    return api.post(AUTH.LOGOUT_ALL, {});
  },
  deleteAccount: () => api.delete(AUTH.DELETE_ACCOUNT).then(() => clearMeCache()),
  checkAccountBalance: () => api.get(AUTH.CHECK_BALANCE),
};

export const deliveryApi = {
  sendOTP: (phone) => {
    if (!phone) return Promise.reject(new Error('Phone is required'));
    const normalized = normalizePhone(phone);
    if (normalized.length < 8) return Promise.reject(new Error('Phone must be at least 8 digits'));
    return api.post(OTP_REQUEST, { audience: 'delivery', phone: normalized });
  },
  verifyOTP: (phone, otp, _purpose, _name, fcmToken = null, platform = 'android', confirmAction = null) => {
    if (!phone || !otp) return Promise.reject(new Error('Phone and OTP are required'));
    const normalized = normalizePhone(phone);
    const otpStr = String(otp).replace(/\D/g, '').slice(0, 6);
    if (!normalized || otpStr.length < 4) {
      return Promise.reject(new Error('Phone and 4-digit OTP are required'));
    }
    return api.post(OTP_VERIFY, {
      audience: 'delivery',
      phone: normalized,
      otp: otpStr,
      ...(fcmToken ? { fcmToken, platform } : {}),
      ...(confirmAction ? { confirmAction } : {}),
    });
  },
  getMe: () => getMeOnce(),
  getProfile: () =>
    getMeOnce().then((res) => ({
      ...res,
      data: { ...res.data, data: { profile: res.data?.data?.user ?? res.data?.data } },
    })),
  getReferralStats: () => api.get('/food/delivery/referrals/stats'),
  logout: (refreshToken) => {
    clearMeCache();
    localStore.removeItem('app:isOnline');
    const fcmToken = localStore.getItem('fcm_registered_token_delivery');
    return authApi.logout(refreshToken, fcmToken);
  },
  register: (formData) =>
    requireForm(formData, 'FormData with details and document files is required') ||
    api.post('/food/delivery/register', formData),
  completeProfile: (formData) =>
    requireForm(formData, 'FormData with details and document files is required') ||
    api.patch('/food/delivery/profile', formData),
  updateProfileDetails: (payload) => api.patch('/food/delivery/profile/details', payload ?? {}),
  updateProfileMultipart: (formData) =>
    requireForm(formData, 'FormData is required') || api.patch('/food/delivery/profile', formData),
  updateProfilePhotoBase64: (payload) => api.post('/food/delivery/profile/photo-base64', payload ?? {}),
  updateProfile: (payload) => api.patch('/food/delivery/profile/bank-details', payload ?? {}),
  updateBankDetailsMultipart: (formData) =>
    requireForm(formData, 'FormData is required') || api.patch('/food/delivery/profile/bank-details', formData),
  saveFcmToken: (token, platform = 'android') => {
    if (!token) return Promise.reject(new Error('FCM token is required'));
    const path = platform === 'mobile' ? '/fcm-tokens/mobile/save' : '/fcm-tokens/save';
    return api.post(path, { token: String(token), platform });
  },
  removeFcmToken: (token, platform = 'android') => {
    if (!token) return Promise.reject(new Error('FCM token is required'));
    return api.delete(`/fcm-tokens/remove/${oid(token)}`, { data: { token: String(token), platform } });
  },
  getSupportTickets: () => api.get('/food/delivery/support-tickets'),
  createSupportTicket: (body) => api.post('/food/delivery/support-tickets', body ?? {}),
  getSupportTicketById: (id) => api.get(`/food/delivery/support-tickets/${id}`),
  updateOnlineStatus: (isOnline) =>
    api.patch('/food/delivery/availability', { status: isOnline ? 'online' : 'offline' }),
  updateLocation: (latitude, longitude, isOnline, extras = {}) =>
    api.patch('/food/delivery/availability', {
      status: isOnline ? 'online' : 'offline',
      latitude,
      longitude,
      ...extras,
    }),
  getOrders: (params = {}) => ordersGetter(stableKey(params), params),
  getOrderDetails: (orderId) => {
    const key = String(orderId || '').trim();
    if (!/^[a-f0-9]{24}$/i.test(key)) {
      return Promise.resolve({ data: { success: false, message: 'Invalid order id', data: null }, status: 200 });
    }
    return orderDetailsGetter(key, key);
  },
  getCurrentDelivery: () => api.get('/food/delivery/orders/current'),
  acceptOrder: (orderId, body = {}) => api.patch(`/food/delivery/orders/${String(orderId)}/accept`, body ?? {}),
  rejectOrder: (orderId, body = {}) => api.patch(`/food/delivery/orders/${String(orderId)}/reject`, body ?? {}),
  confirmReachedPickup: (orderId) => api.patch(`/food/delivery/orders/${String(orderId)}/reached-pickup`, {}),
  confirmOrderId: (orderId, confirmedOrderId, location = {}, data = {}) =>
    api.patch(`/food/delivery/orders/${String(orderId)}/confirm-pickup`, {
      confirmedOrderId,
      latitude: location.lat,
      longitude: location.lng,
      billImageUrl: data.billImageUrl,
    }),
  confirmReachedDrop: (orderId) => api.patch(`/food/delivery/orders/${String(orderId)}/reached-drop`, {}),
  verifyDropOtp: (orderId, otp) =>
    api.post(`/food/delivery/orders/${String(orderId)}/verify-drop-otp`, { otp: String(otp) }),
  createCollectQr: (orderId, body = {}) => api.post(`/food/delivery/orders/${String(orderId)}/collect/qr`, body ?? {}),
  getPaymentStatus: (orderId) => api.get(`/food/delivery/orders/${String(orderId)}/payment-status`),
  completeDelivery: (orderId, body = {}) => {
    let payload = body ?? {};
    if (typeof payload === 'number' || typeof payload === 'string' || payload == null) {
      payload = { rating: payload == null ? null : Number(payload) };
    }
    return api.patch(`/food/delivery/orders/${String(orderId)}/complete`, payload);
  },
  updateOrderStatus: (orderId, body = {}) => api.patch(`/food/delivery/orders/${String(orderId)}/status`, body ?? {}),
  reverify: () => api.post('/food/delivery/reverify', {}),
  getWallet: () => api.get('/food/delivery/wallet'),
  getEarnings: (params) => api.get('/food/delivery/earnings', { params: params ?? {} }),
  getActiveEarningAddons: () => api.get('/food/delivery/earning-addons/active'),
  getTripHistory: (params) => api.get('/food/delivery/trip-history', { params: params ?? {} }),
  getPocketDetails: (params) => api.get('/food/delivery/pocket-details', { params: params ?? {} }),
  getMyReviews: (params) => api.get('/food/delivery/my-reviews', { params: params ?? {} }),
  getEmergencyHelp: () => api.get('/food/delivery/emergency-help'),
  getCashLimit: () => api.get('/food/delivery/cash-limit'),
  createWithdrawalRequest: (body) => api.post('/food/delivery/wallet/withdraw', body ?? {}),
  createDepositOrder: (amount) => api.post('/food/delivery/wallet/deposit/order', { amount }),
  verifyDepositPayment: (body) => api.post('/food/delivery/wallet/deposit/verify', body ?? {}),
  submitCashDeposit: (amount) => api.post('/food/delivery/wallet/deposit/cash-submit', { amount }),
  getWalletTransactions: (params) =>
    api.get('/food/delivery/wallet', { params: params ?? {} }).then((res) => ({
      ...res,
      data: { ...res.data, data: { transactions: res?.data?.data?.wallet?.transactions ?? [] } },
    })),
  getZonesInRadius: (lat, lng, radiusKm = 10) =>
    api.get('/food/zones/nearby', { params: { lat, lng, radius: radiusKm } }),
  deleteAccount: () => api.delete('/food/delivery/account'),
};

export const zoneApi = {
  getPublicZones: (params = {}) => api.get('/food/zones/public', { params }),
};

export const uploadApi = {
  /**
   * POST /uploads/image. `file` is { uri, name, type } from the image picker.
   * The web sends this with whatever token its URL maps to (the user one);
   * the app has one session, so it sends the rider's. See CONVERSION.md.
   */
  uploadMedia: (file, options = {}) => {
    if (!file) return Promise.reject(new Error('File is required for upload'));
    const fd = new FormData();
    fd.append('file', file);
    if (options.folder) fd.append('folder', options.folder);
    if (options.replaceUrl) fd.append('replaceUrl', options.replaceUrl);
    return upload('/uploads/image', fd, { onProgress: options.onProgress });
  },
};

/** GET /platform/settings?module= — legal links and support contact (public). */
export const platformApi = {
  settings: (module = 'platform') => api.get('/platform/settings', { params: { module } }),
  /** GET /legal/:slug?module= — a published policy (web: LegalDocumentPage). */
  legal: (slug, module = 'platform') => api.get(`/legal/${encodeURIComponent(slug)}`, { params: { module } }),
};

/** Public CMS pages, e.g. /food/pages/terms (web: CMSPage via the shared client). */
export const cmsApi = {
  get: (endpoint) => api.get(endpoint),
};

/** Broadcast inbox (web notificationAPI), sent with the rider's token. */
export const notificationApi = {
  getInbox: (params = {}) => api.get('/food/notifications/inbox', { params }),
  markAsRead: (id) => api.patch(`/food/notifications/${String(id)}/read`, {}),
  dismiss: (id) => api.delete(`/food/notifications/${String(id)}`),
  dismissAll: () => api.delete('/food/notifications/inbox/all'),
};

/** Food business settings, public (web: loadBusinessSettings). */
export const businessSettingsApi = {
  getPublic: () => api.get('/food/admin/business-settings/public'),
};
