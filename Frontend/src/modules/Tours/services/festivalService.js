/**
 * Festival administration.
 *
 * Festivals and tours are both run by the district itself rather than by any
 * vendor, so they are administered from one section. This used to live in
 * globalService alongside administrators, support and reports; it moved here
 * when that section became "Tours & Festivals".
 *
 * Note the API root: festivals are mounted at /v1/festivals/admin, not under
 * /v1/admin like the platform-level endpoints.
 */
import axios from 'axios';

const API_ROOT =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')
    : '/api/v1';

const festivalApi = axios.create({ baseURL: `${API_ROOT}/festivals`, timeout: 20000 });

festivalApi.interceptors.request.use((config) => {
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

const festivalService = {
  getFestivals: () => request(festivalApi.get('/admin')),
  createFestival: (payload) => request(festivalApi.post('/admin', payload)),
  updateFestival: (id, payload) => request(festivalApi.put(`/admin/${id}`, payload)),
  toggleFestival: (id, isActive) => request(festivalApi.patch(`/admin/${id}/active`, { isActive })),
  deleteFestival: (id) => request(festivalApi.delete(`/admin/${id}`)),
  getFestivalBookings: (params = {}) => request(festivalApi.get('/admin/bookings', { params })),
  /** One festival: seat status per category, plus every booking behind it. */
  getFestivalSummary: (id, params = {}) => request(festivalApi.get(`/admin/${id}/bookings`, { params })),
  verifyFestivalPass: (qrCode) => request(festivalApi.post('/admin/bookings/verify', { qrCode })),
  /** Cancel a pass on the attendee's behalf; releases the seats it held. */
  cancelFestivalBooking: (id, reason) =>
    request(festivalApi.post(`/admin/bookings/${id}/cancel`, { reason })),
};

export default festivalService;
