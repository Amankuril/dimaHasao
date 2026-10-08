import { FileText } from 'lucide-react-native';
import { useLocation, useNavigate } from '../../../lib/webRouter';
import { Button, Span } from '../../../components/web';
import { AdminPage, EmptyState, BTN_PRIMARY, BTN_TEXT_PRIMARY } from '../../../admin/ui';

/*
 * Web: <Route path="*" element={<AdminSectionPlaceholder />} /> inside the
 * taxi admin block (modules/Taxi/TaxiApp.jsx) — an admin section that is not
 * wired keeps the admin shell instead of rendering nothing.
 */
export default function AdminSectionPlaceholder() {
  const location = useLocation();
  const navigate = useNavigate();

  const title = location.pathname
    .split('/')
    .filter(Boolean)
    .slice(1)
    .join(' / ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <AdminPage maxWidth={720}>
      <EmptyState
        icon={FileText}
        title={title || 'Admin section'}
        message="This admin section is not wired to the user app. It stays inside the admin shell so navigation remains safe."
      />
      <Button type="button" onClick={() => navigate('/taxi/admin/dashboard')} className={`${BTN_PRIMARY} mt-4 self-center`}>
        <Span className={BTN_TEXT_PRIMARY}>Back to dashboard</Span>
      </Button>
    </AdminPage>
  );
}
