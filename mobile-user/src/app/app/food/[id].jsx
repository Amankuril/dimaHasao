import { Redirect } from 'expo-router';

// Web: v1 addressed restaurants by id; the module uses slugs, so this lands on the list.
export default function FoodRestaurant() {
  return <Redirect href="/food/user" />;
}
