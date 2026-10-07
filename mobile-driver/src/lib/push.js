import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import taxiApi from '../driver/api/client';
import { localStore } from './storage';
import { navigateTo } from './webRouter';
import { ensureNotificationChannel } from '../driver/utils/rideRequestAlertSound';

/*
 * Push for the driver app, standing in for Taxi/shared/push/nativeFcmBridge.js. The token is the device's
 * own FCM token (google-services.json), saved with POST /taxi/drivers/fcm-token { token, platform }, the
 * call the old wrapper's bridge made with platform "android".
 */

const FCM_TOKEN_KEY = 'fcm_registered_token_driver';
// The backend addresses its Android notifications to this channel id.
const CHANNEL_ID = 'default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const withTimeout = (promise, ms, fallback) => Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);

/** The device token if notifications are allowed (asks once, after sign-in), else ''. Never throws. */
async function getDeviceToken() {
  if (Platform.OS !== 'android') return '';
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, { name: 'Ride requests and updates', importance: Notifications.AndroidImportance.MAX, sound: 'default' });
    await ensureNotificationChannel();
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain !== false) perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return '';
    const device = await Notifications.getDevicePushTokenAsync();
    const token = String(device?.data || '').trim();
    return token.length >= 20 ? token : '';
  } catch {
    return '';
  }
}

export async function collectFcmTokenFast() {
  const fcmToken = await withTimeout(getDeviceToken(), 6000, '');
  return { fcmToken, platform: 'android' };
}

/** Saves the device token for the signed-in driver (once per token). */
export async function persistDriverFcmToken(fcmToken) {
  const token = String(fcmToken || (await getDeviceToken()) || '').trim();
  if (!token) return false;
  if (localStore.getItem(FCM_TOKEN_KEY) === token) return true;
  await taxiApi.post('/drivers/fcm-token', { token, platform: 'android' });
  localStore.setItem(FCM_TOKEN_KEY, token);
  return true;
}

export const clearSavedFcmToken = () => localStore.removeItem(FCM_TOKEN_KEY);

const linkOf = (response) => {
  const data = response?.notification?.request?.content?.data || {};
  const link = String(data.link || data.url || data.route || '').trim();
  return link.startsWith('/') && link !== '/' ? link : '';
};

/** Mounted once in the driver shell: keeps the token saved while signed in and opens a tapped notification's link. */
export function usePushNotifications(isSignedIn) {
  useEffect(() => {
    if (!isSignedIn || Platform.OS !== 'android') return undefined;
    persistDriverFcmToken().catch(() => {});
    const tokenSub = Notifications.addPushTokenListener((device) => {
      persistDriverFcmToken(device?.data).catch(() => {});
    });
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = linkOf(response);
      if (link.startsWith('/taxi/driver')) navigateTo(link);
    });
    // App opened from a killed state by tapping a notification.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const link = response ? linkOf(response) : '';
        if (link.startsWith('/taxi/driver')) navigateTo(link);
      })
      .catch(() => {});
    return () => {
      tokenSub.remove();
      tapSub.remove();
    };
  }, [isSignedIn]);
}
