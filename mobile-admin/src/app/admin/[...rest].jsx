import { Redirect } from 'expo-router';

// Web: <Route path="*" element={<Navigate to="/admin/food" replace />} /> in the admin router.
export default function AdminCatchAll() {
  return <Redirect href="/admin/food" />;
}
