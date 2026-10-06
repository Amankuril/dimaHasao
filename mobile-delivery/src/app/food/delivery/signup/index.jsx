import { Redirect } from 'expo-router';

// Web: <Route path="signup" element={<Navigate to="/food/delivery/login" replace />} />
export default function SignupIndex() {
  return <Redirect href="/food/delivery/login" />;
}
