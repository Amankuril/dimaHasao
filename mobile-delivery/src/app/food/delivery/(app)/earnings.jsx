import { Redirect } from 'expo-router';

// Web: <Route path="earnings" element={<Navigate to="/food/delivery/pocket/details" replace />} />
export default function Earnings() {
  return <Redirect href="/food/delivery/pocket/details" />;
}
