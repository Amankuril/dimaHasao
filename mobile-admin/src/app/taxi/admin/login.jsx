import { Redirect } from 'expo-router';

// Web: <Route path="admin/login" element={<Navigate to="/admin/login" replace />} />
export default function TaxiAdminLogin() {
  return <Redirect href="/admin/login" />;
}
