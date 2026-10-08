/* Ported from Frontend/src/modules/Food/pages/admin/reports/RegularOrderReport.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { BarChart3, ChevronDown, Settings, FileText, FileSpreadsheet, Code, Loader2, RefreshCw, Search, Download } from 'lucide-react-native';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { exportReportsToCSV, exportReportsToExcel, exportReportsToPDF, exportReportsToJSON } from '../../../components/admin/reports/reportsExportUtils';
import AdminListPagination from '../../../components/admin/AdminListPagination';
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
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  LoadingState,
  EmptyState,
  ErrorState,
  Field,
  INPUT,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
const COLS = [50, 120, 160, 160, 130, 130, 100, 130, 110, 120, 130];
const LABELS = ['SI', 'Order Id', 'Restaurant', 'Customer Name', 'Total Item Amount', 'Coupon Discount', 'Vat/Tax', 'Delivery Charge', 'Platform Fee', 'Order Amount', 'Status'];
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
  const { tablet } = useLayoutWidth();
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
      <Card key={statusKey} className="flex-row items-center justify-between gap-2 px-3 py-3">
        <Div className="flex-row items-center gap-2 flex-1 min-w-0">
          <Div className="w-9 h-9 rounded-lg bg-slate-100 items-center justify-center overflow-hidden shrink-0">
            <StatusSvg xml={meta.icon} size={20} />
          </Div>
          <Span className="text-xs font-medium text-slate-700 flex-1">{meta.label}</Span>
        </Div>
        <Span className="text-base font-bold text-slate-900">{statusCounts[statusKey] || 0}</Span>
      </Card>
    );
  };
  if (loading) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={BarChart3}
          title="Order Report"
          subtitle="Every regular order with its charges and status"
          breadcrumb={[{ label: 'Food' }, { label: 'Reports' }, { label: 'Order report' }]}
        />
        <LoadingState label="Loading orders…" />
      </AdminPage>
    );
  }
  if (error) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={BarChart3}
          title="Order Report"
          subtitle="Every regular order with its charges and status"
          breadcrumb={[{ label: 'Food' }, { label: 'Reports' }, { label: 'Order report' }]}
        />
        <ErrorState title="Could not load the order report" message={error} onRetry={handleRefresh} />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={BarChart3}
        title="Order Report"
        subtitle="Every regular order with its charges and status"
        breadcrumb={[{ label: 'Food' }, { label: 'Reports' }, { label: 'Order report' }]}
      />

      <Card className="mb-4">
        <SectionTitle>Search data</SectionTitle>
        <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
          <Field label="Zone">
            <Select value={filters.zone} onChange={(e) => handleFilterChange('zone', e.target.value)} className={INPUT}>
              <Option value="All Zones">All Zones</Option>
              {zones.map((zone) => (
                <Option key={zone._id} value={zone._id}>
                  {zone.zoneName || zone.name}
                </Option>
              ))}
            </Select>
          </Field>

          <Field label="Restaurant">
            <Select value={filters.restaurant} onChange={(e) => handleFilterChange('restaurant', e.target.value)} className={INPUT}>
              <Option value="All restaurants">All restaurants</Option>
              {restaurants.map((restaurant) => (
                <Option key={restaurant._id} value={restaurant._id}>
                  {restaurant.restaurantName || restaurant.name}
                </Option>
              ))}
            </Select>
          </Field>

          <Field label="Customer">
            <Select value={filters.customer} onChange={(e) => handleFilterChange('customer', e.target.value)} className={INPUT}>
              <Option value="All customers">All customers</Option>
              {customers.map((customer) => (
                <Option key={customer._id} value={customer._id}>
                  {customer.name}
                </Option>
              ))}
            </Select>
          </Field>

          <Field label="Time">
            <Select value={filters.time} onChange={(e) => handleFilterChange('time', e.target.value)} className={INPUT}>
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
          </Field>
        </Div>

        <Toolbar className="mt-3 mb-0">
          <Button type="button" onClick={handleResetFilters} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
          </Button>
          <Button
            type="button"
            onClick={handleRefresh}
            disabled={filterLoading || loading}
            accessibilityLabel="Refresh report"
            className="w-11 h-11 rounded-lg border border-slate-300 bg-white items-center justify-center"
          >
            <UiIcon as={RefreshCw} size={18} className="text-slate-600" />
          </Button>
        </Toolbar>
      </Card>

      <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3 mb-4`}>
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

      <Card className="mb-4">
        <SectionTitle>Total orders ({statusCounts.total})</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center flex-1 min-w-[200px] gap-2">
            <Input
              type="text"
              placeholder="Search by Order ID, customer, restaurant"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={`${INPUT} flex-1`}
            />
            <UiIcon as={Search} size={16} className="text-slate-400" />
          </Div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className={BTN_SECONDARY}>
                <UiIcon as={Download} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>Export</Span>
                <UiIcon as={ChevronDown} size={14} className="text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg">
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <UiIcon as={FileText} size={16} className="mr-2 text-slate-500" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <UiIcon as={FileSpreadsheet} size={16} className="mr-2 text-slate-500" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <UiIcon as={FileText} size={16} className="mr-2 text-slate-500" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <UiIcon as={Code} size={16} className="mr-2 text-slate-500" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => setIsSettingsOpen(true)}
            accessibilityLabel="Report settings"
            className="w-11 h-11 rounded-lg border border-slate-300 bg-white items-center justify-center"
          >
            <UiIcon as={Settings} size={18} className="text-slate-600" />
          </Button>
        </Toolbar>
        {filterLoading && (
          <Div className="flex-row items-center gap-2 mt-3">
            <UiIcon as={Loader2} size={14} className="text-blue-600" />
            <Span className="text-xs text-slate-500">Updating report…</Span>
          </Div>
        )}
      </Card>

      {orders.length === 0 ? (
        <EmptyState title="No data found" message="No orders match your filters." actionLabel="Reset filters" onAction={handleResetFilters} />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {orders.map((order, index, all) => (
              <Row key={order.orderId} last={index === all.length - 1}>
                <Cell width={COLS[0]}>{(currentPage - 1) * pageSize + index + 1}</Cell>
                <Cell width={COLS[1]}>
                  <Span className="text-sm font-medium text-blue-600">{order.orderId}</Span>
                </Cell>
                <Cell width={COLS[2]}>{order.restaurant}</Cell>
                <Cell width={COLS[3]}>{order.customerName}</Cell>
                <Cell width={COLS[4]} align="right">{formatAmount(order.totalAmount)}</Cell>
                <Cell width={COLS[5]} align="right">{formatAmount(order.couponDiscount)}</Cell>
                <Cell width={COLS[6]} align="right">{formatAmount(order.vatTax)}</Cell>
                <Cell width={COLS[7]} align="right">{formatAmount(order.deliveryCharge)}</Cell>
                <Cell width={COLS[8]} align="right">{formatAmount(order.platformFee)}</Cell>
                <Cell width={COLS[9]} align="right">
                  <Span className="text-sm font-semibold text-slate-900">{formatAmount(order.totalAmount || order.totalItemAmount)}</Span>
                </Cell>
                <Cell width={COLS[10]}>
                  <StatusBadge status={order.orderStatus} />
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

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

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex-row items-center gap-2">
              <UiIcon as={Settings} size={18} className="text-slate-600" />
              Report Settings
            </DialogTitle>
          </DialogHeader>
          <Div className="px-4 pb-4">
            <P className="text-sm text-slate-700">Regular order report settings and preferences will be available here.</P>
          </Div>
          <Div className="px-4 pb-4 flex-row items-center justify-end">
            <Button onClick={() => setIsSettingsOpen(false)} className="flex-row items-center justify-center gap-2 h-11 px-4 rounded-lg bg-blue-600">
              <Span className="text-sm font-semibold text-white">Close</Span>
            </Button>
          </Div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
