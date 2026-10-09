import React, {useCallback} from 'react';
import {useRoute} from '@react-navigation/native';
import DiningBrowseScreen from '../../components/food/DiningBrowseScreen';
import {slugify} from '../../utils/foodCommon';

export default function FoodDiningCategoryScreen() {
  const route = useRoute();
  const categorySlug = slugify(route.params?.categorySlug || '');
  const categoryName = route.params?.categoryName || 'Category';

  const filterByCategory = useCallback(restaurant => restaurant.diningType === categorySlug, [categorySlug]);

  return <DiningBrowseScreen title={categoryName} filterFn={filterByCategory} emptyLabel={`No ${categoryName} restaurants found`} />;
}
