/**
 * Where the realtime server lives.
 *
 * Socket.IO runs on its own port (SOCKET_PORT, 5001 by default) rather than
 * sharing the REST API's, so it can be proxied and scaled separately. Food's
 * clients used to derive the socket URL from the API base URL, which silently
 * pointed them at the API port the moment the two diverged — this is the one
 * place that decision is made.
 *
 * Resolution order:
 *   1. VITE_SOCKET_URL — an explicit origin, what production sets when the
 *      realtime server is exposed on its own host.
 *   2. A *relative* VITE_API_BASE_URL (e.g. "/api/v1") means the app is served
 *      from the same origin as its API, behind a proxy — so the socket is on
 *      that origin too and the proxy forwards /socket.io. Inventing a port
 *      here would produce https://site:5001, which no proxy answers.
 *   3. An *absolute* API base (the dev case, http://localhost:5000/api/v1)
 *      gets its port swapped for VITE_SOCKET_PORT, so `npm run dev` needs no
 *      configuration at all.
 */
const env = (key) =>
  (typeof import.meta !== 'undefined' && import.meta.env?.[key]) || '';

const stripTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

/** "http://host:5000/api/v1" -> "http://host:5000" */
const originOf = (value) => {
  const raw = stripTrailingSlash(value);
  if (!raw) return '';
  try {
    return new URL(raw, typeof window !== 'undefined' ? window.location.href : undefined).origin;
  } catch {
    return raw.replace(/\/api\/v\d+\/?$/i, '').replace(/\/api\/?$/i, '');
  }
};

export const resolveSocketOrigin = () => {
  const explicit = stripTrailingSlash(env('VITE_SOCKET_URL'));
  if (explicit) return explicit;

  const pageOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const apiBase = stripTrailingSlash(env('VITE_API_BASE_URL'));

  // Relative API base → same-origin deployment behind a proxy. Use the page
  // origin as-is; the proxy routes /socket.io to the realtime port.
  if (!apiBase || !/^https?:\/\//i.test(apiBase)) return pageOrigin;

  const apiOrigin = originOf(apiBase) || pageOrigin;
  if (!apiOrigin) return '';

  const socketPort = String(env('VITE_SOCKET_PORT') || '').trim();
  if (!socketPort) return apiOrigin;

  try {
    const url = new URL(apiOrigin);
    url.port = socketPort;
    return stripTrailingSlash(url.origin);
  } catch {
    return apiOrigin;
  }
};

/** Memoised: every hook calling this must agree on one origin. */
let cached = null;
export const getSocketOrigin = () => {
  if (cached === null) cached = resolveSocketOrigin();
  return cached;
};

export default getSocketOrigin;
