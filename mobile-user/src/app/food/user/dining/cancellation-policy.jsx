import TableCancellationPolicy from '../../../../food/screens/TableCancellationPolicy';
import RequireUser from '../../../../food/components/profile/RequireUser';

export default function Route() {
  return (
    <RequireUser>
      <TableCancellationPolicy />
    </RequireUser>
  );
}
