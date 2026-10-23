/**
 * Settings the backend can change after the web app is built.
 *
 * index.html loads /platform/runtime-config.js before the app, which sets
 * window.__RUNTIME_CONFIG__. When that script is missing (backend down, old
 * backend) everything falls back to the value baked in at build time, so the
 * app behaves exactly as it did before.
 */
const runtime = () => (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__) || {};

/** The Google Maps JavaScript key for the browser (referrer-restricted). */
export const getMapsBrowserKey = () =>
  String(runtime().googleMapsBrowserKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');
