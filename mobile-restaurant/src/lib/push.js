import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { FCM_TOKEN_KEY, restaurantAPI } from '../api/restaurant';
import { localStore } from './storage';
import { navigateTo } from './webRouter';

/*
 * Push for the restaurant app, standing in for the slice of
 * Food/utils/firebaseMessaging.js the restaurant pages call. The token is the
 * device's own FCM token (google-services.json), saved with platform
 * "mobile" exactly as the old wrapper did, and sent back with logout.
 */

// The backend addresses its Android notifications to this channel id.
const CHANNEL_ID = 'default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const withTimeout = (promise, ms, fallback) => Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);

/** The device token if notifications are allowed (asks once, at sign-in), else ''. Never throws. */
async function getDeviceToken() {
  if (Platform.OS !== 'android') return '';
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, { name: 'Orders and updates', importance: Notifications.AndroidImportance.MAX, sound: 'default' });
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

/** Web: collectFcmTokenFast(module). Resolves quickly so sign-in is never held up by push. */
export async function collectFcmTokenFast() {
  const fcmToken = await withTimeout(getDeviceToken(), 6000, '');
  return { fcmToken, platform: 'mobile' };
}

export const collectFcmTokenForSignup = collectFcmTokenFast;

/** Web: persistModuleFcmToken(module, { fcmToken }). Saves the token for the signed-in restaurant. */
export async function persistModuleFcmToken(_module, { fcmToken } = {}) {
  const token = String(fcmToken || (await getDeviceToken()) || '').trim();
  if (!token) return false;
  if (localStore.getItem(FCM_TOKEN_KEY) === token) return true;
  await restaurantAPI.saveFcmToken(token, 'mobile');
  localStore.setItem(FCM_TOKEN_KEY, token);
  return true;
}

/** Web: syncPendingPartnerFcmQuick(). Best effort. */
export const syncPendingPartnerFcmQuick = () => persistModuleFcmToken('restaurant').catch(() => false);

/** The web cleared a signup-only token cache; the device token needs no such step. */
export const clearOnboardingFcmLocalState = () => {};

const linkOf = (response) => {
  const data = response?.notification?.request?.content?.data || {};
  const link = String(data.link || data.url || '').trim();
  return link.startsWith('/') && link !== '/' ? link : '';
};

/** Mounted once in the root layout: keeps the token saved while signed in and opens a tapped notification's link. */
export function usePushNotifications(isSignedIn) {
  useEffect(() => {
    if (!isSignedIn || Platform.OS !== 'android') return undefined;
    persistModuleFcmToken('restaurant').catch(() => {});
    const tokenSub = Notifications.addPushTokenListener((device) => {
      persistModuleFcmToken('restaurant', { fcmToken: device?.data }).catch(() => {});
    });
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = linkOf(response);
      // Restaurant links only; anything else just opens the app.
      if (link.includes('/restaurant')) navigateTo(link);
    });
    return () => {
      tokenSub.remove();
      tapSub.remove();
    };
  }, [isSignedIn]);
}

/** Web: true inside the old wrapper, where the native side raised the OS notification itself. */
export const isNativeAppWebView = () => false;

/** Web: de-duplicates a notification the service worker already showed. Nothing else shows one here. */
export const shouldSkipDuplicateOsNotification = () => false;
