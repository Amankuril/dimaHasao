import apiClient from './client';

/*
 * Geocode lookups go through the backend proxy (/food/geocode/*). The Google
 * key lives on the server, where it can be changed without a new app release;
 * the app never holds it.
 */
export const geocodeAPI = {
  reverse: (lat, lng, params = {}, config = {}) => apiClient.get('/food/geocode/reverse', { params: { lat, lng, ...params }, ...config }),
  place: (placeId, config = {}) => apiClient.get('/food/geocode/place', { params: { place_id: placeId }, ...config }),
  nearby: (body, config = {}) => apiClient.post('/food/geocode/nearby', body, config),
  textSearch: (body, config = {}) => apiClient.post('/food/geocode/text-search', body, config),
};
