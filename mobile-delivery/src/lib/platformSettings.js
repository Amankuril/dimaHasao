import { useEffect, useState } from 'react';
import { businessSettingsApi, platformApi } from '../api/delivery';
import { localStore } from './storage';

/*
 * Ports of shared/hooks/usePlatformSettings, Food/hooks/useCompanyName and
 * Food/utils/businessSettings (the parts the delivery app reads).
 */

const TTL_MS = 10 * 60 * 1000;
let platformCache = null;
let platformAt = 0;
let platformInFlight = null;

function loadPlatform() {
  if (platformCache && Date.now() - platformAt < TTL_MS) return Promise.resolve(platformCache);
  if (platformInFlight) return platformInFlight;
  platformInFlight = platformApi
    .settings()
    .then((res) => {
      const body = res?.data;
      if (body?.success && body.settings) {
        platformCache = body.settings;
        platformAt = Date.now();
      }
      return platformCache;
    })
    .catch(() => platformCache)
    .finally(() => {
      platformInFlight = null;
    });
  return platformInFlight;
}

export function usePlatformSettings(fallback = {}) {
  const [settings, setSettings] = useState(platformCache || fallback);
  useEffect(() => {
    let cancelled = false;
    loadPlatform().then((v) => {
      if (!cancelled && v) setSettings(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return settings || fallback;
}

const SETTINGS_KEY = 'helloparth_business_settings';
let businessCache = null;
let businessInFlight = null;

export function getCachedSettings() {
  if (businessCache) return businessCache;
  try {
    const raw = localStore.getItem(SETTINGS_KEY);
    businessCache = raw ? JSON.parse(raw) : null;
  } catch {
    businessCache = null;
  }
  return businessCache;
}

export async function loadBusinessSettings() {
  if (businessInFlight) return businessInFlight;
  businessInFlight = (async () => {
    try {
      const res = await businessSettingsApi.getPublic();
      const settings = res?.data?.data || res?.data;
      if (settings) {
        businessCache = settings;
        localStore.setItem(SETTINGS_KEY, JSON.stringify(settings));
        return settings;
      }
      return getCachedSettings();
    } catch {
      return getCachedSettings();
    } finally {
      businessInFlight = null;
    }
  })();
  return businessInFlight;
}

export async function getCompanyNameAsync() {
  try {
    const settings = await loadBusinessSettings();
    return settings?.companyName || 'Dima Hasao Food';
  } catch {
    return 'Dima Hasao Food';
  }
}

/** The district's brand name (Global Settings first, food settings second). */
export function useCompanyName() {
  const platform = usePlatformSettings();
  const [moduleName, setModuleName] = useState(() => getCachedSettings()?.companyName || '');
  useEffect(() => {
    let cancelled = false;
    if (!getCachedSettings()?.companyName) {
      loadBusinessSettings().then((s) => {
        if (s?.companyName && !cancelled) setModuleName(s.companyName);
      });
    }
    return () => {
      cancelled = true;
    };
  }, []);
  return platform?.brandName || moduleName || 'Dima Hasao';
}

export { loadPlatform };
