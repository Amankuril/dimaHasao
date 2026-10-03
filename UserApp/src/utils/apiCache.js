/**
 * A small read-through cache for API calls — ported verbatim from
 * Frontend/src/shared/utils/apiCache.js (no web APIs involved, so no RN
 * changes needed).
 *
 * Three behaviours, in order of how often they matter:
 *   fresh        within `ttl`, the cached value is returned with no request
 *   stale        past `ttl` but within `swr`, the cached value is returned
 *                immediately and a refresh runs in the background
 *   in-flight    concurrent callers share one request rather than racing
 */

/** key -> { value, at, promise } */
const store = new Map();

export const TTL = {
  CATALOGUE: 5 * 60 * 1000,
  INVENTORY: 60 * 1000,
  MINE: 30 * 1000,
  PANEL: 20 * 1000,
};

const SWR_WINDOW = 10 * 60 * 1000;

const now = () => Date.now();

export const cachedRead = (key, loader, {ttl = TTL.CATALOGUE, swr = SWR_WINDOW} = {}) => {
  const entry = store.get(key);

  if (entry?.promise) return entry.promise;

  if (entry && 'value' in entry) {
    const age = now() - entry.at;
    if (age < ttl) return Promise.resolve(entry.value);

    if (age < swr) {
      void refresh(key, loader).catch(() => {});
      return Promise.resolve(entry.value);
    }
  }

  return refresh(key, loader);
};

const refresh = (key, loader) => {
  const promise = loader()
    .then(value => {
      store.set(key, {value, at: now()});
      return value;
    })
    .catch(error => {
      const previous = store.get(key);
      if (previous && 'value' in previous) store.set(key, {value: previous.value, at: previous.at});
      else store.delete(key);
      throw error;
    });

  const previous = store.get(key);
  store.set(key, {...(previous || {}), promise});
  return promise;
};

/** Forget everything whose key starts with one of these prefixes. */
export const invalidate = (...prefixes) => {
  for (const key of [...store.keys()]) {
    if (prefixes.some(prefix => key.startsWith(prefix))) store.delete(key);
  }
};

/** Drop everything — used when the signed-in person changes. */
export const clearCache = () => store.clear();

export const keyFor = (name, params) =>
  params === undefined || params === null || (typeof params === 'object' && !Object.keys(params).length)
    ? name
    : `${name}:${typeof params === 'object' ? JSON.stringify(params) : String(params)}`;

export default {cachedRead, invalidate, clearCache, keyFor, TTL};
