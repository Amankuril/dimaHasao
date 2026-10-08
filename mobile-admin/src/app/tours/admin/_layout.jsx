import RequireAdmin from '../../../admin/RequireAdmin';
import AdminLayout from '../../../tours/app/admin/layouts/AdminLayout';

// Web: <Route element={<RequireAdmin />}><Route path="admin" element={<AdminLayout />}> in Tours/routes.jsx.
export default function Layout() {
  return (
    <RequireAdmin>
      <AdminLayout />
    </RequireAdmin>
  );
}
