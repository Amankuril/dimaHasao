import { Redirect } from 'expo-router';

// Web: <Route path="/" element={<Navigate to="food" replace />} /> inside the admin router.
export default function AdminIndexRedirect() {
  return <Redirect href="/admin/food" />;
}
