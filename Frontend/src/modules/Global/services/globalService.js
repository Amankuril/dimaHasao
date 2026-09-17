/**
 * Platform-level admin API.
 *
 * Talks to /v1/admin — the administrator endpoints that belong to the platform
 * rather than to any one module. Uses the admin session token the same way the
 * other admin panels do.
 */
import axios from 'axios';

const API_ROOT =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')
    : '/api/v1';

const api = axios.create({ baseURL: `${API_ROOT}/admin`, timeout: 20000 });

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('admin_accessToken') || localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Unwraps to the payload and rethrows the server's message, not axios's. */
const request = async (promise) => {
  try {
    return (await promise).data;
  } catch (error) {
    const body = error.response?.data;
    const thrown =
      typeof body === 'object' && body !== null
        ? { ...body }
        : { message: body || error.message || 'Request failed' };
    thrown.status = error.response?.status ?? 0;
    throw thrown;
  }
};

/** Festivals live at their own API root, not under /admin. */
const festivalApi = axios.create({ baseURL: `${API_ROOT}/festivals`, timeout: 20000 });
festivalApi.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('admin_accessToken') || localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const globalService = {
  getMyProfile: () => request(api.get('/me')),
  updateMyProfile: (payload) => request(api.patch('/me', payload)),

  getMeta: () => request(api.get('/meta')),

  getAdministrators: () => request(api.get('/administrators')),
  createAdministrator: (payload) => request(api.post('/administrators', payload)),
  updateAdministrator: (id, payload) => request(api.patch(`/administrators/${id}`, payload)),

  // Festivals — platform-run events, so they belong to Global rather than to
  // any one module.
  getFestivals: () => request(festivalApi.get('/admin')),
  createFestival: (payload) => request(festivalApi.post('/admin', payload)),
  updateFestival: (id, payload) => request(festivalApi.put(`/admin/${id}`, payload)),
  toggleFestival: (id, isActive) => request(festivalApi.patch(`/admin/${id}/active`, { isActive })),
  deleteFestival: (id) => request(festivalApi.delete(`/admin/${id}`)),
  getFestivalBookings: (params = {}) => request(festivalApi.get('/admin/bookings', { params })),
  verifyFestivalPass: (qrCode) => request(festivalApi.post('/admin/bookings/verify', { qrCode })),

  // Support — one desk for every module's tickets.
  getSupportTickets: (params = {}) => request(api.get('/support', { params })),
  getSupportStats: () => request(api.get('/support/stats')),
  getSupportTicket: (id) => request(api.get(`/support/${id}`)),
  updateSupportTicket: (id, payload) => request(api.patch(`/support/${id}`, payload)),
  replySupportTicket: (id, message) => request(api.post(`/support/${id}/messages`, { message })),
};

export default globalService;
