import { Redirect } from 'expo-router';

// Web: the bare /taxi index sends a visitor to sign-in; the app's signed-in customer lands on the taxi home.
export default function TaxiIndex() {
  return <Redirect href="/taxi/user" />;
}
