import RequireAdmin from '../../../admin/RequireAdmin';
import AdminLayout from '../../../global/app/admin/layouts/AdminLayout';

// Web: <Route element={<RequireAdmin />}><Route path="admin" element={<AdminLayout />}> in Global/routes.jsx.
export default function Layout() {
  return (
    <RequireAdmin>
      <AdminLayout />
    </RequireAdmin>
  );
}
