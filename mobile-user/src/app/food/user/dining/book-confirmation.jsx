import TableBookingConfirmation from '../../../../food/screens/TableBookingConfirmation';
import RequireUser from '../../../../food/components/profile/RequireUser';

export default function Route() {
  return (
    <RequireUser>
      <TableBookingConfirmation />
    </RequireUser>
  );
}
