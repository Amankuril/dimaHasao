import { API_ORIGIN } from '../api/client';

/**
 * A file from the web app's /public folder (hero photos, login background).
 * They are served by the same origin as the API, which is where the web app
 * itself loads them from.
 */
export const webAsset = (path) => `${API_ORIGIN}${String(path).startsWith('/') ? '' : '/'}${path}`;

/** Image `source` for a URL that may be relative to the site. */
export const img = (src) => {
  if (!src || typeof src !== 'string') return undefined;
  if (/^(https?:|data:|file:|content:)/i.test(src)) return { uri: src };
  return { uri: webAsset(src) };
};
