import apiClient from '../../../services/api/axios';
import { normalizeImageUrl } from '../../Food/utils/common';

// Maps the Hello-Parth food API onto the shapes the approved v1 screens already
// consume (see data/foodData.js), so no screen needs to change.

const asArray = (value) => (Array.isArray(value) ? value : []);

const unwrap = (res, key) => {
  const body = res?.data?.data ?? res?.data ?? {};
  return key ? body?.[key] : body;
};

// Image fields come back either as a plain URL or as { url }.
const toImageUrl = (value) => {
  const raw = typeof value === 'string' ? value : value?.url || '';
  return raw ? normalizeImageUrl(raw) : '';
};

export const adaptRestaurant = (r = {}) => {
  const loc = r.location || {};
  const deliveryMinutes = r.estimatedDeliveryTimeMinutes;
  const hero =
    toImageUrl(asArray(r.coverImages)[0]) ||
    toImageUrl(r.image) ||
    toImageUrl(r.profileImage) ||
    toImageUrl(asArray(r.images)[0]);

  return {
    id: String(r._id || r.id || ''),
    name: r.restaurantName || r.name || 'Restaurant',
    slug: r.slug || undefined,
    cuisine: asArray(r.cuisines),
    rating: Number(r.rating) || 0,
    reviewCount: Number(r.totalRatings) || 0,
    deliveryTime:
      r.estimatedDeliveryTime ||
      (Number.isFinite(Number(deliveryMinutes)) ? `${deliveryMinutes} min` : '—'),
    minOrder: Number(r.minOrderAmount) || 0,
    priceForTwo: Number(r.featuredPrice) || 0,
    address:
      [loc.area || r.area, loc.city || r.city].filter(Boolean).join(', ') ||
      loc.formattedAddress ||
      loc.address ||
      '',
    isOpen: r.isAcceptingOrders !== false,
    isVegOnly: r.pureVegRestaurant === true,
    heroImage: hero,
    offer: r.offer || '',
    distanceInKm: r.distanceInKm ?? null,
    categories: [],
    menu: [],
  };
};

export const adaptMenuItem = (item = {}) => ({
  id: String(item.id || item._id || ''),
  name: item.name || '',
  category: item.category || item.categoryName || 'Menu',
  price: Number(item.price) || 0,
  isVeg: String(item.foodType || '').toLowerCase() === 'veg',
  isSpicy: false,
  isBestseller: item.isRecommended === true,
  isAvailable: item.isAvailable !== false,
  description: item.description || '',
  image: toImageUrl(item.image),
  variants: asArray(item.variants),
});

// menu payload is { sections: [{ name, items: [] }], categories, recommendedDishes }
export const adaptMenu = (menu = {}) => {
  const sections = asArray(menu.sections);
  return {
    categories: sections.map((s) => s.name).filter(Boolean),
    menu: sections.flatMap((s) => asArray(s.items).map(adaptMenuItem)),
  };
};

export const fetchRestaurants = async (params = {}) => {
  const res = await apiClient.get('/food/restaurant/restaurants', { params });
  const body = unwrap(res);
  const list = asArray(body.restaurants ?? body.items ?? body.data ?? body);
  return list.map(adaptRestaurant);
};

export const fetchRestaurantWithMenu = async (id) => {
  const [listed, menuRes] = await Promise.all([
    apiClient
      .get(`/food/restaurant/restaurants/${id}`)
      .then((res) => unwrap(res, 'restaurant'))
      .catch(() => null),
    apiClient.get(`/food/restaurant/restaurants/${id}/menu`),
  ]);

  const base = adaptRestaurant(listed || { _id: id });
  return { ...base, ...adaptMenu(unwrap(menuRes, 'menu')) };
};

export const calculateOrder = async (payload) =>
  unwrap(await apiClient.post('/food/orders/calculate', payload));

export const placeOrder = async (payload) =>
  unwrap(await apiClient.post('/food/orders', payload));

const ORDER_STATUS = {
  pending: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  picked_up: 'On the way',
  out_for_delivery: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const orderTime = (value) => {
  if (!value) return '';
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return '';

  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  const time = then.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (days <= 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  return `${then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
};

/** Backend order → the card the v1 bookings screen renders. */
export const adaptOrder = (order = {}) => {
  const restaurant =
    order.restaurantId && typeof order.restaurantId === 'object' ? order.restaurantId : {};

  return {
    id: order.orderNumber || order.orderId || String(order._id || ''),
    orderRef: String(order._id || ''),
    restaurantId: String(restaurant._id || order.restaurantId || ''),
    restaurantName: restaurant.restaurantName || restaurant.name || order.restaurantName || 'Restaurant',
    items: asArray(order.items).map((item) => ({
      id: String(item._id || item.itemId || ''),
      name: item.name || item.itemName || 'Item',
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
    })),
    subtotal: Number(order.subtotal ?? order.itemsTotal) || 0,
    deliveryFee: Number(order.deliveryFee) || 0,
    gst: Number(order.taxAmount ?? order.gst) || 0,
    totalAmount: Number(order.totalAmount ?? order.grandTotal) || 0,
    deliveryAddress:
      order.deliveryAddress?.fullAddress || order.deliveryAddress?.address || '',
    status: ORDER_STATUS[order.orderStatus ?? order.status] || order.orderStatus || order.status || 'Placed',
    orderTime: orderTime(order.createdAt),
  };
};

export const fetchMyOrders = async () => {
  const body = unwrap(await apiClient.get('/food/orders'));
  return asArray(body.orders ?? body.items ?? body).map(adaptOrder);
};

export const fetchOrderById = async (orderId) =>
  unwrap(await apiClient.get(`/food/orders/${orderId}`), 'order');
