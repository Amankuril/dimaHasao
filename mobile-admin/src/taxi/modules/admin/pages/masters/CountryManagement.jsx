/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/masters/CountryManagement.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, ChevronRight, Globe, XCircle } from 'lucide-react-native';
import api from '../../../../shared/api/axiosInstance';
import { toast } from '../../../../../lib/notify';
import { Button, Div, H1, Img, Input, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../../components/web';
const CountryManagement = () => {
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const fetchCountries = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/countries?page=${page}&limit=10&search=${searchTerm}`);
      setCountries(res.data?.results || []);
      setPagination(
        res.data?.paginator || {
          current_page: 1,
          last_page: 1,
          total: 0,
        },
      );
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load countries');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCountries(1);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);
  const toggleStatus = async (id, currentStatus) => {
    try {
      await api.patch(`/admin/countries/${id}`, {
        active: !currentStatus,
      });
      toast.success('Status updated successfully');
      fetchCountries(pagination.current_page);
    } catch {
      toast.error('Failed to update status');
    }
  };
  return (
    <ScrollDiv className="min-h-screen bg-[#F8FAFC]">
      <Div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
        {/* Breadcrumb & Title */}
        <Div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <Div>
            <H1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Countries</H1>
            <Div className="flex items-center gap-1.5 text-[12px] font-bold text-slate-400 mt-1">
              <Span>App Settings</Span>
              <UiIcon as={ChevronRight} size={14} />
              <Span className="text-indigo-600">Countries</Span>
            </Div>
          </Div>
          <Div className="flex items-center gap-3">
            <Div className="relative group">
              <UiIcon
                as={Search}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
                size={18}
              />
              <Input
                type="text"
                placeholder="Search countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] w-64 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </Div>
            <Button className="flex items-center gap-2 bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-[13px] font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
              <UiIcon as={Plus} size={18} />
              Add Country
            </Button>
          </Div>
        </Div>

        {/* Dynamic Table Card */}
        <Div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <Table cols={[200, 110, 120, 96]} className="w-full text-left border-collapse">
              <Thead>
                <Tr className="bg-slate-50/50 border-b border-slate-100">
                  <Th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest">Country Name</Th>
                  <Th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest text-center">Icon</Th>
                  <Th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest text-center">Status</Th>
                  <Th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Action</Th>
                </Tr>
              </Thead>
              <Tbody className="divide-y divide-slate-50">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <Tr key={i} className="animate-pulse">
                      <Td colSpan="4" className="px-8 py-6">
                        <Div className="h-4 bg-slate-100 rounded w-full"></Div>
                      </Td>
                    </Tr>
                  ))
                ) : countries.length > 0 ? (
                  countries.map((country) => (
                    <Tr key={country._id} className="hover:bg-slate-50/50 transition-colors group">
                      <Td className="px-8 py-6">
                        <Span className="text-[14px] font-bold text-slate-700">{country.name}</Span>
                      </Td>
                      <Td className="px-8 py-6 text-center">
                        <Div className="w-10 h-10 rounded-full mx-auto overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center bg-slate-50">
                          {country.flag ? (
                            <Img src={country.flag} alt={country.name} className="w-full h-full object-cover" />
                          ) : (
                            <UiIcon as={Globe} size={18} className="text-slate-300" />
                          )}
                        </Div>
                      </Td>
                      <Td className="px-8 py-6 text-center">
                        <Button
                          onClick={() => toggleStatus(country._id, country.active)}
                          className={`w-11 h-6 rounded-full relative transition-all duration-300 mx-auto ${country.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <Div
                            className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${country.active ? 'right-1' : 'left-1'}`}
                          />
                        </Button>
                      </Td>
                      <Td className="px-8 py-6 text-right">
                        <Div className="flex items-center justify-end gap-2 px-2">
                          <Button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all group/edit">
                            <UiIcon as={Edit} size={18} className="group-hover/edit:scale-110 transition-transform" />
                          </Button>
                        </Div>
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan="4" className="px-8 py-20 text-center">
                      <Div className="flex flex-col items-center gap-2">
                        <UiIcon as={XCircle} className="text-slate-200" size={48} />
                        <P className="text-slate-400 font-bold uppercase tracking-widest text-[12px]">No countries indexed in database</P>
                      </Div>
                    </Td>
                  </Tr>
                )}
              </Tbody>
          </Table>

          {/* Pagination Footer */}
          <Div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <Span className="text-[12px] font-bold text-slate-400">
              Showing <Span className="text-slate-700">{countries.length}</Span> of <Span className="text-slate-700">{pagination.total}</Span> entries
            </Span>
            <Div className="flex items-center gap-1">
              <Button
                disabled={pagination.current_page === 1}
                onClick={() => fetchCountries(pagination.current_page - 1)}
                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-50 transition-all font-bold"
              >
                Prev
              </Button>
              {[...Array(pagination.last_page)].map((_, i) => (
                <Button
                  key={i}
                  onClick={() => fetchCountries(i + 1)}
                  className={`min-w-[40px] h-10 rounded-xl text-[13px] font-black transition-all ${pagination.current_page === i + 1 ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600'}`}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                disabled={pagination.current_page === pagination.last_page}
                onClick={() => fetchCountries(pagination.current_page + 1)}
                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-50 transition-all font-bold"
              >
                Next
              </Button>
            </Div>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default CountryManagement;
