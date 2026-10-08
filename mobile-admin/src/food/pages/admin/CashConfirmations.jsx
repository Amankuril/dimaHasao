/* Ported from Frontend/src/modules/Food/pages/admin/CashConfirmations.jsx (tools/port.js first pass). */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, CheckCircle2, Loader2, Package, RefreshCw, XCircle } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import { refreshSidebarBadges } from '../../components/admin/AdminSidebar';
import { useAdminBadgeListRefresh } from '../../hooks/useAdminBadgeListRefresh';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/shadcn';
import { AdminPage, PageHeader, Card, Toolbar, DataTable, THead, TBody, Row, Cell, StatusBadge, Pagination, TableSkeleton, EmptyState, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../../../admin/ui';
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../components/web';
import { document, window } from '../../../lib/webShim';
const formatCurrency = (amount) => {
  if (amount == null) return '\u20B90.00';
  return `\u20B9${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
const formatDateOnly = (value) => {
  if (!value) return '\u2014';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '\u2014';
  }
};
const TABS = [
  {
    key: 'all',
    label: 'All',
  },
  {
    key: 'pending',
    label: 'Pending',
  },
  {
    key: 'confirmed',
    label: 'Confirmed',
  },
];
export default function CashConfirmations() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedTx, setSelectedTx] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const limit = 20;
  const COLS = [56, 120, 170, 130, 110, 110, 120, 150];
  const searchDebounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const loadingRequestIdRef = useRef(0);
  const skipSearchEffectRef = useRef(true);
  const fetchConfirmations = useCallback(
    async ({ silent = false, page: pageOverride, search: searchOverride, tab: tabOverride } = {}) => {
      const requestId = ++requestIdRef.current;
      const p = pageOverride ?? page;
      const q = searchOverride !== undefined ? searchOverride : searchQuery;
      const tab = tabOverride ?? activeTab;
      try {
        if (!silent) {
          setLoading(true);
          loadingRequestIdRef.current = requestId;
        }
        const res = await adminAPI.getCashConfirmations({
          search: q.trim() || undefined,
          tab,
          page: p,
          limit,
        });
        if (requestId !== requestIdRef.current) return;
        if (res?.data?.success) {
          const data = res.data.data;
          setTransactions(data?.transactions || []);
          setTotal(data?.pagination?.total || 0);
          setPages(data?.pagination?.pages || 1);
        } else if (!silent) {
          toast.error(res?.data?.message || 'Failed to fetch cash confirmations');
          setTransactions([]);
        }
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (!silent) {
          toast.error(err?.response?.data?.message || 'Failed to fetch cash confirmations');
          setTransactions([]);
        }
      } finally {
        // Silent badge/focus refreshes bump requestIdRef; don't leave the UI stuck on loading.
        if (!silent && loadingRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [activeTab, page, searchQuery],
  );
  useAdminBadgeListRefresh('cashConfirmations', fetchConfirmations, [fetchConfirmations]);
  useEffect(() => {
    fetchConfirmations();
  }, [fetchConfirmations]);
  useEffect(() => {
    if (skipSearchEffectRef.current) {
      skipSearchEffectRef.current = false;
      return;
    }
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      fetchConfirmations({
        page: 1,
        search: searchQuery,
        silent: true,
      });
    }, 400);
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, fetchConfirmations]);
  useEffect(() => {
    const onFocus = () =>
      fetchConfirmations({
        silent: true,
      });
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchConfirmations({
          silent: true,
        });
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchConfirmations]);
  const isPending = (tx) => String(tx?.rawStatus || tx?.status || '').toLowerCase() === 'pending';
  const handleSettlementAction = async (action) => {
    if (!selectedTx?.id) return;
    try {
      setProcessingAction(action);
      const res = await adminAPI.updateCashLimitSettlement(selectedTx.id, {
        action,
      });
      if (res?.data?.success) {
        toast.success(action === 'received' ? 'Cash received. Delivery partner limit updated.' : 'Marked as not received.');
        setSelectedTx(null);
        refreshSidebarBadges('cashConfirmations');
        fetchConfirmations({
          silent: true,
        });
      } else {
        toast.error(res?.data?.message || 'Failed to update confirmation');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update confirmation');
    } finally {
      setProcessingAction(null);
    }
  };
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setPage(1);
    fetchConfirmations({
      tab: tabKey,
      page: 1,
    });
  };
  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    fetchConfirmations({
      page: nextPage,
      silent: true,
    });
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={CheckCircle2}
        title="Cash confirmations"
        subtitle="Cash submissions need admin confirmation before a delivery partner's limit is restored."
        breadcrumb={[{ label: 'Food' }, { label: 'Delivery' }, { label: 'Cash confirmations' }]}
        actions={
          <Button onClick={() => fetchConfirmations()} disabled={loading} className={BTN_SECONDARY}>
            <UiIcon as={RefreshCw} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Refresh</Span>
          </Button>
        }
      />
      <Card className="mb-3">
        <Toolbar className="mb-0">
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`h-11 px-4 rounded-lg border items-center justify-center ${activeTab === tab.key ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
            >
              <Span className={`text-sm font-semibold ${activeTab === tab.key ? 'text-white' : 'text-slate-700'}`}>{tab.label}</Span>
            </Button>
          ))}
        </Toolbar>
        <Div className="flex-row items-center gap-2 mt-3">
          <UiIcon as={Search} size={16} className="text-slate-400" />
          <Input
            type="text"
            placeholder="Search name or phone"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT} flex-1`}
          />
        </Div>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No cash submissions found"
          message={searchQuery ? `No results for “${searchQuery}”` : 'No manual cash submissions yet.'}
          actionLabel="Refresh"
          onAction={() => fetchConfirmations()}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['S.No', 'Date', 'Delivery boy', 'Phone', 'Amount', 'Method', 'Status', 'Action']} />
          <TBody>
            {transactions.map((tx, i) => (
              <Row key={tx.id || i} last={i === transactions.length - 1}>
                <Cell width={COLS[0]}>{String((page - 1) * limit + i + 1)}</Cell>
                <Cell width={COLS[1]}>{formatDateOnly(tx.createdAt)}</Cell>
                <Cell width={COLS[2]}>
                  <Span className="text-sm font-semibold text-slate-900">{tx.deliveryName || '—'}</Span>
                </Cell>
                <Cell width={COLS[3]}>{tx.deliveryPhone || '—'}</Cell>
                <Cell width={COLS[4]} align="right">
                  <Span className="text-sm font-semibold text-slate-900">{formatCurrency(tx.amount)}</Span>
                </Cell>
                <Cell width={COLS[5]}>{tx.paymentMethod || 'Cash'}</Cell>
                <Cell width={COLS[6]}>
                  <StatusBadge status={tx.status || 'Pending'} label={String(tx.status || 'Pending')} />
                </Cell>
                <Cell width={COLS[7]}>
                  {isPending(tx) ? (
                    <Button type="button" onClick={() => setSelectedTx(tx)} className={BTN_PRIMARY}>
                      <Span className={BTN_TEXT_PRIMARY}>Confirm</Span>
                    </Button>
                  ) : (
                    <StatusBadge
                      status={tx.actionLabel === 'Received' ? 'received' : 'rejected'}
                      tone={tx.actionLabel === 'Received' ? 'success' : 'danger'}
                      label={tx.actionLabel || '—'}
                    />
                  )}
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      {pages > 1 ? (
        <Pagination page={page} pages={pages} total={total} onPrev={() => handlePageChange(Math.max(1, page - 1))} onNext={() => handlePageChange(Math.min(pages, page + 1))} />
      ) : null}

      <Dialog open={Boolean(selectedTx)} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="sm:max-w-lg w-[calc(100%-2rem)] p-0 border border-slate-200 bg-white gap-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200 text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Confirm cash submission</DialogTitle>
            {selectedTx ? (
              <Span className="text-sm text-slate-700 mt-1">
                Have you received {formatCurrency(selectedTx.amount)} cash from {selectedTx.deliveryName || 'this delivery partner'}?
              </Span>
            ) : null}
          </DialogHeader>

          {selectedTx ? (
            <Div className="px-4 py-4 gap-3">
              <Div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 items-center">
                <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</Span>
                <Span className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(selectedTx.amount)}</Span>
              </Div>

              <Div className="rounded-xl border border-slate-200 overflow-hidden">
                {[
                  ['Delivery boy', selectedTx.deliveryName || '—'],
                  ['Phone', selectedTx.deliveryPhone || '—'],
                  ['Date', formatDateOnly(selectedTx.createdAt)],
                  ['Method', selectedTx.paymentMethod || 'Cash'],
                ].map(([label, value], i, arr) => (
                  <Div key={label} className={`flex-row items-center justify-between gap-3 px-4 py-3 bg-white ${i === arr.length - 1 ? '' : 'border-b border-slate-100'}`}>
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500 shrink-0">{label}</Span>
                    <Span className="text-sm font-semibold text-slate-900 flex-1 text-right">{value}</Span>
                  </Div>
                ))}
              </Div>

              <Span className="text-xs text-slate-500">
                Confirm only after you have physically received this cash. Choosing Received restores the partner&apos;s available cash limit instantly.
              </Span>
            </Div>
          ) : null}

          <DialogFooter className="px-4 py-3 bg-slate-50 border-t border-slate-200 gap-2 flex-col sm:flex-row">
            <Button type="button" disabled={Boolean(processingAction)} onClick={() => handleSettlementAction('received')} className={`${BTN_PRIMARY} flex-1`}>
              <UiIcon as={processingAction === 'received' ? Loader2 : CheckCircle2} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Received</Span>
            </Button>
            <Button type="button" disabled={Boolean(processingAction)} onClick={() => handleSettlementAction('not_received')} className={`${BTN_DANGER} flex-1`}>
              <UiIcon as={processingAction === 'not_received' ? Loader2 : XCircle} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Not received</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
