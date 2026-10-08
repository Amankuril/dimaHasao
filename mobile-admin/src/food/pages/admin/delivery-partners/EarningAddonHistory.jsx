/* Ported from Frontend/src/modules/Food/pages/admin/delivery-partners/EarningAddonHistory.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import {
  Settings,
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
  RefreshCw,
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
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { Button, CheckBox, Div, Input, Label, P, ScrollDiv, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import { window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const STATUS_ICONS = {
  pending: Clock,
  credited: CheckCircle,
  failed: XCircle,
  cancelled: XCircle,
};
const STATUS_LABELS = {
  pending: 'Pending',
  credited: 'Credited',
  failed: 'Failed',
  cancelled: 'Cancelled',
};
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
    si: 'SI',
    deliveryman: 'Deliveryman',
    offerTitle: 'Offer Title',
    ordersCompleted: 'Orders',
    earningAmount: 'Earning Amount',
    date: 'Date',
    status: 'Status',
    actions: 'Actions',
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
      debugLog('Checking completions for all delivery partners...');
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
    offerTitle: 190,
    ordersCompleted: 140,
    earningAmount: 150,
    date: 150,
    status: 130,
    actions: 150,
  };
  const activeKeys = Object.keys(COLUMN_WIDTHS).filter((key) => visibleColumns[key]);
  const tableCols = activeKeys.map((key) => COLUMN_WIDTHS[key]);
  const tableLabels = activeKeys.map((key) => columnsConfig[key]);
  const widthOf = (key) => COLUMN_WIDTHS[key];
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Wallet}
        title="Earning Addon History"
        subtitle={isLoading ? 'Loading history…' : `${totalItems} completed offer${totalItems === 1 ? '' : 's'} waiting to be credited or already paid`}
        breadcrumb={[{ label: 'Food' }, { label: 'Delivery partners' }, { label: 'Earning addon history' }]}
        actions={
          <>
            <Button
              onClick={handleCheckAllCompletions}
              disabled={isCheckingCompletions}
              className={`${BTN_PRIMARY} ${isCheckingCompletions ? 'opacity-50' : ''}`}
            >
              <UiIcon as={RefreshCw} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>{isCheckingCompletions ? 'Checking…' : 'Check Completions'}</Span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className={BTN_SECONDARY}>
                  <UiIcon as={Download} size={16} className="text-slate-600" />
                  <Span className={BTN_TEXT_SECONDARY}>Export</Span>
                  <UiIcon as={ChevronDown} size={14} className="text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <UiIcon as={FileText} size={16} className="mr-2 text-slate-500" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <UiIcon as={FileSpreadsheet} size={16} className="mr-2 text-slate-500" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <UiIcon as={FileText} size={16} className="mr-2 text-slate-500" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  <UiIcon as={Code} size={16} className="mr-2 text-slate-500" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => setIsSettingsOpen(true)}
              accessibilityLabel="Table settings"
              className="w-11 h-11 rounded-lg border border-slate-300 bg-white items-center justify-center"
            >
              <UiIcon as={Settings} size={18} className="text-slate-600" />
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Input
            type="text"
            placeholder="Search delivery partner or offer"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT} flex-1 min-w-[200px]`}
          />
        </Toolbar>
      </Card>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : history.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No earning addon history found"
          message={searchQuery ? 'Try adjusting your search query' : 'History will appear when delivery partners complete earning addon offers.'}
          actionLabel="Check Completions"
          onAction={handleCheckAllCompletions}
        />
      ) : tableCols.length === 0 ? (
        <EmptyState
          icon={Columns}
          title="All columns are hidden"
          message="Turn a column back on to see the history."
          actionLabel="Table settings"
          onAction={() => setIsSettingsOpen(true)}
        />
      ) : (
        <DataTable cols={tableCols}>
          <THead cols={tableCols} labels={tableLabels} />
          <TBody>
            {history.map((item, index) => (
              <Row key={item._id} last={index === history.length - 1}>
                {visibleColumns.si && <Cell width={widthOf('si')}>{String((currentPage - 1) * pageSize + index + 1)}</Cell>}
                {visibleColumns.deliveryman && (
                  <Cell width={widthOf('deliveryman')}>
                    <Div className="gap-0.5">
                      <Span className="text-sm font-medium text-slate-900">{item.deliveryman || 'Unknown'}</Span>
                      {item.deliveryId ? <Span className="text-xs text-slate-500">ID: {item.deliveryId}</Span> : null}
                      {item.deliveryPhone && item.deliveryPhone !== 'N/A' ? <Span className="text-xs text-slate-500">{item.deliveryPhone}</Span> : null}
                    </Div>
                  </Cell>
                )}
                {visibleColumns.offerTitle && <Cell width={widthOf('offerTitle')}>{item.offerTitle}</Cell>}
                {visibleColumns.ordersCompleted && (
                  <Cell width={widthOf('ordersCompleted')}>
                    <Div className="gap-0.5">
                      <Span className="text-sm font-medium text-slate-900">
                        {item.ordersCompleted || 0} / {item.ordersRequired || 0}
                      </Span>
                      {item.ordersRequired > 0 ? (
                        <Span className="text-xs text-slate-500">{Math.round(((item.ordersCompleted || 0) / item.ordersRequired) * 100)}% complete</Span>
                      ) : null}
                    </Div>
                  </Cell>
                )}
                {visibleColumns.earningAmount && (
                  <Cell width={widthOf('earningAmount')} align="right">
                    <Span className="text-sm font-semibold text-slate-900">
                      {'₹'}
                      {item.totalEarning?.toFixed(2) || item.earningAmount?.toFixed(2) || '0.00'}
                    </Span>
                  </Cell>
                )}
                {visibleColumns.date && (
                  <Cell width={widthOf('date')}>
                    <Div className="gap-0.5">
                      <Span className="text-sm text-slate-700">{formatDate(item.date || item.completedAt)}</Span>
                      {item.completedAt ? (
                        <Span className="text-xs text-slate-500">
                          {new Date(item.completedAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Span>
                      ) : null}
                    </Div>
                  </Cell>
                )}
                {visibleColumns.status && (
                  <Cell width={widthOf('status')}>
                    <StatusBadge
                      status={item.status || 'pending'}
                      label={STATUS_LABELS[item.status] || STATUS_LABELS.pending}
                      icon={STATUS_ICONS[item.status] || STATUS_ICONS.pending}
                    />
                  </Cell>
                )}
                {visibleColumns.actions && (
                  <Cell width={widthOf('actions')}>
                    {item.status === 'pending' ? (
                      <Div className="flex-row items-center gap-1">
                        <Button onClick={() => handleOpenCreditDialog(item)} className={`${BTN_PRIMARY} px-3`}>
                          <Span className={BTN_TEXT_PRIMARY}>Credit</Span>
                        </Button>
                        <Button onClick={() => handleCancel(item._id)} accessibilityLabel="Cancel earning" className="w-11 h-11 rounded-lg items-center justify-center">
                          <UiIcon as={XCircle} size={16} className="text-red-600" />
                        </Button>
                      </Div>
                    ) : (
                      <Span className="text-sm text-slate-400">—</Span>
                    )}
                  </Cell>
                )}
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
            localStorage.setItem('admin_earning_addon_history_pageSize', String(size));
          } catch {
            /* ignore */
          }
        }}
        itemLabel="records"
        className="mt-3 rounded-xl border border-slate-200"
      />

      {/* Credit Dialog */}
      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent className="max-w-lg bg-white p-5 gap-4">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Credit Earning to Wallet</DialogTitle>
          </DialogHeader>

          {selectedHistory && (
            <Div className="gap-3">
              <Card className="gap-3">
                <Div className="gap-0.5">
                  <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deliveryman</P>
                  <P className="text-sm font-medium text-slate-900">{selectedHistory.deliveryman || 'N/A'}</P>
                  {selectedHistory.deliveryId ? <P className="text-xs text-slate-500">ID: {selectedHistory.deliveryId}</P> : null}
                </Div>
                <Div className="gap-0.5">
                  <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Offer</P>
                  <P className="text-sm font-medium text-slate-900">{selectedHistory.offerTitle || 'N/A'}</P>
                  {selectedHistory.ordersCompleted && selectedHistory.ordersRequired ? (
                    <P className="text-xs text-slate-500">
                      {selectedHistory.ordersCompleted} / {selectedHistory.ordersRequired} orders completed
                    </P>
                  ) : null}
                </Div>
                <Div className="gap-0.5">
                  <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount to credit</P>
                  <P className="text-2xl font-bold text-slate-900">
                    {'₹'}
                    {selectedHistory.totalEarning?.toFixed(2) || selectedHistory.earningAmount?.toFixed(2) || '0.00'}
                  </P>
                </Div>
              </Card>

              <Field label="Notes" hint="Optional — saved with the transaction record">
                <Textarea
                  value={creditNotes}
                  onChange={(e) => setCreditNotes(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                  rows={4}
                  placeholder="Add any notes about this credit transaction…"
                />
              </Field>
            </Div>
          )}

          <DialogFooter className="flex-row justify-end gap-2 pt-1">
            <Button
              onClick={() => {
                setIsCreditDialogOpen(false);
                setSelectedHistory(null);
                setCreditNotes('');
              }}
              className={BTN_SECONDARY}
            >
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button onClick={handleCredit} className={BTN_PRIMARY}>
              <UiIcon as={Wallet} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Credit to Wallet</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-5 gap-3">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Table Settings</DialogTitle>
          </DialogHeader>
          <SectionTitle className="mb-1">Visible columns</SectionTitle>
          <ScrollDiv className="max-h-72" contentClassName="gap-1">
            {Object.entries(columnsConfig).map(([key, label]) => (
              <Label key={key} className="flex-row items-center gap-3 h-11 px-2 rounded-lg" onClick={() => toggleColumn(key)}>
                <CheckBox checked={visibleColumns[key]} onChange={() => toggleColumn(key)} />
                <Span className="text-sm text-slate-700 flex-1">{label}</Span>
                {visibleColumns[key] ? <UiIcon as={Check} size={16} className="text-blue-600" /> : null}
              </Label>
            ))}
          </ScrollDiv>
          <DialogFooter className="flex-row justify-end gap-2 pt-2">
            <Button onClick={resetColumns} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
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
