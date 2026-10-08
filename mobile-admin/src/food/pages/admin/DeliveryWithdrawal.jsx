/* Ported from Frontend/src/modules/Food/pages/admin/DeliveryWithdrawal.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Search, Wallet, Eye, CheckCircle, XCircle, Loader2, Package, QrCode } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import AdminListPagination from '../../components/admin/AdminListPagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/shadcn';
import { AdminPage, PageHeader, Card, SectionTitle, Toolbar, DataTable, THead, TBody, Row, Cell, StatusBadge, TableSkeleton, EmptyState, Field, INPUT, BTN_SECONDARY, BTN_DANGER, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../../../admin/ui';
import { Button, Div, Input, Span, Textarea, Icon as UiIcon } from '../../../components/web';
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
const COLS = [48, 120, 180, 130, 160, 120, 150];
const DETAIL_ROW = 'flex-row items-start justify-between gap-3 py-2';
const DETAIL_LABEL = 'text-xs font-semibold uppercase tracking-wide text-slate-500 shrink-0';
const DETAIL_VALUE = 'text-sm font-semibold text-slate-900 flex-1 text-right';
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
  const detail = (label, value) => (
    <Div key={label} className={DETAIL_ROW}>
      <Span className={DETAIL_LABEL}>{label}</Span>
      <Span className={DETAIL_VALUE}>{value}</Span>
    </Div>
  );
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Wallet}
        title="Delivery withdrawal"
        subtitle="Delivery partner withdrawal requests. Pending requests can be approved or rejected."
        breadcrumb={[{ label: 'Food' }, { label: 'Delivery' }, { label: 'Withdrawals' }]}
      />

      <Card className="mb-3">
        <Toolbar className="mb-0">
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`h-11 px-4 rounded-lg border items-center justify-center ${activeTab === tab.key ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
            >
              <Span className={`text-sm font-semibold ${activeTab === tab.key ? 'text-white' : 'text-slate-700'}`}>{tab.label}</Span>
            </Button>
          ))}
        </Toolbar>
      </Card>

      <Card className="mb-3">
        <SectionTitle>{`Withdrawal requests · ${totalItems}`}</SectionTitle>
        <Div className="flex-row items-center gap-2">
          <UiIcon as={Search} size={16} className="text-slate-400" />
          <Input
            type="text"
            placeholder="Search by delivery name, ID, phone"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT} flex-1`}
          />
        </Div>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : filteredRequests.length === 0 ? (
        <EmptyState icon={Package} title="No requests" message={`No ${activeTab.toLowerCase()} withdrawal requests.`} actionLabel="Refresh" onAction={() => fetchRequests()} />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['#', 'Amount', 'Delivery boy', 'ID', 'Request time', 'Status', 'Action']} />
          <TBody>
            {filteredRequests.map((req, index) => (
              <Row key={req.id} last={index === filteredRequests.length - 1}>
                <Cell width={COLS[0]}>{String(index + 1)}</Cell>
                <Cell width={COLS[1]} align="right">
                  <Span className="text-sm font-semibold text-slate-900">{formatCurrency(req.amount)}</Span>
                </Cell>
                <Cell width={COLS[2]}>
                  <Span className="text-sm font-semibold text-slate-900">{req.deliveryName || 'N/A'}</Span>
                </Cell>
                <Cell width={COLS[3]}>{req.deliveryIdString || 'N/A'}</Cell>
                <Cell width={COLS[4]}>{formatDate(req.requestedAt || req.createdAt)}</Cell>
                <Cell width={COLS[5]}>
                  <StatusBadge status={req.status} label={req.status} />
                </Cell>
                <Cell width={COLS[6]}>
                  <Div className="flex-row items-center gap-1">
                    <Button
                      onClick={() => handleView(req)}
                      accessibilityLabel="View request details"
                      className="w-11 h-11 rounded-lg border border-slate-200 bg-white items-center justify-center"
                    >
                      <UiIcon as={Eye} size={16} className="text-slate-600" />
                    </Button>
                    {req.status === 'Pending' ? (
                      <>
                        <Button
                          onClick={() => handleApprove(req.id)}
                          disabled={processingAction === req.id}
                          accessibilityLabel="Approve request"
                          className="w-11 h-11 rounded-lg border border-slate-200 bg-white items-center justify-center"
                        >
                          <UiIcon as={processingAction === req.id ? Loader2 : CheckCircle} size={16} className="text-green-700" />
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedRequest(req);
                            setShowRejectModal(true);
                          }}
                          disabled={processingAction === req.id}
                          accessibilityLabel="Reject request"
                          className="w-11 h-11 rounded-lg border border-slate-200 bg-white items-center justify-center"
                        >
                          <UiIcon as={XCircle} size={16} className="text-red-600" />
                        </Button>
                      </>
                    ) : null}
                  </Div>
                </Cell>
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
            localStorage.setItem('admin_delivery_withdraws_pageSize', String(size));
          } catch {}
          setCurrentPage(1);
        }}
        itemLabel="withdrawals"
      />

      {/* View details dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle className="text-base font-semibold text-slate-900">Withdrawal request details</DialogTitle>
          </DialogHeader>
          {selectedRequest ? (
            <Div className="px-4 py-3">
              {detail('Amount', formatCurrency(selectedRequest.amount))}
              {detail('Delivery boy', selectedRequest.deliveryName || 'N/A')}
              {detail('Delivery ID', selectedRequest.deliveryIdString || 'N/A')}
              {detail('Phone', selectedRequest.deliveryPhone || 'N/A')}
              {selectedRequest.upiId ? (
                <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3 my-2 gap-2">
                  <Div className="flex-row items-center gap-2">
                    <UiIcon as={QrCode} size={14} className="text-slate-500" />
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">UPI information</Span>
                  </Div>
                  <Div className="flex-row items-center justify-between gap-2">
                    <Span className="text-sm font-semibold text-slate-900 flex-1">{selectedRequest.upiId}</Span>
                    {selectedRequest.upiQrCode ? (
                      <Button onClick={() => window.open(selectedRequest.upiQrCode, '_blank')} className={BTN_SECONDARY}>
                        <UiIcon as={Eye} size={14} className="text-slate-600" />
                        <Span className={BTN_TEXT_SECONDARY}>View QR</Span>
                      </Button>
                    ) : null}
                  </Div>
                </Div>
              ) : null}
              {detail('Bank name', selectedRequest.bankDetails?.bankName || 'N/A')}
              {detail('Account number', selectedRequest.bankDetails?.accountNumber || 'N/A')}
              {detail('IFSC code', selectedRequest.bankDetails?.ifscCode || 'N/A')}
              {detail('Holder name', selectedRequest.bankDetails?.accountHolderName || 'N/A')}
              {detail('Request time', formatDate(selectedRequest.requestedAt || selectedRequest.createdAt))}
              {(selectedRequest.status === 'Approved' || selectedRequest.status === 'Processed') && selectedRequest.processedAt
                ? detail('Processed at', formatDate(selectedRequest.processedAt))
                : null}
              {selectedRequest.status === 'Rejected' && selectedRequest.processedAt ? detail('Rejected at', formatDate(selectedRequest.processedAt)) : null}
              <Div className={DETAIL_ROW}>
                <Span className={DETAIL_LABEL}>Status</Span>
                <StatusBadge status={selectedRequest.status} label={selectedRequest.status} />
              </Div>
              {selectedRequest.rejectionReason ? detail('Rejection reason', selectedRequest.rejectionReason) : null}
            </Div>
          ) : null}
          <DialogFooter className="px-4 py-3 border-t border-slate-200">
            <Button onClick={() => setIsViewOpen(false)} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Close</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle className="text-base font-semibold text-slate-900">Reject withdrawal request</DialogTitle>
          </DialogHeader>
          <Div className="px-4 py-4">
            <Field label="Rejection reason" hint="Optional — the partner sees this">
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection…"
                rows={4}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </Field>
          </Div>
          <DialogFooter className="px-4 py-3 border-t border-slate-200 gap-2 flex-row">
            <Button
              onClick={() => {
                setShowRejectModal(false);
                setRejectionReason('');
                setSelectedRequest(null);
              }}
              className={`${BTN_SECONDARY} flex-1`}
            >
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button onClick={() => selectedRequest && handleReject(selectedRequest.id)} disabled={processingAction === selectedRequest?.id} className={`${BTN_DANGER} flex-1`}>
              <Span className={BTN_TEXT_PRIMARY}>{processingAction === selectedRequest?.id ? 'Rejecting…' : 'Reject'}</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
