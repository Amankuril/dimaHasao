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

const globalService = {
  getMyProfile: () => request(api.get('/me')),
  updateMyProfile: (payload) => request(api.patch('/me', payload)),

  getMeta: () => request(api.get('/meta')),

  getAdministrators: () => request(api.get('/administrators')),
  createAdministrator: (payload) => request(api.post('/administrators', payload)),
  updateAdministrator: (id, payload) => request(api.patch(`/administrators/${id}`, payload)),

  // Support — one desk for every module's tickets.
  getSupportTickets: (params = {}) => request(api.get('/support', { params })),
  getSupportStats: () => request(api.get('/support/stats')),
  getSupportTicket: (id) => request(api.get(`/support/${id}`)),
  updateSupportTicket: (id, payload) => request(api.patch(`/support/${id}`, payload)),
  replySupportTicket: (id, message) => request(api.post(`/support/${id}/messages`, { message })),

  // Reports — the cross-module numbers no single module's panel can produce.
  getReportOverview: (params = {}) => request(api.get('/reports/overview', { params })),
  getReportTimeseries: (params = {}) => request(api.get('/reports/timeseries', { params })),
  getReportTopVendors: (params = {}) => request(api.get('/reports/top', { params })),

  /**
   * Download a report as CSV.
   *
   * Fetched rather than linked: the endpoint needs the admin bearer token, and
   * a plain <a href> cannot carry one. The object URL is revoked straight after
   * the click so the blob is not held for the life of the page.
   */
  downloadReport: async (report, params = {}) => {
    const response = await api.get(`/reports/export/${report}`, { params, responseType: 'blob' });
    const disposition = response.headers['content-disposition'] || '';
    const named = /filename="?([^";]+)"?/.exec(disposition);
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = named?.[1] || `${report}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

export default globalService;
