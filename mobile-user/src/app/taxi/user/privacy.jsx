import { Redirect } from 'expo-router';

// Web: /taxi/user/privacy -> the shared legal page.
export default function Legal() {
  return <Redirect href="/legal/privacy?module=taxi" />;
}
