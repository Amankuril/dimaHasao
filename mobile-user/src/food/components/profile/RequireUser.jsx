import { Redirect } from 'expo-router';
import { isModuleAuthenticated } from '../../utils/auth';

/** Port of components/ProtectedRoute.jsx for the user module: signed out -> the shared login. */
export default function RequireUser({ children }) {
  if (!isModuleAuthenticated('user')) return <Redirect href="/app/login" />;
  return children;
}
