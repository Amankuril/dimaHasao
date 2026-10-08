import { Redirect } from 'expo-router';

// Web: <Route index element={<Navigate to="/taxi/admin/dashboard" />} />
export default function TaxiAdminIndex() {
  return <Redirect href="/taxi/admin/dashboard" />;
}
