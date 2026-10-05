import CMSPage from '../../../components/CMSPage';
import { API_ENDPOINTS } from '../../../api/food';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';

/** Port of pages/user/profile/Terms.jsx (the shared CMSPage). */
export default function Terms() {
  const goBack = useAppBackNavigation();
  return <CMSPage endpoint={API_ENDPOINTS.ADMIN.TERMS_PUBLIC} title="Terms of Service" goBack={goBack} />;
}
