/* Ported from Frontend/src/modules/Food/pages/admin/delivery-partners/DeliveryEarnings.jsx (tools/port.js first pass). */
import { useState, useEffect, useCallback } from 'react';
import { Search, Download, ChevronDown, DollarSign, Calendar, Filter, Loader2, FileText, FileSpreadsheet, Code } from 'lucide-react-native';
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
import { Button, Div, H1, Input, Label, Option, P, ScrollDiv, Select, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
import { saveTextFile } from '../../../../lib/files';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const formatCurrency = (amount) => {
  return `\u20B9${Number(amount || 0).toLocaleString('en-IN', {
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
      <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen w-full max-w-full overflow-x-hidden flex items-center justify-center">
        <Div className="flex flex-col items-center gap-4">
          <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-blue-500" />
          <P className="text-gray-600">Loading delivery earnings...</P>
        </Div>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen w-full max-w-full overflow-x-hidden">
      <Div className="w-full mx-auto">
        {/* Page Header */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
          <Div className="flex items-center justify-between">
            <Div className="flex items-center gap-3">
              <Div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                <UiIcon as={DollarSign} className="w-5 h-5 text-white" />
              </Div>
              <Div>
                <H1 className="text-2xl font-bold text-slate-900">Delivery Earning</H1>
                <P className="text-sm text-slate-600">View all delivery boy earnings and details</P>
              </Div>
            </Div>
          </Div>
        </Div>

        {/* Summary Cards */}
        <Div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <Div className="flex items-center justify-between">
              <Div>
                <P className="text-sm text-slate-600 mb-1">Total Delivery Boys</P>
                <P className="text-2xl font-bold text-slate-900">{summary.totalDeliveryPartners || 0}</P>
              </Div>
              <Div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <UiIcon as={DollarSign} className="w-6 h-6 text-blue-600" />
              </Div>
            </Div>
          </Div>
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <Div className="flex items-center justify-between">
              <Div>
                <P className="text-sm text-slate-600 mb-1">Total Earnings</P>
                <P className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalEarnings || 0)}</P>
              </Div>
              <Div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <UiIcon as={DollarSign} className="w-6 h-6 text-green-600" />
              </Div>
            </Div>
          </Div>
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <Div className="flex items-center justify-between">
              <Div>
                <P className="text-sm text-slate-600 mb-1">Total Orders</P>
                <P className="text-2xl font-bold text-slate-900">{summary.totalOrders || 0}</P>
              </Div>
              <Div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <UiIcon as={FileText} className="w-6 h-6 text-purple-600" />
              </Div>
            </Div>
          </Div>
        </Div>

        {/* Filters */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
          <Div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Div>
              <Label className="block text-sm font-medium text-slate-700 mb-2">Period</Label>
              <Select
                value={filters.period}
                onChange={(e) => handleFilterChange('period', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Option value="all">All Time</Option>
                <Option value="today">Today</Option>
                <Option value="week">This Week</Option>
                <Option value="month">This Month</Option>
              </Select>
            </Div>
            <Div>
              <Label className="block text-sm font-medium text-slate-700 mb-2">Delivery Boy</Label>
              <Select
                value={filters.deliveryPartnerId}
                onChange={(e) => handleFilterChange('deliveryPartnerId', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Option value="">All Delivery Boys</Option>
                {deliveryPartners.map((dp) => (
                  <Option key={dp._id} value={dp._id}>
                    {dp.name}
                  </Option>
                ))}
              </Select>
            </Div>
            <Div>
              <Label className="block text-sm font-medium text-slate-700 mb-2">From Date</Label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Div>
            <Div>
              <Label className="block text-sm font-medium text-slate-700 mb-2">To Date</Label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Div>
          </Div>
        </Div>

        {/* Search and Export */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
          <Div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <Div className="relative flex-1 w-full sm:w-auto">
              <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by name, phone, order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <UiIcon as={Download} className="w-4 h-4" />
                  <Span>Export</Span>
                  <UiIcon as={ChevronDown} className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <UiIcon as={FileText} className="w-4 h-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <UiIcon as={FileSpreadsheet} className="w-4 h-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  <UiIcon as={Code} className="w-4 h-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Div>
        </Div>

        {/* Earnings Table */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          {error && <Div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</Div>}

          <Div>
            <Table className="w-full" cols={[60, 170, 130, 130, 180, 110, 120, 120, 150]}>
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  <Th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">SI</Th>
                  <Th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Delivery Boy</Th>
                  <Th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Phone</Th>
                  <Th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Order ID</Th>
                  <Th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Restaurant</Th>
                  <Th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Earning</Th>
                  <Th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Order Total</Th>
                  <Th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Status</Th>
                  <Th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Date</Th>
                </Tr>
              </Thead>
              <Tbody className="divide-y divide-slate-100">
                {earnings.length === 0 ? (
                  <Tr>
                    <Td colSpan={9} className="px-4 py-12 text-center">
                      <Div className="flex flex-col items-center justify-center">
                        <P className="text-lg font-semibold text-slate-700 mb-1">No Earnings Found</P>
                        <P className="text-sm text-slate-500">No earnings match your filters</P>
                      </Div>
                    </Td>
                  </Tr>
                ) : (
                  earnings.map((earning, index) => (
                    <Tr key={earning.transactionId || index} className="hover:bg-slate-50">
                      <Td className="px-4 py-3 text-sm text-slate-700">{(currentPage - 1) * pageSize + index + 1}</Td>
                      <Td className="px-4 py-3 text-sm font-medium text-slate-900">{earning.deliveryPartnerName || 'N/A'}</Td>
                      <Td className="px-4 py-3 text-sm text-slate-700">{earning.deliveryPartnerPhone || 'N/A'}</Td>
                      <Td className="px-4 py-3 text-sm text-blue-600 font-medium">{earning.orderId || 'N/A'}</Td>
                      <Td className="px-4 py-3 text-sm text-slate-700">{earning.restaurantName || 'N/A'}</Td>
                      <Td className="px-4 py-3 text-sm font-semibold text-green-600">{formatCurrency(earning.amount)}</Td>
                      <Td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(earning.orderTotal)}</Td>
                      <Td className="px-4 py-3 text-sm">
                        <Span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${earning.orderStatus === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                        >
                          {earning.orderStatus || 'N/A'}
                        </Span>
                      </Td>
                      <Td className="px-4 py-3 text-sm text-slate-700">{formatDate(earning.createdAt)}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Div>

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
          />
        </Div>
      </Div>
    </ScrollDiv>
  );
}
