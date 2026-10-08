/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminDashboard.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { useNavigate } from '../../../../lib/webRouter';
import { motion } from '../../../../lib/motion';
import { TrendingUp, Users, ShoppingBag, DollarSign, Building2, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import { Button, Div, H1, H3, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
const DashboardCard = ({ title, value, trend, icon: Icon, color, loading, onClick }) => (
  <motion.div
    initial={{
      opacity: 0,
      y: 20,
    }}
    animate={{
      opacity: 1,
      y: 0,
    }}
    className={`bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden h-full flex flex-col justify-between ${onClick ? 'hover:shadow-md transition-shadow' : ''}`}
    onClick={onClick}
  >
    <Div className="absolute top-0 right-0 p-4 opacity-5">
      <UiIcon as={Icon} size={80} className={color} />
    </Div>

    <Div className="relative z-10">
      <Div className="flex items-center justify-between mb-4">
        <Div className={`p-3 rounded-2xl ${color.replace('text-', 'bg-').replace('500', '100')} ${color}`}>
          <UiIcon as={Icon} size={24} className={color} />
        </Div>
        {!loading && trend !== undefined && (
          <Div
            className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
          >
            {trend >= 0 ? <UiIcon as={ArrowUpRight} size={14} className="mr-1" /> : <UiIcon as={ArrowDownRight} size={14} className="mr-1" />}
            <Span>{Math.abs(trend).toFixed(1)}%</Span>
          </Div>
        )}
      </Div>

      <Div>
        <P className="text-sm font-medium text-gray-500 mb-1">{title}</P>
        {loading ? (
          <Div className="h-8 w-24 bg-gray-100 animate-pulse rounded-md" />
        ) : (
          <H3 className="text-3xl font-bold text-gray-900 tracking-tight">{value}</H3>
        )}
      </Div>
    </Div>
  </motion.div>
);
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { width: screenWidth } = useWindowDimensions();
  // Layout gutter (px-4) + page padding (p-2) + card padding (p-8) on both sides.
  const chartWidth = Math.max(160, screenWidth - 2 * (16 + 8 + 32) - 44);
  const [loading, setLoading] = useState(true);

  // Data States
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    totalUsers: 0,
    pendingHotels: 0,
    trends: {
      revenue: 0,
      bookings: 0,
      users: 0,
    },
  });
  const [charts, setCharts] = useState({
    revenue: [],
    status: [],
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
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
        setCharts(
          data.charts || {
            revenue: [],
            status: [],
          },
        );
        setRecentBookings(data.recentBookings || []);
        setRecentRequests(data.recentPropertyRequests || []);
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
      maximumFractionDigits: 0,
    }).format(amount);
  };
  return (
    <ScrollDiv className="space-y-8 p-2 pb-10">
      {/* Header */}
      <Div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Div>
          <H1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Overview</H1>
          <P className="text-gray-500 mt-1">Real-time insights into your property platform performance.</P>
        </Div>
      </Div>

      {/* Row 1: KPI Grid */}
      <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          trend={stats.trends?.revenue}
          icon={DollarSign}
          color="text-amber-500"
          loading={loading}
          onClick={() => navigate('/hotel/admin/finance')}
        />
        <DashboardCard
          title="Total Bookings"
          value={stats.totalBookings}
          trend={stats.trends?.bookings}
          icon={ShoppingBag}
          color="text-blue-500"
          loading={loading}
          onClick={() => navigate('/hotel/admin/bookings')}
        />
        <DashboardCard
          title="Active Users"
          value={stats.totalUsers}
          trend={stats.trends?.users}
          icon={Users}
          color="text-purple-500"
          loading={loading}
          onClick={() => navigate('/hotel/admin/users')}
        />
        <DashboardCard
          title="Pending Reviews"
          value={stats.pendingHotels}
          // trend={0} // No trend for pending usually
          icon={Building2}
          color="text-orange-500"
          loading={loading}
          onClick={() => navigate('/hotel/admin/properties')}
        />
      </Div>

      {/* Row 2: Analytics */}
      <Div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Analytics (Area Chart) */}
        <Div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <Div className="flex items-center justify-between mb-8">
            <Div>
              <H3 className="text-xl font-bold text-gray-900">Revenue Analytics</H3>
              <P className="text-sm text-gray-500">Monthly revenue flow over the last 6 months</P>
            </Div>
          </Div>
          <Div className="w-full">
            {loading ? (
              <Div className="h-[300px] w-full bg-gray-50 animate-pulse rounded-xl" />
            ) : (
              <LineChart
                data={(charts.revenue || []).map((d) => ({ value: Number(d.value) || 0, label: d.name }))}
                areaChart
                curved
                width={chartWidth}
                height={250}
                adjustToWidth
                initialSpacing={10}
                color="#10B981"
                thickness={3}
                hideDataPoints
                startFillColor="#10B981"
                endFillColor="#10B981"
                startOpacity={0.1}
                endOpacity={0}
                rulesType="dashed"
                rulesColor="#E5E7EB"
                yAxisThickness={0}
                xAxisThickness={0}
                yAxisLabelWidth={44}
                formatYLabel={(value) => `₹${Number(value) / 1000}k`}
                yAxisTextStyle={{ color: '#9CA3AF', fontSize: 12 }}
                xAxisLabelTextStyle={{ color: '#9CA3AF', fontSize: 12 }}
                pointerConfig={{
                  pointerStripColor: '#E5E7EB',
                  pointerColor: '#10B981',
                  radius: 5,
                  pointerLabelWidth: 120,
                  pointerLabelHeight: 40,
                  autoAdjustPointerLabelPosition: true,
                  pointerLabelComponent: (items) => (
                    <Div className="bg-white rounded-xl px-3 py-2 shadow-md">
                      <P className="text-xs text-gray-500">{items[0]?.label}</P>
                      <P className="text-xs font-bold text-gray-900">{formatCurrency(items[0]?.value || 0)}</P>
                    </Div>
                  ),
                }}
              />
            )}
          </Div>
        </Div>

        {/* Booking Status (Donut Chart) */}
        <Div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <H3 className="text-xl font-bold text-gray-900 mb-2">Booking Status</H3>
          <P className="text-sm text-gray-500 mb-6">Distribution of booking outcomes</P>

          <Div className="min-h-[250px] relative">
            {loading ? (
              <Div className="h-[250px] w-full bg-gray-50 animate-pulse rounded-full" />
            ) : (
              <Div className="items-center">
                <PieChart
                  data={(charts.status || []).map((entry, index) => ({ value: Number(entry.value) || 0, color: COLORS[index % COLORS.length] }))}
                  donut
                  radius={80}
                  innerRadius={60}
                  centerLabelComponent={() => (
                    <Div className="items-center">
                      <Span className="text-3xl font-bold text-gray-900">{stats.totalBookings}</Span>
                      <Span className="text-xs text-gray-500 uppercase tracking-wider">Total</Span>
                    </Div>
                  )}
                />
                {/* Legend */}
                <Div className="flex flex-row flex-wrap justify-center gap-3 mt-4">
                  {(charts.status || []).map((entry, index) => (
                    <Div key={`legend-${index}`} className="flex flex-row items-center gap-1.5">
                      <Div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <Span className="text-xs" style={{ color: COLORS[index % COLORS.length] }}>
                        {entry.name}
                      </Span>
                    </Div>
                  ))}
                </Div>
              </Div>
            )}
          </Div>
        </Div>
      </Div>

      {/* Row 3: Operations (Recent Activity & Pending Actions) */}
      <Div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Bookings */}
        <Div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
          <Div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <Div className="flex items-center gap-2">
              <UiIcon as={Clock} size={20} className="text-gray-400" />
              <H3 className="text-xl font-bold text-gray-900">Recent Bookings</H3>
            </Div>
            <Button onClick={() => navigate('/hotel/admin/bookings')} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              View All
            </Button>
          </Div>

          <Div className="flex-1 space-y-4">
            {loading ? (
              [1, 2, 3].map((i) => <Div key={i} className="h-16 bg-gray-50 animate-pulse rounded-xl"></Div>)
            ) : recentBookings.length > 0 ? (
              recentBookings.map((booking, i) => (
                <Div
                  key={i}
                  onClick={() => navigate(`/hotel/admin/bookings/${booking._id}`)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors group"
                >
                  <Div className="flex flex-1 gap-4 items-center mr-2">
                    <Div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
                      {booking.userId?.name?.charAt(0) || 'U'}
                    </Div>
                    <Div className="flex-1">
                      <P className="text-sm font-bold text-gray-900">{booking.userId?.name || 'Guest User'}</P>
                      <P className="text-xs text-gray-500">{booking.propertyId?.propertyName || 'Unknown Hotel'}</P>
                    </Div>
                  </Div>
                  <Div className="text-right items-end">
                    <P className="text-sm font-bold text-gray-900">{formatCurrency(booking.totalAmount)}</P>
                    <Span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${booking.bookingStatus === 'confirmed' ? 'bg-green-100 text-green-700' : booking.bookingStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' : booking.bookingStatus === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {booking.bookingStatus}
                    </Span>
                  </Div>
                </Div>
              ))
            ) : (
              <Div className="flex-1 py-10 flex flex-col items-center justify-center text-gray-400">
                <UiIcon as={ShoppingBag} size={48} className="mb-2 opacity-20" />
                <P>No recent bookings found</P>
              </Div>
            )}
          </Div>
        </Div>

        {/* Pending Actions / Requests */}
        <Div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
          <Div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <Div className="flex items-center gap-2">
              <UiIcon as={AlertCircle} size={20} className="text-orange-500" />
              <H3 className="text-xl font-bold text-gray-900">Pending Actions</H3>
            </Div>
            <Span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">{recentRequests.length} Requires Action</Span>
          </Div>

          <Div className="flex-1 space-y-4">
            {loading ? (
              [1, 2, 3].map((i) => <Div key={i} className="h-16 bg-gray-50 animate-pulse rounded-xl"></Div>)
            ) : recentRequests.length > 0 ? (
              recentRequests.map((hotel, i) => (
                <Div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors group">
                  <Div className="flex flex-1 gap-4 items-center mr-2">
                    <Div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      <UiIcon as={Building2} size={20} />
                    </Div>
                    <Div className="flex-1">
                      <P className="text-sm font-bold text-gray-900">{hotel.propertyName}</P>
                      <P className="text-xs text-gray-500">by {hotel.partnerId?.name || 'Partner'}</P>
                    </Div>
                  </Div>
                  <Button
                    onClick={() => navigate(`/hotel/admin/properties/${hotel._id}`)}
                    className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                  >
                    Review
                  </Button>
                </Div>
              ))
            ) : (
              <Div className="flex-1 py-10 flex flex-col items-center justify-center text-gray-400">
                <UiIcon as={CheckCircle} size={48} className="mb-2 opacity-20 text-green-500" />
                <P>All caught up! No pending requests.</P>
              </Div>
            )}
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default AdminDashboard;
