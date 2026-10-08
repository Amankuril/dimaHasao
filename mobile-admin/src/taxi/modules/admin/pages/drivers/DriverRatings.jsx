/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverRatings.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { ChevronRight, Eye, Loader2, MoreVertical, Search, Star } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { Button, Div, H1, Input, Option, ScrollDiv, Select, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../../components/web';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';
const DriverRatings = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  useEffect(() => {
    const fetchRatings = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`${API_BASE_URL}/admin/driver-ratings`, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const list = data.data?.results || [];
          setDrivers(
            list.map((d) => ({
              id: d._id,
              name: d.name || 'Unknown',
              transport: d.transport_type || 'Taxi',
              mobile: d.mobile || '',
              rating: d.rating || 0,
            })),
          );
        }
      } catch (err) {
        console.error('Ratings fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRatings();
  }, []);
  const filtered = drivers.filter((d) => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.mobile.includes(searchTerm));
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 p-6 lg:p-8 font-sans text-gray-900">
      <Div className="mb-6">
        <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Span>Drivers</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700">Driver Rating</Span>
        </Div>
        <Div className="flex items-center justify-between">
          <H1 className="text-xl text-gray-900 font-bold">Driver Rating</H1>
        </Div>
      </Div>

      <Div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <Div className="flex items-center gap-2 text-xs text-gray-500">
            <Span>Show</Span>
            <Select className="border border-gray-200 rounded px-2 py-1 text-xs bg-white">
              <Option value={10}>10</Option>
            </Select>
            <Span>entries</Span>
          </Div>
          <Div className="relative">
            <UiIcon as={Search} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-56 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </Div>
        </Div>

        <Div>
          <Table cols={[180, 150, 150, 120, 120]} className="w-full">
            <Thead>
              <Tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <Th className="px-6 py-3 text-left">Name</Th>
                <Th className="px-4 py-3 text-left">Transport Type</Th>
                <Th className="px-4 py-3 text-left">Mobile Number</Th>
                <Th className="px-4 py-3 text-left">Rating</Th>
                <Th className="px-4 py-3 text-center">Action</Th>
              </Tr>
            </Thead>
            <Tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {isLoading ? (
                <Tr>
                  <Td colSpan="5" className="py-10 text-center">
                    <UiIcon as={Loader2} className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                  </Td>
                </Tr>
              ) : filtered.length === 0 ? (
                <Tr>
                  <Td colSpan="5" className="py-10 text-center text-gray-400">
                    No data found.
                  </Td>
                </Tr>
              ) : (
                filtered.map((driver) => (
                  <Tr key={driver.id} className="hover:bg-gray-50/50">
                    <Td className="px-6 py-3">{driver.name}</Td>
                    <Td className="px-4 py-3 capitalize">{driver.transport}</Td>
                    <Td className="px-4 py-3">{driver.mobile}</Td>
                    <Td className="px-4 py-3">
                      <Div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <UiIcon as={Star} key={s} size={14} className={s <= Math.round(driver.rating) ? 'text-amber-400' : 'text-gray-200'} />
                        ))}
                      </Div>
                    </Td>
                    <Td className="px-4 py-3 text-center">
                      <Div className="inline-block">
                        <Button
                          onClick={() => setActiveMenu(activeMenu === driver.id ? null : driver.id)}
                          className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600"
                        >
                          <UiIcon as={MoreVertical} size={16} />
                        </Button>
                        {activeMenu === driver.id && (
                          <Div className="mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                            <Button
                              onClick={() => navigate(`/taxi/admin/drivers/ratings/${driver.id}`)}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <UiIcon as={Eye} size={14} className="text-gray-400" /> View
                            </Button>
                          </Div>
                        )}
                      </Div>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default DriverRatings;
