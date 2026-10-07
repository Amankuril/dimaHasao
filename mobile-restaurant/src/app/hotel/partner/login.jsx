import { Redirect } from 'expo-router';

// Web (Hotel/routes.jsx): partner/login -> /food/restaurant/login. One sign-in serves both
// businesses, and the partner app deep-links to this path.
export default function HotelPartnerLogin() {
  return <Redirect href="/food/restaurant/login" />;
}
