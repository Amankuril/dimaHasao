/**
 * Ported from Frontend/src/modules/Taxi/shared/context/SettingsContext.jsx.
 * Drops everything DOM-only (document.title, favicon <link> tags, CSS custom
 * properties for admin theming — none of that applies to a rider's app).
 * `pageshow`/`online`/`focus` listeners become an AppState 'active' listener,
 * RN's equivalent of "the app came back to the foreground".
 */
import React, {createContext, useContext, useEffect, useRef, useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/taxi/axiosInstance';
import usePlatformSettings from '../hooks/usePlatformSettings';

const SETTINGS_REFRESH_MIN_MS = 5 * 60 * 1000;
const SETTINGS_CACHE_KEY = 'appSettingsCache:v1';

const DEFAULT_SETTINGS_CONTEXT = {
  settings: {
    general: {app_name: 'Dima Hasao Taxi', logo: '', favicon: ''},
    customization: {admin_theme_color: '', currency_symbol: ''},
    transportRide: {enable_bus_service: '0'},
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
  general: {...(payload?.general || {})},
  customization: payload?.customization || {},
  transportRide: normalizeTransportRideSettings(payload?.transportRide || {}),
  bidRide: payload?.bidRide || DEFAULT_SETTINGS_CONTEXT.settings.bidRide,
  paymentGateway: payload?.paymentGateway || null,
  userHomeSettings: payload?.userHomeSettings || {},
});

const readCachedSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? buildSettingsState(parsed) : null;
  } catch {
    return null;
  }
};

const writeCachedSettings = async settings => {
  try {
    await AsyncStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch {
    // Cache writes are best-effort only.
  }
};

export const SettingsProvider = ({children}) => {
  const platform = usePlatformSettings();
  const lastSettingsFetchRef = useRef(0);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS_CONTEXT.settings);
  const [loading, setLoading] = useState(true);
  const [hasBootstrapSettings, setHasBootstrapSettings] = useState(false);
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
      await writeCachedSettings(nextSettings);
    } catch (err) {
      console.error('[SettingsContext] Failed to fetch bootstrap settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const cached = await readCachedSettings();
      if (cached) {
        setSettings(cached);
        setHasBootstrapSettings(true);
      }
      fetchSettings();
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Taxi kept its own app_name in its CMS settings; Global Settings' brand
  // name wins when set, same precedence as the web version.
  useEffect(() => {
    if (!platform?.brandName) return;
    setSettings(current => {
      if (current.general?.app_name === platform.brandName) return current;
      return {...current, general: {...current.general, app_name: platform.brandName}};
    });
  }, [platform?.brandName]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') return;
      if (Date.now() - lastSettingsFetchRef.current < SETTINGS_REFRESH_MIN_MS) return;
      fetchSettings();
    });
    return () => subscription.remove();
  }, []);

  const refreshSettings = () => fetchSettings();

  return (
    <SettingsContext.Provider value={{settings, modules, loading, hasBootstrapSettings, refreshSettings}}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
