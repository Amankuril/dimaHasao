import RequireUser from '../../../../../food/components/profile/RequireUser';
import Screen from '../../../../../food/screens/profile/AddPayment';

export default function Route() {
  return (
    <RequireUser>
      <Screen />
    </RequireUser>
  );
}
