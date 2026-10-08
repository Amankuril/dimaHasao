import { Redirect } from 'expo-router';

// Web: <Route index element={<Navigate to="service-location" />} /> inside <Route path="pricing">.
export default function PricingIndex() {
  return <Redirect href="/taxi/admin/pricing/service-location" />;
}
