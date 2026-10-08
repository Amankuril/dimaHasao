/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/finance/Finance.jsx (tools/port.js first pass). */
import React from 'react';
import { useWindowDimensions } from 'react-native';
import { TrendingUp, Download, Clock, BarChart4, Wallet, ShieldCheck, Users } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import {
  A,
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  LoadingState,
  TableSkeleton,
  EmptyState,
  ErrorState,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../../admin/ui';
import { Button, Div, HScroll, Span, Icon as UiIcon } from '../../../../../components/web';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TREND = [40, 60, 45, 90, 65, 80, 50, 70, 85, 40, 55, 95];
const CHANNELS = [
  { label: 'UPI Instant', value: 82, color: A.primary },
  { label: 'Bank Transfer', value: 15, color: A.info },
  { label: 'Cash Remittance', value: 3, color: A.warning },
];
const COLS = [150, 170, 110, 120, 140];

const Finance = () => {
  const [settlements, setSettlements] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(null);
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(240, width - 64);
  const slot = Math.max(30, Math.floor(chartWidth / MONTHS.length));

  const fetchFinance = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await adminService.getWithdrawals();
      const results = response?.data?.results || [];
      const mapped = results.map((w) => ({
        id: w.transactionId || `#WTH${Math.floor(Math.random() * 1000)}`,
        driver: w.driver_id?.name || 'Unknown Driver',
        amount: `₹${w.amount || 0}`,
        method: w.payment_method || 'Bank Transfer',
        status: w.status ? w.status.charAt(0).toUpperCase() + w.status.slice(1) : 'Pending',
        date: w.createdAt ? new Date(w.createdAt).toLocaleDateString() : 'N/A',
      }));
      setSettlements(mapped);
    } catch (error) {
      console.error('Failed to load withdrawals', error);
      setLoadError(error?.message || 'Failed to load withdrawals');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchFinance();
  }, [fetchFinance]);

  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Wallet}
        title="Financial Management"
        subtitle="Net revenue, commissions and payouts"
        breadcrumb={[{ label: 'Taxi' }, { label: 'Finance' }]}
        actions={
          <>
            <Button className={BTN_PRIMARY}>
              <UiIcon as={Wallet} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Process payouts</Span>
            </Button>
            <Button className={BTN_SECONDARY}>
              <UiIcon as={Download} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Tax reports</Span>
            </Button>
          </>
        }
      />

      <StatGrid className="mb-4">
        <StatCard label="Total net revenue" value="₹12.4L" hint="+12.4% vs last month" icon={TrendingUp} tone="success" />
        <StatCard label="Platform commission" value="₹2.8L" hint="+5.2% · avg 15%" icon={BarChart4} tone="info" />
        <StatCard label="Driver earnings" value="₹9.6L" hint="84.2% of GTV" icon={Users} tone="info" />
        <StatCard label="Pending payouts" value="₹42.5k" hint="12 requests unprocessed" icon={Clock} tone="warning" />
      </StatGrid>

      <Card className="mb-4">
        <SectionTitle
          action={
            <Div className="flex-row items-center gap-2">
              <Button className="px-3 h-9 rounded-lg bg-slate-100 items-center justify-center">
                <Span className="text-xs font-semibold text-slate-700">30 days</Span>
              </Button>
              <Button className="px-3 h-9 rounded-lg items-center justify-center">
                <Span className="text-xs font-semibold text-slate-500">90 days</Span>
              </Button>
            </Div>
          }
        >
          Revenue trending
        </SectionTitle>
        <HScroll contentClassName="flex-row items-end gap-1">
          <Div className="flex-row items-end" style={{ width: slot * MONTHS.length }}>
            {TREND.map((h, i) => (
              <Div key={MONTHS[i]} style={{ width: slot, height: 200 }} className="items-center justify-end gap-2 px-1">
                <Div
                  className="rounded-t-lg"
                  style={{ width: '100%', height: Math.round((h / 100) * 170), backgroundColor: i === TREND.length - 1 ? A.primary : A.surfaceMuted }}
                />
                <Span className="text-[11px] font-semibold" style={{ color: A.textMuted }} numberOfLines={1}>
                  {MONTHS[i]}
                </Span>
              </Div>
            ))}
          </Div>
        </HScroll>
      </Card>

      <Card className="mb-4">
        <SectionTitle>Settlement quality</SectionTitle>
        <Div className="gap-4">
          {CHANNELS.map((chan) => (
            <Div key={chan.label} className="gap-1.5">
              <Div className="flex-row items-center justify-between gap-3">
                <Span className="text-sm text-slate-700 flex-1">{chan.label}</Span>
                <Span className="text-sm font-semibold text-slate-900">{chan.value}%</Span>
              </Div>
              <Div className="h-2 w-full rounded-full overflow-hidden bg-slate-100">
                <Div className="h-full rounded-full" style={{ width: `${chan.value}%`, backgroundColor: chan.color }} />
              </Div>
            </Div>
          ))}
        </Div>
        <Div className="flex-row items-start gap-2 mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <UiIcon as={ShieldCheck} size={16} className="text-green-700" />
          <Span className="text-xs text-slate-500 flex-1">
            All financial gateways are operational. Next batch settlement in 4h 22m.
          </Span>
        </Div>
      </Card>

      <SectionTitle
        action={
          <Button className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Full statement</Span>
          </Button>
        }
      >
        Recent settlements
      </SectionTitle>

      {isLoading ? (
        <>
          <LoadingState label="Loading settlements…" className="mb-3" />
          <TableSkeleton rows={4} />
        </>
      ) : loadError ? (
        <ErrorState title="Could not load settlements" message={loadError} onRetry={fetchFinance} />
      ) : settlements.length === 0 ? (
        <EmptyState
          title="No settlements yet"
          message="Driver withdrawals appear here once they are requested."
          actionLabel="Refresh"
          onAction={fetchFinance}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['Transaction ID', 'Driver', 'Amount', 'Status', 'Processed on']} />
          <TBody>
            {settlements.map((st, i) => (
              <Row key={`${st.id}-${i}`} last={i === settlements.length - 1}>
                <Cell width={COLS[0]} numberOfLines={1}>
                  <Span className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                    {st.id}
                  </Span>
                </Cell>
                <Cell width={COLS[1]}>{st.driver}</Cell>
                <Cell width={COLS[2]}>
                  <Span className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                    {st.amount}
                  </Span>
                </Cell>
                <Cell width={COLS[3]}>
                  <StatusBadge status={st.status} />
                </Cell>
                <Cell width={COLS[4]} align="right" numberOfLines={1}>
                  {st.date}
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}
    </AdminPage>
  );
};
export default Finance;
