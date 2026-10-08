import { FileText } from 'lucide-react-native';
import { useLocation, useNavigate } from '../../../lib/webRouter';
import { Button, Div, H2, P, Span, Icon as UiIcon } from '../../../components/web';

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
    <Div className="flex items-center justify-center min-h-[70vh]">
      <Div className="max-w-xl w-full bg-white rounded-[32px] border border-gray-100 shadow-sm p-10 text-center">
        <Div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
          <UiIcon as={FileText} size={28} />
        </Div>
        <H2 className="text-2xl font-black text-gray-950 uppercase tracking-tight">{title || 'Admin Section'}</H2>
        <P className="mt-3 text-sm font-medium text-gray-500 leading-6">
          This admin section is not wired to the user app. It stays inside the admin shell so navigation remains safe.
        </P>
        <Button
          type="button"
          onClick={() => navigate('/taxi/admin/dashboard')}
          className="mt-8 flex flex-row items-center justify-center px-6 py-3 rounded-xl bg-[#2563EB] text-white text-[12px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20"
        >
          <Span>Back to Dashboard</Span>
        </Button>
      </Div>
    </Div>
  );
}
