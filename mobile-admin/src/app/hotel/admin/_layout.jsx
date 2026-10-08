import RequireAdmin from '../../../admin/RequireAdmin';
import AdminLayout from '../../../hotel/app/admin/layouts/AdminLayout';

export default function Layout() {
  return (
    <RequireAdmin>
      <AdminLayout />
    </RequireAdmin>
  );
}
