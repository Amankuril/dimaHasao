import { Redirect } from 'expo-router';

// Web: <Route path="masters/roles" element={<Navigate to="/admin/management/admins" replace />} />
export default function MastersRolesRoute() {
  return <Redirect href="/taxi/admin/management/admins" />;
}
