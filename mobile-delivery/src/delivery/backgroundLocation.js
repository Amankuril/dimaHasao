import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { deliveryApi } from '../api/delivery';
import { useDeliveryStore } from './store/useDeliveryStore';

/*
 * The wrapper's flutter_background_service: while the rider is online it kept
 * a foreground service ("Delivery Partner Service Active", "Waiting for new
 * orders...") and read the position every 15 s with the app in the
 * background. Here the same service is an expo-location foreground-service
 * task. It reports through the call the web already makes for a rider's
 * position (PATCH /food/delivery/availability); while the app is open the
 * screens do that themselves, so the task only reports in the background.
 */

const TASK = 'delivery-background-location';

TaskManager.defineTask(TASK, async ({ data, error }) => {
  if (error || AppState.currentState === 'active') return;
  const last = data?.locations?.[data.locations.length - 1];
  const lat = last?.coords?.latitude;
  const lng = last?.coords?.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  try {
    await deliveryApi.updateLocation(lat, lng, true, { heading: last.coords.heading || 0, speed: last.coords.speed || 0, accuracy: last.coords.accuracy ?? null });
  } catch {
    /* next fix retries */
  }
});

async function start() {
  const perm = await Location.getForegroundPermissionsAsync();
  if (!perm.granted) return;
  if (await Location.hasStartedLocationUpdatesAsync(TASK)) return;
  await Location.startLocationUpdatesAsync(TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 15000,
    distanceInterval: 0,
    foregroundService: {
      notificationTitle: 'Dima Hasao - Delivery Partner Service Active',
      notificationBody: 'Waiting for new orders...',
      notificationColor: '#0A4D2B',
    },
  });
}

async function stop() {
  if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
}

/** Mounted in the signed-in shell: the service runs exactly while the rider is online. */
export function useBackgroundLocation() {
  const isOnline = useDeliveryStore((s) => s.isOnline);
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    if (isOnline) start().catch(() => {});
    else stop().catch(() => {});
    return () => {
      stop().catch(() => {});
    };
  }, [isOnline]);
}
