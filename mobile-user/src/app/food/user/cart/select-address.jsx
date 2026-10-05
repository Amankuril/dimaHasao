import SelectAddress from '../../../../food/screens/SelectAddress';
import RequireUser from '../../../../food/components/profile/RequireUser';

export default function SelectAddressRoute() {
  return (
    <RequireUser>
      <SelectAddress />
    </RequireUser>
  );
}
