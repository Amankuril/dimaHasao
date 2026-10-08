import { Redirect } from 'expo-router';

// Web: <Route path="taxi/*" element={<Navigate to="/taxi/admin/dashboard" replace />} />
export default function AdminTaxiRedirect() {
  return <Redirect href="/taxi/admin/dashboard" />;
}
