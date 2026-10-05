import { Redirect } from 'expo-router';

// Web: /taxi/user/refund -> the shared legal page.
export default function Legal() {
  return <Redirect href="/legal/refund?module=taxi" />;
}
