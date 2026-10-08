import { Redirect } from 'expo-router';

// Web: <Route path="*" element={<Navigate to="/hotel/admin" replace />} /> inside the Hotel router.
export default function HotelCatchAll() {
  return <Redirect href="/hotel/admin" />;
}
