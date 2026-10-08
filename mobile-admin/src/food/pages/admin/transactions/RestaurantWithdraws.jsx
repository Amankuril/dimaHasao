/* Ported from Frontend/src/modules/Food/pages/admin/transactions/RestaurantWithdraws.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Search, Download, ChevronDown, Eye, Settings, Building, FileSpreadsheet, Code, Columns, CheckCircle, XCircle, Loader2 } from 'lucide-react-native';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/shadcn';
import { exportTransactionsToExcel, exportTransactionsToPDF } from '../../../components/admin/transactions/transactionsExportUtils';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
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
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_DANGER,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, CheckBox, Div, HScroll, Img, Input, P, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import { alert, window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const COL_WIDTH = { si: 60, amount: 120, restaurant: 190, restaurantId: 130, requestTime: 170, status: 120, actions: 150 };
const COL_LABEL = {
  si: 'SI',
  amount: 'Amount',
  restaurant: 'Restaurant name',
  restaurantId: 'Restaurant ID',
  restaurantAddress: 'Address',
  requestTime: 'Request time',
  status: 'Status',
  actions: 'Action',
};
export default function RestaurantWithdraws() {
  const { tablet } = useLayoutWidth();
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_restaurant_withdraws_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [withdraws, setWithdraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedWithdraw, setSelectedWithdraw] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    amount: true,
    restaurant: true,
    restaurantId: true,
    restaurantAddress: false,
    requestTime: true,
    status: true,
    actions: true,
  });
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeTab]);
  useEffect(() => {
    fetchWithdrawals();
  }, [activeTab, debouncedSearch, currentPage, pageSize]);
  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const status = activeTab === 'All' ? undefined : activeTab;
      const response = await adminAPI.getWithdrawalRequests({
        status,
        search: debouncedSearch || undefined,
        page: currentPage,
        limit: pageSize,
      });
      if (response.data?.success) {
        setWithdraws(response.data.data?.requests || []);
        setTotalItems(response.data.data?.total ?? response.data?.total ?? (response.data.data?.requests || []).length);
      } else {
        debugError('Failed to fetch withdrawals:', response.data?.message);
        toast.error('Failed to fetch withdrawal requests');
        setWithdraws([]);
        setTotalItems(0);
      }
    } catch (error) {
      debugError('Error fetching withdrawals:', error);
      toast.error('Failed to fetch withdrawal requests');
      setWithdraws([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };
  const filteredWithdraws = withdraws;
  const handleViewWithdraw = (withdraw) => {
    setSelectedWithdraw(withdraw);
    setIsViewOpen(true);
  };
  const handleApprove = async (id) => {
    if (!(await window.confirmAsync('Are you sure you want to approve this withdrawal request?'))) {
      return;
    }
    try {
      setProcessingAction(id);
      const response = await adminAPI.approveWithdrawalRequest(id);
      if (response.data?.success) {
        toast.success('Withdrawal request approved successfully');
        fetchWithdrawals();
      } else {
        toast.error(response.data?.message || 'Failed to approve withdrawal request');
      }
    } catch (error) {
      debugError('Error approving withdrawal:', error);
      toast.error(error.response?.data?.message || 'Failed to approve withdrawal request');
    } finally {
      setProcessingAction(null);
    }
  };
  const handleReject = async (id) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    try {
      setProcessingAction(id);
      const response = await adminAPI.rejectWithdrawalRequest(id, rejectionReason);
      if (response.data?.success) {
        toast.success('Withdrawal request rejected successfully');
        setShowRejectModal(false);
        setRejectionReason('');
        fetchWithdrawals();
      } else {
        toast.error(response.data?.message || 'Failed to reject withdrawal request');
      }
    } catch (error) {
      debugError('Error rejecting withdrawal:', error);
      toast.error(error.response?.data?.message || 'Failed to reject withdrawal request');
    } finally {
      setProcessingAction(null);
    }
  };
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return dateString;
    }
  };
  const formatCurrency = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };
  const getSafeQrUrl = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && typeof value.url === 'string') return value.url;
    return '';
  };
  const handleExport = async (format) => {
    if (filteredWithdraws.length === 0) {
      toast.error('No data to export.');
      return;
    }
    const headers = [
      {
        key: 'sl',
        label: 'SI',
      },
      {
        key: 'amount',
        label: 'Amount',
      },
      {
        key: 'restaurantName',
        label: 'Restaurant Name',
      },
      {
        key: 'restaurantIdString',
        label: 'Restaurant ID',
      },
      {
        key: 'requestTime',
        label: 'Request Time',
      },
      {
        key: 'processedTime',
        label: 'Approved/Rejected Time',
      },
      {
        key: 'processedBy',
        label: 'Processed By',
      },
      {
        key: 'status',
        label: 'Status',
      },
      {
        key: 'rejectionReason',
        label: 'Rejection Reason',
      },
    ];
    const exportData = filteredWithdraws.map((w, index) => ({
      sl: index + 1,
      amount: formatCurrency(w.amount),
      restaurantName: w.restaurantName || 'N/A',
      restaurantIdString: w.restaurantIdString || 'N/A',
      requestTime: formatDate(w.requestedAt || w.createdAt),
      processedTime: w.processedAt ? formatDate(w.processedAt) : '',
      processedBy: w.processedBy?.name ? `${w.processedBy.name}${w.processedBy.email ? ` (${w.processedBy.email})` : ''}` : '',
      status: w.status,
      rejectionReason: w.rejectionReason || '',
    }));
    switch (format) {
      case 'excel':
        exportTransactionsToExcel(exportData, headers, 'restaurant_withdraws_full_details');
        break;
      case 'pdf':
        await exportTransactionsToPDF(exportData, headers, 'restaurant_withdraws_full_details', 'Restaurant Withdraws Report');
        break;
      default:
        break;
    }
  };
  const toggleColumn = (key) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      amount: true,
      restaurant: true,
      restaurantId: true,
      restaurantAddress: false,
      requestTime: true,
      status: true,
      actions: true,
    });
  };
  const shownKeys = Object.keys(COL_WIDTH).filter((key) => visibleColumns[key]);
  const cols = shownKeys.map((key) => COL_WIDTH[key]);
  const labels = shownKeys.map((key) => COL_LABEL[key]);
  const bankValue = (withdraw, field) => withdraw.restaurantBankDetails?.[field] || withdraw.restaurantId?.[field] || 'N/A';
  const renderCell = (withdraw, index, key) => {
    if (key === 'si') return String(index + 1);
    if (key === 'amount')
      return (
        <Span className="text-sm font-medium text-slate-900" numberOfLines={1}>
          {formatCurrency(withdraw.amount)}
        </Span>
      );
    if (key === 'restaurant') return withdraw.restaurantName || 'N/A';
    if (key === 'restaurantId') return withdraw.restaurantIdString || 'N/A';
    if (key === 'requestTime') return formatDate(withdraw.requestedAt || withdraw.createdAt);
    if (key === 'status') return <StatusBadge status={withdraw.status} label={withdraw.status} />;
    return (
      <Div className="flex-row items-center gap-1">
        <Button onClick={() => handleViewWithdraw(withdraw)} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="View withdrawal">
          <UiIcon as={Eye} size={16} className="text-blue-600" />
        </Button>
        {withdraw.status === 'Pending' && (
          <>
            <Button
              onClick={() => handleApprove(withdraw.id)}
              disabled={processingAction === withdraw.id}
              className="w-11 h-11 rounded-lg items-center justify-center"
              accessibilityLabel="Approve withdrawal"
            >
              {processingAction === withdraw.id ? (
                <UiIcon as={Loader2} size={16} className="text-green-700" />
              ) : (
                <UiIcon as={CheckCircle} size={16} className="text-green-700" />
              )}
            </Button>
            <Button
              onClick={() => {
                setSelectedWithdraw(withdraw);
                setShowRejectModal(true);
              }}
              disabled={processingAction === withdraw.id}
              className="w-11 h-11 rounded-lg items-center justify-center"
              accessibilityLabel="Reject withdrawal"
            >
              <UiIcon as={XCircle} size={16} className="text-red-600" />
            </Button>
          </>
        )}
      </Div>
    );
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Building}
        title="Restaurant Withdraws"
        subtitle="Payout requests from restaurant partners"
        breadcrumb={[{ label: 'Food' }, { label: 'Transactions' }, { label: 'Restaurant withdraws' }]}
      />

      <Card className="mb-4" padded={false}>
        <HScroll contentClassName="flex-row items-center gap-1 px-2">
          {['All', 'Pending', 'Approved', 'Rejected'].map((tab) => (
            <Button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 h-12 justify-center border-b-2 ${activeTab === tab ? 'border-blue-600' : 'border-transparent'}`}>
              <Span className={`text-sm font-semibold ${activeTab === tab ? 'text-blue-600' : 'text-slate-600'}`}>{tab}</Span>
            </Button>
          ))}
        </HScroll>
      </Card>

      <Card className="mb-3">
        <SectionTitle action={loading ? null : <Span className="text-xs font-semibold text-slate-500">{totalItems} total</Span>}>Withdraw requests</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input type="text" placeholder="Ex: search by restaurant name" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`${INPUT} flex-1`} />
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
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <UiIcon as={FileSpreadsheet} size={16} className="mr-2" /> Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <UiIcon as={Code} size={16} className="mr-2" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setIsSettingsOpen(true)} className={BTN_SECONDARY} accessibilityLabel="Table settings">
            <UiIcon as={Settings} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Columns</Span>
          </Button>
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : filteredWithdraws.length === 0 ? (
        <EmptyState icon={Building} title="No withdraw requests" message="No withdraw requests match your filters." actionLabel="Reload" onAction={fetchWithdrawals} />
      ) : cols.length === 0 ? (
        <EmptyState icon={Columns} title="Every column is hidden" message="Turn a column back on to see the requests." actionLabel="Reset columns" onAction={resetColumns} />
      ) : (
        <>
          <DataTable cols={cols}>
            <THead cols={cols} labels={labels} />
            <TBody>
              {filteredWithdraws.map((withdraw, index, arr) => (
                <Row key={withdraw.id} last={index === arr.length - 1}>
                  {shownKeys.map((key, ci) => (
                    <Cell key={key} width={cols[ci]} align={key === 'amount' ? 'right' : key === 'actions' ? 'center' : 'left'}>
                      {renderCell(withdraw, index, key)}
                    </Cell>
                  ))}
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
                localStorage.setItem('admin_restaurant_withdraws_pageSize', String(size));
              } catch {}
              setCurrentPage(1);
            }}
            itemLabel="withdrawals"
            className="mt-3 rounded-xl border border-slate-200"
          />
        </>
      )}

      {/* View Withdraw Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle className="text-base font-semibold text-slate-900">Withdraw Request Details</DialogTitle>
          </DialogHeader>
          {selectedWithdraw && (
            <Div className="px-4 py-4 gap-3">
              <Div className={tablet ? 'grid grid-cols-2 gap-3' : 'gap-3'}>
                <Div className="gap-0.5">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</Span>
                  <P className="text-sm font-semibold text-slate-900">{formatCurrency(selectedWithdraw.amount)}</P>
                </Div>
                <Div className="gap-0.5">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Restaurant name</Span>
                  <P className="text-sm font-semibold text-slate-900">{selectedWithdraw.restaurantName || 'N/A'}</P>
                </Div>
                <Div className="gap-0.5">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Restaurant ID</Span>
                  <P className="text-sm font-semibold text-slate-900">{selectedWithdraw.restaurantIdString || 'N/A'}</P>
                </Div>
                <Div className="gap-0.5">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Request time</Span>
                  <P className="text-sm font-semibold text-slate-900">{formatDate(selectedWithdraw.requestedAt || selectedWithdraw.createdAt)}</P>
                </Div>
                {(selectedWithdraw.status === 'Approved' || selectedWithdraw.status === 'Processed') && selectedWithdraw.processedAt && (
                  <Div className="gap-0.5">
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approved time</Span>
                    <P className="text-sm font-semibold text-slate-900">{formatDate(selectedWithdraw.processedAt)}</P>
                  </Div>
                )}
                {selectedWithdraw.status === 'Rejected' && selectedWithdraw.processedAt && (
                  <Div className="gap-0.5">
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rejected time</Span>
                    <P className="text-sm font-semibold text-slate-900">{formatDate(selectedWithdraw.processedAt)}</P>
                  </Div>
                )}
                <Div className="gap-1">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</Span>
                  <StatusBadge status={selectedWithdraw.status} label={selectedWithdraw.status} />
                </Div>
              </Div>

              <Card className="gap-2">
                <SectionTitle className="mb-0">Bank details</SectionTitle>
                <Div className="gap-1.5">
                  <P className="text-sm text-slate-700">Account holder: {bankValue(selectedWithdraw, 'accountHolderName')}</P>
                  <P className="text-sm text-slate-700">Account number: {bankValue(selectedWithdraw, 'accountNumber')}</P>
                  <P className="text-sm text-slate-700">IFSC: {bankValue(selectedWithdraw, 'ifscCode')}</P>
                  <P className="text-sm text-slate-700">Account type: {bankValue(selectedWithdraw, 'accountType')}</P>
                  <P className="text-sm text-slate-700">UPI ID: {bankValue(selectedWithdraw, 'upiId')}</P>
                  {getSafeQrUrl(selectedWithdraw.restaurantBankDetails?.upiQrImage || selectedWithdraw.restaurantId?.upiQrImage) ? (
                    <Div className="gap-1.5">
                      <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">UPI QR</Span>
                      <Img
                        src={getSafeQrUrl(selectedWithdraw.restaurantBankDetails?.upiQrImage || selectedWithdraw.restaurantId?.upiQrImage)}
                        alt="Restaurant UPI QR"
                        className="w-32 h-32 object-contain border border-slate-200 rounded-lg bg-white"
                      />
                    </Div>
                  ) : null}
                </Div>
              </Card>

              {selectedWithdraw.rejectionReason && (
                <Div className="gap-0.5">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rejection reason</Span>
                  <P className="text-sm font-semibold text-slate-900">{selectedWithdraw.rejectionReason}</P>
                </Div>
              )}
            </Div>
          )}
          <DialogFooter className="px-4 pb-4">
            <Button onClick={() => setIsViewOpen(false)} className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>Close</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle className="text-base font-semibold text-slate-900">Reject Withdrawal Request</DialogTitle>
          </DialogHeader>
          <Div className="px-4 py-4">
            <Field label="Rejection reason" required hint="The partner sees this reason">
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection…"
                rows={4}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </Field>
          </Div>
          <DialogFooter className="px-4 pb-4 flex-row flex-wrap items-center justify-end gap-2">
            <Button
              onClick={() => {
                setShowRejectModal(false);
                setRejectionReason('');
              }}
              className={BTN_SECONDARY}
            >
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button
              onClick={() => selectedWithdraw && handleReject(selectedWithdraw.id)}
              disabled={!rejectionReason.trim() || processingAction === selectedWithdraw?.id}
              className={BTN_DANGER}
            >
              <Span className={BTN_TEXT_PRIMARY}>{processingAction === selectedWithdraw?.id ? 'Rejecting…' : 'Reject'}</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle className="text-base font-semibold text-slate-900">Table Settings</DialogTitle>
          </DialogHeader>
          <Div className="px-4 py-4 gap-2">
            <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible columns</Span>
            {Object.entries(visibleColumns).map(([key, isVisible]) => (
              <Div key={key} className="flex-row items-center gap-3 h-11" onClick={() => toggleColumn(key)}>
                <CheckBox checked={isVisible} onChange={() => toggleColumn(key)} className="w-5 h-5" />
                <Span className="text-sm text-slate-700 flex-1">{COL_LABEL[key] || key}</Span>
              </Div>
            ))}
          </Div>
          <DialogFooter className="px-4 pb-4 flex-row flex-wrap items-center justify-end gap-2">
            <Button onClick={resetColumns} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Reset columns</Span>
            </Button>
            <Button onClick={() => setIsSettingsOpen(false)} className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>Apply</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
