/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/JoiningRequest.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  Eye,
  Check,
  X,
  UtensilsCrossed,
  ArrowUpDown,
  Loader2,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  CreditCard,
  Calendar,
  Star,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
} from 'lucide-react-native';
import { adminAPI, restaurantAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/shadcn';
import { refreshSidebarBadges } from '../../../components/admin/AdminSidebar';
import { useAdminBadgeListRefresh } from '../../../hooks/useAdminBadgeListRefresh';
import { getRestaurantDisplayAddress } from '../../../utils/restaurantLocation';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import {
  A,
  Button,
  Div,
  H2,
  H3,
  H4,
  H5,
  Img,
  Input,
  Option,
  Overlay,
  P,
  ScrollDiv,
  Select,
  Span,
  Textarea,
  Icon as UiIcon,
} from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import {
  AdminPage,
  PageHeader,
  Card,
  Toolbar,
  Field,
  BTN_PRIMARY,
  BTN_DANGER,
  BTN_TEXT_PRIMARY,
  DataTable,
  TBody,
  Row,
  Cell,
  StatusBadge,
  TableSkeleton,
  LoadingState,
  EmptyState,
  ErrorState,
  useLayoutWidth,
  INPUT,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { document, window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const formatTime12Hour = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return '--:-- --';
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};
export default function JoiningRequest() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_joining_requests_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc',
  });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [restaurantDetails, setRestaurantDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filters, setFilters] = useState({
    zone: '',
    dateFrom: '',
    dateTo: '',
  });
  const today = new Date().toISOString().slice(0, 10);
  const { tablet } = useLayoutWidth();

  // Track first render to avoid duplicate fetch in React StrictMode
  const hasFetchedOnceRef = useRef(false);
  const fetchRequests = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = await adminAPI.getPendingRestaurants({
        search: debouncedSearch || undefined,
        page: currentPage,
        limit: pageSize,
      });
      const payload = response?.data?.data;
      const list = Array.isArray(payload?.restaurants) ? payload.restaurants : Array.isArray(payload) ? payload : [];
      setPendingRequests(list.filter((r) => String(r.status || '').toLowerCase() === 'pending'));
      setTotalItems(payload?.total ?? response?.data?.total ?? list.length);
    } catch (err) {
      debugError('Error fetching restaurant requests:', err);
      if (!silent) {
        setError(err.message || 'Failed to fetch restaurant requests');
        setPendingRequests([]);
        setTotalItems(0);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);
  useAdminBadgeListRefresh('restaurants', fetchRequests, [debouncedSearch, currentPage, pageSize]);
  useEffect(() => {
    fetchRequests();
  }, [debouncedSearch, currentPage, pageSize]);
  useEffect(() => {
    const onFocus = () =>
      fetchRequests({
        silent: true,
      });
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchRequests({
          silent: true,
        });
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [debouncedSearch, currentPage, pageSize]);
  const currentRequests = pendingRequests;

  // Get unique zones and business models for filter options
  const filterOptions = useMemo(() => {
    const zones = [...new Set(currentRequests.map((r) => r.zone).filter(Boolean))];
    return {
      zones,
    };
  }, [currentRequests]);
  const filteredRequests = useMemo(() => {
    let filtered = currentRequests;
    if (filters.zone) {
      filtered = filtered.filter((request) => request.zone === filters.zone);
    }
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter((request) => {
        if (!request.createdAt) return false;
        const requestDate = new Date(request.createdAt).setHours(0, 0, 0, 0);
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom).setHours(0, 0, 0, 0);
          if (requestDate < fromDate) return false;
        }
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo).setHours(23, 59, 59, 999);
          if (requestDate > toDate) return false;
        }
        return true;
      });
    }
    return filtered;
  }, [currentRequests, filters]);
  const sortedRequests = useMemo(() => {
    const requests = [...filteredRequests];
    const { key, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;
    const getSortValue = (request) => {
      switch (key) {
        case 'sl':
          return Number(request.sl || 0);
        case 'restaurantName':
          return String(request.restaurantName || '').toLowerCase();
        case 'ownerName':
          return String(request.ownerName || '').toLowerCase();
        case 'zone':
          return String(request.zone || '').toLowerCase();
        case 'status':
          return String(request.status || '').toLowerCase();
        case 'createdAt':
        default:
          return new Date(request.createdAt || 0).getTime();
      }
    };
    requests.sort((left, right) => {
      const leftValue = getSortValue(left);
      const rightValue = getSortValue(right);
      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * multiplier;
      }
      return (
        String(leftValue).localeCompare(String(rightValue), undefined, {
          numeric: true,
        }) * multiplier
      );
    });
    return requests;
  }, [filteredRequests, sortConfig]);
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  const clearFilters = () => {
    setFilters({
      zone: '',
      dateFrom: '',
      dateTo: '',
    });
  };
  const hasActiveFilters = filters.zone || filters.dateFrom || filters.dateTo;
  const handleApprove = (request) => {
    setSelectedRequest(request);
    setIsApproveOpen(true);
  };
  const confirmApprove = async () => {
    if (!selectedRequest) return;
    const id = selectedRequest._id;
    const restaurantName = selectedRequest.restaurantName;
    try {
      setProcessing(true);
      setProcessingRequestId(id);
      await adminAPI.approveRestaurant(id);
      setPendingRequests((prev) => prev.filter((r) => r._id !== id));
      setIsApproveOpen(false);
      setSelectedRequest(null);
      refreshSidebarBadges('restaurants');
      toast.success(`Successfully approved ${restaurantName}'s join request!`);
      await fetchRequests({
        silent: true,
      });
    } catch (err) {
      debugError('Error approving request:', err);
      toast.error(err.response?.data?.message || 'Failed to approve request. Please try again.');
    } finally {
      setProcessing(false);
      setProcessingRequestId(null);
    }
  };
  const handleReject = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectDialog(true);
  };
  const confirmReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    const id = selectedRequest._id;
    const restaurantName = selectedRequest.restaurantName;
    try {
      setProcessing(true);
      setProcessingRequestId(id);
      await adminAPI.rejectRestaurant(id, rejectionReason);
      setPendingRequests((prev) => prev.filter((r) => r._id !== id));
      refreshSidebarBadges('restaurants');
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason('');
      toast.success(`Successfully rejected ${restaurantName}'s join request!`);
      await fetchRequests({
        silent: true,
      });
    } catch (err) {
      debugError('Error rejecting request:', err);
      toast.error(err.response?.data?.message || 'Failed to reject request. Please try again.');
    } finally {
      setProcessing(false);
      setProcessingRequestId(null);
    }
  };
  const formatPhone = (phone) => {
    if (!phone) return 'N/A';
    return phone;
  };

  // Handle view restaurant details
  const handleViewDetails = async (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
    setLoadingDetails(true);
    setRestaurantDetails(null);
    try {
      // First, use fullData if available (has all details from API)
      if (request.fullData) {
        debugLog('Using fullData from request:', request.fullData);
        setRestaurantDetails(request.fullData);
        setLoadingDetails(false);
        return;
      }

      // Try to fetch full restaurant details from API
      const restaurantId = request._id || request.id;
      let response = null;
      if (restaurantId) {
        try {
          // Try admin API first
          if (adminAPI.getRestaurantById) {
            response = await adminAPI.getRestaurantById(restaurantId);
          }
        } catch (err) {
          debugLog('Admin API failed, trying restaurant API:', err);
        }

        // Fallback to regular restaurant API
        if (!response || !response?.data?.success) {
          try {
            response = await restaurantAPI.getRestaurantById(restaurantId);
          } catch (err) {
            debugLog('Restaurant API also failed:', err);
          }
        }
      }

      // Check response structure
      if (response?.data?.success) {
        const data = response.data.data;
        if (data?.restaurant) {
          setRestaurantDetails(data.restaurant);
        } else if (data) {
          setRestaurantDetails(data);
        } else {
          setRestaurantDetails(request);
        }
      } else {
        // Use the request data we already have
        setRestaurantDetails(request);
      }
    } catch (err) {
      debugError('Error fetching restaurant details:', err);
      // Use the request data we already have
      setRestaurantDetails(request);
    } finally {
      setLoadingDetails(false);
    }
  };
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedRequest(null);
    setRestaurantDetails(null);
  };
  const getNormalizedImageUrl = (image) => {
    if (!image) return '';
    if (typeof image === 'string') return image;
    return image?.url || '';
  };
  const COLS = [60, 200, 170, 120, 130, 150];
  const SORTABLE = [
    ['sl', 'SL'],
    ['restaurantName', 'Restaurant Info'],
    ['ownerName', 'Owner Info'],
    ['zone', 'Zone'],
    ['status', 'Status'],
  ];
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={UtensilsCrossed}
        title="New Restaurant Join Requests"
        subtitle="Restaurants waiting to be approved onto the platform"
        breadcrumb={[{ label: 'Food' }, { label: 'Restaurants' }, { label: 'Joining requests' }]}
      />

      <Card className="mb-4">
        <Toolbar>
          <Div className="flex-row items-center flex-1 min-w-[200px] gap-2">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Search by restaurant name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${INPUT} flex-1`}
            />
          </Div>
          <Button onClick={() => setShowFilterDialog(true)} className={`${BTN_SECONDARY} ${hasActiveFilters ? 'border-blue-600' : ''}`}>
            <UiIcon as={Filter} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Filter</Span>
            {hasActiveFilters ? <StatusBadge status="info" tone="info" label={String([filters.zone, filters.dateFrom, filters.dateTo].filter(Boolean).length)} /> : null}
          </Button>
        </Toolbar>

        {loading ? (
          <TableSkeleton rows={5} />
        ) : error ? (
          <ErrorState title="Could not load join requests" message={error} onRetry={() => fetchRequests()} />
        ) : sortedRequests.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No join requests"
            message={
              searchQuery || hasActiveFilters
                ? 'No restaurant request matches your search or filters.'
                : 'New restaurants that apply to join will appear here for approval.'
            }
          />
        ) : (
          <>
            <DataTable cols={COLS}>
              {/* The kit's THead takes plain labels; these headers also sort, so they are Cells. */}
              <Row className="bg-slate-50 border-b border-slate-200">
                {SORTABLE.map(([key, label], idx) => (
                  <Cell key={key} width={COLS[idx]} className="py-0">
                    <Button type="button" onClick={() => handleSort(key)} accessibilityLabel={`Sort by ${label}`} className="flex-row items-center gap-1 h-11">
                      <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</Span>
                      <UiIcon as={ArrowUpDown} size={12} className={sortConfig.key === key ? 'text-blue-600' : 'text-slate-400'} />
                    </Button>
                  </Cell>
                ))}
                <Cell width={COLS[5]}>
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Action</Span>
                </Cell>
              </Row>
              <TBody>
                {sortedRequests.map((request, index, all) => {
                const isRowProcessing = processingRequestId === request._id;
                return (
                  <Row key={request._id || index} last={index === all.length - 1} className={isRowProcessing ? 'bg-blue-50' : ''}>
                    <Cell width={COLS[0]}>{String(request.sl ?? index + 1)}</Cell>
                    <Cell width={COLS[1]}>
                      <Div className="flex-row items-center gap-2">
                        <Div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 items-center justify-center shrink-0" onClick={() => handleViewDetails(request)}>
                          <Img
                            src={
                              getNormalizedImageUrl(request?.coverImages?.[0]) ||
                              (typeof request.profileImage === 'string'
                                ? request.profileImage
                                : request.profileImage?.url || request.profileImageUrl?.url || request.restaurantImage) ||
                              'https://via.placeholder.com/40?text=' + (request.restaurantName?.slice(0, 2) || 'R').toUpperCase()
                            }
                            alt={request.restaurantName || 'Restaurant'}
                            className="w-full h-full object-cover"
                            fallback={'https://via.placeholder.com/40?text=' + (request.restaurantName?.slice(0, 2) || 'R').toUpperCase()}
                          />
                        </Div>
                        <Text style={tw`text-sm font-medium text-slate-900 flex-1`} numberOfLines={2} onPress={() => handleViewDetails(request)}>
                          {request.restaurantName}
                        </Text>
                      </Div>
                    </Cell>
                    <Cell width={COLS[2]}>
                      <Text style={tw`text-sm font-medium text-slate-900`} numberOfLines={1}>
                        {request.ownerName}
                      </Text>
                      <Text style={tw`text-xs text-slate-500`} numberOfLines={1}>
                        {formatPhone(request.ownerPhone)}
                      </Text>
                    </Cell>
                    <Cell width={COLS[3]}>{request.zone || '—'}</Cell>
                    <Cell width={COLS[4]}>
                      {isRowProcessing ? (
                        <StatusBadge status="processing" label="Processing…" />
                      ) : (
                        <StatusBadge status={request.status} label={request.status} />
                      )}
                    </Cell>
                    <Cell width={COLS[5]}>
                      <Div className="flex-row items-center">
                        <Button onClick={() => handleViewDetails(request)} accessibilityLabel="View details" className="w-11 h-11 items-center justify-center rounded-lg">
                          <UiIcon as={Eye} size={18} className="text-blue-600" />
                        </Button>
                        {String(request.status || '').toLowerCase() === 'pending' && (
                          <>
                            <Button
                              onClick={() => handleApprove(request)}
                              disabled={processing}
                              accessibilityLabel="Approve request"
                              className={`w-11 h-11 items-center justify-center rounded-lg ${processing ? 'opacity-40' : ''}`}
                            >
                              <UiIcon as={isRowProcessing ? Loader2 : Check} size={18} className="text-green-700" />
                            </Button>
                            <Button
                              onClick={() => handleReject(request)}
                              disabled={processing}
                              accessibilityLabel="Reject request"
                              className={`w-11 h-11 items-center justify-center rounded-lg ${processing ? 'opacity-40' : ''}`}
                            >
                              <UiIcon as={X} size={18} className="text-red-600" />
                            </Button>
                          </>
                        )}
                      </Div>
                    </Cell>
                    </Row>
                  );
                })}
              </TBody>
            </DataTable>

            <AdminListPagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filters.zone || filters.dateFrom || filters.dateTo ? sortedRequests.length : totalItems}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                try {
                  localStorage.setItem('admin_joining_requests_pageSize', String(size));
                } catch {}
                setCurrentPage(1);
              }}
              itemLabel="requests"
            />
          </>
        )}
      </Card>

      {/* Filter Dialog */}
      {showFilterDialog && (
        <Overlay
          className="fixed inset-0 bg-slate-900/40 z-50 flex-row items-center justify-center p-4"
          onClick={() => setShowFilterDialog(false)}
          onClose={() => setShowFilterDialog(false)}
        >
          <Div className="bg-white rounded-xl border border-slate-200 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <Div className="p-6">
              <Div className="flex-row items-center justify-between mb-6">
                <Div className="flex-row items-center gap-3">
                  <Div className="w-10 h-10 rounded-lg bg-blue-100 items-center justify-center shrink-0">
                    <UiIcon as={Filter} className="w-5 h-5 text-blue-600" />
                  </Div>
                  <Div>
                    <H3 className="text-lg font-bold text-slate-900">Filter Requests</H3>
                    <P className="text-xs text-slate-500">Apply filters to refine your search</P>
                  </Div>
                </Div>
                <Button onClick={() => setShowFilterDialog(false)} accessibilityLabel="Close filters" className="w-11 h-11 items-center justify-center rounded-lg">
                  <UiIcon as={X} size={20} className="text-slate-600" />
                </Button>
              </Div>

              <Div className="space-y-4">
                {/* Zone Filter */}
                {filterOptions.zones.length > 0 && (
                  <Field label="Zone">
                    <Select
                      value={filters.zone}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          zone: e.target.value,
                        })
                      }
                      className={INPUT}
                    >
                      <Option value="">All Zones</Option>
                      {filterOptions.zones.map((zone) => (
                        <Option key={zone} value={zone}>
                          {zone}
                        </Option>
                      ))}
                    </Select>
                  </Field>
                )}

                {/* Date Range Filters */}
                <Div className="grid grid-cols-2 gap-3">
                  <Field label="From date">
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      max={today}
                      onChange={(e) => {
                        const selected = e.target.value > today ? today : e.target.value;
                        setFilters({
                          ...filters,
                          dateFrom: selected,
                          dateTo: filters.dateTo && filters.dateTo < selected ? selected : filters.dateTo,
                        });
                      }}
                      className={INPUT}
                    />
                  </Field>
                  <Field label="To date">
                    <Input
                      type="date"
                      value={filters.dateTo}
                      max={today}
                      onChange={(e) => {
                        const selected = e.target.value > today ? today : e.target.value;
                        setFilters({
                          ...filters,
                          dateTo: selected,
                        });
                      }}
                      min={filters.dateFrom}
                      className={INPUT}
                    />
                  </Field>
                </Div>
              </Div>

              <Div className="flex-row items-center gap-2 mt-6 pt-6 border-t border-slate-200">
                <Button onClick={clearFilters} disabled={!hasActiveFilters} className={`${BTN_SECONDARY} flex-1 ${hasActiveFilters ? '' : 'opacity-50'}`}>
                  <Span className={BTN_TEXT_SECONDARY}>Clear All</Span>
                </Button>
                <Button onClick={() => setShowFilterDialog(false)} className={`${BTN_PRIMARY} flex-1`}>
                  <Span className={BTN_TEXT_PRIMARY}>Apply Filters</Span>
                </Button>
              </Div>
            </Div>
          </Div>
        </Overlay>
      )}

      {/* Approve Confirmation Dialog */}
      <Dialog
        open={isApproveOpen}
        onOpenChange={(open) => {
          if (!processing) setIsApproveOpen(open);
        }}
      >
        <DialogContent className="max-w-md bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Approve Request</DialogTitle>
          </DialogHeader>
          <Div className="px-6 pb-6">
            <P className="text-sm text-slate-700">{`Are you sure you want to approve "${selectedRequest?.restaurantName ?? ''}"'s join request?`}</P>
          </Div>
          <DialogFooter className="px-6 pb-6">
            <Button onClick={() => setIsApproveOpen(false)} disabled={processing} className={`${BTN_SECONDARY} ${processing ? 'opacity-50' : ''}`}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button onClick={confirmApprove} disabled={processing} className={`${BTN_PRIMARY} ${processing ? 'opacity-50' : ''}`}>
              {processing ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
              <Span className={BTN_TEXT_PRIMARY}>Approve</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      {showRejectDialog && selectedRequest && (
        <Overlay
          className="fixed inset-0 bg-slate-900/40 z-50 flex-row items-center justify-center p-4"
          onClick={() => {
            if (!processing) setShowRejectDialog(false);
          }}
          onClose={() => {
            if (!processing) setShowRejectDialog(false);
          }}
        >
          <Div className="bg-white rounded-xl border border-slate-200 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <Div className="p-6">
              <Div className="flex-row items-center gap-4 mb-4">
                <Div className="w-12 h-12 rounded-full bg-red-100 flex-row items-center justify-center">
                  <UiIcon as={X} className="w-6 h-6 text-red-600" />
                </Div>
                <Div>
                  <H3 className="text-lg font-bold text-slate-900">Reject Restaurant Request</H3>
                  <P className="text-sm text-slate-600">{selectedRequest.restaurantName}</P>
                </Div>
              </Div>

              <P className="text-sm text-slate-700 mb-4">Are you sure you want to reject this restaurant request? Please provide a reason for rejection.</P>

              <Field label="Rejection reason" required hint="The restaurant sees this message." className="mb-4">
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900"
                  rows={4}
                />
              </Field>

              <Div className="flex-row items-center gap-3">
                <Button
                  onClick={() => {
                    setShowRejectDialog(false);
                    setSelectedRequest(null);
                    setRejectionReason('');
                  }}
                  disabled={processing}
                  className={`${BTN_SECONDARY} flex-1 ${processing ? 'opacity-50' : ''}`}
                >
                  <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
                </Button>
                <Button
                  onClick={confirmReject}
                  disabled={processing || !rejectionReason.trim()}
                  className={`${BTN_DANGER} flex-1 ${processing || !rejectionReason.trim() ? 'opacity-50' : ''}`}
                >
                  <Span className={BTN_TEXT_PRIMARY}>{processing ? 'Rejecting…' : 'Reject Request'}</Span>
                </Button>
              </Div>
            </Div>
          </Div>
        </Overlay>
      )}

      {/* Restaurant Details Side Panel */}
      {showDetailsModal && selectedRequest && (
        <Overlay className="fixed inset-0 z-[60] flex-row justify-end" onClose={closeDetailsModal}>
          <Div className="absolute inset-0 bg-slate-900/10" onClick={closeDetailsModal} />

          <Div
            className="relative w-full max-w-4xl bg-white h-full flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header */}
            <Div className="bg-white border-b border-slate-100 px-6 py-5 flex-row items-center justify-between z-10">
              <Div className="flex-row items-center gap-3">
                <Div className="w-10 h-10 rounded-xl bg-blue-50 flex-row items-center justify-center">
                  <UiIcon as={UtensilsCrossed} className="w-5 h-5 text-blue-600" />
                </Div>
                <H2 className="text-xl font-bold text-slate-900">Restaurant Details - {selectedRequest.restaurantName || 'N/A'}</H2>
              </Div>
              <Button
                onClick={closeDetailsModal}
                accessibilityLabel="Close details"
                className="w-11 h-11 items-center justify-center rounded-lg"
              >
                <UiIcon as={X} size={20} className="text-slate-600" />
              </Button>
            </Div>

            {/* Modal Content */}
            <ScrollDiv className="flex-1" contentClassName="p-6">
              {loadingDetails && <LoadingState label="Loading restaurant details…" />}
              {!loadingDetails &&
                (restaurantDetails || selectedRequest) &&
                (() => {
                  const r = restaurantDetails || selectedRequest;
                  const restaurantPhotoList = Array.isArray(r?.coverImages) ? r.coverImages.filter(Boolean) : [];
                  const profileImgUrl =
                    getNormalizedImageUrl(restaurantPhotoList[0]) ||
                    (typeof r?.profileImage === 'string' ? r.profileImage : r?.profileImage?.url || r?.profileImageUrl?.url || r?.restaurantImage);
                  const openingTime = r?.openingTime || r?.deliveryTimings?.openingTime || r?.onboarding?.step2?.deliveryTimings?.openingTime;
                  const closingTime = r?.closingTime || r?.deliveryTimings?.closingTime || r?.onboarding?.step2?.deliveryTimings?.closingTime;
                  const approvalStatus = String(r?.status || '').toLowerCase() || (r?.isActive !== false ? 'approved' : 'pending');
                  const hasFlatDocs = r?.panNumber || r?.panImage || r?.fssaiNumber || r?.accountNumber;
                  const menuImgList = Array.isArray(r?.menuImages) ? r.menuImages : r?.onboarding?.step2?.menuImageUrls || [];
                  return (
                    <Div className="space-y-6">
                      {/* Restaurant Basic Info */}
                      <Div className="flex-row items-start gap-6 pb-6 border-b border-slate-200">
                        <Div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                          <Img
                            src={profileImgUrl || 'https://via.placeholder.com/96'}
                            alt={r?.restaurantName || r?.name || 'Restaurant'}
                            className="w-full h-full object-cover"
                            fallback="https://via.placeholder.com/96"
                          />
                        </Div>
                        <Div className="flex-1">
                          <H3 className="text-2xl font-bold text-slate-900 mb-2">{r?.restaurantName || r?.name || 'N/A'}</H3>
                          <Div className="flex-row items-center gap-4 flex-wrap">
                            {r?.rating != null && (
                              <Div className="flex-row items-center gap-1">
                                <UiIcon as={Star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <Span className="text-sm font-medium text-slate-700">
                                  {Number(r.rating).toFixed(1)} ({r.totalRatings || 0} reviews)
                                </Span>
                              </Div>
                            )}
                            <Div className="flex-row items-center gap-1 text-slate-600">
                              <UiIcon as={Building2} className="w-4 h-4" />
                              <Span className="text-sm">{r?.restaurantId || r?._id || 'N/A'}</Span>
                            </Div>
                            <StatusBadge
                              status={approvalStatus}
                              label={approvalStatus === 'approved' ? 'Approved' : approvalStatus === 'rejected' ? 'Rejected' : 'Pending Approval'}
                            />
                          </Div>
                        </Div>
                      </Div>

                      {/* Owner Information */}
                      <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-4`}>
                        <Div>
                          <H4 className="text-lg font-semibold text-slate-900 mb-4">Owner Information</H4>
                          <Div className="space-y-3">
                            <Div className="flex-row items-center gap-3">
                              <UiIcon as={User} className="w-5 h-5 text-slate-400" />
                              <Div>
                                <P className="text-xs text-slate-500">Owner Name</P>
                                <P className="text-sm font-medium text-slate-900">{r?.ownerName || 'N/A'}</P>
                              </Div>
                            </Div>
                            <Div className="flex-row items-center gap-3">
                              <UiIcon as={Phone} className="w-5 h-5 text-slate-400" />
                              <Div>
                                <P className="text-xs text-slate-500">Phone</P>
                                <P className="text-sm font-medium text-slate-900">{r?.ownerPhone || r?.phone || 'N/A'}</P>
                              </Div>
                            </Div>
                            {(r?.ownerEmail || r?.email) && (
                              <Div className="flex-row items-center gap-3">
                                <UiIcon as={Mail} className="w-5 h-5 text-slate-400" />
                                <Div>
                                  <P className="text-xs text-slate-500">Email</P>
                                  <P className="text-sm font-medium text-slate-900">{r.ownerEmail || r.email}</P>
                                </Div>
                              </Div>
                            )}
                          </Div>
                        </Div>

                        {/* Location & Contact */}
                        <Div>
                          <H4 className="text-lg font-semibold text-slate-900 mb-4">Location & Contact</H4>
                          <Div className="space-y-3">
                            {(() => {
                              const fullAddress = getRestaurantDisplayAddress(r) || r?.zone || null;
                              return fullAddress ? (
                                <Div className="flex-row items-start gap-3">
                                  <UiIcon as={MapPin} className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                                  <Div>
                                    <P className="text-xs text-slate-500">Address</P>
                                    <P className="text-sm font-medium text-slate-900">{fullAddress}</P>
                                  </Div>
                                </Div>
                              ) : null;
                            })()}
                            {r?.pureVegRestaurant != null && (
                              <Div className="flex-row items-center gap-3">
                                <Span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${r.pureVegRestaurant ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}
                                >
                                  {r.pureVegRestaurant ? '🟢 Pure Veg' : '🟠 Mixed Menu'}
                                </Span>
                              </Div>
                            )}
                            {(r?.primaryContactNumber || r?.phone) && (
                              <Div className="flex-row items-center gap-3">
                                <UiIcon as={Phone} className="w-5 h-5 text-slate-400" />
                                <Div>
                                  <P className="text-xs text-slate-500">Primary Contact</P>
                                  <P className="text-sm font-medium text-slate-900">{r.primaryContactNumber || r.phone}</P>
                                </Div>
                              </Div>
                            )}
                          </Div>
                        </Div>
                      </Div>

                      {/* Timings */}
                      <Div>
                        <H4 className="text-lg font-semibold text-slate-900 mb-4">Timings & Status</H4>
                        <Div className="space-y-3">
                          {(openingTime || closingTime) && (
                            <Div className="flex-row items-center gap-3">
                              <UiIcon as={Clock} className="w-5 h-5 text-slate-400" />
                              <Div>
                                <P className="text-xs text-slate-500">Opening / Closing</P>
                                <P className="text-sm font-medium text-slate-900">
                                  {formatTime12Hour(openingTime)} – {formatTime12Hour(closingTime)}
                                </P>
                              </Div>
                            </Div>
                          )}
                          {r?.estimatedDeliveryTime && (
                            <Div>
                              <P className="text-xs text-slate-500 mb-1">Estimated Delivery Time</P>
                              <P className="text-sm font-medium text-slate-900">{r.estimatedDeliveryTime}</P>
                            </Div>
                          )}
                          {r?.openDays && Array.isArray(r.openDays) && r.openDays.length > 0 && (
                            <Div>
                              <P className="text-xs text-slate-500 mb-1">Open Days</P>
                              <Div className="flex-row flex-wrap gap-2">
                                {r.openDays.map((day, idx) => (
                                  <Span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium capitalize">
                                    {day}
                                  </Span>
                                ))}
                              </Div>
                            </Div>
                          )}
                          <Div>
                            <P className="text-xs text-slate-500 mb-1">Approval Status</P>
                            <Span
                              className={`inline-flex-row items-center px-3 py-1 rounded-full text-sm font-medium ${approvalStatus === 'approved' ? 'bg-green-100 text-green-700' : approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                            >
                              {approvalStatus === 'approved' ? 'Approved' : approvalStatus === 'rejected' ? 'Rejected' : 'Pending'}
                            </Span>
                          </Div>
                        </Div>
                      </Div>

                      {/* Registration Documents – flat schema (PAN, GST, FSSAI, Bank) */}
                      {restaurantPhotoList.length > 0 && (
                        <Div className="pt-6 border-t border-slate-200">
                          <H4 className="text-lg font-semibold text-slate-900 mb-4">Restaurant Photos</H4>
                          <Div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {restaurantPhotoList.map((restaurantImg, idx) => {
                              const imgUrl = getNormalizedImageUrl(restaurantImg);
                              return imgUrl ? (
                                <A
                                  key={idx}
                                  href={imgUrl}
                                  className="rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 transition-colors"
                                >
                                  <Img
                                    src={imgUrl}
                                    alt={`Restaurant ${idx + 1}`}
                                    className="w-full h-32 object-cover"
                                    fallback="https://via.placeholder.com/200"
                                  />
                                </A>
                              ) : null;
                            })}
                          </Div>
                        </Div>
                      )}

                      {(hasFlatDocs || r?.onboarding?.step3) && (
                        <Div className="pt-6 border-t border-slate-200">
                          <H4 className="text-lg font-semibold text-slate-900 mb-4">Registration Documents</H4>
                          <Div className="space-y-6">
                            {/* PAN – flat: panNumber, nameOnPan, panImage */}
                            {(r.panNumber || r.panImage || r?.onboarding?.step3?.pan) && (
                              <Div className="bg-slate-50 rounded-lg p-4">
                                <H5 className="font-semibold text-slate-900 mb-3 flex-row items-center gap-2">
                                  <UiIcon as={FileText} className="w-4 h-4" />
                                  PAN Details
                                </H5>
                                <Div className="grid grid-cols-1 gap-4 text-sm">
                                  {(r.panNumber || r?.onboarding?.step3?.pan?.panNumber) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">PAN Number</P>
                                      <P className="font-medium text-slate-900">{r.panNumber || r.onboarding?.step3?.pan?.panNumber}</P>
                                    </Div>
                                  )}
                                  {(r.nameOnPan || r?.onboarding?.step3?.pan?.nameOnPan) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">Name on PAN</P>
                                      <P className="font-medium text-slate-900">{r.nameOnPan || r.onboarding?.step3?.pan?.nameOnPan}</P>
                                    </Div>
                                  )}
                                  {(typeof r.panImage === 'string' ? r.panImage : r?.panImage?.url || r?.onboarding?.step3?.pan?.image?.url) && (
                                    <Div className="md:col-span-2">
                                      <P className="text-xs text-slate-500 mb-2">PAN Document</P>
                                      <A
                                        href={typeof r.panImage === 'string' ? r.panImage : r.panImage?.url || r.onboarding?.step3?.pan?.image?.url}
                                        className="inline-flex-row items-center gap-2 text-blue-600 hover:text-blue-700"
                                      >
                                        <UiIcon as={ImageIcon} className="w-4 h-4" />
                                        <Span>View PAN Document</Span>
                                        <UiIcon as={ExternalLink} className="w-3 h-3" />
                                      </A>
                                    </Div>
                                  )}
                                </Div>
                              </Div>
                            )}

                            {/* GST – flat: gstRegistered, gstNumber, gstLegalName, gstAddress, gstImage */}
                            {(r.gstRegistered != null || r.gstNumber || r?.onboarding?.step3?.gst) && (
                              <Div className="bg-slate-50 rounded-lg p-4">
                                <H5 className="font-semibold text-slate-900 mb-3 flex-row items-center gap-2">
                                  <UiIcon as={FileText} className="w-4 h-4" />
                                  GST Details
                                </H5>
                                <Div className="grid grid-cols-1 gap-4 text-sm">
                                  <Div>
                                    <P className="text-xs text-slate-500 mb-1">GST Registered</P>
                                    <P className="font-medium text-slate-900">
                                      {r.gstRegistered != null ? (r.gstRegistered ? 'Yes' : 'No') : r?.onboarding?.step3?.gst?.isRegistered ? 'Yes' : 'No'}
                                    </P>
                                  </Div>
                                  {(r.gstNumber || r?.onboarding?.step3?.gst?.gstNumber) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">GST Number</P>
                                      <P className="font-medium text-slate-900">{r.gstNumber || r.onboarding?.step3?.gst?.gstNumber}</P>
                                    </Div>
                                  )}
                                  {(r.gstLegalName || r?.onboarding?.step3?.gst?.legalName) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">Legal Name</P>
                                      <P className="font-medium text-slate-900">{r.gstLegalName || r.onboarding?.step3?.gst?.legalName}</P>
                                    </Div>
                                  )}
                                  {(r.gstAddress || r?.onboarding?.step3?.gst?.address) && (
                                    <Div className="md:col-span-2">
                                      <P className="text-xs text-slate-500 mb-1">GST Address</P>
                                      <P className="font-medium text-slate-900">{r.gstAddress || r.onboarding?.step3?.gst?.address}</P>
                                    </Div>
                                  )}
                                  {(typeof r.gstImage === 'string' ? r.gstImage : r?.gstImage?.url || r?.onboarding?.step3?.gst?.image?.url) && (
                                    <Div className="md:col-span-2">
                                      <P className="text-xs text-slate-500 mb-2">GST Document</P>
                                      <A
                                        href={typeof r.gstImage === 'string' ? r.gstImage : r.gstImage?.url || r.onboarding?.step3?.gst?.image?.url}
                                        className="inline-flex-row items-center gap-2 text-blue-600 hover:text-blue-700"
                                      >
                                        <UiIcon as={ImageIcon} className="w-4 h-4" />
                                        <Span>View GST Document</Span>
                                        <UiIcon as={ExternalLink} className="w-3 h-3" />
                                      </A>
                                    </Div>
                                  )}
                                </Div>
                              </Div>
                            )}

                            {/* FSSAI – flat: fssaiNumber, fssaiExpiry, fssaiImage */}
                            {(r.fssaiNumber || r.fssaiExpiry || r?.onboarding?.step3?.fssai) && (
                              <Div className="bg-slate-50 rounded-lg p-4">
                                <H5 className="font-semibold text-slate-900 mb-3 flex-row items-center gap-2">
                                  <UiIcon as={FileText} className="w-4 h-4" />
                                  FSSAI Details
                                </H5>
                                <Div className="grid grid-cols-1 gap-4 text-sm">
                                  {(r.fssaiNumber || r?.onboarding?.step3?.fssai?.registrationNumber) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">FSSAI Registration Number</P>
                                      <P className="font-medium text-slate-900">{r.fssaiNumber || r.onboarding?.step3?.fssai?.registrationNumber}</P>
                                    </Div>
                                  )}
                                  {(r.fssaiExpiry || r?.onboarding?.step3?.fssai?.expiryDate) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">FSSAI Expiry Date</P>
                                      <P className="font-medium text-slate-900">
                                        {new Date(r.fssaiExpiry || r.onboarding?.step3?.fssai?.expiryDate).toLocaleDateString('en-IN', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric',
                                        })}
                                      </P>
                                    </Div>
                                  )}
                                  {(typeof r.fssaiImage === 'string' ? r.fssaiImage : r?.fssaiImage?.url || r?.onboarding?.step3?.fssai?.image?.url) && (
                                    <Div className="md:col-span-2">
                                      <P className="text-xs text-slate-500 mb-2">FSSAI Document</P>
                                      <A
                                        href={typeof r.fssaiImage === 'string' ? r.fssaiImage : r.fssaiImage?.url || r.onboarding?.step3?.fssai?.image?.url}
                                        className="inline-flex-row items-center gap-2 text-blue-600 hover:text-blue-700"
                                      >
                                        <UiIcon as={ImageIcon} className="w-4 h-4" />
                                        <Span>View FSSAI Document</Span>
                                        <UiIcon as={ExternalLink} className="w-3 h-3" />
                                      </A>
                                    </Div>
                                  )}
                                </Div>
                              </Div>
                            )}

                            {/* Bank – flat: accountNumber, ifscCode, accountHolderName, accountType */}
                            {(r.accountNumber || r.ifscCode || r?.onboarding?.step3?.bank) && (
                              <Div className="bg-slate-50 rounded-lg p-4">
                                <H5 className="font-semibold text-slate-900 mb-3 flex-row items-center gap-2">
                                  <UiIcon as={CreditCard} className="w-4 h-4" />
                                  Bank Details
                                </H5>
                                <Div className="grid grid-cols-1 gap-4 text-sm">
                                  {(r.accountNumber || r?.onboarding?.step3?.bank?.accountNumber) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">Account Number</P>
                                      <P className="font-medium text-slate-900">{r.accountNumber || r.onboarding?.step3?.bank?.accountNumber}</P>
                                    </Div>
                                  )}
                                  {(r.ifscCode || r?.onboarding?.step3?.bank?.ifscCode) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">IFSC Code</P>
                                      <P className="font-medium text-slate-900">{r.ifscCode || r.onboarding?.step3?.bank?.ifscCode}</P>
                                    </Div>
                                  )}
                                  {(r.accountHolderName || r?.onboarding?.step3?.bank?.accountHolderName) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">Account Holder Name</P>
                                      <P className="font-medium text-slate-900">{r.accountHolderName || r.onboarding?.step3?.bank?.accountHolderName}</P>
                                    </Div>
                                  )}
                                  {(r.accountType || r?.onboarding?.step3?.bank?.accountType) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">Account Type</P>
                                      <P className="font-medium text-slate-900 capitalize">{r.accountType || r.onboarding?.step3?.bank?.accountType}</P>
                                    </Div>
                                  )}
                                </Div>
                              </Div>
                            )}
                          </Div>
                        </Div>
                      )}

                      {/* Menu Images */}
                      {menuImgList.length > 0 && (
                        <Div className="pt-6 border-t border-slate-200">
                          <H4 className="text-lg font-semibold text-slate-900 mb-4">Menu Images</H4>
                          <Div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {menuImgList.map((menuImg, idx) => {
                              const imgUrl = typeof menuImg === 'string' ? menuImg : menuImg?.url || menuImg;
                              return imgUrl ? (
                                <A
                                  key={idx}
                                  href={imgUrl}
                                  className="rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 transition-colors"
                                >
                                  <Img
                                    src={imgUrl}
                                    alt={`Menu ${idx + 1}`}
                                    className="w-full h-32 object-cover"
                                    fallback="https://via.placeholder.com/200"
                                  />
                                </A>
                              ) : null;
                            })}
                          </Div>
                        </Div>
                      )}

                      {/* Registration & approval info */}
                      {(r?.createdAt || r?.restaurantId || r?.businessModel || r?.approvedAt != null) && (
                        <Div className="pt-6 border-t border-slate-200">
                          <H4 className="text-lg font-semibold text-slate-900 mb-4">Registration & Approval</H4>
                          <Div className="grid grid-cols-1 gap-4 text-sm">
                            {r.createdAt && (
                              <Div className="flex-row items-center gap-3">
                                <UiIcon as={Calendar} className="w-5 h-5 text-slate-400" />
                                <Div>
                                  <P className="text-xs text-slate-500 mb-1">Registration Date & Time</P>
                                  <P className="font-medium text-slate-900">
                                    {new Date(r.createdAt).toLocaleString('en-IN', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </P>
                                </Div>
                              </Div>
                            )}
                            {r.restaurantId && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Restaurant ID</P>
                                <P className="font-medium text-slate-900">{r.restaurantId}</P>
                              </Div>
                            )}
                            {r.approvedAt != null && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Approved At</P>
                                <P className="font-medium text-slate-900">{new Date(r.approvedAt).toLocaleString('en-IN')}</P>
                              </Div>
                            )}
                            {r.businessModel && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Business Model</P>
                                <P className="font-medium text-slate-900">{r.businessModel}</P>
                              </Div>
                            )}
                            {r.phoneVerified !== undefined && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Phone Verified</P>
                                <P className="font-medium text-slate-900">{r.phoneVerified ? 'Yes' : 'No'}</P>
                              </Div>
                            )}
                            {r.signupMethod && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Signup Method</P>
                                <P className="font-medium text-slate-900 capitalize">{r.signupMethod}</P>
                              </Div>
                            )}
                            {r?.onboarding?.completedSteps != null && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Onboarding Steps Completed</P>
                                <P className="font-medium text-slate-900">{r.onboarding.completedSteps} / 4</P>
                              </Div>
                            )}
                          </Div>
                        </Div>
                      )}

                      {/* Rejection Reason (if rejected) */}
                      {r?.rejectionReason && (
                        <Div className="pt-6 border-t border-slate-200">
                          <Div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <H4 className="text-lg font-semibold text-red-900 mb-2">Rejection Reason</H4>
                            <P className="text-sm text-red-800">{r.rejectionReason}</P>
                            {r.rejectedAt && <P className="text-xs text-red-600 mt-2">Rejected on: {new Date(r.rejectedAt).toLocaleString('en-IN')}</P>}
                          </Div>
                        </Div>
                      )}
                    </Div>
                  );
                })()}
              {!loadingDetails && !restaurantDetails && !selectedRequest && (
                <Div className="flex-col items-center justify-center py-20">
                  <P className="text-lg font-semibold text-slate-700 mb-2">No Details Available</P>
                  <P className="text-sm text-slate-500">Unable to load restaurant details</P>
                </Div>
              )}
            </ScrollDiv>
          </Div>
        </Overlay>
      )}
    </AdminPage>
  );
}
