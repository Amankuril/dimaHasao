import { Redirect } from 'expo-router';

// Web: <Route path="operator/*" .../> and <Route path="*" element={<Navigate to="/tours/admin" replace />} />.
export default function ToursCatchAll() {
  return <Redirect href="/tours/admin" />;
}
