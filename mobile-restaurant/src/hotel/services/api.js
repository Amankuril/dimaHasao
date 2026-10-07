import api, { upload } from '../../api/client';

/*
 * Stand-in for the web's axios instance in
 * Frontend/src/modules/Hotel/services/apiService.js (baseURL `${API}/hotel`).
 *
 * `hotelApi.get('/properties/my')` calls `/hotel/properties/my`. Any path that
 * starts with /hotel/ is sent by api/client.js with the hotel partner Bearer
 * token, and a 401 there signs the hotel half of the session out, so nothing
 * about tokens is handled here. Results are axios-shaped ({ data, status }) and
 * failures reject with ApiError carrying `.response = { status, data }`.
 */

const BASE = '/hotel';

const full = (path) => `${BASE}${String(path).startsWith('/') ? '' : '/'}${path}`;

export const hotelApi = {
  get: (path, config) => api.get(full(path), config),
  post: (path, body, config) => api.post(full(path), body, config),
  put: (path, body, config) => api.put(full(path), body, config),
  patch: (path, body, config) => api.patch(full(path), body, config),
  delete: (path, config) => api.delete(full(path), config),
  /**
   * Multipart upload with progress (XMLHttpRequest). For plain uploads prefer
   * `hotelApi.post(path, formData)`, which goes through the client's hotel 401
   * handling.
   */
  upload: (path, formData, { method = 'POST', onProgress, headers } = {}) =>
    upload(full(path), formData, { method, onProgress, headers, auth: 'hotel' }),
};

/** `?a=1&b=2` (or '') for the defined values of `params`. */
export function toQuery(params = {}) {
  const qs = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

export default hotelApi;
