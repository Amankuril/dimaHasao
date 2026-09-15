/** Tours admin API. */
import { toursApi } from './apiService';

const adminService = {
  getDashboard: () => toursApi.get('/admin/dashboard'),

  // Operators
  getOperators: (params = {}) => toursApi.get('/admin/operators', { params }),
  getOperatorDetail: (id) => toursApi.get(`/admin/operators/${id}`),
  updateOperatorApproval: (id, status, reason) =>
    toursApi.patch(`/admin/operators/${id}/approval`, { status, reason }),
  updateOperatorBlock: (id, isBlocked) =>
    toursApi.patch(`/admin/operators/${id}/block`, { isBlocked }),

  // Packages
  getPackages: (params = {}) => toursApi.get('/admin/packages', { params }),
  createPackageForOperator: (payload) => toursApi.post('/admin/packages', payload),
  updatePackageStatus: (id, status, reason) =>
    toursApi.patch(`/admin/packages/${id}/status`, { status, reason }),

  // Destinations (tourist places)
  getDestinations: () => toursApi.get('/admin/destinations'),
  createDestination: (payload) => toursApi.post('/admin/destinations', payload),
  updateDestination: (id, payload) => toursApi.put(`/admin/destinations/${id}`, payload),
  toggleDestination: (id, isActive) => toursApi.patch(`/admin/destinations/${id}/active`, { isActive }),
  deleteDestination: (id) => toursApi.delete(`/admin/destinations/${id}`),

  // Reviews
  getReviews: (params = {}) => toursApi.get('/admin/reviews', { params }),
  updateReviewStatus: (id, status) => toursApi.patch(`/admin/reviews/${id}/status`, { status }),

  // Bookings
  getBookings: (params = {}) => toursApi.get('/admin/bookings', { params }),

  // Payouts
  getWithdrawals: (params = {}) => toursApi.get('/admin/withdrawals', { params }),
  updateWithdrawalStatus: (id, payload) =>
    toursApi.patch(`/admin/withdrawals/${id}/status`, payload),

  // Settings
  getSettings: () => toursApi.get('/admin/settings'),
  updateSettings: (payload) => toursApi.put('/admin/settings', payload),
};

export default adminService;
