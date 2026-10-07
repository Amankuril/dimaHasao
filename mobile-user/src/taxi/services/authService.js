import api from '../api/client';
import { getTaxiToken } from '../../api/client';
import { localStore } from '../../lib/storage';

/*
 * Port of Taxi/modules/user/services/authService.js. Sign-in is the app's one OTP login (/app/login), so only the
 * account calls are here. The taxi client already sends the taxi token, so withUserAuth() adds nothing.
 */
export const getLocalUserToken = () => getTaxiToken() || '';

export const clearLocalUserSession = () => {
  ['userToken', 'userInfo', 'user_accessToken', 'user_refreshToken', 'user', 'token', 'role', 'chatRole'].forEach((k) => localStore.removeItem(k));
};

export const withUserAuth = (config = {}) => config;

export const userAuthService = {
  uploadProfileImage: (dataUrl) => api.post('/users/profile-image', { dataUrl }),
  updateCurrentUser: (payload) => api.patch('/users/me', payload, withUserAuth()),
  getCurrentUser: () => api.get('/users/me', withUserAuth()),
  getWallet: () => api.get('/users/wallet', withUserAuth()),
  transferWallet: (phone, amount) => api.post('/users/wallet/transfer', { phone, amount }, withUserAuth()),
  transferWalletToDriver: (phone, amount) => api.post('/users/wallet/transfer/driver', { phone, amount }, withUserAuth()),
  createWalletTopupOrder: (amount) => api.post('/users/wallet/razorpay/order', { amount }, withUserAuth()),
  verifyWalletTopup: (payload) => api.post('/users/wallet/razorpay/verify', payload, withUserAuth()),
  createPhonePeWalletTopupOrder: (amount) => api.post('/users/wallet/phonepe/order', { amount }, withUserAuth()),
  verifyPhonePeWalletTopup: (merchantTransactionId) => api.get(`/users/wallet/phonepe/status/${merchantTransactionId}`, withUserAuth()),
  requestAccountDeletion: (reason) => api.post('/users/me/delete-request', { reason }),
  getNotifications: () => api.get('/users/notifications', withUserAuth()),
  deleteNotification: (id) => api.delete(`/users/notifications/${id}`, withUserAuth()),
  clearAllNotifications: () => api.delete('/users/notifications', withUserAuth()),
  saveFcmToken: (token, platform) => api.post('/users/fcm-token', { token, platform }, withUserAuth()),
};
