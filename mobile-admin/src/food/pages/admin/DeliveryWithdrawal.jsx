/* Ported from Frontend/src/modules/Food/pages/admin/DeliveryWithdrawal.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Search, Wallet, Eye, CheckCircle, XCircle, Loader2, Package, QrCode } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import AdminListPagination from '../../components/admin/AdminListPagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/shadcn';
import { Button, Div, H1, H2, Input, Label, P, ScrollDiv, Span, Table, Tbody, Td, Textarea, Th, Thead, Tr, Icon as UiIcon } from '../../../components/web';
import { window } from '../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const TABS = [
  {
    key: 'All',
    label: 'All',
  },
  {
    key: 'Pending',
    label: 'Pending',
  },
  {
    key: 'Approved',
    label: 'Approved',
  },
  {
    key: 'Rejected',
    label: 'Rejected',
  },
];
export default function DeliveryWithdrawal() {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_delivery_withdraws_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeTab]);
  useEffect(() => {
    fetchRequests();
  }, [activeTab, debouncedSearch, currentPage, pageSize]);
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDeliveryWithdrawals({
        status: activeTab,
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
      });
      if (response?.data?.success) {
        setRequests(response.data.data?.requests || []);
        setTotalItems(response.data.data?.total ?? response.data?.total ?? (response.data.data?.requests || []).length);
      } else {
        toast.error(response?.data?.message || 'Failed to fetch delivery withdrawal requests');
        setRequests([]);
        setTotalItems(0);
      }
    } catch (error) {
      debugError('Error fetching delivery withdrawal requests:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch delivery withdrawal requests');
      setRequests([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };
  const filteredRequests = requests;
  const getStatusBadge = (status) => {
    if (status === 'Approved' || status === 'Processed') return 'bg-green-100 text-green-700';
    if (status === 'Pending') return 'bg-amber-100 text-amber-700';
    if (status === 'Rejected') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
  };
  const handleView = (req) => {
    setSelectedRequest(req);
    setIsViewOpen(true);
  };
  const handleApprove = async (id) => {
    if (!(await window.confirmAsync('Are you sure you want to approve this withdrawal request?'))) return;
    try {
      setProcessingAction(id);
      const response = await adminAPI.updateDeliveryWithdrawalStatus(id, {
        status: 'Approved',
      });
      if (response?.data?.success) {
        toast.success('Withdrawal request approved successfully');
        fetchRequests();
      } else {
        toast.error(response?.data?.message || 'Failed to approve');
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to approve withdrawal request';
      debugError('Error approving delivery withdrawal:', error?.response?.data || error, msg);
      toast.error(msg);
    } finally {
      setProcessingAction(null);
    }
  };
  const handleReject = async (id) => {
    try {
      setProcessingAction(id);
      const response = await adminAPI.updateDeliveryWithdrawalStatus(id, {
        status: 'Rejected',
        rejectionReason: rejectionReason,
      });
      if (response?.data?.success) {
        toast.success('Withdrawal request rejected successfully');
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedRequest(null);
        fetchRequests();
      } else {
        toast.error(response?.data?.message || 'Failed to reject');
      }
    } catch (error) {
      debugError('Error rejecting delivery withdrawal:', error);
      toast.error(error.response?.data?.message || 'Failed to reject withdrawal request');
    } finally {
      setProcessingAction(null);
    }
  };
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return String(dateString);
    }
  };
  const formatCurrency = (amount) => {
    if (amount == null) return '\u20B90.00';
    return `\u20B9${Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3">
            <UiIcon as={Wallet} className="w-5 h-5 text-emerald-600" />
            <H1 className="text-2xl font-bold text-slate-900">Delivery Withdrawal</H1>
          </Div>
          <P className="text-sm text-slate-600 mt-1">View and manage delivery boy withdrawal requests. Pending requests can be approved or rejected.</P>
        </Div>

        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex gap-2 border-b border-slate-200">
            {TABS.map((tab) => (
              <Button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.key ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
              >
                {tab.label}
              </Button>
            ))}
          </Div>
        </Div>

        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="flex items-center gap-2">
              <H2 className="text-xl font-bold text-slate-900">Withdrawal Requests</H2>
              <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">{totalItems}</Span>
            </Div>
            <Div className="relative flex-1 sm:flex-initial min-w-[200px] max-w-xs">
              <Input
                type="text"
                placeholder="Search by delivery name, ID, phone"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              />
              <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </Div>
          </Div>

          {loading ? (
            <Div className="py-20 text-center">
              <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
              <P className="text-slate-600">Loading withdrawal requests…</P>
            </Div>
          ) : (
            <Table cols={[56, 110, 180, 130, 150, 120, 132]} className="w-full">
                <Thead className="bg-slate-50 border-b border-slate-200">
                  <Tr>
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">#</Th>
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Amount</Th>
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Delivery Boy</Th>
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">ID</Th>
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Request Time</Th>
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Status</Th>
                    <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {filteredRequests.length === 0 ? (
                    <Tr>
                      <Td colSpan={7} className="px-6 py-20 text-center">
                        <Div className="flex flex-col items-center justify-center">
                          <UiIcon as={Package} className="w-16 h-16 text-slate-400 mb-4" />
                          <P className="text-lg font-semibold text-slate-700">No requests</P>
                          <P className="text-sm text-slate-500">No {activeTab.toLowerCase()} withdrawal requests.</P>
                        </Div>
                      </Td>
                    </Tr>
                  ) : (
                    filteredRequests.map((req, index) => (
                      <Tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <Td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{index + 1}</Td>
                        <Td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{formatCurrency(req.amount)}</Td>
                        <Td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{req.deliveryName || 'N/A'}</Td>
                        <Td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{req.deliveryIdString || 'N/A'}</Td>
                        <Td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{formatDate(req.requestedAt || req.createdAt)}</Td>
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(req.status)}`}>{req.status}</Span>
                        </Td>
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Div className="flex items-center justify-center gap-2">
                            <Button onClick={() => handleView(req)} className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
                              <UiIcon as={Eye} className="w-4 h-4 text-amber-600" />
                            </Button>
                            {req.status === 'Pending' && (
                              <>
                                <Button
                                  onClick={() => handleApprove(req.id)}
                                  disabled={processingAction === req.id}
                                  className="p-2 rounded-lg bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {processingAction === req.id ? (
                                    <UiIcon as={Loader2} className="w-4 h-4 text-green-600 animate-spin" />
                                  ) : (
                                    <UiIcon as={CheckCircle} className="w-4 h-4 text-green-600" />
                                  )}
                                </Button>
                                <Button
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setShowRejectModal(true);
                                  }}
                                  disabled={processingAction === req.id}
                                  className="p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <UiIcon as={XCircle} className="w-4 h-4 text-red-600" />
                                </Button>
                              </>
                            )}
                          </Div>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
            </Table>
          )}

          <AdminListPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              try {
                localStorage.setItem('admin_delivery_withdraws_pageSize', String(size));
              } catch {}
              setCurrentPage(1);
            }}
            itemLabel="withdrawals"
          />
        </Div>

        {/* View details dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-md bg-white p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Withdrawal request details</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <Div className="px-6 pb-6 space-y-4">
                <Div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Amount</Label>
                  <P className="text-sm font-medium text-slate-900 mt-1">{formatCurrency(selectedRequest.amount)}</P>
                </Div>
                <Div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Delivery boy</Label>
                  <P className="text-sm font-medium text-slate-900 mt-1">{selectedRequest.deliveryName || 'N/A'}</P>
                </Div>
                <Div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Delivery ID</Label>
                  <P className="text-sm font-medium text-slate-900 mt-1">{selectedRequest.deliveryIdString || 'N/A'}</P>
                </Div>
                <Div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Phone</Label>
                  <P className="text-sm font-medium text-slate-900 mt-1">{selectedRequest.deliveryPhone || 'N/A'}</P>
                </Div>
                {selectedRequest.upiId && (
                  <Div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 mb-2">
                    <Div className="flex items-center gap-2 mb-1">
                      <UiIcon as={QrCode} className="w-4 h-4 text-emerald-600" />
                      <Label className="text-xs font-bold text-emerald-800 uppercase">UPI Information</Label>
                    </Div>
                    <Div className="flex items-center justify-between">
                      <P className="text-sm font-semibold text-slate-900">{selectedRequest.upiId}</P>
                      {selectedRequest.upiQrCode && (
                        <Button
                          onClick={() => window.open(selectedRequest.upiQrCode, '_blank')}
                          className="text-[10px] bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 transition-colors flex items-center gap-1"
                        >
                          <UiIcon as={Eye} className="w-3 h-3" />
                          View QR
                        </Button>
                      )}
                    </Div>
                  </Div>
                )}
                <Div className="grid grid-cols-2 gap-4">
                  <Div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase">Bank Name</Label>
                    <P className="text-sm font-medium text-slate-900 mt-1">{selectedRequest.bankDetails?.bankName || 'N/A'}</P>
                  </Div>
                  <Div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase">Account Number</Label>
                    <P className="text-sm font-medium text-slate-900 mt-1">{selectedRequest.bankDetails?.accountNumber || 'N/A'}</P>
                  </Div>
                </Div>
                <Div className="grid grid-cols-2 gap-4">
                  <Div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase">IFSC Code</Label>
                    <P className="text-sm font-medium text-slate-900 mt-1 uppercase text-emerald-600">{selectedRequest.bankDetails?.ifscCode || 'N/A'}</P>
                  </Div>
                  <Div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase">Holder Name</Label>
                    <P className="text-sm font-medium text-slate-900 mt-1">{selectedRequest.bankDetails?.accountHolderName || 'N/A'}</P>
                  </Div>
                </Div>
                <Div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Request time</Label>
                  <P className="text-sm font-medium text-slate-900 mt-1">{formatDate(selectedRequest.requestedAt || selectedRequest.createdAt)}</P>
                </Div>
                {(selectedRequest.status === 'Approved' || selectedRequest.status === 'Processed') && selectedRequest.processedAt && (
                  <Div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase">Processed at</Label>
                    <P className="text-sm font-medium text-slate-900 mt-1">{formatDate(selectedRequest.processedAt)}</P>
                  </Div>
                )}
                {selectedRequest.status === 'Rejected' && selectedRequest.processedAt && (
                  <Div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase">Rejected at</Label>
                    <P className="text-sm font-medium text-slate-900 mt-1">{formatDate(selectedRequest.processedAt)}</P>
                  </Div>
                )}
                <Div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Status</Label>
                  <P className="mt-1">
                    <Span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selectedRequest.status)}`}>{selectedRequest.status}</Span>
                  </P>
                </Div>
                {selectedRequest.rejectionReason && (
                  <Div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase">Rejection reason</Label>
                    <P className="text-sm font-medium text-slate-900 mt-1">{selectedRequest.rejectionReason}</P>
                  </Div>
                )}
              </Div>
            )}
            <DialogFooter className="px-6 pb-6">
              <Button
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject modal */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent className="max-w-md bg-white p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Reject withdrawal request</DialogTitle>
            </DialogHeader>
            <Div className="px-6 pb-6 space-y-4">
              <Div>
                <Label className="block text-sm font-medium text-slate-700 mb-2">Rejection reason (optional)</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection…"
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </Div>
            </Div>
            <DialogFooter className="px-6 pb-6 flex gap-2">
              <Button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedRequest && handleReject(selectedRequest.id)}
                disabled={processingAction === selectedRequest?.id}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingAction === selectedRequest?.id ? 'Rejecting…' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Div>
    </ScrollDiv>
  );
}
