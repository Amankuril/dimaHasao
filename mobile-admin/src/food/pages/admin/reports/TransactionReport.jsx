/* Ported from Frontend/src/modules/Food/pages/admin/reports/TransactionReport.jsx (tools/port.js first pass). */
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from '../../../../lib/webRouter';
import { BarChart3, ChevronDown, Info, FileText, FileSpreadsheet, Code, Loader2, X, RefreshCw, Search, Download } from 'lucide-react-native';
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
import {
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
  TableSkeleton,
  EmptyState,
  Field,
  INPUT,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Img, Input, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
const COLS = [50, 120, 160, 160, 130, 130, 120, 130, 100, 130, 110, 120, 130];
const LABELS = [
  'SI',
  'Order Id',
  'Restaurant',
  'Customer Name',
  'Total Item Amount',
  'Restaurant Base',
  'Admin Pricing',
  'Coupon Discount',
  'Vat/Tax',
  'Delivery Charge',
  'Platform Fee',
  'Order Amount',
  'Status',
];
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
    <Div className="relative">
      <Button
        type="button"
        accessibilityLabel="What does this mean?"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-11 h-11 items-center justify-center rounded-lg"
      >
        <Div className={`w-5 h-5 rounded-full ${colorClass} items-center justify-center`}>
          <UiIcon as={Info} size={12} className="text-white" />
        </Div>
      </Button>
      {open && (
        <Div className={`absolute z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 ${align === 'left' ? 'left-0' : 'right-0'}`}>
          <Div className="flex-row items-start justify-between gap-2 mb-1.5">
            <P className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex-1">How this is calculated</P>
            <Button type="button" accessibilityLabel="Close" onClick={() => setOpen(false)} className="w-6 h-6 items-center justify-center rounded">
              <UiIcon as={X} size={14} className="text-slate-400" />
            </Button>
          </Div>
          <P className="text-xs text-slate-700">{METRIC_INFO[tipKey]}</P>
        </Div>
      )}
    </Div>
  );
}
export default function TransactionReport() {
  const { tablet } = useLayoutWidth();
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
  const statusTone = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (['captured', 'settled', 'completed', 'paid', 'delivered', 'confirmed'].includes(normalized)) {
      return 'success';
    }
    if (['pending', 'created', 'authorized', 'cod_pending', 'processing'].includes(normalized)) {
      return 'warning';
    }
    if (['failed', 'refunded', 'cancelled', 'cancelled_by_admin', 'cancelled_by_user', 'cancelled_by_restaurant'].includes(normalized)) {
      return 'danger';
    }
    return 'neutral';
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
  const summaryTile = (key, icon, alt, label, value, tipColor, hint) => (
    <Card className="flex-row items-center justify-between gap-3">
      <Div className="flex-row items-center gap-3 flex-1 min-w-0">
        <Div className="w-10 h-10 rounded-lg bg-slate-100 items-center justify-center shrink-0">
          <Img src={icon} alt={alt} className="w-6 h-6" />
        </Div>
        <Div className="flex-1 min-w-0">
          <Span className="text-sm font-semibold text-slate-900">{label}</Span>
          {hint ? <Span className="text-xs text-slate-500">{hint}</Span> : null}
        </Div>
      </Div>
      <Div className="flex-row items-center gap-1 shrink-0">
        {amountsLoading ? <AmountSkeleton className="h-5 w-16" /> : <Span className="text-base font-bold text-slate-900">{value}</Span>}
        <InfoTip tipKey={key} colorClass={tipColor} align="right" />
      </Div>
    </Card>
  );
  return (
    <ScrollDiv ref={pageRef} className="flex-1 bg-slate-50 p-4" contentStyle={{ paddingBottom: 24 }}>
      <Div style={tablet ? { width: '100%', maxWidth: 1200, alignSelf: 'center' } : null}>
        <PageHeader
          icon={BarChart3}
          title="Transaction Report"
          subtitle="Money collected, refunded and split across the platform"
          breadcrumb={[{ label: 'Food' }, { label: 'Reports' }, { label: 'Transaction report' }]}
        />

        <Card className="mb-4">
          <SectionTitle>Search data</SectionTitle>
          <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
            <Field label="Zone">
              <Select
                value={filters.zone}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    zone: e.target.value,
                  }))
                }
                className={INPUT}
              >
                <Option value="All Zones">All Zones</Option>
                {zones.map((zone) => (
                  <Option key={zone._id} value={zone.zoneName || zone.name}>
                    {zone.zoneName || zone.name}
                  </Option>
                ))}
              </Select>
            </Field>

            <Field label="Restaurant">
              <Select
                value={filters.restaurant}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    restaurant: e.target.value,
                  }))
                }
                className={INPUT}
              >
                <Option value="All restaurants">All restaurants</Option>
                {restaurants.map((restaurant) => (
                  <Option key={restaurant._id} value={restaurant.restaurantName || restaurant.name}>
                    {restaurant.restaurantName || restaurant.name}
                  </Option>
                ))}
              </Select>
            </Field>

            <Field label="Time">
              <Select
                value={filters.time}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    time: e.target.value,
                  }))
                }
                className={INPUT}
              >
                <Option value="All Time">All Time</Option>
                <Option value="Today">Today</Option>
                <Option value="This Week">This Week</Option>
                <Option value="This Month">This Month</Option>
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
              disabled={isRefreshing}
              accessibilityLabel="Refresh report"
              className="w-11 h-11 rounded-lg border border-slate-300 bg-white items-center justify-center"
            >
              <UiIcon as={RefreshCw} size={18} className="text-slate-600" />
            </Button>
          </Toolbar>
        </Card>

        <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3 mb-4`}>
          {summaryTile('completed', completedIcon, 'Completed', 'Completed Transaction', formatCurrency(summary.completedTransaction), 'bg-green-500')}
          {summaryTile('refunded', refundedIcon, 'Refunded', 'Refunded Transaction', formatFullCurrency(summary.refundedTransaction), 'bg-red-500')}
          <Div ref={platformTotalRef} nativeID="platform-total">
            {summaryTile(
              'admin',
              adminEarningIcon,
              'Platform Total',
              'Platform Total',
              formatCurrency(platformTotalValue),
              'bg-green-500',
              amountsLoading ? 'Calculating…' : platformTotalHelper,
            )}
          </Div>
          {summaryTile('restaurant', restaurantEarningIcon, 'Restaurant Earning', 'Restaurant Earning', formatCurrency(summary.restaurantEarning), 'bg-blue-500')}
          {summaryTile(
            'deliveryman',
            deliverymanEarningIcon,
            'Deliveryman Earning',
            'Deliveryman Earning',
            formatCurrency(summary.deliverymanEarning),
            'bg-red-500',
          )}
        </Div>

        {!amountsLoading && markupByRestaurant.length > 0 ? (
          <Card className="mb-4">
            <SectionTitle>Admin pricing by restaurant</SectionTitle>
            <ScrollDiv className="max-h-40">
              {markupByRestaurant.map((row) => (
                <Div key={row.restaurantId || row.restaurant} className="flex-row items-center justify-between gap-3 py-1.5">
                  <Span className="text-sm text-slate-700 flex-1">
                    {row.restaurant}
                    <Span className="text-xs text-slate-400">
                      {' '}
                      · {row.orders} order{row.orders === 1 ? '' : 's'}
                    </Span>
                  </Span>
                  <Span className="text-sm font-semibold text-slate-900">{formatCurrency(row.adminMarkup)}</Span>
                </Div>
              ))}
            </ScrollDiv>
          </Card>
        ) : null}

        <Card className="mb-4">
          <SectionTitle>{`Order transactions (${amountsLoading ? '…' : totalItems}) · ${filters.time}`}</SectionTitle>
          <Toolbar className="mb-0">
            <Div className="flex-row items-center flex-1 min-w-[200px] gap-2">
              <Input
                type="text"
                placeholder="Search by Order ID, customer, restaurant"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${INPUT} flex-1`}
              />
              {isRefreshing ? <UiIcon as={Loader2} size={16} className="text-slate-400" /> : <UiIcon as={Search} size={16} className="text-slate-400" />}
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
          </Toolbar>
        </Card>

        {amountsLoading ? (
          <TableSkeleton rows={6} />
        ) : transactions.length === 0 ? (
          <EmptyState title="No data found" message="No transactions match your search or filters." actionLabel="Reset filters" onAction={handleResetFilters} />
        ) : (
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={LABELS} />
            <TBody>
              {transactions.map((transaction, index, all) => (
                <Row key={transaction.id} last={index === all.length - 1}>
                  <Cell width={COLS[0]}>{(currentPage - 1) * pageSize + index + 1}</Cell>
                  <Cell width={COLS[1]}>{transaction.orderId}</Cell>
                  <Cell width={COLS[2]}>{transaction.restaurant}</Cell>
                  <Cell width={COLS[3]}>
                    <Span className={`text-sm ${transaction.customerName === 'Invalid Customer Data' ? 'text-red-600 font-semibold' : 'text-slate-700'}`}>
                      {transaction.customerName}
                    </Span>
                  </Cell>
                  <Cell width={COLS[4]} align="right">{formatFullCurrency(transaction.totalItemAmount)}</Cell>
                  <Cell width={COLS[5]} align="right">{formatFullCurrency(transaction.restaurantBaseAmount ?? transaction.totalItemAmount)}</Cell>
                  <Cell width={COLS[6]} align="right">
                    <Span className={`text-sm ${(Number(transaction.adminMarkup) || 0) > 0 ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
                      {(Number(transaction.adminMarkup) || 0) > 0 ? formatFullCurrency(transaction.adminMarkup) : '—'}
                    </Span>
                  </Cell>
                  <Cell width={COLS[7]} align="right">
                    {transaction.couponDiscount > 0 ? (
                      <Div className="items-end">
                        <Span className="text-sm font-semibold text-green-700">-{formatFullCurrency(transaction.couponDiscount)}</Span>
                        {transaction.couponCode ? <Span className="text-xs text-slate-500 uppercase tracking-wide">{transaction.couponCode}</Span> : null}
                      </Div>
                    ) : (
                      <Span className="text-sm text-slate-400">—</Span>
                    )}
                  </Cell>
                  <Cell width={COLS[8]} align="right">{formatFullCurrency(transaction.vatTax)}</Cell>
                  <Cell width={COLS[9]} align="right">{formatFullCurrency(transaction.deliveryCharge)}</Cell>
                  <Cell width={COLS[10]} align="right">{formatFullCurrency(transaction.platformFee || 0)}</Cell>
                  <Cell width={COLS[11]} align="right">
                    <Span className="text-sm font-semibold text-slate-900">{formatFullCurrency(transaction.orderAmount)}</Span>
                  </Cell>
                  <Cell width={COLS[12]}>
                    <StatusBadge
                      status={transaction.status || transaction.orderStatus}
                      tone={statusTone(transaction.status || transaction.orderStatus)}
                      label={formatStatusLabel(transaction.status || transaction.orderStatus)}
                    />
                  </Cell>
                </Row>
              ))}
            </TBody>
          </DataTable>
        )}

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
    </ScrollDiv>
  );
}
