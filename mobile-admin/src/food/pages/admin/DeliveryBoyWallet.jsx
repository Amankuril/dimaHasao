/* Ported from Frontend/src/modules/Food/pages/admin/DeliveryBoyWallet.jsx (tools/port.js first pass). */
import { useState, useEffect, useCallback } from 'react';
import { Search, PiggyBank, Loader2, Package, RefreshCw } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import { Button, Div, H1, H2, Input, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../components/web';
const debugError = (...args) => {};
const formatCurrency = (amount) => {
  if (amount == null) return '₹0.00';
  return `₹${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
export default function DeliveryBoyWallet() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [summary, setSummary] = useState(null);
  const limit = 20;
  const fetchWallets = useCallback(
    async (overrides = {}) => {
      const p = overrides.page ?? page;
      const q = overrides.search !== undefined ? overrides.search : searchQuery;
      const silent = overrides.silent ?? false;
      try {
        if (!silent) setLoading(true);
        const res = await adminAPI.getDeliveryWallets({
          search: q.trim() || undefined,
          page: p,
          limit,
        });
        if (res?.data?.success) {
          const data = res.data.data;
          setWallets(data?.wallets || []);
          setTotal(data?.pagination?.total || 0);
          setPages(data?.pagination?.pages || 1);
          setSummary(data?.summary || null);
        } else {
          if (!silent) toast.error(res?.data?.message || 'Failed to fetch delivery boy wallets');
          setWallets([]);
        }
      } catch (err) {
        debugError('Error fetching delivery boy wallets:', err);
        if (!silent) toast.error(err?.response?.data?.message || 'Failed to fetch delivery boy wallets');
        setWallets([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, searchQuery],
  );
  useEffect(() => {
    fetchWallets();
    const interval = setInterval(() => {
      fetchWallets({
        silent: true,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchWallets]);
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchWallets({
        page: 1,
        search: searchQuery,
      });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);
  const sumField = (key, fallback = 0) => wallets.reduce((acc, w) => acc + Number(w?.[key] ?? fallback), 0);
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-full mx-auto">
        {/* Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center justify-between">
            <Div className="flex items-center gap-3">
              <UiIcon as={PiggyBank} className="w-5 h-5 text-emerald-600" />
              <H1 className="text-2xl font-bold text-slate-900">Delivery Boy Wallet</H1>
            </Div>
            <Button
              onClick={() => fetchWallets()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <UiIcon as={RefreshCw} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </Div>
          <P className="text-sm text-slate-600 mt-1">
            Cash Collected = lifetime COD. Cash Deposited = amount already paid/settled. Cash In Hand = still unsettled.
          </P>
        </Div>

        {/* Stats Summary Cards */}
        <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 mb-6">
          {[
            {
              label: 'Remaining Cash Limit',
              value: summary?.totalRemainingCashLimit ?? sumField('remainingCashLimit'),
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
            },
            {
              label: 'Cash Collected (lifetime)',
              value: summary?.totalCashCollected ?? sumField('cashCollected'),
              color: 'text-blue-600',
              bg: 'bg-blue-50',
            },
            {
              label: 'Cash Deposited (paid)',
              value: summary?.totalCashDeposited ?? sumField('cashDeposited'),
              color: 'text-teal-600',
              bg: 'bg-teal-50',
            },
            {
              label: 'Cash In Hand',
              value: summary?.totalCashInHand ?? sumField('cashInHand'),
              color: 'text-rose-600',
              bg: 'bg-rose-50',
            },
            {
              label: 'Total Earning',
              value: summary?.totalEarning ?? sumField('totalEarning'),
              color: 'text-slate-900',
              bg: 'bg-slate-100',
            },
            {
              label: 'Bonus',
              value: summary?.totalBonus ?? sumField('bonus'),
              color: 'text-violet-600',
              bg: 'bg-violet-50',
            },
            {
              label: 'Total Withdrawn',
              value: summary?.totalWithdrawn ?? sumField('totalWithdrawn'),
              color: 'text-orange-600',
              bg: 'bg-orange-50',
            },
          ].map((stat, i) => (
            <Div key={i} className={`${stat.bg} rounded-xl border border-slate-200 p-4 shadow-sm`}>
              <P className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{stat.label}</P>
              <P className={`text-lg font-bold ${stat.color}`}>{formatCurrency(stat.value)}</P>
            </Div>
          ))}
        </Div>

        {/* Table Card */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="flex items-center gap-2">
              <H2 className="text-xl font-bold text-slate-900">Wallets</H2>
              <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 flex items-center justify-center min-w-[2.5rem] h-7">
                {loading ? <Span className="w-5 h-3 rounded bg-slate-300/80 animate-pulse" /> : total}
              </Span>
            </Div>
            <Div className="relative flex-1 sm:flex-initial min-w-[200px] max-w-xs">
              <Input
                type="text"
                placeholder="Search by name or phone"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              />
              <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </Div>
          </Div>

          {loading ? (
            <Div className="py-20 text-center">
              <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
              <P className="text-slate-600">Loading wallets…</P>
            </Div>
          ) : (
            <Table cols={[56, 170, 130, 130, 120, 130, 140, 120, 120, 100, 110]} className="w-full">
                <Thead className="bg-slate-50 border-b border-slate-200">
                  <Tr>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">#</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Name</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Phone</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Remaining Limit</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Pocket Balance</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Cash Collected</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Cash Deposited</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Cash In Hand</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Total Earning</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Bonus</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Withdrawn</Th>
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {wallets.length === 0 ? (
                    <Tr>
                      <Td colSpan={11} className="px-6 py-20 text-center">
                        <Div className="flex flex-col items-center justify-center">
                          <UiIcon as={Package} className="w-16 h-16 text-slate-400 mb-4" />
                          <P className="text-lg font-semibold text-slate-700">No wallets found</P>
                          <P className="text-sm text-slate-500 mt-1">{searchQuery ? `No results for "${searchQuery}"` : 'No approved delivery boys found.'}</P>
                        </Div>
                      </Td>
                    </Tr>
                  ) : (
                    wallets.map((w, i) => {
                      const remaining = Number(w.remainingCashLimit ?? w.availableCashLimit ?? 0);
                      const pocket = Number(w.pocketBalance ?? 0);
                      const collected = Number(w.cashCollected ?? 0);
                      const deposited = Number(w.cashDeposited ?? 0);
                      const cashInHand = Number(w.cashInHand ?? Math.max(0, collected - deposited));
                      const earning = Number(w.totalEarning ?? 0);
                      const bonus = Number(w.bonus ?? 0);
                      const withdrawn = Number(w.totalWithdrawn ?? 0);
                      const isSettled = deposited > 0 && cashInHand <= 0;
                      return (
                        <Tr key={w.walletId || w.deliveryId || i} className="hover:bg-slate-50 transition-colors">
                          <Td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{(page - 1) * limit + i + 1}</Td>
                          <Td className="px-4 py-4 whitespace-nowrap">
                            <Span className="text-sm font-semibold text-slate-800">{w.name || '—'}</Span>
                          </Td>
                          <Td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{w.phone || w.deliveryIdString || '—'}</Td>
                          <Td className="px-4 py-4 whitespace-nowrap">
                            <Span className={`text-sm font-semibold ${remaining <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(remaining)}</Span>
                          </Td>
                          <Td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{formatCurrency(pocket)}</Td>
                          <Td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{formatCurrency(collected)}</Td>
                          <Td className="px-4 py-4 whitespace-nowrap">
                            <Div className="flex flex-col gap-1">
                              <Span className="text-sm font-medium text-teal-700">{formatCurrency(deposited)}</Span>
                              {deposited > 0 && (
                                <Span
                                  className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-bold ${isSettled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                                >
                                  {isSettled ? 'Fully paid' : 'Partially paid'}
                                </Span>
                              )}
                            </Div>
                          </Td>
                          <Td className="px-4 py-4 whitespace-nowrap">
                            <Span className={`text-sm font-semibold ${cashInHand > 0 ? 'text-rose-600' : 'text-slate-700'}`}>{formatCurrency(cashInHand)}</Span>
                          </Td>
                          <Td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{formatCurrency(earning)}</Td>
                          <Td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-violet-600">{formatCurrency(bonus)}</Td>
                          <Td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-orange-600">{formatCurrency(withdrawn)}</Td>
                        </Tr>
                      );
                    })
                  )}
                </Tbody>
            </Table>
          )}

          {pages > 1 && (
            <Div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
              <P className="text-sm text-slate-600">
                Page {page} of {pages} · {total} total
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
