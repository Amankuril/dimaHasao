/* Ported from Frontend/src/modules/Tours/app/admin/pages/Dashboard.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import { Package, Calendar, Ticket, Star, MapPin, Tag } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner, StatCard, StatusPill, currency } from '../components/ui';
import { toast } from '../../../../lib/notify';
import { Div, H3, Link, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
const PIE_COLORS = ['#0a4d2b', '#caa83e', '#2563eb', '#dc2626', '#7c3aed', '#6b7280'];

/** Month buckets come back as "2026-09" — render them the way a person reads a chart. */
const monthLabel = (key) => {
  const [y, m] = String(key || '').split('-');
  if (!y || !m) return key;
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', {
    month: 'short',
  });
};
const SectionCard = ({ title, subtitle, action, children }) => (
  <Div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
    <Div className="flex items-center justify-between mb-4">
      <Div>
        <H3 className="text-base font-bold text-gray-900">{title}</H3>
        {subtitle && <P className="text-xs text-gray-400 mt-0.5">{subtitle}</P>}
      </Div>
      {action}
    </Div>
    {children}
  </Div>
);
const MiniStat = ({ icon: Icon, label, value, to }) => {
  const body = (
    <Div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
      <Div className="p-2 rounded-lg bg-[#0a4d2b]/10 text-[#0a4d2b]">
        <UiIcon as={Icon} size={16} className="text-[#0a4d2b]" />
      </Div>
      <Div>
        <P className="text-lg font-black text-gray-900 leading-none">{value}</P>
        <P className="text-[11px] text-gray-400 mt-1">{label}</P>
      </Div>
    </Div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
};
const Dashboard = () => {
  const { width: screenWidth } = useWindowDimensions();
  // Page padding (16 × 2) + card padding (24 × 2) + the y-axis label column.
  const chartWidth = Math.max(160, screenWidth - 32 - 48 - 50);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    adminService
      .getDashboard()
      .then((d) => setStats(d.stats))
      .catch((e) => toast.error(e.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <Spinner />;
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
    <ScrollDiv className="p-4 pb-20 space-y-6">
      <PageHeader title="Tours Overview" subtitle="Packages, bookings, festivals, tourist places, offers and reviews — the whole module at a glance." />

      {/* Top-line counts for every entity in the sidebar */}
      <Div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MiniStat icon={Package} label="Packages" value={s.packages ?? 0} to="/tours/admin/packages" />
        <MiniStat icon={Calendar} label="Bookings" value={s.bookings ?? 0} to="/tours/admin/bookings" />
        <MiniStat icon={Ticket} label="Festivals" value={s.festivals ?? 0} to="/tours/admin/festivals" />
        <MiniStat icon={MapPin} label="Tourist Places" value={s.destinations ?? 0} to="/tours/admin/destinations" />
        <MiniStat icon={Tag} label="Offers" value={s.offers ?? 0} to="/tours/admin/offers" />
        <MiniStat icon={Star} label="Reviews" value={s.reviews ?? 0} to="/tours/admin/reviews" />
      </Div>

      {/* Queues needing attention */}
      <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/tours/admin/packages?status=pending" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <Div>
            <P className="text-xs font-bold text-gray-400 uppercase tracking-wider">Awaiting review</P>
            <P className="text-xl font-black text-gray-900 mt-1">{s.pendingPackages ?? 0} packages</P>
          </Div>
        </Link>
        <Link to="/tours/admin/reviews" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <Div>
            <P className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reviews to moderate</P>
            <P className="text-xl font-black text-gray-900 mt-1">{s.pendingReviews ?? 0} pending</P>
          </Div>
        </Link>
      </Div>

      {/* Money */}
      <Div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Gross booked (tours)" value={currency(s.gross)} tone="text-[#0a4d2b]" />
        <StatCard label="Confirmed revenue" value={currency(s.confirmedRevenue)} tone="text-[#0a4d2b]" />
        <StatCard label="Tax collected" value={currency(s.taxes)} />
        <StatCard label="Festival revenue" value={currency(s.festivalRevenue)} tone="text-[#0a4d2b]" />
      </Div>

      {/* Charts */}
      <Div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <H3 className="text-base font-bold text-gray-900">Revenue trend</H3>
          <P className="text-xs text-gray-400 mb-4">Confirmed tour bookings, last 6 months</P>
          <Div className="min-h-[260px] w-full">
            {revenueTrend.length === 0 ? (
              <Div className="h-full flex items-center justify-center text-xs text-gray-400">No confirmed bookings yet</Div>
            ) : (
              <LineChart
                areaChart
                curved
                data={revenueTrend.map((row) => ({ value: row.value, label: row.name }))}
                width={chartWidth}
                height={220}
                spacing={revenueTrend.length > 1 ? chartWidth / (revenueTrend.length - 1 + 0.6) : chartWidth / 2}
                initialSpacing={12}
                endSpacing={12}
                color="#0a4d2b"
                thickness={3}
                startFillColor="#0a4d2b"
                endFillColor="#0a4d2b"
                startOpacity={0.2}
                endOpacity={0}
                hideDataPoints
                rulesType="dashed"
                rulesColor="#E5E7EB"
                xAxisColor="transparent"
                yAxisColor="transparent"
                noOfSections={4}
                xAxisLabelTextStyle={{ color: '#9CA3AF', fontSize: 12 }}
                yAxisTextStyle={{ color: '#9CA3AF', fontSize: 12 }}
                formatYLabel={(v) => `₹${Number(v) / 1000}k`}
                yAxisLabelWidth={50}
                pointerConfig={{
                  pointerStripColor: '#E5E7EB',
                  pointerColor: '#0a4d2b',
                  radius: 5,
                  activatePointersOnLongPress: false,
                  autoAdjustPointerLabelPosition: true,
                  pointerLabelWidth: 110,
                  pointerLabelHeight: 44,
                  pointerLabelComponent: (items) => (
                    <Div className="bg-white rounded-xl px-3 py-2 shadow-md border border-gray-100">
                      <P className="text-[11px] text-gray-500">{items?.[0]?.label}</P>
                      <P className="text-xs font-bold text-gray-900">{currency(items?.[0]?.value)}</P>
                    </Div>
                  ),
                }}
              />
            )}
          </Div>
        </Div>

        <Div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <H3 className="text-base font-bold text-gray-900">Booking status</H3>
          <P className="text-xs text-gray-400 mb-4">All-time distribution</P>
          <Div className="flex-1 min-h-[220px]">
            {bookingStatusChart.length === 0 ? (
              <Div className="h-full flex items-center justify-center text-xs text-gray-400">No bookings yet</Div>
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
                <Div className="flex flex-wrap justify-center gap-3 mt-3">
                  {bookingStatusChart.map((entry, index) => (
                    <Div key={entry.name} className="flex items-center gap-1.5">
                      <Div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <Span className="text-xs" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }}>
                        {entry.name} ({entry.value})
                      </Span>
                    </Div>
                  ))}
                </Div>
              </Div>
            )}
          </Div>
        </Div>
      </Div>

      {/* Festivals */}
      <SectionCard
        title="Festivals"
        subtitle="A separate module that shares this admin panel"
        action={
          <Link to="/tours/admin/festivals" className="text-xs font-bold text-[#0a4d2b]">
            View all →
          </Link>
        }
      >
        <Div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <StatCard label="Total festivals" value={s.festivals ?? 0} />
          <StatCard label="Active" value={s.activeFestivals ?? 0} tone="text-[#0a4d2b]" />
          <StatCard label="Tickets sold" value={`${s.ticketsSold ?? 0} / ${s.ticketsTotal ?? 0}`} />
          <StatCard label="Passes booked" value={s.festivalBookings ?? 0} />
        </Div>
        {festivalStatusEntries.length > 0 && (
          <Div className="flex flex-wrap gap-2">
            {festivalStatusEntries.map(([status, count]) => (
              <Div key={status} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-100">
                <StatusPill status={status} />
                <Span className="text-xs font-bold text-gray-600">{count}</Span>
              </Div>
            ))}
          </Div>
        )}
      </SectionCard>

      {/* Packages breakdown, tourist places, offers, reviews */}
      <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          title="Packages"
          action={
            <Link to="/tours/admin/packages" className="text-xs font-bold text-[#0a4d2b]">
              View all →
            </Link>
          }
        >
          <Div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="Active" value={s.activePackages ?? 0} tone="text-[#0a4d2b]" />
            <StatCard label="Featured" value={s.featuredPackages ?? 0} />
          </Div>
          <Div className="flex flex-wrap gap-2">
            {Object.entries(s.packagesByStatus || {}).map(([status, count]) => (
              <Div key={status} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-100">
                <StatusPill status={status} />
                <Span className="text-xs font-bold text-gray-600">{count}</Span>
              </Div>
            ))}
          </Div>
        </SectionCard>

        <SectionCard title="Tourist places, offers & reviews">
          <Div className="grid grid-cols-3 gap-3">
            <Div>
              <P className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Places</P>
              <P className="text-xl font-black text-gray-900 mt-1">
                {s.activeDestinations ?? 0}
                <Span className="text-xs text-gray-400 font-normal"> / {s.destinations ?? 0} active</Span>
              </P>
              <Link to="/tours/admin/destinations" className="text-[11px] font-bold text-[#0a4d2b]">
                Manage →
              </Link>
            </Div>
            <Div>
              <P className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Offers</P>
              <P className="text-xl font-black text-gray-900 mt-1">
                {s.activeOffers ?? 0}
                <Span className="text-xs text-gray-400 font-normal"> / {s.offers ?? 0} active</Span>
              </P>
              <Link to="/tours/admin/offers" className="text-[11px] font-bold text-[#0a4d2b]">
                Manage →
              </Link>
            </Div>
            <Div>
              <P className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Reviews</P>
              <P className="text-xl font-black text-gray-900 mt-1">
                {s.avgRating ?? 0}
                <Span className="text-xs text-gray-400 font-normal"> ★ avg</Span>
              </P>
              <Link to="/tours/admin/reviews" className="text-[11px] font-bold text-[#0a4d2b]">
                Manage →
              </Link>
            </Div>
          </Div>
        </SectionCard>
      </Div>

      {/* Recent activity */}
      <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="Recent tour bookings">
          {(s.recentBookings || []).length === 0 ? (
            <P className="text-xs text-gray-400">No bookings yet</P>
          ) : (
            <Div className="space-y-2">
              {s.recentBookings.map((b) => (
                <Div key={b._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <Div className="min-w-0">
                    <P className="text-sm font-bold text-gray-800 truncate">{b.packageTitle || b.bookingId}</P>
                    <P className="text-[11px] text-gray-400">{currency(b.totalAmount)}</P>
                  </Div>
                  <StatusPill status={b.bookingStatus} />
                </Div>
              ))}
            </Div>
          )}
        </SectionCard>

        <SectionCard title="Recent festival bookings">
          {(s.recentFestivalBookings || []).length === 0 ? (
            <P className="text-xs text-gray-400">No passes booked yet</P>
          ) : (
            <Div className="space-y-2">
              {s.recentFestivalBookings.map((b) => (
                <Div key={b._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <Div className="min-w-0">
                    <P className="text-sm font-bold text-gray-800 truncate">{b.festivalName || 'Festival pass'}</P>
                    <P className="text-[11px] text-gray-400">{currency(b.totalAmount)}</P>
                  </Div>
                  <StatusPill status={b.bookingStatus} />
                </Div>
              ))}
            </Div>
          )}
        </SectionCard>
      </Div>

      <P className="text-[11px] text-gray-400">
        Gross is the full trip value; the district collects all of it, so there is no commission to take and no payout to settle.
      </P>
    </ScrollDiv>
  );
};
export default Dashboard;
