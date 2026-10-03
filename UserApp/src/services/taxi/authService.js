/**
 * Ported from Frontend/src/modules/Taxi/modules/user/services/authService.js,
 * trimmed to the single 'user' role.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './axiosInstance';
import {requestUserOtp, verifyUserOtp} from '../api/auth';
import {base64Decode} from '../../utils/base64';

const getTokenPayload = token => {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(base64Decode(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
};

const isUserRole = role => {
  const normalized = String(role || '').trim().toLowerCase();
  return !normalized || normalized === 'user';
};

/** The one user token, wherever login actually wrote it. */
export async function getLocalUserToken() {
  const pairs = await AsyncStorage.multiGet(['userToken', 'token', 'user_accessToken']);
  const tokens = pairs.map(([, v]) => v).filter(Boolean);
  return tokens.find(token => isUserRole(getTokenPayload(token)?.role)) || '';
}

export async function clearLocalUserSession() {
  const keysToCheck = await AsyncStorage.multiGet(['token', 'role', 'chatRole']);
  const [[, fallbackToken], [, role], [, chatRole]] = keysToCheck;

  const toRemove = ['userToken', 'userInfo', 'user_accessToken', 'user_refreshToken', 'user'];
  if (fallbackToken && isUserRole(getTokenPayload(fallbackToken)?.role)) toRemove.push('token');
  if (String(role || '').toLowerCase() === 'user') toRemove.push('role');
  if (String(chatRole || '').toLowerCase() === 'user') toRemove.push('chatRole');

  await AsyncStorage.multiRemove(toRemove);
}

export async function withUserAuth(config = {}) {
  const token = await getLocalUserToken();
  if (!token) return config;
  return {...config, headers: {...(config.headers || {}), Authorization: `Bearer ${token}`}};
}

export const userAuthService = {
  signup: payload => api.post('/users/signup', payload),
  login: payload => api.post('/users/login', payload),
  startOtp: phone => requestUserOtp(phone),
  verifyOtp: (phone, otp) => verifyUserOtp(phone, otp),
  verifyOtpLogin: phone => api.post('/users/otp-login', {phone}),
  uploadProfileImage: async dataUrl => api.post('/users/profile-image', {dataUrl}, await withUserAuth()),
  updateCurrentUser: async payload => api.patch('/users/me', payload, await withUserAuth()),
  getCurrentUser: async () => api.get('/users/me', await withUserAuth()),
  getWallet: async () => api.get('/users/wallet', await withUserAuth()),
  topupWallet: async amount => api.post('/users/wallet/topup', {amount}, await withUserAuth()),
  transferWallet: async (phone, amount) => api.post('/users/wallet/transfer', {phone, amount}, await withUserAuth()),
  transferWalletToDriver: async (phone, amount) =>
    api.post('/users/wallet/transfer/driver', {phone, amount}, await withUserAuth()),
  createWalletTopupOrder: async amount => api.post('/users/wallet/razorpay/order', {amount}, await withUserAuth()),
  verifyWalletTopup: async payload => api.post('/users/wallet/razorpay/verify', payload, await withUserAuth()),
  createPhonePeWalletTopupOrder: async amount =>
    api.post('/users/wallet/phonepe/order', {amount}, await withUserAuth()),
  verifyPhonePeWalletTopup: async merchantTransactionId =>
    api.get(`/users/wallet/phonepe/status/${merchantTransactionId}`, await withUserAuth()),
  requestAccountDeletion: reason => api.post('/users/me/delete-request', {reason}),
  getNotifications: async () => api.get('/users/notifications', await withUserAuth()),
  deleteNotification: async id => api.delete(`/users/notifications/${id}`, await withUserAuth()),
  clearAllNotifications: async () => api.delete('/users/notifications', await withUserAuth()),
  saveFcmToken: async (token, platform) => api.post('/users/fcm-token', {token, platform}, await withUserAuth()),
};
