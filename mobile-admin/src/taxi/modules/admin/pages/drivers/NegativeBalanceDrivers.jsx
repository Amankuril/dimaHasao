/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/NegativeBalanceDrivers.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Eye, FileSearch, MoreHorizontal, Search } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { Button, Div, H1, Input, Option, P, ScrollDiv, Select, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';
const BASE = () => `${API_BASE_URL}/admin/wallet/drivers/negative-balance`;
const NegativeBalanceDrivers = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [rows, setRows] = useState([]);
  const [paginator, setPaginator] = useState(null);
  const [summary, setSummary] = useState({
    total_outstanding: 0,
  });
  const [loading, setLoading] = useState(true);
  const fetchRows = async ({ nextPage = page, nextLimit = itemsPerPage, nextSearch = searchTerm } = {}) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(nextLimit),
      });
      if (String(nextSearch || '').trim()) {
        params.set('search', String(nextSearch).trim());
      }
      const res = await fetch(`${BASE()}?${params.toString()}`, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRows(data.data?.results || []);
        setPaginator(data.data?.paginator || null);
        setSummary(
          data.data?.summary || {
            total_outstanding: 0,
          },
        );
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchRows({
      nextPage: 1,
      nextLimit: itemsPerPage,
      nextSearch: searchTerm,
    });
    setPage(1);
  }, [itemsPerPage]);
  useEffect(() => {
    const id = setTimeout(() => {
      fetchRows({
        nextPage: 1,
        nextLimit: itemsPerPage,
        nextSearch: searchTerm,
      });
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [searchTerm]);
  useEffect(() => {
    fetchRows({
      nextPage: page,
      nextLimit: itemsPerPage,
      nextSearch: searchTerm,
    });
  }, [page]);
  useEffect(() => {
    if (!activeMenuId) return undefined;
    const handle = () => setActiveMenuId(null);
    window.addEventListener('click', handle);
    return () => window.removeEventListener('click', handle);
  }, [activeMenuId]);
  const totalPages = useMemo(() => Math.max(1, Number(paginator?.last_page || 1)), [paginator]);
  const safePage = useMemo(() => Math.min(Math.max(1, page), totalPages), [page, totalPages]);
  const totalEntries = useMemo(() => Number(paginator?.total || 0), [paginator]);
  const perPage = useMemo(() => Number(paginator?.per_page || itemsPerPage), [paginator, itemsPerPage]);
  const startIndex = useMemo(() => (safePage - 1) * perPage, [safePage, perPage]);
  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = totalEntries === 0 ? 0 : Math.min(startIndex + rows.length, totalEntries);
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 p-6 lg:p-8 font-sans text-gray-900">
      <Div className="mb-6">
        <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Span>Driver Wallet</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700">Negative Balance Drivers</Span>
        </Div>
        <Div className="flex items-center justify-between gap-4">
          <H1 className="text-xl text-gray-900 font-bold">Negative Balance Drivers</H1>
          <Div className="text-sm text-gray-500">
            Total Outstanding: <Span className="font-semibold text-rose-600">₹ {Number(summary.total_outstanding || 0).toFixed(2)}</Span>
          </Div>
        </Div>
      </Div>

      <Div className="bg-white rounded-xl border border-gray-200">
        <Div className="p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Div className="flex items-center gap-2 text-sm text-gray-500">
            <Span>Show</Span>
            <Select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value) || 10)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
            >
              {[10, 25, 50, 100].map((n) => (
                <Option key={n} value={n}>
                  {n}
                </Option>
              ))}
            </Select>
            <Span>entries</Span>
          </Div>

          <Div className="relative w-full md:w-72">
            <UiIcon as={Search} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
            />
          </Div>
        </Div>

        <Div>
          <Table cols={[180, 130, 170, 200, 150, 150, 140, 110]} className="w-full text-left">
            {' '}
            <Thead className="bg-gray-50">
              <Tr className="text-xs font-semibold text-gray-500">
                <Th className="px-6 py-4">Name</Th>
                <Th className="px-6 py-4">Driver Code</Th>
                <Th className="px-6 py-4">Service Location</Th>
                <Th className="px-6 py-4">Email</Th>
                <Th className="px-6 py-4">Mobile Number</Th>
                <Th className="px-6 py-4">Transport Type</Th>
                <Th className="px-6 py-4">Approved Status</Th>
                <Th className="px-6 py-4 text-right">Action</Th>
              </Tr>
            </Thead>
            <Tbody className="divide-y divide-gray-100">
              {loading ? (
                <Tr>
                  <Td colSpan={8} className="px-6 py-16 text-center text-sm text-gray-400">
                    Loading...
                  </Td>
                </Tr>
              ) : rows.length === 0 ? (
                <Tr>
                  <Td colSpan={8} className="px-6 py-16 text-center">
                    <Div className="flex flex-col items-center gap-3 text-gray-400">
                      <UiIcon as={FileSearch} size={44} strokeWidth={1.5} />
                      <P className="text-sm font-medium">No Data Found</P>
                    </Div>
                  </Td>
                </Tr>
              ) : (
                rows.map((item) => (
                  <Tr key={item._id} className="hover:bg-gray-50 transition-colors">
                    <Td className="px-6 py-4 text-sm text-gray-800">{item.name || 'Unknown'}</Td>
                    <Td className="px-6 py-4 text-sm font-medium">
                      <Span className="font-mono font-semibold text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded shadow-sm border border-indigo-100">
                        {item.driver_code ||
                          item.referralCode ||
                          (item.mobile
                            ? `DRV${String(item.mobile).slice(-4)}${String(item._id || '')
                                .slice(-6)
                                .toUpperCase()}`.replace(/\W/g, '')
                            : 'N/A')}
                      </Span>
                    </Td>
                    <Td className="px-6 py-4 text-sm text-gray-600">{item.service_location_name || '-'}</Td>
                    <Td className="px-6 py-4 text-sm text-gray-600">{item.email || '-'}</Td>
                    <Td className="px-6 py-4 text-sm text-gray-600">{item.mobile || '-'}</Td>
                    <Td className="px-6 py-4 text-sm text-gray-600 capitalize">{item.transport_type || '-'}</Td>
                    <Td className="px-6 py-4 text-sm">
                      <Span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.approve ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                      >
                        {item.approve ? 'Approved' : 'Pending'}
                      </Span>
                    </Td>
                    <Td className="px-6 py-4 text-right">
                      <Div className="relative inline-flex items-center justify-end">
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId((current) => (current === item._id ? null : item._id));
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
                        >
                          <UiIcon as={MoreHorizontal} size={16} />
                        </Button>

                        {activeMenuId === item._id ? (
                          <Div
                            className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                navigate(`/taxi/admin/drivers/${item._id}`);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                            >
                              <UiIcon as={Eye} size={16} className="text-indigo-600" />
                              View
                            </Button>
                          </Div>
                        ) : null}
                      </Div>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Div>

        <Div className="p-4 border-t border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500">
          <Div>
            Showing {showingFrom} to {showingTo} of {totalEntries} entries
          </Div>
          <Div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Prev
            </Button>
            <Span className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm">{safePage}</Span>
            <Button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Next
            </Button>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default NegativeBalanceDrivers;
