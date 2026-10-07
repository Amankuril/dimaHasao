import { hotelApi, toQuery } from './api';
import api from '../../api/client';
import { cachedRead, keyFor, TTL } from '../../lib/apiCache';
import { setPartnerSession, clearPartnerSession } from '../utils/partnerAuth';

/*
 * Port of Frontend/src/modules/Hotel/services/apiService.js.
 *
 * Same exports, endpoints and return values as the web. The web's axios
 * instance is hotelApi: requests to /hotel/* carry the partner token and a 401
 * is handled by api/client.js, so the request/response interceptors are not
 * repeated here. Every call resolves to the response body and rejects with the
 * server's error body (or the message), exactly like the web.
 */

export { hotelApi as api };

/** Web: `throw error.response?.data || error.message`. */
const fail = (error) => {
  throw error.response?.data || error.message;
};

/** Runs a request and resolves to `response.data`. */
const body = (request) => request.then((response) => response.data).catch(fail);

/** Hotel's two roles map onto two audiences of the shared auth service. */
const PARTNER_ROLES = ['partner', 'broker', 'agent', 'seller'];
export const AUDIENCE = { USER: 'user', HOTEL_PARTNER: 'hotel-partner' };
const audienceForRole = (role) =>
  PARTNER_ROLES.includes(String(role || '').toLowerCase()) ? AUDIENCE.HOTEL_PARTNER : AUDIENCE.USER;

// Web: services/auth/otpAuthClient.js. The auth surface sits at the platform root, not under /hotel.
const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);
const unwrap = (res) => res?.data?.data ?? res?.data ?? {};

const requestOtp = async (audience, phone, extra = {}) => {
  const digits = normalizePhone(phone);
  if (digits.length !== 10) throw new Error('Phone number must be exactly 10 digits');
  return unwrap(await api.post('/auth/otp/request', { audience, phone: digits, ...extra }));
};

const verifyOtp = async (audience, phone, otp, payload = {}) => {
  const digits = normalizePhone(phone);
  const code = String(otp || '').replace(/\D/g, '');
  if (!code) throw new Error('Please enter the OTP');
  return unwrap(await api.post('/auth/otp/verify', { audience, phone: digits, otp: code, ...payload }));
};

const completeSignup = async (audience, signupToken, payload = {}) => {
  if (!signupToken) throw new Error('Your verification has expired. Please request a new OTP.');
  return unwrap(await api.post('/auth/otp/complete', { audience, signupToken, ...payload }));
};

// User Auth Services
export const authService = {
  // Guests and partners sign in through the shared auth surface.
  sendOtp: async (phone, type = 'login', role = 'user') => {
    try {
      return await requestOtp(audienceForRole(role), phone, { type });
    } catch (error) {
      return fail(error);
    }
  },

  // Verify OTP & Login/Register. A partner lands on the hotel partner session.
  verifyOtp: async (data = {}) => {
    try {
      const { phone, otp, role = 'user', ...payload } = data;
      const result = await verifyOtp(audienceForRole(role), phone, otp, payload);
      const token = result.token || result.accessToken;
      if (token && PARTNER_ROLES.includes(String(role).toLowerCase())) {
        setPartnerSession(token, result.user, result.refreshToken);
      }
      return result;
    } catch (error) {
      return fail(error);
    }
  },

  /** Finish a partner signup that verify answered with `onboarding`. */
  completePartnerSignup: async (signupToken, payload = {}) => {
    try {
      const result = await completeSignup(AUDIENCE.HOTEL_PARTNER, signupToken, payload);
      const token = result.token || result.accessToken;
      if (token) setPartnerSession(token, result.user, result.refreshToken);
      return result;
    } catch (error) {
      return fail(error);
    }
  },

  verifyPartnerOtp: async (data = {}) => {
    try {
      const { phone, otp, ...payload } = data;
      return await verifyOtp(AUDIENCE.HOTEL_PARTNER, phone, otp, payload);
    } catch (error) {
      return fail(error);
    }
  },

  registerPartner: (data) => body(hotelApi.post('/auth/partner/register', data)),
  /** `formData` is a FormData of picked files (uri / name / type). */
  uploadDocs: (formData) => body(hotelApi.post('/auth/partner/upload-docs', formData)),
  deleteDoc: (publicId) => body(hotelApi.post('/auth/partner/delete-doc', { publicId })),
  uploadDocsBase64: (images) => body(hotelApi.post('/auth/partner/upload-docs-base64', { images })),
  updateProfile: (data) => body(hotelApi.put('/auth/update-profile', data)),

  logout: () => {
    clearPartnerSession();
  },
};

