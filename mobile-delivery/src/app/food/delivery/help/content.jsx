import CMSPage from '../../../../components/CMSPage';
import useDeliveryBackNavigation from '../../../../delivery/hooks/useDeliveryBackNavigation';

// Web: pages/CMSHelpSupportPage.jsx
export default function Page() {
  const goBack = useDeliveryBackNavigation();
  return <CMSPage endpoint="/food/pages/support_delivery" title="Help & Support" goBack={goBack} />;
}
