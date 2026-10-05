import { Redirect } from 'expo-router';

// Web: /app/food -> the food module.
export default function Food() {
  return <Redirect href="/food/user" />;
}
