import RequireAdmin from '../../../../admin/RequireAdmin';
import AdminLayout from '../../../../taxi/modules/admin/components/AdminLayout';

// Web: <Route path="user-import/create" element={<AdminLayout />}> in modules/Taxi/TaxiApp.jsx.
export default function Layout() {
  return (
    <RequireAdmin>
      <AdminLayout />
    </RequireAdmin>
  );
}
