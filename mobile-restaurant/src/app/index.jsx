import { Redirect } from 'expo-router';

// The wrapper opened https://tourismdimahasao.in/food/restaurant; so does the app.
export default function Index() {
  return <Redirect href="/food/restaurant" />;
}
