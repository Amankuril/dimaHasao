import DriverList from '../../../../taxi/modules/admin/pages/drivers/DriverList';

// Web: <Route path="drivers/active" element={<DriverList mode="active" />} />
export default function Route() {
  return <DriverList mode="active" />;
}
