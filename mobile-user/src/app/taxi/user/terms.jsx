import { Redirect } from 'expo-router';

// Web: /taxi/user/terms -> the shared legal page.
export default function Legal() {
  return <Redirect href="/legal/terms?module=taxi" />;
}
