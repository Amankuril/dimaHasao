/**
 * Ported from Frontend/src/modules/Taxi/shared/services/safetyAlertService.js,
 * trimmed to the user-side alert (the driver-side one belongs to the future
 * driver app). navigator.geolocation becomes @react-native-community/geolocation;
 * getCurrentRide is already async here (AsyncStorage-backed).
 */
import Geolocation from '@react-native-community/geolocation';
import api from './axiosInstance';
import {withUserAuth} from './authService';
import {getCurrentRide} from './currentRideService';

const cleanString = (value = '') => String(value || '').trim();

const readCoordinatePair = (...sources) => {
  for (const source of sources) {
    if (Array.isArray(source) && source.length >= 2) {
      const [lng, lat] = source;
      if (Number.isFinite(Number(lng)) && Number.isFinite(Number(lat))) return [Number(lng), Number(lat)];
    }
    const nestedCoords = source?.coordinates;
    if (Array.isArray(nestedCoords) && nestedCoords.length >= 2) {
      const [lng, lat] = nestedCoords;
      if (Number.isFinite(Number(lng)) && Number.isFinite(Number(lat))) return [Number(lng), Number(lat)];
    }
    const lat = Number(source?.lat ?? source?.latitude);
    const lng = Number(source?.lng ?? source?.longitude ?? source?.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [Number(lng), Number(lat)];
  }
  return null;
};

const readDeviceLocation = () =>
  new Promise(resolve => {
    Geolocation.getCurrentPosition(
      position => resolve([position.coords.longitude, position.coords.latitude]),
      () => resolve(null),
      {enableHighAccuracy: true, timeout: 6000, maximumAge: 30000},
    );
  });

export const triggerUserSosAlert = async (extra = {}) => {
  const ride = (await getCurrentRide()) || {};
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
    location: location ? {coordinates: location} : null,
    ...extra,
  };

  const response = await api.post('/users/sos', payload, await withUserAuth());
  return response?.data?.data || response?.data || null;
};

export default {triggerUserSosAlert};
