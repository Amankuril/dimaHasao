import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { currentAdminHome } from '../admin/access';

/* The web's `/admin` -> the first panel this admin can open, or the login. */
export default function Index() {
  const { booting, signedIn } = useAuth();
  if (booting) return null;
  return <Redirect href={signedIn ? currentAdminHome() : '/admin/login'} />;
}
