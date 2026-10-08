/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/ZoneSetup.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { useNavigate } from '../../../../lib/webRouter';
import { MapPin, Plus, Search, Edit, Trash2, Eye, Map, Bike } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { Button, Div, H1, H3, Input, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
import { alert, window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function ZoneSetup() {
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
    <ScrollDiv className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <Div className="w-full mx-auto max-w-7xl">
        {/* Header */}
        <Div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <Div className="flex items-center gap-3 mb-4 md:mb-0">
            <Div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
              <UiIcon as={MapPin} className="w-5 h-5 text-white" />
            </Div>
            <Div>
              <H1 className="text-2xl font-bold text-slate-900">Zone Setup Restaurant</H1>
              <P className="text-sm text-slate-600">Manage delivery zones for restaurants</P>
            </Div>
          </Div>
          <Div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => navigate('/admin/food/zone-setup/delivery-boy-view')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <UiIcon as={Bike} className="w-5 h-5" />
              <Span>Delivery Boy View</Span>
            </Button>
            <Button
              onClick={() => navigate('/admin/food/zone-setup/map')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <UiIcon as={Map} className="w-5 h-5" />
              <Span>View Map</Span>
            </Button>
            <Button
              onClick={() => navigate('/admin/food/zone-setup/add')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UiIcon as={Plus} className="w-5 h-5" />
              <Span>Add Zone</Span>
            </Button>
          </Div>
        </Div>

        {/* Search Bar */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <Div className="relative">
            <UiIcon as={Search} className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search zones by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Div>
        </Div>

        {/* Zones List */}
        {loading ? (
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
            <Div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></Div>
            <P className="text-slate-600">Loading zones...</P>
          </Div>
        ) : filteredZones.length === 0 ? (
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <UiIcon as={MapPin} className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <H3 className="text-lg font-semibold text-slate-900 mb-2">No zones found</H3>
            <P className="text-slate-600 mb-6">{searchQuery ? 'Try adjusting your search query' : 'Create your first delivery zone to get started'}</P>
            {!searchQuery && (
              <Button
                onClick={() => navigate('/admin/food/zone-setup/add')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UiIcon as={Plus} className="w-5 h-5" />
                <Span>Add Zone</Span>
              </Button>
            )}
          </Div>
        ) : (
          <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredZones.map((zone) => (
              <Div key={zone._id || zone.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <Div className="flex items-start justify-between mb-4">
                  <Div className="flex-1">
                    <H3 className="text-lg font-semibold text-slate-900 mb-1">{zone.name || 'Unnamed Zone'}</H3>
                    <P className="text-sm text-slate-600">{zone.serviceLocation || 'N/A'}</P>
                  </Div>
                  <Div className="flex items-center gap-2">
                    <Button
                      onClick={() => navigate(`/admin/food/zone-setup/view/${zone._id || zone.id}`)}
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <UiIcon as={Eye} className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => navigate(`/admin/food/zone-setup/edit/${zone._id || zone.id}`)}
                      className="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <UiIcon as={Edit} className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteZone(zone._id || zone.id)}
                      className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <UiIcon as={Trash2} className="w-4 h-4" />
                    </Button>
                  </Div>
                </Div>
                <Div className="space-y-2 text-sm">
                  <Div className="flex items-center justify-between">
                    <Span className="text-slate-600">Unit:</Span>
                    <Span className="font-medium text-slate-900">{zone.unit || 'km'}</Span>
                  </Div>
                  <Div className="flex items-center justify-between">
                    <Span className="text-slate-600">Status:</Span>
                    <Span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${zone.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}
                    >
                      {zone.isActive ? 'Active' : 'Inactive'}
                    </Span>
                  </Div>
                  {zone.coordinates && zone.coordinates.length > 0 && (
                    <Div className="flex items-center justify-between">
                      <Span className="text-slate-600">Points:</Span>
                      <Span className="font-medium text-slate-900">{zone.coordinates.length}</Span>
                    </Div>
                  )}
                </Div>
              </Div>
            ))}
          </Div>
        )}
      </Div>
    </ScrollDiv>
  );
}
