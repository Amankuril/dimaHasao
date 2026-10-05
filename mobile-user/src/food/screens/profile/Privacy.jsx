import CMSPage from '../../../components/CMSPage';
import { API_ENDPOINTS } from '../../../api/food';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';

/** Port of pages/user/profile/Privacy.jsx (the shared CMSPage). */
export default function Privacy() {
  const goBack = useAppBackNavigation();
  return <CMSPage endpoint={API_ENDPOINTS.ADMIN.PRIVACY_PUBLIC} title="Privacy Policy" goBack={goBack} />;
}
