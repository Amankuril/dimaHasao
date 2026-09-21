import { useState, useEffect } from 'react';
import { loadBusinessSettings, getCachedSettings } from '@food/utils/businessSettings';
import usePlatformSettings from '@/shared/hooks/usePlatformSettings';

/**
 * The district's name, for the twenty-odd screens that print it.
 *
 * This used to read food's own business settings, so the food app could call
 * the district one thing while taxi and hotel called it another — each had its
 * own settings screen and nothing kept them in step.
 *
 * Global Settings → Brand & Contact is the answer now. Food's own business
 * settings stay as the fallback: they are still what the food admin panel
 * edits, and a deployment that has not set the central brand name yet keeps
 * showing whatever it showed before rather than a placeholder.
 *
 * @returns {string} the brand name
 */
export const useCompanyName = () => {
  const platform = usePlatformSettings();

  const [moduleName, setModuleName] = useState(() => getCachedSettings()?.companyName || '');

  useEffect(() => {
    let cancelled = false;

    const readCached = () => {
      const cached = getCachedSettings();
      if (cached?.companyName && !cancelled) setModuleName(cached.companyName);
    };

    if (getCachedSettings()?.companyName) {
      readCached();
    } else {
      loadBusinessSettings()
        .then((settings) => {
          if (settings?.companyName && !cancelled) setModuleName(settings.companyName);
        })
        .catch(() => {
          // The central name below is the one that matters; this is a fallback.
        });
    }

    window.addEventListener('businessSettingsUpdated', readCached);
    return () => {
      cancelled = true;
      window.removeEventListener('businessSettingsUpdated', readCached);
    };
  }, []);

  return platform?.brandName || moduleName || 'Dima Hasao';
};
