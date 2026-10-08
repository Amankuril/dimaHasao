/* Ported from Frontend/src/modules/Food/pages/admin/delivery-partners/EarningAddonHistory.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import {
  Search,
  Settings,
  ArrowUpDown,
  Download,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Code,
  Check,
  Columns,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  RefreshCw,
  User,
  Package,
  Wallet,
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
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import GradientFill from './GradientFill';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import { Button, Div, H1, H3, Input, Label, P, ScrollDiv, Span, Table, Tbody, Td, Textarea, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
import { window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function EarningAddonHistory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_earning_addon_history_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [creditNotes, setCreditNotes] = useState('');
  const [isCheckingCompletions, setIsCheckingCompletions] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    deliveryman: true,
    offerTitle: true,
    ordersCompleted: true,
    earningAmount: true,
    date: true,
    status: true,
    actions: true,
  });
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);
  useEffect(() => {
    fetchHistory();
  }, [currentPage, pageSize, debouncedSearch]);
  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getEarningAddonHistory({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
      });
      if (response.data.success) {
        const historyData = response.data.data.history || [];
        setHistory(historyData);
        setTotalItems(response.data.data.pagination?.total ?? historyData.length);
      } else {
        toast.error(response.data.message || 'Failed to fetch earning addon history');
        setHistory([]);
        setTotalItems(0);
      }
    } catch (error) {
      debugError('Error fetching earning addon history:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch earning addon history';
      toast.error(errorMessage);
      setHistory([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return dateString;
    }
  };
  const handleCredit = async () => {
    if (!selectedHistory) return;
    try {
      await adminAPI.creditEarningToWallet(selectedHistory._id, creditNotes);
      toast.success('Earning credited to wallet successfully');
      setIsCreditDialogOpen(false);
      setSelectedHistory(null);
      setCreditNotes('');
      fetchHistory();
    } catch (error) {
      debugError('Error crediting earning:', error);
      toast.error(error.response?.data?.message || 'Failed to credit earning');
    }
  };
  const handleCancel = async (id) => {
    if (!(await window.confirmAsync('Are you sure you want to cancel this earning?'))) {
      return;
    }
    try {
      await adminAPI.cancelEarningAddonHistory(id, 'Cancelled by admin');
      toast.success('Earning cancelled successfully');
      fetchHistory();
    } catch (error) {
      debugError('Error cancelling earning:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel earning');
    }
  };
  const handleOpenCreditDialog = (item) => {
    setSelectedHistory(item);
    setCreditNotes('');
    setIsCreditDialogOpen(true);
  };
  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };
  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      deliveryman: true,
      offerTitle: true,
      ordersCompleted: true,
      earningAmount: true,
      date: true,
      status: true,
      actions: true,
    });
  };
  const columnsConfig = {
    si: 'Serial Number',
    deliveryman: 'Deliveryman',
    offerTitle: 'Offer Title',
    ordersCompleted: 'Orders Completed',
    earningAmount: 'Earning Amount',
    date: 'Date',
    status: 'Status',
    actions: 'Actions',
  };
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        label: 'Pending',
        icon: Clock,
      },
      credited: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        label: 'Credited',
        icon: CheckCircle,
      },
      failed: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        label: 'Failed',
        icon: XCircle,
      },
      cancelled: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        label: 'Cancelled',
        icon: XCircle,
      },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} flex items-center gap-1`}>
        <UiIcon as={Icon} className="w-3 h-3" />
        {config.label}
      </Span>
    );
  };
  const handleExport = (format) => {
    if (history.length === 0) {
      toast.error('No data to export');
      return;
    }
    // Export functionality can be added here
    toast.info(`Export as ${format.toUpperCase()} - Feature coming soon`);
  };
  const handleCheckAllCompletions = async () => {
    try {
      setIsCheckingCompletions(true);
      debugLog('?? Checking completions for all delivery partners...');
      const res = await adminAPI.checkEarningAddonCompletions('all', true);
      if (res.data.success) {
        const found = res.data.data.completionsFound || 0;
        if (found > 0) {
          toast.success(`Check complete! Found ${found} new eligible completions.`);
          await fetchHistory();
        } else {
          toast.info('Check complete. No new eligible completions found.');
        }
      }
    } catch (error) {
      debugError('Error checking all completions:', error);
      toast.error('Failed to check completions');
    } finally {
      setIsCheckingCompletions(false);
    }
  };
  const COLUMN_WIDTHS = {
    si: 60,
    deliveryman: 180,
    offerTitle: 200,
    ordersCompleted: 160,
    earningAmount: 150,
    date: 150,
    status: 130,
    actions: 140,
  };
  const tableCols = Object.keys(COLUMN_WIDTHS)
    .filter((key) => visibleColumns[key])
    .map((key) => COLUMN_WIDTHS[key]);
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="flex items-center gap-2">
              <H1 className="text-2xl font-bold text-slate-900">Earning Addon History</H1>
              <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">{totalItems}</Span>
            </Div>

            <Div className="flex items-center gap-3">
              <Button
                onClick={handleCheckAllCompletions}
                disabled={isCheckingCompletions}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              >
                <UiIcon as={RefreshCw} className={`w-4 h-4 ${isCheckingCompletions ? 'animate-spin' : ''}`} />
                <Span>{isCheckingCompletions ? 'Checking...' : 'Check Completions'}</Span>
              </Button>
              <Div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <Input
                  type="text"
                  placeholder="Ex: search delivery man or offer"
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
                    <Span className="text-black font-bold">Export</Span>
                    <UiIcon as={ChevronDown} className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                  <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
                    <UiIcon as={FileText} className="w-4 h-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')} className="cursor-pointer">
                    <UiIcon as={FileSpreadsheet} className="w-4 h-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
                    <UiIcon as={FileText} className="w-4 h-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')} className="cursor-pointer">
                    <UiIcon as={Code} className="w-4 h-4 mr-2" />
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all"
              >
                <UiIcon as={Settings} className="w-5 h-5" />
              </Button>
            </Div>
          </Div>

          {/* Table */}
          {isLoading ? (
            <Div className="flex flex-col items-center justify-center py-12">
              <Div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4"></Div>
              <Div className="text-slate-500">Loading earning addon history...</Div>
            </Div>
          ) : (
            <Div>
              <Table className="w-full" cols={tableCols}>
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
                    {visibleColumns.deliveryman && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Deliveryman</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.offerTitle && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Offer Title</Span>
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.ordersCompleted && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Orders</Span>
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.earningAmount && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Earning Amount</Span>
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.date && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Date</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.status && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Status</Span>
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.actions && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Actions</Th>}
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {history.length === 0 ? (
                    <Tr>
                      <Td colSpan={Object.values(visibleColumns).filter((v) => v).length} className="px-6 py-12 text-center">
                        <Div className="flex flex-col items-center gap-2">
                          <UiIcon as={FileText} className="w-10 h-10 text-slate-300 mb-1" />
                          <P className="text-slate-500 font-medium">No earning addon history found</P>
                          <P className="text-sm text-slate-400 mt-1">
                            {searchQuery ? 'Try adjusting your search query' : 'History will appear when delivery boys complete earning addon offers'}
                          </P>
                        </Div>
                      </Td>
                    </Tr>
                  ) : (
                    history.map((item, index) => (
                      <Tr key={item._id} className="hover:bg-slate-50 transition-colors">
                        {visibleColumns.si && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm font-medium text-slate-700">{(currentPage - 1) * pageSize + index + 1}</Span>
                          </Td>
                        )}
                        {visibleColumns.deliveryman && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Div className="flex flex-col">
                              <Span className="text-sm font-medium text-blue-600">{item.deliveryman || 'Unknown'}</Span>
                              {item.deliveryId && <Span className="text-xs text-slate-500 mt-0.5">ID: {item.deliveryId}</Span>}
                              {item.deliveryPhone && item.deliveryPhone !== 'N/A' && (
                                <Span className="text-xs text-slate-400 mt-0.5">{item.deliveryPhone}</Span>
                              )}
                            </Div>
                          </Td>
                        )}
                        {visibleColumns.offerTitle && (
                          <Td className="px-6 py-4">
                            <Span className="text-sm text-slate-700">{item.offerTitle}</Span>
                          </Td>
                        )}
                        {visibleColumns.ordersCompleted && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Div className="flex flex-col">
                              <Span className="text-sm font-medium text-slate-900">
                                {item.ordersCompleted || 0} / {item.ordersRequired || 0}
                              </Span>
                              {item.ordersRequired > 0 && (
                                <Span className="text-xs text-slate-500 mt-0.5">
                                  {Math.round(((item.ordersCompleted || 0) / item.ordersRequired) * 100)}% Complete
                                </Span>
                              )}
                            </Div>
                          </Td>
                        )}
                        {visibleColumns.earningAmount && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Div className="flex items-center gap-1">
                              <UiIcon as={DollarSign} className="w-4 h-4 text-emerald-500" />
                              <Span className="text-sm font-medium text-slate-900">
                                {'\u20B9'}
                                {item.totalEarning?.toFixed(2) || item.earningAmount?.toFixed(2) || '0.00'}
                              </Span>
                            </Div>
                          </Td>
                        )}
                        {visibleColumns.date && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Div className="flex flex-col">
                              <Span className="text-sm text-slate-700">{formatDate(item.date || item.completedAt)}</Span>
                              {item.completedAt && (
                                <Span className="text-xs text-slate-400 mt-0.5">
                                  {new Date(item.completedAt).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </Span>
                              )}
                            </Div>
                          </Td>
                        )}
                        {visibleColumns.status && <Td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</Td>}
                        {visibleColumns.actions && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Div className="flex items-center gap-2">
                              {item.status === 'pending' && (
                                <Button
                                  onClick={() => handleOpenCreditDialog(item)}
                                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                                >
                                  Credit
                                </Button>
                              )}
                              {item.status === 'pending' && (
                                <Button onClick={() => handleCancel(item._id)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                                  <UiIcon as={XCircle} className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </Div>
                          </Td>
                        )}
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Div>
          )}

          <AdminListPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              try {
                localStorage.setItem('admin_earning_addon_history_pageSize', String(size));
              } catch {
                /* ignore */
              }
            }}
            itemLabel="records"
          />
        </Div>
      </Div>

      {/* Credit Dialog */}
      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent className="max-w-lg bg-gradient-to-br from-white via-slate-50 to-white p-0 border-0 shadow-2xl">
          {/* Header with gradient */}
          <Div className="px-6 py-5 rounded-t-lg overflow-hidden">
            <GradientFill colors={['#10B981', '#059669']} />
            <DialogHeader className="mb-0">
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <UiIcon as={Wallet} className="w-5 h-5" />
                Credit Earning to Wallet
              </DialogTitle>
            </DialogHeader>
          </Div>

          {selectedHistory && (
            <Div className="px-6 py-6 space-y-6">
              {/* Information Cards */}
              <Div className="space-y-3">
                {/* Deliveryman Info */}
                <Div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <Div className="p-2 bg-blue-100 rounded-lg">
                    <UiIcon as={User} className="w-5 h-5 text-blue-600" />
                  </Div>
                  <Div className="flex-1 min-w-0">
                    <P className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Deliveryman</P>
                    <P className="text-sm font-semibold text-slate-900 truncate">{selectedHistory.deliveryman || 'N/A'}</P>
                    {selectedHistory.deliveryId && <P className="text-xs text-slate-500 mt-0.5">ID: {selectedHistory.deliveryId}</P>}
                  </Div>
                </Div>

                {/* Offer Info */}
                <Div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <Div className="p-2 bg-purple-100 rounded-lg">
                    <UiIcon as={Package} className="w-5 h-5 text-purple-600" />
                  </Div>
                  <Div className="flex-1 min-w-0">
                    <P className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Offer</P>
                    <P className="text-sm font-semibold text-slate-900">{selectedHistory.offerTitle || 'N/A'}</P>
                    {selectedHistory.ordersCompleted && selectedHistory.ordersRequired && (
                      <P className="text-xs text-slate-500 mt-0.5">
                        {selectedHistory.ordersCompleted} / {selectedHistory.ordersRequired} orders completed
                      </P>
                    )}
                  </Div>
                </Div>

                {/* Amount Info - Highlighted */}
                <Div className="flex items-center gap-3 p-4 rounded-xl border-2 border-emerald-200 overflow-hidden">
                  <GradientFill colors={['#ECFDF5', '#F0FDF4']} />
                  <Div className="p-2 bg-emerald-100 rounded-lg">
                    <UiIcon as={DollarSign} className="w-5 h-5 text-emerald-600" />
                  </Div>
                  <Div className="flex-1">
                    <P className="text-xs font-medium text-emerald-700 uppercase tracking-wide mb-1">Amount to Credit</P>
                    <P className="text-2xl font-bold text-emerald-600">
                      {'\u20B9'}
                      {selectedHistory.totalEarning?.toFixed(2) || selectedHistory.earningAmount?.toFixed(2) || '0.00'}
                    </P>
                  </Div>
                </Div>
              </Div>

              {/* Notes Section */}
              <Div className="space-y-2">
                <Label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <UiIcon as={FileText} className="w-4 h-4 text-slate-500" />
                  Notes <Span className="text-xs font-normal text-slate-400">(Optional)</Span>
                </Label>
                <Textarea
                  value={creditNotes}
                  onChange={(e) => setCreditNotes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none text-sm text-slate-700 placeholder:text-slate-400"
                  rows={4}
                  placeholder="Add any notes about this credit transaction..."
                />
                <P className="text-xs text-slate-400">This note will be saved with the transaction record.</P>
              </Div>

              {/* Action Buttons */}
              <DialogFooter className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  onClick={() => {
                    setIsCreditDialogOpen(false);
                    setSelectedHistory(null);
                    setCreditNotes('');
                  }}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCredit}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl text-white shadow-lg transition-all flex items-center gap-2 overflow-hidden"
                >
                  <GradientFill colors={['#10B981', '#059669']} />
                  <UiIcon as={Wallet} className="w-4 h-4" />
                  Credit to Wallet
                </Button>
              </DialogFooter>
            </Div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UiIcon as={Settings} className="w-5 h-5" />
              Table Settings
            </DialogTitle>
          </DialogHeader>
          <Div className="space-y-4">
            <Div>
              <H3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <UiIcon as={Columns} className="w-4 h-4" />
                Visible Columns
              </H3>
              <Div className="space-y-2">
                {Object.entries(columnsConfig).map(([key, label]) => (
                  <Label key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <Input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={() => toggleColumn(key)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <Span className="text-sm text-slate-700">{label}</Span>
                    {visibleColumns[key] && <UiIcon as={Check} className="w-4 h-4 text-emerald-600 ml-auto" />}
                  </Label>
                ))}
              </Div>
            </Div>
            <Div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                onClick={resetColumns}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                Reset
              </Button>
              <Button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
              >
                Apply
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
