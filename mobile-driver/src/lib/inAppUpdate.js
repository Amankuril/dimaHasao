import { useEffect } from 'react';
import { Platform } from 'react-native';

/* One check per app process, i.e. per cold start. */
let checked = false;

/**
 * Google Play in-app update, checked once when the app has finished booting.
 *
 * It starts an IMMEDIATE update (Play's full-screen flow) and never a flexible
 * one: expo-in-app-updates restarts the app the moment a flexible download
 * finishes, which could land in the middle of an order or a trip.
 *
 * A no-op on web, in dev builds, and for builds that were not installed from
 * Google Play (the Play API then reports no update, or an error we ignore).
 * Pass `ready` as false while the app is still on its splash.
 */
export function useInAppUpdate(ready = true) {
  useEffect(() => {
    if (!ready || checked || __DEV__ || Platform.OS !== 'android') return;
    checked = true;
    (async () => {
      try {
        const InAppUpdates = require('expo-in-app-updates');
        const { updateAvailable, immediateAllowed } = await InAppUpdates.checkForUpdate();
        if (updateAvailable && immediateAllowed) await InAppUpdates.startUpdate(true);
      } catch (e) {
        console.warn('[in-app-update]', e?.message || e);
      }
    })();
  }, [ready]);
}
