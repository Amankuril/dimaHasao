import { Redirect } from 'expo-router';

/* An unknown path goes home, as the web's catch-all routes do. */
export default function NotFound() {
  return <Redirect href="/" />;
}
