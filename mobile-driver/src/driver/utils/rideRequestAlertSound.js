import { AppState, Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

/*
 * Web: Taxi/modules/driver/utils/rideRequestAlertSound.js. The same behaviour with native pieces:
 *   new Audio(url) loop, volume 0.85      -> expo-audio player (loop, 0.85, plays with the phone on silent)
 *   navigator.vibrate([400,180,400]) /1.8s -> Vibration loop
 *   focus / visibilitychange resume       -> AppState 'active' resumes sound + vibration
 *   Web Audio oscillator beeps / autoplay-unlock tricks -> not needed (a native player is never autoplay-blocked)
 *   the wrapper's native alert bridge (window.flutter_inappwebview 'driverOrderAlert') -> a high-priority local
 *     notification when a request arrives while the app is not in the foreground
 */
const ALERT_SOUND = require('../../../assets/audio/ride-request-alert.mp3');

const REQUEST_CHANNEL_ID = 'ride_requests';
const VIBRATION_PATTERN = [0, 400, 180, 400];
const VIBRATION_INTERVAL_MS = 1800;
const RETRY_DELAY_MS = 900;

let alertPlayer = null;
let audioModeReady = false;
let shouldKeepPlaying = false;
let retryTimeoutId = null;
let vibrationIntervalId = null;
let lifecycleBound = false;
let channelReady = false;
let notificationId = null;

const ensureAudioMode = () => {
  if (audioModeReady) return;
  audioModeReady = true;
  setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
};

const getAlertPlayer = () => {
  if (!alertPlayer) {
    ensureAudioMode();
    alertPlayer = createAudioPlayer(ALERT_SOUND);
    alertPlayer.loop = true;
    alertPlayer.volume = 0.85;
  }
  return alertPlayer;
};

const clearRetryTimeout = () => {
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }
};

const startVibrationLoop = () => {
  Vibration.vibrate(VIBRATION_PATTERN);
  if (vibrationIntervalId) return;
  vibrationIntervalId = setInterval(() => {
    if (!shouldKeepPlaying) return;
    Vibration.vibrate(VIBRATION_PATTERN);
  }, VIBRATION_INTERVAL_MS);
};

const stopVibrationLoop = () => {
  if (vibrationIntervalId) {
    clearInterval(vibrationIntervalId);
    vibrationIntervalId = null;
  }
  Vibration.cancel();
};

const tryPlayAlertAudio = async () => {
  try {
    const player = getAlertPlayer();
    await player.seekTo(0).catch(() => {});
    player.play();
    clearRetryTimeout();
  } catch {
    if (!shouldKeepPlaying) return;
    clearRetryTimeout();
    retryTimeoutId = setTimeout(() => {
      retryTimeoutId = null;
      tryPlayAlertAudio();
    }, RETRY_DELAY_MS);
  }
};

const handleLifecycleResume = (state) => {
  if (state !== 'active' || !shouldKeepPlaying) return;
  const player = getAlertPlayer();
  if (!player.playing) tryPlayAlertAudio();
  startVibrationLoop();
};

const bindLifecycleListeners = () => {
  if (lifecycleBound) return;
  lifecycleBound = true;
  AppState.addEventListener('change', handleLifecycleResume);
};

const ensureNotificationChannel = async () => {
  if (channelReady || Platform.OS !== 'android') return;
  channelReady = true;
  await Notifications.setNotificationChannelAsync(REQUEST_CHANNEL_ID, {
    name: 'New ride requests',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 400, 180, 400],
    enableVibration: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  }).catch(() => {});
};

/** A heads-up notification for a request that arrives while the app is in the background (the in-app alert still rings). */
const presentBackgroundNotification = async ({ fare, pickup } = {}) => {
  if (AppState.currentState === 'active') return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    await ensureNotificationChannel();
    notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'New ride request',
        body: [fare, pickup].filter(Boolean).join(' - ') || 'Open the app to accept the ride.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { link: '/taxi/driver/home' },
      },
      trigger: Platform.OS === 'android' ? { channelId: REQUEST_CHANNEL_ID } : null,
    });
  } catch {
    // the in-app alert still rings
  }
};

const dismissBackgroundNotification = () => {
  if (!notificationId) return;
  const id = notificationId;
  notificationId = null;
  Notifications.dismissNotificationAsync(id).catch(() => {});
};

/** Nothing to unlock on a native player; kept so call sites match the web. */
export const unlockRideRequestAlertSound = () => Promise.resolve();

export const playRideRequestAlertSound = (requestInfo) => {
  bindLifecycleListeners();
  shouldKeepPlaying = true;
  startVibrationLoop();
  tryPlayAlertAudio();
  if (requestInfo) presentBackgroundNotification(requestInfo);
};

export const stopRideRequestAlertSound = () => {
  shouldKeepPlaying = false;
  clearRetryTimeout();
  stopVibrationLoop();
  dismissBackgroundNotification();
  if (!alertPlayer) return;
  try {
    alertPlayer.pause();
    alertPlayer.seekTo(0).catch(() => {});
  } catch {
    // the player was already released
  }
};
