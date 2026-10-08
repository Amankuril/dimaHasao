import { Redirect } from 'expo-router';

/* Web: <Route path="taxi/*" element={<Navigate to="/taxi/admin/dashboard" replace />} />. */
export default function Route() {
  return <Redirect href="/taxi/admin/dashboard" />;
}
