import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { api, getAuthToken } from '../api/client';
import { deliveryApi } from '../api/delivery';
import { localStore, sessionStore } from '../lib/storage';

/*
 * The delivery slice of Frontend/src/modules/Food/utils/firebaseMessaging.js.
 *
 * The web gets its FCM token from Firebase web messaging, or from the
 * Flutter shell when it runs inside the old native wrapper (platform
 * "mobile"). This app is that native client, so it reports platform
 * "mobile" and reads the device token from expo-notifications. On Android
 * that is the FCM registration token. On iOS it is an APNs token, which the
 * backend's FCM sender cannot use: iOS push is an open gap (CONVERSION.md).
 * Without a google-services.json the call fails and every helper returns
 * null, exactly as the web does when messaging is unavailable.
 */

const TOKEN_KEY = (m) => `fcm_registered_token_${m}`;
const COLLECT_TIMEOUT_MS = 2000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PLATFORM = 'mobile';

const getSavedToken = (m) => localStore.getItem(TOKEN_KEY(m)) || '';
const setSavedToken = (m, t) => t && localStore.setItem(TOKEN_KEY(m), t);

async function readDeviceToken({ requestPermission = true } = {}) {
  if (Platform.OS !== 'android') return null;
  try {
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && requestPermission && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return null;
    const res = await Notifications.getDevicePushTokenAsync();
    return typeof res?.data === 'string' && res.data.length >= 20 ? res.data : null;
  } catch {
    return null;
  }
}

export async function collectFcmTokenFast(moduleName, options = {}) {
  if (options.skipCache !== true) {
    const cached = getSavedToken(moduleName);
    if (cached.length >= 20) return { fcmToken: cached, platform: PLATFORM };
  }
  const result = await Promise.race([
    readDeviceToken(options).then((fcmToken) => ({ fcmToken, platform: PLATFORM })),
    sleep(options.collectTimeoutMs ?? COLLECT_TIMEOUT_MS).then(() => ({ fcmToken: getSavedToken(moduleName) || null, platform: PLATFORM })),
  ]);
  if (result.fcmToken) setSavedToken(moduleName, result.fcmToken);
  return result;
}

export async function collectFcmTokenForSignup(moduleName) {
  const first = await collectFcmTokenFast(moduleName).catch(() => ({ fcmToken: null }));
  if (first.fcmToken) return { fcmToken: first.fcmToken, platform: PLATFORM };
  const retry = await collectFcmTokenFast(moduleName, { skipCache: true }).catch(() => ({ fcmToken: null }));
  return { fcmToken: retry.fcmToken || null, platform: PLATFORM };
}

export function prefetchModuleFcmToken(moduleName) {
  void collectFcmTokenFast(moduleName, { requestPermission: false }).catch(() => {});
}

export function clearOnboardingFcmLocal(moduleName) {
  localStore.removeItem(TOKEN_KEY(moduleName));
}

/** Save the token against the signed-in session (web: saveTokenByModule). */
export async function persistModuleFcmToken(moduleName, options = {}) {
  let fcmToken = options.fcmToken || null;
  let platform = options.platform || PLATFORM;
  if (!fcmToken) {
    const collected = await collectFcmTokenFast(moduleName, options);
    fcmToken = collected.fcmToken;
    platform = collected.platform;
  }
  if (!fcmToken) return false;
  setSavedToken(moduleName, fcmToken);
  if (!getAuthToken()) return false;
  try {
    await deliveryApi.saveFcmToken(fcmToken, platform);
    return true;
  } catch {
    return false;
  }
}

/** POST /fcm-tokens/pending-save by phone, for riders still awaiting approval. */
export async function persistPendingModuleFcmToken(moduleName, phone, options = {}) {
  const maxAttempts = options.maxAttempts ?? (options.fcmToken ? 1 : 2);
  const retryDelayMs = options.retryDelayMs ?? 400;
  let known = options.fcmToken || null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let fcmToken = known;
    let platform = options.platform || PLATFORM;
    if (!fcmToken) {
      const collected = await collectFcmTokenFast(moduleName, { skipCache: true, requestPermission: false });
      fcmToken = collected.fcmToken;
      platform = collected.platform;
    }
    if (!fcmToken || !phone) {
      if (attempt < maxAttempts - 1) {
        await sleep(retryDelayMs);
        continue;
      }
      return false;
    }
    setSavedToken(moduleName, fcmToken);
    const normalizedPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!normalizedPhone) return false;
    try {
      await api.post('/fcm-tokens/pending-save', { phone: normalizedPhone, token: fcmToken, platform, role: moduleName });
      return true;
    } catch {
      if (attempt < maxAttempts - 1) {
        known = null;
        await sleep(retryDelayMs);
      }
    }
  }
  return false;
}

export function syncPendingPartnerFcmQuick(moduleName, phone, options = {}) {
  if (!phone) return;
  const runSync = () => void persistPendingModuleFcmToken(moduleName, phone, { ...options, maxAttempts: 3, retryDelayMs: 500 });
  runSync();
  [1500, 3500, 7000].forEach((ms) => setTimeout(runSync, ms));
}

/**
 * Store the pending state and go to the verification-pending screen
 * (web: finalizeDeliveryPendingSubmission). location.state becomes params.
 */
export function finalizeDeliveryPendingSubmission(phone, { fcmToken, platform, status = 'pending', message, rejectionReason } = {}, navigateState = {}) {
  const normalizedPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (normalizedPhone) sessionStore.setItem('delivery_pendingPhone', normalizedPhone);
  sessionStore.setItem('delivery_pendingStatus', status);
  if (message) sessionStore.setItem('delivery_pendingMessage', message);
  else sessionStore.removeItem('delivery_pendingMessage');
  if (rejectionReason) sessionStore.setItem('delivery_pendingRejectionReason', rejectionReason);
  else sessionStore.removeItem('delivery_pendingRejectionReason');

  try {
    syncPendingPartnerFcmQuick('delivery', normalizedPhone, { fcmToken, platform });
  } catch {
    /* background */
  }
  if (getAuthToken()) void persistModuleFcmToken('delivery', { fcmToken, platform }).catch(() => {});

  const params = {
    phone: normalizedPhone,
    isRejected: status === 'rejected' ? '1' : '',
    ...(message ? { message } : {}),
    ...(rejectionReason ? { rejectionReason } : {}),
    ...navigateState,
  };
  router.replace({ pathname: '/food/delivery/pending-verification', params });
}
