// Hotel module talks to this platform’s backend, where the ported HomeZoo
// routes are mounted under /v1/hotel (see Backend/src/routes/index.js).
const PLATFORM_API_BASE = String(
  import.meta.env?.VITE_API_BASE_URL || '/api/v1',
).replace(/\/$/, '');

export const API_BASE_URL = `${PLATFORM_API_BASE}/hotel`;

export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`;
