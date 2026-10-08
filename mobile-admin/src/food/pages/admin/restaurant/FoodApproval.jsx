/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/FoodApproval.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, CheckCircle2, XCircle, Eye, Clock, Loader2 } from 'lucide-react-native';
import { Card } from '../../../../components/shadcn';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { adminAPI } from '../../../../api/food';
import { refreshSidebarBadges } from '../../../components/admin/AdminSidebar';
import { useAdminBadgeListRefresh } from '../../../hooks/useAdminBadgeListRefresh';
import { toast } from '../../../../lib/notify';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import {
  Button,
  Div,
  H1,
  H2,
  H3,
  Img,
  Input,
  Label,
  P,
  ScrollDiv,
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
import { Path, Svg } from 'react-native-svg';
import { document, window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const ComparisonField = ({ label, oldVal, newVal, type = 'text' }) => {
  const isChanged = String(oldVal ?? '') !== String(newVal ?? '');
  if (!isChanged) return null;
  const formatValue = (val) => {
    if (type === 'price') return `₹${val || 0}`;
    if (type === 'boolean') return val ? 'On' : 'Off';
    return val || 'None';
  };
  return (
    <Div className="p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
      <Label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</Label>
      <Div className="flex items-center gap-3">
        <Span
          className={`text-sm font-medium line-through decoration-2 ${type === 'boolean' ? (oldVal ? 'text-blue-500 decoration-blue-500/30' : 'text-gray-400 decoration-gray-400/50') : 'text-red-500 decoration-red-500/50'}`}
        >
          {formatValue(oldVal)}
        </Span>
        <Div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-50 text-gray-400">
          <Svg width={12} height={12} fill="none" viewBox="0 0 24 24">
            <Path stroke="#9ca3af" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5l7 7-7 7" />
          </Svg>
        </Div>
        <Span
          className={`text-sm font-bold px-2 py-0.5 rounded ${type === 'boolean' ? (newVal ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-100') : 'text-green-600 bg-green-50'}`}
        >
          {formatValue(newVal)}
        </Span>
      </Div>
    </Div>
  );
};
const ImageComparison = ({ oldImage, newImage, oldImages = [], newImages = [] }) => {
  // Single image comparison
  const isSingleImageChanged = oldImage !== newImage;

  // Array images comparison
  const oldSet = new Set(oldImages || []);
  const newSet = new Set(newImages || []);
  const removed = (oldImages || []).filter((img) => !newSet.has(img));
  const added = (newImages || []).filter((img) => !oldSet.has(img));
  const hasChanges = isSingleImageChanged || removed.length > 0 || added.length > 0;
  if (!hasChanges) return null;
  return (
    <Div className="col-span-full space-y-4 pt-4 border-t border-gray-100">
      <Label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Image Variations</Label>
      <Div className="flex flex-wrap gap-6">
        {isSingleImageChanged && (
          <Div className="flex gap-4 items-center p-3 bg-slate-50 rounded-xl border border-dashed border-gray-200">
            <Div className="relative">
              <Img src={oldImage} className="w-20 h-20 object-cover rounded-lg border-2 border-red-100 opacity-40 grayscale" alt="Old" />
              <Div className="absolute inset-0 flex items-center justify-center">
                <UiIcon as={XCircle} className="w-6 h-6 text-red-500/50" />
              </Div>
              <Span className="absolute -top-2 -left-2 bg-red-100 text-red-600 text-[8px] font-bold px-1.5 py-0.5 rounded">OLD</Span>
            </Div>
            <Div className="text-gray-300">
              <Svg width={20} height={20} fill="none" viewBox="0 0 24 24">
                <Path stroke="#d1d5db" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5l7 7-7 7" />
              </Svg>
            </Div>
            <Div className="relative">
              <Img
                src={newImage}
                className="w-20 h-20 object-cover rounded-lg border-2 border-green-400 shadow-md transition-transform hover:scale-105"
                alt="New"
              />
              <Span className="absolute -top-2 -left-2 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">NEW</Span>
            </Div>
          </Div>
        )}

        {removed.map((img, idx) => (
          <Div key={`rem-${idx}`} className="relative opacity-60">
            <Img src={img} className="w-20 h-20 object-cover rounded-lg border-2 border-red-200 grayscale" alt="Removed" />
            <Div className="absolute inset-0 flex items-center justify-center">
              <UiIcon as={XCircle} className="w-6 h-6 text-red-500" />
            </Div>
            <Span className="absolute -bottom-4 left-0 right-0 text-[8px] text-center text-red-500 font-bold">REMOVED</Span>
          </Div>
        ))}

        {added.map((img, idx) => (
          <Div key={`add-${idx}`} className="relative">
            <Img src={img} className="w-20 h-20 object-cover rounded-lg border-2 border-green-500 shadow-sm" alt="Added" />
            <Span className="absolute -bottom-4 left-0 right-0 text-[8px] text-center text-green-600 font-bold">ADDED</Span>
          </Div>
        ))}
      </Div>
    </Div>
  );
};
export default function FoodApproval() {
  const [foodRequests, setFoodRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_food_approval_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const isMountedRef = useRef(true);

  // Fetch pending food approval requests
  const fetchFoodRequests = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        const response = await adminAPI.getPendingFoodApprovals({
          search: debouncedSearch || undefined,
          page: currentPage,
          limit: pageSize,
        });
        const payload = response?.data?.data ?? response?.data;
        const data = Array.isArray(payload?.requests) ? payload.requests : Array.isArray(payload) ? payload : [];
        if (!isMountedRef.current) return;
        setFoodRequests(data);
        setTotalItems(Number(payload?.total ?? response?.data?.total ?? data.length) || 0);
      } catch (error) {
        debugError('Error fetching food approval requests:', error);
        if (!isMountedRef.current) return;
        if (!silent) {
          toast.error('Failed to load food approval requests');
        }
        setFoodRequests([]);
        setTotalItems(0);
      } finally {
        if (!silent && isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [debouncedSearch, currentPage, pageSize],
  );
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);
  useAdminBadgeListRefresh('foodApprovals', fetchFoodRequests, [debouncedSearch, currentPage, pageSize]);
  useEffect(() => {
    isMountedRef.current = true;
    fetchFoodRequests();
    const onFocus = () =>
      fetchFoodRequests({
        silent: true,
      });
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchFoodRequests({
          silent: true,
        });
      }
    };
    const onPageShow = () =>
      fetchFoodRequests({
        silent: true,
      });
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchFoodRequests({
          silent: true,
        });
      }
    }, 30000);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchFoodRequests, debouncedSearch, currentPage, pageSize]);
  const filteredRequests = foodRequests;
  const totalRequests = totalItems;

  // Handle approve food item or addon
  const handleApprove = async (request) => {
    if (!request?.isActionable) return;
    try {
      setProcessing(true);
      const id = request._id || request.id;
      setFoodRequests((prev) => prev.filter((item) => (item._id || item.id) !== id));
      if (request.entityType === 'addon') {
        await adminAPI.approveRestaurantAddon(id);
        toast.success('Add-on approved successfully');
      } else {
        await adminAPI.approveFoodItem(id);
        toast.success('Food item approved successfully');
      }
      await fetchFoodRequests({
        silent: true,
      });
      refreshSidebarBadges('foodApprovals');
      setShowDetailModal(false);
      setSelectedRequest(null);
    } catch (error) {
      debugError('Error approving item:', error);
      toast.error(error?.response?.data?.message || 'Failed to approve item');
      await fetchFoodRequests();
    } finally {
      setProcessing(false);
    }
  };

  // Handle reject food item or addon
  const handleReject = async () => {
    if (!selectedRequest?.isActionable) {
      setShowRejectModal(false);
      return;
    }
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      setProcessing(true);
      const id = selectedRequest._id || selectedRequest.id;
      setFoodRequests((prev) => prev.filter((item) => (item._id || item.id) !== id));
      if (selectedRequest.entityType === 'addon') {
        await adminAPI.rejectRestaurantAddon(id, rejectReason);
        toast.success('Add-on rejected');
      } else {
        await adminAPI.rejectFoodItem(id, rejectReason);
        toast.success('Food item rejected');
      }
      await fetchFoodRequests({
        silent: true,
      });
      refreshSidebarBadges('foodApprovals');
      setShowRejectModal(false);
      setShowDetailModal(false);
      setSelectedRequest(null);
      setRejectReason('');
    } catch (error) {
      debugError('Error rejecting item:', error);
      toast.error(error?.response?.data?.message || 'Failed to reject item');
      await fetchFoodRequests();
    } finally {
      setProcessing(false);
    }
  };

  // View food item details
  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  // Open reject modal
  const handleRejectClick = (request) => {
    if (!request?.isActionable) return;
    setSelectedRequest(request);
    setShowRejectModal(true);
  };
  return (
    <ScrollDiv className="p-6 space-y-4">
      {/* Page Header */}
      <Div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <Div className="flex items-center gap-2">
          <UiIcon as={CheckCircle2} className="w-5 h-5 text-green-500" />
          <H1 className="text-lg sm:text-xl font-semibold text-gray-900">Food Approval</H1>
        </Div>
      </Div>

      {/* Food Approval List Section */}
      <Card className="border border-gray-200 shadow-sm">
        <Div className="p-4">
          {/* Section Header */}
          <Div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <Div className="flex items-center gap-2">
              <H2 className="text-base font-semibold text-gray-900">Pending Food & Add-on Approvals</H2>
              <Span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-600">{totalRequests}</Span>
            </Div>
          </Div>

          {/* Search Bar */}
          <Div className="mb-4">
            <Div className="relative flex-1">
              <Span className="absolute inset-y-0 left-2.5 flex items-center text-gray-400">
                <UiIcon as={Search} className="w-4 h-4" />
              </Span>
              <Input
                type="text"
                placeholder="Search by name, category, restaurant or status"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:border-[#006fbd] focus:ring-1 focus:ring-[#006fbd]"
              />
            </Div>
          </Div>

          {/* Table */}
          {loading ? (
            <Div className="flex items-center justify-center py-12">
              <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-[#006fbd]" />
            </Div>
          ) : (
            <Div className="border-t border-gray-200">
              <Table
                cols={[70, 200, 150, 200, 100, 130, 110, 150, 120, 132]}
                className="min-w-full divide-y divide-gray-200 text-sm"
              >
                  <Thead
                    style={{
                      backgroundColor: 'rgba(0, 111, 189, 0.1)',
                    }}
                  >
                    <Tr>
                      <Th className="px-3 py-3 !text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">S.No</Th>
                      <Th className="px-3 py-3 !text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Restaurant</Th>
                      <Th className="px-3 py-3 !text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</Th>
                      <Th className="px-3 py-3 !text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Item Name</Th>
                      <Th className="px-3 py-3 !text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</Th>
                      <Th className="px-3 py-3 !text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</Th>
                      <Th className="px-3 py-3 !text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Price</Th>
                      <Th className="px-3 py-3 !text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Requested Date</Th>
                      <Th className="px-3 py-3 !text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Action Type</Th>
                      <Th className="px-3 py-3 !text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="divide-y divide-gray-200 bg-white">
                    {filteredRequests.length === 0 ? (
                      <Tr>
                        <Td colSpan="10" className="px-3 py-8 text-center text-sm text-gray-500">
                          {loading ? 'Loading...' : 'No food or add-on records found.'}
                        </Td>
                      </Tr>
                    ) : (
                      filteredRequests.map((request, index) => (
                        <Tr key={request._id || request.id} className="hover:bg-gray-50">
                          <Td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 font-semibold !text-center">
                            {(currentPage - 1) * pageSize + index + 1}
                          </Td>
                          <Td className="px-3 py-3 !text-center max-w-[200px]">
                            <Div className="text-sm truncate">
                              <Div className="font-semibold text-gray-900 truncate">{request.restaurantName || '-'}</Div>
                              <Div className="text-gray-500 text-xs truncate">{request.restaurantId || '-'}</Div>
                            </Div>
                          </Td>
                          <Td className="px-3 py-3 text-sm text-gray-700 !text-center max-w-[150px] truncate">{request.category || '-'}</Td>
                          <Td className="px-3 py-3 text-sm text-gray-700 font-semibold !text-center max-w-[200px] truncate">{request.itemName || '-'}</Td>
                          <Td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 capitalize !text-center">
                            <Span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${request.entityType === 'addon' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}
                            >
                              {request.entityType || 'food'}
                            </Span>
                          </Td>
                          <Td className="px-3 py-3 whitespace-nowrap text-sm !text-center">
                            <Span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${request.isActionable ? 'bg-amber-100 text-amber-700' : String(request.approvalStatus || '').toLowerCase() === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                            >
                              {request.approvalStatus || (request.isActionable ? 'pending' : 'active')}
                            </Span>
                          </Td>
                          <Td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 font-semibold !text-center">
                            {request.price !== null && request.price !== undefined ? `Rs ${request.price}` : '-'}
                          </Td>
                          <Td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 !text-center">
                            {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : '-'}
                          </Td>
                          <Td className="px-3 py-3 whitespace-nowrap text-sm !text-center">
                            {request.actionType === 'UPDATED' ? (
                              <Span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700">Changes</Span>
                            ) : (
                              <Span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">New Added</Span>
                            )}
                          </Td>
                          <Td className="px-3 py-3 whitespace-nowrap !text-center text-sm">
                            <Div className="flex justify-center gap-1.5">
                              <Button
                                onClick={() => handleViewDetails(request)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors"
                                style={{
                                  backgroundColor: '#006fbd',
                                }}
                              >
                                <UiIcon as={Eye} className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleApprove(request)}
                                disabled={processing || !request.isActionable}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <UiIcon as={CheckCircle2} className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleRejectClick(request)}
                                disabled={processing || !request.isActionable}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <UiIcon as={XCircle} className="w-4 h-4" />
                              </Button>
                            </Div>
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
                    localStorage.setItem('admin_food_approval_pageSize', String(size));
                  } catch {}
                  setCurrentPage(1);
                }}
                itemLabel="requests"
              />
            </Div>
          )}
        </Div>
      </Card>

      {/* Item Details Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 bg-white shadow-2xl rounded-2xl border-none">
          <DialogHeader className="p-6 pb-4 border-b border-gray-100 bg-slate-50/50">
            <DialogTitle className="text-xl font-bold text-gray-900">
              {selectedRequest?.entityType === 'addon' ? 'Add-on Details' : 'Food Item Details'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">Review the submitted details before approval.</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <Div className="p-6 space-y-6">
              {/* Restaurant Info */}
              <Div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 flex items-center justify-between">
                <Div>
                  <H3 className="font-bold text-xs text-blue-700 uppercase tracking-wider mb-1">Restaurant</H3>
                  <P className="text-sm font-semibold text-gray-900">{selectedRequest.restaurantName || '-'}</P>
                  <P className="text-xs text-gray-500">ID: {selectedRequest.restaurantId || '-'}</P>
                </Div>
                <Div className="flex flex-col items-end gap-1">
                  <Div className="px-3 py-1 bg-white rounded-full border border-blue-100 text-[10px] font-bold text-blue-600">
                    {selectedRequest.entityType?.toUpperCase()}
                  </Div>
                  {selectedRequest.actionType === 'UPDATED' && (
                    <Div className="px-2 py-0.5 bg-yellow-100 rounded text-[9px] font-bold text-yellow-700 uppercase">Changes</Div>
                  )}
                </Div>
              </Div>

              {selectedRequest.actionType === 'UPDATED' && selectedRequest.oldData ? (
                <Div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ComparisonField label="Item Name" oldVal={selectedRequest.oldData.name} newVal={selectedRequest.newData?.name} />
                    <ComparisonField
                      label="Category"
                      oldVal={selectedRequest.oldData.categoryName || selectedRequest.oldData.category}
                      newVal={selectedRequest.newData?.categoryName || selectedRequest.newData?.category}
                    />
                    <ComparisonField label="Price" oldVal={selectedRequest.oldData.price} newVal={selectedRequest.newData?.price} type="price" />
                    <ComparisonField label="Food Type" oldVal={selectedRequest.oldData.foodType} newVal={selectedRequest.newData?.foodType} />
                    {(() => {
                      const oldV = selectedRequest.oldData.variants || [];
                      const newV = selectedRequest.newData?.variants || [];
                      const oldStr = oldV.map((v) => `${v.name}:₹${v.price}`).join(', ');
                      const newStr = newV.map((v) => `${v.name}:₹${v.price}`).join(', ');
                      if (oldStr === newStr || (!oldStr && !newStr)) return null;
                      return (
                        <Div className="col-span-full">
                          <Label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Variants</Label>
                          <Div className="grid grid-cols-2 gap-3">
                            <Div>
                              <P className="text-[10px] text-gray-400 mb-1">Before</P>
                              {oldV.length > 0 ? (
                                oldV.map((v, i) => (
                                  <Div key={i} className="flex justify-between bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 mb-1">
                                    <Span className="text-sm text-gray-700">{v.name}</Span>
                                    <Span className="text-sm font-bold text-red-600">₹{v.price}</Span>
                                  </Div>
                                ))
                              ) : (
                                <P className="text-sm text-gray-400 italic">None</P>
                              )}
                            </Div>
                            <Div>
                              <P className="text-[10px] text-gray-400 mb-1">After</P>
                              {newV.length > 0 ? (
                                newV.map((v, i) => (
                                  <Div key={i} className="flex justify-between bg-green-50 border border-green-100 rounded-lg px-3 py-1.5 mb-1">
                                    <Span className="text-sm text-gray-700">{v.name}</Span>
                                    <Span className="text-sm font-bold text-green-600">₹{v.price}</Span>
                                  </Div>
                                ))
                              ) : (
                                <P className="text-sm text-gray-400 italic">None</P>
                              )}
                            </Div>
                          </Div>
                        </Div>
                      );
                    })()}
                    <ComparisonField
                      label="Preparation Time"
                      oldVal={selectedRequest.oldData.preparationTime}
                      newVal={selectedRequest.newData?.preparationTime}
                    />
                    <ComparisonField
                      label="Recommend"
                      oldVal={selectedRequest.oldData.isRecommended}
                      newVal={selectedRequest.newData?.isRecommended}
                      type="boolean"
                    />
                    <ComparisonField
                      label="In Stock"
                      oldVal={selectedRequest.oldData.isAvailable}
                      newVal={selectedRequest.newData?.isAvailable}
                      type="boolean"
                    />

                    <Div className="col-span-full">
                      <ComparisonField label="Description" oldVal={selectedRequest.oldData.description} newVal={selectedRequest.newData?.description} />
                    </Div>

                    <ImageComparison
                      oldImage={selectedRequest.oldData.image}
                      newImage={selectedRequest.newData?.image}
                      oldImages={selectedRequest.oldData.images}
                      newImages={selectedRequest.newData?.images}
                    />
                  </Div>
                </Div> /* Item Info (Existing View) */
              ) : (
                <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Div className="space-y-4">
                    <Div>
                      <Label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Item Name</Label>
                      <P className="text-sm font-semibold text-gray-900">{selectedRequest.itemName || '-'}</P>
                    </Div>
                    <Div>
                      <Label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category</Label>
                      <P className="text-sm text-gray-700">{selectedRequest.category || '-'}</P>
                    </Div>
                    <Div>
                      <Label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Price</Label>
                      {selectedRequest.variants && selectedRequest.variants.length > 0 ? (
                        <P className="text-xs text-gray-500 font-medium">Starts from ₹{selectedRequest.price}</P>
                      ) : (
                        <P className="text-sm font-bold text-green-600">
                          {selectedRequest.price !== null && selectedRequest.price !== undefined ? `₹${selectedRequest.price}` : '-'}
                        </P>
                      )}
                    </Div>
                    {selectedRequest.variants && selectedRequest.variants.length > 0 && (
                      <Div>
                        <Label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Variants</Label>
                        <Div className="space-y-1.5">
                          {selectedRequest.variants.map((v, i) => (
                            <Div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                              <Span className="text-sm font-medium text-gray-800">{v.name}</Span>
                              <Span className="text-sm font-bold text-green-600">₹{v.price}</Span>
                            </Div>
                          ))}
                        </Div>
                      </Div>
                    )}
                    <Div>
                      <Label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</Label>
                      <P className="text-sm text-gray-700 capitalize font-medium">{selectedRequest.approvalStatus || 'pending'}</P>
                    </Div>
                  </Div>

                  <Div className="space-y-4">
                    {selectedRequest.foodType && (
                      <Div>
                        <Label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Food Type</Label>
                        <P className="text-sm text-gray-700">{selectedRequest.foodType}</P>
                      </Div>
                    )}
                    {selectedRequest.requestedAt && (
                      <Div>
                        <Label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Requested On</Label>
                        <P className="text-sm text-gray-700">{new Date(selectedRequest.requestedAt).toLocaleString()}</P>
                      </Div>
                    )}
                  </Div>

                  {selectedRequest.description && (
                    <Div className="col-span-full">
                      <Label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</Label>
                      <P className="text-sm text-gray-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedRequest.description}</P>
                    </Div>
                  )}

                  {/* Images */}
                  {(() => {
                    const allImages = (selectedRequest.images || []).filter((img) => img && typeof img === 'string');
                    if (selectedRequest.image && !allImages.includes(selectedRequest.image)) {
                      allImages.unshift(selectedRequest.image);
                    }
                    return allImages.length > 0 ? (
                      <Div className="col-span-full">
                        <Label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Images ({allImages.length})</Label>
                        <Div className="flex flex-wrap gap-3">
                          {allImages.map((img, idx) => (
                            <Img
                              key={idx}
                              src={img}
                              alt="Item preview"
                              className="w-24 h-24 object-cover rounded-xl border border-gray-100 shadow-sm hover:scale-105 transition-transform cursor-zoom-in"
                              onClick={() => window.open(img, '_blank')}
                            />
                          ))}
                        </Div>
                      </Div>
                    ) : null;
                  })()}
                </Div>
              )}
            </Div>
          )}
          <DialogFooter className="p-6 pt-4 border-t border-gray-100 bg-slate-50/50 flex gap-2">
            <Button
              type="button"
              onClick={() => setShowDetailModal(false)}
              className="px-6 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Close
            </Button>
            {selectedRequest?.isActionable && (
              <>
                <Button
                  type="button"
                  onClick={() => handleRejectClick(selectedRequest)}
                  className="px-6 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={processing}
                  className="px-6 py-2 text-sm font-semibold text-white bg-green-500 rounded-xl hover:bg-green-600 shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Approve Item'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md p-0 bg-white rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-gray-100 bg-red-50/30">
            <DialogTitle className="text-xl font-bold text-red-700 flex items-center gap-2">
              <UiIcon as={XCircle} className="w-5 h-5" />
              Reject Item
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">
              Please provide a clear reason for rejecting this {selectedRequest?.entityType || 'item'}.
            </DialogDescription>
          </DialogHeader>
          <Div className="p-6">
            <Div className="space-y-4">
              <Div>
                <Label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Rejection Reason <Span className="text-red-500">*</Span>
                </Label>
                <Textarea
                  nativeID="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Tell the restaurant why this item was rejected..."
                  required
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                />
              </Div>
            </Div>
            <DialogFooter className="mt-6 flex gap-2">
              <Button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-red-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm Rejection'}
              </Button>
            </DialogFooter>
          </Div>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
