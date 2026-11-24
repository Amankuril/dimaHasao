import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,

} from 'recharts';
import { Package, Calendar, Ticket, Star, MapPin, Tag } from 'lucide-react';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner, StatCard, StatusPill, currency } from '../components/ui';
import toast from 'react-hot-toast';

const STATUS_BAR = {
  confirmed: '#16a34a', completed: '#a3a3a3', pending: '#f59e0b', advance_paid: '#f59e0b',
  cancelled: '#dc2626', failed: '#dc2626', refunded: '#d4d4d4',
};

/** One stacked bar plus a ranked list: reads faster than a six-colour donut. */
const StatusBreakdown = ({ rows }) => {
  const sorted = [...rows].filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, r) => sum + r.value, 0) || 1;
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-neutral-100">
        {sorted.map((r) => (
          <span key={r.name} className="h-full border-r border-white last:border-0"
            style={{ width: `${(r.value / total) * 100}%`, background: STATUS_BAR[r.name] || '#a3a3a3' }} />
        ))}
      </div>
      <ul className="mt-4 divide-y divide-neutral-900/[0.06]">
        {sorted.map((r) => (
          <li key={r.name} className="flex h-10 items-center justify-between">
            <StatusPill status={r.name} />
            <span className="text-[13px] text-neutral-500 tabular-nums">
              <span className="font-mono text-neutral-900">{r.value}</span>
              <span className="ml-2 inline-block w-10 text-right">{Math.round((r.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Month buckets come back as "2026-09" — render them the way a person reads a chart. */
const monthLabel = (key) => {
  const [y, m] = String(key || '').split('-');
  if (!y || !m) return key;
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'short' });
};

const SectionCard = ({ title, subtitle, action, children }) => (
  <div className="rounded-xl border border-neutral-900/[0.08] bg-white p-5">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-base font-medium text-neutral-900">{title}</h3>
        {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

// eslint-disable-next-line no-unused-vars
const MiniStat = ({ icon, label, value, to }) => {
  const body = (
    <div className="rounded-xl border border-neutral-900/[0.08] bg-white px-4 py-3 transition-colors duration-150 hover:border-neutral-900/[0.16]">
      <p className="text-[13px] text-neutral-500">{label}</p>
      <p className="mt-1 font-mono text-xl font-medium leading-7 text-neutral-900 tabular-nums">{value}</p>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboard()
      .then((d) => setStats(d.stats))
      .catch((e) => toast.error(e.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  const s = stats || {};

  const revenueTrend = (s.revenueTrend || []).map((row) => ({ name: monthLabel(row.name), value: row.value }));
  const bookingStatusChart = Object.entries(s.bookingsByStatus || {}).map(([name, value]) => ({ name, value }));
  const festivalStatusEntries = Object.entries(s.festivalsByStatus || {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tours overview"
        subtitle="Packages, bookings, festivals and places across Dima Hasao"
      />

      {/* Top-line counts for every entity in the sidebar */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MiniStat icon={Package} label="Packages" value={s.packages ?? 0} to="/tours/admin/packages" />
        <MiniStat icon={Calendar} label="Bookings" value={s.bookings ?? 0} to="/tours/admin/bookings" />
        <MiniStat icon={Ticket} label="Festivals" value={s.festivals ?? 0} to="/tours/admin/festivals" />
        <MiniStat icon={MapPin} label="Tourist places" value={s.destinations ?? 0} to="/tours/admin/destinations" />
        <MiniStat icon={Tag} label="Offers" value={s.offers ?? 0} to="/tours/admin/offers" />
        <MiniStat icon={Star} label="Reviews" value={s.reviews ?? 0} to="/tours/admin/reviews" />
      </div>

      {/* Queues needing attention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/tours/admin/packages?status=pending"
          className="bg-white p-5 rounded-xl border border-neutral-900/[0.08] flex items-center justify-between hover:shadow-md transition-shadow"
        >
          <div>
            <p className="text-xs text-neutral-500">Awaiting review</p>
            <p className="text-xl font-medium text-neutral-900 mt-1">{s.pendingPackages ?? 0} packages</p>
          </div>
        </Link>
        <Link
          to="/tours/admin/reviews"
          className="bg-white p-5 rounded-xl border border-neutral-900/[0.08] flex items-center justify-between hover:shadow-md transition-shadow"
        >
          <div>
            <p className="text-xs text-neutral-500">Reviews to moderate</p>
            <p className="text-xl font-medium text-neutral-900 mt-1">{s.pendingReviews ?? 0} pending</p>
          </div>
        </Link>
      </div>

      {/* Money */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Gross booked (tours)" value={currency(s.gross)} tone="text-[#0a4d2b]" />
        <StatCard label="Confirmed revenue" value={currency(s.confirmedRevenue)} tone="text-[#0a4d2b]" />
        <StatCard label="Tax collected" value={currency(s.taxes)} />
        <StatCard label="Festival revenue" value={currency(s.festivalRevenue)} tone="text-[#0a4d2b]" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-neutral-900/[0.08]">
          <h3 className="text-base font-medium text-neutral-900">Revenue trend</h3>
          <p className="text-xs text-neutral-500 mb-4">Confirmed tour bookings, last 6 months</p>
          <div className="h-[260px] w-full">
            {revenueTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-500">No confirmed bookings yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <CartesianGrid vertical={false} stroke="rgba(23,23,23,0.06)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#737373', fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#737373', fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(v) => currency(v)} contentStyle={{ borderRadius: 8, border: '1px solid rgba(23,23,23,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }} />
                  <Area type="monotone" dataKey="value" stroke="#0a4d2b" strokeWidth={2} fill="#0a4d2b" fillOpacity={0.06} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-900/[0.08] bg-white p-5 flex flex-col">
          <h3 className="text-base font-medium text-neutral-900">Booking status</h3>
          <p className="text-xs text-neutral-500 mb-4">All-time distribution</p>
          <div className="flex-1">
            {bookingStatusChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-500">No bookings yet</div>
            ) : (
<StatusBreakdown rows={bookingStatusChart} />
            )}
          </div>
        </div>
      </div>

      {/* Festivals */}
      <SectionCard
        title="Festivals"
        subtitle="A separate module that shares this admin panel"
        action={<Link to="/tours/admin/festivals" className="text-xs font-medium text-[#0a4d2b] hover:underline">View all →</Link>}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <StatCard label="Total festivals" value={s.festivals ?? 0} />
          <StatCard label="Active" value={s.activeFestivals ?? 0} tone="text-[#0a4d2b]" />
          <StatCard label="Tickets sold" value={`${s.ticketsSold ?? 0} / ${s.ticketsTotal ?? 0}`} />
          <StatCard label="Passes booked" value={s.festivalBookings ?? 0} />
        </div>
        {festivalStatusEntries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {festivalStatusEntries.map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-50 rounded-lg border border-neutral-100">
                <StatusPill status={status} />
                <span className="text-xs font-medium text-neutral-600">{count}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Packages breakdown, tourist places, offers, reviews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          title="Packages"
          action={<Link to="/tours/admin/packages" className="text-xs font-medium text-[#0a4d2b] hover:underline">View all →</Link>}
        >
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="Active" value={s.activePackages ?? 0} tone="text-[#0a4d2b]" />
            <StatCard label="Featured" value={s.featuredPackages ?? 0} />
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(s.packagesByStatus || {}).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-50 rounded-lg border border-neutral-100">
                <StatusPill status={status} />
                <span className="text-xs font-medium text-neutral-600">{count}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Tourist places, offers &amp; reviews"
        >
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-neutral-500">Places</p>
              <p className="text-xl font-medium text-neutral-900 mt-1">{s.activeDestinations ?? 0}<span className="text-xs text-neutral-500 font-normal"> / {s.destinations ?? 0} active</span></p>
              <Link to="/tours/admin/destinations" className="text-xs font-medium text-[#0a4d2b] hover:underline">Manage →</Link>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Offers</p>
              <p className="text-xl font-medium text-neutral-900 mt-1">{s.activeOffers ?? 0}<span className="text-xs text-neutral-500 font-normal"> / {s.offers ?? 0} active</span></p>
              <Link to="/tours/admin/offers" className="text-xs font-medium text-[#0a4d2b] hover:underline">Manage →</Link>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Reviews</p>
              <p className="text-xl font-medium text-neutral-900 mt-1">{s.avgRating ?? 0}<span className="text-xs text-neutral-500 font-normal"> ★ avg</span></p>
              <Link to="/tours/admin/reviews" className="text-xs font-medium text-[#0a4d2b] hover:underline">Manage →</Link>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="Recent tour bookings">
          {(s.recentBookings || []).length === 0 ? (
            <p className="text-xs text-neutral-500">No bookings yet</p>
          ) : (
            <div className="space-y-2">
              {s.recentBookings.map((b) => (
                <div key={b._id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{b.packageTitle || b.bookingId}</p>
                    <p className="text-xs text-neutral-500">{currency(b.totalAmount)}</p>
                  </div>
                  <StatusPill status={b.bookingStatus} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent festival bookings">
          {(s.recentFestivalBookings || []).length === 0 ? (
            <p className="text-xs text-neutral-500">No passes booked yet</p>
          ) : (
            <div className="space-y-2">
              {s.recentFestivalBookings.map((b) => (
                <div key={b._id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{b.festivalName || 'Festival pass'}</p>
                    <p className="text-xs text-neutral-500">{currency(b.totalAmount)}</p>
                  </div>
                  <StatusPill status={b.bookingStatus} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <p className="text-xs text-neutral-500">
        Gross is the full trip value; the district collects all of it, so there is no commission to take and no payout to settle
      </p>
    </div>
  );
};

export default Dashboard;
