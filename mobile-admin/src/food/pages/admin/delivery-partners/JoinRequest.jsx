/* Ported from Frontend/src/modules/Food/pages/admin/delivery-partners/JoinRequest.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect } from 'react';
import { Filter, Eye, Check, X, Package, FileText, FileSpreadsheet, Loader2, User } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/shadcn';
import { exportJoinRequestsToExcel, exportJoinRequestsToPDF } from '../../../components/admin/deliveryman/joinRequestExportUtils';
import { refreshSidebarBadges } from '../../../components/admin/AdminSidebar';
import { useAdminBadgeListRefresh } from '../../../hooks/useAdminBadgeListRefresh';
import AdminListPagination from '../../../components/admin/AdminListPagination';
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
  TableSkeleton,
  EmptyState,
  ErrorState,
  LoadingState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_DANGER,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { A, Button, Div, Img, Input, Option, P, Select, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import { document, window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const COLS = [60, 190, 190, 140, 140, 180, 140];
const LABELS = ['SI', 'Name', 'Contact', 'Zone', 'Vehicle Type', 'Availability Status', 'Action'];
export default function JoinRequest() {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isDenyOpen, setIsDenyOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewDetails, setViewDetails] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filters, setFilters] = useState({
    zone: '',
    vehicleType: '',
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_delivery_join_requests_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const { tablet } = useLayoutWidth();
  const detailCol = tablet ? 'flex-1 min-w-[200px]' : 'flex-1 min-w-[140px]';

  // Debounce search so we don't fetch on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeTab, filters]);

  // Fetch join requests from API (single source of truth for when to fetch)
  const fetchJoinRequests = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const params = {
        status: activeTab === 'pending' ? 'pending' : 'denied',
        page: currentPage,
        limit: pageSize,
      };
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (filters.zone) {
        params.zone = filters.zone;
      }
      if (filters.vehicleType) {
        params.vehicleType = filters.vehicleType.toLowerCase();
      }
      const response = await adminAPI.getDeliveryPartnerJoinRequests(params);
      if (response.data && response.data.success) {
        setRequests(response.data.data.requests || []);
        setTotalItems(response.data.data.pagination?.total ?? (response.data.data.requests || []).length);
      } else {
        setError('Failed to fetch join requests');
        setRequests([]);
        setTotalItems(0);
      }
    } catch (err) {
      debugError('Error fetching join requests:', err);

      // Better error handling
      let errorMessage = 'Failed to fetch join requests. Please try again.';
      if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check if backend server is running.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Unauthorized. Please login again.';
      } else if (err.response?.status === 403) {
        errorMessage = "Access denied. You don't have permission to view this.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      if (!silent) {
        setError(errorMessage);
        setRequests([]);
        setTotalItems(0);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Single effect: fetch only when tab, debounced search, filters, or filter dialog state change (avoids multiple calls on mount)
  useEffect(() => {
    if (!isFilterOpen) {
      fetchJoinRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, debouncedSearch, filters, isFilterOpen, currentPage, pageSize]);
  useAdminBadgeListRefresh('deliveryPartners', fetchJoinRequests, [activeTab, debouncedSearch, filters, isFilterOpen, currentPage, pageSize]);
  useEffect(() => {
    const onFocus = () =>
      fetchJoinRequests({
        silent: true,
      });
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchJoinRequests({
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
  }, [activeTab, debouncedSearch, filters, isFilterOpen, currentPage, pageSize]);
  const filteredRequests = useMemo(() => {
    return [...requests];
  }, [requests]);
  const handleApprove = (request) => {
    setSelectedRequest(request);
    setIsApproveOpen(true);
  };
  const confirmApprove = async () => {
    if (!selectedRequest) return;
    const id = selectedRequest._id;
    const partnerName = selectedRequest.name;
    try {
      setProcessing(true);
      setProcessingRequestId(id);
      await adminAPI.approveDeliveryPartner(id);
      setRequests((prev) => prev.filter((r) => r._id !== id));
      setIsApproveOpen(false);
      setSelectedRequest(null);
      refreshSidebarBadges('deliveryPartners');
      toast.success(`Successfully approved ${partnerName}'s join request!`);
      await fetchJoinRequests({
        silent: true,
      });
    } catch (err) {
      debugError('Error approving request:', err);
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err?.message;
      toast.error(msg || 'Failed to approve request. Please try again.');
      await fetchJoinRequests({
        silent: true,
      });
    } finally {
      setProcessing(false);
      setProcessingRequestId(null);
    }
  };
  const handleDeny = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setIsDenyOpen(true);
  };
  const confirmDeny = async () => {
    if (!selectedRequest) return;

    // Validate rejection reason
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      setProcessing(true);
      setProcessingRequestId(selectedRequest._id);
      const id = selectedRequest._id;
      const partnerName = selectedRequest.name;
      const reason = rejectionReason.trim();
      await adminAPI.rejectDeliveryPartner(id, reason);
      setRequests((prev) => prev.filter((r) => r._id !== id));
      setIsDenyOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      refreshSidebarBadges('deliveryPartners');
      toast.success(`Successfully rejected ${partnerName}'s join request.`);
      await fetchJoinRequests({
        silent: true,
      });
    } catch (err) {
      debugError('Error rejecting request:', err);
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err?.message;
      toast.error(msg || 'Failed to reject request. Please try again.');
      await fetchJoinRequests({
        silent: true,
      });
    } finally {
      setProcessing(false);
      setProcessingRequestId(null);
    }
  };
  const handleView = async (request) => {
    try {
      setLoadingDetails(true);
      const response = await adminAPI.getDeliveryPartnerById(request._id);
      if (response.data && response.data.success) {
        setViewDetails(response.data.data.delivery);
        setIsViewOpen(true);
      } else {
        toast.error('Failed to load details');
      }
    } catch (err) {
      debugError('Error fetching details:', err);
      toast.error(err.response?.data?.message || 'Failed to load details');
    } finally {
      setLoadingDetails(false);
    }
  };
  const handleExportPDF = () => {
    if (filteredRequests.length === 0) {
      toast.error('No data to export');
      return;
    }
    exportJoinRequestsToPDF(filteredRequests);
  };
  const handleExportExcel = () => {
    if (filteredRequests.length === 0) {
      toast.error('No data to export');
      return;
    }
    exportJoinRequestsToExcel(filteredRequests);
  };
  const handleResetFilters = () => {
    setFilters({
      zone: '',
      vehicleType: '',
    });
  };
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setFilters({
      zone: '',
      vehicleType: '',
    });
    setCurrentPage(1);
  };
  const activeFiltersCount = Object.values(filters).filter((v) => v).length;
  const zones = [...new Set(requests.map((r) => r.zone))].filter(Boolean);
  const vehicleTypes = [...new Set(requests.map((r) => r.vehicleType))].filter(Boolean);
  const isRejected = (status) => ['blocked', 'Blocked', 'Denied', 'denied'].includes(status);
  const detailRow = (label, value) =>
    value ? (
      <Div className={`${detailCol} gap-0.5`} key={label}>
        <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</P>
        <P className="text-sm text-slate-900">{value}</P>
      </Div>
    ) : null;
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Package}
        title="New Joining Request"
        subtitle={loading ? 'Loading requests…' : `${totalItems} ${activeTab === 'pending' ? 'pending' : 'denied'} delivery partner request${totalItems === 1 ? '' : 's'}`}
        breadcrumb={[{ label: 'Food' }, { label: 'Delivery partners' }, { label: 'Join requests' }]}
        actions={
          <>
            <Button onClick={() => setIsFilterOpen(true)} className={BTN_SECONDARY}>
              <UiIcon as={Filter} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>{activeFiltersCount > 0 ? `Filter (${activeFiltersCount})` : 'Filter'}</Span>
            </Button>
            <Button onClick={handleExportPDF} className={BTN_SECONDARY}>
              <UiIcon as={FileText} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>PDF</Span>
            </Button>
            <Button onClick={handleExportExcel} className={BTN_SECONDARY}>
              <UiIcon as={FileSpreadsheet} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Excel</Span>
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <Toolbar>
          <Button
            onClick={() => handleTabChange('pending')}
            className={`h-11 px-4 rounded-lg items-center justify-center ${activeTab === 'pending' ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
          >
            <Span className={activeTab === 'pending' ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>Pending</Span>
          </Button>
          <Button
            onClick={() => handleTabChange('denied')}
            className={`h-11 px-4 rounded-lg items-center justify-center ${activeTab === 'denied' ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
          >
            <Span className={activeTab === 'denied' ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>Denied</Span>
          </Button>
        </Toolbar>
        <Toolbar className="mb-0">
          <Input
            type="text"
            placeholder="Search by name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT} flex-1 min-w-[200px]`}
          />
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <ErrorState title="Could not load join requests" message={error} onRetry={fetchJoinRequests} />
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          icon={Package}
          title={activeTab === 'pending' ? 'No pending requests' : 'No denied requests'}
          message={
            activeFiltersCount > 0 || debouncedSearch
              ? 'No request matches the current search and filters.'
              : 'New delivery partner sign-ups appear here for approval.'
          }
          actionLabel={activeFiltersCount > 0 ? 'Reset filters' : undefined}
          onAction={activeFiltersCount > 0 ? handleResetFilters : undefined}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {filteredRequests.map((request, index) => {
              const isRowProcessing = processingRequestId === request._id;
              return (
                <Row key={request._id} last={index === filteredRequests.length - 1}>
                  <Cell width={COLS[0]}>{String((currentPage - 1) * pageSize + index + 1)}</Cell>
                  <Cell width={COLS[1]}>
                    <Div className="flex-row items-center gap-2">
                      <Div className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center shrink-0 overflow-hidden" onClick={() => handleView(request)}>
                        {request.profileImage?.url || request.profilePhoto ? (
                          <Img src={request.profileImage?.url || request.profilePhoto} alt={request.name} className="w-full h-full" contentFit="cover" />
                        ) : (
                          <Span className="text-xs font-semibold text-slate-500">{request.name?.trim() ? request.name.slice(0, 2).toUpperCase() : '?'}</Span>
                        )}
                      </Div>
                      <Span className="text-sm font-medium text-slate-900 flex-1" numberOfLines={2} onClick={() => handleView(request)}>
                        {request.name}
                      </Span>
                    </Div>
                  </Cell>
                  <Cell width={COLS[2]}>
                    <Div className="gap-0.5">
                      <Span className="text-sm text-slate-700" numberOfLines={1}>
                        {request.email}
                      </Span>
                      <Span className="text-xs text-slate-500">{request.phone}</Span>
                    </Div>
                  </Cell>
                  <Cell width={COLS[3]}>{request.zone}</Cell>
                  <Cell width={COLS[4]}>{request.vehicleType}</Cell>
                  <Cell width={COLS[5]}>
                    <Div className="gap-1">
                      {isRowProcessing ? (
                        <StatusBadge status="processing" label="Processing…" icon={Loader2} />
                      ) : (
                        <StatusBadge
                          status={isRejected(request.status) ? 'rejected' : request.status}
                          label={isRejected(request.status) ? 'Rejected' : request.status}
                        />
                      )}
                      {request.rejectionReason ? (
                        <Span className="text-xs text-red-600" numberOfLines={2}>
                          {request.rejectionReason}
                        </Span>
                      ) : null}
                    </Div>
                  </Cell>
                  <Cell width={COLS[6]}>
                    <Div className="flex-row items-center gap-1">
                      <Button onClick={() => handleView(request)} accessibilityLabel="View request" className="w-11 h-11 rounded-lg items-center justify-center">
                        <UiIcon as={Eye} size={16} className="text-blue-600" />
                      </Button>
                      {activeTab === 'pending' ? (
                        <>
                          <Button
                            onClick={() => handleApprove(request)}
                            disabled={processing}
                            accessibilityLabel="Approve request"
                            className={`w-11 h-11 rounded-lg items-center justify-center ${processing ? 'opacity-50' : ''}`}
                          >
                            <UiIcon as={isRowProcessing ? Loader2 : Check} size={16} className="text-green-700" />
                          </Button>
                          <Button
                            onClick={() => handleDeny(request)}
                            disabled={processing}
                            accessibilityLabel="Deny request"
                            className={`w-11 h-11 rounded-lg items-center justify-center ${processing ? 'opacity-50' : ''}`}
                          >
                            <UiIcon as={X} size={16} className="text-red-600" />
                          </Button>
                        </>
                      ) : null}
                    </Div>
                  </Cell>
                </Row>
              );
            })}
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
            localStorage.setItem('admin_delivery_join_requests_pageSize', String(size));
          } catch {
            /* ignore */
          }
        }}
        itemLabel="requests"
        className="mt-3 rounded-xl border border-slate-200"
      />

      {/* Approve Confirmation Dialog */}
      <Dialog
        open={isApproveOpen}
        onOpenChange={(open) => {
          if (!processing) setIsApproveOpen(open);
        }}
      >
        <DialogContent className="max-w-md bg-white p-5 gap-3">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Approve Request</DialogTitle>
          </DialogHeader>
          <P className="text-sm text-slate-700">{`Are you sure you want to approve "${selectedRequest?.name}"'s join request?`}</P>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button onClick={() => setIsApproveOpen(false)} disabled={processing} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button onClick={confirmApprove} disabled={processing} className={`${BTN_PRIMARY} ${processing ? 'opacity-50' : ''}`}>
              {processing ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
              <Span className={BTN_TEXT_PRIMARY}>Approve</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Confirmation Dialog */}
      <Dialog
        open={isDenyOpen}
        onOpenChange={(open) => {
          if (!processing) setIsDenyOpen(open);
        }}
      >
        <DialogContent className="max-w-md bg-white p-5 gap-3">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Deny Request</DialogTitle>
          </DialogHeader>
          <P className="text-sm text-slate-700">{`Are you sure you want to deny "${selectedRequest?.name}"'s join request?`}</P>
          <Field label="Reason for Rejection" required hint="This reason will be shown to the delivery partner">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide specific reasons for rejection (e.g., Invalid documents, Incomplete information, etc.)"
              rows={5}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              disabled={processing}
            />
          </Field>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button
              onClick={() => {
                setIsDenyOpen(false);
                setRejectionReason('');
              }}
              disabled={processing}
              className={BTN_SECONDARY}
            >
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button
              onClick={confirmDeny}
              disabled={processing || !rejectionReason.trim()}
              className={`${BTN_DANGER} ${processing || !rejectionReason.trim() ? 'opacity-50' : ''}`}
            >
              {processing ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
              <Span className={BTN_TEXT_PRIMARY}>Deny</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl bg-white p-5 gap-3">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Delivery Partner Details</DialogTitle>
          </DialogHeader>
          {viewDetails ? (
            <Div className="gap-3">
              {/* Profile & basic info */}
              <Card className="gap-3">
                <Div className="flex-row items-center gap-3">
                  {viewDetails.profileImage?.url ? (
                    <Img src={viewDetails.profileImage.url} alt={viewDetails.name} className="w-16 h-16 rounded-full" contentFit="cover" />
                  ) : (
                    <Div className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center">
                      <UiIcon as={User} size={28} className="text-slate-400" />
                    </Div>
                  )}
                  <Div className="flex-1 gap-1">
                    <P className="text-base font-semibold text-slate-900">{viewDetails.name || 'N/A'}</P>
                    <StatusBadge
                      status={viewDetails.status === 'blocked' ? 'rejected' : viewDetails.status}
                      label={viewDetails.status === 'blocked' ? 'Rejected' : viewDetails.status || 'N/A'}
                    />
                  </Div>
                </Div>
                <Div className="flex-row flex-wrap gap-3">
                  {detailRow('Email', viewDetails.email)}
                  {detailRow('Phone', viewDetails.phone)}
                  {detailRow('Delivery ID', viewDetails.deliveryId)}
                  {detailRow(
                    'Date of Birth',
                    viewDetails.dateOfBirth
                      ? new Date(viewDetails.dateOfBirth).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : null,
                  )}
                  {detailRow('Gender', viewDetails.gender)}
                  {detailRow('Signup Method', viewDetails.signupMethod)}
                </Div>
                {viewDetails.rejectionReason ? (
                  <Div className="gap-1">
                    <P className="text-xs font-semibold uppercase tracking-wide text-red-600">Rejection reason</P>
                    <P className="text-sm text-slate-700">{viewDetails.rejectionReason}</P>
                  </Div>
                ) : null}
                {viewDetails.phoneVerified !== undefined ? (
                  <StatusBadge status={viewDetails.phoneVerified ? 'verified' : 'failed'} label={viewDetails.phoneVerified ? 'Phone verified' : 'Phone not verified'} />
                ) : null}
              </Card>

              {/* Location */}
              {viewDetails.location ? (
                <Card>
                  <SectionTitle>Location details</SectionTitle>
                  <Div className="flex-row flex-wrap gap-3">
                    {detailRow('Address line 1', viewDetails.location.addressLine1)}
                    {detailRow('Address line 2', viewDetails.location.addressLine2)}
                    {detailRow('Area', viewDetails.location.area)}
                    {detailRow('City', viewDetails.location.city)}
                    {detailRow('State', viewDetails.location.state)}
                    {detailRow('Zip code', viewDetails.location.zipCode)}
                    {detailRow(
                      'Coordinates',
                      viewDetails.location.latitude && viewDetails.location.longitude ? `${viewDetails.location.latitude}, ${viewDetails.location.longitude}` : null,
                    )}
                  </Div>
                </Card>
              ) : null}

              {/* Vehicle */}
              {viewDetails.vehicle ? (
                <Card>
                  <SectionTitle>Vehicle details</SectionTitle>
                  <Div className="flex-row flex-wrap gap-3">
                    {detailRow('Brand', viewDetails.vehicle.brand)}
                    {detailRow('Model', viewDetails.vehicle.model)}
                    {detailRow('Vehicle number', viewDetails.vehicle.number)}
                    {detailRow('Vehicle type', viewDetails.vehicle.type)}
                  </Div>
                </Card>
              ) : null}

              {/* Documents */}
              {viewDetails.documents ? (
                <Card>
                  <SectionTitle>Documents</SectionTitle>
                  <Div className="gap-3">
                    {viewDetails.documents.aadhar ? (
                      <Div className="gap-1">
                        <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aadhar card</P>
                        {viewDetails.documents.aadhar.number ? <P className="text-sm text-slate-700">Number: {viewDetails.documents.aadhar.number}</P> : null}
                        {viewDetails.documents.aadhar.document ? (
                          <A href={viewDetails.documents.aadhar.document} className="text-sm text-blue-600">
                            View document
                          </A>
                        ) : null}
                      </Div>
                    ) : null}
                    {viewDetails.documents.pan ? (
                      <Div className="gap-1">
                        <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">PAN card</P>
                        {viewDetails.documents.pan.number ? <P className="text-sm text-slate-700">Number: {viewDetails.documents.pan.number}</P> : null}
                        {viewDetails.documents.pan.document ? (
                          <A href={viewDetails.documents.pan.document} className="text-sm text-blue-600">
                            View document
                          </A>
                        ) : null}
                      </Div>
                    ) : null}
                    {viewDetails.documents.drivingLicense ? (
                      <Div className="gap-1">
                        <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Driving license</P>
                        {viewDetails.documents.drivingLicense.number ? (
                          <P className="text-sm text-slate-700">Number: {viewDetails.documents.drivingLicense.number}</P>
                        ) : null}
                        {viewDetails.documents.drivingLicense.expiryDate ? (
                          <P className="text-xs text-slate-500">Expiry: {new Date(viewDetails.documents.drivingLicense.expiryDate).toLocaleDateString('en-GB')}</P>
                        ) : null}
                        {viewDetails.documents.drivingLicense.document ? (
                          <A href={viewDetails.documents.drivingLicense.document} className="text-sm text-blue-600">
                            View document
                          </A>
                        ) : null}
                      </Div>
                    ) : null}
                    {viewDetails.documents.vehicleRC && (viewDetails.documents.vehicleRC.number || viewDetails.documents.vehicleRC.document) ? (
                      <Div className="gap-1">
                        <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vehicle RC</P>
                        {viewDetails.documents.vehicleRC.number ? <P className="text-sm text-slate-700">Number: {viewDetails.documents.vehicleRC.number}</P> : null}
                        {viewDetails.documents.vehicleRC.document ? (
                          <A href={viewDetails.documents.vehicleRC.document} className="text-sm text-blue-600">
                            View document
                          </A>
                        ) : null}
                      </Div>
                    ) : null}
                  </Div>
                </Card>
              ) : null}

              {/* Bank details */}
              {viewDetails.documents?.bankDetails ? (
                <Card>
                  <SectionTitle>Bank details</SectionTitle>
                  <Div className="flex-row flex-wrap gap-3">
                    {detailRow('Account holder name', viewDetails.documents.bankDetails.accountHolderName)}
                    {detailRow('Account number', viewDetails.documents.bankDetails.accountNumber)}
                    {detailRow('IFSC code', viewDetails.documents.bankDetails.ifscCode)}
                    {detailRow('Bank name', viewDetails.documents.bankDetails.bankName)}
                  </Div>
                </Card>
              ) : null}

              {/* Dates */}
              <Card>
                <SectionTitle>Timeline</SectionTitle>
                <Div className="flex-row flex-wrap gap-3">
                  {detailRow(
                    'Joined date',
                    viewDetails.createdAt
                      ? new Date(viewDetails.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : null,
                  )}
                  {detailRow(
                    'Verified at',
                    viewDetails.verifiedAt
                      ? new Date(viewDetails.verifiedAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : null,
                  )}
                </Div>
              </Card>
            </Div>
          ) : (
            <LoadingState label="Loading details…" />
          )}
          <DialogFooter className="flex-row justify-end pt-1">
            <Button onClick={() => setIsViewOpen(false)} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Close</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Panel */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="max-w-md bg-white p-5 gap-4">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Filter Options</DialogTitle>
          </DialogHeader>
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
              {zones.map((zone) => (
                <Option key={zone} value={zone}>
                  {zone}
                </Option>
              ))}
            </Select>
          </Field>
          <Field label="Vehicle Type">
            <Select
              value={filters.vehicleType}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  vehicleType: e.target.value,
                })
              }
              className={INPUT}
            >
              <Option value="">All Vehicle Types</Option>
              {vehicleTypes.map((type) => (
                <Option key={type} value={type}>
                  {type}
                </Option>
              ))}
            </Select>
          </Field>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button onClick={handleResetFilters} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
            </Button>
            <Button onClick={() => setIsFilterOpen(false)} className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>Apply</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
