import { Redirect } from 'expo-router';

// Web: <Route path="*" element={<Navigate to="/food/delivery" replace />} />
export default function NotFound() {
  return <Redirect href="/food/delivery" />;
}
