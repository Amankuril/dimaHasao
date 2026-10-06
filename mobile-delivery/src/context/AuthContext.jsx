import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { setAuthTokens, setTokensRefreshedHandler, setUnauthorizedHandler } from '../api/client';
import { clearMeCache, deliveryApi } from '../api/delivery';
import { hydrateLocalStore, localStore, sessionStore } from '../lib/storage';
import { toast } from '../lib/notify';
import { clearCache } from '../lib/cache';

/*
 * The delivery session, ported from Frontend/src/modules/Food/utils/auth.js
 * (setAuthData / clearModuleAuth / isModuleAuthenticated for module
 * "delivery"). Tokens live in SecureStore; the user object in localStore
 * under the web's key `delivery_user`.
 */

const KEY_ACCESS = 'delivery_accessToken';
const KEY_REFRESH = 'delivery_refreshToken';

// SecureStore has no web implementation; the Expo web build (used only to
// compare screens side by side) falls back to localStore.
const secure = Platform.OS === 'web'
  ? {
      getItemAsync: async (k) => localStore.getItem(k),
      setItemAsync: async (k, v) => localStore.setItem(k, v),
      deleteItemAsync: async (k) => localStore.removeItem(k),
    }
  : SecureStore;

function b64decode(s) {
  const str = s.replace(/-/g, '+').replace(/_/g, '/');
  if (typeof atob === 'function') return atob(str);
  return '';
}

export function decodeToken(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(b64decode(parts[1]));
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
  const [session, setSession] = useState(null); // { accessToken, refreshToken }
  const [user, setUser] = useState(null);
  const expiredToastShown = useRef(false);

  const clearLocal = useCallback(async () => {
    setAuthTokens(null);
    clearMeCache();
    await Promise.all([secure.deleteItemAsync(KEY_ACCESS), secure.deleteItemAsync(KEY_REFRESH)]).catch(() => {});
    ['delivery_authenticated', 'delivery_user', 'fcm_registered_token_delivery', 'app:isOnline'].forEach((k) =>
      localStore.removeItem(k),
    );
    sessionStore.removeItem('deliveryAuthData');
    clearCache();
    setSession(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await hydrateLocalStore();
      let accessToken = null;
      let refreshToken = null;
      try {
        [accessToken, refreshToken] = await Promise.all([secure.getItemAsync(KEY_ACCESS), secure.getItemAsync(KEY_REFRESH)]);
      } catch {
        /* treat as signed out */
      }
      if (!alive) return;
      // Same rule as the web's ProtectedRoute: a missing or expired access
      // token means signed out (the refresh token only rescues a live session).
      if (accessToken && !isTokenExpired(accessToken)) {
        setAuthTokens({ accessToken, refreshToken });
        setSession({ accessToken, refreshToken });
        try {
          setUser(JSON.parse(localStore.getItem('delivery_user') || 'null'));
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
    deliveryApi
      .getMe()
      .then((res) => {
        const u = res?.data?.data?.user ?? res?.data?.user;
        if (u) {
          localStore.setItem('delivery_user', JSON.stringify(u));
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
    });
    return () => {
      setUnauthorizedHandler(null);
      setTokensRefreshedHandler(null);
    };
  }, [clearLocal]);

  /** setAuthData("delivery", token, user, refreshToken) */
  const login = useCallback(async (accessToken, nextUser, refreshToken = null) => {
    if (!accessToken) throw new Error('Invalid parameters: module=delivery, token=false');
    await secure.setItemAsync(KEY_ACCESS, accessToken);
    if (refreshToken && typeof refreshToken === 'string') await secure.setItemAsync(KEY_REFRESH, refreshToken);
    localStore.setItem('delivery_authenticated', 'true');
    if (nextUser) localStore.setItem('delivery_user', JSON.stringify(nextUser));
    const tokens = { accessToken, refreshToken: refreshToken || null };
    setAuthTokens(tokens);
    clearMeCache();
    setUser(nextUser || null);
    setSession(tokens);
  }, []);

  /** Calls the logout endpoint (best effort), then clears the session. */
  const logout = useCallback(async () => {
    try {
      await deliveryApi.logout(session?.refreshToken);
    } catch {
      /* the local sign-out still happens */
    }
    await clearLocal();
  }, [clearLocal, session?.refreshToken]);

  const updateUser = useCallback((u) => {
    setUser(u);
    if (u) localStore.setItem('delivery_user', JSON.stringify(u));
  }, []);

  const value = useMemo(
    () => ({
      booting,
      session,
      user,
      signedIn: Boolean(session?.accessToken),
      login,
      logout,
      clearSession: clearLocal,
      updateUser,
    }),
    [booting, session, user, login, logout, clearLocal, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
