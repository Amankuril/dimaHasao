import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import api from '../api/client';
import usePlatformSettings from '../../shared/hooks/usePlatformSettings';
import { localStore } from '../../lib/storage';
import { BACKEND_ORIGIN } from '../api/runtimeConfig';

/* Port of Taxi/shared/context/SettingsContext.jsx (the favicon / document title / CSS-variable effects are web-only). */
const SETTINGS_REFRESH_MIN_MS = 5 * 60 * 1000;
const SETTINGS_CACHE_KEY = 'appSettingsCache:v1';

export const normalizeAssetUrl = (url = '') => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return `${BACKEND_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

const DEFAULT_SETTINGS_CONTEXT = {
  settings: {
    general: { app_name: 'Dima Hasao Taxi', logo: '', favicon: '' },
    customization: { admin_theme_color: '', currency_symbol: '' },
    transportRide: { enable_bus_service: '0' },
    paymentGateway: null,
    userHomeSettings: {},
  },
  modules: [],
  loading: true,
  hasBootstrapSettings: false,
  refreshSettings: () => {},
};
const SettingsContext = createContext(DEFAULT_SETTINGS_CONTEXT);

const normalizeBooleanSetting = (value, fallback = '0') => {
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return value === 1 ? '1' : '0';
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return '1';
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return '0';
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
  try {
    const raw = localStore.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? buildSettingsState(parsed) : null;
  } catch {
    return null;
  }
};

export const SettingsProvider = ({ children }) => {
  const platform = usePlatformSettings();
  const lastFetchRef = useRef(0);
  const [cached] = useState(readCachedSettings);
  const [settings, setSettings] = useState(cached || DEFAULT_SETTINGS_CONTEXT.settings);
  const [loading, setLoading] = useState(true);
  const [hasBootstrapSettings, setHasBootstrapSettings] = useState(Boolean(cached));
  const [modules, setModules] = useState([]);

  const fetchSettings = useCallback(async () => {
    lastFetchRef.current = Date.now();
    try {
      const response = await api.get('/users/bootstrap');
      const data = response?.data?.data || response?.data || {};
      const next = buildSettingsState({
        general: data.settings?.general || {},
        customization: data.settings?.customization || {},
        transportRide: data.settings?.transportRide || {},
        bidRide: data.settings?.bidRide || DEFAULT_SETTINGS_CONTEXT.settings.bidRide,
        paymentGateway: data.settings?.paymentGateway || null,
        userHomeSettings: data.settings?.userHomeSettings || {},
      });
      setSettings(next);
      setModules(data.modules || []);
      setHasBootstrapSettings(true);
      try {
        localStore.setItem(SETTINGS_CACHE_KEY, JSON.stringify(next));
      } catch {
        /* best effort */
      }
    } catch {
      /* the cached / default settings stay */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // The district's name comes from Global Settings.
  useEffect(() => {
    if (!platform?.brandName) return;
    setSettings((current) =>
      current.general?.app_name === platform.brandName ? current : { ...current, general: { ...current.general, app_name: platform.brandName } },
    );
  }, [platform?.brandName]);

  // Resume: re-read settings, but not more often than every 5 minutes.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastFetchRef.current >= SETTINGS_REFRESH_MIN_MS) fetchSettings();
    });
    return () => sub.remove();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ settings, modules, loading, hasBootstrapSettings, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
