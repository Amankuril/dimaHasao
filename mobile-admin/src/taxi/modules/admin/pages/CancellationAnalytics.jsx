/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/CancellationAnalytics.jsx. */
import { useEffect, useState } from 'react';
import { Ban, TrendingDown, UserX, Car, IndianRupee, ShieldAlert, AlertTriangle, RefreshCw, Clock } from 'lucide-react-native';
import api from '../../../shared/api/axiosInstance';
import { toast } from '../../../../lib/notify';
import { Button, Div, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import {
  A,
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  StatusBadge,
  EmptyState,
  ErrorState,
  TableSkeleton,
  useLayoutWidth,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';

const BREADCRUMB = [{ label: 'Taxi' }, { label: 'Safety' }, { label: 'Cancellations' }];

const STAGES = [
  { key: 'searching', label: 'Searching', hint: 'Before driver acceptance' },
  { key: 'accepted', label: 'Accepted', hint: 'Driver on the way' },
  { key: 'arrived', label: 'Arrived', hint: 'At pickup location' },
];

export default function CancellationAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { tablet } = useLayoutWidth();
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/cancellation-analytics');
      if (response.data?.success) {
        setData(response.data.data);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to fetch cancellation analytics');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAnalytics();
  }, []);
  const header = (
    <PageHeader
      icon={Ban}
      title="Ride Cancellation Analytics"
      subtitle="Breakdown of ride cancellations, driver misconduct flags and revenue impact."
      breadcrumb={BREADCRUMB}
      actions={
        <Button onClick={fetchAnalytics} className={BTN_SECONDARY} accessibilityLabel="Refresh analytics">
          <UiIcon as={RefreshCw} size={16} className="text-slate-600" />
          <Span className={BTN_TEXT_SECONDARY}>Refresh</Span>
        </Button>
      }
    />
  );
  if (loading) {
    return (
      <AdminPage maxWidth={1200}>
        {header}
        <StatGrid className="mb-4">
          <TableSkeleton rows={2} />
          <TableSkeleton rows={2} />
        </StatGrid>
        <TableSkeleton rows={5} />
      </AdminPage>
    );
  }
  if (!data) {
    return (
      <AdminPage maxWidth={1200}>
        {header}
        <ErrorState title="Could not load cancellation analytics" message="The report did not come back. Check the connection and try again." onRetry={fetchAnalytics} />
      </AdminPage>
    );
  }
  const {
    totalRidesCount = 0,
    totalCancelledRides = 0,
    cancellationRate = 0,
    customerCancellations = 0,
    driverCancellations = 0,
    totalRevenueLost = 0,
    totalCancellationFeesCollected = 0,
    reasonsBreakdown = [],
    stageBreakdown = {},
    topDriverCancellations = [],
    flaggedRides = [],
  } = data || {};
  const share = (part) => (totalCancelledRides > 0 ? `${Math.round((part / totalCancelledRides) * 100)}% of all cancellations` : 'No cancellations yet');
  return (
    <AdminPage maxWidth={1200}>
      {header}

      <StatGrid className="mb-4">
        <StatCard label="Total cancelled rides" value={totalCancelledRides} hint={`${cancellationRate}% of ${totalRidesCount} ride requests`} icon={Ban} tone="danger" />
        <StatCard label="Customer cancellations" value={customerCancellations} hint={share(customerCancellations)} icon={UserX} tone="warning" />
        <StatCard label="Driver cancellations" value={driverCancellations} hint={share(driverCancellations)} icon={Car} tone="warning" />
        <StatCard
          label="Est. revenue lost"
          value={`₹${totalRevenueLost.toLocaleString('en-IN')}`}
          hint={`₹${totalCancellationFeesCollected.toLocaleString('en-IN')} fees collected`}
          icon={IndianRupee}
          tone="danger"
        />
      </StatGrid>

      {flaggedRides.length > 0 ? (
        <Card className="mb-4">
          <SectionTitle action={<StatusBadge status="pending" label="Action required" />}>Flagged driver behaviour ({flaggedRides.length})</SectionTitle>
          <Div className="flex-row items-center gap-2 mb-3">
            <UiIcon as={ShieldAlert} size={16} className="text-red-600" />
            <Text style={tw`text-xs text-slate-500 flex-1`}>Cancellations a customer reported as misconduct.</Text>
          </Div>
          <Div className="gap-2">
            {flaggedRides.map((item, idx) => (
              <Div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3 gap-1">
                <Div className="flex-row items-start justify-between gap-3">
                  <Text style={tw`text-sm font-semibold text-slate-900 flex-1`} numberOfLines={2}>
                    {item.reason}
                  </Text>
                  <Text style={tw`text-xs text-slate-500`} numberOfLines={1}>
                    {new Date(item.cancelledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Div>
                {item.comment ? (
                  <Text style={tw`text-sm text-slate-700`} numberOfLines={3}>
                    “{item.comment}”
                  </Text>
                ) : null}
                <Text style={tw`text-xs text-slate-500`} numberOfLines={2}>
                  Customer: {item.customerName} ({item.customerPhone})
                </Text>
                <Text style={tw`text-xs text-slate-500`} numberOfLines={2}>
                  Driver: {item.driverName} ({item.driverPhone})
                </Text>
              </Div>
            ))}
          </Div>
        </Card>
      ) : null}

      <Div className={tablet ? 'grid grid-cols-2 gap-3' : 'gap-3'}>
        <Card>
          <SectionTitle>Most common cancellation reasons</SectionTitle>
          <Div className="flex-row items-center gap-2 mb-3">
            <UiIcon as={TrendingDown} size={16} className="text-slate-500" />
            <Text style={tw`text-xs text-slate-500 flex-1`}>Share of every cancelled ride.</Text>
          </Div>
          {reasonsBreakdown.length > 0 ? (
            <Div className="gap-3">
              {reasonsBreakdown.map((item, idx) => {
                const pct = totalCancelledRides > 0 ? Math.round((item.count / totalCancelledRides) * 100) : 0;
                return (
                  <Div key={idx} className="gap-1.5">
                    <Div className="flex-row items-start justify-between gap-3">
                      <Text style={tw`text-sm text-slate-700 flex-1`} numberOfLines={2}>
                        {item.reason}
                      </Text>
                      <Text style={tw`text-sm font-semibold text-slate-900`}>
                        {item.count} ({pct}%)
                      </Text>
                    </Div>
                    <Div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <Div className="h-2 rounded-full" style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: A.primary }} />
                    </Div>
                  </Div>
                );
              })}
            </Div>
          ) : (
            <EmptyState
              icon={TrendingDown}
              title="No cancellation reasons yet"
              message="Reasons appear here once riders or drivers cancel a trip."
              className="border-0 py-6 px-0"
            />
          )}
        </Card>

        <Div className="gap-3">
          <Card>
            <SectionTitle>Cancellation stage breakdown</SectionTitle>
            <Div className="flex-row items-center gap-2 mb-3">
              <UiIcon as={Clock} size={16} className="text-slate-500" />
              <Text style={tw`text-xs text-slate-500 flex-1`}>When in the trip the cancellation happened.</Text>
            </Div>
            <Div className="grid grid-cols-3 gap-2">
              {STAGES.map((stage) => (
                <Div key={stage.key} className="items-center rounded-lg border border-slate-200 bg-slate-50 p-3 gap-1">
                  <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500 text-center`} numberOfLines={1}>
                    {stage.label}
                  </Text>
                  <Text style={tw`text-xl font-bold text-slate-900`}>{stageBreakdown[stage.key] || 0}</Text>
                  <Text style={tw`text-xs text-slate-500 text-center`} numberOfLines={2}>
                    {stage.hint}
                  </Text>
                </Div>
              ))}
            </Div>
          </Card>

          {topDriverCancellations.length > 0 ? (
            <Card>
              <SectionTitle>Drivers with frequent cancellations</SectionTitle>
              <Div className="flex-row items-center gap-2 mb-3">
                <UiIcon as={AlertTriangle} size={16} className="text-slate-500" />
                <Text style={tw`text-xs text-slate-500 flex-1`}>Highest cancellation counts in the period.</Text>
              </Div>
              <Div className="gap-2">
                {topDriverCancellations.map((driver, idx) => (
                  <Div key={idx} className="flex-row items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
                    <Div className="flex-1 min-w-0">
                      <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={1}>
                        {driver.driverName}
                      </Text>
                      <Text style={tw`text-xs text-slate-500`} numberOfLines={1}>
                        {driver.driverPhone}
                      </Text>
                    </Div>
                    <StatusBadge tone="danger" label={`${driver.cancellationCount} cancellations`} />
                  </Div>
                ))}
              </Div>
            </Card>
          ) : null}
        </Div>
      </Div>
    </AdminPage>
  );
}
