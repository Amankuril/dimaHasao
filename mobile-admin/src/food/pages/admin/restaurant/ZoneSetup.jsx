/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/ZoneSetup.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { useNavigate } from '../../../../lib/webRouter';
import { MapPin, Plus, Search, Edit, Trash2, Eye, Map, Bike } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import {
  AdminPage,
  PageHeader,
  Card,
  Toolbar,
  StatusBadge,
  EmptyState,
  TableSkeleton,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { alert, window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function ZoneSetup() {
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { columns } = useLayoutWidth();
  useEffect(() => {
    fetchZones();
  }, []);
  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getZones();
      if (response.data?.success && response.data.data?.zones) {
        setZones(response.data.data.zones);
      }
    } catch (error) {
      debugError('Error fetching zones:', error);
      setZones([]);
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteZone = async (zoneId) => {
    if (!(await window.confirmAsync('Are you sure you want to delete this zone?'))) {
      return;
    }
    try {
      await adminAPI.deleteZone(zoneId);
      alert('Zone deleted successfully!');
      fetchZones();
    } catch (error) {
      debugError('Error deleting zone:', error);
      alert(error.response?.data?.message || 'Failed to delete zone');
    }
  };
  const filteredZones = zones.filter(
    (zone) => zone.name?.toLowerCase().includes(searchQuery.toLowerCase()) || zone.serviceLocation?.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={MapPin}
        title="Zone Setup"
        subtitle="Manage delivery zones for restaurants"
        breadcrumb={[{ label: 'Food' }, { label: 'Restaurants' }, { label: 'Zone setup' }]}
        actions={
          <>
            <Button onClick={() => navigate('/admin/food/zone-setup/add')} className={BTN_PRIMARY}>
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Add Zone</Span>
            </Button>
            <Button onClick={() => navigate('/admin/food/zone-setup/map')} className={BTN_SECONDARY}>
              <UiIcon as={Map} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>View Map</Span>
            </Button>
            <Button onClick={() => navigate('/admin/food/zone-setup/delivery-boy-view')} className={BTN_SECONDARY}>
              <UiIcon as={Bike} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Delivery Boy View</Span>
            </Button>
          </>
        }
      />

      {/* Search */}
      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center flex-1 min-w-[200px] gap-2">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Search zones by name or location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${INPUT} flex-1`}
            />
          </Div>
        </Toolbar>
      </Card>

      {/* Zones */}
      {loading ? (
        <TableSkeleton rows={4} />
      ) : filteredZones.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No zones found"
          message={searchQuery ? 'No zone matches that name or location. Try a different search.' : 'Create your first delivery zone to start serving restaurants.'}
          actionLabel={searchQuery ? undefined : 'Add Zone'}
          onAction={searchQuery ? undefined : () => navigate('/admin/food/zone-setup/add')}
        />
      ) : (
        <Div className={`grid grid-cols-${columns} gap-3`}>
          {filteredZones.map((zone) => (
            <Card key={zone._id || zone.id} className="gap-3">
              <Div className="flex-row items-start gap-2">
                <Div className="flex-1 min-w-0">
                  <Text style={tw`text-base font-semibold text-slate-900`} numberOfLines={2}>
                    {zone.name || 'Unnamed Zone'}
                  </Text>
                  <Text style={tw`text-sm text-slate-500 mt-0.5`} numberOfLines={2}>
                    {zone.serviceLocation || 'No service location'}
                  </Text>
                </Div>
                <Div className="flex-row items-center shrink-0">
                  <Button
                    onClick={() => navigate(`/admin/food/zone-setup/view/${zone._id || zone.id}`)}
                    accessibilityLabel="View zone"
                    className="w-11 h-11 items-center justify-center rounded-lg"
                  >
                    <UiIcon as={Eye} size={18} className="text-slate-600" />
                  </Button>
                  <Button
                    onClick={() => navigate(`/admin/food/zone-setup/edit/${zone._id || zone.id}`)}
                    accessibilityLabel="Edit zone"
                    className="w-11 h-11 items-center justify-center rounded-lg"
                  >
                    <UiIcon as={Edit} size={18} className="text-slate-600" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteZone(zone._id || zone.id)}
                    accessibilityLabel="Delete zone"
                    className="w-11 h-11 items-center justify-center rounded-lg"
                  >
                    <UiIcon as={Trash2} size={18} className="text-red-600" />
                  </Button>
                </Div>
              </Div>
              <Div className="gap-2 pt-3 border-t border-slate-100">
                <Div className="flex-row items-center justify-between gap-2">
                  <Text style={tw`text-sm text-slate-500`}>Unit</Text>
                  <Text style={tw`text-sm font-medium text-slate-900`}>{zone.unit || 'km'}</Text>
                </Div>
                <Div className="flex-row items-center justify-between gap-2">
                  <Text style={tw`text-sm text-slate-500`}>Status</Text>
                  <StatusBadge status={zone.isActive ? 'active' : 'inactive'} label={zone.isActive ? 'Active' : 'Inactive'} />
                </Div>
                {zone.coordinates && zone.coordinates.length > 0 && (
                  <Div className="flex-row items-center justify-between gap-2">
                    <Text style={tw`text-sm text-slate-500`}>Points</Text>
                    <Text style={tw`text-sm font-medium text-slate-900`}>{zone.coordinates.length}</Text>
                  </Div>
                )}
              </Div>
            </Card>
          ))}
        </Div>
      )}
    </AdminPage>
  );
}
