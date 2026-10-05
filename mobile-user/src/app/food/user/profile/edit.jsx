import RequireUser from '../../../../food/components/profile/RequireUser';
import Screen from '../../../../food/screens/profile/EditProfile';

export default function Route() {
  return (
    <RequireUser>
      <Screen />
    </RequireUser>
  );
}
