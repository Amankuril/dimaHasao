import { Redirect, useLocalSearchParams } from 'expo-router';

// Web: /app/food/orders/:id -> the food module's order tracking.
export default function FoodOrder() {
  const { id } = useLocalSearchParams();
  return <Redirect href={`/food/user/orders/${id}`} />;
}
