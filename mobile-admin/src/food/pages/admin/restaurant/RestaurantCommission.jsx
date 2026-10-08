/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/RestaurantCommission.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, ArrowUpDown, Loader2, X, Building2, AlertTriangle } from 'lucide-react-native';
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
import {
  Button,
  Div,
  H1,
  Input,
  Label,
  Option,
  P,
  ScrollDiv,
  Select,
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
  const tableCols = [
    visibleColumns.si && 80,
    visibleColumns.restaurant && 190,
    visibleColumns.restaurantId && 120,
    visibleColumns.defaultCommission && 160,
    visibleColumns.status && 120,
    visibleColumns.actions && 132,
  ].filter(Boolean);
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="flex items-center gap-2">
              <H1 className="text-2xl font-bold text-slate-900">Restaurant Commission</H1>
              <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 flex items-center justify-center min-w-[2.5rem] h-7">
                {loading ? <Span className="w-5 h-3 rounded bg-slate-300/80 animate-pulse" /> : filteredCommissions.length}
              </Span>
            </Div>

            <Div className="flex items-center gap-2">
              <Button
                onClick={handleAdd}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 transition-all shadow-md"
              >
                <UiIcon as={Plus} className="w-4 h-4" />
                Add Commission
              </Button>
            </Div>
          </Div>

          <Div className="mb-4 flex items-center gap-3">
            <Div className="relative w-full max-w-xl">
              <Input
                type="text"
                placeholder="Search by restaurant name or ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              />
              <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </Div>
          </Div>

          {loading ? (
            <Div className="flex items-center justify-center py-12">
              <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-blue-600" />
            </Div>
          ) : (
            <Div>
              <Table className="w-full" cols={tableCols}>
                <Thead className="bg-slate-50 border-b border-slate-200">
                  <Tr>
                    {visibleColumns.si && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>S.No</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.restaurant && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Restaurant Name</Th>
                    )}
                    {visibleColumns.restaurantId && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Restaurant ID</Th>
                    )}
                    {visibleColumns.defaultCommission && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Default Commission</Th>
                    )}
                    {visibleColumns.status && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Status</Th>}
                    {visibleColumns.actions && <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>}
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {filteredCommissions.length === 0 ? (
                    <Tr>
                      <Td colSpan={Object.values(visibleColumns).filter((v) => v).length} className="px-6 py-8 text-center text-slate-500">
                        No commissions found
                      </Td>
                    </Tr>
                  ) : (
                    filteredCommissions.map((commission) => (
                      <Tr key={commission._id} className="hover:bg-slate-50 transition-colors">
                        {visibleColumns.si && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm font-medium text-slate-700">{commission.sl || '-'}</Span>
                          </Td>
                        )}
                        {visibleColumns.restaurant && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm font-medium text-blue-600">{commission.restaurantName || commission.restaurant?.name || '-'}</Span>
                          </Td>
                        )}
                        {visibleColumns.restaurantId && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm text-slate-700">{commission.restaurantId || commission.restaurant?.restaurantId || '-'}</Span>
                          </Td>
                        )}
                        {visibleColumns.defaultCommission && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm font-medium text-slate-900">
                              {commission.defaultCommission?.type === 'percentage' ? (
                                <>{commission.defaultCommission.value}%</>
                              ) : (
                                <>₹{commission.defaultCommission.value}</>
                              )}
                            </Span>
                          </Td>
                        )}
                        {visibleColumns.status && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Button
                              onClick={() => handleToggleStatus(commission)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${commission.status ? 'bg-green-600' : 'bg-slate-300'}`}
                            >
                              <Span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${commission.status ? 'translate-x-6' : 'translate-x-1'}`}
                              />
                            </Button>
                          </Td>
                        )}
                        {visibleColumns.actions && (
                          <Td className="px-6 py-4 whitespace-nowrap text-center">
                            <Div className="flex items-center justify-center gap-2">
                              <Button onClick={() => handleEdit(commission)} className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors">
                                <UiIcon as={Edit} className="w-4 h-4" />
                              </Button>
                              <Button onClick={() => handleDelete(commission)} className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors">
                                <UiIcon as={Trash2} className="w-4 h-4" />
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
        </Div>
      </Div>

      {/* Restaurant Selection Dialog */}
      <Dialog open={isRestaurantSelectOpen} onOpenChange={setIsRestaurantSelectOpen}>
        <DialogContent className="max-w-xl bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
            <DialogTitle className="text-lg font-semibold text-slate-900">Select Restaurant</DialogTitle>
          </DialogHeader>
          <Div className="space-y-4 px-6 py-4">
            <Div className="relative">
              <Input
                type="text"
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </Div>
            <ScrollDiv className="max-h-80" contentClassName="space-y-2">
              {filteredRestaurants
                .filter((r) => !r.hasCommissionSetup)
                .map((restaurant) => (
                  <Button
                    key={restaurant._id}
                    onClick={() => handleSelectRestaurant(restaurant)}
                    className="w-full p-3 text-left rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all"
                  >
                    <Div className="flex items-center justify-between">
                      <Div>
                        <P className="font-medium text-sm text-slate-900">{restaurant.name}</P>
                        <P className="text-xs text-slate-500 mt-0.5">{restaurant.restaurantId}</P>
                      </Div>
                      <UiIcon as={Building2} className="w-4 h-4 text-slate-400" />
                    </Div>
                  </Button>
                ))}
              {filteredRestaurants.filter((r) => !r.hasCommissionSetup).length === 0 && (
                <P className="text-center text-sm text-slate-500 py-4">No restaurants available</P>
              )}
            </ScrollDiv>
          </Div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
            <DialogTitle className="text-lg font-semibold text-slate-900">
              {selectedCommission ? 'Edit Restaurant Commission' : 'Add Restaurant Commission'}
            </DialogTitle>
          </DialogHeader>
          <Div className="space-y-4 px-6 py-4">
            {/* Restaurant Info */}
            {selectedRestaurant && (
              <Div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <P className="font-semibold text-sm text-slate-900">{selectedRestaurant.name}</P>
                <P className="text-xs text-slate-600 mt-0.5">{selectedRestaurant.restaurantId || '-'}</P>
              </Div>
            )}

            {/* Default Commission */}
            <Div>
              <Label className="block text-sm font-medium text-slate-700 mb-2">
                Default Commission <Span className="text-red-500">*</Span>
              </Label>
              <Div className="grid grid-cols-2 gap-3">
                <Div>
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
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <Option value="percentage">Percentage (%)</Option>
                    <Option value="amount">Fixed Amount (₹)</Option>
                  </Select>
                </Div>
                <Div>
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
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.defaultCommission ? 'border-red-500' : 'border-slate-300'}`}
                    placeholder={formData.defaultCommission.type === 'percentage' ? 'e.g., 18' : 'e.g., 50'}
                  />
                  <P className="text-[11px] text-slate-500 mt-1">
                    {formData.defaultCommission.type === 'percentage' ? 'Platform default: 18%' : 'Suggested default: ₹50 per order (change as needed)'}
                  </P>
                  {formErrors.defaultCommission && <P className="text-xs text-red-500 mt-1">{formErrors.defaultCommission}</P>}
                </Div>
              </Div>
            </Div>

            {/* Notes */}
            <Div>
              <Label className="block text-sm font-medium text-slate-700 mb-2">
                Notes <Span className="text-slate-400 font-normal">(Optional)</Span>
              </Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows="2"
                placeholder="Add any notes or remarks..."
              />
            </Div>
          </Div>
          <DialogFooter className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            <Button
              onClick={() => setIsAddEditOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />}
              {selectedCommission ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-white p-0 overflow-hidden">
          <Div className="px-6 pt-6 pb-4 pr-14">
            <Div className="flex items-start gap-3">
              <Div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 border border-red-100">
                <UiIcon as={AlertTriangle} className="h-5 w-5 text-red-600" />
              </Div>
              <Div className="min-w-0 space-y-1.5">
                <DialogTitle className="text-base font-semibold text-slate-900 leading-snug">Delete Restaurant Commission</DialogTitle>
                <P className="text-sm text-slate-600 leading-relaxed break-words">
                  Remove commission settings for{' '}
                  <Span className="font-semibold text-slate-900">
                    {selectedCommission?.restaurantName || selectedCommission?.restaurant?.name || 'this restaurant'}
                  </Span>
                  ? This cannot be undone.
                </P>
              </Div>
            </Div>
          </Div>
          <Div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-200">
            <Button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-all"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="px-4 py-2.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleting && <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />}
              Delete
            </Button>
          </Div>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
