import api from '../../../shared/api/axiosInstance';
import { requestOtp, verifyOtp, AUDIENCE } from '../../../../../services/auth/otpAuthClient';

const decodeBase64Url = (value) => {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return normalized + '='.repeat(padding);
};

const getTokenPayload = (token) => {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const payload = token.split('.')[1];

    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(atob(decodeBase64Url(payload)));
    if (decoded && typeof decoded.exp === 'number') {
      const isExpired = Date.now() / 1000 >= decoded.exp;
      if (isExpired) {
        return null;
      }
    }
    return decoded;
  } catch {
    return null;
  }
};

const isUserRole = (role) => {
  const normalized = String(role || '').trim().toLowerCase();
  return !normalized || normalized === 'user';
};

const readLocalUserToken = () =>
  [
    localStorage.getItem('userToken'),
    localStorage.getItem('token'),
    localStorage.getItem('user_accessToken'),
  ].filter(Boolean).find((token) => isUserRole(getTokenPayload(token)?.role)) || '';

export const getLocalUserToken = readLocalUserToken;

export const clearLocalUserSession = () => {
  localStorage.removeItem('userToken');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('user_accessToken');
  localStorage.removeItem('user_refreshToken');
  localStorage.removeItem('user');

  const fallbackToken = localStorage.getItem('token');
  if (fallbackToken) {
    try {
      const payload = fallbackToken.split('.')[1];
      const decoded = payload ? JSON.parse(atob(decodeBase64Url(payload))) : null;
      if (isUserRole(decoded?.role)) {
        localStorage.removeItem('token');
      }
    } catch {
      localStorage.removeItem('token');
    }
  }

  if (String(localStorage.getItem('role') || '').toLowerCase() === 'user') {
    localStorage.removeItem('role');
  }

  if (String(localStorage.getItem('chatRole') || '').toLowerCase() === 'user') {
    localStorage.removeItem('chatRole');
  }
};

export const withUserAuth = (config = {}) => {
  const token = readLocalUserToken();

  if (!token) {
    return config;
  }

  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  };
};

export const userAuthService = {
  signup: (payload) => api.post('/users/signup', payload),
  login: (payload) => api.post('/users/login', payload),
  // The consumer super-app has one account across food, taxi, hotel and tours,
  // so taxi signs in through the shared auth surface rather than its own.
  // `api` is scoped to /api/v1/taxi, hence the platform-rooted client.
  startOtp: (phone) => requestOtp(AUDIENCE.USER, phone),
  verifyOtp: (phone, otp) => verifyOtp(AUDIENCE.USER, phone, otp),
  verifyOtpLogin: (phone) => api.post('/users/otp-login', { phone }),
  uploadProfileImage: (dataUrl) => api.post('/users/profile-image', { dataUrl }),
  updateCurrentUser: (payload) => api.patch('/users/me', payload, withUserAuth()),
  getCurrentUser: () => api.get('/users/me', withUserAuth()),
  getWallet: () => api.get('/users/wallet', withUserAuth()),
  topupWallet: (amount) => api.post('/users/wallet/topup', { amount }, withUserAuth()),
  transferWallet: (phone, amount) => api.post('/users/wallet/transfer', { phone, amount }, withUserAuth()),
  transferWalletToDriver: (phone, amount) => api.post('/users/wallet/transfer/driver', { phone, amount }, withUserAuth()),
  createWalletTopupOrder: (amount) => api.post('/users/wallet/razorpay/order', { amount }, withUserAuth()),
  verifyWalletTopup: (payload) => api.post('/users/wallet/razorpay/verify', payload, withUserAuth()),
  createPhonePeWalletTopupOrder: (amount) => api.post('/users/wallet/phonepe/order', { amount }, withUserAuth()),
  verifyPhonePeWalletTopup: (merchantTransactionId) =>
    api.get(`/users/wallet/phonepe/status/${merchantTransactionId}`, withUserAuth()),
  requestAccountDeletion: (reason) => api.post('/users/me/delete-request', { reason }),
  getNotifications: () => api.get('/users/notifications', withUserAuth()),
  deleteNotification: (id) => api.delete(`/users/notifications/${id}`, withUserAuth()),
  clearAllNotifications: () => api.delete('/users/notifications', withUserAuth()),
  saveFcmToken: (token, platform) => api.post('/users/fcm-token', { token, platform }, withUserAuth()),
  getRideBids: (rideId) => api.get(`/rides/${rideId}/bids`, withUserAuth()),
  acceptRideBid: (rideId, bidId) => api.post(`/rides/${rideId}/bids/${bidId}/accept`, {}, withUserAuth()),
  increaseRideBidCeiling: (rideId, incrementSteps = 1) =>
    api.patch(`/rides/${rideId}/bids/ceiling`, { incrementSteps }, withUserAuth()),
};
