import TableBookingSuccess from '../../../../food/screens/TableBookingSuccess';
import RequireUser from '../../../../food/components/profile/RequireUser';

export default function Route() {
  return (
    <RequireUser>
      <TableBookingSuccess />
    </RequireUser>
  );
}
