import React, {useCallback} from 'react';
import DiningBrowseScreen from '../../components/food/DiningBrowseScreen';

export default function FoodDiningScreen() {
  const sortByDistance = useCallback((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity), []);
  return <DiningBrowseScreen title="Dining" showCategories sortFn={sortByDistance} emptyLabel="No dining restaurants found near you" />;
}
