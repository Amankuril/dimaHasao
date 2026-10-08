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
  Mail,
  Phone,
  MapPin,
  Package,
  IndianRupee,
  Calendar as CalendarIcon,
  Users,
  CheckCircle,
} from 'lucide-react-native';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../../components/shadcn';
import { exportCustomersToCSV, exportCustomersToExcel, exportCustomersToPDF } from '../../components/admin/customers/customersExportUtils';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/shadcn';
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
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../admin/ui';
import { Button, Div, Img, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../components/web';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const COLS_WITH_COD = [56, 190, 200, 100, 130, 170, 120, 110, 56];
const COLS_NO_COD = [56, 190, 200, 100, 130, 170, 120, 56];
function Toggle({ on, onPress, label, tone = 'success' }) {
  const bg = on ? (tone === 'danger' ? 'bg-red-600' : 'bg-green-600') : 'bg-slate-300';
  return (
    <Button onClick={onPress} accessibilityLabel={label} className="w-11 h-11 justify-center">
      <Div className={`w-11 h-6 rounded-full justify-center ${bg}`}>
        <Div className={`w-4 h-4 rounded-full bg-white ${on ? 'ml-6' : 'ml-1'}`} />
      </Div>
    </Button>
  );
}
export default function Customers() {
  const { tablet } = useLayoutWidth();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
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
          setLoadError(null);
        } else {
          if (!cancelled) {
            setCustomers([]);
            setTotalCustomers(0);
            setLoadError(null);
          }
        }
      } catch (error) {
        debugError('Error fetching customers:', error);
        toast.error('Failed to load customers');
        if (!cancelled) {
          setCustomers([]);
          setTotalCustomers(0);
          setLoadError(error?.response?.data?.message || error?.message || 'Failed to load customers');
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
  const cols = globalCodBlockedFeatureEnabled ? COLS_WITH_COD : COLS_NO_COD;
  const labels = globalCodBlockedFeatureEnabled
    ? ['Sl', 'Name', 'Contact info', 'Orders', 'Total amount', 'Joining date', 'Active', 'COD blocked', '']
    : ['Sl', 'Name', 'Contact info', 'Orders', 'Total amount', 'Joining date', 'Active', ''];
  const totalPages = Math.max(1, Math.ceil(totalCustomers / pageSize));
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Users}
        title="Customers"
        subtitle="Everyone who has ordered food in the district"
        breadcrumb={[{ label: 'Food' }, { label: 'Customers' }, { label: 'Customer list' }]}
      />

      <Card className="mb-4">
        <SectionTitle>Filters</SectionTitle>
        <Div className={tablet ? 'grid grid-cols-2 gap-3' : 'gap-3'}>
          <Field label="Order date">
            <Input type="date" value={filters.orderDate} onChange={(e) => handleFilterChange('orderDate', e.target.value)} className={INPUT} />
          </Field>
          <Field label="Customer joining date">
            <Input type="date" value={filters.joiningDate} onChange={(e) => handleFilterChange('joiningDate', e.target.value)} className={INPUT} />
          </Field>
          <Field label="Customer status">
            <Select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className={INPUT} placeholder="Select status">
              <Option value="">Select Status</Option>
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </Field>
          <Field label="Sort by">
            <Select value={filters.sortBy} onChange={(e) => handleFilterChange('sortBy', e.target.value)} className={INPUT} placeholder="Select sorting order">
              <Option value="">Select Customer Sorting Order</Option>
              <Option value="name-asc">Name (A-Z)</Option>
              <Option value="name-desc">Name (Z-A)</Option>
              <Option value="orders-asc">Orders (Low to High)</Option>
              <Option value="orders-desc">Orders (High to Low)</Option>
            </Select>
          </Field>
          <Field label="Choose first" hint="Limit how many rows are shown">
            <Input type="number" value={filters.chooseFirst} onChange={(e) => handleFilterChange('chooseFirst', e.target.value)} placeholder="Ex: 100" className={INPUT} />
          </Field>
        </Div>
        <Toolbar className="mt-3 mb-0">
          <Button
            onClick={() => {
              // Filters are applied automatically via useMemo
            }}
            className={BTN_PRIMARY}
          >
            <Span className={BTN_TEXT_PRIMARY}>Apply filters</Span>
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
            className={BTN_SECONDARY}
          >
            <Span className={BTN_TEXT_SECONDARY}>Reset filters</Span>
          </Button>
        </Toolbar>
      </Card>

      <StatGrid className="mb-4">
        <StatCard label="Customers" value={loading ? '—' : String(totalCustomers)} hint="Matching the current filters" icon={Users} tone="info" />
        <StatCard label="Shown on this page" value={loading ? '—' : String(filteredCustomers.length)} hint={`Page ${currentPage} of ${totalPages}`} icon={Package} tone="neutral" />
      </StatGrid>

      <Card className="mb-3">
        <SectionTitle>Customer list</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Ex: search by name"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={`${INPUT} flex-1`}
            />
          </Div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className={BTN_SECONDARY}>
                <UiIcon as={Download} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>Export</Span>
                <UiIcon as={ChevronDown} size={14} className="text-slate-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg">
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <UiIcon as={FileDown} size={16} className="mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <UiIcon as={FileSpreadsheet} size={16} className="mr-2" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <UiIcon as={FileText} size={16} className="mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : loadError ? (
        <ErrorState title="Could not load customers" message={loadError} />
      ) : filteredCustomers.length === 0 ? (
        <EmptyState icon={Users} title="No customers found" message="Nothing matches these filters. Customers appear here as they sign up and order." />
      ) : (
        <>
          <DataTable cols={cols}>
            <THead cols={cols} labels={labels} />
            <TBody>
              {filteredCustomers.map((customer, index, arr) => (
                <Row key={customer.id || customer.sl} last={index === arr.length - 1}>
                  <Cell width={cols[0]}>{String((currentPage - 1) * pageSize + index + 1)}</Cell>
                  <Cell width={cols[1]}>
                    <Div className="flex-row items-center gap-2">
                      <Div className="w-9 h-9 rounded-full items-center justify-center shrink-0 overflow-hidden border border-slate-200" style={{ backgroundColor: '#E8EEF7' }}>
                        <Img
                          src={customer.profileImage || '/assets/images/profile_avatar.webp'}
                          alt={customer.name}
                          className="w-full h-full object-cover"
                          fallback="/assets/images/profile_avatar.webp"
                        />
                      </Div>
                      <Span
                        className="text-sm font-medium text-slate-900 flex-1"
                        numberOfLines={2}
                        onClick={() => handleViewDetails(customer._id || customer.id || customer.sl)}
                      >
                        {customer.name}
                      </Span>
                    </Div>
                  </Cell>
                  <Cell width={cols[2]}>
                    <Div className="gap-0.5">
                      <Span className="text-sm text-slate-700" numberOfLines={1}>
                        {customer.email || 'NA'}
                      </Span>
                      <Span className="text-xs text-slate-500" numberOfLines={1}>
                        {customer.phone}
                      </Span>
                    </Div>
                  </Cell>
                  <Cell width={cols[3]}>{String(customer.totalOrder || 0)}</Cell>
                  <Cell width={cols[4]} align="right">
                    <Span className="text-sm font-medium text-slate-900" numberOfLines={1}>
                      {'₹'}
                      {(customer.totalOrderAmount || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Span>
                  </Cell>
                  <Cell width={cols[5]}>{formatDateTime(customer.joiningDate)}</Cell>
                  <Cell width={cols[6]}>
                    <Toggle on={Boolean(customer.status)} onPress={() => handleToggleStatus(customer.id || customer.sl)} label={`Toggle active for ${customer.name}`} />
                  </Cell>
                  {globalCodBlockedFeatureEnabled && (
                    <Cell width={cols[7]}>
                      <Toggle
                        on={Boolean(customer.isCodBlocked)}
                        tone="danger"
                        onPress={() => handleToggleCodStatus(customer.id || customer.sl || customer._id)}
                        label={`Toggle COD block for ${customer.name}`}
                      />
                    </Cell>
                  )}
                  <Cell width={cols[cols.length - 1]} align="center">
                    <Button
                      onClick={() => handleViewDetails(customer._id || customer.id || customer.sl)}
                      className="w-11 h-11 rounded-lg items-center justify-center"
                      accessibilityLabel={`View ${customer.name}`}
                    >
                      <UiIcon as={Eye} size={16} className="text-blue-600" />
                    </Button>
                  </Cell>
                </Row>
              ))}
            </TBody>
          </DataTable>

          {totalCustomers > 0 && (
            <Div className="flex-row flex-wrap items-center justify-between gap-3 mt-3">
              <Div className="flex-row items-center gap-2">
                <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rows</Span>
                <Select
                  value={pageSize}
                  onChange={(e) => {
                    const size = Number(e.target.value);
                    setPageSize(size);
                    localStorage.setItem('admin_customers_pageSize', size);
                    setCurrentPage(1);
                  }}
                  className="h-11 min-w-[80px] px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                >
                  <Option value={10}>10</Option>
                  <Option value={20}>20</Option>
                  <Option value={50}>50</Option>
                  <Option value={100}>100</Option>
                </Select>
              </Div>
              <Div className="flex-row items-center gap-2">
                <Button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className={BTN_SECONDARY}>
                  <Span className={BTN_TEXT_SECONDARY}>Previous</Span>
                </Button>
                <Button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(totalCustomers / pageSize)))}
                  disabled={currentPage >= Math.ceil(totalCustomers / pageSize)}
                  className={BTN_SECONDARY}
                >
                  <Span className={BTN_TEXT_SECONDARY}>Next</Span>
                </Button>
              </Div>
            </Div>
          )}
        </>
      )}

      {/* User Details Modal */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle className="text-lg font-bold text-slate-900">User Details</DialogTitle>
          </DialogHeader>

          {loadingDetails ? (
            <Div className="p-4">
              <LoadingState label="Loading user details…" />
            </Div>
          ) : userDetails ? (
            <Div className="gap-3 px-4 py-4">
              {/* Profile */}
              <Card className="bg-slate-50 gap-3">
                <Div className="flex-row items-start gap-3">
                  <Div className="w-16 h-16 rounded-full items-center justify-center shrink-0 overflow-hidden border border-slate-200" style={{ backgroundColor: '#E8EEF7' }}>
                    <Img
                      src={userDetails.profileImage || '/assets/images/profile_avatar.webp'}
                      alt={userDetails.name}
                      className="w-full h-full object-cover"
                      fallback="/assets/images/profile_avatar.webp"
                    />
                  </Div>
                  <Div className="flex-1 min-w-0 gap-2">
                    <Div className="flex-row flex-wrap items-center gap-2">
                      <Span className="text-base font-semibold text-slate-900" numberOfLines={2}>
                        {userDetails.name || getInitials(userDetails.name)}
                      </Span>
                      <StatusBadge status={userDetails.isActive ? 'active' : 'inactive'} label={userDetails.isActive ? 'Active' : 'Inactive'} />
                    </Div>
                    <Div className={tablet ? 'grid grid-cols-2 gap-2' : 'gap-2'}>
                      <Div className="flex-row items-center gap-2">
                        <UiIcon as={Mail} size={14} className="text-slate-500" />
                        <Span className="text-sm text-slate-600 flex-1" numberOfLines={1}>
                          {userDetails.email || 'NA'}
                        </Span>
                      </Div>
                      <Div className="flex-row items-center gap-2">
                        <UiIcon as={Phone} size={14} className="text-slate-500" />
                        <Span className="text-sm text-slate-600">{userDetails.phone}</Span>
                        {userDetails.phoneVerified && <UiIcon as={CheckCircle} size={12} className="text-green-700" />}
                      </Div>
                      <Div className="flex-row items-center gap-2">
                        <UiIcon as={CalendarIcon} size={14} className="text-slate-500" />
                        <Span className="text-sm text-slate-600 flex-1" numberOfLines={1}>
                          Joined: {formatDateTime(userDetails.joiningDate)}
                        </Span>
                      </Div>
                    </Div>
                  </Div>
                </Div>
              </Card>

              {/* Statistics */}
              <StatGrid>
                <StatCard label="Total orders" value={String(userDetails.totalOrders || 0)} icon={Package} tone="info" />
                <StatCard
                  label="Total spent"
                  value={`₹${(userDetails.totalOrderAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  icon={IndianRupee}
                  tone="success"
                />
                <StatCard label="Member since" value={formatDateTime(userDetails.joiningDate)} icon={CalendarIcon} tone="neutral" />
              </StatGrid>

              {/* Addresses */}
              {userDetails.addresses && userDetails.addresses.length > 0 && (
                <Card className="gap-2">
                  <SectionTitle className="mb-0">Addresses</SectionTitle>
                  <Div className="gap-2">
                    {userDetails.addresses.map((address, index) => (
                      <Div key={index} className="bg-slate-50 rounded-lg p-3 border border-slate-200 gap-1.5">
                        <Div className="flex-row items-center justify-between gap-2">
                          <Div className="flex-row items-center gap-1.5 flex-1 min-w-0">
                            <UiIcon as={MapPin} size={14} className="text-slate-500" />
                            <Span className="text-sm font-semibold text-slate-700 flex-1" numberOfLines={1}>
                              {address.label || 'Address'}
                            </Span>
                          </Div>
                          {address.isDefault && <StatusBadge tone="info" label="Default" />}
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
                </Card>
              )}

              {/* Recent Orders */}
              {userDetails.orders && userDetails.orders.length > 0 && (
                <Card className="gap-2">
                  <SectionTitle className="mb-0">Recent orders</SectionTitle>
                  <Div className="gap-2">
                    {userDetails.orders.slice(0, 5).map((order, index) => (
                      <Div key={index} className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex-row items-center justify-between gap-3">
                        <Div className="flex-1 min-w-0">
                          <Span className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                            {order.orderId}
                          </Span>
                          <Span className="text-xs text-slate-500" numberOfLines={1}>
                            {order.restaurantName}
                          </Span>
                        </Div>
                        <Div className="items-end gap-1 shrink-0">
                          <Span className="text-sm font-semibold text-slate-900">
                            {'₹'}
                            {(order.total || 0).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Span>
                          <StatusBadge status={order.status} />
                        </Div>
                      </Div>
                    ))}
                  </Div>
                </Card>
              )}

              {/* Additional Info */}
              {(userDetails.gender || userDetails.dateOfBirth) && (
                <Div className={tablet ? 'grid grid-cols-2 gap-3' : 'gap-3'}>
                  {userDetails.gender && (
                    <Card className="gap-1">
                      <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gender</Span>
                      <P className="text-sm text-slate-700">{userDetails.gender}</P>
                    </Card>
                  )}
                  {userDetails.dateOfBirth && (
                    <Card className="gap-1">
                      <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date of birth</Span>
                      <P className="text-sm text-slate-700">
                        {new Date(userDetails.dateOfBirth).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </P>
                    </Card>
                  )}
                </Div>
              )}
            </Div>
          ) : (
            <Div className="p-4">
              <EmptyState title="No user details available" message="This customer's profile could not be loaded." />
            </Div>
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
