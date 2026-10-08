import { Redirect } from 'expo-router';

// Web: <Route path="*" element={<Navigate to="/tours/admin" replace />} /> in modules/Tours/routes.jsx.
export default function ToursIndex() {
  return <Redirect href="/tours/admin" />;
}
