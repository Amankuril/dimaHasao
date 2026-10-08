import AdminLogin from '../../admin/screens/AdminLogin';
import { RedirectIfAdmin } from '../../admin/RequireAdmin';
import { currentAdminHome } from '../../admin/access';

export default function Route() {
  return (
    <RedirectIfAdmin home={currentAdminHome}>
      <AdminLogin />
    </RedirectIfAdmin>
  );
}
