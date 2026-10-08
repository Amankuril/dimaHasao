/* Ported from Frontend/src/modules/Taxi/shared/api/runtimeConfig.js. */
import { API_URL, API_ORIGIN } from '../../../api/client';

/*
 * The web resolves the API base from VITE_API_BASE_URL and appends /taxi; the
 * app has one configured API URL (EXPO_PUBLIC_API_URL, ending in /api/v1).
 */
const trimTrailingSlash = (value = '') => String(value || '').replace(/\/+$/, '');
const rawApiBase = trimTrailingSlash(API_URL);
export const API_BASE_URL = trimTrailingSlash(rawApiBase.endsWith('/taxi') ? rawApiBase : `${rawApiBase}/taxi`);

// Socket / API origin.
export const BACKEND_ORIGIN = trimTrailingSlash(API_ORIGIN);
export const BACKEND_LABEL = BACKEND_ORIGIN;
