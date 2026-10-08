/*
 * The web OrdersPage's new-order alert: an <audio> ring (alert.mp3 / original.mp3,
 * picked by localStorage 'delivery_alert_sound'), navigator.vibrate and a browser
 * Notification while the tab is hidden. Here: expo-audio, Vibration and a local
 * expo-notifications notification while the app is in the background.
 */
import { Vibration } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import * as Notifications from 'expo-notifications';

const SOURCES = {
  alert: require('../../../assets/media/alert.mp3'),
  original: require('../../../assets/media/original.mp3'),
};

const players = {};

export async function playOrderAlertSound(selectedSound) {
  const key = selectedSound === 'original' ? 'original' : 'alert';
  try {
    Vibration.vibrate([0, 200, 100, 200, 100, 300]);
  } catch {
    // vibration is best effort
  }
  try {
    if (!players[key]) {
      players[key] = createAudioPlayer(SOURCES[key]);
      players[key].volume = 1;
    }
    const player = players[key];
    await player.seekTo(0);
    player.play();
    return true;
  } catch {
    return false;
  }
}

export function releaseOrderAlertSounds() {
  Object.keys(players).forEach((key) => {
    try {
      players[key].pause();
      players[key].remove();
    } catch {
      // already released
    }
    delete players[key];
  });
}

/** `Notification.requestPermission()` when permission is still 'default'. */
export async function requestOrderNotificationPermission() {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'undetermined') await Notifications.requestPermissionsAsync();
  } catch {
    // ignore, as the web does
  }
}

/** `new Notification(title, { body, tag })` when permission is granted. */
export async function showOrderNotification(title, body, tag) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      identifier: tag || undefined,
      content: { title, body, data: { targetUrl: '/admin/food/orders/all' }, sound: true },
      trigger: null,
    });
  } catch {
    // ignore, as the web does
  }
}
