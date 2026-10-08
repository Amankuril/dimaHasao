/* Ported from Frontend/src/modules/Food/pages/admin/delivery-partners/DeliveryEarnings.jsx (tools/port.js first pass). */
import { useState, useEffect, useCallback } from 'react';
import { Download, ChevronDown, Wallet, Users, FileText, FileSpreadsheet, Code } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import { toast } from '../../../../lib/notify';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  LoadingState,
  TableSkeleton,
  EmptyState,
  ErrorState,
  Field,
  INPUT,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Input, Option, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { saveTextFile } from '../../../../lib/files';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const formatCurrency = (amount) => {
  return `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
const COLS = [60, 170, 130, 130, 170, 110, 120, 120, 150];
const LABELS = ['SI', 'Delivery Boy', 'Phone', 'Order ID', 'Restaurant', 'Earning', 'Order Total', 'Status', 'Date'];
export default function DeliveryEarnings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_delivery_earnings_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState({
    totalDeliveryPartners: 0,
    totalEarnings: 0,
    totalOrders: 0,
  });
  const [filters, setFilters] = useState({
    period: 'all',
    deliveryPartnerId: '',
    fromDate: '',
    toDate: '',
  });
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const { tablet } = useLayoutWidth();
  const filterColumn = tablet ? 'flex-1 min-w-[220px]' : undefined;

  // Fetch delivery partners for filter dropdown
  const fetchDeliveryPartners = useCallback(async () => {
    try {
      const response = await adminAPI.getDeliveryPartners({
        limit: 1000,
      });
      if (response.data?.success) {
        setDeliveryPartners(response.data.data.deliveryPartners || []);
      }
    } catch (err) {
      debugError('Error fetching delivery partners:', err);
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filters]);

  // Fetch earnings from API
  const fetchEarnings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: currentPage,
        limit: pageSize,
        period: filters.period,
        ...(filters.deliveryPartnerId && {
          deliveryPartnerId: filters.deliveryPartnerId,
        }),
        ...(filters.fromDate && {
          fromDate: filters.fromDate,
        }),
        ...(filters.toDate && {
          toDate: filters.toDate,
        }),
        ...(debouncedSearch && {
          search: debouncedSearch,
        }),
      };
      const response = await adminAPI.getDeliveryEarnings(params);
      if (response.data?.success) {
        setEarnings(response.data.data.earnings || []);
        setSummary(response.data.data.summary || {});
        setTotalItems(response.data.data.pagination?.total ?? (response.data.data.earnings || []).length);
      } else {
        setError(response.data?.message || 'Failed to fetch earnings');
        setEarnings([]);
        setTotalItems(0);
      }
    } catch (err) {
      debugError('Error fetching earnings:', err);
      const errorMessage = err.response?.data?.message || 'Failed to fetch earnings. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      setEarnings([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters, debouncedSearch]);
  useEffect(() => {
    fetchDeliveryPartners();
  }, [fetchDeliveryPartners]);
  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };
  const handleExport = async (format) => {
    if (earnings.length === 0) {
      toast.info('No data to export');
      return;
    }
    const headers = [
      {
        key: 'sl',
        label: 'SI',
      },
      {
        key: 'deliveryPartnerName',
        label: 'Delivery Boy',
      },
      {
        key: 'deliveryPartnerPhone',
        label: 'Phone',
      },
      {
        key: 'orderId',
        label: 'Order ID',
      },
      {
        key: 'restaurantName',
        label: 'Restaurant',
      },
      {
        key: 'amount',
        label: 'Earning',
      },
      {
        key: 'orderTotal',
        label: 'Order Total',
      },
      {
        key: 'deliveryFee',
        label: 'Delivery Fee',
      },
      {
        key: 'orderStatus',
        label: 'Status',
      },
      {
        key: 'createdAt',
        label: 'Date',
      },
    ];
    const data = earnings.map((earning, index) => ({
      sl: (currentPage - 1) * pageSize + index + 1,
      deliveryPartnerName: earning.deliveryPartnerName || 'N/A',
      deliveryPartnerPhone: earning.deliveryPartnerPhone || 'N/A',
      orderId: earning.orderId || 'N/A',
      restaurantName: earning.restaurantName || 'N/A',
      amount: formatCurrency(earning.amount),
      orderTotal: formatCurrency(earning.orderTotal),
      deliveryFee: formatCurrency(earning.deliveryFee),
      orderStatus: earning.orderStatus || 'N/A',
      createdAt: formatDate(earning.createdAt),
    }));
    switch (format) {
      case 'csv': {
        const csvContent = [headers.map((h) => h.label).join(','), ...data.map((row) => headers.map((h) => `"${row[h.key] || ''}"`).join(','))].join('\n');
        await saveTextFile(`delivery_earnings_${new Date().toISOString().split('T')[0]}.csv`, csvContent, 'text/csv;charset=utf-8;');
        toast.success('CSV exported successfully');
        break;
      }
      case 'excel':
        toast.info('Excel export coming soon');
        break;
      case 'pdf':
        toast.info('PDF export coming soon');
        break;
      case 'json': {
        const jsonContent = JSON.stringify(data, null, 2);
        await saveTextFile(`delivery_earnings_${new Date().toISOString().split('T')[0]}.json`, jsonContent, 'application/json');
        toast.success('JSON exported successfully');
        break;
      }
      default:
        toast.error('Invalid export format');
    }
  };
  if (loading && earnings.length === 0) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={Wallet}
          title="Delivery Earning"
          subtitle="Every delivery partner payout, order by order"
          breadcrumb={[{ label: 'Food' }, { label: 'Delivery partners' }, { label: 'Earnings' }]}
        />
        <LoadingState label="Loading delivery earnings…" />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Wallet}
        title="Delivery Earning"
        subtitle="Every delivery partner payout, order by order"
        breadcrumb={[{ label: 'Food' }, { label: 'Delivery partners' }, { label: 'Earnings' }]}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className={BTN_SECONDARY}>
                <UiIcon as={Download} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>Export</Span>
                <UiIcon as={ChevronDown} size={14} className="text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <UiIcon as={Code} size={16} className="mr-2 text-slate-500" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <StatGrid className="mb-4">
        <StatCard label="Total delivery boys" value={String(summary.totalDeliveryPartners || 0)} icon={Users} tone="info" />
        <StatCard label="Total earnings" value={formatCurrency(summary.totalEarnings || 0)} icon={Wallet} tone="success" />
        <StatCard label="Total orders" value={String(summary.totalOrders || 0)} icon={FileText} tone="neutral" />
      </StatGrid>

      <Card className="mb-4">
        <SectionTitle>Filters</SectionTitle>
        <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
          <Field label="Period" className={filterColumn}>
            <Select value={filters.period} onChange={(e) => handleFilterChange('period', e.target.value)} className={INPUT}>
              <Option value="all">All Time</Option>
              <Option value="today">Today</Option>
              <Option value="week">This Week</Option>
              <Option value="month">This Month</Option>
            </Select>
          </Field>
          <Field label="Delivery Boy" className={filterColumn}>
            <Select value={filters.deliveryPartnerId} onChange={(e) => handleFilterChange('deliveryPartnerId', e.target.value)} className={INPUT}>
              <Option value="">All Delivery Boys</Option>
              {deliveryPartners.map((dp) => (
                <Option key={dp._id} value={dp._id}>
                  {dp.name}
                </Option>
              ))}
            </Select>
          </Field>
          <Field label="From Date" className={filterColumn}>
            <Input type="date" value={filters.fromDate} onChange={(e) => handleFilterChange('fromDate', e.target.value)} className={INPUT} />
          </Field>
          <Field label="To Date" className={filterColumn}>
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className={INPUT}
            />
          </Field>
        </Div>
        <Toolbar className="mt-3 mb-0">
          <Input
            type="text"
            placeholder="Search by name, phone, order ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT} flex-1 min-w-[200px]`}
          />
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <ErrorState title="Could not load earnings" message={error} onRetry={fetchEarnings} />
      ) : earnings.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No earnings found"
          message="No earnings match your filters. Widen the date range or clear the search."
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {earnings.map((earning, index) => (
              <Row key={earning.transactionId || index} last={index === earnings.length - 1}>
                <Cell width={COLS[0]}>{String((currentPage - 1) * pageSize + index + 1)}</Cell>
                <Cell width={COLS[1]}>
                  <Span className="text-sm font-medium text-slate-900">{earning.deliveryPartnerName || 'N/A'}</Span>
                </Cell>
                <Cell width={COLS[2]}>{earning.deliveryPartnerPhone || 'N/A'}</Cell>
                <Cell width={COLS[3]}>{earning.orderId || 'N/A'}</Cell>
                <Cell width={COLS[4]}>{earning.restaurantName || 'N/A'}</Cell>
                <Cell width={COLS[5]} align="right">
                  <Span className="text-sm font-semibold text-slate-900">{formatCurrency(earning.amount)}</Span>
                </Cell>
                <Cell width={COLS[6]} align="right">
                  {formatCurrency(earning.orderTotal)}
                </Cell>
                <Cell width={COLS[7]}>
                  <StatusBadge status={earning.orderStatus || 'pending'} label={earning.orderStatus || 'N/A'} />
                </Cell>
                <Cell width={COLS[8]}>{formatDate(earning.createdAt)}</Cell>
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
            localStorage.setItem('admin_delivery_earnings_pageSize', String(size));
          } catch {
            /* ignore */
          }
        }}
        itemLabel="earnings"
        className="mt-3 rounded-xl border border-slate-200"
      />
    </AdminPage>
  );
}
