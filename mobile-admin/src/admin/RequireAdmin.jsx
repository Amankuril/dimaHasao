import { Redirect, usePathname } from 'expo-router';
import { useAuth } from '../context/AuthContext';

/*
 * ProtectedRoute (Food/components/admin/ProtectedRoute.jsx) for every admin
 * panel: no admin session -> /admin/login. Each panel's _layout wraps its
 * shell in this; sub-admin page permissions are the panel's own PermissionRoute.
 */
export default function RequireAdmin({ children }) {
  const { booting, signedIn } = useAuth();
  const pathname = usePathname();
  if (booting) return null;
  if (!signedIn) return <Redirect href={{ pathname: '/admin/login', params: pathname && pathname !== '/' ? { from: pathname } : {} }} />;
  return children;
}

/** AuthRedirect module="admin": the login screens send a signed-in admin home. */
export function RedirectIfAdmin({ children, home }) {
  const { booting, signedIn } = useAuth();
  if (booting) return null;
  if (signedIn) return <Redirect href={home()} />;
  return children;
}
