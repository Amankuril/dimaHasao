import CMSPage from '../../../components/CMSPage';
import { API_ENDPOINTS } from '../../../api/food';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';

/** Port of pages/user/profile/UserCMSHelpSupportPage.jsx (the shared CMSPage). */
export default function UserCMSHelpSupportPage() {
  const goBack = useAppBackNavigation();
  return <CMSPage endpoint={API_ENDPOINTS.ADMIN.SUPPORT_USER_PUBLIC} title="Help & Support" goBack={goBack} />;
}
