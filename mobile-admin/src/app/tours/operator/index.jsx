import { Redirect } from 'expo-router';

// Web: <Route path="operator/*" element={<Navigate to="/tours/admin" replace />} /> (the operator panel is gone).
export default function ToursOperatorIndex() {
  return <Redirect href="/tours/admin" />;
}
