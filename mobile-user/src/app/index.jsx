import { Redirect } from 'expo-router';

// Web: `/` -> `/app` (the Dima Hasao customer app).
export default function Index() {
  return <Redirect href="/app" />;
}
