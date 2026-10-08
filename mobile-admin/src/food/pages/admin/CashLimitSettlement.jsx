/* Ported from Frontend/src/modules/Food/pages/admin/CashLimitSettlement.jsx (tools/port.js first pass). */
import { useCallback, useEffect, useState } from 'react';
import { Search, Receipt, Loader2, Package, RefreshCw } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import { Button, Div, H1, Input, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../components/web';
const formatCurrency = (amount) => {
  if (amount == null) return '\u20B90.00';
  return `\u20B9${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
const formatDate = (value) => {
  if (!value) return '\u2014';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '\u2014';
  }
};
const TABS = [
  {
    key: 'All',
    label: 'All',
  },
  {
    key: 'Completed',
    label: 'Paid / Completed',
  },
  {
    key: 'Pending',
    label: 'Pending',
  },
  {
    key: 'Failed',
    label: 'Failed',
  },
];
export default function CashLimitSettlement() {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const fetchSettlements = useCallback(
    async (overrides = {}) => {
      const p = overrides.page ?? page;
      const q = overrides.search !== undefined ? overrides.search : searchQuery;
      const status = overrides.status ?? activeTab;
      try {
        setLoading(true);
        const res = await adminAPI.getCashLimitSettlements({
          search: q.trim() || undefined,
          status: status === 'All' ? undefined : status,
          page: p,
          limit,
        });
        if (res?.data?.success) {
          const data = res.data.data;
          setTransactions(data?.transactions || []);
          setTotal(data?.pagination?.total || 0);
          setPages(data?.pagination?.pages || 1);
        } else {
          toast.error(res?.data?.message || 'Failed to fetch cash limit settlements');
          setTransactions([]);
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to fetch cash limit settlements');
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, page, searchQuery],
  );
  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchSettlements({
        page: 1,
        search: searchQuery,
      });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);
  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'completed') return 'bg-emerald-100 text-emerald-700';
    if (s === 'pending') return 'bg-amber-100 text-amber-700';
    if (s === 'failed') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-full mx-auto">
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center justify-between gap-4">
            <Div className="flex items-center gap-3">
              <UiIcon as={Receipt} className="w-5 h-5 text-emerald-600 shrink-0" />
              <Div>
                <H1 className="text-2xl font-bold text-slate-900">Cash Limit Settlement</H1>
                <P className="text-sm text-slate-600 mt-1">Delivery boy cash deposits (COD settlement). Completed = paid back to company.</P>
              </Div>
            </Div>
            <Button
              onClick={() => fetchSettlements()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <UiIcon as={RefreshCw} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </Div>
        </Div>

        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <Div className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <Button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${activeTab === tab.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                >
                  {tab.label}
                </Button>
              ))}
            </Div>
            <Div className="relative flex-1 lg:flex-initial min-w-[220px] max-w-sm">
              <Input
                type="text"
                placeholder="Search name, phone, or pay_ id"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </Div>
          </Div>

          {loading ? (
            <Div className="py-20 text-center">
              <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
              <P className="text-slate-600">Loading settlements...</P>
            </Div>
          ) : (
            <Table cols={[64, 150, 170, 130, 110, 110, 110, 180]} className="w-full">
                <Thead className="bg-slate-50 border-b border-slate-200">
                  <Tr>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">S.No</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Date</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Delivery Boy</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Phone</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Amount</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Method</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Status</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Payment ID</Th>
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {transactions.length === 0 ? (
                    <Tr>
                      <Td colSpan={8} className="px-6 py-20 text-center">
                        <Div className="flex flex-col items-center justify-center">
                          <UiIcon as={Package} className="w-16 h-16 text-slate-400 mb-4" />
                          <P className="text-lg font-semibold text-slate-700">No settlements found</P>
                          <P className="text-sm text-slate-500 mt-1">{searchQuery ? `No results for "${searchQuery}"` : 'No cash deposit records yet.'}</P>
                        </Div>
                      </Td>
                    </Tr>
                  ) : (
                    transactions.map((tx, i) => (
                      <Tr key={tx.id || i} className="hover:bg-slate-50 transition-colors">
                        <Td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{(page - 1) * limit + i + 1}</Td>
                        <Td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{formatDate(tx.createdAt)}</Td>
                        <Td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{tx.deliveryName || '\u2014'}</Td>
                        <Td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{tx.deliveryPhone || tx.deliveryIdString || '\u2014'}</Td>
                        <Td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-emerald-700">{formatCurrency(tx.amount)}</Td>
                        <Td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{tx.paymentMethod || '\u2014'}</Td>
                        <Td className="px-4 py-4 whitespace-nowrap">
                          <Span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadge(tx.status)}`}>{String(tx.status || '\u2014')}</Span>
                        </Td>
                        <Td className="px-4 py-4 whitespace-nowrap text-xs font-mono text-slate-500">{tx.razorpayPaymentId || 'N/A'}</Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
            </Table>
          )}

          {pages > 1 && (
            <Div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
              <P className="text-sm text-slate-600">
                Page {page} of {pages} &middot; {total} total
              </P>
              <Div className="flex gap-2">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </Button>
              </Div>
            </Div>
          )}
        </Div>
      </Div>
    </ScrollDiv>
  );
}
