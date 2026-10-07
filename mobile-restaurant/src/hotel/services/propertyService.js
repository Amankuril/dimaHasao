import * as Location from 'expo-location';
import { api, handleResponse, handleError } from './apiService';

/* Port of Frontend/src/modules/Hotel/services/propertyService.js. */

export const propertyService = {
  getPublicProperties: async (params) => {
    try {
      const response = await api.get('/properties', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getPropertyDetails: async (id) => {
    try {
      const response = await api.get(`/properties/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  // Helper to get location (expo-location instead of navigator.geolocation)
  getCurrentLocation: async () => {
    let perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted && perm.canAskAgain !== false) perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) throw new Error('Location permission denied. Please enable it in device settings.');
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  },
};
