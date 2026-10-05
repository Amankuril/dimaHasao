/**
 * Business Settings Utility
 * Handles loading and updating business settings (favicon, title, logo)
 */

import apiClient from '../../api/client';
import { API_ENDPOINTS } from '../../api/config';
import { publicGetOnce } from '../../api/food';
import { localStore } from '../../lib/storage';

const SETTINGS_KEY = 'helloparth_business_settings';

// Initialize from localStore immediately so it's available for components on mount
let cachedSettings = (() => {
  try {
    const saved = localStore.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
})();

// Apply cached settings immediately on module load if they exist
if (cachedSettings) {
  setTimeout(() => {
    updateFavicon(cachedSettings.favicon?.url);
    updateTitle(cachedSettings.companyName);
  }, 0);
}

let inFlightSettingsPromise = null;

/**
 * Load business settings from backend (public endpoint - no auth required)
 */
export const loadBusinessSettings = async () => {
  try {
    // If we have no cached settings, we MUST fetch
    // If we have cached settings, we still try to fetch in background to ensure they are fresh
    const endpoint = API_ENDPOINTS.ADMIN.BUSINESS_SETTINGS_PUBLIC;
    if (!endpoint || (typeof endpoint === "string" && !endpoint.trim())) {
      return cachedSettings;
    }

    if (inFlightSettingsPromise) {
      return await inFlightSettingsPromise;
    }

    inFlightSettingsPromise = (async () => {
      /*
       * Public endpoint, no auth needed — and deliberately NOT { noCache: true }.
       *
       * The in-flight guard above only covers *concurrent* callers: it is
       * cleared in the `finally` below the moment the first call settles. App
       * boot loads these settings at ~360ms and the navbar mounts and asks
       * again at ~1740ms, by which point the guard is gone — so the same
       * response was fetched twice on every page load. `noCache: true` was
       * explicitly opting out of the 3-second dedup that would have collapsed
       * them. Three seconds is still "fresh data from the server"; the second
       * request was not buying anything.
       */
      const response = await publicGetOnce(endpoint);
      const settings = response?.data?.data || response?.data;

      if (settings) {
        cachedSettings = settings;
        try {
          localStore.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {}
        
        updateFavicon(settings.favicon?.url);
        updateTitle(settings.companyName);
        return settings;
      }
      return cachedSettings;
    })();

    return await inFlightSettingsPromise;
  } catch (error) {
    // Return cached if failed
    return cachedSettings;
  } finally {
    inFlightSettingsPromise = null;
  }
};

/** The web sets the tab's favicon and title from these; an app has neither. */
export const updateFavicon = () => {};
export const updateTitle = () => {};

/**
 * Set cached settings manually (useful after update)
 */
export const setCachedSettings = (settings) => {
  if (settings) {
    cachedSettings = settings;
    try {
      localStore.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
    
    updateFavicon(settings.favicon?.url);
    updateTitle(settings.companyName);
  }
};

/**
 * Clear cached settings (call after updating settings)
 */
export const clearCache = () => {
  cachedSettings = null;
  try {
    localStore.removeItem(SETTINGS_KEY);
  } catch (e) {}
};

/**
 * Get cached settings
 */
export const getCachedSettings = () => {
  return cachedSettings;
};

/**
 * Get company name from business settings with fallback
 * @returns {string} Company name or default "Dima Hasao Food"
 */
export const getCompanyName = () => {
  const settings = getCachedSettings();
  const name = settings?.companyName || "Dima Hasao Food";
  return name === "Foodelo" ? "Dima Hasao Food" : name;
};

/**
 * Get company name asynchronously (loads if not cached)
 * @returns {Promise<string>} Company name or default "Dima Hasao Food"
 */
export const getCompanyNameAsync = async () => {
  try {
    const settings = await loadBusinessSettings();
    return settings?.companyName || "Dima Hasao Food";
  } catch (error) {
    return "Dima Hasao Food";
  }
};
