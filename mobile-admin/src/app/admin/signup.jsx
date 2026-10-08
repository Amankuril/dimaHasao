import { Redirect } from 'expo-router';

// Web: <Route path="signup" element={<Navigate to="/admin/login" replace />} />
export default function AdminSignupRedirect() {
  return <Redirect href="/admin/login" />;
}
