import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { setAuthTokens, setTokensRefreshedHandler, setUnauthorizedHandler } from '../api/client';
import { clearMeCache, logout as logoutApi } from '../api/auth';
import { hydrateLocalStore, localStore, sessionStore, setSessionSecrets } from '../lib/storage';
import { events } from '../lib/events';
import { registerAuthHandlers } from '../restaurant/utils/auth';
import { FCM_TOKEN_KEY, clearRestaurantCaches } from '../api/restaurant';
import { toast } from '../lib/notify';
import { clearCache as clearDiskCache } from '../lib/cache';
import { clearCache as clearApiCache } from '../lib/apiCache';

/*
 * The restaurant session, ported from Frontend/src/shared/utils/moduleAuth.js
 * (setAuthData('restaurant', …) / clearModuleAuth('restaurant') /
 * isModuleAuthenticated('restaurant')). The app has one role, so this is the
 * only session. Tokens live in SecureStore under the web's key names; the
 * restaurant object stays in localStore as `restaurant_user`, because ported
 * screens read it there.
 */

const KEY_ACCESS = 'restaurant_accessToken';
const KEY_REFRESH = 'restaurant_refreshToken';

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
  const [session, setSession] = useState(null); // { accessToken, refreshToken }
  const [user, setUser] = useState(null);
  const expiredToastShown = useRef(false);

  const clearLocal = useCallback(async () => {
    setAuthTokens(null);
    setSessionSecrets({});
    clearMeCache();
    clearRestaurantCaches();
    await Promise.all([KEY_ACCESS, KEY_REFRESH].map((k) => secure.deleteItemAsync(k))).catch(() => {});
    // clearModuleAuth('restaurant') + clearPartnerSessions(): every key the web removes.
    ['restaurant_authenticated', 'restaurant_user', 'partner_profiles', 'partner_active_workspace', 'partner_onboarding_intent', FCM_TOKEN_KEY].forEach((k) =>
      localStore.removeItem(k),
    );
    sessionStore.removeItem('restaurantAuthData');
    clearApiCache();
    clearDiskCache();
    setSession(null);
    setUser(null);
    // The web's signal that the signed-in person changed (cart, profile listen).
    events.emit('restaurantAuthChanged');
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
      // isModuleAuthenticated('restaurant'): a present, unexpired access token. An
      // expired one is still restored when a refresh token can renew it — the
      // first 401 does that — so the app stays signed in across restarts.
      if (accessToken && (!isTokenExpired(accessToken) || refreshToken)) {
        const tokens = { accessToken, refreshToken };
        setAuthTokens(tokens);
        setSessionSecrets(tokens);
        setSession(tokens);
        try {
          setUser(JSON.parse(localStore.getItem('restaurant_user') || 'null'));
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
      events.emit('authRefreshed', { module: 'restaurant', token: tokens.accessToken });
      setSession((prev) => (prev ? { ...prev, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken || prev.refreshToken } : prev));
    });
    return () => {
      setUnauthorizedHandler(null);
      setTokensRefreshedHandler(null);
    };
  }, [clearLocal]);

  /** setAuthData('restaurant', accessToken, user, refreshToken) */
  const loginWithAuthData = useCallback(async (data) => {
    const accessToken = data?.accessToken;
    const restaurant = data?.user || null;
    const refreshToken = typeof data?.refreshToken === 'string' ? data.refreshToken : null;
    if (!accessToken) return null;

    await secure.setItemAsync(KEY_ACCESS, accessToken);
    if (refreshToken) await secure.setItemAsync(KEY_REFRESH, refreshToken);
    else await secure.deleteItemAsync(KEY_REFRESH).catch(() => {});

    localStore.setItem('restaurant_authenticated', 'true');
    if (restaurant) localStore.setItem('restaurant_user', JSON.stringify(restaurant));

    const tokens = { accessToken, refreshToken };
    setAuthTokens(tokens);
    setSessionSecrets(tokens);
    clearMeCache();
    clearApiCache();
    clearRestaurantCaches();
    setUser(restaurant);
    setSession(tokens);
    events.emit('restaurantAuthChanged');
    return restaurant;
  }, []);

  /** Calls the logout endpoint (best effort), then clears the session. */
  const logout = useCallback(async () => {
    try {
      await logoutApi(session?.refreshToken, localStore.getItem(FCM_TOKEN_KEY));
    } catch {
      /* the local sign-out still happens */
    }
    await clearLocal();
  }, [clearLocal, session?.refreshToken]);

  /** Keeps the cached restaurant object (`restaurant_user`) in step with a profile change. */
  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...(patch || {}) };
      localStore.setItem('restaurant_user', JSON.stringify(next));
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
