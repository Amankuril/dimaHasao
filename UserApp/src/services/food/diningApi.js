/**
 * Ported from Frontend/src/services/api/index.js's diningAPI, trimmed to
 * the rider-facing calls (getRestaurantBookings always resolves as 'user' —
 * the restaurant-portal branch belongs to the future restaurant partner app).
 */
import apiClient from '../api/axios';

export const diningApi = {
  getCategories: (params = {}) => apiClient.get('/food/dining/categories/public', {params}),
  getRestaurants: (params = {}) => apiClient.get('/food/dining/restaurants/public', {params}),
  getHeroBanners: () => apiClient.get('/food/hero-banners/dining/public'),
  getRestaurantBySlug: slug => apiClient.get(`/food/restaurant/restaurants/${String(slug)}`),
  getBookings: () => apiClient.get('/food/dining/bookings', {contextModule: 'user'}),
  getBookingById: id => apiClient.get(`/food/dining/bookings/${id}`, {contextModule: 'user'}),
  getRestaurantBookings: restaurantRef => {
    const idOrSlug = restaurantRef?._id || restaurantRef?.id || restaurantRef?.restaurantId || (typeof restaurantRef === 'string' ? restaurantRef : '');
    return apiClient.get(`/food/dining/bookings/by-restaurant/${idOrSlug}`, {contextModule: 'user'});
  },
  createReview: (payload = {}) =>
    apiClient.post(`/food/dining/bookings/${payload?.bookingId}/review`, {rating: payload?.rating, comment: payload?.comment}, {contextModule: 'user'}),
  createBooking: (payload = {}) => apiClient.post('/food/dining/bookings', payload, {contextModule: 'user'}),
};

export default diningApi;
