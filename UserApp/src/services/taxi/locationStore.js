/**
 * Ported from Frontend/src/modules/Taxi/modules/user/services/locationStore.js.
 * AsyncStorage is async where localStorage was sync; `window.dispatchEvent`
 * becomes RN's DeviceEventEmitter.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DeviceEventEmitter} from 'react-native';

export const LOCATION_STORAGE_KEY = 'dimahasao_taxi_last_location';
export const LOCATION_UPDATED_EVENT = 'dimahasao:taxi-location-updated';

export const DEFAULT_LOCATION_LABEL = 'Choose your location';
export const DEFAULT_LOCATION_COORDS = [93.0167, 25.1667]; // Haflong

export const getSavedLocation = async () => {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(LOCATION_STORAGE_KEY)) || '{}');
    const lat = Number(saved?.lat);
    const lon = Number(saved?.lon);
    const updatedAt = Number(saved?.updatedAt);
    const address = String(saved?.address || '').trim();

    return {
      address,
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : null,
    };
  } catch {
    return null;
  }
};

export const getSavedLocationLabel = async () => String((await getSavedLocation())?.address || '').trim() || DEFAULT_LOCATION_LABEL;

export const getSavedLocationCoords = async () => {
  const saved = await getSavedLocation();
  if (saved && Number.isFinite(saved.lon) && Number.isFinite(saved.lat)) {
    return [saved.lon, saved.lat];
  }
  return null;
};

export const saveLocation = async (nextLocation = {}) => {
  const previous = (await getSavedLocation()) || {};
  const next = {...previous, ...nextLocation};

  try {
    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(next));
    DeviceEventEmitter.emit(LOCATION_UPDATED_EVENT);
  } catch {
    // ignore storage failures
  }

  return next;
};
