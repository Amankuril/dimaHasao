/**
 * Ported from Frontend/src/services/api/index.js's userAPI, trimmed to the
 * methods Food screens actually call (uploadProfileImage's multipart build
 * is deferred to task 9h, where the RN image-picker flow is wired).
 */
import apiClient from '../api/axios';
import {getMe} from '../api/auth';

export const userApi = {
  getCustomizationSettings: () => apiClient.get('/food/public/customization-settings'),
  getProfile: () =>
    getMe().then(res => {
      const user = res?.data?.data?.user ?? res?.data?.user ?? res?.data?.data ?? res?.data;
      return {...res, data: {...res.data, data: {user}}};
    }),
  updateProfile: body => apiClient.patch('/food/user/profile', body ?? {}, {contextModule: 'user'}),
  getWallet: (() => {
    let inFlight = null;
    let cached = null;
    let cacheTime = 0;
    const CACHE_MS = 3000;
    return () => {
      const now = Date.now();
      if (cached && now - cacheTime < CACHE_MS) return Promise.resolve(cached);
      if (!inFlight) {
        inFlight = apiClient
          .get('/food/user/wallet', {contextModule: 'user'})
          .then(res => {
            cached = res;
            cacheTime = Date.now();
            return res;
          })
          .finally(() => {
            inFlight = null;
          });
      }
      return inFlight;
    };
  })(),
  getReferralStats: () => apiClient.get('/food/user/referrals/stats', {contextModule: 'user'}),
  getReferralDetails: () => apiClient.get('/food/user/referrals/details', {contextModule: 'user'}),
  createWalletTopupOrder: amount => apiClient.post('/food/user/wallet/topup/order', {amount: Number(amount)}, {contextModule: 'user'}),
  verifyWalletTopupPayment: body => apiClient.post('/food/user/wallet/topup/verify', body ?? {}, {contextModule: 'user'}),
  getAddresses: (() => {
    let inFlight = null;
    let cached = null;
    let cacheTime = 0;
    const CACHE_MS = 3000;
    return () => {
      const now = Date.now();
      if (cached && now - cacheTime < CACHE_MS) return Promise.resolve(cached);
      if (!inFlight) {
        inFlight = apiClient
          .get('/food/user/addresses', {contextModule: 'user'})
          .then(res => {
            cached = res;
            cacheTime = Date.now();
            return res;
          })
          .finally(() => {
            inFlight = null;
          });
      }
      return inFlight;
    };
  })(),
  addAddress: body => apiClient.post('/food/user/addresses', body ?? {}, {contextModule: 'user'}),
  updateAddress: (id, body) => apiClient.patch(`/food/user/addresses/${String(id)}`, body ?? {}, {contextModule: 'user'}),
  deleteAddress: id => apiClient.delete(`/food/user/addresses/${String(id)}`, {contextModule: 'user'}),
  setDefaultAddress: id => apiClient.patch(`/food/user/addresses/${String(id)}/default`, {}, {contextModule: 'user'}),
  createSafetyEmergencyReport: message => apiClient.post('/food/user/safety-emergency-reports', {message: String(message || '')}, {contextModule: 'user'}),
  getMySafetyEmergencyReports: params => apiClient.get('/food/user/safety-emergency-reports', {params: params ?? {}, contextModule: 'user'}),
  saveFcmToken: (token, options = {}) => {
    if (!token) return Promise.reject(new Error('FCM token is required'));
    const platform = options?.platform === 'mobile' ? 'mobile' : 'web';
    const path = platform === 'mobile' ? '/fcm-tokens/mobile/save' : '/fcm-tokens/save';
    return apiClient.post(path, {token: String(token), platform}, {contextModule: 'user'});
  },
  removeFcmToken: (token, options = {}) => {
    if (!token) return Promise.reject(new Error('FCM token is required'));
    const platform = options?.platform === 'mobile' ? 'mobile' : 'web';
    return apiClient.delete(`/fcm-tokens/remove/${encodeURIComponent(String(token))}`, {data: {token: String(token), platform}, contextModule: 'user'});
  },
  deleteAccount: () => apiClient.delete('/food/user/account', {contextModule: 'user'}),
};

export default userApi;
