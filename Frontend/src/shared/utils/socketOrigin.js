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
 *   1. VITE_SOCKET_URL — an explicit origin, what production should set.
 *   2. The API origin with its port swapped for VITE_SOCKET_PORT (dev default
 *      5001), which keeps `npm run dev` working with no extra configuration.
 *   3. The page's own origin, for a deployment that proxies /socket.io.
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

  const apiOrigin =
    originOf(env('VITE_API_BASE_URL')) ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  if (!apiOrigin) return '';

  const socketPort = String(env('VITE_SOCKET_PORT') || '5001').trim();
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
