/**
 * Ported verbatim from Frontend/src/services/api/index.js's foodCartAPI.
 */
import apiClient from '../api/axios';

export const foodCartApi = {
  getCart: () => apiClient.get('/food/cart', {contextModule: 'user'}),
  addItem: payload => apiClient.post('/food/cart/items', payload ?? {}, {contextModule: 'user'}),
  updateItem: (lineId, payload) => apiClient.patch(`/food/cart/items/${encodeURIComponent(String(lineId))}`, payload ?? {}, {contextModule: 'user'}),
  removeItem: lineId => apiClient.delete(`/food/cart/items/${encodeURIComponent(String(lineId))}`, {contextModule: 'user'}),
  clearCart: () => apiClient.delete('/food/cart/clear', {contextModule: 'user'}),
  setCoupon: couponCode => apiClient.put('/food/cart/coupon', {couponCode: couponCode || ''}, {contextModule: 'user'}),
};

export default foodCartApi;
