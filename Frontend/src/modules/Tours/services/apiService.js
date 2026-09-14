/**
 * Axios instance for the tours panels.
 *
 * The shared client in services/api/axios.js picks its token from the URL and
 * would hand an operator the *consumer* token, so tours resolves its own:
 * admin screens use the platform admin session, operator screens use the
 * operator token issued by the tours-operator audience.
 */
import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

export const OPERATOR_TOKEN_KEY = 'tours_operator_token';

const api = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });

const resolveToken = () => {
  const path = String(window.location?.pathname || '');
  if (path.includes('/tours/admin')) {
    return localStorage.getItem('admin_accessToken') || localStorage.getItem('adminToken');
  }
  return localStorage.getItem(OPERATOR_TOKEN_KEY);
};

api.interceptors.request.use((config) => {
  const token = resolveToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Unwraps to the payload and rethrows the server's message, not axios's. */
const request = async (promise) => {
  try {
    const response = await promise;
    return response.data;
  } catch (error) {
    const body = error.response?.data;
    const thrown = typeof body === 'object' && body !== null
      ? { ...body }
      : { message: body || error.message || 'Request failed' };
    // Callers branch on this (a 401 signs the operator out), and axios buries it.
    thrown.status = error.response?.status ?? 0;
    throw thrown;
  }
};

export const toursApi = {
  get: (url, config) => request(api.get(url, config)),
  post: (url, body, config) => request(api.post(url, body, config)),
  put: (url, body, config) => request(api.put(url, body, config)),
  patch: (url, body, config) => request(api.patch(url, body, config)),
  delete: (url, config) => request(api.delete(url, config)),
};

export default api;
