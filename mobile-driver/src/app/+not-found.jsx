import { Redirect } from 'expo-router';

// Web: "*" -> "/".
export default function NotFound() {
  return <Redirect href="/" />;
}
