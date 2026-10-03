/**
 * Frontend's DiningExplore50.jsx never calls the dining API — it renders
 * a hardcoded demo array of fake "IRIS"/"Skyline Rooftop" Indore
 * restaurants (see DiningBrowseScreen's header comment for how this was
 * confirmed and why every dining browse variant shares one real,
 * backend-driven screen instead).
 */
import React, {useCallback} from 'react';
import DiningBrowseScreen from '../../components/food/DiningBrowseScreen';

const hasDiscount = restaurant => /\d/.test(restaurant.offer || '');

export default function FoodDiningExplore50Screen() {
  const filterByOffer = useCallback(hasDiscount, []);
  const sortByRating = useCallback((a, b) => b.rating - a.rating, []);
  return <DiningBrowseScreen title="Up to 50% Off" filterFn={filterByOffer} sortFn={sortByRating} emptyLabel="No discounted restaurants right now" />;
}
