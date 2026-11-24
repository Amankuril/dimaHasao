import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot,
} from 'recharts';
import adminService from '../../../services/adminService';
import StatusDot from '../components/StatusDot';

const ACCENT = '#0a4d2b';

const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

const formatCount = (n) => new Intl.NumberFormat('en-IN').format(n || 0);

const formatAxis = (value) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(value % 100000 ? 1 : 0)}L`;
    if (value >= 1000) return `₹${Math.round(value / 1000)}k`;
    return `₹${value}`;
};

/** The server only returns months that had paid stays; show all six so a quiet month reads as zero, not as missing. */
const lastSixMonths = (rows = []) => {
    const byName = new Map(rows.map((r) => [r.name, r.value]));
    const out = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const name = d.toLocaleString('default', { month: 'short' });
        out.push({ name, value: byName.get(name) || 0 });
    }
    return out;
};

const STATUS_TONE_BAR = {
    confirmed: 'bg-green-600',
    checked_in: 'bg-green-400',
    checked_out: 'bg-neutral-400',
    completed: 'bg-neutral-400',
    pending: 'bg-amber-500',
    cancelled: 'bg-red-500',
    refunded: 'bg-neutral-300',
};

const Change = ({ value, what }) => {
    if (value === undefined || value === null) return null;
    if (Math.abs(value) < 0.05) return <p className="mt-2 text-xs text-neutral-500">No change {what}</p>;
    const up = value > 0;
    return (
        <p className="mt-2 text-xs text-neutral-500">
            <span className={`tabular-nums ${up ? 'text-green-700' : 'text-red-600'}`}>
                {up ? '+' : '−'}{Math.abs(value).toFixed(1)}%
            </span>{' '}
            {what}
        </p>
    );
};

const StatCard = ({ label, value, change, loading, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="flex h-full flex-col rounded-xl border border-neutral-900/[0.08] bg-white p-5 text-left outline-none transition-colors duration-150 hover:border-neutral-900/[0.16] focus-visible:ring-2 focus-visible:ring-[#0a4d2b]/30"
    >
        <span className="text-[13px] text-neutral-500">{label}</span>
        {loading ? (
            <span className="mt-3 h-8 w-28 animate-pulse rounded-md bg-neutral-100" />
        ) : (
            <span className="mt-2 text-[28px] font-medium leading-9 text-neutral-900 tabular-nums">{value}</span>
        )}
        {!loading && change}
    </button>
);

const Panel = ({ title, action, children, className = '' }) => (
    <section className={`rounded-xl border border-neutral-900/[0.08] bg-white ${className}`}>
        <header className="flex h-14 items-center justify-between px-5">
            <h2 className="text-[15px] font-medium text-neutral-900">{title}</h2>
            {action}
        </header>
        {children}
    </section>
);

const PanelLink = ({ onClick, children }) => (
    <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 rounded-md text-[13px] text-[#0a4d2b] outline-none transition-colors hover:text-[#06381e] focus-visible:ring-2 focus-visible:ring-[#0a4d2b]/30"
    >
        {children}
        <ArrowRight size={14} strokeWidth={1.5} />
    </button>
);

const RevenueTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-neutral-900/[0.08] bg-white px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="font-mono text-sm text-neutral-900 tabular-nums">{formatCurrency(payload[0].value)}</p>
        </div>
    );
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalBookings: 0,
        totalUsers: 0,
        pendingHotels: 0,
        trends: { revenue: 0, bookings: 0, users: 0 },
    });
    const [charts, setCharts] = useState({ revenue: [], status: [] });
    const [recentBookings, setRecentBookings] = useState([]);
    const [recentRequests, setRecentRequests] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const data = await adminService.getDashboardStats();
                if (data.success) {
                    setStats(data.stats);
                    setCharts(data.charts || { revenue: [], status: [] });
                    setRecentBookings(data.recentBookings || []);
                    setRecentRequests(data.recentPropertyRequests || []);
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const revenue = useMemo(() => lastSixMonths(charts.revenue), [charts.revenue]);
    const current = revenue[revenue.length - 1];
    const sixMonthTotal = revenue.reduce((sum, r) => sum + r.value, 0);

    const statusRows = useMemo(() => {
        const rows = (charts.status || [])
            .map((s) => ({ key: String(s.name || '').toLowerCase(), count: s.value || 0 }))
            .filter((s) => s.count > 0)
            .sort((a, b) => b.count - a.count);
        const total = rows.reduce((sum, r) => sum + r.count, 0);
        return { rows, total };
    }, [charts.status]);

    const monthLabel = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6 pb-10">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-medium text-neutral-900">Overview</h1>
                    <p className="mt-1 text-sm text-neutral-500">Stays across Dima Hasao · {monthLabel}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Paid revenue, all time"
                    value={formatCurrency(stats.totalRevenue)}
                    change={<Change value={stats.trends?.revenue} what="this month vs last month" />}
                    loading={loading}
                    onClick={() => navigate('/hotel/admin/finance')}
                />
                <StatCard
                    label="Bookings"
                    value={formatCount(stats.totalBookings)}
                    change={<Change value={stats.trends?.bookings} what="this month vs last month" />}
                    loading={loading}
                    onClick={() => navigate('/hotel/admin/bookings')}
                />
                <StatCard
                    label="Guests registered"
                    value={formatCount(stats.totalUsers)}
                    change={<Change value={stats.trends?.users} what="new sign-ups vs last month" />}
                    loading={loading}
                    onClick={() => navigate('/hotel/admin/users')}
                />
                <StatCard
                    label="Properties awaiting approval"
                    value={formatCount(stats.pendingHotels)}
                    change={<p className="mt-2 text-xs text-neutral-500">{stats.pendingHotels ? 'Open the list to review' : 'Nothing waiting'}</p>}
                    loading={loading}
                    onClick={() => navigate('/hotel/admin/properties')}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Panel
                    title="Paid revenue by month"
                    className="lg:col-span-2"
                    action={!loading && (
                        <span className="text-[13px] text-neutral-500">
                            Last 6 months <span className="ml-1 font-mono text-neutral-900 tabular-nums">{formatCurrency(sixMonthTotal)}</span>
                        </span>
                    )}
                >
                    <div className="h-[320px] px-2 pb-4">
                        {loading ? (
                            <div className="mx-3 h-full animate-pulse rounded-lg bg-neutral-50" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenue} margin={{ top: 16, right: 20, bottom: 0, left: 4 }}>
                                    <CartesianGrid vertical={false} stroke="rgba(23,23,23,0.06)" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#737373', fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
                                        dy={8}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        width={52}
                                        tick={{ fill: '#737373', fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
                                        tickFormatter={formatAxis}
                                        allowDecimals={false}
                                        domain={[0, (max) => Math.max(max, 1000)]}
                                    />
                                    <Tooltip content={<RevenueTooltip />} cursor={{ stroke: 'rgba(23,23,23,0.12)' }} />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={ACCENT}
                                        strokeWidth={2}
                                        fill={ACCENT}
                                        fillOpacity={0.06}
                                        activeDot={{ r: 4, fill: ACCENT, stroke: '#fff', strokeWidth: 2 }}
                                        isAnimationActive={false}
                                    />
                                    {current && (
                                        <ReferenceDot x={current.name} y={current.value} r={4} fill={ACCENT} stroke="#fff" strokeWidth={2} />
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Panel>

                <Panel title="Bookings by status">
                    <div className="px-5 pb-5">
                        {loading ? (
                            <div className="h-40 animate-pulse rounded-lg bg-neutral-50" />
                        ) : statusRows.total === 0 ? (
                            <p className="py-8 text-sm text-neutral-500">No bookings yet</p>
                        ) : (
                            <>
                                <div className="flex h-2 overflow-hidden rounded-full bg-neutral-100">
                                    {statusRows.rows.map((r) => (
                                        <span
                                            key={r.key}
                                            className={`${STATUS_TONE_BAR[r.key] || 'bg-neutral-300'} h-full border-r border-white last:border-0`}
                                            style={{ width: `${(r.count / statusRows.total) * 100}%` }}
                                        />
                                    ))}
                                </div>
                                <ul className="mt-4 divide-y divide-neutral-900/[0.06]">
                                    {statusRows.rows.map((r) => (
                                        <li key={r.key} className="flex h-10 items-center justify-between">
                                            <StatusDot status={r.key} />
                                            <span className="text-[13px] text-neutral-500 tabular-nums">
                                                <span className="font-mono text-neutral-900">{formatCount(r.count)}</span>
                                                <span className="ml-2 inline-block w-10 text-right">{Math.round((r.count / statusRows.total) * 100)}%</span>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </Panel>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Panel title="Recent bookings" action={<PanelLink onClick={() => navigate('/hotel/admin/bookings')}>All bookings</PanelLink>}>
                    {loading ? (
                        <div className="space-y-2 px-5 pb-5">
                            {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-50" />)}
                        </div>
                    ) : recentBookings.length > 0 ? (
                        <ul className="border-t border-neutral-900/[0.06]">
                            {recentBookings.map((booking) => (
                                <li key={booking._id}>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/hotel/admin/bookings/${booking._id}`)}
                                        className="flex h-16 w-full items-center gap-4 border-b border-neutral-900/[0.06] px-5 text-left outline-none transition-colors duration-150 last:border-0 hover:bg-neutral-50 focus-visible:bg-neutral-50"
                                    >
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[13px] font-medium text-neutral-600">
                                            {booking.userId?.name?.charAt(0)?.toUpperCase() || 'G'}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm text-neutral-900">{booking.userId?.name || 'Guest'}</span>
                                            <span className="block truncate text-[13px] text-neutral-500">{booking.propertyId?.propertyName || 'Unknown property'}</span>
                                        </span>
                                        <span className="flex shrink-0 flex-col items-end gap-1">
                                            <span className="font-mono text-sm text-neutral-900 tabular-nums">{formatCurrency(booking.totalAmount)}</span>
                                            <StatusDot status={booking.bookingStatus} className="text-xs" />
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="px-5 pb-8 pt-2 text-sm text-neutral-500">No bookings yet</p>
                    )}
                </Panel>

                <Panel
                    title="Awaiting approval"
                    action={recentRequests.length > 0 && (
                        <span className="text-[13px] text-neutral-500 tabular-nums">{formatCount(stats.pendingHotels || recentRequests.length)} properties</span>
                    )}
                >
                    {loading ? (
                        <div className="space-y-2 px-5 pb-5">
                            {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-50" />)}
                        </div>
                    ) : recentRequests.length > 0 ? (
                        <ul className="border-t border-neutral-900/[0.06]">
                            {recentRequests.map((hotel) => (
                                <li key={hotel._id} className="flex h-16 items-center gap-4 border-b border-neutral-900/[0.06] px-5 last:border-0">
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm text-neutral-900">{hotel.propertyName}</span>
                                        <span className="block truncate text-[13px] text-neutral-500">
                                            {hotel.partnerId?.name || 'Partner'}
                                            {hotel.address?.city ? ` · ${hotel.address.city}` : ''}
                                        </span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/hotel/admin/properties/${hotel._id}`)}
                                        className="h-8 shrink-0 rounded-lg border border-neutral-900/[0.1] bg-white px-3 text-[13px] text-neutral-900 outline-none transition-colors duration-150 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#0a4d2b]/30"
                                    >
                                        Review
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="px-5 pb-8 pt-2 text-sm text-neutral-500">No properties waiting for approval</p>
                    )}
                </Panel>
            </div>
        </div>
    );
};

export default AdminDashboard;
