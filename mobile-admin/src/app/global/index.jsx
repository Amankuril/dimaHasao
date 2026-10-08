import { Redirect } from 'expo-router';

// Web: <Route path="*" element={<Navigate to="/global/admin" replace />} /> in modules/Global/routes.jsx.
export default function GlobalIndex() {
  return <Redirect href="/global/admin" />;
}
