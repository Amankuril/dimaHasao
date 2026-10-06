import { useEffect, useState } from 'react';
import api from '../api/client';
import { usePlatformSettings } from '../../lib/platformSettings';
import { localStore } from '../../lib/storage';

/*
 * Port of Taxi/shared/context/SettingsContext.jsx for the screens that read `useSettings().settings`
 * (app name, active payment gateway, transport flags). Same /users/bootstrap call, same cache key and
 * state shape; the favicon / document title / CSS-variable effects are web-only.
 */
const SETTINGS_CACHE_KEY = 'appSettingsCache:v1';

const DEFAULT_SETTINGS = {
  general: { app_name: 'Dima Hasao Taxi', logo: '', favicon: '' },
  customization: { admin_theme_color: '', currency_symbol: '' },
  transportRide: { enable_bus_service: '0' },
  paymentGateway: null,
  userHomeSettings: {},
};

const normalizeBooleanSetting = (value, fallback = '0') => {
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return value === 1 ? '1' : '0';
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return '1';
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return '0';
  return fallback;
};

const buildSettingsState = (payload = {}) => ({
  general: { ...(payload?.general || {}), logo: payload?.general?.logo || '', favicon: payload?.general?.favicon || '' },
  customization: payload?.customization || {},
  transportRide: { ...(payload?.transportRide || {}), enable_bus_service: normalizeBooleanSetting(payload?.transportRide?.enable_bus_service, '0') },
  bidRide: payload?.bidRide,
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

/** @returns {{ settings: typeof DEFAULT_SETTINGS, loading: boolean }} */
export function useDriverAppSettings() {
  const platform = usePlatformSettings();
  const [settings, setSettings] = useState(() => readCachedSettings() || DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await api.get('/users/bootstrap');
        const data = response?.data?.data || response?.data || {};
        const next = buildSettingsState({
          general: data.settings?.general || {},
          customization: data.settings?.customization || {},
          transportRide: data.settings?.transportRide || {},
          bidRide: data.settings?.bidRide,
          paymentGateway: data.settings?.paymentGateway || null,
          userHomeSettings: data.settings?.userHomeSettings || {},
        });
        if (!active) return;
        setSettings(next);
        try {
          localStore.setItem(SETTINGS_CACHE_KEY, JSON.stringify(next));
        } catch {
          /* best effort */
        }
      } catch {
        /* the cached / default settings stay */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // The district's name comes from Global Settings.
  const brandName = platform?.brandName;
  const merged = brandName && settings.general?.app_name !== brandName ? { ...settings, general: { ...settings.general, app_name: brandName } } : settings;

  return { settings: merged, loading };
}

export default useDriverAppSettings;
