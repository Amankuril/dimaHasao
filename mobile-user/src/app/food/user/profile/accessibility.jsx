import RequireUser from '../../../../food/components/profile/RequireUser';
import Screen from '../../../../food/screens/profile/Accessibility';

export default function Route() {
  return (
    <RequireUser>
      <Screen />
    </RequireUser>
  );
}
