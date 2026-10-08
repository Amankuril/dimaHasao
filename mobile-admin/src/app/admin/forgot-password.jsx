import AdminForgotPassword from '../../food/pages/admin/auth/AdminForgotPassword';
import { RedirectIfAdmin } from '../../admin/RequireAdmin';
import { currentAdminHome } from '../../admin/access';

export default function Route() {
  return (
    <RedirectIfAdmin home={currentAdminHome}>
      <AdminForgotPassword />
    </RedirectIfAdmin>
  );
}
