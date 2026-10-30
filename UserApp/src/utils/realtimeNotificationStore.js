/**
 * Ported from Frontend/src/modules/Taxi/modules/user/utils/realtimeNotificationStore.js.
 * localStorage becomes AsyncStorage (async) and window.dispatchEvent becomes
 * DeviceEventEmitter.
 *
 * Nothing writes into this store yet: on the web the writers are TaxiApp.jsx's
 * root socket listener (support-chat messages, while the rider is anywhere in
 * the app, not just RideChatScreen) and upcomingRideReminderService.js's
 * client-side setTimeout scheduler for scheduled rides. Both are app-root-level
 * infra beyond this screen-porting task's scope (push notifications are
 * tracked separately) — NotificationsScreen still needs this store to exist
 * and merge from it so the screen itself is a 1:1 port, and it will start
 * surfacing entries once that root-level wiring lands.
 */
import {DeviceEventEmitter} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'taxi:user:realtime-notifications';
export const USER_NOTIFICATIONS_UPDATED_EVENT = 'taxi:user-notifications-updated';

const sanitizeNotification = (notification = {}) => {
  const id = String(notification.id || '').trim();
  if (!id) return null;

  return {
    id,
    title: String(notification.title || 'Notification').trim(),
    body: String(notification.body || '').trim(),
    sentAt: notification.sentAt || new Date().toISOString(),
    type: String(notification.type || 'support').trim(),
    source: String(notification.source || 'realtime').trim(),
    image: notification.image || '',
    serviceLocationName: String(notification.serviceLocationName || '').trim(),
  };
};

const readStoredNotifications = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeNotification).filter(Boolean);
  } catch {
    return [];
  }
};

const writeStoredNotifications = async notifications => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  DeviceEventEmitter.emit(USER_NOTIFICATIONS_UPDATED_EVENT);
};

export const getRealtimeNotifications = () => readStoredNotifications();

export const addRealtimeNotification = async notification => {
  const nextNotification = sanitizeNotification(notification);
  if (!nextNotification) return false;

  const existing = await readStoredNotifications();
  if (existing.some(item => item.id === nextNotification.id)) return false;

  await writeStoredNotifications([nextNotification, ...existing].slice(0, 50));
  return true;
};

export const removeRealtimeNotification = async id => {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) return;

  const existing = await readStoredNotifications();
  const nextList = existing.filter(item => item.id !== normalizedId);
  if (nextList.length !== existing.length) await writeStoredNotifications(nextList);
};

export const clearRealtimeNotifications = () => writeStoredNotifications([]);

export const isRealtimeNotification = async id => {
  const list = await readStoredNotifications();
  return list.some(item => item.id === String(id || '').trim());
};
