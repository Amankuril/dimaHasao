/* Ported from Frontend/src/modules/Food/pages/admin/delivery-partners/DeliverymanList.jsx (tools/port.js first pass). */
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Download,
  ChevronDown,
  Eye,
  User,
  Star,
  ArrowUpDown,
  Settings,
  FileText,
  FileSpreadsheet,
  Loader2,
  Check,
  Columns,
  ExternalLink,
  Calendar,
  MapPin,
  CreditCard,
  Mail,
  Phone,
  Bike,
  FileCheck,
  Pencil,
  Save,
  Trash2,
  X,
} from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/shadcn';
import { exportDeliverymenToExcel, exportDeliverymenToPDF } from '../../../components/admin/deliveryman/deliverymanExportUtils';
import { toast } from '../../../../lib/notify';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import { A, Button, Div, H1, H3, Img, Input, Label, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
import { alert, window } from '../../../../lib/webShim';
import { LinearGradient } from 'expo-linear-gradient';
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
  };
  const COLUMN_WIDTHS = {
    si: 70,
    name: 200,
    rating: 110,
    contact: 190,
    zone: 150,
    totalOrders: 120,
    pocketBalance: 150,
    cashInHand: 150,
    remainingCashLimit: 180,
    availabilityStatus: 160,
    actions: 132,
  };
  const tableCols = Object.keys(COLUMN_WIDTHS)
    .filter((key) => visibleColumns[key])
    .map((key) => COLUMN_WIDTHS[key]);
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="flex items-center gap-3">
              <UiIcon as={User} className="w-5 h-5 text-slate-600" />
              <H1 className="text-2xl font-bold text-slate-900">Deliveryman List</H1>
            </Div>

            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <Input
                  type="text"
                  placeholder="Search by name or restaur..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                />
                <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </Div>

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
              <Button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all"
              >
                <UiIcon as={Settings} className="w-5 h-5" />
              </Button>
            </Div>
          </Div>

          <Div className="mb-4">
            <Div className="flex items-center gap-2">
              <Span className="text-sm font-semibold text-slate-700">Deliveryman</Span>
              <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 flex items-center justify-center min-w-[2.5rem] h-7">
                {loading ? <Span className="w-5 h-3 rounded bg-slate-300/80 animate-pulse" /> : totalDeliverymen}
              </Span>
            </Div>
          </Div>

          {/* Error Message */}
          {error && (
            <Div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <P className="text-sm text-red-700">{error}</P>
              <Button onClick={fetchDeliverymen} className="mt-2 text-sm text-red-600 underline hover:text-red-800">
                Retry
              </Button>
            </Div>
          )}

          {/* Table */}
          <Div>
            {loading ? (
              <Div className="flex items-center justify-center py-20">
                <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-blue-600" />
                <Span className="ml-3 text-sm text-slate-600">Loading delivery partners...</Span>
              </Div>
            ) : (
              <Table className="w-full" cols={tableCols}>
                <Thead className="bg-slate-50 border-b border-slate-200">
                  <Tr>
                    {visibleColumns.si && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                        <Div className="flex items-center gap-2">
                          <Span>SI</Span>
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.name && (
                      <Th
                        className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('name')}
                      >
                        <Div className="flex items-center gap-2">
                          <Span>Name</Span>
                          <UiIcon as={ArrowUpDown} className={`w-3 h-3 ${sortConfig.key === 'name' ? 'text-blue-600' : 'text-slate-400'}`} />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.rating && (
                      <Th
                        className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('rating')}
                      >
                        <Div className="flex items-center gap-2">
                          <Span>Rating</Span>
                          <UiIcon as={ArrowUpDown} className={`w-3 h-3 ${sortConfig.key === 'rating' ? 'text-blue-600' : 'text-slate-400'}`} />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.contact && (
                      <Th
                        className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('contact')}
                      >
                        <Div className="flex items-center gap-2">
                          <Span>Contact</Span>
                          <UiIcon as={ArrowUpDown} className={`w-3 h-3 ${sortConfig.key === 'contact' ? 'text-blue-600' : 'text-slate-400'}`} />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.zone && (
                      <Th
                        className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('zone')}
                      >
                        <Div className="flex items-center gap-2">
                          <Span>Zone</Span>
                          <UiIcon as={ArrowUpDown} className={`w-3 h-3 ${sortConfig.key === 'zone' ? 'text-blue-600' : 'text-slate-400'}`} />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.totalOrders && (
                      <Th
                        className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('totalOrders')}
                      >
                        <Div className="flex items-center gap-2">
                          <Span>Total Orders</Span>
                          <UiIcon as={ArrowUpDown} className={`w-3 h-3 ${sortConfig.key === 'totalOrders' ? 'text-blue-600' : 'text-slate-400'}`} />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.pocketBalance && (
                      <Th
                        className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('pocketBalance')}
                      >
                        <Div className="flex items-center gap-2">
                          <Span>Pocket Balance</Span>
                          <UiIcon as={ArrowUpDown} className={`w-3 h-3 ${sortConfig.key === 'pocketBalance' ? 'text-blue-600' : 'text-slate-400'}`} />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.cashInHand && (
                      <Th
                        className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('cashInHand')}
                      >
                        <Div className="flex items-center gap-2">
                          <Span>Cash In Hand</Span>
                          <UiIcon as={ArrowUpDown} className={`w-3 h-3 ${sortConfig.key === 'cashInHand' ? 'text-blue-600' : 'text-slate-400'}`} />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.remainingCashLimit && (
                      <Th
                        className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('remainingCashLimit')}
                      >
                        <Div className="flex items-center gap-2">
                          <Span>Remaining Cash Limit</Span>
                          <UiIcon as={ArrowUpDown} className={`w-3 h-3 ${sortConfig.key === 'remainingCashLimit' ? 'text-blue-600' : 'text-slate-400'}`} />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.availabilityStatus && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                        <Div className="flex items-center gap-2">
                          <Span>Availability Status</Span>
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.actions && <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>}
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {filteredDeliverymen.length === 0 ? (
                    <Tr>
                      <Td colSpan={Object.values(visibleColumns).filter((v) => v).length} className="px-6 py-8 text-center text-slate-500">
                        {error ? 'Error loading delivery partners' : 'No delivery partners found'}
                      </Td>
                    </Tr>
                  ) : (
                    filteredDeliverymen.map((dm, index) => (
                      <Tr key={dm._id} className="hover:bg-slate-50 transition-colors">
                        {visibleColumns.si && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm font-medium text-slate-700">{(currentPage - 1) * pageSize + index + 1}</Span>
                          </Td>
                        )}
                        {visibleColumns.name && (
                          <Td className="px-6 py-4 whitespace-nowrap align-middle">
                            <Div className="flex items-center gap-3">
                              <Div
                                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-slate-200"
                                onClick={() => handleView(dm)}
                              >
                                <LinearGradient
                                  colors={['#E8EEF7', '#C5D3E5']}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                                />
                                <Img
                                  src={dm.profileImage?.url ?? dm.profilePhoto ?? '/assets/images/profile_avatar.webp'}
                                  alt={dm.name}
                                  className="w-full h-full object-cover"
                                  fallback="/assets/images/profile_avatar.webp"
                                />
                              </Div>
                              <Span
                                className="text-sm font-medium text-slate-900 cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => handleView(dm)}
                              >
                                {dm.name}
                              </Span>
                            </Div>
                          </Td>
                        )}
                        {visibleColumns.rating && (
                          <Td className="px-6 py-4 whitespace-nowrap align-middle">
                            <Div
                              className="inline-flex items-center justify-center gap-1.5 min-w-[60px] px-2.5 py-1 rounded-lg border"
                              style={
                                dm.rating > 0
                                  ? {
                                      backgroundColor: '#fffbeb',
                                      borderColor: '#fde68a',
                                    }
                                  : {
                                      backgroundColor: 'transparent',
                                      borderColor: 'transparent',
                                    }
                              }
                            >
                              {dm.rating > 0 ? (
                                <>
                                  <Span className="text-sm font-bold text-amber-700 leading-none">{Number(dm.rating).toFixed(1)}</Span>
                                  <UiIcon as={Star} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                </>
                              ) : (
                                <Span className="text-sm text-slate-400 leading-none">N/A</Span>
                              )}
                            </Div>
                          </Td>
                        )}
                        {visibleColumns.contact && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Div className="flex flex-col">
                              <Span className="text-sm text-slate-700">{dm.email}</Span>
                              <Span className="text-xs text-slate-500">{dm.phone}</Span>
                            </Div>
                          </Td>
                        )}
                        {visibleColumns.zone && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm text-slate-700">{dm.zone}</Span>
                          </Td>
                        )}
                        {visibleColumns.totalOrders && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm text-slate-700">{dm.totalOrders || 0}</Span>
                          </Td>
                        )}
                        {visibleColumns.pocketBalance && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            {editingDeliveryId === String(dm._id) ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editValues.pocketBalance}
                                onChange={(e) => updateWalletFieldValue('pocketBalance', e.target.value)}
                                className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                              />
                            ) : (
                              <Span className="text-sm text-slate-700">{formatCurrency(dm.pocketBalance)}</Span>
                            )}
                          </Td>
                        )}
                        {visibleColumns.cashInHand && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            {editingDeliveryId === String(dm._id) ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editValues.cashInHand}
                                onChange={(e) => updateWalletFieldValue('cashInHand', e.target.value)}
                                className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                              />
                            ) : (
                              <Span className="text-sm text-slate-700">{formatCurrency(dm.cashInHand)}</Span>
                            )}
                          </Td>
                        )}
                        {visibleColumns.remainingCashLimit && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm text-slate-700">{formatCurrency(dm.remainingCashLimit)}</Span>
                          </Td>
                        )}
                        {visibleColumns.availabilityStatus && (
                          <Td className="px-6 py-4">
                            <Div className="flex flex-col">
                              <Span className="text-xs">
                                Active Status: <Span className={`${dm.status === 'Online' ? 'text-blue-600' : 'text-slate-600'} underline`}>{dm.status}</Span>
                              </Span>
                            </Div>
                          </Td>
                        )}
                        {visibleColumns.actions && (
                          <Td className="px-6 py-4 whitespace-nowrap text-center">
                            <Div className="flex items-center justify-center gap-2">
                              {editingDeliveryId === String(dm._id) ? (
                                <>
                                  <Button
                                    onClick={() => saveWalletChanges(dm)}
                                    disabled={savingDeliveryId === String(dm._id)}
                                    className="p-1.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                  >
                                    {savingDeliveryId === String(dm._id) ? (
                                      <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <UiIcon as={Save} className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    onClick={cancelEditingWallet}
                                    disabled={savingDeliveryId === String(dm._id)}
                                    className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                                  >
                                    <UiIcon as={X} className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  onClick={() => startEditingWallet(dm)}
                                  className="p-1.5 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                                >
                                  <UiIcon as={Pencil} className="w-4 h-4" />
                                </Button>
                              )}
                              <Button onClick={() => handleView(dm)} className="p-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                                <UiIcon as={Eye} className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleDelete(dm)}
                                disabled={deletingDeliveryId === String(dm._id)}
                                className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                              >
                                {deletingDeliveryId === String(dm._id) ? (
                                  <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />
                                ) : (
                                  <UiIcon as={Trash2} className="w-4 h-4" />
                                )}
                              </Button>
                            </Div>
                          </Td>
                        )}
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            )}
          </Div>

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
            className="mt-4"
          />
        </Div>
      </Div>

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
                        onError={(e) => {
                          e.currentTarget.src = '/assets/images/profile_avatar.webp';
                        }}
                      />
                    ) : (
                      <Img
                        src="/assets/images/profile_avatar.webp"
                        alt={viewDetails.name}
                        className="w-24 h-24 rounded-full object-cover border-2 border-slate-200"
                      />
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

                {/* Pocket Details */}
                <Div className="pb-6 border-b border-slate-200">
                  <H3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <UiIcon as={CreditCard} className="w-4 h-4" /> Pocket Details
                  </H3>
                  <Div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Pocket Balance</Label>
                      <P className="text-sm font-medium text-slate-900 mt-1">
                        {formatCurrency(viewDetails.pocketBalance || viewDetails.walletSummary?.pocketBalance)}
                      </P>
                    </Div>
                    <Div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Cash In Hand</Label>
                      <P className="text-sm font-medium text-slate-900 mt-1">
                        {formatCurrency(viewDetails.cashInHand || viewDetails.walletSummary?.cashCollected)}
                      </P>
                    </Div>
                    <Div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Remaining Cash Limit</Label>
                      <P className="text-sm font-medium text-slate-900 mt-1">
                        {formatCurrency(viewDetails.remainingCashLimit || viewDetails.walletSummary?.remainingCashLimit)}
                      </P>
                    </Div>
                    <Div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Total Earning</Label>
                      <P className="text-sm font-medium text-slate-900 mt-1">
                        {formatCurrency(viewDetails.totalEarning || viewDetails.walletSummary?.totalEarning)}
                      </P>
                    </Div>
                    <Div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Bonus</Label>
                      <P className="text-sm font-medium text-slate-900 mt-1">{formatCurrency(viewDetails.bonus || viewDetails.walletSummary?.bonus)}</P>
                    </Div>
                    <Div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Total Withdrawn</Label>
                      <P className="text-sm font-medium text-slate-900 mt-1">
                        {formatCurrency(viewDetails.totalWithdrawn || viewDetails.walletSummary?.totalWithdrawn)}
                      </P>
                    </Div>
                  </Div>
                </Div>

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

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <UiIcon as={Settings} className="w-5 h-5" />
              Table Settings
            </DialogTitle>
          </DialogHeader>
          <Div className="px-6 pb-6 space-y-4">
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
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Reset
              </Button>
              <Button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md"
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
