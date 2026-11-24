import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@food/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@food/components/ui/select"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Activity, ArrowUpRight, ShoppingBag, CreditCard, Truck, Receipt, DollarSign, Store, UserCheck, Package, UserCircle, Clock, CheckCircle, Plus, XCircle, IndianRupee } from "lucide-react"
import { adminAPI } from "@food/api"
const debugLog = () => {}
const debugError = () => {}

const INR_SYMBOL = "\u20B9"

function formatCurrency(amount, options = {}) {
  const numericAmount = Number(amount || 0)
  const formattedAmount = numericAmount.toLocaleString("en-IN", options)
  return `${INR_SYMBOL}${formattedAmount}`
}


export default function AdminHome() {
  const navigate = useNavigate()
  const [selectedZone, setSelectedZone] = useState("all")
  const [selectedPeriod, setSelectedPeriod] = useState("overall")
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState(null)
  const [zones, setZones] = useState([])

  // Fetch zone list for filter
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await adminAPI.getZones({ page: 1, limit: 1000 })
        const zoneData = response?.data?.data
        const list = Array.isArray(zoneData?.zones)
          ? zoneData.zones
          : Array.isArray(zoneData)
            ? zoneData
            : []
        setZones(list)
      } catch (error) {
        debugError("Error fetching zones:", error)
        setZones([])
      }
    }

    fetchZones()
  }, [])

  // Fetch dashboard stats from backend when filters change
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setIsLoading(true)
        const params = {
          period: selectedPeriod,
          ...(selectedZone !== "all" ? { zoneId: selectedZone } : {}),
        }
        const response = await adminAPI.getDashboardStats(params)
        if (response.data?.success && response.data?.data) {
          setDashboardData(response.data.data)
          debugLog("Dashboard stats fetched:", response.data.data)
        } else {
          if (!dashboardData) {
            setDashboardData(null)
          }
          debugError("Invalid dashboard response format:", response.data)
        }
      } catch (error) {
        if (!dashboardData && Number(error?.response?.status || 0) !== 429) {
          setDashboardData(null)
        }
        debugError("Error fetching dashboard stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardStats()
  }, [selectedZone, selectedPeriod])

  // Get order stats from real data
  const getOrderStats = () => {
    if (!dashboardData?.orders?.byStatus) {
      return [
        { label: "Delivered", value: 0, color: "#16a34a" },
        { label: "Cancelled", value: 0, color: "#dc2626" },
        { label: "Refunded", value: 0, color: "#a3a3a3" },
        { label: "Pending", value: 0, color: "#f59e0b" },
        { label: "Processing", value: 0, color: "#525252" },
        { label: "In transit", value: 0, color: "#3f6f8f" },
      ]
    }

    const byStatus = dashboardData.orders.byStatus
    return [
      { label: "Delivered", value: byStatus.delivered || 0, color: "#16a34a" },
      { label: "Cancelled", value: byStatus.cancelled || 0, color: "#dc2626" },
      { label: "Refunded", value: byStatus.refunded || 0, color: "#a3a3a3" },
      { label: "Pending", value: byStatus.pending || 0, color: "#f59e0b" },
      { label: "Processing", value: byStatus.processing || 0, color: "#525252" },
      { label: "In transit", value: byStatus.inTransit || 0, color: "#3f6f8f" },
    ]
  }

  // Get monthly data from real data
  const getMonthlyData = () => {
    if (!dashboardData?.monthlyData || dashboardData.monthlyData.length === 0) {
      // Return empty data structure if no data
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return monthNames.map(month => ({ month, commission: 0, revenue: 0, orders: 0 }))
    }

    // Use real monthly data from backend
    return dashboardData.monthlyData.map(item => ({
      month: item.month,
      commission: item.commission || 0,
      revenue: item.revenue || 0,
      orders: item.orders || 0
    }))
  }

  const orderStats = getOrderStats()
  const monthlyData = getMonthlyData()

  // Calculate totals from real data
  const revenueTotal = dashboardData?.revenue?.total || 0
  const cashOrdersTotal = dashboardData?.cod?.cashOrders || 0
  const onlineOrdersTotal = dashboardData?.cod?.onlineOrders || 0
  const cancelledOrdersTotal = dashboardData?.orders?.byStatus?.cancelled || 0
  const deliveryBoyEarningTotal =
    dashboardData?.deliveryBoyEarning ?? dashboardData?.riderEarnings?.total ?? 0
  const restaurantEarningTotal = dashboardData?.restaurantEarning || 0
  const commissionTotal = dashboardData?.commission?.total || 0
  const ordersTotal = dashboardData?.orders?.total || 0
  const platformFeeTotal = dashboardData?.platformFee?.total || 0
  const deliveryFeeTotal = dashboardData?.deliveryFee?.total || 0
  const gstTotal = dashboardData?.gst?.total || 0
  const totalAdminEarnings = dashboardData?.totalAdminEarnings || 0

  // Additional stats
  const totalRestaurants = dashboardData?.restaurants?.total || 0
  const pendingRestaurantRequests = dashboardData?.restaurants?.pendingRequests || 0
  const totalDeliveryBoys = dashboardData?.deliveryBoys?.total || 0
  const pendingDeliveryBoyRequests = dashboardData?.deliveryBoys?.pendingRequests || 0
  const totalFoods = dashboardData?.foods?.total || 0
  const totalAddons = dashboardData?.addons?.total || 0
  const totalCustomers = dashboardData?.customers?.total || 0
  const pendingOrders = dashboardData?.orderStats?.pending || 0
  const processingOrders = dashboardData?.orderStats?.processing || 0
  const completedOrders = dashboardData?.orderStats?.completed || 0

  const pieData = orderStats.map((item) => ({
    name: item.label,
    value: item.value,
    fill: item.color,
  }))

  const deliveryProfit = dashboardData?.deliveryProfit || 0
  const periodLabel = selectedPeriod === "overall" ? "Overall" : 
                    selectedPeriod === "today" ? "Today's" : 
                    `This ${selectedPeriod}'s`

  const activityFeed = dashboardData?.liveSignals || []
  const totalRevenueHelper = [
    `Comm: ${formatCurrency(commissionTotal)}`,
    `Platform: ${formatCurrency(platformFeeTotal)}`,
    `Delivery Net: ${formatCurrency(deliveryProfit)}`,
    `GST: ${formatCurrency(gstTotal)}`,
  ].join(" + ")

  if (isLoading && !dashboardData) {
    return <DashboardSkeleton />
  }

  return (
    <div className="px-4 pb-10 lg:px-6 pt-4">
      <div>

        <div className="flex flex-col gap-4 pb-6 pt-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-medium text-neutral-900">Food overview</h1>
              <p className="mt-1 text-sm text-neutral-500">Orders, money and partners across every zone</p>
            </div>

          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger className="min-w-[160px] border-neutral-300 bg-white text-neutral-900">
                <SelectValue placeholder="All zones" />
              </SelectTrigger>
              <SelectContent className="border-neutral-200 bg-white text-neutral-900">
                <SelectItem value="all">All zones</SelectItem>
                {zones.map((zone) => (
                  <SelectItem key={zone._id} value={zone._id}>
                    {zone.zoneName || zone.name || "Unnamed Zone"}
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
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Gross revenue"
              value={formatCurrency(revenueTotal)}
              helper={`${periodLabel} delivered order totals (GMV)`}
              icon={<ShoppingBag className="h-5 w-5 text-emerald-600" />}
              accent="bg-emerald-200/40"
              path="/admin/food/transaction-report"
              loading={isLoading}
            />
            <MetricCard
              title="Commission earned"
              value={formatCurrency(commissionTotal)}
              helper={`${periodLabel} restaurant cut`}
              icon={<ArrowUpRight className="h-5 w-5 text-[#0a4d2b]" />}
              accent="bg-neutral-200/40"
              path="/admin/food/transaction-report?focus=platform-total"
              loading={isLoading}
            />
            <MetricCard
              title="Orders processed"
              value={processingOrders.toLocaleString("en-IN")}
              helper="Orders currently being processed"
              icon={<Activity className="h-5 w-5 text-amber-600" />}
              accent="bg-amber-200/40"
              path="/admin/food/orders/processing"
              loading={isLoading}
            />
            <MetricCard
              title="Platform fee"
              value={formatCurrency(platformFeeTotal)}
              helper={`Platform service fees: ${periodLabel}`}
              icon={<CreditCard className="h-5 w-5 text-[#0a4d2b]" />}
              accent="bg-neutral-200/40"
              path="/admin/food/fee-settings"
              loading={isLoading}
            />
            <MetricCard
              title="Delivery fee"
              value={formatCurrency(deliveryFeeTotal)}
              helper={`Total delivery fees: ${periodLabel}`}
              icon={<Truck className="h-5 w-5 text-[#0a4d2b]" />}
              accent="bg-neutral-200/40"
              path="/admin/food/transaction-report"
              loading={isLoading}
            />
            <MetricCard
              title="GST"
              value={formatCurrency(gstTotal)}
              helper={`Total tax collected: ${periodLabel}`}
              icon={<Receipt className="h-5 w-5 text-orange-600" />}
              accent="bg-orange-200/40"
              path="/admin/food/tax-report"
              loading={isLoading}
            />
            <MetricCard
              title="Platform total"
              value={formatCurrency(totalAdminEarnings, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              helper={totalRevenueHelper}
              icon={<DollarSign className="h-5 w-5 text-green-600" />}
              accent="bg-green-200/40"
              path="/admin/food/transaction-report?focus=platform-total"
              loading={isLoading}
            />
            <MetricCard
              title="Total restaurants"
              value={totalRestaurants.toLocaleString("en-IN")}
              helper="Approved restaurants"
              icon={<Store className="h-5 w-5 text-[#0a4d2b]" />}
              accent="bg-neutral-200/40"
              path="/admin/food/restaurants"
            />
            <MetricCard
              title="Restaurant request pending"
              value={pendingRestaurantRequests.toLocaleString("en-IN")}
              helper="Awaiting approval"
              icon={<UserCheck className="h-5 w-5 text-orange-600" />}
              accent="bg-orange-200/40"
              path="/admin/food/restaurants/joining-request"
            />
            <MetricCard
              title="Total delivery boy"
              value={totalDeliveryBoys.toLocaleString("en-IN")}
              helper="Approved delivery partners"
              icon={<Truck className="h-5 w-5 text-[#0a4d2b]" />}
              accent="bg-neutral-200/40"
              path="/admin/food/delivery-partners"
            />
            <MetricCard
              title="Delivery boy request pending"
              value={pendingDeliveryBoyRequests.toLocaleString("en-IN")}
              helper="Awaiting verification"
              icon={<Clock className="h-5 w-5 text-yellow-600" />}
              accent="bg-yellow-200/40"
              path="/admin/food/delivery-partners/join-request"
            />
            <MetricCard
              title="Total foods"
              value={totalFoods.toLocaleString("en-IN")}
              helper="Approved menu items"
              icon={<Package className="h-5 w-5 text-[#0a4d2b]" />}
              accent="bg-neutral-200/40"
              path="/admin/food/foods"
            />
            <MetricCard
              title="Total addons"
              value={totalAddons.toLocaleString("en-IN")}
              helper="Approved addon items"
              icon={<Plus className="h-5 w-5 text-[#0a4d2b]" />}
              accent="bg-neutral-200/40"
              path="/admin/food/addons"
            />
            <MetricCard
              title="Total customers"
              value={totalCustomers.toLocaleString("en-IN")}
              helper="Registered users"
              icon={<UserCircle className="h-5 w-5 text-[#0a4d2b]" />}
              accent="bg-neutral-200/40"
              path="/admin/food/customers"
            />
            <MetricCard
              title="Total orders"
              value={ordersTotal.toLocaleString("en-IN")}
              helper={`${periodLabel} all orders`}
              icon={<Package className="h-5 w-5 text-neutral-600" />}
              accent="bg-neutral-200/40"
              path="/admin/food/orders/all"
              loading={isLoading}
            />
            <MetricCard
              title="Pending orders"
              value={pendingOrders.toLocaleString("en-IN")}
              helper="Orders awaiting processing"
              icon={<Clock className="h-5 w-5 text-red-600" />}
              accent="bg-red-200/40"
              path="/admin/food/orders/pending"
              loading={isLoading}
            />
            <MetricCard
              title="Completed orders"
              value={completedOrders.toLocaleString("en-IN")}
              helper="Successfully delivered"
              icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
              accent="bg-emerald-200/40"
              path="/admin/food/orders/delivered"
              loading={isLoading}
            />
            <MetricCard
              title="Total cash orders"
              value={cashOrdersTotal.toLocaleString("en-IN")}
              helper={`${periodLabel} cash / COD orders`}
              icon={<IndianRupee className="h-5 w-5 text-teal-600" />}
              accent="bg-teal-200/40"
              path="/admin/food/orders/all"
              loading={isLoading}
            />
            <MetricCard
              title="Total online orders"
              value={onlineOrdersTotal.toLocaleString("en-IN")}
              helper={`${periodLabel} online payment orders`}
              icon={<CreditCard className="h-5 w-5 text-[#0a4d2b]" />}
              accent="bg-neutral-200/40"
              path="/admin/food/orders/all"
              loading={isLoading}
            />
            <MetricCard
              title="Total cancelled orders"
              value={cancelledOrdersTotal.toLocaleString("en-IN")}
              helper={`${periodLabel} cancelled orders`}
              icon={<XCircle className="h-5 w-5 text-rose-600" />}
              accent="bg-rose-200/40"
              path="/admin/food/orders/canceled"
              loading={isLoading}
            />
            <MetricCard
              title="Delivery boy earning"
              value={formatCurrency(deliveryBoyEarningTotal)}
              helper={`${periodLabel} rider payout on delivered orders`}
              icon={<Truck className="h-5 w-5 text-[#0a4d2b]" />}
              accent="bg-neutral-200/40"
              path="/admin/food/delivery-partners/earnings"
              loading={isLoading}
            />
            <MetricCard
              title="Restaurants earning"
              value={formatCurrency(restaurantEarningTotal)}
              helper={`${periodLabel} restaurant share (subtotal + packaging − commission)`}
              icon={<Store className="h-5 w-5 text-lime-600" />}
              accent="bg-lime-200/40"
              path="/admin/food/transaction-report"
              loading={isLoading}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 min-w-0 border-neutral-200 bg-white">
              <CardHeader className="flex flex-col gap-2 border-b border-neutral-200 pb-4">
                <CardTitle className="text-lg text-neutral-900">Revenue trajectory</CardTitle>
                <p className="text-sm text-neutral-500">
                  Commission and gross revenue with monthly order volume
                </p>
              </CardHeader>
              <CardContent className="min-w-0 pt-4">
                <div className="h-80 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={monthlyData}>
                      <CartesianGrid vertical={false} stroke="rgba(23,23,23,0.06)" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} dy={8} tick={{ fontSize: 12, fill: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} />
                      <YAxis axisLine={false} tickLine={false} width={56} tick={{ fontSize: 12, fill: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} />
                      <Tooltip
                        contentStyle={{ background: "#ffffff", border: "1px solid rgba(23,23,23,0.08)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}
                        labelStyle={{ color: "#111827" }}
                        itemStyle={{ color: "#111827" }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#0a4d2b"
                        strokeWidth={2}
                        fill="#0a4d2b"
                        fillOpacity={0.06}
                        name="Gross revenue"
                      />
                      <Area
                        type="monotone"
                        dataKey="commission"
                        stroke="#a3a3a3"
                        strokeWidth={1.5}
                        fill="none"
                        name="Commission"
                      />
                      <Bar
                        dataKey="orders"
                        fill="#e5e5e5"
                        radius={[3, 3, 0, 0]}
                        name="Orders"
                        barSize={10}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-0 border-neutral-200 bg-white">
              <CardHeader className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <div>
                  <CardTitle className="text-lg text-neutral-900">Order mix</CardTitle>
                  <p className="text-sm text-neutral-500">Distribution by state</p>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">
                  {ordersTotal.toLocaleString("en-IN")} orders
                </span>
              </CardHeader>
              <CardContent className="min-w-0 pt-4">
                <div className="h-72 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#ffffff", border: "1px solid rgba(23,23,23,0.08)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}
                        labelStyle={{ color: "#111827" }}
                        itemStyle={{ color: "#111827" }}
                      />
                      <Legend
                        formatter={(value) => <span style={{ color: "#111827", fontSize: 12 }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {orderStats.map((item) => (
                    <div
                      key={item.label}
                    onClick={() => {
                        const routes = {
                          'Delivered': '/admin/food/orders/delivered',
                          'Cancelled': '/admin/food/orders/canceled',
                          'Refunded': '/admin/food/orders/refunded',
                          'Pending': '/admin/food/orders/pending',
                          'Processing': '/admin/food/orders/processing',
                          'In Transit': '/admin/food/orders/food-on-the-way',
                        }
                        navigate(routes[item.label] || '/admin/food/orders/all')
                      }}
                      className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2 cursor-pointer hover:bg-neutral-50 hover:border-neutral-300 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full transition-transform" style={{ background: item.color }} />
                        <p className="text-sm text-neutral-800 group-hover:text-neutral-900">{item.label}</p>
                      </div>
                      <p className="text-sm font-medium text-neutral-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="min-w-0 border-neutral-200 bg-white">
              <CardHeader className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <CardTitle className="text-lg text-neutral-900">Momentum snapshot</CardTitle>
                <span className="text-xs text-neutral-500">Summary: {ordersTotal} Orders</span>
              </CardHeader>
              <CardContent className="min-w-0 pt-4">
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={monthlyData.slice(-6)}>
                      <CartesianGrid vertical={false} stroke="rgba(23,23,23,0.06)" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} dy={8} tick={{ fontSize: 12, fill: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} />
                      <YAxis axisLine={false} tickLine={false} width={56} tick={{ fontSize: 12, fill: "#737373", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} />
                      <Tooltip
                        contentStyle={{ background: "#ffffff", border: "1px solid rgba(23,23,23,0.08)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}
                        labelStyle={{ color: "#111827" }}
                        itemStyle={{ color: "#111827" }}
                      />
                      <Legend />
                      <Bar dataKey="orders" fill="#d4d4d4" radius={[3, 3, 0, 0]} name="Orders" />
                      <Bar dataKey="commission" fill="#0a4d2b" radius={[3, 3, 0, 0]} name="Commission" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-neutral-200 bg-white">
              <CardHeader className="border-b border-neutral-200 pb-4">
                <CardTitle className="text-lg text-neutral-900">Live signals</CardTitle>
                <p className="text-sm text-neutral-500">Ops notes and service health</p>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 h-[300px] overflow-y-auto custom-scrollbar">
                {activityFeed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 text-neutral-400">
                    <Activity className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-sm">No recent signals</p>
                  </div>
                ) : (
                  activityFeed.map((item, idx) => {
                    const getIcon = (type) => {
                      switch (type) {
                        case "order_pending":
                          return <Clock className="h-4 w-4 text-amber-600" />
                        case "order_delivered":
                          return <CheckCircle className="h-4 w-4 text-emerald-600" />
                        case "order_cancelled":
                          return <XCircle className="h-4 w-4 text-red-600" />
                        case "restaurant":
                          return <Store className="h-4 w-4 text-[#0a4d2b]" />
                        case "delivery":
                          return <Truck className="h-4 w-4 text-[#0a4d2b]" />
                        case "customer":
                          return <UserCircle className="h-4 w-4 text-[#0a4d2b]" />
                        default:
                          return <Activity className="h-4 w-4 text-neutral-600" />
                      }
                    }

                    const getBg = (type) => {
                      switch (type) {
                        case "order_pending":
                          return "bg-white"
                        case "order_delivered":
                          return "bg-white"
                        case "order_cancelled":
                          return "bg-white"
                        case "restaurant":
                          return "bg-neutral-50"
                        case "delivery":
                          return "bg-neutral-50"
                        case "customer":
                          return "bg-neutral-50"
                        default:
                          return "bg-neutral-50"
                      }
                    }

                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 rounded-xl border border-neutral-200 ${getBg(item.type)} px-3 py-3 hover:border-neutral-300 transition-colors`}
                      >
                        <div className="mt-0.5">{getIcon(item.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-neutral-900 truncate">{item.title}</p>
                            <span className="text-xs text-neutral-400 whitespace-nowrap">{item.time}</span>
                          </div>
                          <p className="text-xs text-neutral-600 line-clamp-1">{item.detail}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-neutral-200 bg-white">
              <CardHeader className="border-b border-neutral-200 pb-4">
                <CardTitle className="text-lg text-neutral-900">Order states</CardTitle>
                <p className="text-sm text-neutral-500">Quick glance by status</p>
              </CardHeader>
              <CardContent className="grid gap-3 pt-4">
                {orderStats.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => {
                      const routes = {
                        'Delivered': '/admin/food/orders/delivered',
                        'Cancelled': '/admin/food/orders/canceled',
                        'Refunded': '/admin/food/orders/refunded',
                        'Pending': '/admin/food/orders/pending',
                        'Processing': '/admin/food/orders/processing',
                        'In Transit': '/admin/food/orders/food-on-the-way',
                      }
                      navigate(routes[item.label] || '/admin/food/orders/all')
                    }}
                    className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 cursor-pointer hover:bg-neutral-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-neutral-900 transition-transform"
                        style={{ background: `${item.color}1A`, color: item.color }}
                      >
                        {item.label.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm text-neutral-900 group-hover:font-medium">{item.label}</p>
                        <p className="text-xs text-neutral-500">Tracked in {selectedPeriod}</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-neutral-900">{item.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// Number card: label, figure, one line of context. `icon` and `accent` are still
// passed by callers but no longer drawn: eighteen tinted cards with icon tiles
// made every figure compete with every other.
// eslint-disable-next-line no-unused-vars
function MetricCard({ title, value, helper, icon, accent, path, loading = false }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => path && navigate(path)}
      className="flex h-full flex-col rounded-xl border border-neutral-900/[0.08] bg-white p-4 text-left outline-none transition-colors duration-150 hover:border-neutral-900/[0.16] focus-visible:ring-2 focus-visible:ring-[#0a4d2b]/30"
    >
      <span className="truncate text-[13px] text-neutral-500">{title}</span>
      <span className="mt-2 min-h-8 font-mono text-2xl font-medium leading-8 text-neutral-900 tabular-nums">
        {loading ? <span className="inline-block h-6 w-24 animate-pulse rounded-md bg-neutral-100" /> : value}
      </span>
      <span className="mt-1 line-clamp-2 text-xs leading-4 text-neutral-500">
        {loading ? <span className="inline-block h-3 w-32 animate-pulse rounded bg-neutral-100" /> : helper}
      </span>
    </button>
  )
}

function DashboardSkeleton() {
  return (
    <div className="px-4 pb-10 lg:px-6 pt-4 w-full">
      <div>
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="h-3 w-32 rounded bg-neutral-200 animate-pulse mb-2" />
              <div className="h-6 w-48 rounded bg-neutral-300 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="h-10 w-[160px] rounded-lg bg-neutral-200 animate-pulse" />
            <div className="h-10 w-[140px] rounded-lg bg-neutral-200 animate-pulse" />
          </div>
        </div>

        {/* Cards Skeleton */}
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="border border-neutral-200 rounded-xl bg-white p-4 h-[100px] flex items-center justify-between">
                <div className="flex flex-col gap-2 w-2/3">
                  <div className="h-2 w-16 bg-neutral-200 rounded animate-pulse" />
                  <div className="h-6 w-24 bg-neutral-300 rounded animate-pulse" />
                  <div className="h-2 w-32 bg-neutral-100 rounded animate-pulse" />
                </div>
                <div className="h-10 w-10 bg-neutral-200 rounded-xl animate-pulse shrink-0" />
              </div>
            ))}
          </div>
          
          {/* Charts Skeleton */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 border border-neutral-200 rounded-xl bg-white p-4 h-[400px]">
              <div className="h-5 w-40 bg-neutral-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-64 bg-neutral-100 rounded animate-pulse mb-6" />
              <div className="h-[300px] w-full bg-neutral-50 rounded animate-pulse" />
            </div>
            <div className="border border-neutral-200 rounded-xl bg-white p-4 h-[400px]">
              <div className="h-5 w-32 bg-neutral-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-48 bg-neutral-100 rounded animate-pulse mb-6" />
              <div className="h-[250px] w-[250px] bg-neutral-50 rounded-full animate-pulse mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

