import * as Location from 'expo-location';
import api from '../api/client';
import { localStore } from '../../lib/storage';

/* Port of the driver half of Taxi/shared/services/safetyAlertService.js. The browser geolocation read is expo-location (foreground). */
const ACTIVE_TRIP_SNAPSHOT_KEY = 'driverActiveTripSnapshot';

const cleanString = (value = '') => String(value || '').trim();

const readCoordinatePair = (...sources) => {
  for (const source of sources) {
    if (Array.isArray(source) && source.length >= 2) {
      const [lng, lat] = source;
      if (Number.isFinite(Number(lng)) && Number.isFinite(Number(lat))) {
        return [Number(lng), Number(lat)];
      }
    }

    const nestedCoords = source?.coordinates;
    if (Array.isArray(nestedCoords) && nestedCoords.length >= 2) {
      const [lng, lat] = nestedCoords;
      if (Number.isFinite(Number(lng)) && Number.isFinite(Number(lat))) {
        return [Number(lng), Number(lat)];
      }
    }

    const lat = Number(source?.lat ?? source?.latitude);
    const lng = Number(source?.lng ?? source?.longitude ?? source?.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return [Number(lng), Number(lat)];
    }
  }

  return null;
};

const readDriverTripSnapshot = () => {
  try {
    const raw = localStore.getItem(ACTIVE_TRIP_SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const readDeviceLocation = async () => {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted && perm.canAskAgain !== false) perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return [position.coords.longitude, position.coords.latitude];
  } catch {
    return null;
  }
};

export const triggerDriverSosAlert = async (extra = {}) => {
  const snapshot = readDriverTripSnapshot() || {};
  const job = snapshot?.job || snapshot?.raw || snapshot || {};
  const location =
    readCoordinatePair(
      snapshot?.driverCoords,
      job?.driverCoords,
      job?.driverLocation,
      job?.pickupLocation,
      job?.pickup,
    ) || (await readDeviceLocation());

  const payload = {
    rideId: cleanString(job?.rideId || job?.id || job?._id),
    deliveryId: cleanString(job?.deliveryId),
    serviceType: cleanString(job?.serviceType || job?.type || 'general').toLowerCase(),
    tripCode: cleanString(job?.rideId || job?.id || job?._id),
    pickupAddress: cleanString(job?.pickupAddress || job?.pickup),
    dropAddress: cleanString(job?.dropAddress || job?.drop),
    vehicleLabel: cleanString(job?.vehicle?.name || job?.vehicleType || job?.vehicleLabel),
    locationLabel: cleanString(job?.pickupAddress || job?.pickup || job?.dropAddress),
    location: location ? { coordinates: location } : null,
    ...extra,
  };

  const response = await api.post('/drivers/sos', payload);
  return response?.data?.data || response?.data || null;
};
