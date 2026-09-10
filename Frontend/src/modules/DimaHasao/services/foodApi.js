import apiClient from '../../../services/api/axios';
import { normalizeImageUrl } from '../../Food/utils/common';

// Maps the Hello-Parth food API onto the shapes the approved v1 screens already
// consume (see data/foodData.js), so no screen needs to change.

const asArray = (value) => (Array.isArray(value) ? value : []);

const unwrap = (res, key) => {
  const body = res?.data?.data ?? res?.data ?? {};
  return key ? body?.[key] : body;
};

export const adaptRestaurant = (r = {}) => {
  const cover = asArray(r.coverImages)[0] || r.profileImage || '';
  const deliveryMinutes = r.estimatedDeliveryTimeMinutes;

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
    address: [r.area, r.city].filter(Boolean).join(', '),
    isOpen: r.isAcceptingOrders !== false,
    isVegOnly: r.pureVegRestaurant === true,
    heroImage: cover ? normalizeImageUrl(cover) : '',
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
  image: item.image ? normalizeImageUrl(item.image) : '',
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

export const fetchMyOrders = async () => {
  const body = unwrap(await apiClient.get('/food/orders'));
  return asArray(body.orders ?? body.items ?? body);
};

export const fetchOrderById = async (orderId) =>
  unwrap(await apiClient.get(`/food/orders/${orderId}`), 'order');
