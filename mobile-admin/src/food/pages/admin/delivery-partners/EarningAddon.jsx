/* Ported from Frontend/src/modules/Food/pages/admin/delivery-partners/EarningAddon.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Settings, Check, Columns, Package, Gift } from 'lucide-react-native';
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
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, CheckBox, Div, Form, Input, Label, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
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
  const { tablet } = useLayoutWidth();
  const col = tablet ? 'flex-1 min-w-[200px]' : undefined;
  const rowClass = tablet ? 'flex-row flex-wrap gap-3' : 'gap-3';
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
    earningAmount: 'Earning Amount (₹)',
    startDate: 'Start Date',
    endDate: 'End Date',
    status: 'Status',
    redemptions: 'Redemptions',
    actions: 'Actions',
  };
  const COLUMN_WIDTHS = {
    title: 200,
    requiredOrders: 140,
    earningAmount: 150,
    startDate: 130,
    endDate: 130,
    status: 130,
    redemptions: 130,
    actions: 150,
  };
  const activeKeys = Object.keys(COLUMN_WIDTHS).filter((key) => visibleColumns[key]);
  const tableCols = activeKeys.map((key) => COLUMN_WIDTHS[key]);
  const tableLabels = activeKeys.map((key) => columnsConfig[key]);
  const widthOf = (key) => COLUMN_WIDTHS[key];
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Gift}
        title="Earning Addon Offers"
        subtitle={isLoading ? 'Loading offers…' : `${totalItems} offer${totalItems === 1 ? '' : 's'} delivery partners can earn on top of deliveries`}
        breadcrumb={[{ label: 'Food' }, { label: 'Delivery partners' }, { label: 'Earning addons' }]}
        actions={
          <>
            <Button onClick={() => handleOpenDialog()} className={BTN_PRIMARY}>
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Create Offer</Span>
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
            placeholder="Search offer title"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT} flex-1 min-w-[200px]`}
          />
        </Toolbar>
      </Card>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : earningAddons.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No earning addons yet"
          message={debouncedSearch ? 'No offer matches this search.' : 'Create an offer so partners earn a bonus for completing a set number of orders.'}
          actionLabel="Create Offer"
          onAction={() => handleOpenDialog()}
        />
      ) : tableCols.length === 0 ? (
        <EmptyState
          icon={Columns}
          title="All columns are hidden"
          message="Turn a column back on to see the offers."
          actionLabel="Table settings"
          onAction={() => setIsSettingsOpen(true)}
        />
      ) : (
        <DataTable cols={tableCols}>
          <THead cols={tableCols} labels={tableLabels} />
          <TBody>
            {earningAddons.map((addon, index) => (
              <Row key={addon._id} last={index === earningAddons.length - 1}>
                {visibleColumns.title && (
                  <Cell width={widthOf('title')}>
                    <Div className="gap-0.5">
                      <Span className="text-sm font-medium text-slate-900">{addon.title}</Span>
                      {addon.description ? (
                        <Span className="text-xs text-slate-500" numberOfLines={2}>
                          {addon.description}
                        </Span>
                      ) : null}
                    </Div>
                  </Cell>
                )}
                {visibleColumns.requiredOrders && (
                  <Cell width={widthOf('requiredOrders')}>
                    <Div className="flex-row items-center gap-1.5">
                      <UiIcon as={Package} size={14} className="text-slate-400" />
                      <Span className="text-sm font-medium text-slate-900">{addon.requiredOrders}</Span>
                    </Div>
                  </Cell>
                )}
                {visibleColumns.earningAmount && (
                  <Cell width={widthOf('earningAmount')} align="right">
                    <Span className="text-sm font-semibold text-slate-900">
                      {'₹'}
                      {addon.earningAmount?.toFixed(2)}
                    </Span>
                  </Cell>
                )}
                {visibleColumns.startDate && <Cell width={widthOf('startDate')}>{new Date(addon.startDate).toLocaleDateString()}</Cell>}
                {visibleColumns.endDate && <Cell width={widthOf('endDate')}>{new Date(addon.endDate).toLocaleDateString()}</Cell>}
                {visibleColumns.status && (
                  <Cell width={widthOf('status')}>
                    <StatusBadge status={addon.status || 'inactive'} />
                  </Cell>
                )}
                {visibleColumns.redemptions && (
                  <Cell width={widthOf('redemptions')}>
                    {`${addon.currentRedemptions || 0} / ${addon.maxRedemptions || '8'}`}
                  </Cell>
                )}
                {visibleColumns.actions && (
                  <Cell width={widthOf('actions')}>
                    <Div className="flex-row items-center gap-1">
                      <Button
                        onClick={() => handleToggleStatus(addon._id, addon.status)}
                        accessibilityLabel={addon.status === 'active' ? 'Deactivate offer' : 'Activate offer'}
                        className="w-11 h-11 rounded-lg items-center justify-center"
                      >
                        <UiIcon as={addon.status === 'active' ? ToggleRight : ToggleLeft} size={20} className={addon.status === 'active' ? 'text-green-700' : 'text-slate-400'} />
                      </Button>
                      <Button onClick={() => handleOpenDialog(addon)} accessibilityLabel="Edit offer" className="w-11 h-11 rounded-lg items-center justify-center">
                        <UiIcon as={Edit} size={16} className="text-blue-600" />
                      </Button>
                      <Button onClick={() => handleDelete(addon._id)} accessibilityLabel="Delete offer" className="w-11 h-11 rounded-lg items-center justify-center">
                        <UiIcon as={Trash2} size={16} className="text-red-600" />
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
        className="mt-3 rounded-xl border border-slate-200"
      />

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-white p-5 gap-4">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">{isEditMode ? 'Edit Earning Addon' : 'Create Earning Addon Offer'}</DialogTitle>
          </DialogHeader>
          <Form onSubmit={handleSubmit} className="gap-4">
            <Field label="Title" required>
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
                className={INPUT}
                placeholder="e.g. Complete 50 orders and earn ₹500"
              />
            </Field>

            <Div className={rowClass}>
              <Field label="Required Orders" required className={col}>
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
                  className={INPUT}
                  placeholder="e.g. 50"
                />
              </Field>
              <Field label="Earning Amount (₹)" required className={col}>
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
                  className={INPUT}
                  placeholder="e.g. 500.00"
                />
              </Field>
            </Div>

            <Div className={rowClass}>
              <Field label="Start Date" required className={col}>
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
                  className={INPUT}
                />
              </Field>
              <Field label="End Date" required className={col}>
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
                  className={INPUT}
                />
              </Field>
            </Div>

            <Field label="Max Redemptions" hint="Leave empty for unlimited redemptions">
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
                className={INPUT}
                placeholder="Leave empty for unlimited"
              />
            </Field>

            <DialogFooter className="flex-row justify-end gap-2 pt-1">
              <Button type="button" onClick={handleCloseDialog} className={BTN_SECONDARY}>
                <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
              </Button>
              <Button type="submit" className={BTN_PRIMARY}>
                <Span className={BTN_TEXT_PRIMARY}>{isEditMode ? 'Update Offer' : 'Create Offer'}</Span>
              </Button>
            </DialogFooter>
          </Form>
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
