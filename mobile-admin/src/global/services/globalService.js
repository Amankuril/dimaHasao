/* Ported from Frontend/src/modules/Global/services/globalService.js (tools/port.js first pass). */
/**
 * Platform-level admin API.
 *
 * Talks to /v1/admin — the administrator endpoints that belong to the platform
 * rather than to any one module. Uses the admin session token the same way the
 * other admin panels do.
 */
import { createApi, API_URL } from '../../api/client';
import { downloadAndShare } from '../../lib/files';

// The app client sends the platform admin token on every request.
const api = createApi('/admin');

/** Unwraps to the payload and rethrows the server's message, not axios's. */
const request = async (promise) => {
  try {
    return (await promise).data;
  } catch (error) {
    const body = error.response?.data;
    const thrown =
      typeof body === 'object' && body !== null
        ? {
            ...body,
          }
        : {
            message: body || error.message || 'Request failed',
          };
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
  // Which consumer modules are open, and the notice shown when one is not.
  getModuleToggles: () => request(api.get('/platform-settings/module-toggles')),
  saveModuleToggles: (updates) =>
    request(
      api.patch('/platform-settings/module-toggles', {
        updates,
      }),
    ),
  // Brand, contact and support — one copy for every app.
  getPlatformSettings: () => request(api.get('/platform-settings')),
  savePlatformSettings: (payload) => request(api.put('/platform-settings', payload)),
  // Legal — privacy, terms and the rest, one copy for every app.
  getLegalDocuments: () => request(api.get('/legal')),
  saveLegalDocument: (payload) => request(api.put('/legal', payload)),
  deleteLegalDocument: (id) => request(api.delete(`/legal/${id}`)),
  // Support — one desk for every module's tickets.
  getSupportTickets: (params = {}) =>
    request(
      api.get('/support', {
        params,
      }),
    ),
  getSupportStats: () => request(api.get('/support/stats')),
  getSupportTicket: (id) => request(api.get(`/support/${id}`)),
  updateSupportTicket: (id, payload) => request(api.patch(`/support/${id}`, payload)),
  replySupportTicket: (id, message) =>
    request(
      api.post(`/support/${id}/messages`, {
        message,
      }),
    ),
  // Reports — the cross-module numbers no single module's panel can produce.
  getReportOverview: (params = {}) =>
    request(
      api.get('/reports/overview', {
        params,
      }),
    ),
  getReportTimeseries: (params = {}) =>
    request(
      api.get('/reports/timeseries', {
        params,
      }),
    ),
  getReportTopVendors: (params = {}) =>
    request(
      api.get('/reports/top', {
        params,
      }),
    ),
  /**
   * Download a report as CSV.
   *
   * Fetched with the admin bearer token (a plain link cannot carry one), then
   * handed to the share sheet. The server names the file in
   * Content-Disposition; the web falls back to `${report}.csv`, which is the
   * name used here.
   */
  downloadReport: async (report, params = {}) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    const url = `${API_URL}/admin/reports/export/${report}${qs ? `?${qs}` : ''}`;
    // downloadAndShare reports its own failure with a toast.
    await downloadAndShare(url, `${report}.csv`);
  },
};
export default globalService;
