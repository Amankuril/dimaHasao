import { Redirect } from 'expo-router';

// Web: /app/food/cart -> the food module's cart.
export default function FoodCart() {
  return <Redirect href="/food/user/cart" />;
}
