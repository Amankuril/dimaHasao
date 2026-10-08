/* Ported from Frontend/src/modules/Food/pages/admin/reports/RegularOrderReport.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { BarChart3, ChevronDown, Settings, FileText, FileSpreadsheet, Code, Loader2, RefreshCw } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/shadcn';
import { exportReportsToCSV, exportReportsToExcel, exportReportsToPDF, exportReportsToJSON } from '../../../components/admin/reports/reportsExportUtils';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import searchIcon from '../../../assets/Dashboard-icons/image8.png';
import exportIcon from '../../../assets/Dashboard-icons/image9.png';
import {
  StatusSvg,
  acceptedIcon,
  canceledIcon,
  deliveredIcon,
  onTheWayIcon,
  paymentFailedIcon,
  pendingIcon,
  processingIcon,
  refundedIcon,
  scheduledIcon,
} from '../../../components/admin/reports/dashboardStatusIcons';
import {
  Button,
  Div,
  H1,
  H2,
  Img,
  Input,
  Option,
  P,
  ScrollDiv,
  Select,
  Span,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const statusMeta = {
  Scheduled: {
    label: 'Scheduled Orders',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    icon: scheduledIcon,
  },
  Pending: {
    label: 'Pending Orders',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    icon: pendingIcon,
  },
  Accepted: {
    label: 'Accepted Orders',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    icon: acceptedIcon,
  },
  Processing: {
    label: 'Processing Orders',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    icon: processingIcon,
  },
  'Food On The Way': {
    label: 'Food On The Way',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    icon: onTheWayIcon,
  },
  Delivered: {
    label: 'Delivered',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    icon: deliveredIcon,
  },
  Canceled: {
    label: 'Canceled',
    color: 'text-red-600',
    bg: 'bg-red-50',
    icon: canceledIcon,
  },
  'Payment Failed': {
    label: 'Payment Failed',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    icon: paymentFailedIcon,
  },
  Refunded: {
    label: 'Refunded',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    icon: refundedIcon,
  },
};
export default function RegularOrderReport() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zones, setZones] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [statusCounts, setStatusCounts] = useState({
    total: 0,
    Scheduled: 0,
    Pending: 0,
    Accepted: 0,
    Processing: 0,
    'Food On The Way': 0,
    Delivered: 0,
    Canceled: 0,
    'Payment Failed': 0,
    Refunded: 0,
  });
  const [filters, setFilters] = useState({
    zone: 'All Zones',
    restaurant: 'All restaurants',
    customer: 'All customers',
    time: 'All Time',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem('admin_order_report_pageSize')) || 20);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filters]);

  // Fetch zones, restaurants, and customers for filter dropdowns
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        // Fetch zones
        const zonesRes = await adminAPI.getZones({
          limit: 1000,
          isActive: true,
        });
        if (zonesRes.data?.success) {
          setZones(zonesRes.data.data.zones || []);
        }

        // Fetch restaurants
        const restaurantsRes = await adminAPI.getRestaurants({
          limit: 1000,
        });
        if (restaurantsRes.data?.success) {
          setRestaurants(restaurantsRes.data.data.restaurants || []);
        }

        // Fetch customers (users) via existing customers API
        const customersRes = await adminAPI.getCustomers({
          limit: 1000,
        });
        if (customersRes.data?.success) {
          setCustomers(customersRes.data.data.customers || []);
        }
      } catch (err) {
        debugError('Error fetching filter data:', err);
      }
    };
    fetchFilterData();
  }, []);

  // Calculate date range based on time filter
  const getDateRange = () => {
    const now = new Date();
    let fromDate = null;
    let toDate = null;
    switch (filters.time) {
      case 'Today':
        fromDate = new Date(now.setHours(0, 0, 0, 0));
        toDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'This Week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        fromDate = weekStart;
        toDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'This Month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      default:
        // All Time - no date filter
        break;
    }
    return {
      fromDate,
      toDate,
    };
  };

  // Fetch orders from backend
  useEffect(() => {
    const fetchOrders = async () => {
      if (orders.length === 0) {
        setLoading(true);
      } else {
        setFilterLoading(true);
      }
      setError(null);
      try {
        const { fromDate, toDate } = getDateRange();
        const params = {
          page: currentPage,
          limit: pageSize,
          includeStatusCounts: 1,
          startDate: fromDate ? fromDate.toISOString().split('T')[0] : undefined,
          endDate: toDate ? toDate.toISOString().split('T')[0] : undefined,
          search: debouncedSearch || undefined,
          restaurantId: filters.restaurant !== 'All restaurants' ? filters.restaurant : undefined,
          userId: filters.customer !== 'All customers' ? filters.customer : undefined,
          zoneId: filters.zone !== 'All Zones' ? filters.zone : undefined,
        };
        const response = await adminAPI.getOrders(params);
        if (response.data?.success) {
          // Transform backend orders (FoodOrder docs) to report format
          const rawOrders = response.data.data.orders || [];
          const meta = response.data.data.meta || response.data.data.pagination || {};
          const total = Number(meta.total ?? response.data.data.total ?? rawOrders.length) || 0;
          setTotalOrders(total);
          if (response.data.data.statusCounts) {
            setStatusCounts({
              Scheduled: 0,
              Pending: 0,
              Accepted: 0,
              Processing: 0,
              'Food On The Way': 0,
              Delivered: 0,
              Canceled: 0,
              'Payment Failed': 0,
              Refunded: 0,
              ...response.data.data.statusCounts,
              total,
            });
          } else {
            setStatusCounts((prev) => ({
              ...prev,
              total,
            }));
          }
          const transformedOrders = rawOrders.map((order) => {
            const pricing = order.pricing || {};
            const items = Array.isArray(order.items) ? order.items : [];
            const itemsSubtotal = items.reduce((sum, item) => {
              const qty = Number(item.quantity || 1);
              const price = Number(item.price || 0);
              return sum + qty * price;
            }, 0);
            const subtotal = itemsSubtotal > 0 ? itemsSubtotal : Number(pricing.subtotal || 0);
            const deliveryCharge = Number(pricing.deliveryFee || 0);
            const platformFee = Number(pricing.platformFee || 0);
            const vatTax = Number(pricing.tax || 0);
            const couponDiscount = Number(pricing.discount || 0);
            const computedTotal = subtotal + deliveryCharge + platformFee + vatTax - couponDiscount;
            const totalAmount = pricing.total != null ? Number(pricing.total) : computedTotal;
            const restaurantName = order.restaurantId?.restaurantName || order.restaurantName || '';
            const restaurantId = order.restaurantId?._id || order.restaurantId?.id || order.restaurantId || '';
            const customerName = order.userId?.name || order.customerName || 'N/A';
            const customerId = order.userId?._id || order.userId?.id || order.userId || '';
            const restaurantMeta = restaurants.find((restaurant) => {
              const candidateId = restaurant?._id || restaurant?.id || restaurant?.restaurantId;
              return String(candidateId || '') === String(restaurantId || '');
            });
            const zoneId = order.zoneId?._id || order.zoneId?.id || order.zoneId || restaurantMeta?.zoneId?._id || restaurantMeta?.zoneId || '';
            const backendStatus = String(order.orderStatus || '').toLowerCase();
            let displayStatus = order.orderStatus;
            if (!backendStatus || backendStatus === 'created' || backendStatus === 'confirmed') {
              displayStatus = 'Pending';
            } else if (backendStatus === 'preparing' || backendStatus === 'ready_for_pickup') {
              displayStatus = 'Processing';
            } else if (backendStatus === 'picked_up') {
              displayStatus = 'Food On The Way';
            } else if (backendStatus === 'delivered') {
              displayStatus = 'Delivered';
            } else if (backendStatus === 'cancelled_by_restaurant') {
              displayStatus = 'Canceled';
            } else if (backendStatus === 'cancelled_by_user' || backendStatus === 'cancelled_by_admin') {
              displayStatus = 'Canceled';
            }
            return {
              orderId: order.orderId,
              restaurantId: String(restaurantId || ''),
              restaurant: restaurantName,
              customerId: String(customerId || ''),
              customerName,
              zoneId: String(zoneId || ''),
              totalItemAmount: subtotal,
              couponDiscount,
              vatTax,
              deliveryCharge,
              platformFee,
              totalAmount,
              orderStatus: displayStatus,
            };
          });
          setOrders(transformedOrders);
        } else {
          setError(response.data?.message || 'Failed to fetch orders');
          toast.error(response.data?.message || 'Failed to fetch orders');
        }
      } catch (err) {
        debugError('Error fetching orders:', err);
        setError(err.response?.data?.message || 'Failed to fetch orders');
        toast.error(err.response?.data?.message || 'Failed to fetch orders');
      } finally {
        setLoading(false);
        setFilterLoading(false);
      }
    };
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, debouncedSearch, currentPage, pageSize, restaurants, refreshKey]);
  const handleExport = (format) => {
    if (orders.length === 0) {
      alert('No data to export');
      return;
    }
    const headers = [
      {
        key: 'orderId',
        label: 'Order ID',
      },
      {
        key: 'restaurant',
        label: 'Restaurant',
      },
      {
        key: 'customerName',
        label: 'Customer Name',
      },
      {
        key: 'totalItemAmount',
        label: 'Total Item Amount',
      },
      {
        key: 'couponDiscount',
        label: 'Coupon Discount',
      },
      {
        key: 'vatTax',
        label: 'VAT/Tax',
      },
      {
        key: 'deliveryCharge',
        label: 'Delivery Charge',
      },
      {
        key: 'platformFee',
        label: 'Platform Fee',
      },
      {
        key: 'totalAmount',
        label: 'Order Amount',
      },
      {
        key: 'orderStatus',
        label: 'Status',
      },
    ];
    switch (format) {
      case 'csv':
        exportReportsToCSV(orders, headers, 'regular_order_report');
        break;
      case 'excel':
        exportReportsToExcel(orders, headers, 'regular_order_report');
        break;
      case 'pdf':
        exportReportsToPDF(orders, headers, 'regular_order_report', 'Regular Order Report');
        break;
      case 'json':
        exportReportsToJSON(orders, 'regular_order_report');
        break;
    }
  };
  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };
  const handleResetFilters = () => {
    setFilters({
      zone: 'All Zones',
      restaurant: 'All restaurants',
      customer: 'All customers',
      time: 'All Time',
    });
    setSearchQuery('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };
  const formatAmount = (amount) =>
    `₹${Number(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };
  const renderStatusRow = (statusKey) => {
    const meta = statusMeta[statusKey];
    if (!meta) return null;
    return (
      <Div key={statusKey} className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-3 py-2 shadow-sm">
        <Div className="flex items-center gap-2">
          <Div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center overflow-hidden`}>
            <StatusSvg xml={meta.icon} size={20} />
          </Div>
          <Span className="text-[11px] font-medium text-slate-800">{meta.label}</Span>
        </Div>
        <Span className={`text-xs font-semibold ${meta.color}`}>{statusCounts[statusKey] || 0}</Span>
      </Div>
    );
  };
  if (loading) {
    return (
      <ScrollDiv className="p-2 lg:p-3 bg-slate-50 min-h-screen flex items-center justify-center">
        <Div className="flex flex-col items-center gap-4">
          <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-blue-500" />
          <P className="text-gray-600">Loading orders...</P>
        </Div>
      </ScrollDiv>
    );
  }
  if (error) {
    return (
      <ScrollDiv className="p-2 lg:p-3 bg-slate-50 min-h-screen flex items-center justify-center">
        <Div className="text-center">
          <P className="text-red-600 mb-2">Error: {error}</P>
          <Button onClick={handleRefresh} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Retry
          </Button>
        </Div>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <Div className="w-full mx-auto">
        {/* Page Header */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
          <Div className="flex items-center gap-2">
            <Div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <UiIcon as={BarChart3} className="w-3.5 h-3.5 text-white" />
            </Div>
            <H1 className="text-lg font-bold text-slate-900">Order Report</H1>
          </Div>
        </Div>

        {/* Search Data Filters */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
          <Div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Div className="relative flex-1 min-w-0">
              <Select
                value={filters.zone}
                onChange={(e) => handleFilterChange('zone', e.target.value)}
                className="w-full px-2.5 py-1.5 pr-5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs appearance-none cursor-pointer"
              >
                <Option value="All Zones">All Zones</Option>
                {zones.map((zone) => (
                  <Option key={zone._id} value={zone._id}>
                    {zone.zoneName || zone.name}
                  </Option>
                ))}
              </Select>
              <UiIcon as={ChevronDown} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
            </Div>

            <Div className="relative flex-1 min-w-0">
              <Select
                value={filters.restaurant}
                onChange={(e) => handleFilterChange('restaurant', e.target.value)}
                className="w-full px-2.5 py-1.5 pr-5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs appearance-none cursor-pointer"
              >
                <Option value="All restaurants">All restaurants</Option>
                {restaurants.map((restaurant) => (
                  <Option key={restaurant._id} value={restaurant._id}>
                    {restaurant.restaurantName || restaurant.name}
                  </Option>
                ))}
              </Select>
              <UiIcon as={ChevronDown} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
            </Div>

            <Div className="relative flex-1 min-w-0">
              <Select
                value={filters.customer}
                onChange={(e) => handleFilterChange('customer', e.target.value)}
                className="w-full px-2.5 py-1.5 pr-5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs appearance-none cursor-pointer"
              >
                <Option value="All customers">All customers</Option>
                {customers.map((customer) => (
                  <Option key={customer._id} value={customer._id}>
                    {customer.name}
                  </Option>
                ))}
              </Select>
              <UiIcon as={ChevronDown} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
            </Div>

            <Div className="relative flex-1 min-w-0">
              <Select
                value={filters.time}
                onChange={(e) => handleFilterChange('time', e.target.value)}
                className="w-full px-2.5 py-1.5 pr-5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs appearance-none cursor-pointer"
              >
                <Option key="all-time" value="All Time">
                  All Time
                </Option>
                <Option key="today" value="Today">
                  Today
                </Option>
                <Option key="this-week" value="This Week">
                  This Week
                </Option>
                <Option key="this-month" value="This Month">
                  This Month
                </Option>
              </Select>
              <UiIcon as={ChevronDown} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
            </Div>

            <Button
              type="button"
              onClick={handleRefresh}
              disabled={filterLoading || loading}
              accessibilityLabel="Refresh"
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <UiIcon as={RefreshCw} className={`w-3.5 h-3.5 ${filterLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all whitespace-nowrap"
            >
              Reset
            </Button>
          </Div>
        </Div>

        {/* Status Summary Cards */}
        <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-3">
          {renderStatusRow('Scheduled')}
          {renderStatusRow('Pending')}
          {renderStatusRow('Processing')}
          {renderStatusRow('Food On The Way')}
          {renderStatusRow('Accepted')}
          {renderStatusRow('Delivered')}
          {renderStatusRow('Canceled')}
          {renderStatusRow('Payment Failed')}
          {renderStatusRow('Refunded')}
        </Div>

        {/* Total Orders & Table */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <H2 className="text-base font-bold text-slate-900">
              Total Orders <Span className="text-blue-600">{statusCounts.total}</Span>
            </H2>

            <Div className="flex items-center gap-2">
              <Div className="relative flex-1 sm:flex-initial min-w-[180px]">
                <Input
                  type="text"
                  placeholder="Search by Order ID, customer, restaurant"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-7 pr-2 py-1.5 w-full text-[11px] rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Img src={searchIcon} alt="Search" className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" />
              </Div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 transition-all">
                    <Img src={exportIcon} alt="Export" className="w-3 h-3" />
                    <Span>Export</Span>
                    <UiIcon as={ChevronDown} className="w-2.5 h-2.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                >
                  <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
                    <UiIcon as={FileText} className="w-4 h-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')} className="cursor-pointer">
                    <UiIcon as={FileSpreadsheet} className="w-4 h-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
                    <UiIcon as={FileText} className="w-4 h-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')} className="cursor-pointer">
                    <UiIcon as={Code} className="w-4 h-4 mr-2" />
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => setIsSettingsOpen(true)}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all"
              >
                <UiIcon as={Settings} className="w-3 h-3" />
              </Button>
            </Div>
          </Div>

          {filterLoading && (
            <Div className="mb-3 flex items-center gap-2 text-[11px] text-slate-500">
              <UiIcon as={Loader2} className="w-3.5 h-3.5 animate-spin text-blue-500" />
              Updating report...
            </Div>
          )}

          {/* Table */}
            <Table cols={[46, 110, 150, 150, 110, 110, 90, 110, 100, 110, 110]} className="w-full">
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  <Th
                    className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    SI
                  </Th>
                  <Th
                    className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Order Id
                  </Th>
                  <Th
                    className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Restaurant
                  </Th>
                  <Th
                    className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Customer Name
                  </Th>
                  <Th
                    className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Total Item Amount
                  </Th>
                  <Th
                    className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Coupon Discount
                  </Th>
                  <Th
                    className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Vat/Tax
                  </Th>
                  <Th
                    className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Delivery Charge
                  </Th>
                  <Th
                    className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Platform Fee
                  </Th>
                  <Th
                    className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Order Amount
                  </Th>
                  <Th
                    className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Status
                  </Th>
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <Tr>
                    <Td colSpan={11} className="px-6 py-20 text-center">
                      <Div className="flex flex-col items-center justify-center">
                        <P className="text-lg font-semibold text-slate-700 mb-1">No Data Found</P>
                        <P className="text-sm text-slate-500">No orders match your filters</P>
                      </Div>
                    </Td>
                  </Tr>
                ) : (
                  orders.map((order, index) => (
                    <Tr key={order.orderId} className="hover:bg-slate-50 transition-colors">
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] font-medium text-slate-700">{(currentPage - 1) * pageSize + index + 1}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] text-blue-600 hover:underline cursor-pointer">{order.orderId}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] text-slate-700 truncate block">{order.restaurant}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] text-slate-700 truncate block">{order.customerName}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] text-slate-700">{formatAmount(order.totalAmount)}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] text-slate-700">{formatAmount(order.couponDiscount)}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] text-slate-700">{formatAmount(order.vatTax)}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] text-slate-700">{formatAmount(order.deliveryCharge)}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] text-slate-700">{formatAmount(order.platformFee)}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] font-medium text-slate-900">{formatAmount(order.totalAmount || order.totalItemAmount)}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-slate-100 text-slate-700">
                          {order.orderStatus}
                        </Span>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>

          <AdminListPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalOrders}
            itemLabel="orders"
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              localStorage.setItem('admin_order_report_pageSize', String(size));
              setCurrentPage(1);
            }}
          />
        </Div>
      </Div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <UiIcon as={Settings} className="w-5 h-5" />
              Report Settings
            </DialogTitle>
          </DialogHeader>
          <Div className="px-6 pb-6">
            <P className="text-sm text-slate-700">Regular order report settings and preferences will be available here.</P>
          </Div>
          <Div className="px-6 pb-6 flex items-center justify-end">
            <Button
              onClick={() => setIsSettingsOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md"
            >
              Close
            </Button>
          </Div>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
