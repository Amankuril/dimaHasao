import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * The web reads localStorage and sessionStorage synchronously all over the
 * food and taxi modules. Rather than rewrite every one of those call sites as
 * async, both stores here are synchronous in-memory maps:
 *
 * - localStore mirrors AsyncStorage. hydrateLocalStore() loads it once at
 *   boot (the splash covers that), writes go to memory and then to disk.
 * - sessionStore is memory only, which is what sessionStorage is in a tab
 *   that never closes: it lives as long as the app process.
 *
 * Tokens are never written to AsyncStorage. They live in expo-secure-store
 * (context/AuthContext); the keys the web keeps them under are "secret" keys
 * here: readable through localStore so ported code that checks
 * `localStorage.getItem('user_accessToken')` still works, but held in memory
 * only.
 */

const PREFIX = 'dh:';
const mem = new Map();
const secrets = new Map();
let hydrated = false;

/** localStorage keys the web stores tokens under. */
const SECRET_KEYS = new Set(['user_accessToken', 'user_refreshToken', 'accessToken', 'refreshToken', 'token', 'userToken']);

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
      secrets.set(key, v);
      return;
    }
    mem.set(key, v);
    AsyncStorage.setItem(PREFIX + key, v).catch(() => {});
  },
  removeItem: (key) => {
    if (SECRET_KEYS.has(key)) {
      secrets.delete(key);
      return;
    }
    mem.delete(key);
    AsyncStorage.removeItem(PREFIX + key).catch(() => {});
  },
  keys: () => [...mem.keys()],
};

/** Mirror the session's tokens into the in-memory secret keys (AuthContext only). */
export function setSessionSecrets({ accessToken, refreshToken } = {}) {
  secrets.clear();
  // The keys the web's restaurant pages read from localStorage.
  if (accessToken) secrets.set('restaurant_accessToken', accessToken);
  if (refreshToken) secrets.set('restaurant_refreshToken', refreshToken);
}

const sessionMem = new Map();
export const sessionStore = {
  getItem: (key) => (sessionMem.has(key) ? sessionMem.get(key) : null),
  setItem: (key, value) => sessionMem.set(key, String(value)),
  removeItem: (key) => sessionMem.delete(key),
  clear: () => sessionMem.clear(),
};

export function readJson(store, key, fallback = null) {
  try {
    const raw = store.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
