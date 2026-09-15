/** Tour operator API. */
import { toursApi, OPERATOR_TOKEN_KEY } from './apiService';

export const OPERATOR_USER_KEY = 'tours_operator_user';

export const saveOperatorSession = (token, user) => {
  if (token) localStorage.setItem(OPERATOR_TOKEN_KEY, token);
  if (user) localStorage.setItem(OPERATOR_USER_KEY, JSON.stringify(user));
};

export const readOperatorUser = () => {
  try {
    return JSON.parse(localStorage.getItem(OPERATOR_USER_KEY) || 'null');
  } catch {
    return null;
  }
};

export const clearOperatorSession = () => {
  localStorage.removeItem(OPERATOR_TOKEN_KEY);
  localStorage.removeItem(OPERATOR_USER_KEY);
};

export const isOperatorSignedIn = () => Boolean(localStorage.getItem(OPERATOR_TOKEN_KEY));

/** Refresh the cached operator so approval granted after sign-in is picked up. */
export const cacheOperator = (operator) => {
  if (operator) localStorage.setItem(OPERATOR_USER_KEY, JSON.stringify(operator));
  return operator;
};

const operatorService = {
  // Profile — the live approval status, not the one frozen at sign-in.
  getProfile: () => toursApi.get('/operators/me'),
  updateProfile: (payload) => toursApi.put('/operators/me', payload),

  // Packages
  getMyPackages: () => toursApi.get('/packages/mine'),
  getMyPackage: async (id) => {
    // The public detail route only serves approved packages, so an operator
    // editing a pending one reads it out of their own list instead.
    const { packages = [] } = await toursApi.get('/packages/mine');
    return packages.find((p) => String(p._id) === String(id)) || null;
  },
  createPackage: (payload) => toursApi.post('/packages', payload),
  updatePackage: (id, payload) => toursApi.put(`/packages/${id}`, payload),
  togglePackage: (id, isActive) => toursApi.patch(`/packages/${id}/active`, { isActive }),
  deletePackage: (id) => toursApi.delete(`/packages/${id}`),

  // Bookings
  getBookings: (status) => toursApi.get('/bookings/operator', { params: status ? { status } : {} }),
  collectBalance: (id) => toursApi.patch(`/bookings/${id}/collect-balance`, {}),
  updateBookingStatus: (id, status, reason) => toursApi.patch(`/bookings/${id}/status`, { status, reason }),

  // Reviews
  getReviews: () => toursApi.get('/reviews/operator'),
  replyToReview: (id, reply) => toursApi.post(`/reviews/${id}/reply`, { reply }),

  // Wallet
  getWallet: () => toursApi.get('/wallet'),
  getTransactions: () => toursApi.get('/wallet/transactions'),
  updateBankDetails: (payload) => toursApi.put('/wallet/bank-details', payload),
  requestWithdrawal: (amount) => toursApi.post('/wallet/withdraw', { amount }),
  getWithdrawals: () => toursApi.get('/wallet/withdrawals'),
};

export default operatorService;
