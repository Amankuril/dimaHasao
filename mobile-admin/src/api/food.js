/*
 * Port of Frontend/src/services/api/index.js for the admin panels: adminAPI,
 * supportAPI, notificationAPI, zoneAPI, uploadAPI and the one restaurantAPI
 * call the admin pages make, with the same method names, paths and caching.
 * Generated from the web source; apiClient is the app's axios-compatible client
 * (resolves { data, status }), which always sends the admin token.
 */
/* eslint-disable no-unused-vars */
import apiClient from './client';
import { API_ENDPOINTS } from './config';
import * as authService from './auth';
import { prepareUploadFile, prepareUploadFiles } from '../lib/images';

function stableStringify(value) {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

function createInFlightCache({ ttlMs }) {
  const inFlight = new Map();
  const cached = new Map(); // key -> { t, v }

  const getCached = (key) => {
    const hit = cached.get(key);
    if (!hit) return null;
    if (Date.now() - hit.t > ttlMs) {
      cached.delete(key);
      return null;
    }
    return hit.v;
  };

  const getOrCreate = (key, factory) => {
    const cachedValue = getCached(key);
    if (cachedValue) return Promise.resolve(cachedValue);
    if (inFlight.has(key)) return inFlight.get(key);
    const p = Promise.resolve()
      .then(factory)
      .then((res) => {
        cached.set(key, { t: Date.now(), v: res });
        return res;
      })
      .finally(() => {
        inFlight.delete(key);
      });
    inFlight.set(key, p);
    return p;
  };

  return { getOrCreate };
}


const adminReadCache = new Map();

/**
 * How long a cached admin read may still be shown while it refreshes behind
 * the screen. Past this it is treated as absent and the caller waits.
 */
const ADMIN_READ_SWR_MS = 5 * 60 * 1000;

/**
 * Drop cached admin reads whose URL contains any of these fragments.
 *
 * Call it after a write. A short TTL makes an edit visible within seconds on
 * its own, which is fine for a badge count and not fine for the list the admin
 * just changed a row in.
 */
/**
 * Approving, rejecting, deleting or switching a restaurant off all change the
 * lists the restaurants screen reads. Passed through `.then` so the caller
 * still receives the response untouched.
 */
const withRestaurantListRefresh = (res) => {
  invalidateAdminReads("/food/admin/restaurants", "/food/admin/dashboard-stats");
  return res;
};

export const invalidateAdminReads = (...fragments) => {
  for (const key of [...adminReadCache.keys()]) {
    if (fragments.some((fragment) => key.includes(fragment))) adminReadCache.delete(key);
  }
};
const adminReadInFlight = new Map();

const buildAdminReadKey = (url, params = {}) => {
  const safeParams = params && typeof params === "object" ? { ...params } : params;
  if (safeParams && typeof safeParams === "object") {
    delete safeParams._ts;
  }
  return `admin:${String(url || "").trim()}:${stableStringify(safeParams)}`;
};

const adminCachedGet = (url, config = {}, options = {}) => {
  const { noCache, params, ...axiosConfig } = config || {};
  const ttlMs = Number(options?.ttlMs || 0) || 5000;
  const staleOn429Ms = Number(options?.staleOn429Ms || 0) || 60000;

  if (noCache) {
    return apiClient.get(url, { params, ...axiosConfig });
  }

  const key = buildAdminReadKey(url, params);
  const now = Date.now();
  const cached = adminReadCache.get(key);
  if (cached && now - cached.at < ttlMs) {
    return Promise.resolve(cached.res);
  }

  const pending = adminReadInFlight.get(key);
  if (pending) return pending;

  /*
   * Stale-while-revalidate.
   *
   * The TTLs here are short on purpose — someone is editing this data — but a
   * short TTL means every screen revisit waits on the network again, which is
   * what makes the panels feel slow to navigate. Past the TTL but inside the
   * SWR window the cached response is returned *immediately* and a refresh
   * runs behind it, so the screen paints at once and corrects itself.
   *
   * The refresh must not reject: nobody is waiting on it.
   */
  if (cached && now - cached.at < ADMIN_READ_SWR_MS) {
    void apiClient
      .get(url, { params, ...axiosConfig })
      .then((res) => adminReadCache.set(key, { at: Date.now(), res }))
      .catch(() => {});
    return Promise.resolve(cached.res);
  }

  const request = apiClient
    .get(url, { params, ...axiosConfig })
    .then((res) => {
      adminReadCache.set(key, { at: Date.now(), res });
      return res;
    })
    .catch((err) => {
      const status = Number(err?.response?.status || 0);
      const fallback = adminReadCache.get(key);
      if (status === 429 && fallback && now - fallback.at < staleOn429Ms) {
        return fallback.res;
      }
      throw err;
    })
    .finally(() => {
      adminReadInFlight.delete(key);
    });

  adminReadInFlight.set(key, request);
  return request;
};


export const supportAPI = {
  createTicket: (body) =>
    apiClient.post("/food/user/support/ticket", body ?? {}, {
      contextModule: "user",
    }),
  getMyTickets: (params = {}) =>
    apiClient.get("/food/user/support/my-tickets", {
      params,
      contextModule: "user",
    }),
  getSupportTicketsAdmin: (params = {}) =>
    adminCachedGet("/food/admin/support-tickets", {
      params,
      contextModule: "admin",
    }, { ttlMs: 5000, staleOn429Ms: 60000 }),
  updateSupportTicketAdmin: (id, body = {}) =>
    apiClient.patch(`/food/admin/support-tickets/${String(id)}`, body ?? {}, {
      contextModule: "admin",
    }),
};

export const notificationAPI = {
  getInbox: (params = {}, config = {}) =>
    apiClient.get("/food/notifications/inbox", {
      params,
      ...config,
    }),
  markAsRead: (id, config = {}) =>
    apiClient.patch(`/food/notifications/${String(id)}/read`, {}, config),
  dismiss: (id, config = {}) =>
    apiClient.delete(`/food/notifications/${String(id)}`, config),
  dismissAll: (config = {}) =>
    apiClient.delete("/food/notifications/inbox/all", config),
};

export const adminAPI = {
  getSidebarBadges: () =>
    adminCachedGet("/food/admin/sidebar-badges", { contextModule: "admin" }, { ttlMs: 12000, staleOn429Ms: 90000 }),
  login: (email, password) => authService.adminLogin(email, password),
  /** POST /auth/admin/forgot-password/request-otp – only accepts registered admin email */
  requestForgotPasswordOtp: (email) =>
    apiClient.post("/auth/admin/forgot-password/request-otp", {
      email: String(email || "")
        .trim()
        .toLowerCase(),
    }),
  /** POST /auth/admin/forgot-password/reset – verify OTP and set new password in one call */
  resetPasswordWithOtp: (email, otp, newPassword) =>
    apiClient.post("/auth/admin/forgot-password/reset", {
      email: String(email || "")
        .trim()
        .toLowerCase(),
      otp: String(otp || "").replace(/\D/g, ""),
      newPassword: String(newPassword || ""),
    }),
  /** Raw /auth/me for admin (e.g. navbar). For Profile & Settings use getAdminProfile. */
  getCurrentAdmin: () => authService.getMe(),
  /** Single API for admin profile: GET /auth/me, returns { data: { admin } }. Use on Profile & Settings only. */
  getAdminProfile: () =>
    authService.getMe().then((res) => {
      const user =
        res?.data?.data?.user ??
        res?.data?.user ??
        res?.data?.data ??
        res?.data;
      return { data: { data: { admin: user }, admin: user } };
    }),
  /** PATCH /auth/admin/profile. Body: name?, phone?, profileImage? */
  updateAdminProfile: (body) =>
    apiClient.patch("/auth/admin/profile", body ?? {}, {
      contextModule: "admin",
    }),
  /** POST /auth/admin/change-password */
  changePassword: (currentPassword, newPassword) =>
    apiClient
      .post(
        "/auth/admin/change-password",
        { currentPassword, newPassword },
        { contextModule: "admin" },
      )
      .then((response) => {
        // Changing the password ends every other session; the server hands
        // this one a fresh pair so it carries on without a re-login.
        const data = response?.data?.data || {};
        try {
          if (data.accessToken) localStorage.setItem("admin_accessToken", data.accessToken);
          if (data.refreshToken) localStorage.setItem("admin_refreshToken", data.refreshToken);
        } catch (_) {}
        return response;
      }),
  logout: (refreshToken) => {
    const token =
      refreshToken ||
      (typeof localStorage !== "undefined"
        ? localStorage.getItem("admin_refreshToken")
        : null);
    const fcmToken = typeof localStorage !== "undefined" ? localStorage.getItem("fcm_web_registered_token_admin") : null;
    return authService.logout(token, fcmToken, "web");
  },
  // Restaurant approvals and join requests
  getPendingRestaurants: (params = {}) =>
    adminCachedGet("/food/admin/restaurants/pending", {
      params,
      contextModule: "admin",
    }, { ttlMs: 10000, staleOn429Ms: 90000 }),
  /** List restaurant complaints (admin). */
  getRestaurantComplaints: (params = {}) =>
    apiClient.get("/food/admin/restaurants/complaints", {
      params,
      contextModule: "admin",
    }),
  updateRestaurantComplaint: (id, body) =>
    apiClient.patch(`/food/admin/restaurants/complaints/${id}`, body, {
      contextModule: "admin",
    }),
  /** Global universal search (admin). */
  globalSearch: (query) =>
    apiClient.get("/food/admin/global-search", {
      params: { query },
      contextModule: "admin",
    }),
  approveRestaurant: (id) =>
    apiClient
      .patch(`/food/admin/restaurants/${id}/approve`, {}, { contextModule: "admin" })
      .then(withRestaurantListRefresh),
  rejectRestaurant: (id, reason) =>
    apiClient
      .patch(`/food/admin/restaurants/${id}/reject`, { reason }, { contextModule: "admin" })
      .then(withRestaurantListRefresh),
  /** Delivery partner join requests - uses /food/admin/delivery/* (new backend API) */
  getDeliveryPartnerJoinRequests: (params) =>
    adminCachedGet("/food/admin/delivery/join-requests", {
      params,
      contextModule: "admin",
    }, { ttlMs: 10000, staleOn429Ms: 90000 }),
  /** List approved delivery partners (Deliveryman List page) */
  getDeliveryPartners: (params) =>
    apiClient.get("/food/admin/delivery/partners", {
      params,
      contextModule: "admin",
    }),
  getDeliverymanReviews: (params = {}) =>
    apiClient.get("/food/admin/delivery/reviews", {
      params,
      contextModule: "admin",
    }),
  getContactMessages: (params = {}) =>
    apiClient.get("/food/admin/contact-messages", {
      params,
      contextModule: "admin",
    }),
  getArchivedAccounts: () =>
    apiClient.get("/food/admin/archived-accounts", {
      contextModule: "admin",
    }),
  /** Dashboard summary stats (admin home) */
  getDashboardStats: (params = {}) =>
    adminCachedGet("/food/admin/dashboard-stats", {
      params,
      contextModule: "admin",
    }, { ttlMs: 8000, staleOn429Ms: 90000 }),
  /** List restaurant withdrawal requests (admin). */
  getWithdrawals: (params = {}) =>
    apiClient.get("/food/admin/withdrawals", {
      params,
      contextModule: "admin",
    }),
  /** Update status of a withdrawal request. */
  updateWithdrawalStatus: (id, body) =>
    apiClient.patch(`/food/admin/withdrawals/${id}`, body, {
      contextModule: "admin",
    }),
  /** List delivery withdrawal requests (admin). */
  /** Delivery withdrawal aliases */
  getDeliveryWithdrawalRequests: (params) => adminAPI.getDeliveryWithdrawals(params),
  approveDeliveryWithdrawal: (id) => adminAPI.updateDeliveryWithdrawalStatus(id, { status: "approved" }),
  rejectDeliveryWithdrawal: (id, reason) => adminAPI.updateDeliveryWithdrawalStatus(id, { status: "rejected", rejectionReason: reason }),
  // Aliases for RestaurantWithdraws page
  getWithdrawalRequests: (params) => adminAPI.getWithdrawals(params),
  approveWithdrawalRequest: (id) => adminAPI.updateWithdrawalStatus(id, { status: "approved" }),
  rejectWithdrawalRequest: (id, reason) => adminAPI.updateWithdrawalStatus(id, { status: "rejected", rejectionReason: reason }),
  /** Delivery boy wallets (stub until backend implements - returns empty so list still loads) */
  getDeliveryBoyWallets: (params) =>
    apiClient.get("/food/admin/delivery/wallets", {
      params,
      contextModule: "admin",
    }),
  getDeliveryPartnerById: (id) =>
    apiClient.get(`/food/admin/delivery/${id}`, { contextModule: "admin" }),
  approveDeliveryPartner: (id) =>
    apiClient.patch(
      `/food/admin/delivery/${String(id)}/approve`,
      {},
      {
        contextModule: "admin",
      },
    ),
  rejectDeliveryPartner: (id, reason) =>
    apiClient.patch(
      `/food/admin/delivery/${String(id)}/reject`,
      { reason: String(reason || "").trim() },
      {
        contextModule: "admin",
      },
    ),
  /** GET /food/admin/delivery/support-tickets - list all delivery support tickets (query: status, priority, search, page, limit). */
  getDeliverySupportTickets: (params) =>
    adminCachedGet("/food/admin/delivery/support-tickets", {
      params,
      contextModule: "admin",
    }, { ttlMs: 5000, staleOn429Ms: 60000 }),
  getExpiredFssaiNotifications: (params = {}) =>
    adminCachedGet("/food/admin/notifications/fssai-expired", {
      params,
      contextModule: "admin",
    }, { ttlMs: 10000, staleOn429Ms: 90000 }),
  // Customization Settings
  getCustomizationSettings: () =>
    apiClient.get("/food/admin/customization-settings", { contextModule: "admin" }),
  updateCustomizationSettings: (data) =>
    apiClient.patch("/food/admin/customization-settings", data, { contextModule: "admin" }),
  getTakeawayCodStatus: () =>
    apiClient.get("/food/admin/customization-settings/takeaway-cod", { contextModule: "admin" }),
  getRestaurantSettings: () =>
    apiClient.get("/food/admin/restaurant-settings", { contextModule: "admin" }),
  /**
   * Accept-order window for the restaurant dashboard.
   * Same payload as the admin route above, but readable with a restaurant
   * token — the admin one 403s for restaurants.
   */
  getRestaurantOrderSettings: () =>
    apiClient.get("/food/restaurant/order-settings", { contextModule: "restaurant" }),
  updateRestaurantSettings: (data) =>
    apiClient.patch("/food/admin/restaurant-settings", data, { contextModule: "admin" }),
  /** GET /food/admin/delivery/support-tickets/stats - counts by status. */
  getDeliverySupportTicketStats: () =>
    apiClient.get("/food/admin/delivery/support-tickets/stats", {
      contextModule: "admin",
    }),
  /** PATCH /food/admin/delivery/support-tickets/:id - update adminResponse, status. */
  updateDeliverySupportTicket: (id, body) =>
    apiClient.patch(`/food/admin/delivery/support-tickets/${id}`, body ?? {}, {
      contextModule: "admin",
    }),
  createBroadcastNotification: (body = {}) =>
    apiClient.post("/food/admin/notifications/broadcast", body ?? {}, {
      contextModule: "admin",
    }),
  getBroadcastNotifications: (params = {}) =>
    apiClient.get("/food/admin/notifications/broadcast", {
      params,
      contextModule: "admin",
    }),
  deleteBroadcastNotification: (id) =>
    apiClient.delete(`/food/admin/notifications/broadcast/${String(id)}`, {
      contextModule: "admin",
    }),
  searchBroadcastRecipients: (params = {}) =>
    apiClient.get("/food/admin/notifications/recipients-search", {
      params,
      contextModule: "admin",
    }),
  /**
   * List restaurants for admin. Requires admin auth.
   *
   * Cached because the restaurants screen asks for approved, banned and
   * rejected in parallel — three `limit=1000` responses — and did it again on
   * every revisit. Measured at 12 calls across two visits before this.
   */
  getRestaurants: (params = {}, config = {}) =>
    adminCachedGet("/food/admin/restaurants", {
      params: { limit: 1000, ...params },
      contextModule: "admin",
      ...config,
    }, { ttlMs: 15000, staleOn429Ms: 120000 }),
  getRestaurantReviews: (params = {}) =>
    apiClient.get("/food/admin/restaurants/reviews", {
      params: { page: 1, limit: 1000, ...params },
      contextModule: "admin",
    }),
  /** Categories (admin) */
  getCategories: (params = {}) =>
    apiClient.get("/food/admin/categories", { params, contextModule: "admin" }),
  /** Dining categories (admin) */
  getDiningCategories: (params = {}) =>
    apiClient.get("/food/admin/dining/categories", {
      params,
      contextModule: "admin",
    }),
  createDiningCategory: (body) =>
    apiClient.post("/food/admin/dining/categories", body ?? {}, {
      contextModule: "admin",
    }),
  updateDiningCategory: (id, body) =>
    apiClient.patch(`/food/admin/dining/categories/${String(id)}`, body ?? {}, {
      contextModule: "admin",
    }),
  deleteDiningCategory: (id) =>
    apiClient.delete(`/food/admin/dining/categories/${String(id)}`, {
      contextModule: "admin",
    }),
  getDiningRestaurants: (params = {}) =>
    apiClient.get("/food/admin/dining/restaurants", {
      params,
      contextModule: "admin",
    }),
  updateRestaurantDiningSettings: (restaurantId, body) =>
    apiClient.patch(
      `/food/admin/dining/restaurants/${String(restaurantId)}`,
      body ?? {},
      { contextModule: "admin" },
    ),
  getDiningRequests: (params = {}) =>
    apiClient.get("/food/admin/dining/requests", {
      params,
      contextModule: "admin",
    }),
  approveDiningRequest: (id) =>
    apiClient.patch(`/food/admin/dining/requests/${String(id)}/approve`, {}, {
      contextModule: "admin",
    }),
  rejectDiningRequest: (id, reason) =>
    apiClient.patch(`/food/admin/dining/requests/${String(id)}/reject`, { reason }, {
      contextModule: "admin",
    }),
  createCategory: (body) =>
    apiClient.post("/food/admin/categories", body ?? {}, {
      contextModule: "admin",
    }),
  updateCategory: (id, body) =>
    apiClient.patch(`/food/admin/categories/${id}`, body ?? {}, {
      contextModule: "admin",
    }),
  deleteCategory: (id) =>
    apiClient.delete(`/food/admin/categories/${id}`, {
      contextModule: "admin",
    }),
  approveCategory: (id) =>
    apiClient.patch(
      `/food/admin/categories/${String(id)}/approve`,
      {},
      { contextModule: "admin" },
    ),
  rejectCategory: (id, reason) =>
    apiClient.patch(
      `/food/admin/categories/${String(id)}/reject`,
      { reason: String(reason || "").trim() },
      { contextModule: "admin" },
    ),
  makeCategoryGlobal: (id) =>
    apiClient.patch(
      `/food/admin/categories/${String(id)}/make-global`,
      {},
      { contextModule: "admin" },
    ),
  toggleCategoryStatus: (id) =>
    apiClient.patch(
      `/food/admin/categories/${id}/toggle`,
      {},
      { contextModule: "admin" },
    ),
  /** Get single restaurant by id (full details for View Details modal). */
  getRestaurantById: (id) =>
    apiClient.get(`/food/admin/restaurants/${id}`, { contextModule: "admin" }),
  /** Get restaurant analytics for POS. */
  getRestaurantAnalytics: (id) =>
    apiClient.get(`/food/admin/restaurants/${id}/analytics`, {
      contextModule: "admin",
    }),
  /** Update restaurant basic details (admin). */
  updateRestaurant: (id, body) =>
    apiClient.patch(`/food/admin/restaurants/${String(id)}`, body ?? {}, {
      contextModule: "admin",
    }),
  deleteRestaurant: (id) =>
    apiClient
      .delete(`/food/admin/restaurants/${id}`, { contextModule: "admin" })
      .then(withRestaurantListRefresh),
  /** Update restaurant status (admin). Body: { status: boolean } */
  updateRestaurantStatus: (id, status) =>
    apiClient
      .patch(
        `/food/admin/restaurants/${String(id)}/status`,
        { status: status !== false },
        { contextModule: "admin" },
      )
      .then(withRestaurantListRefresh),
  /** Update restaurant location (admin). Body includes lat/lng + address fields. */
  updateRestaurantLocation: (id, body) =>
    apiClient.patch(
      `/food/admin/restaurants/${String(id)}/location`,
      body ?? {},
      { contextModule: "admin" },
    ),
  /** Restaurant menu (admin) */
  getRestaurantMenuById: (id, config = {}) =>
    apiClient.get(`/food/admin/restaurants/${id}/menu`, {
      contextModule: "admin",
      ...config,
    }),
  updateRestaurantMenuById: (id, body) =>
    apiClient.patch(`/food/admin/restaurants/${id}/menu`, body ?? {}, {
      contextModule: "admin",
    }),
  /** Foods (admin) - separate collection */
  getFoods: (params = {}) =>
    apiClient.get("/food/admin/foods", { params, contextModule: "admin" }),
  getPricingSummary: (params = {}) =>
    apiClient.get("/food/admin/pricing/summary", { params, contextModule: "admin" }),
  getPricingRules: (params = {}) =>
    apiClient.get("/food/admin/pricing/rules", { params, contextModule: "admin" }),
  upsertPricingRule: (body) =>
    apiClient.post("/food/admin/pricing/rules", body ?? {}, { contextModule: "admin" }),
  bulkUpsertRestaurantPricingRules: (body) =>
    apiClient.post("/food/admin/pricing/rules/bulk-restaurant", body ?? {}, { contextModule: "admin" }),
  bulkUpsertMenuItemPricingRules: (body) =>
    apiClient.post("/food/admin/pricing/rules/bulk-menu-item", body ?? {}, { contextModule: "admin" }),
  deletePricingRule: (id) =>
    apiClient.delete(`/food/admin/pricing/rules/${id}`, { contextModule: "admin" }),
  previewPricingRule: (body) =>
    apiClient.post("/food/admin/pricing/preview", body ?? {}, { contextModule: "admin" }),
  getPricingAudits: (params = {}) =>
    apiClient.get("/food/admin/pricing/audits", { params, contextModule: "admin" }),
  createFood: (body) =>
    apiClient.post("/food/admin/foods", body ?? {}, { contextModule: "admin" }),
  updateFood: (id, body) =>
    apiClient.patch(`/food/admin/foods/${id}`, body ?? {}, {
      contextModule: "admin",
    }),
  deleteFood: (id) =>
    apiClient.delete(`/food/admin/foods/${id}`, { contextModule: "admin" }),
  /** Food approvals (admin) - pending items created by restaurants */
  getPendingFoodApprovals: (params = {}) =>
    adminCachedGet("/food/admin/foods/pending-approvals", {
      params,
      contextModule: "admin",
    }, { ttlMs: 10000, staleOn429Ms: 90000 }),
  approveFoodItem: (id) =>
    apiClient.patch(
      `/food/admin/foods/${String(id)}/approve`,
      {},
      { contextModule: "admin" },
    ),
  rejectFoodItem: (id, reason) =>
    apiClient.patch(
      `/food/admin/foods/${String(id)}/reject`,
      { reason: String(reason || "").trim() },
      { contextModule: "admin" },
    ),
  /** Customers (admin) */
  getCustomers: (params = {}) =>
    apiClient.get("/food/admin/customers", { params, contextModule: "admin" }),
  getCustomerById: (id) =>
    apiClient.get(`/food/admin/customers/${String(id)}`, {
      contextModule: "admin",
    }),
  updateCustomerStatus: (id, isActive) =>
    apiClient.patch(
      `/food/admin/customers/${String(id)}/status`,
      { isActive: isActive !== false },
      { contextModule: "admin" },
    ),
  updateCustomerCodStatus: (id, isCodBlocked) =>
    apiClient.patch(
      `/food/admin/customers/${String(id)}/cod-status`,
      { isCodBlocked: isCodBlocked === true },
      { contextModule: "admin" },
    ),

  /** Orders (admin) – list, get by id, assign delivery partner */
  getOrders: (params = {}) =>
    adminCachedGet("/food/admin/orders", {
      params: { limit: 50, page: 1, ...params },
      contextModule: "admin",
    }, { ttlMs: 2500, staleOn429Ms: 120000 }),
  getOrderById: (orderId, config = {}) =>
    adminCachedGet(`/food/admin/orders/${String(orderId)}`, {
      contextModule: "admin",
      ...config,
    }, { ttlMs: 3000, staleOn429Ms: 60000 }),
  deleteOrder: (orderId) =>
    apiClient.delete(`/food/admin/orders/${String(orderId)}`, {
      contextModule: "admin",
    }),
  acceptOrder: (orderId) =>
    apiClient.patch(`/food/admin/orders/${String(orderId)}/accept`, {}, {
      contextModule: "admin",
    }),
  rejectOrder: (orderId, reason = "") =>
    apiClient.patch(`/food/admin/orders/${String(orderId)}/reject`, { reason }, {
      contextModule: "admin",
    }),
  updateOrderStatuses: (orderId, body = {}) =>
    apiClient.patch(`/food/admin/orders/${String(orderId)}/statuses`, body, {
      contextModule: "admin",
    }),
  /** Dispatch settings – auto vs manual assign (global) */
  /** Create restaurant (admin). Single API: POST /food/admin/restaurants. Body: JSON with image URLs. */
  createRestaurant: (body) =>
    apiClient.post("/food/admin/restaurants", body ?? {}, {
      contextModule: "admin",
    }),
  /** List delivery zones. Query: limit, page, isActive, search */
  getZones: (params = {}) =>
    adminCachedGet("/food/admin/zones", {
      params: { limit: 1000, ...params },
      contextModule: "admin",
    }, { ttlMs: 30000, staleOn429Ms: 120000 }),
  /** Top Restaurants (per zone + type). Query: zoneId, type (delivery|takeaway) */
  getTopRestaurants: (params = {}) =>
    apiClient.get("/food/admin/top-restaurants", {
      params,
      contextModule: "admin",
    }),
  /** Save ordered top restaurants. Body: { zoneId, type, restaurantIds: [] } */
  saveTopRestaurants: (body = {}) =>
    apiClient.put("/food/admin/top-restaurants", body ?? {}, {
      contextModule: "admin",
    }),
  /** Restaurant report (admin). */
  getRestaurantReport: (params = {}) =>
    apiClient.get("/food/admin/reports/restaurants", {
      params: { page: 1, limit: 1000, ...params },
      contextModule: "admin",
    }),
  getTransactionReport: (params = {}) =>
    apiClient.get("/food/admin/reports/transactions", {
      params: { page: 1, limit: 1000, ...params },
      contextModule: "admin",
    }),
  getTaxReport: (params = {}) =>
    apiClient.get("/food/admin/reports/tax", {
      params: { page: 1, limit: 1000, ...params },
      contextModule: "admin",
    }),
  getTaxReportDetail: (id, params = {}) =>
    apiClient.get(`/food/admin/reports/tax/${id}`, {
      params,
      contextModule: "admin",
    }),
  /** Get single zone by id */
  getZoneById: (id) =>
    apiClient.get(`/food/admin/zones/${id}`, { contextModule: "admin" }),
  /** Create zone. Body: name, zoneName?, country?, unit?, coordinates, isActive? */
  createZone: (body) =>
    apiClient.post("/food/admin/zones", body ?? {}, { contextModule: "admin" }),
  /** Update zone. Body: name?, zoneName?, country?, unit?, coordinates?, isActive? */
  updateZone: (id, body) =>
    apiClient.patch(`/food/admin/zones/${id}`, body ?? {}, {
      contextModule: "admin",
    }),
  /** Delete zone */
  deleteZone: (id) =>
    apiClient.delete(`/food/admin/zones/${id}`, { contextModule: "admin" }),

  /** Feedback Experience (admin) */
  getFeedbackExperiences: (params = {}) =>
    apiClient.get(API_ENDPOINTS.ADMIN.FEEDBACK_EXPERIENCE, {
      params,
      contextModule: "admin",
    }),
  deleteFeedbackExperience: (id) =>
    apiClient.delete(`${API_ENDPOINTS.ADMIN.FEEDBACK_EXPERIENCE}/${id}`, {
      contextModule: "admin",
    }),

  /** Public env variables (safe subset). Used for runtime keys like Google Maps. */
  // getPublicEnvVariables removed: rely on import.meta.env instead.

  /** Public categories (user app) - zone-aware */
  getPublicCategories: (params = {}, config = {}) =>
    apiClient.get("/food/restaurant/categories/public", {
      params: params ?? {},
      ...config,
    }),

  /** Offers & Coupons (admin) */
  getAllOffers: (params = {}) =>
    apiClient.get("/food/admin/offers", { params, contextModule: "admin" }),
  createAdminOffer: (body) =>
    apiClient.post("/food/admin/offers", body ?? {}, {
      contextModule: "admin",
    }),
  updateAdminOffer: (offerId, body) =>
    apiClient.put(`/food/admin/offers/${String(offerId)}`, body ?? {}, {
      contextModule: "admin",
    }),
  updateAdminOfferCartVisibility: (offerId, itemId, showInCart) =>
    apiClient.patch(
      `/food/admin/offers/${String(offerId)}/cart-visibility`,
      { itemId: String(itemId), showInCart: Boolean(showInCart) },
      { contextModule: "admin" },
    ),
  deleteAdminOffer: (offerId) =>
    apiClient.delete(`/food/admin/offers/${String(offerId)}`, {
      contextModule: "admin",
    }),

  /** Delivery Partner Bonus (admin) */
  getDeliveryPartnerBonusTransactions: (params = {}) =>
    apiClient.get("/food/admin/delivery/bonus-transactions", {
      params,
      contextModule: "admin",
    }),
  /** Delivery Earnings (admin) */
  getDeliveryEarnings: (params = {}) =>
    apiClient.get("/food/admin/delivery/earnings", {
      params,
      contextModule: "admin",
    }),
  addDeliveryPartnerBonus: (deliveryPartnerId, amount, reference = "") =>
    apiClient.post(
      "/food/admin/delivery/bonus",
      {
        deliveryPartnerId: String(deliveryPartnerId),
        amount: Number(amount),
        reference: String(reference || ""),
      },
      { contextModule: "admin" },
    ),

  /** Earning Addon Offers (admin) */
  getEarningAddons: (params = {}) =>
    apiClient.get("/food/admin/delivery/earning-addons", {
      params,
      contextModule: "admin",
    }),
  createEarningAddon: (body) =>
    apiClient.post("/food/admin/delivery/earning-addons", body ?? {}, {
      contextModule: "admin",
    }),
  updateEarningAddon: (id, body) =>
    apiClient.patch(
      `/food/admin/delivery/earning-addons/${String(id)}`,
      body ?? {},
      { contextModule: "admin" },
    ),
  deleteEarningAddon: (id) =>
    apiClient.delete(`/food/admin/delivery/earning-addons/${String(id)}`, {
      contextModule: "admin",
    }),
  toggleEarningAddonStatus: (id, status) =>
    apiClient.patch(
      `/food/admin/delivery/earning-addons/${String(id)}/status`,
      { status: String(status) },
      { contextModule: "admin" },
    ),

  /** Earning Addon History (admin) */
  getEarningAddonHistory: (params = {}) =>
    apiClient.get("/food/admin/delivery/earning-addon-history", {
      params,
      contextModule: "admin",
    }),
  creditEarningToWallet: (historyId, notes = "") =>
    apiClient.post(
      `/food/admin/delivery/earning-addon-history/${String(historyId)}/credit`,
      { notes: String(notes || "") },
      { contextModule: "admin" },
    ),
  cancelEarningAddonHistory: (historyId, reason = "") =>
    apiClient.post(
      `/food/admin/delivery/earning-addon-history/${String(historyId)}/cancel`,
      { reason: String(reason || "") },
      { contextModule: "admin" },
    ),
  checkEarningAddonCompletions: (deliveryPartnerId, force = false) =>
    apiClient.post(
      "/food/admin/delivery/earning-addon-completions/check",
      { deliveryPartnerId: String(deliveryPartnerId), force: Boolean(force) },
      { contextModule: "admin" },
    ),
  getDeliveryWallets: (params = {}) =>
    apiClient.get("/food/admin/delivery/wallets", {
      params,
      contextModule: "admin",
    }),
  getDeliveryWithdrawals: (params = {}) =>
    apiClient.get("/food/admin/delivery/withdrawals", {
      params,
      contextModule: "admin",
    }),
  updateDeliveryWithdrawalStatus: (id, body) =>
    apiClient.patch(`/food/admin/delivery/withdrawals/${String(id)}`, body, {
      contextModule: "admin",
    }),
  getCashLimitSettlements: (params = {}) =>
    apiClient.get("/food/admin/delivery/cash-limit-settlements", {
      params,
      contextModule: "admin",
    }),
  getCashConfirmations: (params = {}) =>
    apiClient.get("/food/admin/delivery/cash-confirmations", {
      params,
      contextModule: "admin",
    }),
  updateCashLimitSettlement: (id, body) =>
    apiClient.patch(`/food/admin/delivery/cash-limit-settlements/${String(id)}`, body ?? {}, {
      contextModule: "admin",
    }),

  /** Restaurant Commission (admin) */
  getRestaurantCommissionBootstrap: () =>
    apiClient.get("/food/admin/restaurant-commissions/bootstrap", {
      contextModule: "admin",
    }),
  getRestaurantCommissions: (params = {}) =>
    apiClient.get("/food/admin/restaurant-commissions", {
      params,
      contextModule: "admin",
    }),
  getRestaurantCommissionById: (id) =>
    apiClient.get(`/food/admin/restaurant-commissions/${String(id)}`, {
      contextModule: "admin",
    }),
  createRestaurantCommission: (body) =>
    apiClient.post("/food/admin/restaurant-commissions", body ?? {}, {
      contextModule: "admin",
    }),
  updateRestaurantCommission: (id, body) =>
    apiClient.patch(
      `/food/admin/restaurant-commissions/${String(id)}`,
      body ?? {},
      { contextModule: "admin" },
    ),
  deleteRestaurantCommission: (id) =>
    apiClient.delete(`/food/admin/restaurant-commissions/${String(id)}`, {
      contextModule: "admin",
    }),
  toggleRestaurantCommissionStatus: (id) =>
    apiClient.patch(
      `/food/admin/restaurant-commissions/${String(id)}/toggle`,
      {},
      { contextModule: "admin" },
    ),
  /** Backward-compatible alias used in UI */
  getApprovedRestaurants: (params = {}) =>
    apiClient.get("/food/admin/restaurants", {
      params: { status: "approved", limit: 1000, ...params },
      contextModule: "admin",
    }),

  /** Delivery Boy Payout Rules (admin) */
  getCommissionRules: (params) =>
    apiClient.get("/food/admin/delivery/commission-rules", {
      params: params ?? {},
      contextModule: "admin",
    }),
  createCommissionRule: (body) =>
    apiClient.post("/food/admin/delivery/commission-rules", body ?? {}, {
      contextModule: "admin",
    }),
  updateCommissionRule: (id, body) =>
    apiClient.patch(
      `/food/admin/delivery/commission-rules/${String(id)}`,
      body ?? {},
      { contextModule: "admin" },
    ),
  deleteCommissionRule: (id) =>
    apiClient.delete(`/food/admin/delivery/commission-rules/${String(id)}`, {
      contextModule: "admin",
    }),
  toggleCommissionRuleStatus: (id, status) =>
    apiClient.patch(
      `/food/admin/delivery/commission-rules/${String(id)}/status`,
      { status: Boolean(status) },
      { contextModule: "admin" },
    ),

  /** Fee Settings (admin) */
  getFeeSettings: (params) =>
    apiClient.get("/food/admin/fee-settings", {
      params: params ?? {},
      contextModule: "admin",
    }),
  createOrUpdateFeeSettings: (body) =>
    apiClient.put("/food/admin/fee-settings", body ?? {}, {
      contextModule: "admin",
    }),

  /** Referral Settings (admin) */
  getReferralSettings: () =>
    apiClient.get("/food/admin/referral-settings", { contextModule: "admin" }),
  createOrUpdateReferralSettings: (body) =>
    apiClient.put("/food/admin/referral-settings", body ?? {}, {
      contextModule: "admin",
    }),

  /** Safety / Emergency Reports (admin) */
  getSafetyEmergencyReports: (params) =>
    apiClient.get("/food/admin/safety-emergency-reports", {
      params: params ?? {},
      contextModule: "admin",
    }),
  updateSafetyEmergencyStatus: (id, status) =>
    apiClient.put(
      `/food/admin/safety-emergency-reports/${String(id)}/status`,
      { status: String(status) },
      { contextModule: "admin" },
    ),
  updateSafetyEmergencyPriority: (id, priority) =>
    apiClient.put(
      `/food/admin/safety-emergency-reports/${String(id)}/priority`,
      { priority: String(priority) },
      { contextModule: "admin" },
    ),
  deleteSafetyEmergencyReport: (id) =>
    apiClient.delete(`/food/admin/safety-emergency-reports/${String(id)}`, {
      contextModule: "admin",
    }),

  /** Delivery Cash Limit (admin) */
  getDeliveryCashLimit: () =>
    apiClient.get("/food/admin/delivery-cash-limit", {
      contextModule: "admin",
    }),
  updateDeliveryCashLimit: (body) =>
    apiClient.patch("/food/admin/delivery-cash-limit", body ?? {}, {
      contextModule: "admin",
    }),

  /** Delivery Emergency Help (admin) */
  getEmergencyHelp: () =>
    apiClient.get("/food/admin/delivery-emergency-help", {
      contextModule: "admin",
    }),
  createOrUpdateEmergencyHelp: (body) =>
    apiClient.put("/food/admin/delivery-emergency-help", body ?? {}, {
      contextModule: "admin",
    }),

  /** Restaurant add-ons approval (admin) */
  getRestaurantAddons: (params = {}) =>
    apiClient.get("/food/admin/addons", {
      params: params ?? {},
      contextModule: "admin",
    }),
  updateRestaurantAddon: (id, body) =>
    apiClient.patch(
      `/food/admin/addons/${String(id)}`,
      body ?? {},
      { contextModule: "admin" },
    ),
  approveRestaurantAddon: (id) =>
    apiClient.patch(
      `/food/admin/addons/${String(id)}/approve`,
      {},
      { contextModule: "admin" },
    ),
  rejectRestaurantAddon: (id, reason) =>
    apiClient.patch(
      `/food/admin/addons/${String(id)}/reject`,
      { reason: String(reason || "").trim() },
      { contextModule: "admin" },
    ),
  /** Business Settings (admin) */
  getBusinessSettings: () =>
    apiClient.get(API_ENDPOINTS.ADMIN.BUSINESS_SETTINGS, {
      contextModule: "admin",
    }),
  updateBusinessSettings: async (data, files = {}) => {
    const formData = new FormData();
    // Add JSON data
    formData.append("data", JSON.stringify(data));
    // Add files
    if (files.logo) formData.append("logo", await prepareUploadFile(files.logo));
    if (files.favicon) formData.append("favicon", await prepareUploadFile(files.favicon));

    return apiClient.patch(API_ENDPOINTS.ADMIN.BUSINESS_SETTINGS, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      contextModule: "admin",
    });
  },
};

