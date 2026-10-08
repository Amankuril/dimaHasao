/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/SetPackagePrices.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { Edit2, Package, Plus, Trash2, Search } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { toast } from '../../../../../lib/notify';
import { adminService } from '../../services/adminService';
import {
  AdminPage,
  PageHeader,
  Card,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  EmptyState,
  ErrorState,
  TableSkeleton,
  BTN_PRIMARY,
  BTN_TEXT_PRIMARY,
} from '../../../../../admin/ui';
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
const COLS = [190, 160, 160, 190, 120, 110, 100];
const LABELS = ['Package', 'Destination', 'Location', 'Vehicles', 'Availability', 'Status', 'Actions'];
const SetPackagePrices = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const fetchItems = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const response = await adminService.getSetPrices({
        scope: 'package',
      });
      const results = response?.data?.results || response?.results || [];
      setItems(Array.isArray(results) ? results : []);
    } catch (error) {
      setLoadError(error?.response?.data?.message || 'Failed to load package pricing');
      toast.error('Failed to load package pricing');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchItems();
  }, []);
  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.package_type_name, item.package_destination, item.service_location_name, ...(item.package_vehicle_prices || []).map((row) => row.vehicle_type_name)]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [items, searchTerm]);
  const handleDelete = async (id) => {
    if (!(await window.confirmAsync('Delete this package pricing?'))) return;
    try {
      await adminService.deleteSetPrice(id);
      toast.success('Package pricing deleted');
      fetchItems();
    } catch (error) {
      toast.error('Failed to delete package pricing');
    }
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Package}
        title="Package pricing"
        subtitle="Package name, destination, availability and vehicle-wise pricing in one place"
        breadcrumb={[{ label: 'Taxi' }, { label: 'Pricing' }, { label: 'Packages' }]}
        actions={
          <Button type="button" onClick={() => navigate('/taxi/admin/pricing/package-pricing/create')} className={BTN_PRIMARY}>
            <UiIcon as={Plus} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>Add package pricing</Span>
          </Button>
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white flex-1 min-w-[200px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search package or destination"
              className="flex-1 text-sm text-slate-900"
            />
          </Div>
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : loadError ? (
        <ErrorState title="Could not load package pricing" message={loadError} onRetry={fetchItems} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title={items.length ? 'No packages match your search' : 'No package pricing yet'}
          message={items.length ? 'Try a different package name or destination.' : 'Add a package to offer fixed-price trips to a destination.'}
          actionLabel={items.length ? undefined : 'Add package pricing'}
          onAction={items.length ? undefined : () => navigate('/taxi/admin/pricing/package-pricing/create')}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {filteredItems.map((item, i, all) => {
              const vehicles = item.package_vehicle_prices || [];
              const vehicleNames = vehicles
                .slice(0, 2)
                .map((row) => row.vehicle_type_name)
                .filter(Boolean)
                .join(', ');
              return (
                <Row key={item.id} last={i === all.length - 1}>
                  <Cell width={COLS[0]}>
                    <Span className="text-sm font-semibold text-slate-900">{item.package_type_name || 'Untitled package'}</Span>
                    <Span className="text-xs text-slate-500 mt-0.5">{`${vehicles.length} vehicle price ${vehicles.length === 1 ? 'row' : 'rows'}`}</Span>
                  </Cell>
                  <Cell width={COLS[1]}>{item.package_destination || 'No destination'}</Cell>
                  <Cell width={COLS[2]}>{item.service_location_name || item.zone_name || 'All locations'}</Cell>
                  <Cell width={COLS[3]}>
                    {`${vehicleNames || 'No vehicles'}${vehicles.length > 2 ? ` +${vehicles.length - 2} more` : ''}`}
                  </Cell>
                  <Cell width={COLS[4]}>
                    <StatusBadge status={item.package_availability || 'available'} tone={item.package_availability === 'available' ? 'success' : 'danger'} />
                  </Cell>
                  <Cell width={COLS[5]}>
                    <StatusBadge status={Number(item.active) === 1 ? 'active' : 'inactive'} />
                  </Cell>
                  <Cell width={COLS[6]}>
                    <Div className="flex-row items-center gap-1">
                      <Button
                        type="button"
                        accessibilityLabel={`Edit ${item.package_type_name || 'package'}`}
                        onClick={() => navigate(`/taxi/admin/pricing/package-pricing/edit/${item.id}`)}
                        className="w-11 h-11 rounded-lg items-center justify-center"
                      >
                        <UiIcon as={Edit2} size={16} className="text-slate-600" />
                      </Button>
                      <Button
                        type="button"
                        accessibilityLabel={`Delete ${item.package_type_name || 'package'}`}
                        onClick={() => handleDelete(item.id)}
                        className="w-11 h-11 rounded-lg items-center justify-center"
                      >
                        <UiIcon as={Trash2} size={16} className="text-red-600" />
                      </Button>
                    </Div>
                  </Cell>
                </Row>
              );
            })}
          </TBody>
        </DataTable>
      )}
    </AdminPage>
  );
};
export default SetPackagePrices;
