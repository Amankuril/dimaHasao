/* Ported from Frontend/src/modules/Food/pages/admin/delivery-partners/EarningAddon.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Settings, ArrowUpDown, Check, Columns, Package } from 'lucide-react-native';
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
import { Button, Div, Form, H1, H3, Input, Label, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
import { window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function EarningAddon() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_earning_addon_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [earningAddons, setEarningAddons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    title: true,
    requiredOrders: true,
    earningAmount: true,
    startDate: true,
    endDate: true,
    status: true,
    redemptions: true,
    actions: true,
  });

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    requiredOrders: '',
    earningAmount: '',
    startDate: '',
    endDate: '',
    maxRedemptions: '',
  });
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);
  useEffect(() => {
    fetchEarningAddons();
  }, [currentPage, pageSize, debouncedSearch]);
  const fetchEarningAddons = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getEarningAddons({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
      });
      if (response.data.success) {
        const addons = response.data.data.earningAddons || [];
        setEarningAddons(addons);
        setTotalItems(response.data.data.pagination?.total ?? addons.length);
      } else {
        toast.error(response.data.message || 'Failed to fetch earning addons');
        setEarningAddons([]);
        setTotalItems(0);
      }
    } catch (error) {
      debugError('Error fetching earning addons:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch earning addons';
      toast.error(errorMessage);
      setEarningAddons([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  };
  const handleOpenDialog = (addon = null) => {
    if (addon) {
      setSelectedAddon(addon);
      setIsEditMode(true);
      setFormData({
        title: addon.title || '',
        requiredOrders: addon.requiredOrders?.toString() || '',
        earningAmount: addon.earningAmount?.toString() || '',
        startDate: addon.startDate ? new Date(addon.startDate).toISOString().split('T')[0] : '',
        endDate: addon.endDate ? new Date(addon.endDate).toISOString().split('T')[0] : '',
        maxRedemptions: addon.maxRedemptions?.toString() || '',
      });
    } else {
      setSelectedAddon(null);
      setIsEditMode(false);
      setFormData({
        title: '',
        requiredOrders: '',
        earningAmount: '',
        startDate: '',
        endDate: '',
        maxRedemptions: '',
      });
    }
    setIsDialogOpen(true);
  };
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedAddon(null);
    setIsEditMode(false);
    setFormData({
      title: '',
      requiredOrders: '',
      earningAmount: '',
      startDate: '',
      endDate: '',
      maxRedemptions: '',
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title || !formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.requiredOrders || parseInt(formData.requiredOrders) < 1) {
      toast.error('Required orders must be at least 1');
      return;
    }
    if (!formData.earningAmount || parseFloat(formData.earningAmount) <= 0) {
      toast.error('Earning amount must be greater than 0');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error('Start date and end date are required');
      return;
    }
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    if (endDate <= startDate) {
      toast.error('End date must be after start date');
      return;
    }
    try {
      const payload = {
        title: formData.title.trim(),
        requiredOrders: parseInt(formData.requiredOrders),
        earningAmount: parseFloat(formData.earningAmount),
        startDate: formData.startDate,
        endDate: formData.endDate,
        maxRedemptions: formData.maxRedemptions && formData.maxRedemptions.trim() ? parseInt(formData.maxRedemptions) : null,
      };
      debugLog('Submitting earning addon:', {
        isEditMode,
        payload,
      });
      if (isEditMode && selectedAddon) {
        const response = await adminAPI.updateEarningAddon(selectedAddon._id, payload);
        debugLog('Update response:', response.data);
        toast.success('Earning addon updated successfully');
      } else {
        const response = await adminAPI.createEarningAddon(payload);
        debugLog('Create response:', response.data);
        toast.success('Earning addon created successfully');
      }
      handleCloseDialog();
      fetchEarningAddons();
    } catch (error) {
      debugError('Error saving earning addon:', error);
      debugError('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
      });

      // Show detailed error message
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save earning addon';
      toast.error(errorMessage);

      // If it's a validation error, show field-specific errors
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        Object.keys(errors).forEach((field) => {
          toast.error(`${field}: ${errors[field]}`);
        });
      }
    }
  };
  const handleDelete = async (id) => {
    if (!(await window.confirmAsync('Are you sure you want to delete this earning addon?'))) {
      return;
    }
    try {
      await adminAPI.deleteEarningAddon(id);
      toast.success('Earning addon deleted successfully');
      fetchEarningAddons();
    } catch (error) {
      debugError('Error deleting earning addon:', error);
      toast.error(error.response?.data?.message || 'Failed to delete earning addon');
    }
  };
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await adminAPI.toggleEarningAddonStatus(id, newStatus);
      toast.success(`Earning addon ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchEarningAddons();
    } catch (error) {
      debugError('Error toggling status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };
  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };
  const resetColumns = () => {
    setVisibleColumns({
      title: true,
      requiredOrders: true,
      earningAmount: true,
      startDate: true,
      endDate: true,
      status: true,
      redemptions: true,
      actions: true,
    });
  };
  const columnsConfig = {
    title: 'Title',
    requiredOrders: 'Required Orders',
    earningAmount: 'Earning Amount',
    startDate: 'Start Date',
    endDate: 'End Date',
    status: 'Status',
    redemptions: 'Redemptions',
    actions: 'Actions',
  };
  const getStatusBadge = (status, isValid) => {
    const statusConfig = {
      active: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        label: 'Active',
      },
      inactive: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        label: 'Inactive',
      },
      expired: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        label: 'Expired',
      },
      completed: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        label: 'Completed',
      },
    };
    const config = statusConfig[status] || statusConfig.inactive;
    return (
      <Span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label} {isValid && status === 'active' && '\u2713'}
      </Span>
    );
  };
  const COLUMN_WIDTHS = {
    title: 200,
    requiredOrders: 150,
    earningAmount: 170,
    startDate: 140,
    endDate: 140,
    status: 130,
    redemptions: 140,
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
            <Div className="flex items-center gap-2">
              <H1 className="text-2xl font-bold text-slate-900">Earning Addon Offers</H1>
              <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">{totalItems}</Span>
            </Div>

            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <Input
                  type="text"
                  placeholder="Ex: search offer title"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                />
                <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </Div>
              <Button
                onClick={() => handleOpenDialog()}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-2 transition-all"
              >
                <UiIcon as={Plus} className="w-4 h-4" />
                <Span>Create Offer</Span>
              </Button>
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
            <Div className="flex items-center justify-center py-12">
              <Div className="text-slate-500">Loading...</Div>
            </Div>
          ) : (
            <Div>
              <Table className="w-full" cols={tableCols}>
                <Thead className="bg-slate-50 border-b border-slate-200">
                  <Tr>
                    {visibleColumns.title && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Title</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.requiredOrders && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Required Orders</Span>
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.earningAmount && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Earning Amount (₹)</Span>
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.startDate && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Start Date</Span>
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.endDate && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>End Date</Span>
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
                    {visibleColumns.redemptions && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Redemptions</Span>
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.actions && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Actions</Th>}
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {earningAddons.length === 0 ? (
                    <Tr>
                      <Td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                        No earning addons found. Create your first offer!
                      </Td>
                    </Tr>
                  ) : (
                    earningAddons.map((addon, index) => (
                      <Tr key={addon._id} className="hover:bg-slate-50 transition-colors">
                        {visibleColumns.title && (
                          <Td className="px-6 py-4">
                            <Div>
                              <P className="text-sm font-medium text-slate-900">{addon.title}</P>
                              {addon.description && <P className="text-xs text-slate-500 mt-1">{addon.description}</P>}
                            </Div>
                          </Td>
                        )}
                        {visibleColumns.requiredOrders && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Div className="flex items-center gap-1">
                              <UiIcon as={Package} className="w-4 h-4 text-slate-400" />
                              <Span className="text-sm font-medium text-slate-900">{addon.requiredOrders}</Span>
                            </Div>
                          </Td>
                        )}
                        {visibleColumns.earningAmount && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Div className="flex items-center gap-1">
                              <Span className="text-sm font-semibold text-emerald-500">₹</Span>
                              <Span className="text-sm font-medium text-slate-900">{addon.earningAmount?.toFixed(2)}</Span>
                            </Div>
                          </Td>
                        )}
                        {visibleColumns.startDate && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm text-slate-700">{new Date(addon.startDate).toLocaleDateString()}</Span>
                          </Td>
                        )}
                        {visibleColumns.endDate && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm text-slate-700">{new Date(addon.endDate).toLocaleDateString()}</Span>
                          </Td>
                        )}
                        {visibleColumns.status && <Td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(addon.status, addon.isValid)}</Td>}
                        {visibleColumns.redemptions && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm text-slate-700">
                              {addon.currentRedemptions || 0} / {addon.maxRedemptions || '8'}
                            </Span>
                          </Td>
                        )}
                        {visibleColumns.actions && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Div className="flex items-center gap-2">
                              <Button
                                onClick={() => handleToggleStatus(addon._id, addon.status)}
                                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                {addon.status === 'active' ? (
                                  <UiIcon as={ToggleRight} className="w-5 h-5 text-green-500" />
                                ) : (
                                  <UiIcon as={ToggleLeft} className="w-5 h-5 text-gray-400" />
                                )}
                              </Button>
                              <Button onClick={() => handleOpenDialog(addon)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                                <UiIcon as={Edit} className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button onClick={() => handleDelete(addon._id)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                                <UiIcon as={Trash2} className="w-4 h-4 text-red-500" />
                              </Button>
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
                localStorage.setItem('admin_earning_addon_pageSize', String(size));
              } catch {
                /* ignore */
              }
            }}
            itemLabel="offers"
          />
        </Div>
      </Div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-gradient-to-br from-slate-50 via-white to-slate-50 p-0 border-0 shadow-2xl">
          <Div className="px-5 py-4 rounded-t-2xl overflow-hidden">
            <GradientFill colors={['#10B981', '#059669']} />
            <DialogHeader className="mb-0">
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <UiIcon as={Package} className="w-4 h-4" />
                {isEditMode ? 'Edit Earning Addon' : 'Create Earning Addon Offer'}
              </DialogTitle>
            </DialogHeader>
          </Div>
          <Form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            {/* Title Field */}
            <Div className="space-y-1.5">
              <Label className="block text-sm font-semibold text-slate-700">
                Title <Span className="text-red-500">*</Span>
              </Label>
              <Input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    title: e.target.value,
                  })
                }
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                placeholder="e.g., Complete 50 orders and earn \u20B9500"
              />
            </Div>

            {/* Orders and Earnings Row */}
            <Div className="grid grid-cols-2 gap-3">
              <Div className="space-y-1.5">
                <Label className="block text-sm font-semibold text-slate-700">
                  Required Orders <Span className="text-red-500">*</Span>
                </Label>
                <Div className="relative">
                  <UiIcon as={Package} className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    required
                    min="1"
                    value={formData.requiredOrders}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requiredOrders: e.target.value,
                      })
                    }
                    className="w-full pl-9 pr-3 py-2.5 border-2 border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                    placeholder="e.g., 50"
                  />
                </Div>
              </Div>
              <Div className="space-y-1.5">
                <Label className="block text-sm font-semibold text-slate-700">
                  Earning Amount (₹) <Span className="text-red-500">*</Span>
                </Label>
                <Div className="relative">
                  <Span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-500">₹</Span>
                  <Input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.earningAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        earningAmount: e.target.value,
                      })
                    }
                    className="w-full pl-9 pr-3 py-2.5 border-2 border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                    placeholder="e.g., 500.00"
                  />
                </Div>
              </Div>
            </Div>

            {/* Date Range Row */}
            <Div className="grid grid-cols-2 gap-3">
              <Div className="space-y-1.5">
                <Label className="block text-sm font-semibold text-slate-700">
                  Start Date <Span className="text-red-500">*</Span>
                </Label>
                <Input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      startDate: e.target.value,
                    })
                  }
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                />
              </Div>
              <Div className="space-y-1.5">
                <Label className="block text-sm font-semibold text-slate-700">
                  End Date <Span className="text-red-500">*</Span>
                </Label>
                <Input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      endDate: e.target.value,
                    })
                  }
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                />
              </Div>
            </Div>

            {/* Max Redemptions Field */}
            <Div className="space-y-1.5">
              <Label className="block text-sm font-semibold text-slate-700">Max Redemptions</Label>
              <Input
                type="number"
                min="1"
                value={formData.maxRedemptions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxRedemptions: e.target.value,
                  })
                }
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                placeholder="Leave empty for unlimited"
              />
              <P className="text-xs text-slate-500">Leave empty for unlimited redemptions</P>
            </Div>

            {/* Footer Buttons */}
            <DialogFooter className="pt-3 border-t border-slate-200 mt-4">
              <Button
                type="button"
                onClick={handleCloseDialog}
                className="px-5 py-2 text-sm font-semibold rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-5 py-2 text-sm font-semibold rounded-lg text-white shadow-md transition-all overflow-hidden"
              >
                <GradientFill colors={['#10B981', '#059669']} />
                {isEditMode ? 'Update' : 'Create'} Offer
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-gradient-to-br from-slate-50 via-white to-slate-50 p-0 border-0 shadow-2xl">
          <Div className="px-6 py-5 rounded-t-2xl overflow-hidden">
            <GradientFill colors={['#475569', '#334155']} />
            <DialogHeader className="mb-0">
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <UiIcon as={Settings} className="w-5 h-5" />
                Table Settings
              </DialogTitle>
            </DialogHeader>
          </Div>
          <Div className="px-6 py-6 space-y-6">
            <Div>
              <H3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <UiIcon as={Columns} className="w-4 h-4" />
                Visible Columns
              </H3>
              <ScrollDiv className="space-y-2 max-h-64">
                {Object.entries(columnsConfig).map(([key, label]) => (
                  <Label
                    key={key}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-200"
                  >
                    <Input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={() => toggleColumn(key)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <Span className="text-sm font-medium text-slate-700 flex-1">{label}</Span>
                    {visibleColumns[key] && <UiIcon as={Check} className="w-4 h-4 text-emerald-600" />}
                  </Label>
                ))}
              </ScrollDiv>
            </Div>
            <Div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                onClick={resetColumns}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
              >
                Reset
              </Button>
              <Button
                onClick={() => setIsSettingsOpen(false)}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl text-white shadow-lg transition-all overflow-hidden"
              >
                <GradientFill colors={['#10B981', '#059669']} />
                Apply
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
