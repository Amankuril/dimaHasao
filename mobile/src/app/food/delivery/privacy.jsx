import CMSPage from '../../../components/CMSPage';
import useDeliveryBackNavigation from '../../../delivery/hooks/useDeliveryBackNavigation';

// Web: pages/PrivacyPolicyV2.jsx
export default function Page() {
  const goBack = useDeliveryBackNavigation();
  return <CMSPage endpoint="/food/pages/privacy" title="Privacy Policy" goBack={goBack} />;
}
