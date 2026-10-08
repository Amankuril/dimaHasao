/* Ported from Frontend/src/modules/Food/components/admin/ProtectedRoute.jsx (tools/port.js first pass). */
import { Navigate, useLocation } from '../../../lib/webRouter';
import { isModuleAuthenticated } from '../../../admin/session';
export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const isAuthenticated = isModuleAuthenticated('admin');
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        state={{
          from: location.pathname,
        }}
        replace
      />
    );
  }
  return children;
}
