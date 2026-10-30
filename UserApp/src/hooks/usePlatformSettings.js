/**
 * The district's brand and contact, for any screen in any vertical — ported
 * from Frontend/src/shared/hooks/usePlatformSettings.js. RN has `fetch`
 * built in, so this needed only its API base swapped.
 */
import {useEffect, useState} from 'react';
import {API_BASE_URL} from '../services/api/config';

const apiBase = String(API_BASE_URL || '').replace(/\/+$/, '');

const TTL_MS = 10 * 60 * 1000;

let cache = null;
let cachedAt = 0;
let inFlight = null;

const load = () => {
  const now = Date.now();
  if (cache && now - cachedAt < TTL_MS) return Promise.resolve(cache);
  if (inFlight) return inFlight;

  inFlight = fetch(`${apiBase}/platform/settings`)
    .then(response => (response.ok ? response.json() : null))
    .then(body => {
      if (body?.success && body.settings) {
        cache = body.settings;
        cachedAt = Date.now();
      }
      return cache;
    })
    .catch(() => cache)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

/** Drop the cache — call after an admin saves, so the change shows at once. */
export const refreshPlatformSettings = () => {
  cache = null;
  cachedAt = 0;
  return load();
};

export default function usePlatformSettings(fallback = {}) {
  const [settings, setSettings] = useState(cache || fallback);

  useEffect(() => {
    let cancelled = false;
    load().then(value => {
      if (!cancelled && value) setSettings(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return settings || fallback;
}
