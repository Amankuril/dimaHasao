import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * Last-known copy of GET results, so a screen can paint immediately and
 * survive a failed refresh. Scoped to the signed-in account, capped in size
 * and count, expired after seven days, wiped on logout. Never holds tokens.
 */

const PREFIX = 'cache:';
const MAX_ENTRY_BYTES = 200 * 1024;
const MAX_ENTRIES = 60;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const mem = new Map();
let scope = 'anon';

export function setCacheScope(accountId) {
  scope = accountId ? String(accountId) : 'anon';
}

const fullKey = (key) => `${PREFIX}${scope}:${key}`;

export async function readCache(key) {
  const k = fullKey(key);
  if (mem.has(k)) return mem.get(k);
  try {
    const raw = await AsyncStorage.getItem(k);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || Date.now() - entry.at > TTL_MS) {
      AsyncStorage.removeItem(k).catch(() => {});
      return null;
    }
    mem.set(k, entry);
    return entry;
  } catch {
    return null;
  }
}

export async function writeCache(key, data) {
  const k = fullKey(key);
  const entry = { at: Date.now(), data };
  mem.set(k, entry);
  try {
    const raw = JSON.stringify(entry);
    if (raw.length > MAX_ENTRY_BYTES) return;
    await AsyncStorage.setItem(k, raw);
    const keys = (await AsyncStorage.getAllKeys()).filter((x) => x.startsWith(PREFIX));
    if (keys.length > MAX_ENTRIES) {
      const entries = await AsyncStorage.multiGet(keys);
      const sorted = entries
        .map(([kk, v]) => {
          try {
            return [kk, JSON.parse(v)?.at || 0];
          } catch {
            return [kk, 0];
          }
        })
        .sort((a, b) => a[1] - b[1]);
      await AsyncStorage.multiRemove(sorted.slice(0, keys.length - MAX_ENTRIES).map(([kk]) => kk));
    }
  } catch {
    /* cache is best effort */
  }
}

export async function clearCache() {
  mem.clear();
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((x) => x.startsWith(PREFIX));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch {
    /* ignore */
  }
}
