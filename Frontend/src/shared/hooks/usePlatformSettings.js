/**
 * The district's brand and contact, for any screen in any app.
 *
 * Brand name, logo and support details were read from three different module
 * settings — food's business settings, taxi's CMS settings, hotel's platform
 * settings — and hard-coded in a few more places besides, which is how an
 * address at the previous product ended up printed as this district's support
 * contact. There is one record now, and this is how a screen reads it.
 *
 * Cached at module scope and shared between callers: the value changes when an
 * admin edits it, not per render, and a dozen components mounting at once
 * should cost one request rather than a dozen.
 *
 * Never throws and never suspends. A screen that cannot reach the API still
 * renders — it just falls back to what it was given.
 */
import { useEffect, useState } from 'react';

const RAW_API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api/v1';
const apiBase = String(RAW_API_BASE).replace(/\/+$/, '');

/** Ten minutes: brand details change when someone edits them, rarely. */
const TTL_MS = 10 * 60 * 1000;

let cache = null;
let cachedAt = 0;
let inFlight = null;

const load = () => {
  const now = Date.now();
  if (cache && now - cachedAt < TTL_MS) return Promise.resolve(cache);
  if (inFlight) return inFlight;

  inFlight = fetch(`${apiBase}/platform/settings`)
    .then((response) => (response.ok ? response.json() : null))
    .then((body) => {
      if (body?.success && body.settings) {
        cache = body.settings;
        cachedAt = Date.now();
      }
      return cache;
    })
    .catch(() => cache)
    .finally(() => { inFlight = null; });

  return inFlight;
};

/** Drop the cache — call after an admin saves, so the change shows at once. */
export const refreshPlatformSettings = () => {
  cache = null;
  cachedAt = 0;
  return load();
};

/**
 * @param {object} [fallback] what to return until the real settings arrive
 * @returns {object} brandName, tagline, logoUrl, supportEmail, supportPhone,
 *                   supportUrl, address, state, pincode
 */
export default function usePlatformSettings(fallback = {}) {
  const [settings, setSettings] = useState(cache || fallback);

  useEffect(() => {
    let cancelled = false;
    load().then((value) => {
      if (!cancelled && value) setSettings(value);
    });
    return () => { cancelled = true; };
  }, []);

  return settings || fallback;
}