// Booking Services
export const bookingService = {
  create: (bookingData) => body(hotelApi.post('/bookings', bookingData)),
  getMyBookings: (type) => body(hotelApi.get(type ? `/bookings/my?type=${type}` : '/bookings/my')),
  getPartnerBookings: (status) =>
    body(hotelApi.get(status ? `/bookings/partner?status=${status}` : '/bookings/partner')),
  getBookingDetail: (id) => body(hotelApi.get(`/bookings/${id}`)),
  getPartnerBookingDetail: (id) => body(hotelApi.get(`/bookings/${id}/partner-detail`)),
  getInvoice: (id) => body(hotelApi.get(`/bookings/${id}/invoice`)),
  getPartnerRevenueReport: (params = {}) => body(hotelApi.get('/bookings/partner/revenue-report', { params })),
  markAsPaid: (id) => body(hotelApi.put(`/bookings/${id}/mark-paid`)),
  markNoShow: (id) => body(hotelApi.put(`/bookings/${id}/no-show`)),
  checkIn: (id) => body(hotelApi.put(`/bookings/${id}/check-in`)),
  checkOut: (id, force = false) =>
    body(hotelApi.put(force ? `/bookings/${id}/check-out?force=true` : `/bookings/${id}/check-out`)),
  cancel: (bookingId, reason) => body(hotelApi.post(`/bookings/${bookingId}/cancel`, { reason })),
};

// Property Services
export const propertyService = {
  createProperty: (propertyData) => body(hotelApi.post('/properties', propertyData)),
  // Alias for backward compatibility with wizards
  create: async (propertyData) => propertyService.createProperty(propertyData),
  upsertDocuments: (propertyId, documents) => body(hotelApi.post(`/properties/${propertyId}/documents`, { documents })),
  update: (id, data) => body(hotelApi.put(`/properties/${id}`, data)),
  delete: (id) => body(hotelApi.delete(`/properties/${id}`)),
  addRoomType: (propertyId, data) => body(hotelApi.post(`/properties/${propertyId}/room-types`, data)),
  updateRoomType: (propertyId, roomTypeId, data) =>
    body(hotelApi.put(`/properties/${propertyId}/room-types/${roomTypeId}`, data)),
  deleteRoomType: (propertyId, roomTypeId) =>
    body(hotelApi.delete(`/properties/${propertyId}/room-types/${roomTypeId}`)),
  getMy: (filters = {}) => body(hotelApi.get(`/properties/my${toQuery(filters)}`)),
  getPublic: (filters = {}) => body(hotelApi.get(`/properties${toQuery(filters)}`)),
  getDetails: (id) => body(hotelApi.get(`/properties/${id}`)),
};

