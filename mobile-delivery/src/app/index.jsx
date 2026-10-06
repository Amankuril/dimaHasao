import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

// The web's /food/delivery entry: home when signed in, else the sign-in page.
export default function Index() {
  const { signedIn } = useAuth();
  return <Redirect href={signedIn ? '/food/delivery' : '/food/delivery/login'} />;
}
