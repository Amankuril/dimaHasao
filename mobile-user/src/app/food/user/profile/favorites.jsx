import RequireUser from '../../../../food/components/profile/RequireUser';
import Screen from '../../../../food/screens/profile/Favorites';

export default function Route() {
  return (
    <RequireUser>
      <Screen />
    </RequireUser>
  );
}
