import TableBooking from '../../../../../food/screens/TableBooking';
import RequireUser from '../../../../../food/components/profile/RequireUser';

export default function Route() {
  return (
    <RequireUser>
      <TableBooking />
    </RequireUser>
  );
}
