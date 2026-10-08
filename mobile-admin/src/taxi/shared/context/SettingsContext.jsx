/* Ported from Frontend/src/modules/Taxi/shared/context/SettingsContext.jsx (tools/port.js first pass). */
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../api/axiosInstance';
import usePlatformSettings from '../../../shared/hooks/usePlatformSettings';

/** Shortest gap between two resume-triggered settings refetches. */
const SETTINGS_REFRESH_MIN_MS = 5 * 60 * 1000;
import { BACKEND_ORIGIN } from '../api/runtimeConfig';

import { window } from '../../../lib/webShim';
const SETTINGS_CACHE_KEY = 'appSettingsCache:v1';
export const normalizeAssetUrl = (url = '') => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${BACKEND_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};
const DEFAULT_SETTINGS_CONTEXT = {
  settings: {
    general: {
      app_name: 'Dima Hasao Taxi',
      logo: '',
      favicon: '',
    },
    customization: {
      admin_theme_color: '',
      currency_symbol: '',
    },
    transportRide: {
      enable_bus_service: '0',
    },
    paymentGateway: null,
    userHomeSettings: {},
  },
  loading: true,
  hasBootstrapSettings: false,
  refreshSettings: () => {},
};
const SettingsContext = createContext(DEFAULT_SETTINGS_CONTEXT);
const normalizeBooleanSetting = (value, fallback = '0') => {
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (typeof value === 'number') {
    return value === 1 ? '1' : '0';
  }
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) {
    return '1';
  }
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) {
    return '0';
  }
  return fallback;
};
const normalizeTransportRideSettings = (settings = {}) => ({
  ...settings,
  enable_bus_service: normalizeBooleanSetting(settings?.enable_bus_service, '0'),
});
const buildSettingsState = (payload = {}) => ({
  general: {
    ...(payload?.general || {}),
    logo: normalizeAssetUrl(payload?.general?.logo),
    favicon: normalizeAssetUrl(payload?.general?.favicon),
  },
  customization: payload?.customization || {},
  transportRide: normalizeTransportRideSettings(payload?.transportRide || {}),
  bidRide: payload?.bidRide || DEFAULT_SETTINGS_CONTEXT.settings.bidRide,
  paymentGateway: payload?.paymentGateway || null,
  userHomeSettings: payload?.userHomeSettings || {},
});
const readCachedSettings = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return buildSettingsState(parsed);
  } catch {
    return null;
  }
};
const writeCachedSettings = (settings) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch {
    // Cache writes are best-effort only.
  }
};
export const SettingsProvider = ({ children }) => {
  // When the settings were last pulled, so a resume does not refetch them for
  // the sake of it. See the resume listener below.
  const platform = usePlatformSettings();
  const lastSettingsFetchRef = useRef(0);
  const cachedSettings = readCachedSettings();
  const [settings, setSettings] = useState(cachedSettings || DEFAULT_SETTINGS_CONTEXT.settings);
  const [loading, setLoading] = useState(true);
  const [hasBootstrapSettings, setHasBootstrapSettings] = useState(Boolean(cachedSettings));
  const [modules, setModules] = useState([]);
  const fetchSettings = async () => {
    lastSettingsFetchRef.current = Date.now();
    try {
      const response = await api.get('/users/bootstrap');
      const data = response?.data?.data || response?.data || {};
      const nextSettings = buildSettingsState({
        general: data.settings?.general || {},
        customization: data.settings?.customization || {},
        transportRide: data.settings?.transportRide || {},
        bidRide: data.settings?.bidRide || DEFAULT_SETTINGS_CONTEXT.settings.bidRide,
        paymentGateway: data.settings?.paymentGateway || null,
        userHomeSettings: data.settings?.userHomeSettings || {},
      });
      setSettings(nextSettings);
      setModules(data.modules || []);
      setHasBootstrapSettings(true);
      writeCachedSettings(nextSettings);
    } catch (err) {
      console.error('[SettingsContext] Failed to fetch bootstrap settings:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchSettings();
  }, []);

  /*
   * The district's name comes from Global Settings, not from this module.
   *
   * Taxi kept its own `app_name` in its CMS settings, so the rider app could
   * call the district one thing while the food and hotel apps called it
   * another, with nothing keeping them in step. Taxi's own value stays as the
   * fallback — it is still what the taxi admin edits, and a deployment that
   * has not set the central name keeps showing what it showed before.
   */
  useEffect(() => {
    if (!platform?.brandName) return;
    setSettings((current) => {
      if (current.general?.app_name === platform.brandName) return current;
      return {
        ...current,
        general: {
          ...current.general,
          app_name: platform.brandName,
        },
      };
    });
  }, [platform?.brandName]);
  useEffect(() => {
    /*
     * Re-read settings when the app comes back, but not every single time.
     *
     * `focus` fires whenever the page regains focus, which in a browser tab is
     * occasional and inside the Flutter wrapper is constant: tapping a field,
     * dismissing the keyboard, returning from the camera or a payment sheet all
     * count. Each one was a fresh /users/bootstrap, and branding settings do not
     * change minute to minute.
     *
     * `online` is left unthrottled on purpose — coming back from no connection
     * is exactly when a refetch is worth making.
     */
    const refreshOnResume = (event) => {
      const force = event?.type === 'online';
      if (!force && Date.now() - lastSettingsFetchRef.current < SETTINGS_REFRESH_MIN_MS) return;
      fetchSettings();
    };
    window.addEventListener('pageshow', refreshOnResume);
    window.addEventListener('online', refreshOnResume);
    window.addEventListener('focus', refreshOnResume);
    return () => {
      window.removeEventListener('pageshow', refreshOnResume);
      window.removeEventListener('online', refreshOnResume);
      window.removeEventListener('focus', refreshOnResume);
    };
  }, []);
  const refreshSettings = () => fetchSettings();
  return (
    <SettingsContext.Provider
      value={{
        settings,
        modules,
        loading,
        hasBootstrapSettings,
        refreshSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
export const useSettings = () => {
  return useContext(SettingsContext);
};
