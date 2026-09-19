/**
 * A small read-through cache for the customer app's API calls.
 *
 * Every screen fetched on mount, unconditionally. Opening a restaurant and
 * pressing back re-downloaded the whole list; switching tabs in My Bookings
 * re-downloaded bookings that were already on screen. In a browser that reads
 * as a flicker. Inside the Flutter wrapper, where the webview is doing the
 * work on a phone, it reads as the app being slow.
 *
 * This sits inside the service functions rather than in the screens, so the
 * approved screens keep calling `fetchHotels()` and simply get an answer
 * immediately the second time.
 *
 * Three behaviours, in order of how often they matter:
 *
 *   fresh        within `ttl`, the cached value is returned with no request
 *   stale        past `ttl` but within `swr`, the cached value is returned
 *                *immediately* and a refresh runs in the background, so the
 *                screen paints instantly and corrects itself a moment later
 *   in-flight    concurrent callers share one request rather than racing
 *
 * Deliberately not react-query: adopting it means rewriting every approved
 * screen's data flow, and the whole value here comes from ~100 lines that the
 * screens never have to know about.
 */

/** key -> { value, at, promise } */
const store = new Map();

/** Cached entries a write makes wrong. Tuned per call site, not global. */
export const TTL = {
  /** Catalogue: changes when an admin edits something, not minute to minute. */
  CATALOGUE: 5 * 60 * 1000,
  /** Inventory-backed: seats and rooms move under us, so re-check often. */
  INVENTORY: 60 * 1000,
  /** The signed-in person's own records. Short, and invalidated on write. */
  MINE: 30 * 1000,
};

/** How long a stale value may still be shown while it refreshes behind it. */
const SWR_WINDOW = 10 * 60 * 1000;

const now = () => Date.now();

/**
 * Read through the cache.
 *
 * @param {string} key      stable identity for this request, params included
 * @param {() => Promise<any>} loader
 * @param {{ ttl?: number, swr?: number }} [options]
 */
export const cachedRead = (key, loader, { ttl = TTL.CATALOGUE, swr = SWR_WINDOW } = {}) => {
  const entry = store.get(key);

  // Someone is already asking. Join them rather than starting a second one.
  if (entry?.promise) return entry.promise;

  if (entry && 'value' in entry) {
    const age = now() - entry.at;
    if (age < ttl) return Promise.resolve(entry.value);

    if (age < swr) {
      // Hand back what we have, and quietly put a fresh copy behind it. A
      // failed refresh must not reject: the caller already has its answer and
      // is not waiting on this.
      void refresh(key, loader).catch(() => {});
      return Promise.resolve(entry.value);
    }
  }

  return refresh(key, loader);
};

const refresh = (key, loader) => {
  const promise = loader()
    .then((value) => {
      store.set(key, { value, at: now() });
      return value;
    })
    .catch((error) => {
      // Drop the in-flight marker but keep any previous value: a network blip
      // should not also erase what the user was looking at.
      const previous = store.get(key);
      if (previous && 'value' in previous) store.set(key, { value: previous.value, at: previous.at });
      else store.delete(key);
      throw error;
    });

  const previous = store.get(key);
  store.set(key, { ...(previous || {}), promise });
  return promise;
};

/**
 * Forget everything whose key starts with one of these prefixes.
 *
 * Call this after a write. Placing an order and then being shown a cached
 * order list without it in it is worse than any amount of loading, so every
 * mutation in these services invalidates what it just made wrong.
 *
 * @param {...string} prefixes
 */
export const invalidate = (...prefixes) => {
  for (const key of [...store.keys()]) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) store.delete(key);
  }
};

/** Drop everything — used when the signed-in person changes. */
export const clearCache = () => store.clear();

/** Stable cache key for a call plus its arguments. */
export const keyFor = (name, params) =>
  params === undefined || params === null || (typeof params === 'object' && !Object.keys(params).length)
    ? name
    : `${name}:${typeof params === 'object' ? JSON.stringify(params) : String(params)}`;

export default { cachedRead, invalidate, clearCache, keyFor, TTL };
