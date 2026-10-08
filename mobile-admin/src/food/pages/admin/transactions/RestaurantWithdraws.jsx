/* Ported from Frontend/src/modules/Food/pages/admin/transactions/RestaurantWithdraws.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import {
  Search,
  Download,
  ChevronDown,
  Eye,
  Settings,
  Building,
  ArrowUpDown,
  FileText,
  FileSpreadsheet,
  Code,
  Check,
  Columns,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react-native';
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
import { alert, window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function RestaurantWithdraws() {
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
  const getStatusBadge = (status) => {
    if (status === 'Approved') {
      return 'bg-green-100 text-green-700';
    }
    if (status === 'Pending') {
      return 'bg-blue-100 text-blue-700';
    }
    if (status === 'Rejected') {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-slate-100 text-slate-700';
  };
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
    if (!amount) return '\u20B90.00';
    return `\u20B9${parseFloat(amount).toLocaleString('en-IN', {
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
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3">
            <UiIcon as={Building} className="w-5 h-5 text-blue-600" />
            <H1 className="text-2xl font-bold text-slate-900">Restaurant Withdraw Transaction</H1>
          </Div>
        </Div>

        {/* Tabs */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex gap-2 border-b border-slate-200">
            {['All', 'Pending', 'Approved', 'Rejected'].map((tab) => (
              <Button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
              >
                {tab}
              </Button>
            ))}
          </Div>
        </Div>

        {/* Table Card */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="flex items-center gap-2">
              <H2 className="text-xl font-bold text-slate-900">Withdraw Request Table</H2>
              <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 flex items-center justify-center min-w-[2.5rem] h-7">
                {loading ? <Span className="w-5 h-3 rounded bg-slate-300/80 animate-pulse" /> : totalItems}
              </Span>
            </Div>

            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <Input
                  type="text"
                  placeholder="Ex: search by Restaurant name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                />
                <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </Div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all">
                    <UiIcon as={Download} className="w-4 h-4" />
                    <Span>Export</Span>
                    <UiIcon as={ChevronDown} className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                  <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('excel')} className="cursor-pointer flex items-center gap-2">
                    <UiIcon as={FileSpreadsheet} className="w-4 h-4" /> Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer flex items-center gap-2">
                    <UiIcon as={Code} className="w-4 h-4" /> PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center justify-center"
              >
                <UiIcon as={Settings} className="w-4 h-4" />
              </Button>
            </Div>
          </Div>

          {/* Table */}
          {loading ? (
            <Div className="py-20 text-center">
              <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <P className="text-slate-600">Loading withdrawal requests...</P>
            </Div>
          ) : (
            <Table
              className="w-full"
              cols={[
                visibleColumns.si && 70,
                visibleColumns.amount && 120,
                visibleColumns.restaurant && 200,
                visibleColumns.restaurantId && 130,
                visibleColumns.requestTime && 170,
                visibleColumns.status && 130,
                visibleColumns.actions && 120,
              ].filter(Boolean)}
            >
                <Thead className="bg-slate-50 border-b border-slate-200">
                  <Tr>
                    {visibleColumns.si && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>SI</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.amount && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Amount</Th>}
                    {visibleColumns.restaurant && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Restaurant Name</Th>
                    )}
                    {visibleColumns.restaurantId && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Restaurant ID</Th>
                    )}
                    {visibleColumns.requestTime && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Request Time</Th>
                    )}
                    {visibleColumns.status && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Status</Th>}
                    {visibleColumns.actions && <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>}
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {filteredWithdraws.length === 0 ? (
                    <Tr>
                      <Td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-20 text-center">
                        <Div className="flex flex-col items-center justify-center">
                          <UiIcon as={Building} className="w-16 h-16 text-slate-400 mb-4" />
                          <P className="text-lg font-semibold text-slate-700">No Data Found</P>
                          <P className="text-sm text-slate-500">No withdraw requests match your filters.</P>
                        </Div>
                      </Td>
                    </Tr>
                  ) : (
                    filteredWithdraws.map((withdraw, index) => (
                      <Tr key={withdraw.id} className="hover:bg-slate-50 transition-colors">
                        {visibleColumns.si && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm font-medium text-slate-700">{index + 1}</Span>
                          </Td>
                        )}
                        {visibleColumns.amount && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm font-medium text-slate-700">{formatCurrency(withdraw.amount)}</Span>
                          </Td>
                        )}
                        {visibleColumns.restaurant && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm font-medium text-slate-700">{withdraw.restaurantName || 'N/A'}</Span>
                          </Td>
                        )}
                        {visibleColumns.restaurantId && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm font-medium text-slate-700">{withdraw.restaurantIdString || 'N/A'}</Span>
                          </Td>
                        )}
                        {visibleColumns.requestTime && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm font-medium text-slate-700">{formatDate(withdraw.requestedAt || withdraw.createdAt)}</Span>
                          </Td>
                        )}
                        {visibleColumns.status && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(withdraw.status)}`}>{withdraw.status}</Span>
                          </Td>
                        )}
                        {visibleColumns.actions && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Div className="flex items-center justify-center gap-2">
                              <Button
                                onClick={() => handleViewWithdraw(withdraw)}
                                className="p-2 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors"
                              >
                                <UiIcon as={Eye} className="w-4 h-4 text-orange-600" />
                              </Button>
                              {withdraw.status === 'Pending' && (
                                <>
                                  <Button
                                    onClick={() => handleApprove(withdraw.id)}
                                    disabled={processingAction === withdraw.id}
                                    className="p-2 rounded-lg bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {processingAction === withdraw.id ? (
                                      <UiIcon as={Loader2} className="w-4 h-4 text-green-600 animate-spin" />
                                    ) : (
                                      <UiIcon as={CheckCircle} className="w-4 h-4 text-green-600" />
                                    )}
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setSelectedWithdraw(withdraw);
                                      setShowRejectModal(true);
                                    }}
                                    disabled={processingAction === withdraw.id}
                                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <UiIcon as={XCircle} className="w-4 h-4 text-red-600" />
                                  </Button>
                                </>
                              )}
                            </Div>
                          </Td>
                        )}
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
                localStorage.setItem('admin_restaurant_withdraws_pageSize', String(size));
              } catch {}
              setCurrentPage(1);
            }}
            itemLabel="withdrawals"
          />
        </Div>

        {/* View Withdraw Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-md bg-white p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Withdraw Request Details</DialogTitle>
            </DialogHeader>
            {selectedWithdraw && (
              <Div className="px-6 pb-6 space-y-4">
                <Div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Amount</Label>
                  <P className="text-sm font-medium text-slate-900 mt-1">{formatCurrency(selectedWithdraw.amount)}</P>
                </Div>
                <Div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Restaurant Name</Label>
                  <P className="text-sm font-medium text-slate-900 mt-1">{selectedWithdraw.restaurantName || 'N/A'}</P>
                </Div>
                <Div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Restaurant ID</Label>
                  <P className="text-sm font-medium text-slate-900 mt-1">{selectedWithdraw.restaurantIdString || 'N/A'}</P>
                </Div>
                <Div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Request Time</Label>
                  <P className="text-sm font-medium text-slate-900 mt-1">{formatDate(selectedWithdraw.requestedAt || selectedWithdraw.createdAt)}</P>
                </Div>
                {(selectedWithdraw.status === 'Approved' || selectedWithdraw.status === 'Processed') && selectedWithdraw.processedAt && (
                  <Div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase">Approved Time</Label>
                    <P className="text-sm font-medium text-slate-900 mt-1">{formatDate(selectedWithdraw.processedAt)}</P>
                  </Div>
                )}
                {selectedWithdraw.status === 'Rejected' && selectedWithdraw.processedAt && (
                  <Div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase">Rejected Time</Label>
                    <P className="text-sm font-medium text-slate-900 mt-1">{formatDate(selectedWithdraw.processedAt)}</P>
                  </Div>
                )}
                <Div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Status</Label>
                  <P className="mt-1">
                    <Span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selectedWithdraw.status)}`}>{selectedWithdraw.status}</Span>
                  </P>
                </Div>
                <Div className="border-t border-slate-200 pt-4">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Bank Details</Label>
                  <Div className="mt-2 space-y-2">
                    <P className="text-sm text-slate-800">
                      <Span className="font-semibold">Account Holder:</Span>{' '}
                      {selectedWithdraw.restaurantBankDetails?.accountHolderName || selectedWithdraw.restaurantId?.accountHolderName || 'N/A'}
                    </P>
                    <P className="text-sm text-slate-800">
                      <Span className="font-semibold">Account Number:</Span>{' '}
                      {selectedWithdraw.restaurantBankDetails?.accountNumber || selectedWithdraw.restaurantId?.accountNumber || 'N/A'}
                    </P>
                    <P className="text-sm text-slate-800">
                      <Span className="font-semibold">IFSC:</Span>{' '}
                      {selectedWithdraw.restaurantBankDetails?.ifscCode || selectedWithdraw.restaurantId?.ifscCode || 'N/A'}
                    </P>
                    <P className="text-sm text-slate-800">
                      <Span className="font-semibold">Account Type:</Span>{' '}
                      {selectedWithdraw.restaurantBankDetails?.accountType || selectedWithdraw.restaurantId?.accountType || 'N/A'}
                    </P>
                    <P className="text-sm text-slate-800">
                      <Span className="font-semibold">UPI ID:</Span>{' '}
                      {selectedWithdraw.restaurantBankDetails?.upiId || selectedWithdraw.restaurantId?.upiId || 'N/A'}
                    </P>
                    {getSafeQrUrl(selectedWithdraw.restaurantBankDetails?.upiQrImage || selectedWithdraw.restaurantId?.upiQrImage) ? (
                      <Div>
                        <P className="text-sm text-slate-800 font-semibold mb-2">UPI QR</P>
                        <Img
                          src={getSafeQrUrl(selectedWithdraw.restaurantBankDetails?.upiQrImage || selectedWithdraw.restaurantId?.upiQrImage)}
                          alt="Restaurant UPI QR"
                          className="w-32 h-32 object-contain border border-slate-200 rounded-md bg-white"
                        />
                      </Div>
                    ) : null}
                  </Div>
                </Div>
                {selectedWithdraw.rejectionReason && (
                  <Div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase">Rejection Reason</Label>
                    <P className="text-sm font-medium text-slate-900 mt-1">{selectedWithdraw.rejectionReason}</P>
                  </Div>
                )}
              </Div>
            )}
            <DialogFooter className="px-6 pb-6">
              <Button
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Modal */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent className="max-w-md bg-white p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Reject Withdrawal Request</DialogTitle>
            </DialogHeader>
            <Div className="px-6 pb-6 space-y-4">
              <Div>
                <Label className="block text-sm font-medium text-slate-700 mb-2">
                  Rejection Reason <Span className="text-red-500">*</Span>
                </Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </Div>
            </Div>
            <DialogFooter className="px-6 pb-6 flex gap-2">
              <Button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedWithdraw && handleReject(selectedWithdraw.id)}
                disabled={!rejectionReason.trim() || processingAction === selectedWithdraw?.id}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingAction === selectedWithdraw?.id ? 'Rejecting...' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="max-w-md bg-white p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle className="flex items-center gap-2">
                <UiIcon as={Settings} className="w-5 h-5" />
                Table Settings
              </DialogTitle>
            </DialogHeader>
            <Div className="px-6 pb-6 space-y-4">
              <Div>
                <H3 className="text-sm font-semibold text-slate-700 mb-2">Toggle Columns</H3>
                <Div className="grid grid-cols-2 gap-2">
                  {Object.entries(visibleColumns).map(([key, isVisible]) => (
                    <Div key={key} className="flex items-center">
                      <Input
                        type="checkbox"
                        nativeID={`toggle-${key}`}
                        checked={isVisible}
                        onChange={() => toggleColumn(key)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <Label className="ml-2 text-sm text-slate-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                    </Div>
                  ))}
                </Div>
              </Div>
            </Div>
            <DialogFooter className="px-6 pb-6 flex justify-between">
              <Button
                onClick={resetColumns}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Reset Columns
              </Button>
              <Button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md"
              >
                Apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Div>
    </ScrollDiv>
  );
}
