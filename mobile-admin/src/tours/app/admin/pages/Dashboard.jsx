/* Ported from Frontend/src/modules/Tours/app/admin/pages/Dashboard.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import { Package, Calendar, Ticket, Star, MapPin, Tag } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { currency } from '../components/ui';
import {
  A,
  AdminPage,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  SectionTitle,
  StatCard,
  StatGrid,
  StatusBadge,
  useLayoutWidth,
  AXIS_TEXT,
  useChartWidth,
  chartSpacing,
} from '../../../../admin/ui';
import { toast } from '../../../../lib/notify';
import { Div, Link, P, Span, Icon as UiIcon } from '../../../../components/web';
const PIE_COLORS = ['#155DFC', '#008236', '#BB4D00', '#C10007', '#7C3AED', '#62748E'];

/** Month buckets come back as "2026-09" — render them the way a person reads a chart. */
const monthLabel = (key) => {
  const [y, m] = String(key || '').split('-');
  if (!y || !m) return key;
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', {
    month: 'short',
  });
};
const MiniStat = ({ icon: Icon, label, value, to }) => {
  const body = (
    <Card className="flex-row items-center gap-3">
      <Div className="w-10 h-10 rounded-lg bg-blue-100 items-center justify-center shrink-0">
        <UiIcon as={Icon} size={18} className="text-blue-600" />
      </Div>
      <Div className="flex-1 min-w-0">
        <P className="text-xl font-bold text-slate-900">{value}</P>
        <P className="text-xs text-slate-500 mt-0.5">{label}</P>
      </Div>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
};
const Dashboard = () => {
  const { columns } = useLayoutWidth();
  // Page gutter (16 × 2) + card padding (16 × 2).
  const chartWidth = useChartWidth(50, 1200);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    adminService
      .getDashboard()
      .then((d) => setStats(d.stats))
      .catch((e) => toast.error(e.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);
  if (loading)
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader title="Tours Overview" subtitle="Packages, bookings, festivals, tourist places, offers and reviews — the whole module at a glance." />
        <LoadingState label="Loading the overview…" />
      </AdminPage>
    );
  const s = stats || {};
  const revenueTrend = (s.revenueTrend || []).map((row) => ({
    name: monthLabel(row.name),
    value: row.value,
  }));
  const bookingStatusChart = Object.entries(s.bookingsByStatus || {}).map(([name, value]) => ({
    name,
    value,
  }));
  const festivalStatusEntries = Object.entries(s.festivalsByStatus || {});
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader title="Tours Overview" subtitle="Packages, bookings, festivals, tourist places, offers and reviews — the whole module at a glance." />

      {!stats ? (
        <EmptyState title="No overview yet" message="Nothing has been recorded for the tours module so far." />
      ) : (
        <>
          {/* Top-line counts for every entity in the sidebar */}
          <Div className={`grid grid-cols-${columns} gap-3 mb-4`}>
            <MiniStat icon={Package} label="Packages" value={s.packages ?? 0} to="/tours/admin/packages" />
            <MiniStat icon={Calendar} label="Bookings" value={s.bookings ?? 0} to="/tours/admin/bookings" />
            <MiniStat icon={Ticket} label="Festivals" value={s.festivals ?? 0} to="/tours/admin/festivals" />
            <MiniStat icon={MapPin} label="Tourist Places" value={s.destinations ?? 0} to="/tours/admin/destinations" />
            <MiniStat icon={Tag} label="Offers" value={s.offers ?? 0} to="/tours/admin/offers" />
            <MiniStat icon={Star} label="Reviews" value={s.reviews ?? 0} to="/tours/admin/reviews" />
          </Div>

          {/* Queues needing attention */}
          <StatGrid className="mb-4">
            <Link to="/tours/admin/packages?status=pending">
              <StatCard label="Awaiting review" value={`${s.pendingPackages ?? 0} packages`} tone="warning" hint="Tap to review them" />
            </Link>
            <Link to="/tours/admin/reviews">
              <StatCard label="Reviews to moderate" value={`${s.pendingReviews ?? 0} pending`} tone="warning" hint="Tap to moderate" />
            </Link>
          </StatGrid>

          {/* Money */}
          <StatGrid className="mb-4">
            <StatCard label="Gross booked (tours)" value={currency(s.gross)} tone="success" />
            <StatCard label="Confirmed revenue" value={currency(s.confirmedRevenue)} tone="success" />
            <StatCard label="Tax collected" value={currency(s.taxes)} />
            <StatCard label="Festival revenue" value={currency(s.festivalRevenue)} tone="success" />
          </StatGrid>

          {/* Charts */}
          <Card className="mb-4">
            <SectionTitle>Revenue trend</SectionTitle>
            <P className="text-xs text-slate-500 mb-3">Confirmed tour bookings, last 6 months</P>
            {revenueTrend.length === 0 ? (
              <P className="text-sm text-slate-500 py-10 text-center">No confirmed bookings yet</P>
            ) : (
              <LineChart
                areaChart
                curved
                data={revenueTrend.map((row) => ({ value: row.value, label: row.name }))}
                width={chartWidth}
                height={220}
                spacing={chartSpacing(chartWidth, revenueTrend.length, 12)}
                initialSpacing={12}
                endSpacing={12}
                color={A.primary}
                thickness={3}
                startFillColor={A.primary}
                endFillColor={A.primary}
                startOpacity={0.2}
                endOpacity={0}
                hideDataPoints
                rulesType="dashed"
                rulesColor={A.border}
                xAxisColor="transparent"
                yAxisColor="transparent"
                noOfSections={4}
                xAxisLabelTextStyle={AXIS_TEXT}
                yAxisTextStyle={AXIS_TEXT}
                formatYLabel={(v) => `₹${Number(v) / 1000}k`}
                yAxisLabelWidth={50}
                pointerConfig={{
                  pointerStripColor: A.border,
                  pointerColor: A.primary,
                  radius: 5,
                  activatePointersOnLongPress: false,
                  autoAdjustPointerLabelPosition: true,
                  pointerLabelWidth: 110,
                  pointerLabelHeight: 44,
                  pointerLabelComponent: (items) => (
                    <Div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
                      <P className="text-xs text-slate-500">{items?.[0]?.label}</P>
                      <P className="text-sm font-semibold text-slate-900">{currency(items?.[0]?.value)}</P>
                    </Div>
                  ),
                }}
              />
            )}
          </Card>

          <Card className="mb-4">
            <SectionTitle>Booking status</SectionTitle>
            <P className="text-xs text-slate-500 mb-3">All-time distribution</P>
            {bookingStatusChart.length === 0 ? (
              <P className="text-sm text-slate-500 py-10 text-center">No bookings yet</P>
            ) : (
              <Div className="items-center">
                <PieChart
                  donut
                  radius={75}
                  innerRadius={50}
                  sectionAutoFocus={false}
                  data={bookingStatusChart.map((entry, index) => ({
                    value: entry.value,
                    color: PIE_COLORS[index % PIE_COLORS.length],
                  }))}
                />
                {/* Legend (bottom, circle icons) */}
                <Div className="flex-row flex-wrap justify-center gap-3 mt-3">
                  {bookingStatusChart.map((entry, index) => (
                    <Div key={entry.name} className="flex-row items-center gap-1.5">
                      <Div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <Span className="text-xs text-slate-700">
                        {entry.name} ({entry.value})
                      </Span>
                    </Div>
                  ))}
                </Div>
              </Div>
            )}
          </Card>

          {/* Festivals */}
          <Card className="mb-4">
            <SectionTitle
              action={
                <Link to="/tours/admin/festivals">
                  <Span className="text-sm font-semibold text-blue-600">View all</Span>
                </Link>
              }
            >
              Festivals
            </SectionTitle>
            <P className="text-xs text-slate-500 mb-3">A separate module that shares this admin panel</P>
            <StatGrid className="mb-3">
              <StatCard label="Total festivals" value={s.festivals ?? 0} />
              <StatCard label="Active" value={s.activeFestivals ?? 0} tone="success" />
              <StatCard label="Tickets sold" value={`${s.ticketsSold ?? 0} / ${s.ticketsTotal ?? 0}`} />
              <StatCard label="Passes booked" value={s.festivalBookings ?? 0} />
            </StatGrid>
            {festivalStatusEntries.length > 0 && (
              <Div className="flex-row flex-wrap gap-2">
                {festivalStatusEntries.map(([status, count]) => (
                  <Div key={status} className="flex-row items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200">
                    <StatusBadge status={status} />
                    <Span className="text-xs font-semibold text-slate-600">{count}</Span>
                  </Div>
                ))}
              </Div>
            )}
          </Card>

          {/* Packages breakdown, tourist places, offers, reviews */}
          <Card className="mb-4">
            <SectionTitle
              action={
                <Link to="/tours/admin/packages">
                  <Span className="text-sm font-semibold text-blue-600">View all</Span>
                </Link>
              }
            >
              Packages
            </SectionTitle>
            <StatGrid className="mb-3">
              <StatCard label="Active" value={s.activePackages ?? 0} tone="success" />
              <StatCard label="Featured" value={s.featuredPackages ?? 0} />
            </StatGrid>
            <Div className="flex-row flex-wrap gap-2">
              {Object.entries(s.packagesByStatus || {}).map(([status, count]) => (
                <Div key={status} className="flex-row items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200">
                  <StatusBadge status={status} />
                  <Span className="text-xs font-semibold text-slate-600">{count}</Span>
                </Div>
              ))}
            </Div>
          </Card>

          <Card className="mb-4">
            <SectionTitle>Tourist places, offers &amp; reviews</SectionTitle>
            <StatGrid>
              <Link to="/tours/admin/destinations">
                <StatCard label="Places" value={`${s.activeDestinations ?? 0} / ${s.destinations ?? 0}`} hint="Active · tap to manage" />
              </Link>
              <Link to="/tours/admin/offers">
                <StatCard label="Offers" value={`${s.activeOffers ?? 0} / ${s.offers ?? 0}`} hint="Active · tap to manage" />
              </Link>
              <Link to="/tours/admin/reviews">
                <StatCard label="Reviews" value={`${s.avgRating ?? 0} ★`} hint="Average · tap to manage" />
              </Link>
            </StatGrid>
          </Card>

          {/* Recent activity */}
          <Card className="mb-4">
            <SectionTitle>Recent tour bookings</SectionTitle>
            {(s.recentBookings || []).length === 0 ? (
              <P className="text-sm text-slate-500">No bookings yet</P>
            ) : (
              <Div>
                {s.recentBookings.map((b, i, a) => (
                  <Div
                    key={b._id}
                    className={`flex-row items-center justify-between gap-3 py-2.5 ${i === a.length - 1 ? '' : 'border-b border-slate-100'}`}
                  >
                    <Div className="flex-1 min-w-0">
                      <P className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                        {b.packageTitle || b.bookingId}
                      </P>
                      <P className="text-xs text-slate-500 mt-0.5">{currency(b.totalAmount)}</P>
                    </Div>
                    <StatusBadge status={b.bookingStatus} />
                  </Div>
                ))}
              </Div>
            )}
          </Card>

          <Card className="mb-4">
            <SectionTitle>Recent festival bookings</SectionTitle>
            {(s.recentFestivalBookings || []).length === 0 ? (
              <P className="text-sm text-slate-500">No passes booked yet</P>
            ) : (
              <Div>
                {s.recentFestivalBookings.map((b, i, a) => (
                  <Div
                    key={b._id}
                    className={`flex-row items-center justify-between gap-3 py-2.5 ${i === a.length - 1 ? '' : 'border-b border-slate-100'}`}
                  >
                    <Div className="flex-1 min-w-0">
                      <P className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                        {b.festivalName || 'Festival pass'}
                      </P>
                      <P className="text-xs text-slate-500 mt-0.5">{currency(b.totalAmount)}</P>
                    </Div>
                    <StatusBadge status={b.bookingStatus} />
                  </Div>
                ))}
              </Div>
            )}
          </Card>

          <P className="text-xs text-slate-500">
            Gross is the full trip value; the district collects all of it, so there is no commission to take and no payout to settle.
          </P>
        </>
      )}
    </AdminPage>
  );
};
export default Dashboard;
