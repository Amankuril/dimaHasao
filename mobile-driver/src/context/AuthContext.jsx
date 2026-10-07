import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { setAuthTokens } from '../api/client';
import { hydrateLocalStore, localStore, sessionStore, setSessionSecrets } from '../lib/storage';
import { events } from '../lib/events';
import { registerAuthHandlers } from '../driver/utils/authBridge';
import { toast } from '../lib/notify';
import { clearCache as clearDiskCache } from '../lib/cache';
import { clearCache as clearApiCache } from '../lib/apiCache';
import { socketService } from '../driver/api/socket';
import { clearSavedFcmToken } from '../lib/push';

/*
 * The driver session, ported from the web's registrationService (persistDriverAuthSession /
 * clearDriverAuthState / getLocalDriverToken). The taxi backend issues one bearer token for the driver
 * (no refresh token). It lives in SecureStore; the web's non-secret keys (driverInfo, driverRole, role,
 * chatRole, driverRegistrationSession) stay in localStore because ported screens read them there.
 */

const KEY_TOKEN = 'driver_accessToken';
// localStorage / sessionStorage keys the web clears on sign-out (DRIVER_AUTH_KEYS + the onboarding session).
const DRIVER_AUTH_KEYS = ['token', 'driverToken', 'driverInfo', 'role', 'driverRole', 'chatRole', 'driverRegistrationSession'];

// SecureStore has no web implementation; the Expo web preview falls back to localStore.
const secure =
  Platform.OS === 'web'
    ? {
        getItemAsync: async (k) => localStore.getItem(k),
        setItemAsync: async (k, v) => localStore.setItem(k, v),
        deleteItemAsync: async (k) => localStore.removeItem(k),
      }
    : SecureStore;

export function decodeToken(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  if (!decoded.exp) return false;
  return decoded.exp * 1000 < Date.now();
}

const AuthContext = createContext(null);

const applyToken = (token) => {
  setAuthTokens(token ? { accessToken: token, taxiToken: token } : null);
  setSessionSecrets(token ? { accessToken: token } : {});
};

export function AuthProvider({ children }) {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const expiredToastShown = useRef(false);

  const clearLocal = useCallback(async () => {
    // Drop the live socket and the cached FCM token so the next sign-in (maybe another driver) re-registers both.
    socketService.disconnect();
    clearSavedFcmToken();
    applyToken(null);
    await secure.deleteItemAsync(KEY_TOKEN).catch(() => {});
    DRIVER_AUTH_KEYS.forEach((k) => {
      localStore.removeItem(k);
      sessionStore.removeItem(k);
    });
    clearApiCache();
    clearDiskCache();
    setToken(null);
    setUser(null);
    events.emit('driverAuthChanged');
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await hydrateLocalStore();
      let stored = null;
      try {
        stored = await secure.getItemAsync(KEY_TOKEN);
      } catch {
        /* treat as signed out */
      }
      if (!alive) return;
      if (stored && !isTokenExpired(stored)) {
        applyToken(stored);
        setToken(stored);
        try {
          setUser(JSON.parse(localStore.getItem('driverInfo') || 'null'));
        } catch {
          setUser(null);
        }
      } else if (stored) {
        secure.deleteItemAsync(KEY_TOKEN).catch(() => {});
      }
      setBooting(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // The taxi client reports a rejected token (401, "jwt expired", ...) as app:auth-stale; the web clears the
  // driver token and the next guard check sends the driver to the login page.
  useEffect(() => {
    const off = events.on('app:auth-stale', (event) => {
      const stale = event?.detail?.token;
      if (stale && token && stale !== token) return;
      clearLocal();
      if (!expiredToastShown.current) {
        expiredToastShown.current = true;
        toast.error('Session expired. Please log in again.', { id: 'session-expired' });
        setTimeout(() => {
          expiredToastShown.current = false;
        }, 5000);
      }
    });
    return off;
  }, [clearLocal, token]);

  /** persistDriverAuthSession({ token, role }) + driverInfo. */
  const loginWithAuthData = useCallback(async (data) => {
    const nextToken = data?.token || data?.accessToken;
    if (!nextToken) return null;
    const role = String(data?.role || 'driver').toLowerCase();
    await secure.setItemAsync(KEY_TOKEN, nextToken);
    localStore.setItem('driverRole', role);
    localStore.setItem('role', role);
    localStore.setItem('chatRole', role === 'owner' ? 'owner' : 'driver');
    if (data?.driver) localStore.setItem('driverInfo', JSON.stringify(data.driver));
    applyToken(nextToken);
    clearApiCache();
    setUser(data?.driver || null);
    setToken(nextToken);
    events.emit('driverAuthChanged');
    events.emit('app:auth-ready', { role, hasToken: true, source: 'driver' });
    return data?.driver || null;
  }, []);

  const logout = useCallback(async () => {
    await clearLocal();
  }, [clearLocal]);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...(patch || {}) };
      localStore.setItem('driverInfo', JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    registerAuthHandlers({ login: loginWithAuthData, logout: clearLocal });
  }, [loginWithAuthData, clearLocal]);

  const value = useMemo(
    () => ({ booting, token, user, signedIn: Boolean(token), loginWithAuthData, logout, clearSession: clearLocal, updateUser }),
    [booting, token, user, loginWithAuthData, logout, clearLocal, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
