/**
 * Turning a stored upload path into something the browser can fetch.
 *
 * Uploads used to be saved with the API server's own origin baked into them,
 * so a file uploaded from a laptop was stored as
 * `http://localhost:5000/uploads/x.webp` — and that string went into the
 * database. On the live site those images pointed at the visitor's own machine
 * and never loaded; locally they pointed at a file sitting on the server's
 * disk and 404'd. The origin was never the database's business.
 *
 * The backend now stores `/uploads/x.webp`, and this resolves it at render
 * time against wherever the API actually is. Records written before that
 * change still carry an origin, so an absolute `/uploads/` URL is rebuilt on
 * the current API origin rather than trusted — that is what repairs the rows
 * already in the database, without a migration having to reach every one.
 */

const RAW_API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api/v1';

/**
 * Where the API lives, without the `/api/v1` suffix.
 *
 * A relative API base (the production setup, where nginx serves both the app
 * and the API from one domain) resolves to the page's own origin, which is
 * exactly right — uploads are served from that same domain.
 */
export const apiOrigin = (() => {
  const base = String(RAW_API_BASE).trim();

  if (/^https?:\/\//i.test(base)) {
    try {
      return new URL(base).origin;
    } catch {
      return '';
    }
  }

  return typeof window !== 'undefined' ? window.location.origin : '';
})();

/**
 * @param {unknown} value  a stored URL, path, or an object holding one
 * @returns {string} something an <img src> can use, or '' when there is nothing
 */
export const resolveAssetUrl = (value) => {
  const raw =
    typeof value === 'string'
      ? value
      : String(
          value?.url ||
            value?.secure_url ||
            value?.imageUrl ||
            value?.iconUrl ||
            value?.src ||
            '',
        );

  const trimmed = raw.trim().replace(/\\/g, '/');
  if (!trimmed) return '';

  // Already renderable on its own terms.
  if (/^(data:|blob:)/i.test(trimmed)) return trimmed;

  const uploadMatch = trimmed.match(/\/?uploads\/(.+)$/i);

  // Not one of ours — an external image, or an app asset like /logo.png.
  if (!uploadMatch) return trimmed;

  const filename = uploadMatch[1].replace(/^\/+/, '');
  // A stored path should never be able to walk out of the uploads directory.
  if (!filename || filename.includes('..')) return '';

  return `${apiOrigin}/uploads/${filename}`;
};

export default resolveAssetUrl;
