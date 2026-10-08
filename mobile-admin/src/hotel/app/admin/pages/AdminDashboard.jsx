/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminDashboard.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { useNavigate } from '../../../../lib/webRouter';
import { Users, ShoppingBag, DollarSign, Building2, Clock, CheckCircle, AlertCircle, LayoutDashboard } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import adminService from '../../../services/adminService';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusBadge,
  useLayoutWidth,
  chartSpacing,
  AXIS_TEXT,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { Button, Div, P, Span, Icon as UiIcon } from '../../../../components/web';
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { width: screenWidth } = useWindowDimensions();
  const { tablet } = useLayoutWidth();
  // Page gutter (16) + card padding (16) on both sides, then the y-axis label gutter.
  const chartWidth = Math.max(220, Math.min(screenWidth, tablet ? 1200 : screenWidth) - 64 - 44);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

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
  const COLORS = ['#008236', '#155DFC', '#BB4D00', '#C10007', '#1447E6'];
  useEffect(() => {
    fetchDashboardData();
  }, []);
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
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
      setLoadError(error?.response?.data?.message || error?.message || 'Could not reach the server.');
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
  const trendHint = (value, label) => (value === undefined || value === null ? label : `${value >= 0 ? '+' : ''}${Number(value).toFixed(1)}% · ${label}`);
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard Overview"
        subtitle="Real-time insights into your property platform performance."
        breadcrumb={[{ label: 'Hotel' }, { label: 'Dashboard' }]}
      />

      {loadError ? (
        <ErrorState title="Could not load the dashboard" message={loadError} onRetry={fetchDashboardData} />
      ) : (
        <>
          <StatGrid className="mb-4">
            <StatCard
              label="Total Revenue"
              value={loading ? '—' : formatCurrency(stats.totalRevenue)}
              hint={trendHint(stats.trends?.revenue, 'vs previous period')}
              icon={DollarSign}
              tone="warning"
              onPress={() => navigate('/hotel/admin/finance')}
            />
            <StatCard
              label="Total Bookings"
              value={loading ? '—' : String(stats.totalBookings ?? 0)}
              hint={trendHint(stats.trends?.bookings, 'vs previous period')}
              icon={ShoppingBag}
              tone="info"
              onPress={() => navigate('/hotel/admin/bookings')}
            />
            <StatCard
              label="Active Users"
              value={loading ? '—' : String(stats.totalUsers ?? 0)}
              hint={trendHint(stats.trends?.users, 'vs previous period')}
              icon={Users}
              tone="success"
              onPress={() => navigate('/hotel/admin/users')}
            />
            <StatCard
              label="Pending Reviews"
              value={loading ? '—' : String(stats.pendingHotels ?? 0)}
              hint="Properties waiting for approval"
              icon={Building2}
              tone="warning"
              onPress={() => navigate('/hotel/admin/properties')}
            />
          </StatGrid>

          {/* Revenue analytics */}
          <Card className="mb-4">
            <SectionTitle>Revenue Analytics</SectionTitle>
            <P className="text-sm text-slate-500 -mt-2 mb-3">Monthly revenue flow over the last 6 months</P>
            {loading ? (
              <Skeleton height={250} className="rounded-xl" />
            ) : (charts.revenue || []).length === 0 ? (
              <EmptyState title="No revenue yet" message="The revenue trend appears once bookings are confirmed." className="border-0" />
            ) : (
              <LineChart
                data={(charts.revenue || []).map((d) => ({ value: Number(d.value) || 0, label: d.name }))}
                areaChart
                curved
                width={chartWidth}
                height={250}
                spacing={chartSpacing(chartWidth, (charts.revenue || []).length)}
                initialSpacing={10}
                color="#008236"
                thickness={3}
                hideDataPoints
                startFillColor="#008236"
                endFillColor="#008236"
                startOpacity={0.1}
                endOpacity={0}
                rulesType="dashed"
                rulesColor="#E2E8F0"
                yAxisThickness={0}
                xAxisThickness={0}
                yAxisLabelWidth={44}
                formatYLabel={(value) => `₹${Number(value) / 1000}k`}
                yAxisTextStyle={AXIS_TEXT}
                xAxisLabelTextStyle={AXIS_TEXT}
                pointerConfig={{
                  pointerStripColor: '#CAD5E2',
                  pointerColor: '#008236',
                  radius: 5,
                  pointerLabelWidth: 120,
                  pointerLabelHeight: 40,
                  autoAdjustPointerLabelPosition: true,
                  pointerLabelComponent: (items) => (
                    <Div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
                      <P className="text-xs text-slate-500">{items[0]?.label}</P>
                      <P className="text-sm font-semibold text-slate-900">{formatCurrency(items[0]?.value || 0)}</P>
                    </Div>
                  ),
                }}
              />
            )}
          </Card>

          {/* Booking status */}
          <Card className="mb-4">
            <SectionTitle>Booking Status</SectionTitle>
            <P className="text-sm text-slate-500 -mt-2 mb-3">Distribution of booking outcomes</P>
            {loading ? (
              <Skeleton height={220} className="rounded-xl" />
            ) : (charts.status || []).length === 0 ? (
              <EmptyState title="No bookings yet" message="Status breakdown appears once bookings come in." className="border-0" />
            ) : (
              <Div className="items-center">
                <PieChart
                  data={(charts.status || []).map((entry, index) => ({ value: Number(entry.value) || 0, color: COLORS[index % COLORS.length] }))}
                  donut
                  radius={80}
                  innerRadius={60}
                  centerLabelComponent={() => (
                    <Div className="items-center">
                      <Span className="text-2xl font-bold text-slate-900">{stats.totalBookings}</Span>
                      <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</Span>
                    </Div>
                  )}
                />
                <Div className="flex-row flex-wrap justify-center gap-3 mt-4">
                  {(charts.status || []).map((entry, index) => (
                    <Div key={`legend-${index}`} className="flex-row items-center gap-1.5">
                      <Div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <Span className="text-xs text-slate-600">{entry.name}</Span>
                    </Div>
                  ))}
                </Div>
              </Div>
            )}
          </Card>

          {/* Recent bookings */}
          <Card className="mb-4">
            <SectionTitle
              action={
                <Button onClick={() => navigate('/hotel/admin/bookings')} className={BTN_SECONDARY}>
                  <Span className={BTN_TEXT_SECONDARY}>View all</Span>
                </Button>
              }
            >
              <Div className="flex-row items-center gap-2">
                <UiIcon as={Clock} size={18} className="text-slate-500" />
                <Span className="text-base font-semibold text-slate-900">Recent Bookings</Span>
              </Div>
            </SectionTitle>

            <Div className="gap-2">
              {loading ? (
                [1, 2, 3].map((i) => <Skeleton key={i} height={64} className="rounded-lg" />)
              ) : recentBookings.length > 0 ? (
                recentBookings.map((booking, i) => (
                  <Div
                    key={i}
                    onClick={() => navigate(`/hotel/admin/bookings/${booking._id}`)}
                    className="flex-row items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <Div className="flex-row flex-1 min-w-0 gap-3 items-center">
                      <Div className="w-10 h-10 rounded-full bg-slate-900 items-center justify-center shrink-0">
                        <Span className="text-sm font-bold text-white">{booking.userId?.name?.charAt(0) || 'U'}</Span>
                      </Div>
                      <Div className="flex-1 min-w-0">
                        <P numberOfLines={1} className="text-sm font-semibold text-slate-900">
                          {booking.userId?.name || 'Guest User'}
                        </P>
                        <P numberOfLines={1} className="text-xs text-slate-500">
                          {booking.propertyId?.propertyName || 'Unknown Hotel'}
                        </P>
                      </Div>
                    </Div>
                    <Div className="items-end gap-1 shrink-0">
                      <P className="text-sm font-semibold text-slate-900">{formatCurrency(booking.totalAmount)}</P>
                      <StatusBadge status={booking.bookingStatus} />
                    </Div>
                  </Div>
                ))
              ) : (
                <EmptyState
                  icon={ShoppingBag}
                  title="No recent bookings"
                  message="New bookings show up here as guests confirm them."
                  className="border-0"
                />
              )}
            </Div>
          </Card>

          {/* Pending actions */}
          <Card>
            <SectionTitle action={<StatusBadge tone={recentRequests.length ? 'warning' : 'success'} label={`${recentRequests.length} to review`} />}>
              <Div className="flex-row items-center gap-2">
                <UiIcon as={AlertCircle} size={18} className="text-amber-700" />
                <Span className="text-base font-semibold text-slate-900">Pending Actions</Span>
              </Div>
            </SectionTitle>

            <Div className="gap-2">
              {loading ? (
                [1, 2, 3].map((i) => <Skeleton key={i} height={64} className="rounded-lg" />)
              ) : recentRequests.length > 0 ? (
                recentRequests.map((hotel, i) => (
                  <Div key={i} className="flex-row items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <Div className="flex-row flex-1 min-w-0 gap-3 items-center">
                      <Div className="w-10 h-10 rounded-lg bg-amber-100 items-center justify-center shrink-0">
                        <UiIcon as={Building2} size={20} className="text-amber-700" />
                      </Div>
                      <Div className="flex-1 min-w-0">
                        <P numberOfLines={1} className="text-sm font-semibold text-slate-900">
                          {hotel.propertyName}
                        </P>
                        <P numberOfLines={1} className="text-xs text-slate-500">
                          by {hotel.partnerId?.name || 'Partner'}
                        </P>
                      </Div>
                    </Div>
                    <Button onClick={() => navigate(`/hotel/admin/properties/${hotel._id}`)} className={`${BTN_SECONDARY} shrink-0`}>
                      <Span className={BTN_TEXT_SECONDARY}>Review</Span>
                    </Button>
                  </Div>
                ))
              ) : (
                <EmptyState icon={CheckCircle} title="All caught up" message="No property requests are waiting for review." className="border-0" />
              )}
            </Div>
          </Card>
        </>
      )}
    </AdminPage>
  );
};
export default AdminDashboard;
