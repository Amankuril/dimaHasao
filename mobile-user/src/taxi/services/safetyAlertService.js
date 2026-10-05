import * as Location from 'expo-location';
import api from '../api/client';
import { getCurrentRide } from './currentRideService';

/* Port of the user half of Taxi/shared/services/safetyAlertService.js (driver SOS belongs to the driver app). */
const cleanString = (value = '') => String(value || '').trim();

const readCoordinatePair = (...sources) => {
  for (const source of sources) {
    if (Array.isArray(source) && source.length >= 2) {
      const [lng, lat] = source;
      if (Number.isFinite(Number(lng)) && Number.isFinite(Number(lat))) return [Number(lng), Number(lat)];
    }
    const nested = source?.coordinates;
    if (Array.isArray(nested) && nested.length >= 2) {
      const [lng, lat] = nested;
      if (Number.isFinite(Number(lng)) && Number.isFinite(Number(lat))) return [Number(lng), Number(lat)];
    }
    const lat = Number(source?.lat ?? source?.latitude);
    const lng = Number(source?.lng ?? source?.longitude ?? source?.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat];
  }
  return null;
};

const readDeviceLocation = async () => {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted && perm.canAskAgain !== false) perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return [pos.coords.longitude, pos.coords.latitude];
  } catch {
    return null;
  }
};

export const triggerUserSosAlert = async (extra = {}) => {
  const ride = getCurrentRide() || {};
  const location = readCoordinatePair(ride?.pickupCoords, ride?.pickupLocation, ride?.dropCoords, ride?.dropLocation) || (await readDeviceLocation());
  const payload = {
    rideId: cleanString(ride?.rideId),
    deliveryId: cleanString(ride?.deliveryId),
    serviceType: cleanString(ride?.serviceType || ride?.type || 'general').toLowerCase(),
    tripCode: cleanString(ride?.rideId),
    pickupAddress: cleanString(ride?.pickup),
    dropAddress: cleanString(ride?.drop),
    vehicleLabel: cleanString(ride?.vehicle?.name || ride?.vehicleLabel || ride?.driver?.vehicleType),
    locationLabel: cleanString(ride?.pickup || ride?.drop),
    location: location ? { coordinates: location } : null,
    ...extra,
  };
  const response = await api.post('/users/sos', payload);
  return response?.data?.data || response?.data || null;
};
