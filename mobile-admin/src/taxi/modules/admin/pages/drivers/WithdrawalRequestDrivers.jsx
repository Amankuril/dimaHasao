/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/WithdrawalRequestDrivers.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Eye, FileSearch, QrCode, Search } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { Button, Div, H1, Input, Option, P, ScrollDiv, Select, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../../components/web';
const BASE = () => `${globalThis.__LEGACY_BACKEND_ORIGIN__}/api/v1/admin/wallet/drivers/withdrawals`;
const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN');
};
const WithdrawalRequestDrivers = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [paginator, setPaginator] = useState(null);
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
  const totalPages = useMemo(() => Math.max(1, Number(paginator?.last_page || 1)), [paginator]);
  const safePage = useMemo(() => Math.min(Math.max(1, page), totalPages), [page, totalPages]);
  const totalEntries = useMemo(() => Number(paginator?.total || 0), [paginator]);
  const perPage = useMemo(() => Number(paginator?.per_page || itemsPerPage), [paginator, itemsPerPage]);
  const startIndex = useMemo(() => (safePage - 1) * perPage, [safePage, perPage]);
  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = totalEntries === 0 ? 0 : Math.min(startIndex + rows.length, totalEntries);
  return (
    <ScrollDiv className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6 font-sans text-gray-900">
      <Div className="mb-6">
        <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Span>Driver Wallet</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700">Withdrawal Request Drivers</Span>
        </Div>
        <Div className="flex items-center justify-between">
          <H1 className="text-xl text-gray-900 font-bold">Withdrawal Request Drivers</H1>
        </Div>
      </Div>

      <Div className="bg-white rounded-xl border border-gray-200">
        <Div className="p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Div className="flex items-center gap-2 text-sm text-gray-500">
            <Span>Show</Span>
            <Select
              value={itemsPerPage}
              onChange={(event) => setItemsPerPage(Number(event.target.value) || 10)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-colors"
            >
              {[10, 25, 50, 100].map((count) => (
                <Option key={count} value={count}>
                  {count}
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
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search..."
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-800 bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-colors"
            />
          </Div>
        </Div>

        <Div>
          <Table cols={[140, 180, 130, 150, 140, 150, 130, 110]} className="w-full text-left">
            <Thead className="bg-gray-50">
              <Tr className="text-xs font-semibold text-gray-500">
                <Th className="px-6 py-4">Date</Th>
                <Th className="px-6 py-4">Name</Th>
                <Th className="px-6 py-4">Driver Code</Th>
                <Th className="px-6 py-4">Mobile Number</Th>
                <Th className="px-6 py-4">Payout</Th>
                <Th className="px-6 py-4">Requested Amount</Th>
                <Th className="px-6 py-4">Status</Th>
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
                  <Tr key={item.driver_id} className="hover:bg-gray-50 transition-colors">
                    <Td className="px-6 py-4 text-sm text-gray-600">{formatDateTime(item.last_request_at)}</Td>
                    <Td className="px-6 py-4 text-sm text-gray-800">{item.driver?.name || 'Unknown'}</Td>
                    <Td className="px-6 py-4 text-sm font-medium">
                      <Span className="font-mono font-bold text-[10px] uppercase tracking-wider text-black bg-yellow-400 px-2 py-0.5 rounded shadow-sm">
                        {item.driver?.driver_code ||
                          item.driver?.referralCode ||
                          (item.driver?.mobile
                            ? `DRV${String(item.driver.mobile).slice(-4)}${String(item.driver_id || '')
                                .slice(-6)
                                .toUpperCase()}`.replace(/\W/g, '')
                            : 'N/A')}
                      </Span>
                    </Td>
                    <Td className="px-6 py-4 text-sm text-gray-600">{item.driver?.mobile || '-'}</Td>
                    <Td className="px-6 py-4 text-sm text-gray-600">
                      <Div className="space-y-1">
                        <Div className="font-semibold text-gray-800">
                          {item.driver?.bankDetails?.accountHolderName || item.driver?.bankDetails?.upiId || item.driver?.bankDetails?.accountNumber || '-'}
                        </Div>
                        <Div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          {item.driver?.bankDetails?.accountNumber ? <Span>A/C {item.driver.bankDetails.accountNumber}</Span> : null}
                          {item.driver?.bankDetails?.ifsc ? <Span>{item.driver.bankDetails.ifsc}</Span> : null}
                          {item.driver?.bankDetails?.branchName ? <Span>{item.driver.bankDetails.branchName}</Span> : null}
                          {item.driver?.bankDetails?.qrCodeImage ? (
                            <Span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700">
                              <UiIcon as={QrCode} size={12} />
                              QR
                            </Span>
                          ) : null}
                        </Div>
                      </Div>
                    </Td>
                    <Td className="px-6 py-4 text-sm text-gray-800">Rs {Number(item.pending_amount || 0).toFixed(2)}</Td>
                    <Td className="px-6 py-4 text-sm">
                      <Span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800">Requested</Span>
                    </Td>
                    <Td className="px-6 py-4 text-right">
                      <Button
                        type="button"
                        onClick={() =>
                          navigate(`/admin/drivers/wallet/withdrawals/${item.driver_id}${item.latest_request_id ? `?requestId=${item.latest_request_id}` : ''}`)
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                      >
                        <UiIcon as={Eye} size={16} />
                        View details
                      </Button>
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
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage <= 1}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Prev
            </Button>
            <Span className="px-3 py-2 bg-yellow-400 text-black shadow-sm font-bold rounded-lg text-sm">{safePage}</Span>
            <Button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
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
export default WithdrawalRequestDrivers;
