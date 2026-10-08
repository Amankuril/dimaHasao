import { Redirect } from 'expo-router';

// Web: <Route path="*" element={<Navigate to="/global/admin" replace />} /> in Global/routes.jsx.
export default function GlobalCatchAll() {
  return <Redirect href="/global/admin" />;
}
