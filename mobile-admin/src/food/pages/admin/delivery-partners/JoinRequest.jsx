/* Ported from Frontend/src/modules/Food/pages/admin/delivery-partners/JoinRequest.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  Check,
  X,
  Package,
  ArrowUpDown,
  FileText,
  FileSpreadsheet,
  Loader2,
  Download,
  ExternalLink,
  Calendar,
  MapPin,
  CreditCard,
  User,
  Mail,
  Phone,
  Bike,
  FileCheck,
} from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/shadcn';
import { exportJoinRequestsToExcel, exportJoinRequestsToPDF } from '../../../components/admin/deliveryman/joinRequestExportUtils';
import { refreshSidebarBadges } from '../../../components/admin/AdminSidebar';
import { useAdminBadgeListRefresh } from '../../../hooks/useAdminBadgeListRefresh';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import {
  A,
  Button,
  Div,
  H1,
  H3,
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
  Textarea,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../components/web';
import { document, window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
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
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex items-center gap-3 mb-4">
            <Div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <UiIcon as={Package} className="w-5 h-5 text-white" />
            </Div>
            <H1 className="text-2xl font-bold text-slate-900">New Joining Request</H1>
          </Div>

          {/* Tabs */}
          <Div className="flex items-center gap-2 border-b border-slate-200 mb-6">
            <Button
              onClick={() => handleTabChange('pending')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
            >
              Pending Delivery Man
            </Button>
            <Button
              onClick={() => handleTabChange('denied')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'denied' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
            >
              Denied Deliveryman
            </Button>
          </Div>

          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <Input
                  type="text"
                  placeholder="Search by name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                />
                <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </Div>
            </Div>

            <Div className="flex items-center gap-2">
              <Button
                onClick={() => setIsFilterOpen(true)}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all relative ${activeFiltersCount > 0 ? 'border-emerald-500 bg-emerald-50' : ''}`}
              >
                <UiIcon as={Filter} className="w-4 h-4" />
                <Span className="text-black font-bold">Filter</Span>
                {activeFiltersCount > 0 && (
                  <Span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </Span>
                )}
              </Button>
              <Button
                onClick={handleExportPDF}
                className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all"
              >
                <UiIcon as={FileText} className="w-4 h-4" />
                <Span className="text-black font-bold">PDF</Span>
              </Button>
              <Button
                onClick={handleExportExcel}
                className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all"
              >
                <UiIcon as={FileSpreadsheet} className="w-4 h-4" />
                <Span className="text-black font-bold">Excel</Span>
              </Button>
            </Div>
          </Div>

          {/* Error Message */}
          {error && (
            <Div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <P className="text-sm text-red-700">{error}</P>
              <Button onClick={fetchJoinRequests} className="mt-2 text-sm text-red-600 underline hover:text-red-800">
                Retry
              </Button>
            </Div>
          )}

          {/* Table */}
          <Div>
            {loading ? (
              <Div className="flex items-center justify-center py-20">
                <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-blue-600" />
                <Span className="ml-3 text-sm text-slate-600">Loading requests...</Span>
              </Div>
            ) : (
              <Table className="w-full" cols={[60, 220, 200, 150, 160, 200, 132]}>
                <Thead className="bg-slate-50 border-b border-slate-200">
                  <Tr>
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>SI</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Name</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Contact</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Zone</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>

                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Vehicle Type</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Availability Status</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                    <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {filteredRequests.length === 0 ? (
                    <Tr>
                      <Td colSpan={7} className="px-6 py-20 text-center">
                        <P className="text-sm text-slate-500">{error ? 'Error loading requests' : 'No requests found'}</P>
                      </Td>
                    </Tr>
                  ) : (
                    filteredRequests.map((request, index) => {
                      const isRowProcessing = processingRequestId === request._id;
                      return (
                        <Tr key={request._id} className={`hover:bg-slate-50 transition-colors ${isRowProcessing ? 'bg-blue-50/50' : ''}`}>
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm font-medium text-slate-700">{(currentPage - 1) * pageSize + index + 1}</Span>
                          </Td>
                          <Td className="px-6 py-4">
                            <Div className="flex items-center gap-3">
                              <Div
                                className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-all border border-slate-100"
                                onClick={() => handleView(request)}
                              >
                                {request.profileImage?.url || request.profilePhoto ? (
                                  <Img src={request.profileImage?.url || request.profilePhoto} alt={request.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Span className="text-sm font-medium text-slate-500">
                                    {request.name?.trim() ? request.name.slice(0, 2).toUpperCase() : '?'}
                                  </Span>
                                )}
                              </Div>
                              <Span
                                className="text-sm font-medium text-slate-900 cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => handleView(request)}
                              >
                                {request.name}
                              </Span>
                            </Div>
                          </Td>
                          <Td className="px-6 py-4">
                            <Div className="flex flex-col">
                              <Span className="text-sm text-slate-700">{request.email}</Span>
                              <Span className="text-xs text-slate-500">{request.phone}</Span>
                            </Div>
                          </Td>
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm text-slate-700">{request.zone}</Span>
                          </Td>

                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm text-slate-700">{request.vehicleType}</Span>
                          </Td>
                          <Td className="px-6 py-4">
                            <Div className="flex flex-col gap-1">
                              {isRowProcessing ? (
                                <Span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 w-fit">
                                  <UiIcon as={Loader2} className="w-3 h-3 animate-spin" />
                                  Processing...
                                </Span>
                              ) : (
                                <Span
                                  className={`px-3 py-1 rounded-full text-xs font-medium inline-block w-fit ${request.status === 'Pending' || request.status === 'pending' ? 'bg-blue-100 text-blue-700' : request.status === 'Denied' || request.status === 'denied' || request.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                                >
                                  {request.status === 'blocked' || request.status === 'Blocked' || request.status === 'Denied' || request.status === 'denied'
                                    ? 'Rejected'
                                    : request.status}
                                </Span>
                              )}
                              {request.rejectionReason && <Span className="text-xs text-red-600 italic max-w-[200px] truncate">{request.rejectionReason}</Span>}
                            </Div>
                          </Td>
                          <Td className="px-6 py-4 whitespace-nowrap text-center">
                            <Div className="flex items-center justify-center gap-2">
                              <Button
                                onClick={() => handleView(request)}
                                className="p-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                              >
                                <UiIcon as={Eye} className="w-4 h-4" />
                              </Button>
                              {activeTab === 'pending' && (
                                <>
                                  <Button
                                    onClick={() => handleApprove(request)}
                                    disabled={processing}
                                    className="p-1.5 rounded bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isRowProcessing ? <UiIcon as={Loader2} className="w-4 h-4 animate-spin" /> : <UiIcon as={Check} className="w-4 h-4" />}
                                  </Button>
                                  <Button
                                    onClick={() => handleDeny(request)}
                                    disabled={processing}
                                    className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <UiIcon as={X} className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </Div>
                          </Td>
                        </Tr>
                      );
                    })
                  )}
                </Tbody>
              </Table>
            )}
          </Div>

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
          />
        </Div>
      </Div>

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
            <P className="text-sm text-slate-700">{`Are you sure you want to approve "${selectedRequest?.name}"'s join request?`}</P>
          </Div>
          <DialogFooter className="px-6 pb-6">
            <Button
              onClick={() => setIsApproveOpen(false)}
              disabled={processing}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApprove}
              disabled={processing}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {processing && <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />}
              Approve
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
        <DialogContent className="max-w-md bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Deny Request</DialogTitle>
          </DialogHeader>
          <Div className="px-6 pb-6 space-y-4">
            <P className="text-sm text-slate-700">{`Are you sure you want to deny "${selectedRequest?.name}"'s join request?`}</P>
            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">
                Reason for Rejection <Span className="text-red-500">*</Span>
              </Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide specific reasons for rejection (e.g., Invalid documents, Incomplete information, etc.)"
                rows={5}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm resize-none"
                disabled={processing}
              />
              <P className="text-xs text-slate-500 mt-1">This reason will be shown to the delivery partner</P>
            </Div>
          </Div>
          <DialogFooter className="px-6 pb-6">
            <Button
              onClick={() => {
                setIsDenyOpen(false);
                setRejectionReason('');
              }}
              disabled={processing}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeny}
              disabled={processing || !rejectionReason.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {processing && <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />}
              Deny
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
            <DialogTitle className="text-xl font-bold text-slate-900">Delivery Partner Details</DialogTitle>
          </DialogHeader>
          <Div className="px-6 pb-6">
            {viewDetails ? (
              <Div className="space-y-6 mt-4">
                {/* Profile Image & Basic Info */}
                <Div className="flex items-start gap-6 pb-6 border-b border-slate-200">
                  <Div className="flex-shrink-0">
                    {viewDetails.profileImage?.url ? (
                      <Img
                        src={viewDetails.profileImage.url}
                        alt={viewDetails.name}
                        className="w-24 h-24 rounded-full object-cover border-2 border-slate-200"
                      />
                    ) : (
                      <Div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center">
                        <UiIcon as={User} className="w-12 h-12 text-slate-400" />
                      </Div>
                    )}
                  </Div>
                  <Div className="flex-1 grid grid-cols-2 gap-4">
                    <Div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                        <UiIcon as={User} className="w-3 h-3" /> Name
                      </Label>
                      <P className="text-sm font-medium text-slate-900 mt-1">{viewDetails.name || 'N/A'}</P>
                    </Div>
                    <Div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                        <UiIcon as={Mail} className="w-3 h-3" /> Email
                      </Label>
                      <P className="text-sm text-slate-900 mt-1">{viewDetails.email || 'N/A'}</P>
                    </Div>
                    <Div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                        <UiIcon as={Phone} className="w-3 h-3" /> Phone
                      </Label>
                      <P className="text-sm text-slate-900 mt-1">{viewDetails.phone || 'N/A'}</P>
                    </Div>
                    <Div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Delivery ID</Label>
                      <P className="text-sm font-medium text-slate-900 mt-1">{viewDetails.deliveryId || 'N/A'}</P>
                    </Div>
                    <Div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Status</Label>
                      <Span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${viewDetails.status === 'pending' ? 'bg-blue-100 text-blue-700' : viewDetails.status === 'approved' || viewDetails.status === 'active' ? 'bg-green-100 text-green-700' : viewDetails.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}
                      >
                        {viewDetails.status === 'blocked' ? 'Rejected' : viewDetails.status?.charAt(0).toUpperCase() + viewDetails.status?.slice(1) || 'N/A'}
                      </Span>
                    </Div>
                    {viewDetails.rejectionReason && (
                      <Div className="col-span-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase text-red-600">Rejection Reason</Label>
                        <Div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-1">
                          <P className="text-sm text-red-700 whitespace-pre-wrap">{viewDetails.rejectionReason}</P>
                        </Div>
                      </Div>
                    )}
                    {viewDetails.dateOfBirth && (
                      <Div>
                        <Label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                          <UiIcon as={Calendar} className="w-3 h-3" /> Date of Birth
                        </Label>
                        <P className="text-sm text-slate-900 mt-1">
                          {new Date(viewDetails.dateOfBirth).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </P>
                      </Div>
                    )}
                    {viewDetails.gender && (
                      <Div>
                        <Label className="text-xs font-semibold text-slate-500 uppercase">Gender</Label>
                        <P className="text-sm text-slate-900 mt-1 capitalize">{viewDetails.gender || 'N/A'}</P>
                      </Div>
                    )}
                  </Div>
                </Div>

                {/* Location Details */}
                {viewDetails.location && (
                  <Div className="pb-6 border-b border-slate-200">
                    <H3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <UiIcon as={MapPin} className="w-4 h-4" /> Location Details
                    </H3>
                    <Div className="grid grid-cols-2 gap-4">
                      {viewDetails.location.addressLine1 && (
                        <Div className="col-span-2">
                          <Label className="text-xs font-semibold text-slate-500 uppercase">Address Line 1</Label>
                          <P className="text-sm text-slate-900 mt-1">{viewDetails.location.addressLine1}</P>
                        </Div>
                      )}
                      {viewDetails.location.addressLine2 && (
                        <Div className="col-span-2">
                          <Label className="text-xs font-semibold text-slate-500 uppercase">Address Line 2</Label>
                          <P className="text-sm text-slate-900 mt-1">{viewDetails.location.addressLine2}</P>
                        </Div>
                      )}
                      {viewDetails.location.area && (
                        <Div>
                          <Label className="text-xs font-semibold text-slate-500 uppercase">Area</Label>
                          <P className="text-sm text-slate-900 mt-1">{viewDetails.location.area}</P>
                        </Div>
                      )}
                      {viewDetails.location.city && (
                        <Div>
                          <Label className="text-xs font-semibold text-slate-500 uppercase">City</Label>
                          <P className="text-sm text-slate-900 mt-1">{viewDetails.location.city}</P>
                        </Div>
                      )}
                      {viewDetails.location.state && (
                        <Div>
                          <Label className="text-xs font-semibold text-slate-500 uppercase">State</Label>
                          <P className="text-sm text-slate-900 mt-1">{viewDetails.location.state}</P>
                        </Div>
                      )}
                      {viewDetails.location.zipCode && (
                        <Div>
                          <Label className="text-xs font-semibold text-slate-500 uppercase">Zip Code</Label>
                          <P className="text-sm text-slate-900 mt-1">{viewDetails.location.zipCode}</P>
                        </Div>
                      )}
                      {viewDetails.location.latitude && viewDetails.location.longitude && (
                        <Div className="col-span-2">
                          <Label className="text-xs font-semibold text-slate-500 uppercase">Coordinates</Label>
                          <P className="text-sm text-slate-900 mt-1">
                            {viewDetails.location.latitude}, {viewDetails.location.longitude}
                          </P>
                        </Div>
                      )}
                    </Div>
                  </Div>
                )}

                {/* Vehicle Details */}
                {viewDetails.vehicle && (
                  <Div className="pb-6 border-b border-slate-200">
                    <H3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <UiIcon as={Bike} className="w-4 h-4" /> Vehicle Details
                    </H3>
                    <Div className="grid grid-cols-4 gap-4">
                      {viewDetails.vehicle.brand && (
                        <Div>
                          <Label className="text-xs font-semibold text-slate-500 uppercase">Brand</Label>
                          <P className="text-sm text-slate-900 mt-1">{viewDetails.vehicle.brand}</P>
                        </Div>
                      )}
                      {viewDetails.vehicle.model && (
                        <Div className="text-right col-span-1">
                          <Label className="text-xs font-semibold text-slate-500 uppercase">Model</Label>
                          <P className="text-xs text-slate-900 mt-1">{viewDetails.vehicle.model}</P>
                        </Div>
                      )}
                      {viewDetails.vehicle.number && (
                        <Div className="col-span-2">
                          <Label className="text-xs font-semibold text-slate-500 uppercase">Vehicle Number</Label>
                          <P className="text-sm text-slate-900 mt-1">{viewDetails.vehicle.number}</P>
                        </Div>
                      )}
                      {viewDetails.vehicle.type && (
                        <Div>
                          <Label className="text-xs font-semibold text-slate-500 uppercase">Vehicle Type</Label>
                          <P className="text-sm text-slate-900 mt-1 capitalize">{viewDetails.vehicle.type}</P>
                        </Div>
                      )}
                    </Div>
                  </Div>
                )}

                {/* Documents */}
                {viewDetails.documents && (
                  <Div className="pb-6 border-b border-slate-200">
                    <H3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <UiIcon as={FileCheck} className="w-4 h-4" /> Documents
                    </H3>
                    <Div className="grid grid-cols-2 gap-4">
                      {/* Aadhar */}
                      {viewDetails.documents.aadhar && (
                        <Div>
                          <Label className="text-xs font-semibold text-slate-500 uppercase">Aadhar Card</Label>
                          <Div className="mt-2">
                            {viewDetails.documents.aadhar.number && (
                              <P className="text-sm text-slate-700 mb-1">Number: {viewDetails.documents.aadhar.number}</P>
                            )}
                            {viewDetails.documents.aadhar.document && (
                              <A
                                href={viewDetails.documents.aadhar.document}
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                              >
                                <UiIcon as={ExternalLink} className="w-3 h-3" /> View Document
                              </A>
                            )}
                          </Div>
                        </Div>
                      )}

                      {/* PAN */}
                      {viewDetails.documents.pan && (
                        <Div>
                          <Label className="text-xs font-semibold text-slate-500 uppercase">PAN Card</Label>
                          <Div className="mt-2">
                            {viewDetails.documents.pan.number && <P className="text-sm text-slate-700 mb-1">Number: {viewDetails.documents.pan.number}</P>}
                            {viewDetails.documents.pan.document && (
                              <A href={viewDetails.documents.pan.document} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                                <UiIcon as={ExternalLink} className="w-3 h-3" /> View Document
                              </A>
                            )}
                          </Div>
                        </Div>
                      )}

                      {/* Driving License */}
                      {viewDetails.documents.drivingLicense && (
                        <Div>
                          <Label className="text-xs font-semibold text-slate-500 uppercase">Driving License</Label>
                          <Div className="mt-2">
                            {viewDetails.documents.drivingLicense.number && (
                              <P className="text-sm text-slate-700 mb-1">Number: {viewDetails.documents.drivingLicense.number}</P>
                            )}
                            {viewDetails.documents.drivingLicense.expiryDate && (
                              <P className="text-xs text-slate-500 mb-1">
                                Expiry: {new Date(viewDetails.documents.drivingLicense.expiryDate).toLocaleDateString('en-GB')}
                              </P>
                            )}
                            {viewDetails.documents.drivingLicense.document && (
                              <A
                                href={viewDetails.documents.drivingLicense.document}
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                              >
                                <UiIcon as={ExternalLink} className="w-3 h-3" /> View Document
                              </A>
                            )}
                          </Div>
                        </Div>
                      )}

                      {/* Vehicle RC */}
                      {viewDetails.documents.vehicleRC && (viewDetails.documents.vehicleRC.number || viewDetails.documents.vehicleRC.document) && (
                        <Div>
                          <Label className="text-xs font-semibold text-slate-500 uppercase">Vehicle RC</Label>
                          <Div className="mt-2">
                            {viewDetails.documents.vehicleRC.number && (
                              <P className="text-sm text-slate-700 mb-1">Number: {viewDetails.documents.vehicleRC.number}</P>
                            )}
                            {viewDetails.documents.vehicleRC.document && (
                              <A
                                href={viewDetails.documents.vehicleRC.document}
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                              >
                                <UiIcon as={ExternalLink} className="w-3 h-3" /> View Document
                              </A>
                            )}
                          </Div>
                        </Div>
                      )}
                    </Div>
                  </Div>
                )}

                {/* Bank Details */}
                {viewDetails.documents?.bankDetails && (
                  <Div className="pb-6 border-b border-slate-200">
                    <H3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <UiIcon as={CreditCard} className="w-4 h-4" /> Bank Details
                    </H3>
                    <Div className="grid grid-cols-2 gap-4">
                      {viewDetails.documents.bankDetails.accountHolderName && (
                        <Div>
                          <Label className="text-xs font-semibold text-slate-500 uppercase">Account Holder Name</Label>
                          <P className="text-sm text-slate-900 mt-1">{viewDetails.documents.bankDetails.accountHolderName}</P>
                        </Div>
                      )}
                      {viewDetails.documents.bankDetails.accountNumber && (
                        <Div>
                          <Label className="text-xs font-semibold text-slate-500 uppercase">Account Number</Label>
                          <P className="text-sm text-slate-900 mt-1">{viewDetails.documents.bankDetails.accountNumber}</P>
                        </Div>
                      )}
                      {viewDetails.documents.bankDetails.ifscCode && (
                        <Div>
                          <Label className="text-xs font-semibold text-slate-500 uppercase">IFSC Code</Label>
                          <P className="text-sm text-slate-900 mt-1">{viewDetails.documents.bankDetails.ifscCode}</P>
                        </Div>
                      )}
                      {viewDetails.documents.bankDetails.bankName && (
                        <Div>
                          <Label className="text-xs font-semibold text-slate-500 uppercase">Bank Name</Label>
                          <P className="text-sm text-slate-900 mt-1">{viewDetails.documents.bankDetails.bankName}</P>
                        </Div>
                      )}
                    </Div>
                  </Div>
                )}

                {/* Additional Info */}
                <Div className="grid grid-cols-2 gap-4">
                  {viewDetails.signupMethod && (
                    <Div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Signup Method</Label>
                      <P className="text-sm text-slate-900 mt-1 capitalize">{viewDetails.signupMethod}</P>
                    </Div>
                  )}
                  {viewDetails.phoneVerified !== undefined && (
                    <Div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Phone Verified</Label>
                      <Span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${viewDetails.phoneVerified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {viewDetails.phoneVerified ? 'Verified' : 'Not Verified'}
                      </Span>
                    </Div>
                  )}
                  {viewDetails.createdAt && (
                    <Div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Joined Date</Label>
                      <P className="text-sm text-slate-900 mt-1">
                        {new Date(viewDetails.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </P>
                    </Div>
                  )}
                  {viewDetails.verifiedAt && (
                    <Div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Verified At</Label>
                      <P className="text-sm text-slate-900 mt-1">
                        {new Date(viewDetails.verifiedAt).toLocaleDateString('en-GB', {
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
              <Div className="flex items-center justify-center py-8">
                <UiIcon as={Loader2} className="w-6 h-6 animate-spin text-blue-600" />
              </Div>
            )}
          </Div>
          <DialogFooter className="px-6 pb-6 border-t border-slate-200">
            <Button
              onClick={() => setIsViewOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Panel */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="max-w-md bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <UiIcon as={Filter} className="w-5 h-5" />
              Filter Options
            </DialogTitle>
          </DialogHeader>
          <Div className="px-6 pb-6 space-y-4">
            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Zone</Label>
              <Select
                value={filters.zone}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    zone: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <Option value="">All Zones</Option>
                {zones.map((zone) => (
                  <Option key={zone} value={zone}>
                    {zone}
                  </Option>
                ))}
              </Select>
            </Div>

            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Vehicle Type</Label>
              <Select
                value={filters.vehicleType}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    vehicleType: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <Option value="">All Vehicle Types</Option>
                {vehicleTypes.map((type) => (
                  <Option key={type} value={type}>
                    {type}
                  </Option>
                ))}
              </Select>
            </Div>
          </Div>
          <DialogFooter className="px-6 pb-6">
            <Button
              onClick={handleResetFilters}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
            >
              Reset
            </Button>
            <Button
              onClick={() => setIsFilterOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md"
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
