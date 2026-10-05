import { localStore } from '../../lib/storage';
import { events } from '../../lib/events';
const CURRENT_RIDE_STORAGE_KEY = 'Appzeto 24_current_ride';

export const CURRENT_RIDE_UPDATED_EVENT = 'Appzeto 24:current-ride-updated';

const ACTIVE_RIDE_STATUSES = new Set(['accepted', 'arriving', 'started', 'ongoing', 'assigned', 'confirmed', 'end_requested']);
const TERMINAL_RIDE_STATUSES = new Set(['completed', 'cancelled', 'delivered']);

const notifyCurrentRideChange = () => {
  events.emit(CURRENT_RIDE_UPDATED_EVENT);
};

const buildComparableRideSnapshot = (ride = null) => {
  if (!ride?.rideId) {
    return null;
  }

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

export const getCurrentRide = () => {
  try {
    const rawRide = localStore.getItem(CURRENT_RIDE_STORAGE_KEY);
    return rawRide ? JSON.parse(rawRide) : null;
  } catch {
    return null;
  }
};

export const isActiveCurrentRide = (ride) => {
  if (!ride?.rideId) {
    return false;
  }

  const status = String(ride.status || '').toLowerCase();
  const liveStatus = String(ride.liveStatus || '').toLowerCase();

  if (TERMINAL_RIDE_STATUSES.has(status) || TERMINAL_RIDE_STATUSES.has(liveStatus)) {
    return false;
  }

  return ACTIVE_RIDE_STATUSES.has(liveStatus || status || 'accepted');
};

export const saveCurrentRide = (ride) => {
  if (!ride?.rideId) {
    return;
  }

  const nextRide = {
    ...ride,
    status: ride.status || 'accepted',
    liveStatus: ride.liveStatus || ride.status || 'accepted',
    updatedAt: Date.now(),
  };

  const previousRide = getCurrentRide();
  if (getCurrentRideSignature(previousRide) === getCurrentRideSignature(nextRide)) {
    return;
  }

  localStore.setItem(CURRENT_RIDE_STORAGE_KEY, JSON.stringify(nextRide));
  notifyCurrentRideChange();
};

export const clearCurrentRide = () => {
  if (!localStore.getItem(CURRENT_RIDE_STORAGE_KEY)) {
    return;
  }

  localStore.removeItem(CURRENT_RIDE_STORAGE_KEY);
  notifyCurrentRideChange();
};