// Hotel Services
export const hotelService = {
  getAll: (filters = {}) => body(hotelApi.get(`/properties${toQuery(filters)}`)),
  getById: (id) => body(hotelApi.get(`/properties/${id}`)),
  getMyHotels: (filters = {}) => body(hotelApi.get(`/properties/my${toQuery(filters)}`)),
  getCurrentLocation: () => body(hotelApi.get('/hotels/location/current')),
  /** `formData` is a FormData of picked image files (uri / name / type). */
  uploadImages: (formData) => body(hotelApi.post('/hotels/upload', formData)),
  uploadImagesBase64: (images) => body(hotelApi.post('/hotels/upload-base64', { images })),
  getAddressFromCoordinates: async (lat, lng) => {
    try {
      const response = await hotelApi.post('/hotels/location/address', { lat, lng });
      return response.data;
    } catch (error) {
      const err = error.response?.data || { message: error.message };
      if (!err?.mapsUnavailable) console.error('[getAddressFromCoordinates] Backend error:', err);
      throw err;
    }
  },
  saveOnboardingStep: async (data) => {
    try {
      const response = await hotelApi.post('/hotels/onboarding/save-step', data);
      return response.data;
    } catch (error) {
      console.warn('Draft Save Error:', error);
      if (error.response && error.response.status === 404) {
        const errObj = typeof error.response.data === 'object' ? { ...error.response.data } : { message: error.response.data };
        errObj.status = 404;
        throw errObj;
      }
      return fail(error);
    }
  },
  searchLocation: async (query) => {
    try {
      const response = await hotelApi.get(`/hotels/location/search?query=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      const err = error.response?.data || { message: error.message };
      // A deployment without a Maps key answers 503 with this flag; callers handle it.
      if (!err?.mapsUnavailable) console.error('[searchLocation] Backend error:', err);
      throw err;
    }
  },
  calculateDistance: (originLat, originLng, destLat, destLng) =>
    body(hotelApi.get(`/hotels/location/distance?originLat=${originLat}&originLng=${originLng}&destLat=${destLat}&destLng=${destLng}`)),
  deleteHotel: (id) => body(hotelApi.delete(`/hotels/${id}`)),

  // Notification Methods for Partners
  getNotifications: (page = 1, limit = 20) => body(hotelApi.get(`/hotels/notifications?page=${page}&limit=${limit}`)),
  markAllNotificationsRead: () => body(hotelApi.put('/hotels/notifications/read-all')),
  deleteNotifications: (ids) => body(hotelApi.delete('/hotels/notifications', { data: { ids } })),
  deleteImage: (url, publicId) => body(hotelApi.post('/hotels/delete-image', { url, publicId })),
};

// User Profile Services
export const userService = {
  getProfile: () => body(hotelApi.get('/users/profile')),
  updateProfile: (data) => body(hotelApi.put('/users/profile', data)),
  getSavedHotels: () => body(hotelApi.get('/users/saved-hotels')),
  toggleSavedHotel: (hotelId) => body(hotelApi.post(`/users/saved-hotels/${hotelId}`)),
  updateFcmToken: async (fcmToken, platform = 'mobile') => {
    try {
      const response = await hotelApi.put('/users/fcm-token', { fcmToken, platform });
      return response.data;
    } catch (error) {
      console.warn('FCM Token Update Failed:', error);
      return null;
    }
  },
  getNotifications: (page = 1, limit = 20) => body(hotelApi.get(`/users/notifications?page=${page}&limit=${limit}`)),
  deleteNotifications: (ids) => body(hotelApi.delete('/users/notifications', { data: { ids } })),
  markAllNotificationsRead: () => body(hotelApi.put('/users/notifications/read-all')),
};

// Offer & Coupon Services
export const offerService = {
  getActive: () =>
    cachedRead(
      'hotel:offers',
      async () => {
        const response = await hotelApi.get('/offers');
        return response.data;
      },
      { ttl: TTL.PANEL },
    ).catch(fail),
  validate: (code, bookingAmount) => body(hotelApi.post('/offers/validate', { code, bookingAmount })),
  getAll: () => body(hotelApi.get('/offers/all')),
  create: (offerData) => body(hotelApi.post('/offers', offerData)),
};

export const paymentService = {
  createOrder: (bookingId) => body(hotelApi.post('/payments/create-order', { bookingId })),
  verifyPayment: (paymentData) => body(hotelApi.post('/payments/verify', paymentData)),
};

export const legalService = {
  getPage: (audience, slug) =>
    cachedRead(
      keyFor('hotel:info', `${audience}/${slug}`),
      async () => {
        const response = await hotelApi.get(`/info/${audience}/${slug}`);
        return response.data;
      },
      { ttl: TTL.CATALOGUE },
    ).catch(fail),
  getPlatformStatus: () =>
    cachedRead(
      'hotel:platform-status',
      async () => {
        const response = await hotelApi.get('/info/platform/status');
        return response.data;
      },
      { ttl: TTL.CATALOGUE },
    ).catch(fail),
  getFinancialSettings: () =>
    cachedRead(
      'hotel:platform-financials',
      async () => {
        const response = await hotelApi.get('/info/platform/financials');
        return response.data;
      },
      { ttl: TTL.CATALOGUE },
    ).catch(fail),
  submitContact: (audience, payload) => body(hotelApi.post(`/contact/${audience}`, payload)),
};

// Availability & Inventory Services
export const availabilityService = {
  check: (params) => body(hotelApi.get('/availability/check', { params })),
  createWalkIn: (data) => body(hotelApi.post('/availability/partner/walkin', data)),
  createExternal: (data) => body(hotelApi.post('/availability/partner/external-booking', data)),
  blockDates: (data) => body(hotelApi.post('/availability/partner/block-inventory', data)),
  getLedger: (params) => body(hotelApi.get('/availability/partner/ledger', { params })),
};

export const reviewService = {
  getPropertyReviews: (propertyId) => body(hotelApi.get(`/reviews/${propertyId}`)),
  createReview: (reviewData) => body(hotelApi.post('/reviews', reviewData)),
  getPartnerStats: () => body(hotelApi.get('/reviews/partner/stats')),
  getAllPartnerReviews: (status) =>
    body(hotelApi.get(status ? `/reviews/partner/all?status=${status}` : '/reviews/partner/all')),
  reply: (reviewId, reply) => body(hotelApi.post(`/reviews/${reviewId}/reply`, { reply })),
  toggleHelpful: (reviewId) => body(hotelApi.post(`/reviews/${reviewId}/helpful`)),
};

export const referralService = {
  getMyStats: () => body(hotelApi.get('/referrals/my-stats')),
  getActiveProgram: () => body(hotelApi.get('/referrals/program/active')),
};

export const handleResponse = (response) => response.data;

export const handleError = (error) => {
  throw error.response?.data || error.message;
};

/* --- FAQ SERVICES --- */
export const faqService = {
  // Public - Get active FAQs for an audience
  getFaqs: (audience) =>
    cachedRead(
      keyFor('hotel:faqs', audience),
      async () => {
        const response = await hotelApi.get(`/faqs?audience=${audience}`);
        return response.data;
      },
      { ttl: TTL.CATALOGUE },
    ).catch(fail),
  // Admin - Get all FAQs
  getAllFaqsAdmin: (audience) => body(hotelApi.get(`/faqs/admin?audience=${audience}`)),
  createFaq: (faqData) => body(hotelApi.post('/faqs', faqData)),
  updateFaq: (id, faqData) => body(hotelApi.put(`/faqs/${id}`, faqData)),
  deleteFaq: (id) => body(hotelApi.delete(`/faqs/${id}`)),
};

export default hotelApi;
