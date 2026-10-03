/**
 * Ported from Frontend/src/modules/Taxi/modules/user/services/currentRideService.js.
 * AsyncStorage is async where localStorage was sync, and `window.dispatchEvent`
 * becomes RN's DeviceEventEmitter — both callers below already adapt to that.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DeviceEventEmitter} from 'react-native';

const CURRENT_RIDE_STORAGE_KEY = 'dimahasao_current_ride';
export const CURRENT_RIDE_UPDATED_EVENT = 'dimahasao:current-ride-updated';

const ACTIVE_RIDE_STATUSES = new Set([
  'accepted', 'arriving', 'started', 'ongoing', 'assigned', 'confirmed', 'end_requested',
]);
const TERMINAL_RIDE_STATUSES = new Set(['completed', 'cancelled', 'delivered']);

const notifyCurrentRideChange = () => DeviceEventEmitter.emit(CURRENT_RIDE_UPDATED_EVENT);

const buildComparableRideSnapshot = (ride = null) => {
  if (!ride?.rideId) return null;

  return {
    rideId: ride.rideId,
    status: ride.status || '',
    liveStatus: ride.liveStatus || '',
    serviceType: ride.serviceType || ride.type || '',
    pickup: ride.pickup || '',
    drop: ride.drop || '',
    fare: Number(ride.fare || 0),
    updatedAt: ride.updatedAt || '',
    scheduledAt: ride.scheduledAt || '',
    assignedAt: ride.assignedAt || '',
    driverId: ride.driver?._id || ride.driver?.id || '',
    driverName: ride.driver?.name || '',
    vehicleIconUrl: ride.vehicleIconUrl || ride.vehicle?.vehicleIconUrl || '',
    finalCharge: Number(ride.finalCharge || 0),
    finalElapsedMinutes: Number(ride.finalElapsedMinutes || 0),
  };
};

export const getCurrentRideSignature = (ride = null) => {
  const snapshot = buildComparableRideSnapshot(ride);
  return snapshot ? JSON.stringify(snapshot) : '';
};

export const getCurrentRide = async () => {
  try {
    const raw = await AsyncStorage.getItem(CURRENT_RIDE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const isActiveCurrentRide = ride => {
  if (!ride?.rideId) return false;

  const status = String(ride.status || '').toLowerCase();
  const liveStatus = String(ride.liveStatus || '').toLowerCase();

  if (TERMINAL_RIDE_STATUSES.has(status) || TERMINAL_RIDE_STATUSES.has(liveStatus)) return false;

  return ACTIVE_RIDE_STATUSES.has(liveStatus || status || 'accepted');
};

export const saveCurrentRide = async ride => {
  if (!ride?.rideId) return;

  const nextRide = {
    ...ride,
    status: ride.status || 'accepted',
    liveStatus: ride.liveStatus || ride.status || 'accepted',
    updatedAt: Date.now(),
  };

  const previousRide = await getCurrentRide();
  if (getCurrentRideSignature(previousRide) === getCurrentRideSignature(nextRide)) return;

  await AsyncStorage.setItem(CURRENT_RIDE_STORAGE_KEY, JSON.stringify(nextRide));
  notifyCurrentRideChange();
};

export const clearCurrentRide = async () => {
  const existing = await AsyncStorage.getItem(CURRENT_RIDE_STORAGE_KEY);
  if (!existing) return;

  await AsyncStorage.removeItem(CURRENT_RIDE_STORAGE_KEY);
  notifyCurrentRideChange();
};
