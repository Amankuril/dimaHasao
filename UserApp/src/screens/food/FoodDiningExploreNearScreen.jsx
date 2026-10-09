/**
 * Frontend's DiningExploreNear.jsx never calls the dining API either —
 * same hardcoded Indore demo array as DiningExplore50.jsx. See
 * DiningBrowseScreen's header comment.
 */
import React, {useCallback} from 'react';
import DiningBrowseScreen from '../../components/food/DiningBrowseScreen';

export default function FoodDiningExploreNearScreen() {
  const sortByDistanceThenRating = useCallback((a, b) => {
    const distDiff = (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    return distDiff !== 0 ? distDiff : b.rating - a.rating;
  }, []);
  return <DiningBrowseScreen title="Near & Top Rated" sortFn={sortByDistanceThenRating} emptyLabel="No nearby restaurants found" />;
}
