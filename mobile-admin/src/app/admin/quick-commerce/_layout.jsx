import RequireAdmin from '../../../admin/RequireAdmin';
import AdminLayout from '../../../food/components/admin/AdminLayout';

// The web nests quick-commerce/* inside the same ProtectedRoute + AdminLayout as the
// food panel, so the placeholder shows with the admin shell around it.
export default function Layout() {
  return (
    <RequireAdmin>
      <AdminLayout />
    </RequireAdmin>
  );
}
