import RequireUser from '../../../../../food/components/profile/RequireUser';
import OrderTracking from '../../../../../food/screens/OrderTracking';

export default function OrderTrackingRoute() {
  return (
    <RequireUser>
      <OrderTracking />
    </RequireUser>
  );
}
