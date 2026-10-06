import { Redirect } from 'expo-router';

// The wrapper opened https://tourismdimahasao.in/taxi/driver; so does the app.
export default function Index() {
  return <Redirect href="/taxi/driver" />;
}
