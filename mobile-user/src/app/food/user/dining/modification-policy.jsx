import TableModificationPolicy from '../../../../food/screens/TableModificationPolicy';
import RequireUser from '../../../../food/components/profile/RequireUser';

export default function Route() {
  return (
    <RequireUser>
      <TableModificationPolicy />
    </RequireUser>
  );
}
