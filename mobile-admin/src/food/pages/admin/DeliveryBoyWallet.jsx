/* Ported from Frontend/src/modules/Food/pages/admin/DeliveryBoyWallet.jsx (tools/port.js first pass). */
import { useState, useEffect, useCallback } from 'react';
import { Search, PiggyBank, Package, RefreshCw } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import { AdminPage, PageHeader, Card, SectionTitle, StatCard, DataTable, THead, TBody, Row, Cell, StatusBadge, Pagination, TableSkeleton, EmptyState, INPUT, BTN_SECONDARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../admin/ui';
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../components/web';
const debugError = (...args) => {};
const formatCurrency = (amount) => {
  if (amount == null) return '₹0.00';
  return `₹${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
export default function DeliveryBoyWallet() {
  const { width, columns } = useLayoutWidth();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [summary, setSummary] = useState(null);
  const limit = 20;
  const PAGE_MAX = 1200;
  const COLS = [52, 170, 130, 130, 120, 130, 150, 120, 120, 100, 110];
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
  const contentWidth = Math.min(width, PAGE_MAX) - 32;
  const statWidth = columns > 1 ? (contentWidth - 12 * (columns - 1)) / columns : contentWidth;
  const stats = [
    { label: 'Remaining cash limit', value: summary?.totalRemainingCashLimit ?? sumField('remainingCashLimit'), tone: 'success' },
    { label: 'Cash collected (lifetime)', value: summary?.totalCashCollected ?? sumField('cashCollected'), tone: 'info' },
    { label: 'Cash deposited (paid)', value: summary?.totalCashDeposited ?? sumField('cashDeposited'), tone: 'success' },
    { label: 'Cash in hand', value: summary?.totalCashInHand ?? sumField('cashInHand'), tone: 'danger' },
    { label: 'Total earning', value: summary?.totalEarning ?? sumField('totalEarning'), tone: 'neutral' },
    { label: 'Bonus', value: summary?.totalBonus ?? sumField('bonus'), tone: 'info' },
    { label: 'Total withdrawn', value: summary?.totalWithdrawn ?? sumField('totalWithdrawn'), tone: 'warning' },
  ];
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={PiggyBank}
        title="Delivery boy wallet"
        subtitle="Cash collected is lifetime COD; cash deposited is already settled; cash in hand is still unsettled."
        breadcrumb={[{ label: 'Food' }, { label: 'Delivery' }, { label: 'Wallets' }]}
        actions={
          <Button onClick={() => fetchWallets()} disabled={loading} className={BTN_SECONDARY}>
            <UiIcon as={RefreshCw} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Refresh</Span>
          </Button>
        }
      />
      {/* The kit's StatGrid relies on grid classes, which native drops: measure the columns instead. */}
      <Div className="flex-row flex-wrap gap-3 mb-4">
        {stats.map((stat) => (
          <Div key={stat.label} style={{ width: statWidth }}>
            <StatCard label={stat.label} value={formatCurrency(stat.value)} tone={stat.tone} />
          </Div>
        ))}
      </Div>

      <Card className="mb-3">
        <SectionTitle>{loading ? 'Wallets' : `Wallets · ${total}`}</SectionTitle>
        <Div className="flex-row items-center gap-2">
          <UiIcon as={Search} size={16} className="text-slate-400" />
          <Input
            type="text"
            placeholder="Search by name or phone"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT} flex-1`}
          />
        </Div>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : wallets.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No wallets found"
          message={searchQuery ? `No results for “${searchQuery}”` : 'No approved delivery boys found.'}
          actionLabel="Refresh"
          onAction={() => fetchWallets()}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead
            cols={COLS}
            labels={['#', 'Name', 'Phone', 'Remaining limit', 'Pocket balance', 'Cash collected', 'Cash deposited', 'Cash in hand', 'Total earning', 'Bonus', 'Withdrawn']}
          />
          <TBody>
            {wallets.map((w, i) => {
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
                <Row key={w.walletId || w.deliveryId || i} last={i === wallets.length - 1}>
                  <Cell width={COLS[0]}>{String((page - 1) * limit + i + 1)}</Cell>
                  <Cell width={COLS[1]}>
                    <Span className="text-sm font-semibold text-slate-900">{w.name || '—'}</Span>
                  </Cell>
                  <Cell width={COLS[2]}>{w.phone || w.deliveryIdString || '—'}</Cell>
                  <Cell width={COLS[3]} align="right">
                    <Span className={`text-sm font-semibold ${remaining <= 0 ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(remaining)}</Span>
                  </Cell>
                  <Cell width={COLS[4]} align="right">{formatCurrency(pocket)}</Cell>
                  <Cell width={COLS[5]} align="right">{formatCurrency(collected)}</Cell>
                  <Cell width={COLS[6]} align="right">
                    <Div className="items-end gap-1">
                      <Span className="text-sm text-slate-700">{formatCurrency(deposited)}</Span>
                      {deposited > 0 ? <StatusBadge status={isSettled ? 'paid' : 'partial'} label={isSettled ? 'Fully paid' : 'Partially paid'} /> : null}
                    </Div>
                  </Cell>
                  <Cell width={COLS[7]} align="right">
                    <Span className={`text-sm font-semibold ${cashInHand > 0 ? 'text-red-600' : 'text-slate-700'}`}>{formatCurrency(cashInHand)}</Span>
                  </Cell>
                  <Cell width={COLS[8]} align="right">
                    <Span className="text-sm font-semibold text-slate-900">{formatCurrency(earning)}</Span>
                  </Cell>
                  <Cell width={COLS[9]} align="right">{formatCurrency(bonus)}</Cell>
                  <Cell width={COLS[10]} align="right">{formatCurrency(withdrawn)}</Cell>
                </Row>
              );
            })}
          </TBody>
        </DataTable>
      )}

      {pages > 1 ? (
        <Pagination page={page} pages={pages} total={total} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => Math.min(pages, p + 1))} />
      ) : null}
    </AdminPage>
  );
}
