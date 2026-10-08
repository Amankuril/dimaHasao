/* Ported from Frontend/src/modules/Food/pages/admin/reports/TransactionReport.jsx (tools/port.js first pass). */
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from '../../../../lib/webRouter';
import { BarChart3, ChevronDown, Info, FileText, FileSpreadsheet, Code, Loader2, X, RefreshCw } from 'lucide-react-native';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import {
  exportTransactionReportToCSV,
  exportTransactionReportToExcel,
  exportTransactionReportToPDF,
  exportTransactionReportToJSON,
} from '../../../components/admin/reports/reportsExportUtils';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { Skeleton } from '../../../../components/shadcn';
import AdminListPagination from '../../../components/admin/AdminListPagination';

// Import icons from Transaction-report-icons
import completedIcon from '../../../assets/Transaction-report-icons/trx1.png';
import refundedIcon from '../../../assets/Transaction-report-icons/trx3.png';
import adminEarningIcon from '../../../assets/Transaction-report-icons/admin-earning.png';
import restaurantEarningIcon from '../../../assets/Transaction-report-icons/store-earning.png';
import deliverymanEarningIcon from '../../../assets/Transaction-report-icons/deliveryman-earning.png';

// Import search and export icons from Dashboard-icons
import searchIcon from '../../../assets/Dashboard-icons/image8.png';
import exportIcon from '../../../assets/Dashboard-icons/image9.png';
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
function AmountSkeleton({ className = 'h-6 w-24 mx-auto' }) {
  return <Skeleton className={className} />;
}
const METRIC_INFO = {
  completed: 'Total GMV from delivered orders — sum of each delivered order’s pricing.total. Pulled live from FoodOrder data.',
  refunded:
    'Total amount actually refunded to customers (online/wallet payments where payment status is refunded). COD cancels are excluded — no money was collected, so nothing is refunded.',
  admin:
    'Platform Total (same as dashboard) = restaurant commission + platform fee + admin pricing markup + delivery net (delivery fee − rider earning) + GST, for delivered orders only.',
  restaurant:
    'Restaurant share = (restaurant base item amount + packaging) − restaurant commission, for delivered orders only. Admin pricing markup is not included in restaurant wallet.',
  deliveryman:
    'Total delivery partner earnings — sum of riderEarning on delivered orders that have an assigned delivery partner (same basis as Delivery Earning page).',
};
function InfoTip({ tipKey, colorClass = 'bg-green-500', align = 'right' }) {
  const [open, setOpen] = useState(false);
  return (
    <Div className="relative inline-flex">
      <Button
        type="button"
        accessibilityLabel="What does this mean?"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${colorClass} flex items-center justify-center text-white shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer`}
      >
        <UiIcon as={Info} className="w-3 h-3" />
      </Button>
      {open && (
        <Div
          className={`absolute z-50 mt-2 w-64 sm:w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-left ${align === 'left' ? 'left-0' : 'right-0'}`}
        >
          <Div className="flex items-start justify-between gap-2 mb-1.5">
            <P className="text-[11px] font-bold uppercase tracking-wide text-slate-500">How this is calculated</P>
            <Button type="button" accessibilityLabel="Close" onClick={() => setOpen(false)} className="p-0.5 rounded text-slate-400 hover:text-slate-700">
              <UiIcon as={X} className="w-3.5 h-3.5" />
            </Button>
          </Div>
          <P className="text-xs text-slate-700 leading-relaxed">{METRIC_INFO[tipKey]}</P>
        </Div>
      )}
    </Div>
  );
}
export default function TransactionReport() {
  const [searchParams] = useSearchParams();
  const focusPlatformTotal = searchParams.get('focus') === 'platform-total';
  const platformTotalRef = useRef(null);
  const pageRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_txn_report_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    completedTransaction: 0,
    refundedTransaction: 0,
    adminEarning: 0,
    platformTotal: 0,
    platformTotalBreakdown: {
      commission: 0,
      platformFee: 0,
      markup: 0,
      deliveryNet: 0,
      gst: 0,
    },
    restaurantEarning: 0,
    deliverymanEarning: 0,
  });
  const [filters, setFilters] = useState({
    zone: 'All Zones',
    restaurant: 'All restaurants',
    time: 'All Time',
  });
  const [zones, setZones] = useState([]);
  const [restaurants, setRestaurants] = useState([]);

  // Fetch zones and restaurants for filters
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        // Fetch zones
        const zonesResponse = await adminAPI.getZones({
          limit: 1000,
        });
        if (zonesResponse?.data?.success && zonesResponse.data.data?.zones) {
          setZones(zonesResponse.data.data.zones);
        }

        // Fetch restaurants
        const restaurantsResponse = await adminAPI.getRestaurants({
          limit: 1000,
        });
        if (restaurantsResponse?.data?.success && restaurantsResponse.data.data?.restaurants) {
          setRestaurants(restaurantsResponse.data.data.restaurants);
        }
      } catch (error) {
        debugError('Error fetching filter data:', error);
      }
    };
    fetchFilterData();
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, debouncedSearch]);

  // Fetch transaction report data
  useEffect(() => {
    const fetchTransactionReport = async () => {
      try {
        setIsRefreshing(true);

        // Build date range based on time filter
        let fromDate = null;
        let toDate = null;
        const now = new Date();
        if (filters.time === 'Today') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        } else if (filters.time === 'This Week') {
          const dayOfWeek = now.getDay();
          const diff = now.getDate() - dayOfWeek;
          fromDate = new Date(now.getFullYear(), now.getMonth(), diff);
          toDate = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59);
        } else if (filters.time === 'This Month') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
          toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        }
        const params = {
          search: debouncedSearch || undefined,
          zone: filters.zone !== 'All Zones' ? filters.zone : undefined,
          restaurant: filters.restaurant !== 'All restaurants' ? filters.restaurant : undefined,
          time: filters.time || 'All Time',
          fromDate: fromDate ? fromDate.toISOString() : undefined,
          toDate: toDate ? toDate.toISOString() : undefined,
          page: currentPage,
          limit: pageSize,
        };
        const response = await adminAPI.getTransactionReport(params);
        if (response?.data?.success && response.data.data) {
          const data = response.data.data;
          setTransactions(data.transactions || []);
          setTotalItems(data.pagination?.total ?? data.meta?.total ?? 0);
          setSummary({
            completedTransaction: 0,
            refundedTransaction: 0,
            adminEarning: 0,
            platformTotal: 0,
            restaurantEarning: 0,
            deliverymanEarning: 0,
            ...(data.summary || {}),
            platformTotalBreakdown: {
              commission: 0,
              platformFee: 0,
              markup: 0,
              deliveryNet: 0,
              gst: 0,
              ...(data.summary?.platformTotalBreakdown || {}),
            },
          });
        } else {
          setTransactions([]);
          setTotalItems(0);
          if (response?.data?.message) {
            toast.error(response.data.message);
          }
        }
      } catch (error) {
        debugError('Error fetching transaction report:', error);
        toast.error('Failed to fetch transaction report');
        setTransactions([]);
        setTotalItems(0);
      } finally {
        setIsRefreshing(false);
        setLoading(false);
      }
    };
    fetchTransactionReport();
  }, [debouncedSearch, filters, currentPage, pageSize, refreshKey]);
  const amountsLoading = loading || isRefreshing;
  useEffect(() => {
    if (!focusPlatformTotal || amountsLoading) return;
    const t = setTimeout(() => {
      const scroller = pageRef.current;
      const node = scroller?.getInnerViewNode?.();
      if (!node) return;
      platformTotalRef.current?.measureLayout?.(node, (_x, y) => {
        scroller.scrollTo({ y: Math.max(0, y - 80), animated: true });
      });
    }, 150);
    return () => clearTimeout(t);
  }, [focusPlatformTotal, amountsLoading, summary.platformTotal, summary.adminEarning]);
  const handleExport = (format) => {
    if (transactions.length === 0) {
      alert('No data to export');
      return;
    }
    switch (format) {
      case 'csv':
        exportTransactionReportToCSV(transactions);
        break;
      case 'excel':
        exportTransactionReportToExcel(transactions);
        break;
      case 'pdf':
        exportTransactionReportToPDF(transactions);
        break;
      case 'json':
        exportTransactionReportToJSON(transactions);
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
      time: 'All Time',
    });
    setSearchQuery('');
    setCurrentPage(1);
  };
  const formatCurrency = (amount) => {
    const num = Number(amount);
    const safe = Number.isFinite(num) ? num : 0;
    if (safe >= 1000) {
      return `\u20B9 ${(safe / 1000).toFixed(2)}K`;
    }
    return `\u20B9 ${safe.toFixed(2)}`;
  };
  const formatFullCurrency = (amount) => {
    const num = Number(amount);
    if (!num || isNaN(num)) return '₹ 0.00';
    return `₹ ${num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };
  const getStatusBadgeClasses = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (['captured', 'settled', 'completed', 'paid', 'delivered', 'confirmed'].includes(normalized)) {
      return 'bg-green-100 text-green-700';
    }
    if (['pending', 'created', 'authorized', 'cod_pending', 'processing'].includes(normalized)) {
      return 'bg-yellow-100 text-yellow-700';
    }
    if (['failed', 'refunded', 'cancelled', 'cancelled_by_admin', 'cancelled_by_user', 'cancelled_by_restaurant'].includes(normalized)) {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-slate-100 text-slate-700';
  };
  const formatStatusLabel = (status) => {
    const raw = String(status || 'N/A').trim();
    if (!raw) return 'N/A';
    const lower = raw.toLowerCase();
    // Legacy ledger values → user-facing labels
    if (lower === 'captured' || lower === 'settled') return 'Delivered';
    if (lower === 'completed') return 'Delivered';
    return raw
      .split(/[_\s]+/)
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
      .join(' ');
  };
  const platformTotalValue = Number(summary.platformTotal ?? summary.adminEarning ?? 0);
  const platformBreakdown = {
    commission: 0,
    platformFee: 0,
    markup: 0,
    deliveryNet: 0,
    gst: 0,
    ...(summary.platformTotalBreakdown || {}),
  };
  const platformTotalHelper = [
    `Comm: ${formatCurrency(platformBreakdown.commission)}`,
    `Platform: ${formatCurrency(platformBreakdown.platformFee)}`,
    `Admin Pricing: ${formatCurrency(platformBreakdown.markup)}`,
    `Delivery Net: ${formatCurrency(platformBreakdown.deliveryNet)}`,
    `GST: ${formatCurrency(platformBreakdown.gst)}`,
  ].join(' + ');
  const markupByRestaurant = Array.isArray(summary.markupByRestaurant) ? summary.markupByRestaurant : [];
  return (
    <ScrollDiv ref={pageRef} className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <Div className="w-full mx-auto">
        {/* Page Header */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
          <Div className="flex items-center gap-2">
            <Div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <UiIcon as={BarChart3} className="w-3.5 h-3.5 text-white" />
            </Div>
            <H1 className="text-lg font-bold text-slate-900">Transaction Report</H1>
          </Div>
        </Div>

        {/* Search Data Section */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
          <Div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Div className="relative flex-1 min-w-0">
              <Select
                value={filters.zone}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    zone: e.target.value,
                  }))
                }
                className="w-full px-2.5 py-1.5 pr-5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs appearance-none cursor-pointer"
              >
                <Option value="All Zones">All Zones</Option>
                {zones.map((zone) => (
                  <Option key={zone._id} value={zone.zoneName || zone.name}>
                    {zone.zoneName || zone.name}
                  </Option>
                ))}
              </Select>
              <UiIcon as={ChevronDown} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
            </Div>

            <Div className="relative flex-1 min-w-0">
              <Select
                value={filters.restaurant}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    restaurant: e.target.value,
                  }))
                }
                className="w-full px-2.5 py-1.5 pr-5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs appearance-none cursor-pointer"
              >
                <Option value="All restaurants">All restaurants</Option>
                {restaurants.map((restaurant) => (
                  <Option key={restaurant._id} value={restaurant.restaurantName || restaurant.name}>
                    {restaurant.restaurantName || restaurant.name}
                  </Option>
                ))}
              </Select>
              <UiIcon as={ChevronDown} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
            </Div>

            <Div className="relative flex-1 min-w-0">
              <Select
                value={filters.time}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    time: e.target.value,
                  }))
                }
                className="w-full px-2.5 py-1.5 pr-5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs appearance-none cursor-pointer"
              >
                <Option value="All Time">All Time</Option>
                <Option value="Today">Today</Option>
                <Option value="This Week">This Week</Option>
                <Option value="This Month">This Month</Option>
              </Select>
              <UiIcon as={ChevronDown} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
            </Div>

            <Button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              accessibilityLabel="Refresh"
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <UiIcon as={RefreshCw} className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
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

        {/* Summary Cards */}
        <Div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <Div className="space-y-3">
            <Div
              className="rounded-lg shadow-sm border border-slate-200 p-4"
              style={{
                backgroundColor: '#f1f5f9',
              }}
            >
              <Div className="relative mb-3 flex justify-center">
                <Div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Img src={completedIcon} alt="Completed" className="w-12 h-12" />
                </Div>
                <Div className="absolute top-0 right-0">
                  <InfoTip tipKey="completed" colorClass="bg-green-500" align="right" />
                </Div>
              </Div>
              <Div className="text-center">
                <Div className="text-xl font-bold text-green-600 mb-1 min-h-[1.75rem] flex items-center justify-center">
                  {amountsLoading ? <AmountSkeleton className="h-7 w-28" /> : formatCurrency(summary.completedTransaction)}
                </Div>
                <P className="text-sm text-slate-600 leading-tight">Completed Transaction</P>
              </Div>
            </Div>

            <Div
              className="rounded-lg shadow-sm border border-slate-200 p-4"
              style={{
                backgroundColor: '#f1f5f9',
              }}
            >
              <Div className="relative mb-3 flex justify-center">
                <Div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <Img src={refundedIcon} alt="Refunded" className="w-12 h-12" />
                </Div>
                <Div className="absolute top-0 right-0">
                  <InfoTip tipKey="refunded" colorClass="bg-red-500" align="right" />
                </Div>
              </Div>
              <Div className="text-center">
                <Div className="text-xl font-bold text-red-600 mb-1 min-h-[1.75rem] flex items-center justify-center">
                  {amountsLoading ? <AmountSkeleton className="h-7 w-28" /> : formatFullCurrency(summary.refundedTransaction)}
                </Div>
                <P className="text-sm text-slate-600 leading-tight">Refunded Transaction</P>
              </Div>
            </Div>
          </Div>

          <Div className="space-y-3">
            <Div
              ref={platformTotalRef}
              nativeID="platform-total"
              className={`rounded-lg shadow-sm border p-3 transition-shadow ${focusPlatformTotal ? 'border-green-400 bg-green-50 ring-2 ring-green-200' : 'border-slate-200'}`}
              style={
                focusPlatformTotal
                  ? undefined
                  : {
                      backgroundColor: '#f1f5f9',
                    }
              }
            >
              <Div className="flex items-center justify-between gap-3">
                <Div className="flex items-center gap-3 min-w-0">
                  <Div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <Img src={adminEarningIcon} alt="Platform Total" className="w-6 h-6" />
                  </Div>
                  <Div className="min-w-0">
                    <Div className="flex items-center gap-2">
                      <P className="text-sm font-semibold text-slate-900">Platform Total</P>
                      <InfoTip tipKey="admin" colorClass="bg-green-500" align="left" />
                    </Div>
                    <P className="text-[10px] text-slate-500 leading-snug mt-0.5 truncate">{amountsLoading ? 'Calculating…' : platformTotalHelper}</P>
                  </Div>
                </Div>
                <Div className="text-base font-bold text-slate-900 min-w-[4.5rem] flex justify-end shrink-0">
                  {amountsLoading ? <AmountSkeleton className="h-5 w-16" /> : formatCurrency(platformTotalValue)}
                </Div>
              </Div>
            </Div>

            {!amountsLoading && markupByRestaurant.length > 0 ? (
              <Div className="rounded-lg shadow-sm border border-slate-200 bg-white p-3">
                <P className="text-sm font-semibold text-slate-900 mb-2">Admin Pricing by Restaurant</P>
                <ScrollDiv className="space-y-1.5 max-h-40">
                  {markupByRestaurant.map((row) => (
                    <Div key={row.restaurantId || row.restaurant} className="flex items-center justify-between gap-3 text-xs">
                      <Span className="text-slate-700 truncate">
                        {row.restaurant}
                        <Span className="text-slate-400">
                          {' '}
                          · {row.orders} order{row.orders === 1 ? '' : 's'}
                        </Span>
                      </Span>
                      <Span className="font-semibold text-slate-900 shrink-0">{formatCurrency(row.adminMarkup)}</Span>
                    </Div>
                  ))}
                </ScrollDiv>
              </Div>
            ) : null}

            <Div
              className="rounded-lg shadow-sm border border-slate-200 p-3"
              style={{
                backgroundColor: '#f1f5f9',
              }}
            >
              <Div className="flex items-center justify-between">
                <Div className="flex items-center gap-3">
                  <Div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Img src={restaurantEarningIcon} alt="Restaurant Earning" className="w-6 h-6" />
                  </Div>
                  <Div className="flex items-center gap-2">
                    <P className="text-sm font-semibold text-slate-900">Restaurant Earning</P>
                    <InfoTip tipKey="restaurant" colorClass="bg-blue-500" align="left" />
                  </Div>
                </Div>
                <Div className="text-base font-bold text-green-600 min-w-[4.5rem] flex justify-end">
                  {amountsLoading ? <AmountSkeleton className="h-5 w-16" /> : formatCurrency(summary.restaurantEarning)}
                </Div>
              </Div>
            </Div>

            <Div
              className="rounded-lg shadow-sm border border-slate-200 p-3"
              style={{
                backgroundColor: '#f1f5f9',
              }}
            >
              <Div className="flex items-center justify-between">
                <Div className="flex items-center gap-3">
                  <Div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Img src={deliverymanEarningIcon} alt="Deliveryman Earning" className="w-6 h-6" />
                  </Div>
                  <Div className="flex items-center gap-2">
                    <P className="text-sm font-semibold text-slate-900">Deliveryman Earning</P>
                    <InfoTip tipKey="deliveryman" colorClass="bg-red-500" align="left" />
                  </Div>
                </Div>
                <Div className="text-base font-bold text-orange-600 min-w-[4.5rem] flex justify-end">
                  {amountsLoading ? <AmountSkeleton className="h-5 w-16" /> : formatCurrency(summary.deliverymanEarning)}
                </Div>
              </Div>
            </Div>
          </Div>
        </Div>

        {/* Order Transactions Section */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <H2 className="text-base font-bold text-slate-900">
              Order Transactions {amountsLoading ? <AmountSkeleton className="inline-block h-4 w-8 align-middle" /> : totalItems}
              <Span className="ml-2 text-xs font-medium text-slate-500">({filters.time})</Span>
            </H2>

            <Div className="flex items-center gap-2">
              <Div className="relative flex-1 sm:flex-initial min-w-[180px]">
                <Input
                  type="text"
                  placeholder="Search by Order ID, customer, restaurant"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-2 py-1.5 w-full text-[11px] rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Img src={searchIcon} alt="Search" className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" />
                {isRefreshing && <UiIcon as={Loader2} className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 animate-spin" />}
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
            </Div>
          </Div>

          {/* Table */}
            <Table cols={[46, 110, 150, 150, 110, 110, 110, 110, 90, 110, 100, 110, 110]} className="w-full">
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
                    Restaurant Base
                  </Th>
                  <Th
                    className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Admin Pricing
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
                {amountsLoading ? (
                  Array.from({
                    length: 6,
                  }).map((_, index) => (
                    <Tr key={`sk-${index}`}>
                      {Array.from({
                        length: 13,
                      }).map((__, col) => (
                        <Td key={col} className="px-1.5 py-2">
                          <AmountSkeleton className="h-3 w-full max-w-[4.5rem]" />
                        </Td>
                      ))}
                    </Tr>
                  ))
                ) : transactions.length === 0 ? (
                  <Tr>
                    <Td colSpan={13} className="px-6 py-20 text-center">
                      <Div className="flex flex-col items-center justify-center">
                        <P className="text-lg font-semibold text-slate-700 mb-1">No Data Found</P>
                        <P className="text-sm text-slate-500">No transactions match your search</P>
                      </Div>
                    </Td>
                  </Tr>
                ) : (
                  transactions.map((transaction, index) => (
                    <Tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] font-medium text-slate-700">{(currentPage - 1) * pageSize + index + 1}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] text-slate-700">{transaction.orderId}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] text-slate-700 truncate block">{transaction.restaurant}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span
                          className={`text-[10px] truncate block ${transaction.customerName === 'Invalid Customer Data' ? 'text-red-600 font-semibold' : 'text-slate-700'}`}
                        >
                          {transaction.customerName}
                        </Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] text-slate-700">{formatFullCurrency(transaction.totalItemAmount)}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] text-slate-700">
                          {formatFullCurrency(transaction.restaurantBaseAmount ?? transaction.totalItemAmount)}
                        </Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className={`text-[10px] ${(Number(transaction.adminMarkup) || 0) > 0 ? 'font-semibold text-rose-600' : 'text-slate-400'}`}>
                          {(Number(transaction.adminMarkup) || 0) > 0 ? formatFullCurrency(transaction.adminMarkup) : '—'}
                        </Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        {transaction.couponDiscount > 0 ? (
                          <Div className="flex flex-col">
                            <Span className="text-[10px] font-semibold text-emerald-600">-{formatFullCurrency(transaction.couponDiscount)}</Span>
                            {transaction.couponCode && (
                              <Span className="text-[8px] text-slate-400 font-medium uppercase tracking-wide">{transaction.couponCode}</Span>
                            )}
                          </Div>
                        ) : (
                          <Span className="text-[10px] text-slate-400">—</Span>
                        )}
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] text-slate-700">{formatFullCurrency(transaction.vatTax)}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] text-slate-700">{formatFullCurrency(transaction.deliveryCharge)}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] text-slate-700">{formatFullCurrency(transaction.platformFee || 0)}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span className="text-[10px] font-medium text-slate-900">{formatFullCurrency(transaction.orderAmount)}</Span>
                      </Td>
                      <Td className="px-1.5 py-1">
                        <Span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${getStatusBadgeClasses(transaction.status || transaction.orderStatus)}`}
                        >
                          {formatStatusLabel(transaction.status || transaction.orderStatus)}
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
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              try {
                localStorage.setItem('admin_txn_report_pageSize', String(size));
              } catch {}
              setCurrentPage(1);
            }}
            itemLabel="transactions"
          />
        </Div>
      </Div>
    </ScrollDiv>
  );
}
