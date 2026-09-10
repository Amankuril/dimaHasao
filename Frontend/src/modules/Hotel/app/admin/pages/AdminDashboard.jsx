import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    TrendingUp, Users, ShoppingBag, DollarSign, Building2,
    ArrowUpRight, ArrowDownRight, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';


const DashboardCard = ({ title, value, trend, icon: Icon, color, loading, onClick }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden h-full flex flex-col justify-between ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
        onClick={onClick}
    >
        <div className={`absolute top-0 right-0 p-4 opacity-5 ${color}`}>
            <Icon size={80} />
        </div>

        <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${color.replace('text-', 'bg-').replace('500', '100')} ${color}`}>
                    <Icon size={24} />
                </div>
                {!loading && trend !== undefined && (
                    <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {trend >= 0 ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
                        {Math.abs(trend).toFixed(1)}%
                    </span>
                )}
            </div>

            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                {loading ? (
                    <div className="h-8 w-24 bg-gray-100 animate-pulse rounded-md" />
                ) : (
                    <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{value}</h3>
                )}
            </div>
        </div>
    </motion.div>
);

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);


    // Data States
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalBookings: 0,
        totalUsers: 0,
        pendingHotels: 0,
        totalSubscriptionRevenue: 0,
        totalActiveSubscribers: 0,
        trends: { revenue: 0, bookings: 0, users: 0 }
    });
    const [charts, setCharts] = useState({ revenue: [], status: [] });
    const [recentBookings, setRecentBookings] = useState([]);
    const [recentRequests, setRecentRequests] = useState([]);
    const [subscriptionRevenue, setSubscriptionRevenue] = useState({
        total: 0,
        activeSubscribers: 0,
        planBreakdown: []
    });

    const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#6366F1'];

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const data = await adminService.getDashboardStats();
            if (data.success) {
                setStats(data.stats);
                setCharts(data.charts || { revenue: [], status: [] });
                setRecentBookings(data.recentBookings || []);
                setRecentRequests(data.recentPropertyRequests || []);
                setSubscriptionRevenue(data.subscriptionRevenue || { total: 0, activeSubscribers: 0, planBreakdown: [] });
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            // toast.error('Failed to update dashboard');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="space-y-8 p-2 pb-10">


            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
                    <p className="text-gray-500 mt-1">Real-time insights into your property platform performance.</p>
                </div>

            </div>

            {/* Row 1: KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <DashboardCard
                    title="Total Revenue"
                    value={formatCurrency(stats.totalRevenue)}
                    trend={stats.trends?.revenue}
                    icon={DollarSign}
                    color="text-amber-500"
                    loading={loading}
                    onClick={() => navigate('/admin/finance')}
                />
                <DashboardCard
                    title="Subscription Revenue"
                    value={formatCurrency(stats.totalSubscriptionRevenue || 0)}
                    icon={DollarSign}
                    color="text-amber-500"
                    loading={loading}
                    onClick={() => navigate('/admin/subscriptions')}
                />
                <DashboardCard
                    title="Total Bookings"
                    value={stats.totalBookings}
                    trend={stats.trends?.bookings}
                    icon={ShoppingBag}
                    color="text-blue-500"
                    loading={loading}
                    onClick={() => navigate('/admin/bookings')}
                />
                <DashboardCard
                    title="Active Users"
                    value={stats.totalUsers}
                    trend={stats.trends?.users}
                    icon={Users}
                    color="text-purple-500"
                    loading={loading}
                    onClick={() => navigate('/admin/users')}
                />
                <DashboardCard
                    title="Pending Reviews"
                    value={stats.pendingHotels}
                    // trend={0} // No trend for pending usually
                    icon={Building2}
                    color="text-orange-500"
                    loading={loading}
                    onClick={() => navigate('/admin/properties')}
                />
            </div>

            {/* Row 2: Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Analytics (Area Chart) */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Revenue Analytics</h3>
                            <p className="text-sm text-gray-500">Monthly revenue flow over the last 6 months</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        {loading ? (
                            <div className="h-full w-full bg-gray-50 animate-pulse rounded-xl" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={charts.revenue}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                        tickFormatter={(value) => `₹${value / 1000}k`}
                                        dx={-10}
                                    />
                                    <Tooltip
                                        formatter={(value) => formatCurrency(value)}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#10B981"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Booking Status (Donut Chart) */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Status</h3>
                    <p className="text-sm text-gray-500 mb-6">Distribution of booking outcomes</p>

                    <div className="flex-1 min-h-[250px] relative">
                        {loading ? (
                            <div className="h-full w-full bg-gray-50 animate-pulse rounded-full" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={charts.status}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {charts.status.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                        {/* Center Label */}
                        {!loading && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                                <div className="text-center">
                                    <span className="block text-3xl font-bold text-gray-900">{stats.totalBookings}</span>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">Total</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Subscription Revenue Section */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Subscription Analytics</h3>
                        <p className="text-sm text-gray-500">Revenue breakdown by subscription plans</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Revenue</p>
                            <p className="text-2xl font-bold text-amber-600">{formatCurrency(subscriptionRevenue.total)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Active Subscribers</p>
                            <p className="text-2xl font-bold text-gray-900">{subscriptionRevenue.activeSubscribers}</p>
                        </div>
                    </div>
                </div>

                <div className="h-[300px] w-full">
                    {loading ? (
                        <div className="h-full w-full bg-gray-50 animate-pulse rounded-xl" />
                    ) : subscriptionRevenue.planBreakdown && subscriptionRevenue.planBreakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={subscriptionRevenue.planBreakdown.map(plan => ({
                                name: plan.planName,
                                revenue: plan.totalRevenue,
                                subscribers: plan.subscriberCount
                            }))}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    tickFormatter={(value) => `₹${value / 1000}k`}
                                    dx={-10}
                                />
                                <Tooltip
                                    formatter={(value, name) => {
                                        if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
                                        return [value, 'Subscribers'];
                                    }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar
                                    dataKey="revenue"
                                    fill="#0d9488"
                                    radius={[8, 8, 0, 0]}
                                    maxBarSize={60}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gray-50 rounded-xl">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <DollarSign size={32} className="text-amber-600" />
                                </div>
                                <p className="text-gray-900 font-semibold mb-1">No Subscription Data</p>
                                <p className="text-sm text-gray-500">Waiting for partners to purchase subscription plans</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Plan Cards Below Chart */}
                {subscriptionRevenue.planBreakdown && subscriptionRevenue.planBreakdown.length > 0 && (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {subscriptionRevenue.planBreakdown.map((plan, index) => (
                            <div key={plan._id || index} className="p-4 bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-bold text-gray-900">{plan.planName}</h4>
                                    <span className="px-2 py-1 bg-amber-600 text-white rounded-full text-xs font-bold">
                                        {plan.subscriberCount}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-amber-600">{formatCurrency(plan.totalRevenue)}</span>
                                    <span className="text-xs text-gray-500">total</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">{formatCurrency(plan.planPrice)} per subscription</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>


            {/* Row 3: Operations (Recent Activity & Pending Actions) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Bookings */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Clock size={20} className="text-gray-400" />
                            Recent Bookings
                        </h3>
                        <button onClick={() => navigate('/admin/bookings')} className="text-sm font-semibold text-blue-600 hover:text-blue-700">View All</button>
                    </div>

                    <div className="flex-1 space-y-4">
                        {loading ? (
                            [1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-50 animate-pulse rounded-xl"></div>)
                        ) : recentBookings.length > 0 ? (
                            recentBookings.map((booking, i) => (
                                <div key={i} onClick={() => navigate(`/admin/bookings/${booking._id}`)} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer group">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
                                            {booking.userId?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{booking.userId?.name || 'Guest User'}</p>
                                            <p className="text-xs text-gray-500">{booking.propertyId?.propertyName || 'Unknown Hotel'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900">{formatCurrency(booking.totalAmount)}</p>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${booking.bookingStatus === 'confirmed' ? 'bg-green-100 text-green-700' :
                                            booking.bookingStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                booking.bookingStatus === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {booking.bookingStatus}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <ShoppingBag size={48} className="mb-2 opacity-20" />
                                <p>No recent bookings found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pending Actions / Requests */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <AlertCircle size={20} className="text-orange-500" />
                            Pending Actions
                        </h3>
                        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
                            {recentRequests.length} Requires Action
                        </span>
                    </div>

                    <div className="flex-1 space-y-4">
                        {loading ? (
                            [1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-50 animate-pulse rounded-xl"></div>)
                        ) : recentRequests.length > 0 ? (
                            recentRequests.map((hotel, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer group">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{hotel.propertyName}</p>
                                            <p className="text-xs text-gray-500">by {hotel.partnerId?.name || 'Partner'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => navigate(`/admin/properties/${hotel._id}`)} className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                                        Review
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <CheckCircle size={48} className="mb-2 opacity-20 text-green-500" />
                                <p>All caught up! No pending requests.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
