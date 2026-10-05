import TableEditUserPage from '../../../../food/screens/TableEditUserPage';
import RequireUser from '../../../../food/components/profile/RequireUser';

export default function Route() {
  return (
    <RequireUser>
      <TableEditUserPage />
    </RequireUser>
  );
}