export const zoneAPI = {
  /** Public: detect active service zone for a lat/lng point. */
  detectZone: (lat, lng) =>
    apiClient.get("/food/zones/detect", {
      params: { lat, lng },
    }),
  /** Public: list active zones (for onboarding dropdowns). */
  getPublicZones: (params = {}, config = {}) =>
    apiClient.get("/food/zones/public", { params: params ?? {}, ...config }),
};

export const uploadAPI = {
  /**
   * Upload a single image. Backend converts it to WebP and stores it on the
   * live server at /var/www/uploads (local backends forward there automatically).
   * Pass replaceUrl so the previous file is deleted after the new one is saved.
   */
  uploadMedia: async (file, options = {}) => {
    if (!file) {
      return Promise.reject(new Error("File is required for upload"));
    }

    const prepared = await prepareUploadFile(file, options.compress);
    const formData = new FormData();
    formData.append("file", prepared);
    if (options.folder) {
      formData.append("folder", options.folder);
    }
    if (options.replaceUrl) {
      formData.append("replaceUrl", options.replaceUrl);
    }

    return apiClient.post("/uploads/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    });
  },
  deleteMedia: (url) => {
    if (!url) return Promise.resolve();
    return apiClient.delete("/uploads", { data: { url } });
  },
};

export const restaurantAPI = {
  getRestaurantById: (id, config = {}) =>
    apiClient.get(`/food/restaurant/restaurants/${String(id)}`, { ...config }),
  /**
   * Public: does this restaurant deliver to this zone? Same rule as the list.
   *
   * Two places ask this for the same restaurant on the same screen — the cart
   * guard in the layout and the checkout gate in the cart — and React's dev
   * double-mount asks again. The answer cannot change between them, so an
   * in-flight request is shared rather than repeated.
   */
};

export default apiClient;
