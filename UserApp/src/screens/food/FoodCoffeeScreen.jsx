/**
 * Frontend's Coffee.jsx is also fully hardcoded demo data — a
 * "Starbucks, Indore" / "Cafe Coffee Day, Indore" array with zero API
 * calls. This screen is the real thing: dining restaurants whose cuisine
 * actually mentions coffee or cafe. See DiningBrowseScreen's header
 * comment for the full reasoning across all five dining browse screens.
 */
import React, {useCallback} from 'react';
import DiningBrowseScreen from '../../components/food/DiningBrowseScreen';

const isCafe = restaurant => /coffee|cafe|café/i.test(restaurant.cuisine || '');

export default function FoodCoffeeScreen() {
  const filterByCafe = useCallback(isCafe, []);
  return <DiningBrowseScreen title="Coffee & Cafes" filterFn={filterByCafe} emptyLabel="No cafes found nearby" />;
}
