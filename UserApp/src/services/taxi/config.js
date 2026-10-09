/**
 * Ported from Frontend/src/modules/Taxi/shared/api/runtimeConfig.js.
 *
 * The Taxi module is a separate backend subsystem mounted at /api/v1/taxi —
 * its own axios instance, its own token scheme (userToken/driverToken/token,
 * not the ${module}_accessToken scheme the rest of the app uses). The RN
 * app's main API_BASE_URL already resolves to the platform root, so this
 * just appends /taxi.
 */
import {API_BASE_URL} from '../api/config';

export const TAXI_API_BASE_URL = `${API_BASE_URL}/taxi`;

// Socket.IO is served from the backend's own origin (API_BASE_URL minus the
// /api/v1 suffix), same realtime server the rest of the app would use.
export const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api(\/v1)?$/i, '');
