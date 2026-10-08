import { Redirect } from 'expo-router';

// Web: an unknown /global/admin/* path falls through to the router's "*" -> /global/admin.
export default function GlobalAdminCatchAll() {
  return <Redirect href="/global/admin" />;
}
