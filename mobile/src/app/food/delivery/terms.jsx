import CMSPage from '../../../components/CMSPage';
import useDeliveryBackNavigation from '../../../delivery/hooks/useDeliveryBackNavigation';

// Web: pages/TermsAndConditionsV2.jsx
export default function Page() {
  const goBack = useDeliveryBackNavigation();
  return <CMSPage endpoint="/food/pages/terms" title="Terms of Service" goBack={goBack} />;
}
