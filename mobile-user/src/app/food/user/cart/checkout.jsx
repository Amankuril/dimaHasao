import Checkout from '../../../../food/screens/Checkout';
import RequireUser from '../../../../food/components/profile/RequireUser';

export default function CheckoutRoute() {
  return (
    <RequireUser>
      <Checkout />
    </RequireUser>
  );
}
