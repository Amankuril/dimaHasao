/* Ported from Frontend/src/modules/Food/pages/admin/CashLimitSettlement.jsx (tools/port.js first pass). */
import { useCallback, useEffect, useState } from 'react';
import { Search, Receipt, Package, RefreshCw } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import { AdminPage, PageHeader, Card, Toolbar, DataTable, THead, TBody, Row, Cell, StatusBadge, Pagination, TableSkeleton, EmptyState, INPUT, BTN_SECONDARY, BTN_TEXT_SECONDARY } from '../../../admin/ui';
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../components/web';
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
  const COLS = [56, 140, 170, 130, 110, 110, 120, 170];
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
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Receipt}
        title="Cash limit settlement"
        subtitle="Delivery partner cash deposits (COD settlement). Completed means paid back to the company."
        breadcrumb={[{ label: 'Food' }, { label: 'Delivery' }, { label: 'Cash settlement' }]}
        actions={
          <Button onClick={() => fetchSettlements()} disabled={loading} className={BTN_SECONDARY}>
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
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
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
            placeholder="Search name, phone, or pay_ id"
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
          title="No settlements found"
          message={searchQuery ? `No results for “${searchQuery}”` : 'No cash deposit records yet.'}
          actionLabel="Refresh"
          onAction={() => fetchSettlements()}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['S.No', 'Date', 'Delivery boy', 'Phone', 'Amount', 'Method', 'Status', 'Payment ID']} />
          <TBody>
            {transactions.map((tx, i) => (
              <Row key={tx.id || i} last={i === transactions.length - 1}>
                <Cell width={COLS[0]}>{String((page - 1) * limit + i + 1)}</Cell>
                <Cell width={COLS[1]}>{formatDate(tx.createdAt)}</Cell>
                <Cell width={COLS[2]}>
                  <Span className="text-sm font-semibold text-slate-900">{tx.deliveryName || '—'}</Span>
                </Cell>
                <Cell width={COLS[3]}>{tx.deliveryPhone || tx.deliveryIdString || '—'}</Cell>
                <Cell width={COLS[4]} align="right">
                  <Span className="text-sm font-semibold text-slate-900">{formatCurrency(tx.amount)}</Span>
                </Cell>
                <Cell width={COLS[5]}>{tx.paymentMethod || '—'}</Cell>
                <Cell width={COLS[6]}>
                  <StatusBadge status={tx.status} label={String(tx.status || '—')} />
                </Cell>
                <Cell width={COLS[7]}>{tx.razorpayPaymentId || 'N/A'}</Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      {pages > 1 ? (
        <Pagination page={page} pages={pages} total={total} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => Math.min(pages, p + 1))} />
      ) : null}
    </AdminPage>
  );
}
