/**
 * Ported from the restaurant-normalization logic shared by
 * Frontend/src/modules/Food/pages/user/Dining.jsx, DiningCategory.jsx,
 * DiningExplore50.jsx and DiningExploreNear.jsx — on web those last two
 * never actually call this logic (see FoodDiningExplore50Screen's header
 * comment), but the real Dining.jsx/DiningCategory.jsx version of it is
 * ported verbatim here once and shared by every dining list screen in
 * this app, rather than copied per screen the way the web source copies
 * its restaurant-card JSX across files.
 */
import {normalizeImageUrl} from './imageUrl';
import {slugify} from './foodCommon';

export const getDiningDistanceKm = (userLocation, restaurant) => {
  const userLat = Number(userLocation?.latitude);
  const userLng = Number(userLocation?.longitude);
  const coords = restaurant?.location?.coordinates;
  const restaurantLat = Array.isArray(coords) ? coords[1] : restaurant?.location?.latitude;
  const restaurantLng = Array.isArray(coords) ? coords[0] : restaurant?.location?.longitude;

  if (!Number.isFinite(userLat) || !Number.isFinite(userLng) || !Number.isFinite(Number(restaurantLat)) || !Number.isFinite(Number(restaurantLng))) {
    return Number.POSITIVE_INFINITY;
  }

  const toRad = v => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(Number(restaurantLat) - userLat);
  const dLng = toRad(Number(restaurantLng) - userLng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(userLat)) * Math.cos(toRad(Number(restaurantLat))) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatAddress = restaurant =>
  restaurant?.location?.addressLine1 ||
  restaurant?.location?.formattedAddress ||
  restaurant?.location?.address ||
  [restaurant?.location?.area || restaurant?.area, restaurant?.location?.city || restaurant?.city].filter(Boolean).join(', ') ||
  'Address unavailable';

export const normalizeDiningRestaurant = (restaurant, userLocation) => {
  const name = String(restaurant?.restaurantName || restaurant?.name || '').trim();
  const distanceKm = getDiningDistanceKm(userLocation, restaurant);
  const rawType = restaurant?.diningSettings?.diningType;
  let types = [];
  if (Array.isArray(rawType)) types = rawType;
  else if (typeof rawType === 'string' && rawType.trim()) types = rawType.split(',');
  else if (Array.isArray(restaurant?.categories)) types = restaurant.categories.map(c => (typeof c === 'string' ? c : c?.slug || c?.name));
  const uniqueTypes = Array.from(new Set(types.map(t => slugify(t)).filter(Boolean)));

  return {
    ...restaurant,
    id: restaurant?._id || restaurant?.id,
    mongoId: restaurant?._id,
    name,
    slug: String(restaurant?.restaurantNameNormalized || '').trim() || slugify(name),
    address: formatAddress(restaurant),
    cuisine: Array.isArray(restaurant?.cuisines) && restaurant.cuisines.length > 0 ? restaurant.cuisines.join(', ') : 'Multi-cuisine',
    image: normalizeImageUrl(
      restaurant?.coverImages?.[0]?.url || restaurant?.coverImages?.[0] || restaurant?.coverImage || restaurant?.menuImages?.[0]?.url || restaurant?.menuImages?.[0] || restaurant?.profileImage?.url || restaurant?.profileImage || '',
    ),
    offer: String(restaurant?.offer || 'Pre-book table').trim(),
    featuredDish: String(restaurant?.featuredDish || "Chef's special").trim(),
    featuredPrice: Number(restaurant?.featuredPrice || 0),
    rating: Number(restaurant?.rating || restaurant?.avgRating || 0),
    costForTwo: restaurant?.costForTwo ? `₹${restaurant.costForTwo} for two` : null,
    distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
    isEnabled: restaurant?.diningSettings?.isEnabled !== false,
    diningType: uniqueTypes[0] || 'family-dining',
  };
};

export const normalizeDiningRestaurantList = (restaurants, userLocation) =>
  (Array.isArray(restaurants) ? restaurants : [])
    .filter(r => String(r?.restaurantName || r?.name || '').trim().length > 0)
    .map(r => normalizeDiningRestaurant(r, userLocation));
