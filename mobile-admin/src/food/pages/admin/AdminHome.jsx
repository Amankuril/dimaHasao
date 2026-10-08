/* Ported from Frontend/src/modules/Food/pages/admin/AdminHome.jsx (tools/port.js first pass). */
import { useEffect, useState } from 'react';
import { useNavigate } from '../../../lib/webRouter';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/shadcn';
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
  LayoutDashboard,
} from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { Div, P, ScrollDiv, Span, Icon as UiIcon } from '../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  StatusBadge,
  EmptyState,
  ErrorState,
  Skeleton,
  useLayoutWidth,
  useChartWidth,
  chartSpacing,
  AXIS_TEXT,
} from '../../../admin/ui';
const debugLog = () => {};
const debugError = () => {};
const INR_SYMBOL = '₹';

/** recharts' <Legend />: a swatch and the series name per entry. */
function ChartLegend({ items }) {
  return (
    <Div className="mt-3 flex flex-row flex-wrap justify-center gap-4">
      {items.map((item) => (
        <Div key={item.name} className="flex flex-row items-center gap-1.5">
          <Div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
          <Span className="text-xs text-slate-600">{item.name}</Span>
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

/** The icon each live-signal type carries, in one lookup instead of a switch per row. */
const SIGNAL_ICONS = {
  order_pending: Clock,
  order_delivered: CheckCircle,
  order_cancelled: XCircle,
  restaurant: Store,
  delivery: Truck,
  customer: UserCircle,
};

/** Order-status rows share one route map with the pie legend. */
const ORDER_STATE_ROUTES = {
  Delivered: '/admin/food/orders/delivered',
  Cancelled: '/admin/food/orders/canceled',
  Refunded: '/admin/food/orders/refunded',
  Pending: '/admin/food/orders/pending',
  Processing: '/admin/food/orders/processing',
  'In Transit': '/admin/food/orders/food-on-the-way',
};
export default function AdminHome() {
  const navigate = useNavigate();
  const { tablet } = useLayoutWidth();
  // The y-axis labels are drawn outside the width the chart is given.
  const chartWidth = useChartWidth(44, 1200);
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
  const openOrderState = (label) => navigate(ORDER_STATE_ROUTES[label] || '/admin/food/orders/all');
  const filters = (
    <>
      <Select value={selectedZone} onValueChange={setSelectedZone}>
        <SelectTrigger className="h-11 min-w-[160px] rounded-lg border border-slate-300 bg-white text-slate-900">
          <SelectValue placeholder="All zones" />
        </SelectTrigger>
        <SelectContent className="border-slate-200 bg-white text-slate-900">
          <SelectItem value="all">All zones</SelectItem>
          {zones.map((zone) => (
            <SelectItem key={zone._id} value={zone._id}>
              {zone.zoneName || zone.name || 'Unnamed Zone'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
        <SelectTrigger className="h-11 min-w-[140px] rounded-lg border border-slate-300 bg-white text-slate-900">
          <SelectValue placeholder="Overall" />
        </SelectTrigger>
        <SelectContent className="border-slate-200 bg-white text-slate-900">
          <SelectItem value="overall">Overall</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This week</SelectItem>
          <SelectItem value="month">This month</SelectItem>
          <SelectItem value="year">This year</SelectItem>
        </SelectContent>
      </Select>
    </>
  );
  if (isLoading && !dashboardData) {
    return <DashboardSkeleton filters={filters} />;
  }
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={LayoutDashboard}
        title="Operations Command"
        subtitle={`Admin overview · ${periodLabel.toLowerCase()} figures`}
        breadcrumb={[{ label: 'Food' }, { label: 'Dashboard' }]}
        actions={filters}
      />

      {!isLoading && !dashboardData ? (
        <ErrorState
          className="mb-4"
          title="Dashboard figures are unavailable"
          message="The stats service did not answer, so every tile below reads zero. Change the zone or period filter to ask again."
        />
      ) : null}

      <StatGrid className="mb-4">
        <StatCard
          label="Gross revenue"
          value={formatCurrency(revenueTotal)}
          hint={`${periodLabel} delivered order totals (GMV)`}
          icon={ShoppingBag}
          tone="success"
          onPress={() => navigate('/admin/food/transaction-report')}
        />
        <StatCard
          label="Commission earned"
          value={formatCurrency(commissionTotal)}
          hint={`${periodLabel} restaurant cut`}
          icon={ArrowUpRight}
          tone="info"
          onPress={() => navigate('/admin/food/transaction-report?focus=platform-total')}
        />
        <StatCard
          label="Orders processed"
          value={processingOrders.toLocaleString('en-IN')}
          hint="Orders currently being processed"
          icon={Activity}
          tone="warning"
          onPress={() => navigate('/admin/food/orders/processing')}
        />
        <StatCard
          label="Platform fee"
          value={formatCurrency(platformFeeTotal)}
          hint={`Platform service fees: ${periodLabel}`}
          icon={CreditCard}
          tone="info"
          onPress={() => navigate('/admin/food/fee-settings')}
        />
        <StatCard
          label="Delivery fee"
          value={formatCurrency(deliveryFeeTotal)}
          hint={`Total delivery fees: ${periodLabel}`}
          icon={Truck}
          tone="info"
          onPress={() => navigate('/admin/food/transaction-report')}
        />
        <StatCard
          label="GST"
          value={formatCurrency(gstTotal)}
          hint={`Total tax collected: ${periodLabel}`}
          icon={Receipt}
          tone="warning"
          onPress={() => navigate('/admin/food/tax-report')}
        />
        <StatCard
          label="Platform total"
          value={formatCurrency(totalAdminEarnings, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          hint={totalRevenueHelper}
          icon={DollarSign}
          tone="success"
          onPress={() => navigate('/admin/food/transaction-report?focus=platform-total')}
        />
        <StatCard
          label="Total restaurants"
          value={totalRestaurants.toLocaleString('en-IN')}
          hint="Approved restaurants"
          icon={Store}
          tone="info"
          onPress={() => navigate('/admin/food/restaurants')}
        />
        <StatCard
          label="Restaurant requests pending"
          value={pendingRestaurantRequests.toLocaleString('en-IN')}
          hint="Awaiting approval"
          icon={UserCheck}
          tone="warning"
          onPress={() => navigate('/admin/food/restaurants/joining-request')}
        />
        <StatCard
          label="Total delivery boys"
          value={totalDeliveryBoys.toLocaleString('en-IN')}
          hint="Approved delivery partners"
          icon={Truck}
          tone="info"
          onPress={() => navigate('/admin/food/delivery-partners')}
        />
        <StatCard
          label="Delivery boy requests pending"
          value={pendingDeliveryBoyRequests.toLocaleString('en-IN')}
          hint="Awaiting verification"
          icon={Clock}
          tone="warning"
          onPress={() => navigate('/admin/food/delivery-partners/join-request')}
        />
        <StatCard
          label="Total foods"
          value={totalFoods.toLocaleString('en-IN')}
          hint="Approved menu items"
          icon={Package}
          tone="info"
          onPress={() => navigate('/admin/food/foods')}
        />
        <StatCard
          label="Total addons"
          value={totalAddons.toLocaleString('en-IN')}
          hint="Approved addon items"
          icon={Plus}
          tone="info"
          onPress={() => navigate('/admin/food/addons')}
        />
        <StatCard
          label="Total customers"
          value={totalCustomers.toLocaleString('en-IN')}
          hint="Registered users"
          icon={UserCircle}
          tone="info"
          onPress={() => navigate('/admin/food/customers')}
        />
        <StatCard
          label="Total orders"
          value={ordersTotal.toLocaleString('en-IN')}
          hint={`${periodLabel} all orders`}
          icon={Package}
          tone="neutral"
          onPress={() => navigate('/admin/food/orders/all')}
        />
        <StatCard
          label="Pending orders"
          value={pendingOrders.toLocaleString('en-IN')}
          hint="Orders awaiting processing"
          icon={Clock}
          tone="warning"
          onPress={() => navigate('/admin/food/orders/pending')}
        />
        <StatCard
          label="Completed orders"
          value={completedOrders.toLocaleString('en-IN')}
          hint="Successfully delivered"
          icon={CheckCircle}
          tone="success"
          onPress={() => navigate('/admin/food/orders/delivered')}
        />
        <StatCard
          label="Total cash orders"
          value={cashOrdersTotal.toLocaleString('en-IN')}
          hint={`${periodLabel} cash / COD orders`}
          icon={IndianRupee}
          tone="neutral"
          onPress={() => navigate('/admin/food/orders/all')}
        />
        <StatCard
          label="Total online orders"
          value={onlineOrdersTotal.toLocaleString('en-IN')}
          hint={`${periodLabel} online payment orders`}
          icon={CreditCard}
          tone="info"
          onPress={() => navigate('/admin/food/orders/all')}
        />
        <StatCard
          label="Total cancelled orders"
          value={cancelledOrdersTotal.toLocaleString('en-IN')}
          hint={`${periodLabel} cancelled orders`}
          icon={XCircle}
          tone="danger"
          onPress={() => navigate('/admin/food/orders/canceled')}
        />
        <StatCard
          label="Delivery boy earning"
          value={formatCurrency(deliveryBoyEarningTotal)}
          hint={`${periodLabel} rider payout on delivered orders`}
          icon={Truck}
          tone="info"
          onPress={() => navigate('/admin/food/delivery-partners/earnings')}
        />
        <StatCard
          label="Restaurants earning"
          value={formatCurrency(restaurantEarningTotal)}
          hint={`${periodLabel} restaurant share (subtotal + packaging − commission)`}
          icon={Store}
          tone="success"
          onPress={() => navigate('/admin/food/transaction-report')}
        />
      </StatGrid>

      <Card className="mb-4">
        <SectionTitle>Revenue trajectory</SectionTitle>
        <P className="text-sm text-slate-500 -mt-2 mb-3">Commission and gross revenue with monthly order volume</P>
        <Div className="w-full min-w-0">
          <LineChart
            areaChart
            curved
            data={monthlyData.map((d) => ({ value: Number(d.revenue) || 0, label: d.month }))}
            data2={monthlyData.map((d) => ({ value: Number(d.commission) || 0 }))}
            data3={monthlyData.map((d) => ({ value: Number(d.orders) || 0 }))}
            width={chartWidth}
            height={240}
            spacing={chartSpacing(chartWidth, monthlyData.length)}
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
            rulesColor="#E2E8F0"
            xAxisColor="#CAD5E2"
            yAxisColor="#CAD5E2"
            yAxisTextStyle={AXIS_TEXT}
            xAxisLabelTextStyle={AXIS_TEXT}
            yAxisLabelWidth={44}
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
      </Card>

      <Card className="mb-4">
        <SectionTitle action={<StatusBadge tone="neutral" label={`${ordersTotal.toLocaleString('en-IN')} orders`} />}>Order mix</SectionTitle>
        <P className="text-sm text-slate-500 -mt-2 mb-3">Distribution by state</P>
        <Div className="w-full min-w-0 items-center">
          <PieChart data={pieData.map((entry) => ({ value: Number(entry.value) || 0, color: entry.fill }))} donut radius={90} innerRadius={60} innerCircleColor="#ffffff" />
          <ChartLegend items={pieData.map((entry) => ({ name: entry.name, color: entry.fill }))} />
        </Div>
        <Div className={`mt-4 grid ${tablet ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
          {orderStats.map((item) => (
            <Div
              key={item.label}
              onClick={() => openOrderState(item.label)}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} orders: ${item.value}`}
              className="min-h-[44px] flex-row items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <StatusBadge status={item.label} />
              <P className="text-sm font-semibold text-slate-900">{item.value}</P>
            </Div>
          ))}
        </Div>
      </Card>

      <Card className="mb-4">
        <SectionTitle action={<Span className="text-xs text-slate-500">{ordersTotal.toLocaleString('en-IN')} orders</Span>}>Momentum snapshot</SectionTitle>
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
            rulesColor="#E2E8F0"
            xAxisColor="#CAD5E2"
            yAxisColor="#CAD5E2"
            yAxisTextStyle={AXIS_TEXT}
            xAxisLabelTextStyle={AXIS_TEXT}
            yAxisLabelWidth={44}
            noOfSections={4}
          />
          <ChartLegend
            items={[
              { name: 'Orders', color: '#0ea5e9' },
              { name: 'Commission', color: '#a855f7' },
            ]}
          />
        </Div>
      </Card>

      <Card className="mb-4">
        <SectionTitle>Live signals</SectionTitle>
        <P className="text-sm text-slate-500 -mt-2 mb-3">Ops notes and service health</P>
        {activityFeed.length === 0 ? (
          <EmptyState icon={Activity} title="No recent signals" message="New orders, restaurant sign-ups and rider activity show up here as they happen." className="border-0 py-6" />
        ) : (
          <ScrollDiv style={{ maxHeight: 300 }} contentClassName="gap-2" nestedScrollEnabled>
            {activityFeed.map((item, idx) => (
              <Div key={idx} className="flex-row items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
                <Div className="mt-0.5">
                  <UiIcon as={SIGNAL_ICONS[item.type] || Activity} size={16} className="text-slate-500" />
                </Div>
                <Div className="flex-1 min-w-0">
                  <Div className="flex-row items-start justify-between gap-2">
                    <P className="flex-1 text-sm font-semibold text-slate-900" numberOfLines={2}>
                      {item.title}
                    </P>
                    <Span className="text-xs text-slate-400">{item.time}</Span>
                  </Div>
                  <P className="text-xs text-slate-500" numberOfLines={2}>
                    {item.detail}
                  </P>
                </Div>
              </Div>
            ))}
          </ScrollDiv>
        )}
      </Card>

      <Card>
        <SectionTitle>Order states</SectionTitle>
        <P className="text-sm text-slate-500 -mt-2 mb-3">Quick glance by status</P>
        <Div className={`grid ${tablet ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
          {orderStats.map((item) => (
            <Div
              key={item.label}
              onClick={() => openOrderState(item.label)}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} orders: ${item.value}`}
              className="min-h-[44px] flex-row items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
            >
              <Div className="flex-1 min-w-0 gap-1">
                <StatusBadge status={item.label} />
                <P className="text-xs text-slate-500" numberOfLines={1}>
                  Tracked in {selectedPeriod}
                </P>
              </Div>
              <P className="text-sm font-semibold text-slate-900">{item.value}</P>
            </Div>
          ))}
        </Div>
      </Card>
    </AdminPage>
  );
}

function DashboardSkeleton({ filters }) {
  const { columns } = useLayoutWidth();
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader icon={LayoutDashboard} title="Operations Command" subtitle="Loading the district's figures…" breadcrumb={[{ label: 'Food' }, { label: 'Dashboard' }]} actions={filters} />
      <Div className={`grid grid-cols-${columns} gap-3 mb-4`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="gap-2">
            <Skeleton width="55%" height={10} />
            <Skeleton width="70%" height={24} />
            <Skeleton width="85%" height={10} />
          </Card>
        ))}
      </Div>
      <Card className="mb-4 gap-3">
        <Skeleton width="45%" height={16} />
        <Skeleton width="70%" height={10} />
        <Skeleton height={240} className="rounded-lg" />
      </Card>
      <Card className="gap-3">
        <Skeleton width="35%" height={16} />
        <Skeleton width="60%" height={10} />
        <Skeleton height={180} className="rounded-lg" />
      </Card>
    </AdminPage>
  );
}
