import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { authAPI } from '../api/food';
import { localStore } from './storage';
import { navigateTo } from './webRouter';

/*
 * Push registration. The web app registers an FCM token after login and saves
 * it with POST /fcm-tokens/mobile/save (platform "mobile" is what the old
 * wrapper app sent); logout sends the same token back so the server drops it.
 * Here the token is the device's own FCM token, issued through
 * google-services.json.
 */

// AuthContext reads this key on logout and clears it with the session.
const TOKEN_KEY = 'fcm_registered_token_user';
// The backend addresses its Android notifications to this channel id.
const CHANNEL_ID = 'default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let inFlight = null;

async function saveToken(token) {
  const value = String(token || '').trim();
  if (value.length < 20 || localStore.getItem(TOKEN_KEY) === value) return;
  await authAPI.saveLoginFcmToken(value, 'mobile');
  localStore.setItem(TOKEN_KEY, value);
}

/** Asks for the notification permission (first signed-in launch) and saves the device token. Never throws. */
export function registerForPush() {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, { name: 'Notifications', importance: Notifications.AndroidImportance.HIGH });
      let perm = await Notifications.getPermissionsAsync();
      if (!perm.granted && perm.canAskAgain !== false) perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted) return;
      const device = await Notifications.getDevicePushTokenAsync();
      await saveToken(device?.data);
    } catch {
      // No Play services, no network, or the save failed: the next signed-in launch tries again.
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

const linkOf = (response) => {
  const data = response?.notification?.request?.content?.data || {};
  const link = String(data.link || data.url || '').trim();
  return link.startsWith('/') && link !== '/' ? link : '';
};

/** Mounted once in the root layout: registers while a user is signed in and opens a tapped notification's link. */
export function usePushNotifications(isSignedIn) {
  useEffect(() => {
    if (!isSignedIn || Platform.OS !== 'android') return undefined;
    registerForPush();
    const tokenSub = Notifications.addPushTokenListener((device) => {
      saveToken(device?.data).catch(() => {});
    });
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = linkOf(response);
      if (link) navigateTo(link);
    });
    return () => {
      tokenSub.remove();
      tapSub.remove();
    };
  }, [isSignedIn]);
}
