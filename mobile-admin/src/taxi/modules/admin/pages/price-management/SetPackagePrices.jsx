/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/SetPackagePrices.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Edit2, Loader2, MapPin, Plus, Trash2, Search } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { toast } from '../../../../../lib/notify';
import { adminService } from '../../services/adminService';
import { Button, Div, H1, Input, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
const badgeClass = (value) => (value === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100');
const statusClass = (active) => (Number(active) === 1 ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-slate-100 text-slate-500 border-slate-200');
const SetPackagePrices = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await adminService.getSetPrices({
        scope: 'package',
      });
      const results = response?.data?.results || response?.results || [];
      setItems(Array.isArray(results) ? results : []);
    } catch (error) {
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
    <ScrollDiv className="min-h-screen bg-[#F3F4F9] p-4 font-sans">
      <Div className="flex flex-col gap-3 border-b border-gray-100 pb-3 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <Div>
          <H1
            className="text-2xl font-bold text-[#1E293B]"
            style={{
            }}
          >
            Package Pricing
          </H1>
          <P className="mt-1 text-xs text-slate-500">Manage package name, destination, availability, and vehicle-wise pricing in one place.</P>
        </Div>
        <Div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium tracking-tight">
          <Span className="hover:text-slate-600 transition-colors cursor-pointer" onClick={() => navigate('/taxi/admin/pricing/package-pricing')}>
            Package Pricing
          </Span>
          <UiIcon as={ChevronRight} size={10} className="text-slate-300" />
          <Span className="text-slate-800 font-bold">Listing</Span>
        </Div>
      </Div>

      <Div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <Div className="flex flex-col gap-4 border-b border-gray-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <Div className="flex items-center gap-3 relative">
            <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search package or destination"
              className="w-full lg:w-80 rounded-lg border border-gray-200 pl-10 pr-4 py-2 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-medium bg-white shadow-sm"
            />
          </Div>
          <Button
            onClick={() => navigate('/taxi/admin/pricing/package-pricing/create')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-amber-500 shadow-sm"
          >
            <UiIcon as={Plus} size={16} />
            Add Package Pricing
          </Button>
        </Div>

        <Table cols={[200, 170, 160, 190, 130, 110, 110]} className="w-full text-left">
            <Thead className="bg-[#FBFCFF]">
              <Tr className="border-b border-gray-100 text-sm font-semibold text-slate-700">
                <Th className="px-6 py-4">Package</Th>
                <Th className="px-6 py-4">Destination</Th>
                <Th className="px-6 py-4">Location</Th>
                <Th className="px-6 py-4">Vehicles</Th>
                <Th className="px-6 py-4">Availability</Th>
                <Th className="px-6 py-4">Status</Th>
                <Th className="px-6 py-4 text-right">Action</Th>
              </Tr>
            </Thead>
            <Tbody className="divide-y divide-gray-50">
              {loading ? (
                <Tr>
                  <Td colSpan="7" className="px-4 py-10 text-center">
                    <UiIcon as={Loader2} className="mx-auto h-8 w-8 animate-spin text-amber-500" />
                    <P className="mt-3 text-sm font-medium text-slate-400">Loading package pricing...</P>
                  </Td>
                </Tr>
              ) : filteredItems.length === 0 ? (
                <Tr>
                  <Td colSpan="7" className="px-4 py-10 text-center text-sm text-slate-400">
                    No package pricing found.
                  </Td>
                </Tr>
              ) : (
                filteredItems.map((item) => (
                  <Tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <Td className="px-4 py-3.5">
                      <P className="text-sm font-bold text-slate-900">{item.package_type_name || 'Untitled package'}</P>
                      <P className="mt-1 text-xs text-slate-400">{(item.package_vehicle_prices || []).length} vehicle price rows</P>
                    </Td>
                    <Td className="px-4 py-3.5">
                      <Div className="flex items-center gap-2 text-sm text-slate-700">
                        <UiIcon as={MapPin} size={14} className="text-amber-500" />
                        <Span>{item.package_destination || 'No destination'}</Span>
                      </Div>
                    </Td>
                    <Td className="px-4 py-3.5 text-sm text-slate-600">{item.service_location_name || item.zone_name || 'All locations'}</Td>
                    <Td className="px-4 py-3.5 text-sm text-slate-600">
                      {(item.package_vehicle_prices || [])
                        .slice(0, 2)
                        .map((row) => row.vehicle_type_name)
                        .filter(Boolean)
                        .join(', ') || 'No vehicles'}
                      {(item.package_vehicle_prices || []).length > 2 ? ` +${item.package_vehicle_prices.length - 2} more` : ''}
                    </Td>
                    <Td className="px-4 py-3.5">
                      <Span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${badgeClass(item.package_availability)}`}>
                        {item.package_availability || 'available'}
                      </Span>
                    </Td>
                    <Td className="px-4 py-3.5">
                      <Span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClass(item.active)}`}>
                        {Number(item.active) === 1 ? 'active' : 'inactive'}
                      </Span>
                    </Td>
                    <Td className="px-4 py-3.5">
                      <Div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => navigate(`/taxi/admin/pricing/package-pricing/edit/${item.id}`)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-400 transition hover:bg-orange-100"
                        >
                          <UiIcon as={Edit2} size={14} />
                        </Button>
                        <Button
                          onClick={() => handleDelete(item.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-400 transition hover:bg-rose-100"
                        >
                          <UiIcon as={Trash2} size={14} />
                        </Button>
                      </Div>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
        </Table>
      </Div>
    </ScrollDiv>
  );
};
export default SetPackagePrices;
