/* Ported from Frontend/src/modules/Food/pages/admin/AdminHome.jsx (tools/port.js first pass). */
import { useEffect, useState } from 'react';
import { useNavigate } from '../../../lib/webRouter';
import { useWindowDimensions } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { Card, CardContent, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/shadcn';
import {
  Activity,
  ArrowUpRight,
  ShoppingBag,
  CreditCard,
  Truck,
  Receipt,
  DollarSign,
  Store,
  UserCheck,
  Package,
  UserCircle,
  Clock,
  CheckCircle,
  Plus,
  XCircle,
  IndianRupee,
} from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { Div, H1, P, ScrollDiv, Span, Icon as UiIcon } from '../../../components/web';
import { LinearGradient } from 'expo-linear-gradient';
const debugLog = () => {};
const debugError = () => {};
const INR_SYMBOL = '\u20B9';
const AXIS_TEXT = { color: '#6b7280', fontSize: 10 };

/** recharts' <Legend />: a swatch and the series name per entry. */
function ChartLegend({ items }) {
  return (
    <Div className="mt-3 flex flex-row flex-wrap justify-center gap-4">
      {items.map((item) => (
        <Div key={item.name} className="flex flex-row items-center gap-1.5">
          <Div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
          <Span className="text-xs" style={{ color: item.color === '#111827' ? '#111827' : item.color }}>
            {item.name}
          </Span>
        </Div>
      ))}
    </Div>
  );
}
function formatCurrency(amount, options = {}) {
  const numericAmount = Number(amount || 0);
  const formattedAmount = numericAmount.toLocaleString('en-IN', options);
  return `${INR_SYMBOL}${formattedAmount}`;
}
export default function AdminHome() {
  const navigate = useNavigate();
  const { width: screenWidth } = useWindowDimensions();
  // Page px-4, panel px-6, card content px-6 and the y-axis labels.
  const chartWidth = Math.max(160, screenWidth - 32 - 48 - 48 - 44);
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('overall');
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [zones, setZones] = useState([]);

  // Fetch zone list for filter
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await adminAPI.getZones({
          page: 1,
          limit: 1000,
        });
        const zoneData = response?.data?.data;
        const list = Array.isArray(zoneData?.zones) ? zoneData.zones : Array.isArray(zoneData) ? zoneData : [];
        setZones(list);
      } catch (error) {
        debugError('Error fetching zones:', error);
        setZones([]);
      }
    };
    fetchZones();
  }, []);

  // Fetch dashboard stats from backend when filters change
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setIsLoading(true);
        const params = {
          period: selectedPeriod,
          ...(selectedZone !== 'all'
            ? {
                zoneId: selectedZone,
              }
            : {}),
        };
        const response = await adminAPI.getDashboardStats(params);
        if (response.data?.success && response.data?.data) {
          setDashboardData(response.data.data);
          debugLog('Dashboard stats fetched:', response.data.data);
        } else {
          if (!dashboardData) {
            setDashboardData(null);
          }
          debugError('Invalid dashboard response format:', response.data);
        }
      } catch (error) {
        if (!dashboardData && Number(error?.response?.status || 0) !== 429) {
          setDashboardData(null);
        }
        debugError('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardStats();
  }, [selectedZone, selectedPeriod]);

  // Get order stats from real data
  const getOrderStats = () => {
    if (!dashboardData?.orders?.byStatus) {
      return [
        {
          label: 'Delivered',
          value: 0,
          color: '#0ea5e9',
        },
        {
          label: 'Cancelled',
          value: 0,
          color: '#ef4444',
        },
        {
          label: 'Refunded',
          value: 0,
          color: '#f59e0b',
        },
        {
          label: 'Pending',
          value: 0,
          color: '#10b981',
        },
        {
          label: 'Processing',
          value: 0,
          color: '#f97316',
        },
        {
          label: 'In Transit',
          value: 0,
          color: '#8b5cf6',
        },
      ];
    }
    const byStatus = dashboardData.orders.byStatus;
    return [
      {
        label: 'Delivered',
        value: byStatus.delivered || 0,
        color: '#0ea5e9',
      },
      {
        label: 'Cancelled',
        value: byStatus.cancelled || 0,
        color: '#ef4444',
      },
      {
        label: 'Refunded',
        value: byStatus.refunded || 0,
        color: '#f59e0b',
      },
      {
        label: 'Pending',
        value: byStatus.pending || 0,
        color: '#10b981',
      },
      {
        label: 'Processing',
        value: byStatus.processing || 0,
        color: '#f97316',
      },
      {
        label: 'In Transit',
        value: byStatus.inTransit || 0,
        color: '#8b5cf6',
      },
    ];
  };

  // Get monthly data from real data
  const getMonthlyData = () => {
    if (!dashboardData?.monthlyData || dashboardData.monthlyData.length === 0) {
      // Return empty data structure if no data
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthNames.map((month) => ({
        month,
        commission: 0,
        revenue: 0,
        orders: 0,
      }));
    }

    // Use real monthly data from backend
    return dashboardData.monthlyData.map((item) => ({
      month: item.month,
      commission: item.commission || 0,
      revenue: item.revenue || 0,
      orders: item.orders || 0,
    }));
  };
  const orderStats = getOrderStats();
  const monthlyData = getMonthlyData();

  // Calculate totals from real data
  const revenueTotal = dashboardData?.revenue?.total || 0;
  const cashOrdersTotal = dashboardData?.cod?.cashOrders || 0;
  const onlineOrdersTotal = dashboardData?.cod?.onlineOrders || 0;
  const cancelledOrdersTotal = dashboardData?.orders?.byStatus?.cancelled || 0;
  const deliveryBoyEarningTotal = dashboardData?.deliveryBoyEarning ?? dashboardData?.riderEarnings?.total ?? 0;
  const restaurantEarningTotal = dashboardData?.restaurantEarning || 0;
  const commissionTotal = dashboardData?.commission?.total || 0;
  const ordersTotal = dashboardData?.orders?.total || 0;
  const platformFeeTotal = dashboardData?.platformFee?.total || 0;
  const deliveryFeeTotal = dashboardData?.deliveryFee?.total || 0;
  const gstTotal = dashboardData?.gst?.total || 0;
  const totalAdminEarnings = dashboardData?.totalAdminEarnings || 0;

  // Additional stats
  const totalRestaurants = dashboardData?.restaurants?.total || 0;
  const pendingRestaurantRequests = dashboardData?.restaurants?.pendingRequests || 0;
  const totalDeliveryBoys = dashboardData?.deliveryBoys?.total || 0;
  const pendingDeliveryBoyRequests = dashboardData?.deliveryBoys?.pendingRequests || 0;
  const totalFoods = dashboardData?.foods?.total || 0;
  const totalAddons = dashboardData?.addons?.total || 0;
  const totalCustomers = dashboardData?.customers?.total || 0;
  const pendingOrders = dashboardData?.orderStats?.pending || 0;
  const processingOrders = dashboardData?.orderStats?.processing || 0;
  const completedOrders = dashboardData?.orderStats?.completed || 0;
  const pieData = orderStats.map((item) => ({
    name: item.label,
    value: item.value,
    fill: item.color,
  }));
  const deliveryProfit = dashboardData?.deliveryProfit || 0;
  const periodLabel = selectedPeriod === 'overall' ? 'Overall' : selectedPeriod === 'today' ? "Today's" : `This ${selectedPeriod}'s`;
  const activityFeed = dashboardData?.liveSignals || [];
  const totalRevenueHelper = [
    `Comm: ${formatCurrency(commissionTotal)}`,
    `Platform: ${formatCurrency(platformFeeTotal)}`,
    `Delivery Net: ${formatCurrency(deliveryProfit)}`,
    `GST: ${formatCurrency(gstTotal)}`,
  ].join(' + ');
  if (isLoading && !dashboardData) {
    return <DashboardSkeleton />;
  }
  return (
    <ScrollDiv className="flex-1 px-4 pb-10 pt-4">
      <Div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-lg">
        <LinearGradient
          colors={['#ffffff', '#fafafa', '#f5f5f5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flexDirection: 'column', gap: 16, borderBottomWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 24, paddingVertical: 20 }}
        >
          <Div className="flex items-center gap-4">
            <Div>
              <P className="text-xs uppercase tracking-[0.2em] text-neutral-500">Admin Overview</P>
              <H1 className="text-2xl font-semibold text-neutral-900">Operations Command</H1>
            </Div>
          </Div>
          <Div className="flex flex-wrap gap-3">
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger className="min-w-[160px] border-neutral-300 bg-white text-neutral-900">
                <SelectValue placeholder="All zones" />
              </SelectTrigger>
              <SelectContent className="border-neutral-200 bg-white text-neutral-900">
                <SelectItem value="all">All zones</SelectItem>
                {zones.map((zone) => (
                  <SelectItem key={zone._id} value={zone._id}>
                    {zone.zoneName || zone.name || 'Unnamed Zone'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="min-w-[140px] border-neutral-300 bg-white text-neutral-900">
                <SelectValue placeholder="Overall" />
              </SelectTrigger>
              <SelectContent className="border-neutral-200 bg-white text-neutral-900">
                <SelectItem value="overall">Overall</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="year">This year</SelectItem>
              </SelectContent>
            </Select>
          </Div>
        </LinearGradient>

        <Div className="space-y-6 px-6 py-6">
          <Div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Gross revenue"
              value={formatCurrency(revenueTotal)}
              helper={`${periodLabel} delivered order totals (GMV)`}
              icon={<UiIcon as={ShoppingBag} className="h-5 w-5 text-emerald-600" />}
              accent="bg-emerald-200/40"
              path="/admin/food/transaction-report"
              loading={isLoading}
            />
            <MetricCard
              title="Commission earned"
              value={formatCurrency(commissionTotal)}
              helper={`${periodLabel} restaurant cut`}
              icon={<UiIcon as={ArrowUpRight} className="h-5 w-5 text-indigo-600" />}
              accent="bg-indigo-200/40"
              path="/admin/food/transaction-report?focus=platform-total"
              loading={isLoading}
            />
            <MetricCard
              title="Orders processed"
              value={processingOrders.toLocaleString('en-IN')}
              helper="Orders currently being processed"
              icon={<UiIcon as={Activity} className="h-5 w-5 text-amber-600" />}
              accent="bg-amber-200/40"
              path="/admin/food/orders/processing"
              loading={isLoading}
            />
            <MetricCard
              title="Platform fee"
              value={formatCurrency(platformFeeTotal)}
              helper={`Platform service fees: ${periodLabel}`}
              icon={<UiIcon as={CreditCard} className="h-5 w-5 text-purple-600" />}
              accent="bg-purple-200/40"
              path="/admin/food/fee-settings"
              loading={isLoading}
            />
            <MetricCard
              title="Delivery fee"
              value={formatCurrency(deliveryFeeTotal)}
              helper={`Total delivery fees: ${periodLabel}`}
              icon={<UiIcon as={Truck} className="h-5 w-5 text-blue-600" />}
              accent="bg-blue-200/40"
              path="/admin/food/transaction-report"
              loading={isLoading}
            />
            <MetricCard
              title="GST"
              value={formatCurrency(gstTotal)}
              helper={`Total tax collected: ${periodLabel}`}
              icon={<UiIcon as={Receipt} className="h-5 w-5 text-orange-600" />}
              accent="bg-orange-200/40"
              path="/admin/food/tax-report"
              loading={isLoading}
            />
            <MetricCard
              title="Platform Total"
              value={formatCurrency(totalAdminEarnings, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              helper={totalRevenueHelper}
              icon={<UiIcon as={DollarSign} className="h-5 w-5 text-green-600" />}
              accent="bg-green-200/40"
              path="/admin/food/transaction-report?focus=platform-total"
              loading={isLoading}
            />
            <MetricCard
              title="Total restaurants"
              value={totalRestaurants.toLocaleString('en-IN')}
              helper="Approved restaurants"
              icon={<UiIcon as={Store} className="h-5 w-5 text-blue-600" />}
              accent="bg-blue-200/40"
              path="/admin/food/restaurants"
            />
            <MetricCard
              title="Restaurant request pending"
              value={pendingRestaurantRequests.toLocaleString('en-IN')}
              helper="Awaiting approval"
              icon={<UiIcon as={UserCheck} className="h-5 w-5 text-orange-600" />}
              accent="bg-orange-200/40"
              path="/admin/food/restaurants/joining-request"
            />
            <MetricCard
              title="Total delivery boy"
              value={totalDeliveryBoys.toLocaleString('en-IN')}
              helper="Approved delivery partners"
              icon={<UiIcon as={Truck} className="h-5 w-5 text-indigo-600" />}
              accent="bg-indigo-200/40"
              path="/admin/food/delivery-partners"
            />
            <MetricCard
              title="Delivery boy request pending"
              value={pendingDeliveryBoyRequests.toLocaleString('en-IN')}
              helper="Awaiting verification"
              icon={<UiIcon as={Clock} className="h-5 w-5 text-yellow-600" />}
              accent="bg-yellow-200/40"
              path="/admin/food/delivery-partners/join-request"
            />
            <MetricCard
              title="Total foods"
              value={totalFoods.toLocaleString('en-IN')}
              helper="Approved menu items"
              icon={<UiIcon as={Package} className="h-5 w-5 text-purple-600" />}
              accent="bg-purple-200/40"
              path="/admin/food/foods"
            />
            <MetricCard
              title="Total addons"
              value={totalAddons.toLocaleString('en-IN')}
              helper="Approved addon items"
              icon={<UiIcon as={Plus} className="h-5 w-5 text-pink-600" />}
              accent="bg-pink-200/40"
              path="/admin/food/addons"
            />
            <MetricCard
              title="Total customers"
              value={totalCustomers.toLocaleString('en-IN')}
              helper="Registered users"
              icon={<UiIcon as={UserCircle} className="h-5 w-5 text-cyan-600" />}
              accent="bg-cyan-200/40"
              path="/admin/food/customers"
            />
            <MetricCard
              title="Total orders"
              value={ordersTotal.toLocaleString('en-IN')}
              helper={`${periodLabel} all orders`}
              icon={<UiIcon as={Package} className="h-5 w-5 text-slate-600" />}
              accent="bg-slate-200/40"
              path="/admin/food/orders/all"
              loading={isLoading}
            />
            <MetricCard
              title="Pending orders"
              value={pendingOrders.toLocaleString('en-IN')}
              helper="Orders awaiting processing"
              icon={<UiIcon as={Clock} className="h-5 w-5 text-red-600" />}
              accent="bg-red-200/40"
              path="/admin/food/orders/pending"
              loading={isLoading}
            />
            <MetricCard
              title="Completed orders"
              value={completedOrders.toLocaleString('en-IN')}
              helper="Successfully delivered"
              icon={<UiIcon as={CheckCircle} className="h-5 w-5 text-emerald-600" />}
              accent="bg-emerald-200/40"
              path="/admin/food/orders/delivered"
              loading={isLoading}
            />
            <MetricCard
              title="Total Cash Orders"
              value={cashOrdersTotal.toLocaleString('en-IN')}
              helper={`${periodLabel} cash / COD orders`}
              icon={<UiIcon as={IndianRupee} className="h-5 w-5 text-teal-600" />}
              accent="bg-teal-200/40"
              path="/admin/food/orders/all"
              loading={isLoading}
            />
            <MetricCard
              title="Total Online Orders"
              value={onlineOrdersTotal.toLocaleString('en-IN')}
              helper={`${periodLabel} online payment orders`}
              icon={<UiIcon as={CreditCard} className="h-5 w-5 text-sky-600" />}
              accent="bg-sky-200/40"
              path="/admin/food/orders/all"
              loading={isLoading}
            />
            <MetricCard
              title="Total Cancelled Orders"
              value={cancelledOrdersTotal.toLocaleString('en-IN')}
              helper={`${periodLabel} cancelled orders`}
              icon={<UiIcon as={XCircle} className="h-5 w-5 text-rose-600" />}
              accent="bg-rose-200/40"
              path="/admin/food/orders/canceled"
              loading={isLoading}
            />
            <MetricCard
              title="Delivery Boy Earning"
              value={formatCurrency(deliveryBoyEarningTotal)}
              helper={`${periodLabel} rider payout on delivered orders`}
              icon={<UiIcon as={Truck} className="h-5 w-5 text-violet-600" />}
              accent="bg-violet-200/40"
              path="/admin/food/delivery-partners/earnings"
              loading={isLoading}
            />
            <MetricCard
              title="Restaurants Earning"
              value={formatCurrency(restaurantEarningTotal)}
              helper={`${periodLabel} restaurant share (subtotal + packaging − commission)`}
              icon={<UiIcon as={Store} className="h-5 w-5 text-lime-600" />}
              accent="bg-lime-200/40"
              path="/admin/food/transaction-report"
              loading={isLoading}
            />
          </Div>

          <Div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 min-w-0 border-neutral-200 bg-white">
              <CardHeader className="flex flex-col gap-2 border-b border-neutral-200 pb-4">
                <CardTitle className="text-lg text-neutral-900">Revenue trajectory</CardTitle>
                <P className="text-sm text-neutral-500">Commission and gross revenue with monthly order volume</P>
              </CardHeader>
              <CardContent className="min-w-0 pt-4">
                <Div className="w-full min-w-0">
                  <LineChart
                    areaChart
                    curved
                    data={monthlyData.map((d) => ({ value: Number(d.revenue) || 0, label: d.month }))}
                    data2={monthlyData.map((d) => ({ value: Number(d.commission) || 0 }))}
                    data3={monthlyData.map((d) => ({ value: Number(d.orders) || 0 }))}
                    width={chartWidth}
                    height={240}
                    adjustToWidth
                    initialSpacing={10}
                    color1="#0ea5e9"
                    color2="#a855f7"
                    color3="#ef4444"
                    startFillColor1="#0ea5e9"
                    endFillColor1="#0ea5e9"
                    startFillColor2="#a855f7"
                    endFillColor2="#a855f7"
                    startFillColor3="#ef4444"
                    endFillColor3="#ef4444"
                    startOpacity1={0.25}
                    endOpacity1={0}
                    startOpacity2={0.25}
                    endOpacity2={0}
                    startOpacity3={0}
                    endOpacity3={0}
                    thickness={2}
                    hideDataPoints
                    rulesType="dashed"
                    rulesColor="#e5e7eb"
                    xAxisColor="#6b7280"
                    yAxisColor="#6b7280"
                    yAxisTextStyle={AXIS_TEXT}
                    xAxisLabelTextStyle={AXIS_TEXT}
                    yAxisLabelWidth={40}
                    noOfSections={4}
                  />
                  <ChartLegend
                    items={[
                      { name: 'Gross revenue', color: '#0ea5e9' },
                      { name: 'Commission', color: '#a855f7' },
                      { name: 'Orders', color: '#ef4444' },
                    ]}
                  />
                </Div>
              </CardContent>
            </Card>

            <Card className="min-w-0 border-neutral-200 bg-white">
              <CardHeader className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <Div>
                  <CardTitle className="text-lg text-neutral-900">Order mix</CardTitle>
                  <P className="text-sm text-neutral-500">Distribution by state</P>
                </Div>
                <Span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">{ordersTotal.toLocaleString('en-IN')} orders</Span>
              </CardHeader>
              <CardContent className="min-w-0 pt-4">
                <Div className="w-full min-w-0 items-center">
                  <PieChart
                    data={pieData.map((entry) => ({ value: Number(entry.value) || 0, color: entry.fill }))}
                    donut
                    radius={90}
                    innerRadius={60}
                    innerCircleColor="#ffffff"
                  />
                  <ChartLegend items={pieData.map((entry) => ({ name: entry.name, color: entry.fill }))} />
                </Div>
                <Div className="mt-3 grid grid-cols-2 gap-3">
                  {orderStats.map((item) => (
                    <Div
                      key={item.label}
                      onClick={() => {
                        const routes = {
                          Delivered: '/admin/food/orders/delivered',
                          Cancelled: '/admin/food/orders/canceled',
                          Refunded: '/admin/food/orders/refunded',
                          Pending: '/admin/food/orders/pending',
                          Processing: '/admin/food/orders/processing',
                          'In Transit': '/admin/food/orders/food-on-the-way',
                        };
                        navigate(routes[item.label] || '/admin/food/orders/all');
                      }}
                      className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2 cursor-pointer hover:bg-neutral-50 hover:border-neutral-300 transition-all group"
                    >
                      <Div className="flex items-center gap-2">
                        <Div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: item.color,
                          }}
                        />
                        <P className="text-sm text-neutral-800 group-hover:text-neutral-900">{item.label}</P>
                      </Div>
                      <P className="text-sm font-semibold text-neutral-900">{item.value}</P>
                    </Div>
                  ))}
                </Div>
              </CardContent>
            </Card>
          </Div>

          <Div className="grid gap-4 lg:grid-cols-3">
            <Card className="min-w-0 border-neutral-200 bg-white">
              <CardHeader className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <CardTitle className="text-lg text-neutral-900">Momentum snapshot</CardTitle>
                <Span className="text-xs text-neutral-500">Summary: {ordersTotal} Orders</Span>
              </CardHeader>
              <CardContent className="min-w-0 pt-4">
                <Div className="w-full min-w-0">
                  <BarChart
                    data={monthlyData.slice(-6).flatMap((d) => [
                      { value: Number(d.orders) || 0, label: d.month, frontColor: '#0ea5e9', spacing: 2, labelWidth: 40 },
                      { value: Number(d.commission) || 0, frontColor: '#a855f7' },
                    ])}
                    width={chartWidth}
                    height={200}
                    barWidth={10}
                    spacing={14}
                    initialSpacing={8}
                    barBorderTopLeftRadius={8}
                    barBorderTopRightRadius={8}
                    rulesType="dashed"
                    rulesColor="#e5e7eb"
                    xAxisColor="#6b7280"
                    yAxisColor="#6b7280"
                    yAxisTextStyle={AXIS_TEXT}
                    xAxisLabelTextStyle={AXIS_TEXT}
                    yAxisLabelWidth={40}
                    noOfSections={4}
                  />
                  <ChartLegend
                    items={[
                      { name: 'Orders', color: '#0ea5e9' },
                      { name: 'Commission', color: '#a855f7' },
                    ]}
                  />
                </Div>
              </CardContent>
            </Card>

            <Card className="border-neutral-200 bg-white">
              <CardHeader className="border-b border-neutral-200 pb-4">
                <CardTitle className="text-lg text-neutral-900">Live signals</CardTitle>
                <P className="text-sm text-neutral-500">Ops notes and service health</P>
              </CardHeader>
              <CardContent className="pt-4 h-[300px]">
                <ScrollDiv className="flex-1" contentClassName="gap-3" nestedScrollEnabled>
                  {activityFeed.length === 0 ? (
                    <Div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                      <UiIcon as={Activity} className="h-10 w-10 mb-2 opacity-20" />
                      <P className="text-sm">No recent signals</P>
                    </Div>
                  ) : (
                    activityFeed.map((item, idx) => {
                      const getIcon = (type) => {
                        switch (type) {
                          case 'order_pending':
                            return <UiIcon as={Clock} className="h-4 w-4 text-amber-600" />;
                          case 'order_delivered':
                            return <UiIcon as={CheckCircle} className="h-4 w-4 text-emerald-600" />;
                          case 'order_cancelled':
                            return <UiIcon as={XCircle} className="h-4 w-4 text-red-600" />;
                          case 'restaurant':
                            return <UiIcon as={Store} className="h-4 w-4 text-blue-600" />;
                          case 'delivery':
                            return <UiIcon as={Truck} className="h-4 w-4 text-purple-600" />;
                          case 'customer':
                            return <UiIcon as={UserCircle} className="h-4 w-4 text-pink-600" />;
                          default:
                            return <UiIcon as={Activity} className="h-4 w-4 text-neutral-600" />;
                        }
                      };
                      const getBg = (type) => {
                        switch (type) {
                          case 'order_pending':
                            return 'bg-amber-50';
                          case 'order_delivered':
                            return 'bg-emerald-50';
                          case 'order_cancelled':
                            return 'bg-red-50';
                          case 'restaurant':
                            return 'bg-blue-50';
                          case 'delivery':
                            return 'bg-purple-50';
                          case 'customer':
                            return 'bg-pink-50';
                          default:
                            return 'bg-neutral-50';
                        }
                      };
                      return (
                        <Div
                          key={idx}
                          className={`flex items-start gap-3 rounded-xl border border-neutral-200 ${getBg(item.type)} px-3 py-3 hover:border-neutral-300 transition-all`}
                        >
                          <Div className="mt-0.5">{getIcon(item.type)}</Div>
                          <Div className="flex-1 min-w-0">
                            <Div className="flex items-center justify-between gap-2">
                              <P className="text-sm font-semibold text-neutral-900 truncate">{item.title}</P>
                              <Span className="text-[10px] text-neutral-400 whitespace-nowrap">{item.time}</Span>
                            </Div>
                            <P className="text-xs text-neutral-600 line-clamp-1">{item.detail}</P>
                          </Div>
                        </Div>
                      );
                    })
                  )}
                </ScrollDiv>
              </CardContent>
            </Card>

            <Card className="border-neutral-200 bg-white">
              <CardHeader className="border-b border-neutral-200 pb-4">
                <CardTitle className="text-lg text-neutral-900">Order states</CardTitle>
                <P className="text-sm text-neutral-500">Quick glance by status</P>
              </CardHeader>
              <CardContent className="grid gap-3 pt-4">
                {orderStats.map((item) => (
                  <Div
                    key={item.label}
                    onClick={() => {
                      const routes = {
                        Delivered: '/admin/food/orders/delivered',
                        Cancelled: '/admin/food/orders/canceled',
                        Refunded: '/admin/food/orders/refunded',
                        Pending: '/admin/food/orders/pending',
                        Processing: '/admin/food/orders/processing',
                        'In Transit': '/admin/food/orders/food-on-the-way',
                      };
                      navigate(routes[item.label] || '/admin/food/orders/all');
                    }}
                    className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 cursor-pointer hover:bg-neutral-100 transition-colors group"
                  >
                    <Div className="flex items-center gap-3">
                      <Div
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `${item.color}1A`,
                        }}
                      >
                        <Span className="text-sm font-semibold" style={{ color: item.color }}>
                          {item.label.slice(0, 2).toUpperCase()}
                        </Span>
                      </Div>
                      <Div>
                        <P className="text-sm text-neutral-900 group-hover:font-medium">{item.label}</P>
                        <P className="text-xs text-neutral-500">Tracked in {selectedPeriod}</P>
                      </Div>
                    </Div>
                    <P className="text-sm font-semibold text-neutral-900">{item.value}</P>
                  </Div>
                ))}
              </CardContent>
            </Card>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
function MetricCard({ title, value, helper, icon, accent, path, loading = false }) {
  const navigate = useNavigate();
  return (
    <Card className="relative overflow-hidden border-neutral-200 bg-white p-0" onClick={() => path && navigate(path)}>
      <CardContent className="relative flex flex-col gap-2 px-4 pb-4 pt-4 h-full">
        <Div className={`absolute inset-0 opacity-40 ${accent}`} />
        <Div className="relative flex items-center justify-between z-10">
          <Div className="flex-1 min-w-0 mr-2">
            <P className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 font-bold mb-1 truncate">{title}</P>
            <Div className="text-xl font-bold text-neutral-900 leading-tight mb-1 min-h-[1.75rem] flex items-center">
              {loading ? <Div className="h-6 w-24 rounded-md bg-neutral-200" /> : <Span className="text-xl font-bold text-neutral-900">{value}</Span>}
            </Div>
            {loading ? (
              <Div className="h-3 w-32 rounded bg-neutral-100" />
            ) : (
              <P className="text-[10px] text-neutral-500 font-medium line-clamp-2 leading-snug">{helper}</P>
            )}
          </Div>
          <Div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/90 border border-neutral-200 shadow-sm">{icon}</Div>
        </Div>
      </CardContent>
    </Card>
  );
}
function DashboardSkeleton() {
  return (
    <ScrollDiv className="flex-1 px-4 pb-10 pt-4 w-full">
      <Div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-lg">
        {/* Header Skeleton */}
        <Div className="flex flex-col gap-4 border-b border-neutral-200 bg-neutral-50 px-6 py-5">
          <Div className="flex items-center gap-4">
            <Div>
              <Div className="h-3 w-32 rounded bg-neutral-200 mb-2" />
              <Div className="h-6 w-48 rounded bg-neutral-300" />
            </Div>
          </Div>
          <Div className="flex flex-wrap gap-3">
            <Div className="h-10 w-[160px] rounded-lg bg-neutral-200" />
            <Div className="h-10 w-[140px] rounded-lg bg-neutral-200" />
          </Div>
        </Div>

        {/* Cards Skeleton */}
        <Div className="space-y-6 px-6 py-6">
          <Div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({
              length: 16,
            }).map((_, i) => (
              <Div key={i} className="border border-neutral-200 rounded-xl bg-white p-4 h-[100px] flex items-center justify-between">
                <Div className="flex flex-col gap-2 w-2/3">
                  <Div className="h-2 w-16 bg-neutral-200 rounded" />
                  <Div className="h-6 w-24 bg-neutral-300 rounded" />
                  <Div className="h-2 w-32 bg-neutral-100 rounded" />
                </Div>
                <Div className="h-10 w-10 bg-neutral-200 rounded-xl shrink-0" />
              </Div>
            ))}
          </Div>

          {/* Charts Skeleton */}
          <Div className="grid gap-4 lg:grid-cols-3">
            <Div className="lg:col-span-2 border border-neutral-200 rounded-xl bg-white p-4 h-[400px]">
              <Div className="h-5 w-40 bg-neutral-200 rounded mb-2" />
              <Div className="h-3 w-64 bg-neutral-100 rounded mb-6" />
              <Div className="h-[300px] w-full bg-neutral-50 rounded" />
            </Div>
            <Div className="border border-neutral-200 rounded-xl bg-white p-4 h-[400px]">
              <Div className="h-5 w-32 bg-neutral-200 rounded mb-2" />
              <Div className="h-3 w-48 bg-neutral-100 rounded mb-6" />
              <Div className="h-[180px] w-[180px] bg-neutral-50 rounded-full self-center" />
            </Div>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
