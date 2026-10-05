import Cart from '../../../../food/screens/Cart';
import RequireUser from '../../../../food/components/profile/RequireUser';

export default function CartRoute() {
  return (
    <RequireUser>
      <Cart />
    </RequireUser>
  );
}
