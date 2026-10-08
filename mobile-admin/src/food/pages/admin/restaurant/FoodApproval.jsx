/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/FoodApproval.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, CheckCircle2, XCircle, Eye, Clock } from 'lucide-react-native';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { adminAPI } from '../../../../api/food';
import { refreshSidebarBadges } from '../../../components/admin/AdminSidebar';
import { useAdminBadgeListRefresh } from '../../../hooks/useAdminBadgeListRefresh';
import { toast } from '../../../../lib/notify';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import { Button, Div, Img, Input, Label, P, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
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
  Field,
  TableSkeleton,
  EmptyState,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_DANGER,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
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
    <Div className="p-3 bg-white rounded-lg border border-slate-200">
      <Label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</Label>
      <Div className="flex-row items-center gap-3">
        <Span
          className={`text-sm font-medium line-through decoration-2 ${type === 'boolean' ? (oldVal ? 'text-blue-500 decoration-blue-500/30' : 'text-slate-400 decoration-slate-400/50') : 'text-red-500 decoration-red-500/50'}`}
        >
          {formatValue(oldVal)}
        </Span>
        <Div className="flex-row items-center justify-center w-5 h-5 rounded-full bg-slate-50 text-slate-400">
          <Svg width={12} height={12} fill="none" viewBox="0 0 24 24">
            <Path stroke="#9ca3af" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5l7 7-7 7" />
          </Svg>
        </Div>
        <Span
          className={`text-sm font-bold px-2 py-0.5 rounded ${type === 'boolean' ? (newVal ? 'text-green-600 bg-green-50' : 'text-slate-600 bg-slate-100') : 'text-green-600 bg-green-50'}`}
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
    <Div className="col-span-full space-y-4 pt-4 border-t border-slate-100">
      <Label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Image Variations</Label>
      <Div className="flex-row flex-wrap gap-6">
        {isSingleImageChanged && (
          <Div className="flex-row items-center gap-4 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Div className="relative">
              <Img src={oldImage} className="w-20 h-20 object-cover rounded-lg border border-red-200 opacity-40 grayscale" alt="Old" />
              <Div className="absolute inset-0 flex-row items-center justify-center">
                <UiIcon as={XCircle} className="w-6 h-6 text-red-500/50" />
              </Div>
              <Span className="absolute -top-2 -left-2 bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded">OLD</Span>
            </Div>
            <Div className="text-slate-300">
              <Svg width={20} height={20} fill="none" viewBox="0 0 24 24">
                <Path stroke="#d1d5db" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5l7 7-7 7" />
              </Svg>
            </Div>
            <Div className="relative">
              <Img
                src={newImage}
                className="w-20 h-20 object-cover rounded-lg border border-green-600"
                alt="New"
              />
              <Span className="absolute -top-2 -left-2 bg-green-700 text-white text-xs font-semibold px-1.5 py-0.5 rounded">NEW</Span>
            </Div>
          </Div>
        )}

        {removed.map((img, idx) => (
          <Div key={`rem-${idx}`} className="relative opacity-60">
            <Img src={img} className="w-20 h-20 object-cover rounded-lg border border-red-200 grayscale" alt="Removed" />
            <Div className="absolute inset-0 flex-row items-center justify-center">
              <UiIcon as={XCircle} className="w-6 h-6 text-red-500" />
            </Div>
            <Span className="absolute -bottom-4 left-0 right-0 text-xs text-center text-red-500 font-bold">REMOVED</Span>
          </Div>
        ))}

        {added.map((img, idx) => (
          <Div key={`add-${idx}`} className="relative">
            <Img src={img} className="w-20 h-20 object-cover rounded-lg border border-green-600" alt="Added" />
            <Span className="absolute -bottom-4 left-0 right-0 text-xs text-center text-green-600 font-bold">ADDED</Span>
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
  const { tablet } = useLayoutWidth();

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
  const COLS = [60, 180, 140, 180, 90, 120, 100, 130, 110, 140];
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={CheckCircle2}
        title="Food Approval"
        subtitle="Food items and add-ons waiting for a decision"
        breadcrumb={[{ label: 'Food' }, { label: 'Restaurants' }, { label: 'Food approval' }]}
      />

      <Card className="mb-4">
        <SectionTitle action={<StatusBadge status="pending" label={`${totalRequests} pending`} />}>Pending Food &amp; Add-on Approvals</SectionTitle>

        {/* Search */}
        <Toolbar>
          <Div className="flex-row items-center flex-1 min-w-[200px] gap-2">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name, category, restaurant or status"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${INPUT} flex-1`}
            />
          </Div>
        </Toolbar>

        {loading ? (
          <TableSkeleton rows={5} />
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Nothing waiting for approval"
            message={
              searchQuery
                ? 'No food item or add-on matches that search. Try a different name, category or restaurant.'
                : 'New food items and add-ons submitted by restaurants will show up here.'
            }
          />
        ) : (
          <>
            <DataTable cols={COLS}>
              <THead
                cols={COLS}
                labels={['S.No', 'Restaurant', 'Category', 'Item Name', 'Type', 'Status', 'Price', 'Requested', 'Action Type', 'Action']}
              />
              <TBody>
                {filteredRequests.map((request, index, all) => (
                  <Row key={request._id || request.id} last={index === all.length - 1}>
                    <Cell width={COLS[0]}>{String((currentPage - 1) * pageSize + index + 1)}</Cell>
                    <Cell width={COLS[1]}>
                      <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={2}>
                        {request.restaurantName || '-'}
                      </Text>
                      <Text style={tw`text-xs text-slate-500`} numberOfLines={1}>
                        {request.restaurantId || '-'}
                      </Text>
                    </Cell>
                    <Cell width={COLS[2]}>{request.category || '-'}</Cell>
                    <Cell width={COLS[3]}>
                      <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={2}>
                        {request.itemName || '-'}
                      </Text>
                    </Cell>
                    <Cell width={COLS[4]}>
                      <StatusBadge status="info" tone="info" label={request.entityType || 'food'} />
                    </Cell>
                    <Cell width={COLS[5]}>
                      <StatusBadge
                        status={request.isActionable ? 'pending' : request.approvalStatus || 'active'}
                        label={request.approvalStatus || (request.isActionable ? 'pending' : 'active')}
                      />
                    </Cell>
                    <Cell width={COLS[6]} align="right">
                      {request.price !== null && request.price !== undefined ? `₹${request.price}` : '-'}
                    </Cell>
                    <Cell width={COLS[7]}>{request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : '-'}</Cell>
                    <Cell width={COLS[8]}>
                      {request.actionType === 'UPDATED' ? (
                        <StatusBadge status="review" label="Changes" />
                      ) : (
                        <StatusBadge status="approved" label="New Added" />
                      )}
                    </Cell>
                    <Cell width={COLS[9]}>
                      <Div className="flex-row items-center">
                        <Button
                          onClick={() => handleViewDetails(request)}
                          accessibilityLabel="View details"
                          className="w-11 h-11 items-center justify-center rounded-lg"
                        >
                          <UiIcon as={Eye} size={18} className="text-blue-600" />
                        </Button>
                        <Button
                          onClick={() => handleApprove(request)}
                          disabled={processing || !request.isActionable}
                          accessibilityLabel="Approve"
                          className={`w-11 h-11 items-center justify-center rounded-lg ${processing || !request.isActionable ? 'opacity-40' : ''}`}
                        >
                          <UiIcon as={CheckCircle2} size={18} className="text-green-700" />
                        </Button>
                        <Button
                          onClick={() => handleRejectClick(request)}
                          disabled={processing || !request.isActionable}
                          accessibilityLabel="Reject"
                          className={`w-11 h-11 items-center justify-center rounded-lg ${processing || !request.isActionable ? 'opacity-40' : ''}`}
                        >
                          <UiIcon as={XCircle} size={18} className="text-red-600" />
                        </Button>
                      </Div>
                    </Cell>
                  </Row>
                ))}
              </TBody>
            </DataTable>

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
          </>
        )}
      </Card>

      {/* Item Details Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 bg-white shadow-2xl rounded-2xl border-none">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-xl font-bold text-slate-900">
              {selectedRequest?.entityType === 'addon' ? 'Add-on Details' : 'Food Item Details'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">Review the submitted details before approval.</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <Div className="p-6 space-y-6">
              {/* Restaurant Info */}
              <Div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex-row items-start justify-between gap-3">
                <Div className="flex-1 min-w-0">
                  <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500`}>Restaurant</Text>
                  <Text style={tw`text-sm font-semibold text-slate-900 mt-1`} numberOfLines={2}>
                    {selectedRequest.restaurantName || '-'}
                  </Text>
                  <Text style={tw`text-xs text-slate-500`} numberOfLines={1}>
                    ID: {selectedRequest.restaurantId || '-'}
                  </Text>
                </Div>
                <Div className="items-end gap-1 shrink-0">
                  <StatusBadge status="info" tone="info" label={selectedRequest.entityType || 'food'} />
                  {selectedRequest.actionType === 'UPDATED' && <StatusBadge status="review" label="Changes" />}
                </Div>
              </Div>

              {selectedRequest.actionType === 'UPDATED' && selectedRequest.oldData ? (
                <Div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-4`}>
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
                          <Label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Variants</Label>
                          <Div className="grid grid-cols-2 gap-3">
                            <Div>
                              <P className="text-[10px] text-slate-400 mb-1">Before</P>
                              {oldV.length > 0 ? (
                                oldV.map((v, i) => (
                                  <Div key={i} className="flex-row items-center justify-between bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 mb-1">
                                    <Span className="text-sm text-slate-700">{v.name}</Span>
                                    <Span className="text-sm font-bold text-red-600">₹{v.price}</Span>
                                  </Div>
                                ))
                              ) : (
                                <P className="text-sm text-slate-400 italic">None</P>
                              )}
                            </Div>
                            <Div>
                              <P className="text-[10px] text-slate-400 mb-1">After</P>
                              {newV.length > 0 ? (
                                newV.map((v, i) => (
                                  <Div key={i} className="flex-row items-center justify-between bg-green-50 border border-green-100 rounded-lg px-3 py-1.5 mb-1">
                                    <Span className="text-sm text-slate-700">{v.name}</Span>
                                    <Span className="text-sm font-bold text-green-600">₹{v.price}</Span>
                                  </Div>
                                ))
                              ) : (
                                <P className="text-sm text-slate-400 italic">None</P>
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
                <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-4`}>
                  <Div className="space-y-4">
                    <Div>
                      <Label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Item Name</Label>
                      <P className="text-sm font-semibold text-slate-900">{selectedRequest.itemName || '-'}</P>
                    </Div>
                    <Div>
                      <Label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Category</Label>
                      <P className="text-sm text-slate-700">{selectedRequest.category || '-'}</P>
                    </Div>
                    <Div>
                      <Label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Price</Label>
                      {selectedRequest.variants && selectedRequest.variants.length > 0 ? (
                        <P className="text-xs text-slate-500 font-medium">Starts from ₹{selectedRequest.price}</P>
                      ) : (
                        <P className="text-sm font-bold text-green-600">
                          {selectedRequest.price !== null && selectedRequest.price !== undefined ? `₹${selectedRequest.price}` : '-'}
                        </P>
                      )}
                    </Div>
                    {selectedRequest.variants && selectedRequest.variants.length > 0 && (
                      <Div>
                        <Label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Variants</Label>
                        <Div className="space-y-1.5">
                          {selectedRequest.variants.map((v, i) => (
                            <Div key={i} className="flex-row items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                              <Span className="text-sm font-medium text-slate-800">{v.name}</Span>
                              <Span className="text-sm font-bold text-green-600">₹{v.price}</Span>
                            </Div>
                          ))}
                        </Div>
                      </Div>
                    )}
                    <Div>
                      <Label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Status</Label>
                      <P className="text-sm text-slate-700 capitalize font-medium">{selectedRequest.approvalStatus || 'pending'}</P>
                    </Div>
                  </Div>

                  <Div className="space-y-4">
                    {selectedRequest.foodType && (
                      <Div>
                        <Label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Food Type</Label>
                        <P className="text-sm text-slate-700">{selectedRequest.foodType}</P>
                      </Div>
                    )}
                    {selectedRequest.requestedAt && (
                      <Div>
                        <Label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Requested On</Label>
                        <P className="text-sm text-slate-700">{new Date(selectedRequest.requestedAt).toLocaleString()}</P>
                      </Div>
                    )}
                  </Div>

                  {selectedRequest.description && (
                    <Div className="col-span-full">
                      <Label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</Label>
                      <P className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedRequest.description}</P>
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
                        <Label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Images ({allImages.length})</Label>
                        <Div className="flex-row flex-wrap gap-3">
                          {allImages.map((img, idx) => (
                            <Img
                              key={idx}
                              src={img}
                              alt="Item preview"
                              className="w-24 h-24 object-cover rounded-xl border border-slate-200"
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
          <DialogFooter className="p-6 pt-4 border-t border-slate-200 bg-slate-50 flex-row flex-wrap items-center justify-end gap-2">
            <Button type="button" onClick={() => setShowDetailModal(false)} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Close</Span>
            </Button>
            {selectedRequest?.isActionable && (
              <>
                <Button type="button" onClick={() => handleRejectClick(selectedRequest)} className={BTN_DANGER}>
                  <Span className={BTN_TEXT_PRIMARY}>Reject</Span>
                </Button>
                <Button
                  type="button"
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={processing}
                  className={`${BTN_PRIMARY} ${processing ? 'opacity-50' : ''}`}
                >
                  <Span className={BTN_TEXT_PRIMARY}>{processing ? 'Processing…' : 'Approve Item'}</Span>
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md p-0 bg-white rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-red-50/30">
            <DialogTitle className="text-xl font-bold text-red-700 flex-row items-center gap-2">
              <UiIcon as={XCircle} className="w-5 h-5" />
              Reject Item
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">
              Please provide a clear reason for rejecting this {selectedRequest?.entityType || 'item'}.
            </DialogDescription>
          </DialogHeader>
          <Div className="p-6">
            <Field label="Rejection reason" required hint="The restaurant sees this message.">
              <Textarea
                nativeID="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Tell the restaurant why this item was rejected"
                required
                rows={4}
                className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900"
              />
            </Field>
            <DialogFooter className="mt-6 flex-row items-center gap-2">
              <Button type="button" onClick={() => setShowRejectModal(false)} className={`${BTN_SECONDARY} flex-1`}>
                <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
              </Button>
              <Button
                type="button"
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className={`${BTN_DANGER} flex-1 ${processing || !rejectReason.trim() ? 'opacity-50' : ''}`}
              >
                <Span className={BTN_TEXT_PRIMARY}>{processing ? 'Processing…' : 'Confirm Rejection'}</Span>
              </Button>
            </DialogFooter>
          </Div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
