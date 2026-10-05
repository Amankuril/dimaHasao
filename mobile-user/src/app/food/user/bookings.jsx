import MyBookings from '../../../food/screens/MyBookings';
import RequireUser from '../../../food/components/profile/RequireUser';

export default function Route() {
  return (
    <RequireUser>
      <MyBookings />
    </RequireUser>
  );
}
