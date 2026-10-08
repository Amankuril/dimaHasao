/* Ported from Frontend/src/modules/Hotel/config/apiConfig.js. */
// Hotel module talks to this platform's backend, where the ported HomeZoo
// routes are mounted under /v1/hotel (see Backend/src/routes/index.js).
import { API_URL } from '../../api/client';

const PLATFORM_API_BASE = String(API_URL).replace(/\/$/, '');
export const API_BASE_URL = `${PLATFORM_API_BASE}/hotel`;
export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`;
