import RequireAdmin from '../../../admin/RequireAdmin';
import AdminLayout from '../../../food/components/admin/AdminLayout';

export default function Layout() {
  return (
    <RequireAdmin>
      <AdminLayout />
    </RequireAdmin>
  );
}
