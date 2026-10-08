import { Redirect } from 'expo-router';

// Web: an unknown /tours/admin/* path falls through to the router's "*" -> /tours/admin.
export default function ToursAdminCatchAll() {
  return <Redirect href="/tours/admin" />;
}
