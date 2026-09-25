import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Package, Calendar, Ticket, Star, MapPin, Tag } from 'lucide-react';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner, StatCard, StatusPill, currency } from '../components/ui';
import toast from 'react-hot-toast';

const PIE_COLORS = ['#0a4d2b', '#caa83e', '#2563eb', '#dc2626', '#7c3aed', '#6b7280'];

/** Month buckets come back as "2026-09" — render them the way a person reads a chart. */
const monthLabel = (key) => {
  const [y, m] = String(key || '').split('-');
  if (!y || !m) return key;
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'short' });
};

const SectionCard = ({ title, subtitle, action, children }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const MiniStat = ({ icon: Icon, label, value, to }) => {
  const body = (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="p-2 rounded-lg bg-[#0a4d2b]/10 text-[#0a4d2b]">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-lg font-black text-gray-900 leading-none">{value}</p>
        <p className="text-[11px] text-gray-400 mt-1">{label}</p>
      </div>
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
        title="Tours Overview"
        subtitle="Packages, bookings, festivals, tourist places, offers and reviews — the whole module at a glance."
      />

      {/* Top-line counts for every entity in the sidebar */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MiniStat icon={Package} label="Packages" value={s.packages ?? 0} to="/tours/admin/packages" />
        <MiniStat icon={Calendar} label="Bookings" value={s.bookings ?? 0} to="/tours/admin/bookings" />
        <MiniStat icon={Ticket} label="Festivals" value={s.festivals ?? 0} to="/tours/admin/festivals" />
        <MiniStat icon={MapPin} label="Tourist Places" value={s.destinations ?? 0} to="/tours/admin/destinations" />
        <MiniStat icon={Tag} label="Offers" value={s.offers ?? 0} to="/tours/admin/offers" />
        <MiniStat icon={Star} label="Reviews" value={s.reviews ?? 0} to="/tours/admin/reviews" />
      </div>

      {/* Queues needing attention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/tours/admin/packages?status=pending"
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
        >
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Awaiting review</p>
            <p className="text-xl font-black text-gray-900 mt-1">{s.pendingPackages ?? 0} packages</p>
          </div>
        </Link>
        <Link
          to="/tours/admin/reviews"
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
        >
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reviews to moderate</p>
            <p className="text-xl font-black text-gray-900 mt-1">{s.pendingReviews ?? 0} pending</p>
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
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-gray-900">Revenue trend</h3>
          <p className="text-xs text-gray-400 mb-4">Confirmed tour bookings, last 6 months</p>
          <div className="h-[260px] w-full">
            {revenueTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">No confirmed bookings yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="tourRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0a4d2b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0a4d2b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(v) => currency(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="value" stroke="#0a4d2b" strokeWidth={3} fillOpacity={1} fill="url(#tourRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-base font-bold text-gray-900">Booking status</h3>
          <p className="text-xs text-gray-400 mb-4">All-time distribution</p>
          <div className="flex-1 min-h-[220px]">
            {bookingStatusChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">No bookings yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bookingStatusChart} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                    {bookingStatusChart.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Festivals */}
      <SectionCard
        title="Festivals"
        subtitle="A separate module that shares this admin panel"
        action={<Link to="/tours/admin/festivals" className="text-xs font-bold text-[#0a4d2b] hover:underline">View all →</Link>}
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
              <div key={status} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-100">
                <StatusPill status={status} />
                <span className="text-xs font-bold text-gray-600">{count}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Packages breakdown, tourist places, offers, reviews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          title="Packages"
          action={<Link to="/tours/admin/packages" className="text-xs font-bold text-[#0a4d2b] hover:underline">View all →</Link>}
        >
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="Active" value={s.activePackages ?? 0} tone="text-[#0a4d2b]" />
            <StatCard label="Featured" value={s.featuredPackages ?? 0} />
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(s.packagesByStatus || {}).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-100">
                <StatusPill status={status} />
                <span className="text-xs font-bold text-gray-600">{count}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Tourist places, offers &amp; reviews"
        >
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Places</p>
              <p className="text-xl font-black text-gray-900 mt-1">{s.activeDestinations ?? 0}<span className="text-xs text-gray-400 font-normal"> / {s.destinations ?? 0} active</span></p>
              <Link to="/tours/admin/destinations" className="text-[11px] font-bold text-[#0a4d2b] hover:underline">Manage →</Link>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Offers</p>
              <p className="text-xl font-black text-gray-900 mt-1">{s.activeOffers ?? 0}<span className="text-xs text-gray-400 font-normal"> / {s.offers ?? 0} active</span></p>
              <Link to="/tours/admin/offers" className="text-[11px] font-bold text-[#0a4d2b] hover:underline">Manage →</Link>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Reviews</p>
              <p className="text-xl font-black text-gray-900 mt-1">{s.avgRating ?? 0}<span className="text-xs text-gray-400 font-normal"> ★ avg</span></p>
              <Link to="/tours/admin/reviews" className="text-[11px] font-bold text-[#0a4d2b] hover:underline">Manage →</Link>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="Recent tour bookings">
          {(s.recentBookings || []).length === 0 ? (
            <p className="text-xs text-gray-400">No bookings yet</p>
          ) : (
            <div className="space-y-2">
              {s.recentBookings.map((b) => (
                <div key={b._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{b.packageTitle || b.bookingId}</p>
                    <p className="text-[11px] text-gray-400">{currency(b.totalAmount)}</p>
                  </div>
                  <StatusPill status={b.bookingStatus} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent festival bookings">
          {(s.recentFestivalBookings || []).length === 0 ? (
            <p className="text-xs text-gray-400">No passes booked yet</p>
          ) : (
            <div className="space-y-2">
              {s.recentFestivalBookings.map((b) => (
                <div key={b._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{b.festivalName || 'Festival pass'}</p>
                    <p className="text-[11px] text-gray-400">{currency(b.totalAmount)}</p>
                  </div>
                  <StatusPill status={b.bookingStatus} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <p className="text-[11px] text-gray-400">
        Gross is the full trip value; the district collects all of it, so there is no commission to take and no payout to settle.
      </p>
    </div>
  );
};

export default Dashboard;
