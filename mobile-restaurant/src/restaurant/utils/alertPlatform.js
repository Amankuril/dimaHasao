import { AppState, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

/*
 * The browser pieces hooks/useRestaurantNotifications.js leans on, as native
 * equivalents, so the hook's own logic (dedupe, mute, the 2-minute alert loop)
 * is the web's:
 *
 *   new Audio()            -> an expo-audio player on the bundled alert sound
 *   navigator.vibrate()    -> Vibration
 *   document.visibilityState / "visibilitychange" -> AppState
 *   window.location        -> the current route (set by RestaurantShell)
 *   Notification / service worker -> a local notification (presentOrderNotification)
 *
 * The old wrapper rang through a native bridge (window.flutter_inappwebview);
 * that bridge does not exist here, so those calls fall through.
 */

const ALERT_SOUND = require('../../../assets/audio/restaurant_alert.mp3');

let audioModeReady = false;
const ensureAudioMode = () => {
  if (audioModeReady) return;
  audioModeReady = true;
  // A new order must be heard with the phone on silent, like the wrapper's ringtone.
  setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
};

/** `new Audio(src)`: whatever the source, it plays the restaurant alert. */
export class Audio {
  constructor() {
    this.player = null;
    this.preload = 'auto';
    this.src = '';
    this._volume = 1;
    this._muted = false;
  }

  ensure() {
    if (!this.player) {
      ensureAudioMode();
      this.player = createAudioPlayer(ALERT_SOUND);
      this.player.volume = this._volume;
      this.player.muted = this._muted;
    }
    return this.player;
  }

  get volume() {
    return this._volume;
  }

  set volume(value) {
    this._volume = value;
    if (this.player) this.player.volume = value;
  }

  get muted() {
    return this._muted;
  }

  set muted(value) {
    this._muted = Boolean(value);
    if (this.player) this.player.muted = this._muted;
  }

  get currentTime() {
    return this.player?.currentTime || 0;
  }

  set currentTime(seconds) {
    this.player?.seekTo(seconds).catch(() => {});
  }

  async play() {
    const player = this.ensure();
    await player.seekTo(0).catch(() => {});
    player.play();
  }

  pause() {
    try {
      this.player?.pause();
    } catch {
      // the player was already released
    }
  }
}

export const navigator = {
  vibrate: (pattern) => {
    // Web patterns start with a vibration; Android's start with a wait.
    Vibration.vibrate(Array.isArray(pattern) ? [0, ...pattern] : pattern);
    return true;
  },
};

let currentPath = '/food/restaurant';
/** RestaurantShell reports the route so `window.location.pathname` checks keep working. */
export const setCurrentPath = (path) => {
  currentPath = String(path || '/food/restaurant');
};

export const window = {
  location: {
    hostname: 'app',
    protocol: 'https:',
    get pathname() {
      return currentPath;
    },
  },
};

const visibilityListeners = new Set();
AppState.addEventListener('change', () => {
  visibilityListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // one listener must not stop the others
    }
  });
});

export const document = {
  get visibilityState() {
    return AppState.currentState === 'active' ? 'visible' : 'hidden';
  },
  addEventListener: (type, fn) => {
    if (type === 'visibilitychange') visibilityListeners.add(fn);
  },
  removeEventListener: (type, fn) => {
    if (type === 'visibilitychange') visibilityListeners.delete(fn);
  },
};

/** The browser Notification API is not used; `presentOrderNotification` shows the alert instead. */
export const Notification = {
  permission: 'denied',
  requestPermission: async () => 'denied',
};

/** A local notification for an order that arrived while the app is in the background. */
export async function presentOrderNotification({ title, body, data } = {}) {
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { ...(data || {}), link: data?.targetUrl || '' }, sound: 'default' },
      trigger: null,
    });
  } catch {
    // the in-app alert still rings
  }
}
