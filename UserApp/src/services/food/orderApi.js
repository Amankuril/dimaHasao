/**
 * Ported verbatim from Frontend/src/services/api/index.js's orderAPI.
 */
import apiClient from '../api/axios';

export const orderApi = {
  calculateOrder: payload => apiClient.post('/food/orders/calculate', payload ?? {}, {contextModule: 'user'}),
  initiateOnlinePayment: payload => apiClient.post('/food/orders/initiate-online-payment', payload ?? {}, {contextModule: 'user'}),
  createOrder: payload => apiClient.post('/food/orders', payload ?? {}, {contextModule: 'user'}),
  verifyPayment: body => apiClient.post('/food/orders/verify-payment', body ?? {}, {contextModule: 'user'}),
  getOrders: (params = {}) =>
    apiClient.get('/food/orders', {params: {limit: 20, page: 1, ...params}, contextModule: 'user'}).then(res => {
      const payload = res?.data?.data;
      if (payload && typeof payload === 'object' && Array.isArray(payload.data) && payload.meta && typeof payload.meta === 'object') {
        const meta = payload.meta;
        return {
          ...res,
          data: {
            ...res.data,
            data: {
              ...payload,
              orders: payload.data,
              pagination: {
                total: Number(meta.total || 0),
                page: Number(meta.page || 1),
                limit: Number(meta.limit || params.limit || 20),
                pages: Number(meta.totalPages || 1),
              },
            },
          },
        };
      }
      return res;
    }),
  getOrderDetails: (() => {
    const inFlight = new Map();
    const cache = new Map();
    const CACHE_MS = 800;

    return (orderId, options = {}) => {
      const key = String(orderId ?? '').trim();
      if (!key) return Promise.reject(new Error('orderId required'));

      const force = options.force === true;
      const now = Date.now();
      if (!force) {
        const hit = cache.get(key);
        if (hit && now - hit.at < CACHE_MS) return Promise.resolve(hit.res);
      }

      const pending = inFlight.get(key);
      if (pending) return pending;

      const p = apiClient
        .get(`/food/orders/${key}`, {contextModule: 'user'})
        .then(res => {
          cache.set(key, {at: Date.now(), res});
          return res;
        })
        .finally(() => inFlight.delete(key));

      inFlight.set(key, p);
      return p;
    };
  })(),
  cancelOrder: (orderId, body = {}) => apiClient.patch(`/food/orders/${String(orderId)}/cancel`, body ?? {}, {contextModule: 'user'}),
  updateOrderInstructions: (orderId, instructions) => apiClient.patch(`/food/orders/${String(orderId)}/instructions`, {instructions}, {contextModule: 'user'}),
  submitOrderRatings: (orderId, body = {}) => apiClient.patch(`/food/orders/${String(orderId)}/ratings`, body ?? {}, {contextModule: 'user'}),
  submitComplaint: payload =>
    apiClient.post(
      '/food/user/support/ticket',
      {
        type: 'order',
        orderId: payload.orderId,
        issueType: payload.complaintType,
        description: payload.subject ? `${payload.subject}: ${payload.description}` : payload.description,
      },
      {contextModule: 'user'},
    ),
};

export default orderApi;
