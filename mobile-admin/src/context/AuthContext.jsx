import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { setAuthTokens, setTokensRefreshedHandler, setUnauthorizedHandler } from '../api/client';
import { clearMeCache, logout as logoutApi } from '../api/auth';
import { hydrateLocalStore, installWebStorage, localStore, sessionStore, setSecretListener, setSessionSecrets } from '../lib/storage';
import { events } from '../lib/events';
import { toast } from '../lib/notify';
import { clearCache as clearDiskCache } from '../lib/cache';
import { clearCache as clearApiCache } from '../lib/apiCache';
import { clearUnifiedAdminSession, isTokenExpired, normalizeAdminProfile, setAuthData, setUnifiedAdminSession } from '../admin/session';

/*
 * The admin session, as the web keeps it (Food/pages/admin/auth/AdminLogin.jsx:
 * setAuthData('admin', …) + setUnifiedAdminSession(…)). One email + password
 * sign-in serves all five panels.
 *
 * Tokens live in SecureStore under the web's key names (admin_accessToken,
 * admin_refreshToken); the admin profile stays in localStorage as `admin_user`
 * / `adminInfo`, because ported pages read it there. Ported code that writes a
 * token key (a profile save that returns new tokens) reaches SecureStore and
 * the API client through lib/storage's secret listener.
 */

const KEY_ACCESS = 'admin_accessToken';
const KEY_REFRESH = 'admin_refreshToken';
const LOCAL_KEYS = ['admin_authenticated', 'admin_user', 'adminInfo', 'fcm_web_registered_token_admin'];

installWebStorage();

// SecureStore has no web implementation; the Expo web preview falls back to the local store.
const secure =
  Platform.OS === 'web'
    ? {
        getItemAsync: async (k) => localStore.getItem(k),
        setItemAsync: async (k, v) => localStore.setItem(k, v),
        deleteItemAsync: async (k) => localStore.removeItem(k),
      }
    : SecureStore;

const AuthContext = createContext(null);

const readUser = () => {
  try {
    return JSON.parse(localStore.getItem('admin_user') || 'null');
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState(null); // { accessToken, refreshToken }
  const [user, setUser] = useState(null);
  const sessionRef = useRef(null);
  const expiredToastShown = useRef(false);

  const apply = useCallback((tokens) => {
    sessionRef.current = tokens;
    setAuthTokens(tokens);
    setSessionSecrets(tokens || {});
    setSession(tokens);
  }, []);

  /** clearModuleAuth('admin') + clearUnifiedAdminSession(): the local sign-out. */
  const clearLocal = useCallback(async () => {
    apply(null);
    clearMeCache();
    await Promise.all([KEY_ACCESS, KEY_REFRESH].map((k) => secure.deleteItemAsync(k))).catch(() => {});
    LOCAL_KEYS.forEach((k) => localStore.removeItem(k));
    sessionStore.removeItem('adminAuthData');
    clearApiCache();
    clearDiskCache();
    setUser(null);
    events.emit('adminAuthChanged');
  }, [apply]);

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
      // An expired access token is kept while a refresh token can renew it (the first 401 does),
      // so the admin stays signed in across app restarts.
      if (accessToken && (!isTokenExpired(accessToken) || refreshToken)) {
        apply({ accessToken, refreshToken });
        setUser(readUser());
      } else if (accessToken) {
        await Promise.all([KEY_ACCESS, KEY_REFRESH].map((k) => secure.deleteItemAsync(k))).catch(() => {});
      }
      setBooting(false);
    })();
    return () => {
      alive = false;
    };
  }, [apply]);

  // Ported code writing admin_accessToken / admin_refreshToken / adminToken.
  useEffect(() => {
    setSecretListener((key, value) => {
      const cur = sessionRef.current || {};
      if (key === 'admin_accessToken' || key === 'adminToken') {
        if (!value) return; // removals arrive through clearLocal / logout
        if (value === cur.accessToken) return;
        const next = { ...cur, accessToken: value };
        apply(next);
        secure.setItemAsync(KEY_ACCESS, value).catch(() => {});
      } else if (key === 'admin_refreshToken' && value && value !== cur.refreshToken) {
        const next = { ...cur, refreshToken: value };
        apply(next);
        secure.setItemAsync(KEY_REFRESH, value).catch(() => {});
      }
    });
    return () => setSecretListener(null);
  }, [apply]);

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
      sessionRef.current = tokens;
      secure.setItemAsync(KEY_ACCESS, tokens.accessToken).catch(() => {});
      if (tokens.refreshToken) secure.setItemAsync(KEY_REFRESH, tokens.refreshToken).catch(() => {});
      setSessionSecrets(tokens);
      events.emit('authRefreshed', { module: 'admin', token: tokens.accessToken });
      setSession({ ...tokens });
    });
    return () => {
      setUnauthorizedHandler(null);
      setTokensRefreshedHandler(null);
    };
  }, [clearLocal]);

  /** AdminLogin: setAuthData('admin', token, user, refresh) + setUnifiedAdminSession(...). */
  const loginWithAuthData = useCallback(
    async ({ accessToken, refreshToken, user: adminUser }) => {
      if (!accessToken) return null;
      await secure.setItemAsync(KEY_ACCESS, accessToken);
      if (refreshToken) await secure.setItemAsync(KEY_REFRESH, refreshToken);
      else await secure.deleteItemAsync(KEY_REFRESH).catch(() => {});
      apply({ accessToken, refreshToken: refreshToken || null });
      setAuthData('admin', accessToken, adminUser, refreshToken);
      setUnifiedAdminSession({ token: accessToken, user: adminUser, refreshToken });
      clearMeCache();
      clearApiCache();
      setUser(adminUser || null);
      events.emit('adminAuthChanged');
      return adminUser;
    },
    [apply],
  );

  /** AdminNavbar handleLogout: the logout call (best effort), then the local sign-out. */
  const logout = useCallback(async () => {
    try {
      await logoutApi(sessionRef.current?.refreshToken, localStore.getItem('fcm_web_registered_token_admin'));
    } catch {
      /* the local sign-out still happens */
    }
    clearUnifiedAdminSession();
    await clearLocal();
  }, [clearLocal]);

  /** Keeps the cached profile (`admin_user`, `adminInfo`) in step with a profile change. */
  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...(patch || {}) };
      localStore.setItem('admin_user', JSON.stringify(next));
      localStore.setItem('adminInfo', JSON.stringify(normalizeAdminProfile(next)));
      return next;
    });
  }, []);

  /** Re-read the profile from storage after ported code rewrote `admin_user` itself. */
  const reloadUser = useCallback(() => setUser(readUser()), []);

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
      reloadUser,
    }),
    [booting, session, user, loginWithAuthData, logout, clearLocal, updateUser, reloadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
