/**
 * Ported verbatim from Frontend/src/services/api/index.js's zoneAPI + geocodeAPI
 * (public endpoints — the Google Maps key stays on the backend).
 */
import apiClient from '../api/axios';

export const zoneApi = {
  detectZone: (lat, lng) => apiClient.get('/food/zones/detect', {params: {lat, lng}}),
  getPublicZones: (params = {}, config = {}) => apiClient.get('/food/zones/public', {params: params ?? {}, ...config}),
};

export const geocodeApi = {
  reverse: (lat, lng, params = {}, config = {}) => apiClient.get('/food/geocode/reverse', {params: {lat, lng, ...params}, ...config}),
  place: (placeId, config = {}) => apiClient.get('/food/geocode/place', {params: {place_id: placeId}, ...config}),
  nearby: (body, config = {}) => apiClient.post('/food/geocode/nearby', body, config),
  textSearch: (body, config = {}) => apiClient.post('/food/geocode/text-search', body, config),
};

export default {zoneApi, geocodeApi};
