/**
 * Ported verbatim from Frontend/src/modules/Food/utils/restaurantBrowseSort.js.
 */
import {getRestaurantAvailabilityStatus} from './restaurantAvailability';

const TOP_ORDER_FALLBACK = 1_000_000;

const resolveTopOrder = restaurant => {
  const raw = restaurant?.__topOrder ?? restaurant?.topOrder;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : TOP_ORDER_FALLBACK;
};

const resolveDistanceKm = restaurant => {
  const raw = restaurant?.distanceInKm ?? restaurant?.distanceScore;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
};

export const compareRestaurantsByAvailabilityAndDistance = (left, right, {now = new Date()} = {}) => {
  const leftOpen = getRestaurantAvailabilityStatus(left, now)?.isOpen ? 1 : 0;
  const rightOpen = getRestaurantAvailabilityStatus(right, now)?.isOpen ? 1 : 0;
  if (leftOpen !== rightOpen) return rightOpen - leftOpen;

  const leftTop = resolveTopOrder(left);
  const rightTop = resolveTopOrder(right);
  if (leftTop !== rightTop) return leftTop - rightTop;

  const leftDist = resolveDistanceKm(left);
  const rightDist = resolveDistanceKm(right);
  const leftHasDist = leftDist != null;
  const rightHasDist = rightDist != null;
  if (leftHasDist && rightHasDist && leftDist !== rightDist) return leftDist - rightDist;
  if (leftHasDist !== rightHasDist) return leftHasDist ? -1 : 1;

  return 0;
};

export const sortRestaurantsByAvailabilityAndDistance = (restaurants = [], options = {}) =>
  [...(Array.isArray(restaurants) ? restaurants : [])].sort((a, b) => compareRestaurantsByAvailabilityAndDistance(a, b, options));
