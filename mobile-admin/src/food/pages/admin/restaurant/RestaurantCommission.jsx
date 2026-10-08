/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/RestaurantCommission.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, Building2, AlertTriangle, Percent } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/shadcn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import { adminAPI } from '../../../../api/food';
import { API_BASE_URL } from '../../../../api/config';
import { toast } from '../../../../lib/notify';
import { Button, Div, Input, Option, ScrollDiv, Select, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
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
  INPUT_ERROR,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_DANGER,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};

/** Platform default = percentage. Fixed amount only when admin chooses it per restaurant. */
const DEFAULT_COMMISSION_PERCENT = '18';
const DEFAULT_COMMISSION_FIXED_AMOUNT = '50';
export default function RestaurantCommission() {
  const [searchQuery, setSearchQuery] = useState('');
  const [commissions, setCommissions] = useState([]);
  const [approvedRestaurants, setApprovedRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isRestaurantSelectOpen, setIsRestaurantSelectOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [formData, setFormData] = useState({
    restaurantId: '',
    defaultCommission: {
      type: 'percentage',
      value: DEFAULT_COMMISSION_PERCENT,
    },
    notes: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    restaurant: true,
    restaurantId: true,
    defaultCommission: true,
    status: true,
    actions: true,
  });
  const filteredCommissions = useMemo(() => {
    if (!searchQuery.trim()) {
      return commissions;
    }
    const query = searchQuery.toLowerCase().trim();
    return commissions.filter(
      (commission) =>
        commission.restaurantName?.toLowerCase().includes(query) ||
        commission.restaurantId?.toLowerCase().includes(query) ||
        commission.restaurant?.name?.toLowerCase().includes(query),
    );
  }, [commissions, searchQuery]);
  const filteredRestaurants = useMemo(() => {
    if (!searchQuery.trim()) {
      return approvedRestaurants;
    }
    const query = searchQuery.toLowerCase().trim();
    return approvedRestaurants.filter(
      (restaurant) =>
        restaurant.name?.toLowerCase().includes(query) ||
        restaurant.restaurantId?.toLowerCase().includes(query) ||
        restaurant.ownerName?.toLowerCase().includes(query),
    );
  }, [approvedRestaurants, searchQuery]);

  // Fetch data on component mount
  useEffect(() => {
    // Single fast call to avoid multiple API requests on load
    fetchBootstrap();
  }, []);
  const fetchBootstrap = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getRestaurantCommissionBootstrap();
      const data = response?.data?.data;
      setCommissions(Array.isArray(data?.commissions) ? data.commissions : []);
      setApprovedRestaurants(Array.isArray(data?.restaurants) ? data.restaurants : []);
    } catch (error) {
      debugError('Error fetching bootstrap:', error);
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        toast.error(`Cannot connect to backend server. Please ensure the backend is running on ${API_BASE_URL.replace('/api', '')}`);
      } else {
        toast.error(error.response?.data?.message || 'Failed to fetch commissions');
      }
      setCommissions([]);
      setApprovedRestaurants([]);
    } finally {
      setLoading(false);
    }
  };
  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getRestaurantCommissions({});
      let commissionsData = null;
      if (response?.data?.success && response?.data?.data?.commissions) {
        commissionsData = response.data.data.commissions;
      } else if (response?.data?.data?.commissions) {
        commissionsData = response.data.data.commissions;
      } else if (response?.data?.commissions) {
        commissionsData = response.data.commissions;
      }
      if (commissionsData && Array.isArray(commissionsData)) {
        setCommissions(commissionsData);
      } else {
        setCommissions([]);
      }
    } catch (error) {
      debugError('Error fetching commissions:', error);

      // Handle network errors
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        toast.error(`Cannot connect to backend server. Please ensure the backend is running on ${API_BASE_URL.replace('/api', '')}`);
        debugError('?? Backend connection issue. Check:');
        debugError('   1. Is backend server running? (npm start in backend folder)');
        debugError(`   2. Is backend running on ${API_BASE_URL.replace('/api', '')}?`);
        debugError('   3. Check browser console for CORS errors');
      } else {
        toast.error(error.response?.data?.message || 'Failed to fetch commissions');
      }
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  };
  const fetchApprovedRestaurants = async () => {
    try {
      const response = await adminAPI.getApprovedRestaurants({
        limit: 1000,
      });
      let restaurantsData = null;
      if (response?.data?.success && response?.data?.data?.restaurants) {
        restaurantsData = response.data.data.restaurants;
      } else if (response?.data?.data?.restaurants) {
        restaurantsData = response.data.data.restaurants;
      } else if (response?.data?.restaurants) {
        restaurantsData = response.data.restaurants;
      }
      if (restaurantsData && Array.isArray(restaurantsData)) {
        setApprovedRestaurants(restaurantsData);
      } else {
        setApprovedRestaurants([]);
      }
    } catch (error) {
      debugError('Error fetching approved restaurants:', error);

      // Handle network errors silently (already handled in fetchCommissions)
      if (error.code !== 'ERR_NETWORK' && error.message !== 'Network Error') {
        toast.error(error.response?.data?.message || 'Failed to fetch approved restaurants');
      }
    }
  };
  const handleToggleStatus = async (commission) => {
    try {
      await adminAPI.toggleRestaurantCommissionStatus(commission._id);
      await fetchCommissions();
      toast.success('Commission status updated successfully');
    } catch (error) {
      debugError('Error toggling status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };
  const handleAdd = () => {
    setSelectedCommission(null);
    setSelectedRestaurant(null);
    setFormData({
      restaurantId: '',
      defaultCommission: {
        type: 'percentage',
        value: DEFAULT_COMMISSION_PERCENT,
      },
      notes: '',
    });
    setFormErrors({});
    setIsRestaurantSelectOpen(true);
  };
  const handleSelectRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setFormData((prev) => ({
      ...prev,
      restaurantId: restaurant._id,
    }));
    setIsRestaurantSelectOpen(false);
    setIsAddEditOpen(true);
  };
  const handleEdit = async (commission) => {
    try {
      setLoading(true);
      const response = await adminAPI.getRestaurantCommissionById(commission._id);
      let commissionData = null;
      if (response?.data?.success && response?.data?.data?.commission) {
        commissionData = response.data.data.commission;
      } else if (response?.data?.data?.commission) {
        commissionData = response.data.data.commission;
      } else if (response?.data?.commission) {
        commissionData = response.data.commission;
      }
      if (commissionData) {
        setSelectedCommission(commissionData);
        setSelectedRestaurant(commissionData.restaurant);

        // Handle restaurant ID - always use Mongo _id for API, display ID is separate
        let restaurantId = '';
        if (commissionData.restaurant) {
          if (typeof commissionData.restaurant === 'object' && commissionData.restaurant._id) {
            restaurantId = commissionData.restaurant._id;
          } else if (typeof commissionData.restaurant === 'string') {
            restaurantId = commissionData.restaurant;
          }
        }
        setFormData({
          restaurantId: restaurantId,
          defaultCommission: {
            type: commissionData.defaultCommission?.type || 'percentage',
            value: commissionData.defaultCommission?.value?.toString() || DEFAULT_COMMISSION_PERCENT,
          },
          notes: commissionData.notes || '',
        });
        setFormErrors({});
        setIsAddEditOpen(true);
      }
    } catch (error) {
      debugError('Error fetching commission:', error);
      toast.error(error.response?.data?.message || 'Failed to load commission');
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = (commission) => {
    setSelectedCommission(commission);
    setIsDeleteOpen(true);
  };
  const confirmDelete = async () => {
    if (!selectedCommission) return;
    try {
      setDeleting(true);
      await adminAPI.deleteRestaurantCommission(selectedCommission._id);
      await fetchCommissions();
      toast.success('Commission deleted successfully');
      setIsDeleteOpen(false);
      setSelectedCommission(null);
    } catch (error) {
      debugError('Error deleting commission:', error);
      toast.error(error.response?.data?.message || 'Failed to delete commission');
    } finally {
      setDeleting(false);
    }
  };
  const validateForm = () => {
    const errors = {};
    if (!formData.restaurantId) {
      errors.restaurantId = 'Restaurant is required';
    }
    if (!formData.defaultCommission.value || parseFloat(formData.defaultCommission.value) < 0) {
      errors.defaultCommission = 'Default commission value is required';
    }
    if (
      formData.defaultCommission.type === 'percentage' &&
      (parseFloat(formData.defaultCommission.value) < 0 || parseFloat(formData.defaultCommission.value) > 100)
    ) {
      errors.defaultCommission = 'Percentage must be between 0-100';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        restaurantId: formData.restaurantId,
        defaultCommission: {
          type: formData.defaultCommission.type,
          value: parseFloat(formData.defaultCommission.value),
        },
        notes: formData.notes,
      };
      if (selectedCommission) {
        await adminAPI.updateRestaurantCommission(selectedCommission._id, payload);
        toast.success('Commission updated successfully');
      } else {
        await adminAPI.createRestaurantCommission(payload);
        toast.success('Commission created successfully');
      }
      await fetchCommissions();
      setIsAddEditOpen(false);
      setSelectedCommission(null);
      setSelectedRestaurant(null);
    } catch (error) {
      debugError('Error saving commission:', error);
      toast.error(error.response?.data?.message || 'Failed to save commission');
    } finally {
      setSaving(false);
    }
  };
  const columnsConfig = {
    si: 'Serial Number',
    restaurant: 'Restaurant Name',
    restaurantId: 'Restaurant ID',
    defaultCommission: 'Default Commission',
    status: 'Status',
    actions: 'Actions',
  };
  const COL_W = { si: 70, restaurant: 190, restaurantId: 130, defaultCommission: 150, status: 120, actions: 110 };
  const COL_LABEL = { si: 'S.No', restaurant: 'Restaurant', restaurantId: 'Restaurant ID', defaultCommission: 'Commission', status: 'Status', actions: 'Actions' };
  const shownKeys = Object.keys(COL_W).filter((k) => visibleColumns[k]);
  const tableCols = shownKeys.map((k) => COL_W[k]);
  const { tablet } = useLayoutWidth();
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Percent}
        title="Restaurant Commission"
        subtitle={loading ? 'Loading commissions\u2026' : `${filteredCommissions.length} restaurant${filteredCommissions.length === 1 ? '' : 's'} with a commission set`}
        breadcrumb={[{ label: 'Food' }, { label: 'Restaurants' }, { label: 'Commission' }]}
        actions={
          <Button onClick={handleAdd} className={BTN_PRIMARY}>
            <UiIcon as={Plus} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>Add commission</Span>
          </Button>
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Input
            type="search"
            placeholder="Search by restaurant name or ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT} flex-1 min-w-[200px]`}
          />
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : filteredCommissions.length === 0 ? (
        <EmptyState
          icon={Percent}
          title="No commissions found"
          message={searchQuery ? 'No restaurant matches this search.' : 'Set a commission for an approved restaurant to get started.'}
          actionLabel={searchQuery ? undefined : 'Add commission'}
          onAction={searchQuery ? undefined : handleAdd}
        />
      ) : (
        <DataTable cols={tableCols}>
          <THead cols={tableCols} labels={shownKeys.map((k) => COL_LABEL[k])} />
          <TBody>
            {filteredCommissions.map((commission, idx) => (
              <Row key={commission._id} last={idx === filteredCommissions.length - 1}>
                {shownKeys.map((key) => {
                  const w = COL_W[key];
                  if (key === 'si') return <Cell key={key} width={w} numberOfLines={1}>{String(commission.sl || '-')}</Cell>;
                  if (key === 'restaurant') return <Cell key={key} width={w}>{commission.restaurantName || commission.restaurant?.name || '-'}</Cell>;
                  if (key === 'restaurantId') return <Cell key={key} width={w} numberOfLines={1}>{commission.restaurantId || commission.restaurant?.restaurantId || '-'}</Cell>;
                  if (key === 'defaultCommission')
                    return (
                      <Cell key={key} width={w}>
                        <Span className="text-sm font-semibold text-slate-900">
                          {commission.defaultCommission?.type === 'percentage' ? `${commission.defaultCommission.value}%` : `\u20B9${commission.defaultCommission?.value ?? 0}`}
                        </Span>
                      </Cell>
                    );
                  if (key === 'status')
                    return (
                      <Cell key={key} width={w}>
                        <Button
                          onClick={() => handleToggleStatus(commission)}
                          className="h-11 justify-center"
                          accessibilityLabel={commission.status ? 'Deactivate this commission' : 'Activate this commission'}
                        >
                          <StatusBadge status={commission.status ? 'active' : 'inactive'} label={commission.status ? 'Active' : 'Inactive'} />
                        </Button>
                      </Cell>
                    );
                  return (
                    <Cell key={key} width={w}>
                      <Div className="flex-row items-center gap-1">
                        <Button onClick={() => handleEdit(commission)} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="Edit commission">
                          <UiIcon as={Edit} size={16} className="text-blue-600" />
                        </Button>
                        <Button onClick={() => handleDelete(commission)} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="Delete commission">
                          <UiIcon as={Trash2} size={16} className="text-red-600" />
                        </Button>
                      </Div>
                    </Cell>
                  );
                })}
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      {/* Restaurant Selection Dialog */}
      <Dialog open={isRestaurantSelectOpen} onOpenChange={setIsRestaurantSelectOpen}>
        <DialogContent className="max-w-xl bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle>Select restaurant</DialogTitle>
          </DialogHeader>
          <Div className="gap-3 px-4 py-4">
            <Input
              type="search"
              placeholder="Search restaurants…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={INPUT}
            />
            <ScrollDiv className="max-h-80" contentClassName="gap-2">
              {filteredRestaurants
                .filter((r) => !r.hasCommissionSetup)
                .map((restaurant) => (
                  <Button
                    key={restaurant._id}
                    onClick={() => handleSelectRestaurant(restaurant)}
                    className="w-full flex-row items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white"
                  >
                    <Div className="flex-1 min-w-0 gap-0.5">
                      <Span className="text-sm font-medium text-slate-900">{restaurant.name}</Span>
                      <Span className="text-xs text-slate-500">{restaurant.restaurantId}</Span>
                    </Div>
                    <UiIcon as={Building2} size={16} className="text-slate-400" />
                  </Button>
                ))}
              {filteredRestaurants.filter((r) => !r.hasCommissionSetup).length === 0 && (
                <Span className="text-center text-sm text-slate-500 py-4">No restaurants available</Span>
              )}
            </ScrollDiv>
          </Div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle>{selectedCommission ? 'Edit restaurant commission' : 'Add restaurant commission'}</DialogTitle>
          </DialogHeader>
          <Div className="gap-3 px-4 py-4">
            {selectedRestaurant && (
              <Div className="p-3 bg-blue-50 rounded-lg gap-0.5">
                <Span className="text-sm font-semibold text-slate-900">{selectedRestaurant.name}</Span>
                <Span className="text-xs text-slate-500">{selectedRestaurant.restaurantId || '-'}</Span>
              </Div>
            )}

            <Div className={tablet ? 'flex-row gap-3' : 'gap-3'}>
              <Div className="flex-1">
                <Field label="Commission type" required>
                  <Select
                    value={formData.defaultCommission.type}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        defaultCommission: {
                          type: nextType,
                          value: nextType === 'percentage' ? DEFAULT_COMMISSION_PERCENT : DEFAULT_COMMISSION_FIXED_AMOUNT,
                        },
                      }));
                    }}
                    className={INPUT}
                  >
                    <Option value="percentage">Percentage (%)</Option>
                    <Option value="amount">Fixed Amount (\u20B9)</Option>
                  </Select>
                </Field>
              </Div>
              <Div className="flex-1">
                <Field
                  label="Commission value"
                  required
                  error={formErrors.defaultCommission}
                  hint={formData.defaultCommission.type === 'percentage' ? 'Platform default: 18%' : 'Suggested default: \u20B950 per order (change as needed)'}
                >
                  <Input
                    type="number"
                    min="0"
                    step={formData.defaultCommission.type === 'percentage' ? '0.1' : '0.01'}
                    value={formData.defaultCommission.value}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        defaultCommission: {
                          ...prev.defaultCommission,
                          value: e.target.value,
                        },
                      }))
                    }
                    className={formErrors.defaultCommission ? INPUT_ERROR : INPUT}
                    placeholder={formData.defaultCommission.type === 'percentage' ? 'e.g., 18' : 'e.g., 50'}
                  />
                </Field>
              </Div>
            </Div>

            <Field label="Notes" hint="Optional">
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 min-h-[72px] rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                rows="2"
                placeholder="Add any notes or remarks…"
              />
            </Field>
          </Div>
          <DialogFooter className="px-4 py-3 border-t border-slate-200 flex-row flex-wrap justify-end gap-2">
            <Button onClick={() => setIsAddEditOpen(false)} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button onClick={handleSave} disabled={saving} className={BTN_PRIMARY}>
              {saving && <UiIcon as={Loader2} size={16} className="text-white" />}
              <Span className={BTN_TEXT_PRIMARY}>{selectedCommission ? 'Update' : 'Create'}</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-white p-0 overflow-hidden">
          <Div className="px-4 pt-4 pb-3">
            <Div className="flex-row items-start gap-3">
              <Div className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <UiIcon as={AlertTriangle} size={18} className="text-red-700" />
              </Div>
              <Div className="flex-1 min-w-0 gap-1.5">
                <DialogTitle>Delete restaurant commission</DialogTitle>
                <Span className="text-sm text-slate-700">
                  Remove commission settings for{' '}
                  <Span className="font-semibold text-slate-900">
                    {selectedCommission?.restaurantName || selectedCommission?.restaurant?.name || 'this restaurant'}
                  </Span>
                  ? This cannot be undone.
                </Span>
              </Div>
            </Div>
          </Div>
          <Div className="flex-row flex-wrap justify-end gap-2 px-4 py-3 border-t border-slate-200">
            <Button type="button" onClick={() => setIsDeleteOpen(false)} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button type="button" onClick={confirmDelete} disabled={deleting} className={BTN_DANGER}>
              {deleting && <UiIcon as={Loader2} size={16} className="text-white" />}
              <Span className={BTN_TEXT_PRIMARY}>Delete</Span>
            </Button>
          </Div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
