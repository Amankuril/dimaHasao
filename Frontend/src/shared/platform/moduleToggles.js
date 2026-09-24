/**
 * Which consumer modules are open, as the apps see it.
 *
 * Read from the public endpoint so a signed-out visitor gets the maintenance
 * screen too, cached briefly so every route change does not re-fetch, and
 * refreshed on focus so a module reopening is noticed without a reload.
 *
 * It fails OPEN, like the server does: if this cannot be fetched, every module
 * stays reachable. A network blip closing the whole app would be a far worse
 * outcome than a closed module staying up a few seconds longer.
 */
import { useEffect, useState } from 'react';

const baseURL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')
    : '/api/v1';

export const DEFAULT_MAINTENANCE_MESSAGE =
  'This section is under maintenance right now. Please check back shortly.';

/**
 * Which module owns a path.
 *
 * Both halves of a module are listed: its own route tree, and the places the
 * consumer app reaches it from. Hotels and packages are browsed inside /app
 * before the module's own routes are ever opened, so closing the module has to
 * close those too or the switch only half works.
 *
 * Longest prefix wins, so `/app/hotels` beats a bare `/app`.
 */
const MODULE_PATHS = [
  ['food', ['/food', '/app/food']],
  ['taxi', ['/taxi', '/app/book-ride']],
  ['hotel', ['/hotel', '/app/hotels']],
  /*
   * Packages are the tours module's own consumer surface — /app/packages reads
   * /v1/tours/packages — so closing tours has to close them, or the screen
   * stays up over an API that is already refusing.
   *
   * Festivals are deliberately NOT here. They look adjacent and share an admin
   * section, but they are their own module on /v1/festivals: closing tours left
   * that API serving while the screen claimed maintenance.
   */
  ['tours', ['/tours', '/app/packages']],
  ['places', ['/app/places']],
];

/** Never gated: an admin has to be able to reach the switch that reopens a module. */
const EXEMPT = ['/admin', '/global', '/food/admin', '/taxi/admin', '/hotel/admin', '/tours/admin', '/legal'];

const normalize = (value = '') => {
  const path = String(value || '').split('?')[0].replace(/\/+$/, '');
  return path.startsWith('/') ? path || '/' : `/${path}`;
};

const startsWithSegment = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);

export const isExemptPath = (pathname) => {
  const path = normalize(pathname);
  return EXEMPT.some((prefix) => startsWithSegment(path, prefix));
};

/** @returns {string|null} the module a path belongs to, or null for shared ground. */
export const moduleForPath = (pathname) => {
  const path = normalize(pathname);
  if (isExemptPath(path)) return null;

  let best = null;
  let bestLength = -1;

  for (const [module, prefixes] of MODULE_PATHS) {
    for (const prefix of prefixes) {
      if (startsWithSegment(path, prefix) && prefix.length > bestLength) {
        best = module;
        bestLength = prefix.length;
      }
    }
  }

  return best;
};

const CACHE_TTL_MS = 30000;

let cache = null;
let cachedAt = 0;
let inflight = null;
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener(cache));

export const fetchModuleToggles = async ({ force = false } = {}) => {
  const now = Date.now();
  if (!force && cache && now - cachedAt < CACHE_TTL_MS) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const response = await fetch(`${baseURL}/platform/module-toggles`, {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json();

      cache = body?.toggles || {};
      cachedAt = Date.now();
      notify();
      return cache;
    } catch {
      // Fail open.
      cache = cache || {};
      cachedAt = Date.now();
      return cache;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
};

/**
 * @param {string} pathname
 * @returns {{ checked: boolean, module: string|null, closed: boolean, message: string }}
 */
export const useModuleAvailability = (pathname) => {
  const module = moduleForPath(pathname);
  const [toggles, setToggles] = useState(cache);

  useEffect(() => {
    if (!module) return undefined;

    let active = true;
    const apply = (next) => active && setToggles({ ...(next || {}) });

    listeners.add(apply);
    fetchModuleToggles().then(apply);

    // A module reopening should be noticed without asking for a reload.
    const onFocus = () => fetchModuleToggles({ force: true }).then(apply);
    window.addEventListener('focus', onFocus);

    return () => {
      active = false;
      listeners.delete(apply);
      window.removeEventListener('focus', onFocus);
    };
  }, [module]);

  if (!module) return { checked: true, module: null, closed: false, message: '' };

  const entry = toggles?.[module];

  return {
    // Until the answer is in, treat the module as open: a flash of a
    // maintenance screen on every cold start would be worse than a moment of
    // a module that is about to close.
    checked: Boolean(toggles),
    module,
    closed: entry ? entry.enabled === false : false,
    message: entry?.message || DEFAULT_MAINTENANCE_MESSAGE,
  };
};
