/* Ported from Frontend/src/modules/Food/pages/admin/Customers.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from '../../../lib/webRouter';
import {
  Search,
  Download,
  ChevronDown,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  X,
  Mail,
  Phone,
  MapPin,
  Package,
  IndianRupee,
  Calendar as CalendarIcon,
  User,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../../components/shadcn';
import { exportCustomersToCSV, exportCustomersToExcel, exportCustomersToPDF } from '../../components/admin/customers/customersExportUtils';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/shadcn';
import {
  Button,
  Div,
  H2,
  H3,
  H4,
  Img,
  Input,
  Label,
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
} from '../../../components/web';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function Customers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem('admin_customers_pageSize')) || 20);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [filters, setFilters] = useState({
    orderDate: '',
    joiningDate: '',
    status: '',
    sortBy: '',
    chooseFirst: '',
  });
  const [globalCodBlockedFeatureEnabled, setGlobalCodBlockedFeatureEnabled] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const fetchGlobalConfig = async () => {
      try {
        const res = await adminAPI.getCustomizationSettings();
        if (!cancelled && res?.data?.data) {
          const config = res.data.data;
          if (config.cod_blocking_feature_enabled !== undefined) {
            setGlobalCodBlockedFeatureEnabled(config.cod_blocking_feature_enabled);
          }
        }
      } catch (err) {
        debugError('Error fetching global config', err);
      }
    };
    fetchGlobalConfig();
    return () => {
      cancelled = true;
    };
  }, []);
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // Search is handled by the API globally — do not re-filter the current page only.

    // Filter by order date when that field is available in the API payload.

    // Filter by joining date
    if (filters.joiningDate) {
      result = result.filter((customer) => {
        // Parse joining date from format "17 Oct 2021"
        const customerDate = new Date(customer.joiningDate);
        const filterDate = new Date(filters.joiningDate);
        return customerDate.toDateString() === filterDate.toDateString();
      });
    }

    // Filter by status
    if (filters.status) {
      if (filters.status === 'active') {
        result = result.filter((customer) => customer.status === true);
      } else if (filters.status === 'inactive') {
        result = result.filter((customer) => customer.status === false);
      }
    }

    // Sort by options
    if (filters.sortBy) {
      if (filters.sortBy === 'name-asc') {
        result.sort((a, b) => a.name.localeCompare(b.name));
      } else if (filters.sortBy === 'name-desc') {
        result.sort((a, b) => b.name.localeCompare(a.name));
      } else if (filters.sortBy === 'orders-asc') {
        result.sort((a, b) => a.totalOrder - b.totalOrder);
      } else if (filters.sortBy === 'orders-desc') {
        result.sort((a, b) => b.totalOrder - a.totalOrder);
      }
    }

    // Limit results if "Choose First" is set
    if (filters.chooseFirst && parseInt(filters.chooseFirst) > 0) {
      result = result.slice(0, parseInt(filters.chooseFirst));
    }
    return result;
  }, [customers, filters]);
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
    setCurrentPage(1);
  };
  const formatDateTime = (value) => {
    if (!value) return '-';
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleString('en-GB', {
        month: 'short',
      });
      const year = d.getFullYear();
      const time = d.toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `${day} ${month} ${year}, ${time}`;
    } catch {
      return String(value);
    }
  };

  // Fetch customers from API
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);
  useEffect(() => {
    let cancelled = false;
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const params = {
          limit: pageSize,
          page: currentPage,
          ...(searchQuery && {
            search: searchQuery,
          }),
          ...(filters.status && {
            status: filters.status,
          }),
          ...(filters.joiningDate && {
            joiningDate: filters.joiningDate,
          }),
          ...(filters.sortBy && {
            sortBy: filters.sortBy,
          }),
          ...(filters.chooseFirst && {
            chooseFirst: filters.chooseFirst,
          }),
        };
        const response = await adminAPI.getCustomers(params);
        const data = response?.data?.data || response?.data?.data || response?.data;
        const list = Array.isArray(data?.customers) ? data.customers : Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
        if (!cancelled && Array.isArray(list)) {
          setCustomers(list);
          setTotalCustomers(data?.total || list.length);
        } else {
          if (!cancelled) {
            setCustomers([]);
            setTotalCustomers(0);
          }
        }
      } catch (error) {
        debugError('Error fetching customers:', error);
        toast.error('Failed to load customers');
        if (!cancelled) {
          setCustomers([]);
          setTotalCustomers(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const delay = searchQuery ? 250 : 0;
    const t = setTimeout(fetchCustomers, delay);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [currentPage, pageSize, searchQuery, filters.status, filters.joiningDate, filters.sortBy, filters.chooseFirst]);
  const [searchParams] = useSearchParams();
  const userIdFromUrl = searchParams.get('userId');
  useEffect(() => {
    if (userIdFromUrl && customers.length > 0) {
      const customer = customers.find((c) => c.id === userIdFromUrl || c._id === userIdFromUrl);
      if (customer) {
        handleViewDetails(customer.id || customer.sl || customer._id);
      }
    }
  }, [userIdFromUrl, customers]);
  const handleToggleStatus = async (customerId) => {
    try {
      // Find customer
      const customer = customers.find((c) => (c._id || c.id) === customerId);
      if (!customer) return;
      const newStatus = !customer.status;

      // Optimistically update UI
      setCustomers(
        customers.map((c) =>
          c.id === customerId
            ? {
                ...c,
                status: newStatus,
              }
            : c,
        ),
      );

      // Call API to update user status
      await adminAPI.updateCustomerStatus(customerId, newStatus);
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      debugError('Error updating status:', error);
      toast.error('Failed to update status');
      // Revert optimistic update
      setCustomers(
        customers.map((c) =>
          c.id === customerId
            ? {
                ...c,
                status: !c.status,
              }
            : c,
        ),
      );
    }
  };
  const handleToggleCodStatus = async (customerId) => {
    try {
      const customer = customers.find((c) => (c._id || c.id) === customerId);
      if (!customer) return;
      const newCodStatus = !customer.isCodBlocked;
      setCustomers(
        customers.map((c) =>
          (c.id || c._id) === customerId
            ? {
                ...c,
                isCodBlocked: newCodStatus,
              }
            : c,
        ),
      );
      await adminAPI.updateCustomerCodStatus(customerId, newCodStatus);
      toast.success(`User COD ${newCodStatus ? 'blocked' : 'unblocked'} successfully`);
    } catch (error) {
      debugError('Error updating COD status:', error);
      toast.error('Failed to update COD status');
      setCustomers(
        customers.map((c) =>
          (c.id || c._id) === customerId
            ? {
                ...c,
                isCodBlocked: !c.isCodBlocked,
              }
            : c,
        ),
      );
    }
  };
  const handleViewDetails = async (customerId) => {
    try {
      setLoadingDetails(true);
      setShowUserDetails(true);
      setSelectedCustomer(customerId);
      const response = await adminAPI.getCustomerById(customerId);
      const data = response?.data?.data || response?.data;
      if (data?.user) {
        setUserDetails(data.user);
      } else {
        toast.error('Failed to load user details');
        setShowUserDetails(false);
      }
    } catch (error) {
      debugError('Error fetching user details:', error);
      toast.error('Failed to load user details');
      setShowUserDetails(false);
    } finally {
      setLoadingDetails(false);
    }
  };
  const handleExport = (format) => {
    if (filteredCustomers.length === 0) {
      toast.error('No customers to export');
      return;
    }
    const filename = 'customers';
    try {
      switch (format) {
        case 'csv':
          exportCustomersToCSV(filteredCustomers, filename);
          toast.success('CSV export started');
          break;
        case 'excel':
          exportCustomersToExcel(filteredCustomers, filename);
          toast.success('Excel export started');
          break;
        case 'pdf':
          exportCustomersToPDF(filteredCustomers, filename);
          toast.success('PDF download started');
          break;
        default:
          toast.error('Invalid export format');
          break;
      }
    } catch (error) {
      debugError('Export error:', error);
      toast.error('Failed to export customers');
    }
  };
  const getInitials = (name) => {
    if (!name) return 'NA';
    return (
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'NA'
    );
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Filters Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Order Date</Label>
              <Div className="relative">
                <Input
                  type="date"
                  value={filters.orderDate}
                  onChange={(e) => handleFilterChange('orderDate', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </Div>
            </Div>

            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Customer Joining Date</Label>
              <Div className="relative">
                <Input
                  type="date"
                  value={filters.joiningDate}
                  onChange={(e) => handleFilterChange('joiningDate', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </Div>
            </Div>

            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Customer status</Label>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <Option value="">Select Status</Option>
                <Option value="active">Active</Option>
                <Option value="inactive">Inactive</Option>
              </Select>
            </Div>

            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Sort By</Label>
              <Select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <Option value="">Select Customer Sorting Order</Option>
                <Option value="name-asc">Name (A-Z)</Option>
                <Option value="name-desc">Name (Z-A)</Option>
                <Option value="orders-asc">Orders (Low to High)</Option>
                <Option value="orders-desc">Orders (High to Low)</Option>
              </Select>
            </Div>

            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Choose First</Label>
              <Input
                type="number"
                value={filters.chooseFirst}
                onChange={(e) => handleFilterChange('chooseFirst', e.target.value)}
                placeholder="Ex: 100"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </Div>
          </Div>

          <Div className="mt-4 flex items-center justify-between">
            <Div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  // Filters are applied automatically via useMemo
                }}
                className="px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all"
              >
                Apply Filters
              </Button>
              <Button
                onClick={() => {
                  setFilters({
                    orderDate: '',
                    joiningDate: '',
                    status: '',
                    sortBy: '',
                    chooseFirst: '',
                  });
                }}
                className="px-6 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Reset Filters
              </Button>
            </Div>
            <Div className="text-sm text-slate-600">{loading ? 'Loading...' : `Showing ${filteredCustomers.length} of ${totalCustomers} customers`}</Div>
          </Div>
        </Div>

        {/* Customer List Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="flex items-center gap-2">
              <H2 className="text-xl font-bold text-slate-900">Customer list</H2>
              <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 flex items-center justify-center min-w-[2.5rem] h-7">
                {loading ? <Span className="w-5 h-3 rounded bg-slate-300/80 animate-pulse" /> : totalCustomers}
              </Span>
            </Div>

            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <Input
                  type="text"
                  placeholder="Ex: Search by name"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                />
                <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </Div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all">
                    <UiIcon as={Download} className="w-4 h-4" />
                    <Span className="text-black font-bold">Export</Span>
                    <UiIcon as={ChevronDown} className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                  <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
                    <UiIcon as={FileDown} className="w-4 h-4 mr-2" />
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
                </DropdownMenuContent>
              </DropdownMenu>
            </Div>
          </Div>

          {/* Table */}
          <Table
            className="w-full min-w-full"
            cols={globalCodBlockedFeatureEnabled ? [60, 200, 200, 100, 130, 170, 120, 110, 80] : [60, 200, 200, 100, 130, 170, 120, 80]}
          >
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  <Th className="px-3 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Sl</Th>
                  <Th className="px-3 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Name</Th>
                  <Th className="px-3 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Contact Info</Th>
                  <Th className="px-3 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Total Order</Th>
                  <Th className="px-3 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Total Amount</Th>
                  <Th className="px-3 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Joining Date</Th>
                  <Th className="px-3 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Active/Inactive</Th>
                  {globalCodBlockedFeatureEnabled && (
                    <Th className="px-3 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">COD Blocked</Th>
                  )}
                  <Th className="px-3 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Actions</Th>
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {loading ? (
                  <Tr>
                    <Td colSpan={globalCodBlockedFeatureEnabled ? 9 : 8} className="px-6 py-8 text-center">
                      <Div className="text-sm text-slate-500">Loading customers...</Div>
                    </Td>
                  </Tr>
                ) : filteredCustomers.length === 0 ? (
                  <Tr>
                    <Td colSpan={globalCodBlockedFeatureEnabled ? 9 : 8} className="px-6 py-8 text-center">
                      <Div className="text-sm text-slate-500">No customers found</Div>
                    </Td>
                  </Tr>
                ) : (
                  filteredCustomers.map((customer, index) => (
                    <Tr key={customer.id || customer.sl} className="hover:bg-slate-50 transition-colors">
                      <Td className="px-3 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-700">{(currentPage - 1) * pageSize + index + 1}</Span>
                      </Td>
                      <Td className="px-3 py-4">
                        <Div className="flex items-center gap-3">
                          <Div
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-slate-200"
                            style={{ backgroundColor: '#E8EEF7' }}
                            onClick={() => handleViewDetails(customer._id || customer.id || customer.sl)}
                          >
                            <Img
                              src={customer.profileImage || '/assets/images/profile_avatar.webp'}
                              alt={customer.name}
                              className="w-full h-full object-cover"
                              fallback="/assets/images/profile_avatar.webp"
                            />
                          </Div>
                          <Span
                            className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors"
                            onClick={() => handleViewDetails(customer._id || customer.id || customer.sl)}
                          >
                            {customer.name}
                          </Span>
                        </Div>
                      </Td>
                      <Td className="px-3 py-4">
                        <Div className="flex flex-col">
                          <Span className="text-sm text-slate-700">{customer.email || 'NA'}</Span>
                          <Span className="text-xs text-slate-500">{customer.phone}</Span>
                        </Div>
                      </Td>
                      <Td className="px-3 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">{customer.totalOrder || 0}</Span>
                      </Td>
                      <Td className="px-3 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-900">
                          {'\u20B9'}{' '}
                          {(customer.totalOrderAmount || 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Span>
                      </Td>
                      <Td className="px-3 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">{formatDateTime(customer.joiningDate)}</Span>
                      </Td>
                      <Td className="px-3 py-4 whitespace-nowrap">
                        <Button
                          onClick={() => handleToggleStatus(customer.id || customer.sl)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${customer.status ? 'bg-green-600' : 'bg-slate-300'}`}
                        >
                          <Span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${customer.status ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </Button>
                      </Td>
                      {globalCodBlockedFeatureEnabled && (
                        <Td className="px-3 py-4 whitespace-nowrap">
                          <Button
                            onClick={() => handleToggleCodStatus(customer.id || customer.sl || customer._id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${customer.isCodBlocked ? 'bg-red-600' : 'bg-slate-300'}`}
                          >
                            <Span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${customer.isCodBlocked ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                          </Button>
                        </Td>
                      )}
                      <Td className="px-3 py-4 whitespace-nowrap text-center">
                        <Button
                          onClick={() => handleViewDetails(customer._id || customer.id || customer.sl)}
                          className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <UiIcon as={Eye} className="w-4 h-4" />
                        </Button>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
          </Table>

          {/* Pagination Controls */}
          {totalCustomers > 0 && (
            <Div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 bg-white px-4 py-4 sm:px-6 mt-4">
              <Div className="flex items-center gap-3">
                <Span className="text-sm text-slate-500 font-medium">Rows per page:</Span>
                <Select
                  value={pageSize}
                  onChange={(e) => {
                    const size = Number(e.target.value);
                    setPageSize(size);
                    localStorage.setItem('admin_customers_pageSize', size);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 cursor-pointer shadow-sm"
                >
                  <Option value={10}>10</Option>
                  <Option value={20}>20</Option>
                  <Option value={50}>50</Option>
                  <Option value={100}>100</Option>
                </Select>
              </Div>

              <Div className="flex flex-1 justify-between sm:hidden w-full">
                <Button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(totalCustomers / pageSize)))}
                  disabled={currentPage >= Math.ceil(totalCustomers / pageSize)}
                  className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Next
                </Button>
              </Div>
            </Div>
          )}
        </Div>
      </Div>

      {/* User Details Modal */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto mx-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
            <DialogTitle className="pr-12 text-xl font-bold text-slate-900">User Details</DialogTitle>
          </DialogHeader>

          {loadingDetails ? (
            <Div className="px-6 py-8 text-center">
              <Div className="text-sm text-slate-500">Loading user details...</Div>
            </Div>
          ) : userDetails ? (
            <Div className="space-y-4 px-6 py-5">
              {/* Profile Section */}
              <Div className="bg-slate-50 rounded-xl p-4 sm:p-5">
                <Div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <Div
                    className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200"
                    style={{ backgroundColor: '#E8EEF7' }}
                  >
                    <Img
                      src={userDetails.profileImage || '/assets/images/profile_avatar.webp'}
                      alt={userDetails.name}
                      className="w-full h-full rounded-full object-cover"
                      fallback="/assets/images/profile_avatar.webp"
                    />
                  </Div>
                  <Div className="flex-1 min-w-0">
                    <Div className="flex flex-wrap items-center gap-2 mb-2">
                      <H3 className="text-lg font-bold text-slate-900">{userDetails.name}</H3>
                      {userDetails.isActive ? (
                        <Span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 flex items-center gap-1">
                          <UiIcon as={CheckCircle} className="w-3 h-3" />
                          Active
                        </Span>
                      ) : (
                        <Span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 flex items-center gap-1">
                          <UiIcon as={XCircle} className="w-3 h-3" />
                          Inactive
                        </Span>
                      )}
                    </Div>
                    <Div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <Div className="flex items-center gap-2 text-sm text-slate-600 min-w-0">
                        <UiIcon as={Mail} className="w-4 h-4" />
                        <Span className="truncate">{userDetails.email || 'NA'}</Span>
                      </Div>
                      <Div className="flex items-center gap-2 text-sm text-slate-600 min-w-0">
                        <UiIcon as={Phone} className="w-4 h-4" />
                        <Span>{userDetails.phone}</Span>
                        {userDetails.phoneVerified && <UiIcon as={CheckCircle} className="w-3 h-3 text-green-600" />}
                      </Div>
                      <Div className="flex items-center gap-2 text-sm text-slate-600">
                        <UiIcon as={CalendarIcon} className="w-4 h-4" />
                        <Span>Joined: {formatDateTime(userDetails.joiningDate)}</Span>
                      </Div>
                    </Div>
                  </Div>
                </Div>
              </Div>

              {/* Statistics Section */}
              <Div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Div className="bg-blue-50 rounded-lg p-3">
                  <Div className="flex items-center gap-2 mb-1">
                    <UiIcon as={Package} className="w-4 h-4 text-blue-600" />
                    <Span className="text-xs font-semibold text-slate-700">Total Orders</Span>
                  </Div>
                  <P className="text-xl font-bold text-blue-600">{userDetails.totalOrders || 0}</P>
                </Div>
                <Div className="bg-green-50 rounded-lg p-3">
                  <Div className="flex items-center gap-2 mb-1">
                    <UiIcon as={IndianRupee} className="w-4 h-4 text-green-600" />
                    <Span className="text-xs font-semibold text-slate-700">Total Spent</Span>
                  </Div>
                  <P className="text-xl font-bold text-green-600">
                    {'\u20B9'}
                    {(userDetails.totalOrderAmount || 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </P>
                </Div>
                <Div className="bg-purple-50 rounded-lg p-3">
                  <Div className="flex items-center gap-2 mb-1">
                    <UiIcon as={CalendarIcon} className="w-4 h-4 text-purple-600" />
                    <Span className="text-xs font-semibold text-slate-700">Member Since</Span>
                  </Div>
                  <P className="text-base font-bold text-purple-600">{formatDateTime(userDetails.joiningDate)}</P>
                </Div>
              </Div>

              {/* Addresses Section */}
              {userDetails.addresses && userDetails.addresses.length > 0 && (
                <Div>
                  <H4 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <UiIcon as={MapPin} className="w-4 h-4" />
                    Addresses
                  </H4>
                  <Div className="space-y-2">
                    {userDetails.addresses.map((address, index) => (
                      <Div key={index} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <Div className="flex items-center justify-between mb-2">
                          <Span className="text-sm font-semibold text-slate-700">{address.label || 'Address'}</Span>
                          {address.isDefault && <Span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Default</Span>}
                        </Div>
                        <P className="text-sm text-slate-600">
                          {address.street}
                          {address.additionalDetails && `, ${address.additionalDetails}`}
                          {address.city && `, ${address.city}`}
                          {address.state && `, ${address.state}`}
                          {address.zipCode && ` - ${address.zipCode}`}
                        </P>
                      </Div>
                    ))}
                  </Div>
                </Div>
              )}

              {/* Recent Orders Section */}
              {userDetails.orders && userDetails.orders.length > 0 && (
                <Div>
                  <H4 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <UiIcon as={Package} className="w-4 h-4" />
                    Recent Orders
                  </H4>
                  <Div className="space-y-2">
                    {userDetails.orders.slice(0, 5).map((order, index) => (
                      <Div key={index} className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center justify-between">
                        <Div>
                          <P className="text-sm font-semibold text-slate-900">{order.orderId}</P>
                          <P className="text-xs text-slate-600">{order.restaurantName}</P>
                        </Div>
                        <Div className="text-right">
                          <P className="text-sm font-semibold text-slate-900">
                            {'\u20B9'}
                            {(order.total || 0).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </P>
                          <P className="text-xs text-slate-600 capitalize">{order.status}</P>
                        </Div>
                      </Div>
                    ))}
                  </Div>
                </Div>
              )}

              {/* Additional Info */}
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {userDetails.gender && (
                  <Div className="bg-slate-50 rounded-lg p-3">
                    <P className="text-xs font-semibold text-slate-700 mb-1">Gender</P>
                    <P className="text-sm text-slate-600 capitalize">{userDetails.gender}</P>
                  </Div>
                )}
                {userDetails.dateOfBirth && (
                  <Div className="bg-slate-50 rounded-lg p-3">
                    <P className="text-xs font-semibold text-slate-700 mb-1">Date of Birth</P>
                    <P className="text-sm text-slate-600">
                      {new Date(userDetails.dateOfBirth).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </P>
                  </Div>
                )}
              </Div>
            </Div>
          ) : (
            <Div className="py-8 text-center">
              <Div className="text-sm text-slate-500">No user details available</Div>
            </Div>
          )}
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
