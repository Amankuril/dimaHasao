import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { setAuthTokens, setTokensRefreshedHandler, setUnauthorizedHandler } from '../api/client';
import { clearMeCache, getMe, logout as logoutApi } from '../api/auth';
import { hydrateLocalStore, localStore, sessionStore, setSessionSecrets } from '../lib/storage';
import { events } from '../lib/events';
import { registerAuthHandlers } from '../food/utils/auth';
import { toast } from '../lib/notify';
import { clearCache as clearDiskCache } from '../lib/cache';
import { clearCache as clearApiCache } from '../lib/apiCache';

/*
 * The consumer session, ported from Frontend/src/shared/utils/moduleAuth.js
 * (setUnifiedAuthData / clearAuthData / isModuleAuthenticated('user')).
 *
 * One OTP login returns two tokens:
 *   - the food/platform user token (+ refresh token): web keys
 *     `user_accessToken`, `user_refreshToken`;
 *   - the taxi token (`taxiAuth.token`): web keys `token` / `userToken`.
 * Tokens live in SecureStore. The user objects stay in localStore under the
 * web's own keys (`user_user`, `userInfo`), because ported screens read them.
 */

const KEY_ACCESS = 'user_accessToken';
const KEY_REFRESH = 'user_refreshToken';
const KEY_TAXI = 'taxi_userToken';

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
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState(null); // { accessToken, refreshToken, taxiToken }
  const [user, setUser] = useState(null);
  const expiredToastShown = useRef(false);

  const clearLocal = useCallback(async () => {
    setAuthTokens(null);
    setSessionSecrets({});
    clearMeCache();
    await Promise.all([KEY_ACCESS, KEY_REFRESH, KEY_TAXI].map((k) => secure.deleteItemAsync(k))).catch(() => {});
    // clearAuthData(): every key the web removes for the user module.
    ['user_authenticated', 'user_user', 'userInfo', 'role', 'chatRole', 'fcm_registered_token_user'].forEach((k) =>
      localStore.removeItem(k),
    );
    sessionStore.removeItem('userAuthData');
    sessionStore.removeItem('dima_user');
    clearApiCache();
    clearDiskCache();
    setSession(null);
    setUser(null);
    // The web's signal that the signed-in person changed (cart, profile listen).
    events.emit('userAuthChanged');
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await hydrateLocalStore();
      let accessToken = null;
      let refreshToken = null;
      let taxiToken = null;
      try {
        [accessToken, refreshToken, taxiToken] = await Promise.all([
          secure.getItemAsync(KEY_ACCESS),
          secure.getItemAsync(KEY_REFRESH),
          secure.getItemAsync(KEY_TAXI),
        ]);
      } catch {
        /* treat as signed out */
      }
      if (!alive) return;
      // isModuleAuthenticated('user'): a present, unexpired access token. An
      // expired one is still restored when a refresh token can renew it — the
      // first 401 does that — so the app stays signed in across restarts.
      if (accessToken && (!isTokenExpired(accessToken) || refreshToken)) {
        const tokens = { accessToken, refreshToken, taxiToken };
        setAuthTokens(tokens);
        setSessionSecrets(tokens);
        setSession(tokens);
        try {
          setUser(JSON.parse(localStore.getItem('user_user') || 'null'));
        } catch {
          setUser(null);
        }
      }
      setBooting(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Re-validate a restored session once against /food/auth/me.
  useEffect(() => {
    if (!session?.accessToken) return;
    getMe()
      .then((res) => {
        const u = res?.data?.data?.user ?? res?.data?.user;
        if (u) {
          localStore.setItem('user_user', JSON.stringify(u));
          setUser(u);
        }
      })
      .catch(() => {});
    // Only on sign-in / restore, not on every token refresh.
  }, [session?.accessToken ? 'in' : 'out']); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearLocal();
      if (!expiredToastShown.current) {
        expiredToastShown.current = true;
        toast.error('Session expired. Please log in again.', { id: 'session-expired' });
        setTimeout(() => {
          expiredToastShown.current = false;
        }, 5000);
      }
    });
    setTokensRefreshedHandler((tokens) => {
      secure.setItemAsync(KEY_ACCESS, tokens.accessToken).catch(() => {});
      if (tokens.refreshToken) secure.setItemAsync(KEY_REFRESH, tokens.refreshToken).catch(() => {});
      setSessionSecrets(tokens);
      events.emit('authRefreshed', { module: 'user', token: tokens.accessToken });
      setSession((prev) => (prev ? { ...prev, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken || prev.refreshToken } : prev));
    });
    return () => {
      setUnauthorizedHandler(null);
      setTokensRefreshedHandler(null);
    };
  }, [clearLocal]);

  /** setUnifiedAuthData(data): establishes both the food and the taxi session. */
  const loginWithAuthData = useCallback(async (data) => {
    if (!data) return null;
    const accessToken = data.accessToken || data.foodAuth?.accessToken;
    const foodUser = data.user || data.foodAuth?.user;
    const refreshToken = data.refreshToken || data.foodAuth?.refreshToken || null;
    if (!accessToken || !foodUser) return null;
    const taxiAuth = data.taxiAuth && data.taxiAuth.token && data.taxiAuth.user ? data.taxiAuth : null;
    const taxiToken = taxiAuth?.token || null;

    await secure.setItemAsync(KEY_ACCESS, accessToken);
    if (refreshToken && typeof refreshToken === 'string') await secure.setItemAsync(KEY_REFRESH, refreshToken);
    if (taxiToken) await secure.setItemAsync(KEY_TAXI, taxiToken);
    else await secure.deleteItemAsync(KEY_TAXI).catch(() => {});

    localStore.setItem('user_authenticated', 'true');
    localStore.setItem('user_user', JSON.stringify(foodUser));
    localStore.setItem('userInfo', JSON.stringify(taxiAuth?.user || foodUser));
    localStore.setItem('role', 'user');
    localStore.setItem('chatRole', 'user');

    const tokens = { accessToken, refreshToken, taxiToken };
    setAuthTokens(tokens);
    setSessionSecrets(tokens);
    clearMeCache();
    clearApiCache();
    setUser(foodUser);
    setSession(tokens);
    events.emit('userAuthChanged');
    // Food fetches the current location once after a login.
    events.emit('userLoginSuccess');
    return foodUser;
  }, []);

  /** Calls the logout endpoint (best effort), then clears the session. */
  const logout = useCallback(async () => {
    try {
      await logoutApi(session?.refreshToken, localStore.getItem('fcm_registered_token_user'));
    } catch {
      /* the local sign-out still happens */
    }
    await clearLocal();
  }, [clearLocal, session?.refreshToken]);

  /** patchStoredUser('user', patch) */
  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...(patch || {}) };
      localStore.setItem('user_user', JSON.stringify(next));
      try {
        const info = JSON.parse(localStore.getItem('userInfo') || 'null');
        if (info && typeof info === 'object') localStore.setItem('userInfo', JSON.stringify({ ...info, ...patch }));
      } catch {
        /* the cached copy is only a convenience */
      }
      return next;
    });
  }, []);

  // Plain modules ported from the web (utils/auth) sign in / out through here.
  useEffect(() => {
    registerAuthHandlers({ login: loginWithAuthData, logout: clearLocal });
  }, [loginWithAuthData, clearLocal]);

  const value = useMemo(
    () => ({
      booting,
      session,
      user,
      signedIn: Boolean(session?.accessToken),
      loginWithAuthData,
      logout,
      clearSession: clearLocal,
      updateUser,
    }),
    [booting, session, user, loginWithAuthData, logout, clearLocal, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
