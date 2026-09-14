/** Tours API root. Mirrors how the Hotel module resolves its base URL. */
export const API_BASE_URL = `${
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')
    : '/api/v1')
}/tours`;

export default API_BASE_URL;
