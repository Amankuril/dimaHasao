/** Tours admin API. */
import { toursApi } from './apiService';

const adminService = {
  getDashboard: () => toursApi.get('/admin/dashboard'),

  // Packages
  getPackages: (params = {}) => toursApi.get('/admin/packages', { params }),
  createPackage: (payload) => toursApi.post('/admin/packages', payload),
  updatePackage: (id, payload) => toursApi.put(`/admin/packages/${id}`, payload),
  togglePackage: (id, isActive) => toursApi.patch(`/admin/packages/${id}/active`, { isActive }),
  deletePackage: (id) => toursApi.delete(`/admin/packages/${id}`),
  updatePackageStatus: (id, status, reason) =>
    toursApi.patch(`/admin/packages/${id}/status`, { status, reason }),

  // Destinations (tourist places)
  getDestinations: () => toursApi.get('/admin/destinations'),
  createDestination: (payload) => toursApi.post('/admin/destinations', payload),
  updateDestination: (id, payload) => toursApi.put(`/admin/destinations/${id}`, payload),
  toggleDestination: (id, isActive) => toursApi.patch(`/admin/destinations/${id}/active`, { isActive }),
  deleteDestination: (id) => toursApi.delete(`/admin/destinations/${id}`),

  // Offers (promo codes)
  getOffers: () => toursApi.get('/admin/offers'),
  createOffer: (payload) => toursApi.post('/admin/offers', payload),
  updateOffer: (id, payload) => toursApi.put(`/admin/offers/${id}`, payload),
  toggleOffer: (id, isActive) => toursApi.patch(`/admin/offers/${id}/active`, { isActive }),
  deleteOffer: (id) => toursApi.delete(`/admin/offers/${id}`),

  // Reviews
  getReviews: (params = {}) => toursApi.get('/admin/reviews', { params }),
  updateReviewStatus: (id, status) => toursApi.patch(`/admin/reviews/${id}/status`, { status }),
  replyToReview: (id, reply) => toursApi.post(`/admin/reviews/${id}/reply`, { reply }),

  // Bookings
  getBookings: (params = {}) => toursApi.get('/admin/bookings', { params }),
  updateBookingStatus: (id, status, reason) =>
    toursApi.patch(`/admin/bookings/${id}/status`, { status, reason }),
  /**
   * Cancel on the traveller's behalf. The endpoint existed from the start and
   * had no caller, so a cancellation phoned in to the office could not be
   * actioned from the panel at all.
   */
  cancelBooking: (id, reason) =>
    toursApi.post(`/admin/bookings/${id}/cancel`, { reason }),

  // Settings
  getSettings: () => toursApi.get('/admin/settings'),
  updateSettings: (payload) => toursApi.put('/admin/settings', payload),
};

export default adminService;
