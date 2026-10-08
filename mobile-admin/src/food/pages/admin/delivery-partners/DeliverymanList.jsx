/* Ported from Frontend/src/modules/Food/pages/admin/delivery-partners/DeliverymanList.jsx (tools/port.js first pass). */
import React, { useState, useMemo, useEffect } from 'react';
import { ArrowUpDown, Eye, User, Settings, FileText, FileSpreadsheet, Loader2, Check, Columns, Pencil, Save, Trash2, X } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/shadcn';
import { exportDeliverymenToExcel, exportDeliverymenToPDF } from '../../../components/admin/deliveryman/deliverymanExportUtils';
import { toast } from '../../../../lib/notify';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Toolbar,
  DataTable,
  TBody,
  Row,
  Cell,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  ErrorState,
  LoadingState,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { A, Button, CheckBox, Div, Img, Input, Label, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
import { alert, window } from '../../../../lib/webShim';
const SORTABLE = ['name', 'rating', 'contact', 'zone', 'totalOrders', 'pocketBalance', 'cashInHand', 'remainingCashLimit'];
const COLUMN_LABELS = {
  si: 'SI',
  name: 'Name',
  rating: 'Rating',
  contact: 'Contact',
  zone: 'Zone',
  totalOrders: 'Orders',
  pocketBalance: 'Pocket Balance',
  cashInHand: 'Cash In Hand',
  remainingCashLimit: 'Remaining Limit',
  availabilityStatus: 'Availability',
  actions: 'Action',
};
const debugError = () => {};
const formatCurrency = (amount) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return '\u20B90.00';
  return `\u20B9${numericAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
export default function DeliverymanList() {
  const { tablet } = useLayoutWidth();
  const detailCol = tablet ? 'flex-1 min-w-[200px]' : 'flex-1 min-w-[140px]';
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deliverymen, setDeliverymen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_deliverymen_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalDeliverymen, setTotalDeliverymen] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewDetails, setViewDetails] = useState(null);
  const [editingDeliveryId, setEditingDeliveryId] = useState(null);
  const [editValues, setEditValues] = useState({
    pocketBalance: '',
    cashInHand: '',
  });
  const [savingDeliveryId, setSavingDeliveryId] = useState(null);
  const [deletingDeliveryId, setDeletingDeliveryId] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc',
  });
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    name: true,
    rating: true,
    contact: true,
    zone: true,
    totalOrders: true,
    pocketBalance: true,
    cashInHand: true,
    remainingCashLimit: true,
    availabilityStatus: true,
    actions: true,
  });
  const fetchAllWalletRows = async (search = '', page = 1, limit = 20) => {
    try {
      const response = await adminAPI.getDeliveryBoyWallets({
        search: search || undefined,
        page,
        limit,
      });
      if (response?.data?.success) {
        return response.data.data?.wallets || [];
      }
    } catch (err) {
      debugError('Error fetching wallet rows:', err);
    }
    return [];
  };

  // Fetch delivery partners from API
  const fetchDeliverymen = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: currentPage,
        limit: pageSize,
      };

      // Add search to params if provided
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      const [partnersResponse, walletRowsResult] = await Promise.allSettled([
        adminAPI.getDeliveryPartners(params),
        fetchAllWalletRows(debouncedSearch.trim(), currentPage, pageSize),
      ]);
      if (partnersResponse.status === 'fulfilled' && partnersResponse.value?.data?.success) {
        const partners = partnersResponse.value.data.data.deliveryPartners || [];
        const pagination = partnersResponse.value.data.data.pagination || {};
        setTotalDeliverymen(pagination.total || partners.length);
        const walletRows = walletRowsResult.status === 'fulfilled' ? walletRowsResult.value || [] : [];
        const walletMap = new Map(walletRows.map((wallet) => [String(wallet.deliveryId), wallet]));
        const mergedPartners = partners.map((partner) => {
          const wallet = walletMap.get(String(partner._id));
          return {
            ...partner,
            walletSummary: wallet || null,
            pocketBalance: wallet?.pocketBalance || 0,
            cashInHand: wallet?.cashInHand || 0,
            remainingCashLimit: wallet?.remainingCashLimit || 0,
            totalEarning: wallet?.totalEarning || 0,
            bonus: wallet?.bonus || 0,
            totalWithdrawn: wallet?.totalWithdrawn || 0,
            availableCashLimit: wallet?.availableCashLimit || 0,
          };
        });
        setDeliverymen(mergedPartners);
      } else {
        setError('Failed to fetch delivery partners');
        setDeliverymen([]);
      }
    } catch (err) {
      debugError('Error fetching delivery partners:', err);

      // Better error handling
      let errorMessage = 'Failed to fetch delivery partners. Please try again.';
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
      setError(errorMessage);
      setDeliverymen([]);
    } finally {
      setLoading(false);
    }
  };
  const fetchDeliverymenQuietly = async () => {
    try {
      const params = {
        page: currentPage,
        limit: pageSize,
      };
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      const [partnersResponse, walletRowsResult] = await Promise.allSettled([
        adminAPI.getDeliveryPartners(params),
        fetchAllWalletRows(debouncedSearch.trim(), currentPage, pageSize),
      ]);
      if (partnersResponse.status === 'fulfilled' && partnersResponse.value?.data?.success) {
        const partners = partnersResponse.value.data.data.deliveryPartners || [];
        const walletRows = walletRowsResult.status === 'fulfilled' ? walletRowsResult.value || [] : [];
        const walletMap = new Map(walletRows.map((wallet) => [String(wallet.deliveryId), wallet]));
        const mergedPartners = partners.map((partner) => {
          const wallet = walletMap.get(String(partner._id));
          return {
            ...partner,
            walletSummary: wallet || null,
            pocketBalance: wallet?.pocketBalance || 0,
            cashInHand: wallet?.cashInHand || 0,
            remainingCashLimit: wallet?.remainingCashLimit || 0,
            totalEarning: wallet?.totalEarning || 0,
            bonus: wallet?.bonus || 0,
            totalWithdrawn: wallet?.totalWithdrawn || 0,
            availableCashLimit: wallet?.availableCashLimit || 0,
          };
        });
        setDeliverymen(mergedPartners);
      }
    } catch (err) {
      debugError('Quiet fetch failed', err);
    }
  };
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Fetch data on page or search change, and setup polling for updates
  useEffect(() => {
    fetchDeliverymen();
    const interval = setInterval(() => {
      fetchDeliverymenQuietly();
    }, 8000);
    return () => {
      clearInterval(interval);
    };
  }, [currentPage, pageSize, debouncedSearch]);
  const filteredDeliverymen = useMemo(() => {
    // Backend already handles search; apply client-side sorting on top.
    const result = [...deliverymen];
    if (sortConfig.key) {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        let aValue;
        let bValue;
        switch (sortConfig.key) {
          case 'name':
            aValue = String(a.name || '').toLowerCase();
            bValue = String(b.name || '').toLowerCase();
            break;
          case 'rating':
            aValue = Number(a.rating || 0);
            bValue = Number(b.rating || 0);
            break;
          case 'contact':
            aValue = String(a.email || '').toLowerCase();
            bValue = String(b.email || '').toLowerCase();
            break;
          case 'zone':
            aValue = String(a.zone || '').toLowerCase();
            bValue = String(b.zone || '').toLowerCase();
            break;
          case 'totalOrders':
            aValue = Number(a.totalOrders || 0);
            bValue = Number(b.totalOrders || 0);
            break;
          case 'pocketBalance':
            aValue = Number(a.pocketBalance || 0);
            bValue = Number(b.pocketBalance || 0);
            break;
          case 'cashInHand':
            aValue = Number(a.cashInHand || 0);
            bValue = Number(b.cashInHand || 0);
            break;
          case 'remainingCashLimit':
            aValue = Number(a.remainingCashLimit || 0);
            bValue = Number(b.remainingCashLimit || 0);
            break;
          default:
            return 0;
        }
        if (aValue < bValue) return -1 * dir;
        if (aValue > bValue) return 1 * dir;
        return 0;
      });
    }
    return result;
  }, [deliverymen, sortConfig]);
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  const handleView = async (deliveryman) => {
    try {
      setLoading(true);
      const response = await adminAPI.getDeliveryPartnerById(deliveryman._id);
      if (response.data && response.data.success) {
        setViewDetails({
          ...response.data.data.delivery,
          walletSummary: deliveryman.walletSummary || null,
          pocketBalance: deliveryman.pocketBalance || 0,
          cashInHand: deliveryman.cashInHand || 0,
          remainingCashLimit: deliveryman.remainingCashLimit || 0,
          totalEarning: deliveryman.totalEarning || 0,
          bonus: deliveryman.bonus || 0,
          totalWithdrawn: deliveryman.totalWithdrawn || 0,
          availableCashLimit: deliveryman.availableCashLimit || 0,
        });
        setIsViewOpen(true);
      } else {
        alert('Failed to load details');
      }
    } catch (err) {
      debugError('Error fetching details:', err);
      alert(err.response?.data?.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };
  const handleExportPDF = () => {
    if (filteredDeliverymen.length === 0) {
      alert('No data to export');
      return;
    }
    exportDeliverymenToPDF(filteredDeliverymen);
  };
  const handleExportExcel = () => {
    if (filteredDeliverymen.length === 0) {
      alert('No data to export');
      return;
    }
    exportDeliverymenToExcel(filteredDeliverymen);
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
      name: true,
      rating: true,
      contact: true,
      zone: true,
      totalOrders: true,
      pocketBalance: true,
      cashInHand: true,
      remainingCashLimit: true,
      availabilityStatus: true,
      actions: true,
    });
  };
  const columnsConfig = {
    si: 'Serial Number',
    name: 'Name',
    rating: 'Rating',
    contact: 'Contact',
    zone: 'Zone',
    totalOrders: 'Total Orders',
    pocketBalance: 'Pocket Balance',
    cashInHand: 'Cash In Hand',
    remainingCashLimit: 'Remaining Cash Limit',
    availabilityStatus: 'Availability Status',
    actions: 'Actions',
  };
  const startEditingWallet = (deliveryman) => {
    setEditingDeliveryId(String(deliveryman._id));
    setEditValues({
      pocketBalance: String(Number(deliveryman.pocketBalance) || 0),
      cashInHand: String(Number(deliveryman.cashInHand) || 0),
    });
  };
  const cancelEditingWallet = () => {
    setEditingDeliveryId(null);
    setEditValues({
      pocketBalance: '',
      cashInHand: '',
    });
  };
  const updateWalletFieldValue = (field, value) => {
    setEditValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const saveWalletChanges = async (deliveryman) => {
    const nextPocketBalance = Number(editValues.pocketBalance);
    const nextCashInHand = Number(editValues.cashInHand);
    if (!Number.isFinite(nextPocketBalance) || nextPocketBalance < 0) {
      toast.error('Pocket balance must be a valid non-negative number');
      return;
    }
    if (!Number.isFinite(nextCashInHand) || nextCashInHand < 0) {
      toast.error('Cash in hand must be a valid non-negative number');
      return;
    }
    try {
      setSavingDeliveryId(String(deliveryman._id));
      const response = await adminAPI.updateDeliveryBoyWallet({
        walletId: deliveryman.walletSummary?.walletId,
        deliveryId: deliveryman._id,
        pocketBalance: nextPocketBalance,
        cashInHand: nextCashInHand,
      });
      if (!response?.data?.success) {
        toast.error(response?.data?.message || 'Failed to update wallet');
        return;
      }
      const updatedWallet = response.data.data || {};
      setDeliverymen((prev) =>
        prev.map((item) =>
          String(item._id) === String(deliveryman._id)
            ? {
                ...item,
                pocketBalance: updatedWallet.pocketBalance ?? nextPocketBalance,
                cashInHand: updatedWallet.cashInHand ?? nextCashInHand,
                remainingCashLimit: updatedWallet.remainingCashLimit ?? item.remainingCashLimit,
                availableCashLimit: updatedWallet.availableCashLimit ?? item.availableCashLimit,
                walletSummary: {
                  ...(item.walletSummary || {}),
                  walletId: updatedWallet.walletId || item.walletSummary?.walletId,
                  pocketBalance: updatedWallet.pocketBalance ?? nextPocketBalance,
                  cashCollected: updatedWallet.cashInHand ?? nextCashInHand,
                  remainingCashLimit: updatedWallet.remainingCashLimit ?? item.remainingCashLimit,
                  availableCashLimit: updatedWallet.availableCashLimit ?? item.availableCashLimit,
                },
              }
            : item,
        ),
      );
      setViewDetails((prev) => {
        if (!prev || String(prev._id) !== String(deliveryman._id)) {
          return prev;
        }
        return {
          ...prev,
          pocketBalance: updatedWallet.pocketBalance ?? nextPocketBalance,
          cashInHand: updatedWallet.cashInHand ?? nextCashInHand,
          remainingCashLimit: updatedWallet.remainingCashLimit ?? prev.remainingCashLimit,
          availableCashLimit: updatedWallet.availableCashLimit ?? prev.availableCashLimit,
          walletSummary: {
            ...(prev.walletSummary || {}),
            walletId: updatedWallet.walletId || prev.walletSummary?.walletId,
            pocketBalance: updatedWallet.pocketBalance ?? nextPocketBalance,
            cashCollected: updatedWallet.cashInHand ?? nextCashInHand,
            remainingCashLimit: updatedWallet.remainingCashLimit ?? prev.remainingCashLimit,
            availableCashLimit: updatedWallet.availableCashLimit ?? prev.availableCashLimit,
          },
        };
      });
      toast.success('Wallet updated');
      cancelEditingWallet();
    } catch (err) {
      debugError('Error updating delivery wallet:', err);
      toast.error(err.response?.data?.message || 'Failed to update wallet');
    } finally {
      setSavingDeliveryId(null);
    }
  };
  const handleDelete = async (deliveryman) => {
    const deliverymanId = String(deliveryman?._id || '');
    if (!deliverymanId) {
      toast.error('Delivery partner not found');
      return;
    }
    const confirmed = await window.confirmAsync(
      `Deactivate ${deliveryman?.name || 'this delivery partner'}?\n\nThis will block the account and log them out, while preserving profile, wallet, and history.`,
    );
    if (!confirmed) {
      return;
    }
    try {
      setDeletingDeliveryId(deliverymanId);
      const response = await adminAPI.deleteDeliveryPartner(deliverymanId);
      if (!response?.data?.success) {
        toast.error(response?.data?.message || 'Failed to deactivate delivery partner');
        return;
      }
      const wasViewingDeletedPartner = Boolean(viewDetails && String(viewDetails._id) === deliverymanId);
      setDeliverymen((prev) => prev.filter((item) => String(item._id) !== deliverymanId));
      setViewDetails((prev) => (prev && String(prev._id) === deliverymanId ? null : prev));
      if (wasViewingDeletedPartner) {
        setIsViewOpen(false);
      }
      toast.success(response?.data?.message || 'Delivery partner deactivated successfully');
    } catch (err) {
      debugError('Error deleting delivery partner:', err);
      toast.error(err?.response?.data?.message || 'Failed to deactivate delivery partner');
    } finally {
      setDeletingDeliveryId(null);
    }
  };  const COLUMN_WIDTHS = {
    si: 60,
    name: 190,
    rating: 100,
    contact: 190,
    zone: 140,
    totalOrders: 110,
    pocketBalance: 150,
    cashInHand: 150,
    remainingCashLimit: 170,
    availabilityStatus: 150,
    actions: 150,
  };
  const activeKeys = Object.keys(COLUMN_WIDTHS).filter((key) => visibleColumns[key]);
  const tableCols = activeKeys.map((key) => COLUMN_WIDTHS[key]);
  const widthOf = (key) => COLUMN_WIDTHS[key];
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
        icon={User}
        title="Deliveryman List"
        subtitle={loading ? 'Loading delivery partners…' : `${totalDeliverymen} delivery partner${totalDeliverymen === 1 ? '' : 's'} and their wallets`}
        breadcrumb={[{ label: 'Food' }, { label: 'Delivery partners' }, { label: 'Deliveryman list' }]}
        actions={
          <>
            <Button onClick={handleExportPDF} className={BTN_SECONDARY}>
              <UiIcon as={FileText} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>PDF</Span>
            </Button>
            <Button onClick={handleExportExcel} className={BTN_SECONDARY}>
              <UiIcon as={FileSpreadsheet} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Excel</Span>
            </Button>
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
            placeholder="Search by name or phone"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className={`${INPUT} flex-1 min-w-[200px]`}
          />
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <ErrorState title="Could not load delivery partners" message={error} onRetry={fetchDeliverymen} />
      ) : filteredDeliverymen.length === 0 ? (
        <EmptyState
          icon={User}
          title="No delivery partners found"
          message={debouncedSearch ? 'No delivery partner matches this search.' : 'Approved delivery partners appear here with their wallet balances.'}
        />
      ) : tableCols.length === 0 ? (
        <EmptyState
          icon={Columns}
          title="All columns are hidden"
          message="Turn a column back on to see the list."
          actionLabel="Table settings"
          onAction={() => setIsSettingsOpen(true)}
        />
      ) : (
        <DataTable cols={tableCols}>
          <Row className="bg-slate-50 border-b border-slate-200">
            {activeKeys.map((key) => {
              const sortable = SORTABLE.includes(key);
              return (
                <Cell key={key} width={widthOf(key)} className="py-2.5">
                  <Div className="flex-row items-center gap-1" onClick={sortable ? () => handleSort(key) : undefined}>
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex-1" numberOfLines={2}>
                      {COLUMN_LABELS[key]}
                    </Span>
                    {sortable ? <UiIcon as={ArrowUpDown} size={12} className={sortConfig.key === key ? 'text-blue-600' : 'text-slate-400'} /> : null}
                  </Div>
                </Cell>
              );
            })}
          </Row>
          <TBody>
            {filteredDeliverymen.map((dm, index) => (
              <Row key={dm._id} last={index === filteredDeliverymen.length - 1}>
                {visibleColumns.si && <Cell width={widthOf('si')}>{String((currentPage - 1) * pageSize + index + 1)}</Cell>}
                {visibleColumns.name && (
                  <Cell width={widthOf('name')}>
                    <Div className="flex-row items-center gap-2">
                      <Div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden shrink-0" onClick={() => handleView(dm)}>
                        <Img
                          src={dm.profileImage?.url ?? dm.profilePhoto ?? '/assets/images/profile_avatar.webp'}
                          alt={dm.name}
                          className="w-full h-full"
                          contentFit="cover"
                          fallback="/assets/images/profile_avatar.webp"
                        />
                      </Div>
                      <Span className="text-sm font-medium text-slate-900 flex-1" numberOfLines={2} onClick={() => handleView(dm)}>
                        {dm.name}
                      </Span>
                    </Div>
                  </Cell>
                )}
                {visibleColumns.rating && (
                  <Cell width={widthOf('rating')}>
                    {dm.rating > 0 ? (
                      <StatusBadge tone="warning" label={`${Number(dm.rating).toFixed(1)} ★`} />
                    ) : (
                      <Span className="text-sm text-slate-400">N/A</Span>
                    )}
                  </Cell>
                )}
                {visibleColumns.contact && (
                  <Cell width={widthOf('contact')}>
                    <Div className="gap-0.5">
                      <Span className="text-sm text-slate-700" numberOfLines={1}>
                        {dm.email}
                      </Span>
                      <Span className="text-xs text-slate-500">{dm.phone}</Span>
                    </Div>
                  </Cell>
                )}
                {visibleColumns.zone && <Cell width={widthOf('zone')}>{dm.zone}</Cell>}
                {visibleColumns.totalOrders && (
                  <Cell width={widthOf('totalOrders')} align="right">
                    {String(dm.totalOrders || 0)}
                  </Cell>
                )}
                {visibleColumns.pocketBalance && (
                  <Cell width={widthOf('pocketBalance')} align={editingDeliveryId === String(dm._id) ? 'left' : 'right'}>
                    {editingDeliveryId === String(dm._id) ? (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editValues.pocketBalance}
                        onChange={(e) => updateWalletFieldValue('pocketBalance', e.target.value)}
                        className={`${INPUT} w-full`}
                      />
                    ) : (
                      formatCurrency(dm.pocketBalance)
                    )}
                  </Cell>
                )}
                {visibleColumns.cashInHand && (
                  <Cell width={widthOf('cashInHand')} align={editingDeliveryId === String(dm._id) ? 'left' : 'right'}>
                    {editingDeliveryId === String(dm._id) ? (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editValues.cashInHand}
                        onChange={(e) => updateWalletFieldValue('cashInHand', e.target.value)}
                        className={`${INPUT} w-full`}
                      />
                    ) : (
                      formatCurrency(dm.cashInHand)
                    )}
                  </Cell>
                )}
                {visibleColumns.remainingCashLimit && (
                  <Cell width={widthOf('remainingCashLimit')} align="right">
                    {formatCurrency(dm.remainingCashLimit)}
                  </Cell>
                )}
                {visibleColumns.availabilityStatus && (
                  <Cell width={widthOf('availabilityStatus')}>
                    <StatusBadge status={dm.status} label={dm.status || 'Unknown'} />
                  </Cell>
                )}
                {visibleColumns.actions && (
                  <Cell width={widthOf('actions')}>
                    <Div className="flex-row items-center gap-1">
                      {editingDeliveryId === String(dm._id) ? (
                        <>
                          <Button
                            onClick={() => saveWalletChanges(dm)}
                            disabled={savingDeliveryId === String(dm._id)}
                            accessibilityLabel="Save wallet changes"
                            className={`w-11 h-11 rounded-lg items-center justify-center ${savingDeliveryId === String(dm._id) ? 'opacity-50' : ''}`}
                          >
                            <UiIcon as={savingDeliveryId === String(dm._id) ? Loader2 : Save} size={16} className="text-green-700" />
                          </Button>
                          <Button
                            onClick={cancelEditingWallet}
                            disabled={savingDeliveryId === String(dm._id)}
                            accessibilityLabel="Cancel editing"
                            className={`w-11 h-11 rounded-lg items-center justify-center ${savingDeliveryId === String(dm._id) ? 'opacity-50' : ''}`}
                          >
                            <UiIcon as={X} size={16} className="text-slate-600" />
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => startEditingWallet(dm)} accessibilityLabel="Edit wallet" className="w-11 h-11 rounded-lg items-center justify-center">
                          <UiIcon as={Pencil} size={16} className="text-slate-600" />
                        </Button>
                      )}
                      <Button onClick={() => handleView(dm)} accessibilityLabel="View delivery partner" className="w-11 h-11 rounded-lg items-center justify-center">
                        <UiIcon as={Eye} size={16} className="text-blue-600" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(dm)}
                        disabled={deletingDeliveryId === String(dm._id)}
                        accessibilityLabel="Deactivate delivery partner"
                        className={`w-11 h-11 rounded-lg items-center justify-center ${deletingDeliveryId === String(dm._id) ? 'opacity-50' : ''}`}
                      >
                        <UiIcon as={deletingDeliveryId === String(dm._id) ? Loader2 : Trash2} size={16} className="text-red-600" />
                      </Button>
                    </Div>
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
        totalItems={totalDeliverymen}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          try {
            localStorage.setItem('admin_deliverymen_pageSize', String(size));
          } catch {
            /* ignore */
          }
        }}
        itemLabel="delivery partners"
        className="mt-3 rounded-xl border border-slate-200"
      />

      {/* View Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl bg-white p-5 gap-3">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Delivery Partner Details</DialogTitle>
          </DialogHeader>
          {viewDetails ? (
            <Div className="gap-3">
              <Card className="gap-3">
                <Div className="flex-row items-center gap-3">
                  <Img
                    src={viewDetails.profileImage?.url ?? '/assets/images/profile_avatar.webp'}
                    alt={viewDetails.name}
                    className="w-16 h-16 rounded-full"
                    contentFit="cover"
                    fallback="/assets/images/profile_avatar.webp"
                  />
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
                  <StatusBadge
                    status={viewDetails.phoneVerified ? 'verified' : 'failed'}
                    label={viewDetails.phoneVerified ? 'Phone verified' : 'Phone not verified'}
                  />
                ) : null}
              </Card>

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
                  </Div>
                </Card>
              ) : null}

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

              <Card>
                <SectionTitle>Pocket details</SectionTitle>
                <Div className="flex-row flex-wrap gap-3">
                  {detailRow('Pocket balance', formatCurrency(viewDetails.pocketBalance || viewDetails.walletSummary?.pocketBalance))}
                  {detailRow('Cash in hand', formatCurrency(viewDetails.cashInHand || viewDetails.walletSummary?.cashCollected))}
                  {detailRow('Remaining cash limit', formatCurrency(viewDetails.remainingCashLimit || viewDetails.walletSummary?.remainingCashLimit))}
                  {detailRow('Total earning', formatCurrency(viewDetails.totalEarning || viewDetails.walletSummary?.totalEarning))}
                  {detailRow('Bonus', formatCurrency(viewDetails.bonus || viewDetails.walletSummary?.bonus))}
                  {detailRow('Total withdrawn', formatCurrency(viewDetails.totalWithdrawn || viewDetails.walletSummary?.totalWithdrawn))}
                </Div>
              </Card>

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
                          <P className="text-xs text-slate-500">
                            Expiry: {new Date(viewDetails.documents.drivingLicense.expiryDate).toLocaleDateString('en-GB')}
                          </P>
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
                        {viewDetails.documents.vehicleRC.number ? (
                          <P className="text-sm text-slate-700">Number: {viewDetails.documents.vehicleRC.number}</P>
                        ) : null}
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
