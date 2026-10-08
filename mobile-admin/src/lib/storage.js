import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * The web reads localStorage and sessionStorage synchronously all over the
 * admin panels. Rather than rewrite every one of those call sites as async,
 * both stores here are synchronous in-memory maps:
 *
 * - localStore mirrors AsyncStorage. hydrateLocalStore() loads it once at
 *   boot (the splash covers that), writes go to memory and then to disk.
 * - sessionStore is memory only, which is what sessionStorage is in a tab
 *   that never closes: it lives as long as the app process.
 *
 * installWebStorage() exposes them as the globals `localStorage` and
 * `sessionStorage`, so ported code runs unchanged.
 *
 * Tokens are never written to AsyncStorage. The keys the web keeps the admin
 * session under are "secret" keys: held in memory and handed to the secret
 * listener (context/AuthContext), which keeps SecureStore and the API client
 * in step. A ported page that writes `admin_accessToken` therefore updates the
 * real session, as it would on the web.
 */

const PREFIX = 'dha:';
const mem = new Map();
const secrets = new Map();
let hydrated = false;
let secretListener = null;

/** localStorage keys the web stores admin tokens under. */
const SECRET_KEYS = new Set(['admin_accessToken', 'admin_refreshToken', 'adminToken', 'accessToken', 'refreshToken', 'token']);

export async function hydrateLocalStore() {
  if (hydrated) return;
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    const pairs = await AsyncStorage.multiGet(keys);
    pairs.forEach(([k, v]) => {
      if (v != null) mem.set(k.slice(PREFIX.length), v);
    });
  } catch {
    // A broken store must not keep the app on the splash.
  }
  hydrated = true;
}

export const localStore = {
  getItem: (key) => (secrets.has(key) ? secrets.get(key) : mem.has(key) ? mem.get(key) : null),
  setItem: (key, value) => {
    const v = String(value);
    if (SECRET_KEYS.has(key)) {
      if (secrets.get(key) === v) return;
      secrets.set(key, v);
      secretListener?.(key, v);
      return;
    }
    mem.set(key, v);
    AsyncStorage.setItem(PREFIX + key, v).catch(() => {});
  },
  removeItem: (key) => {
    if (SECRET_KEYS.has(key)) {
      if (!secrets.has(key)) return;
      secrets.delete(key);
      secretListener?.(key, null);
      return;
    }
    mem.delete(key);
    AsyncStorage.removeItem(PREFIX + key).catch(() => {});
  },
  clear: () => {
    [...mem.keys()].forEach((k) => AsyncStorage.removeItem(PREFIX + k).catch(() => {}));
    mem.clear();
  },
  key: (i) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
  },
  keys: () => [...mem.keys()],
};

/** AuthContext only: told when ported code writes or removes a token key. */
export function setSecretListener(fn) {
  secretListener = fn;
}

/** AuthContext only: put the session's tokens in place without notifying the listener. */
export function setSessionSecrets({ accessToken, refreshToken } = {}) {
  secrets.clear();
  if (accessToken) {
    secrets.set('admin_accessToken', accessToken);
    // The Taxi panel's legacy bridge key (adminSession.js).
    secrets.set('adminToken', accessToken);
  }
  if (refreshToken) secrets.set('admin_refreshToken', refreshToken);
}

const sessionMem = new Map();
export const sessionStore = {
  getItem: (key) => (sessionMem.has(key) ? sessionMem.get(key) : null),
  setItem: (key, value) => sessionMem.set(key, String(value)),
  removeItem: (key) => sessionMem.delete(key),
  clear: () => sessionMem.clear(),
  key: (i) => [...sessionMem.keys()][i] ?? null,
  get length() {
    return sessionMem.size;
  },
};

/** `localStorage` / `sessionStorage` as globals, for page code ported from the web. */
export function installWebStorage() {
  // In the Expo web preview the browser's own storage is a read-only global; define over it.
  for (const [name, store] of [
    ['localStorage', localStore],
    ['sessionStorage', sessionStore],
  ]) {
    try {
      Object.defineProperty(globalThis, name, { value: store, configurable: true, writable: true });
    } catch {
      /* keep the browser's */
    }
  }
}

export function readJson(store, key, fallback = null) {
  try {
    const raw = store.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
