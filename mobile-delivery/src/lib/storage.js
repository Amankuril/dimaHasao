import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * The web reads localStorage and sessionStorage synchronously all over the
 * delivery module. Rather than rewrite every one of those call sites as
 * async, both stores here are synchronous in-memory maps:
 *
 * - localStore mirrors AsyncStorage. hydrateLocalStore() loads it once at
 *   boot (the splash covers that), writes go to memory and then to disk.
 * - sessionStore is memory only, which is what sessionStorage is in a tab
 *   that never closes: it lives as long as the app process.
 *
 * Tokens never go here; they live in expo-secure-store (see context/AuthContext).
 */

const PREFIX = 'dh:';
const mem = new Map();
let hydrated = false;

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
  getItem: (key) => (mem.has(key) ? mem.get(key) : null),
  setItem: (key, value) => {
    const v = String(value);
    mem.set(key, v);
    AsyncStorage.setItem(PREFIX + key, v).catch(() => {});
  },
  removeItem: (key) => {
    mem.delete(key);
    AsyncStorage.removeItem(PREFIX + key).catch(() => {});
  },
  keys: () => [...mem.keys()],
};

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
