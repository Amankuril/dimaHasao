/* Ported from Frontend/src/modules/Food/pages/admin/Coupons.jsx (tools/port.js first pass). */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import AdminListPagination from '../../components/admin/AdminListPagination';
import {
  Button,
  Div,
  Form,
  H1,
  H2,
  H3,
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
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../components/web';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const RequiredMark = () => <Span className="text-red-500">*</Span>;
export default function Coupons() {
  const pageRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_coupons_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [offers, setOffers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingCartVisibility, setUpdatingCartVisibility] = useState({});
  const [deletingOffer, setDeletingOffer] = useState({});
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [originalFormData, setOriginalFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    couponType: 'all',
    couponCode: '',
    discountType: 'percentage',
    discountValue: '',
    customerScope: 'all',
    restaurantScope: 'all',
    restaurantId: '',
    endDate: '',
    startDate: '',
    minOrderValue: '',
    maxDiscount: '',
    usageLimit: '',
    perUserLimit: '',
    isFirstOrderOnly: false,
  });
  const isFormDirty = useMemo(() => {
    if (!editingOfferId || !originalFormData) return true;
    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  }, [formData, originalFormData, editingOfferId]);
  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getAllOffers({
        search: debouncedSearch || undefined,
        page: currentPage,
        limit: pageSize,
      });
      if (response?.data?.success) {
        const offerData = response.data.data;
        const list = Array.isArray(offerData?.offers) ? offerData.offers : Array.isArray(offerData) ? offerData : [];
        setOffers(list);
        setTotalItems(response?.data?.data?.total ?? response?.data?.total ?? (Array.isArray(list) ? list.length : 0));
      } else {
        setError('Failed to fetch offers');
        setTotalItems(0);
      }
    } catch (err) {
      debugError('Error fetching offers:', err);
      setError(err?.response?.data?.message || 'Failed to fetch offers');
      setOffers([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, currentPage, pageSize]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);
  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const response = await adminAPI.getRestaurants({
          page: 1,
          limit: 200,
        });
        if (response?.data?.success) {
          const restaurantData = response?.data?.data;
          const list = Array.isArray(restaurantData?.restaurants) ? restaurantData.restaurants : Array.isArray(restaurantData) ? restaurantData : [];
          // Backend returns `restaurantName`; normalize to `name` for this dropdown without affecting other pages.
          const normalized = list.map((r) => ({
            ...r,
            name: r?.name || r?.restaurantName || '',
          }));
          setRestaurants(normalized);
        }
      } catch (err) {
        debugError('Error fetching restaurants:', err);
      }
    };
    fetchRestaurants();
  }, []);
  const todayYMD = () => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  };
  const validateForm = (draft) => {
    const e = {};
    const f = draft || formData;
    const pct = f.discountType === 'percentage';
    const value = Number(f.discountValue);
    if (!String(f.couponCode || '').trim()) e.couponCode = 'Coupon code is required';
    if (!Number.isFinite(value) || value <= 0) e.discountValue = 'Discount must be greater than 0';
    if (pct && (f.maxDiscount === '' || f.maxDiscount === null || f.maxDiscount === undefined)) {
      e.maxDiscount = 'Max discount is required for percentage coupons';
    }
    if (f.minOrderValue !== '' && Number(f.minOrderValue) < 0) e.minOrderValue = 'Min order cannot be negative';
    if (f.usageLimit !== '' && Number(f.usageLimit) < 1) e.usageLimit = 'Usage limit must be at least 1';
    if (f.perUserLimit !== '' && Number(f.perUserLimit) < 1) e.perUserLimit = 'Per user limit must be at least 1';
    const start = f.startDate ? new Date(`${f.startDate}T00:00:00`) : null;
    const end = f.endDate ? new Date(`${f.endDate}T00:00:00`) : null;
    const now = new Date();
    if (end && end < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      e.endDate = 'End date cannot be in the past';
    }
    if (start && end && start > end) {
      e.startDate = 'Start date must be before end date';
      e.endDate = 'End date must be after start date';
    }
    setErrors(e);
    return {
      valid: Object.keys(e).length === 0,
      e,
    };
  };
  const handleFormChange = (field, rawValue) => {
    let value = rawValue;
    if (field === 'couponCode') {
      value = String(value || '').toUpperCase();
    }
    if (field === 'discountType') {
      // When switching to flat-price, clear and disable maxDiscount
      if (value === 'flat-price') {
        setFormData((prev) => {
          const next = {
            ...prev,
            discountType: value,
            maxDiscount: '',
          };
          validateForm(next);
          return next;
        });
        return;
      }
    }
    const next = {
      ...formData,
      [field]: value,
    };
    // Date constraints
    if (field === 'startDate' && next.endDate) {
      // Ensure startDate <= endDate
      const s = next.startDate ? new Date(`${next.startDate}T00:00:00`) : null;
      const e = new Date(`${next.endDate}T00:00:00`);
      if (s && s > e) {
        // keep but will show error
      }
    }
    if (field === 'endDate' && next.startDate) {
      const s = new Date(`${next.startDate}T00:00:00`);
      const e = next.endDate ? new Date(`${next.endDate}T00:00:00`) : null;
      if (e && e < s) {
        // keep but will show error
      }
    }
    setFormData(next);
    validateForm(next);
  };
  const resetForm = () => {
    setFormData({
      couponType: 'all',
      couponCode: '',
      discountType: 'percentage',
      discountValue: '',
      customerScope: 'all',
      restaurantScope: 'all',
      restaurantId: '',
      endDate: '',
      startDate: '',
      minOrderValue: '',
      maxDiscount: '',
      usageLimit: '',
      perUserLimit: '',
      isFirstOrderOnly: false,
    });
    setEditingOfferId(null);
    setOriginalFormData(null);
  };
  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    const { valid } = validateForm();
    if (!valid) {
      toast.error('Please fix the highlighted errors');
      return;
    }
    if (!formData.couponCode.trim()) {
      toast.error('Coupon code is required');
      return;
    }
    const parsedDiscountValue = Number(formData.discountValue);
    if (!Number.isFinite(parsedDiscountValue) || parsedDiscountValue <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }
    if (formData.restaurantScope === 'selected' && !formData.restaurantId) {
      toast.error('Please select a restaurant');
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        couponCode: formData.couponCode.trim(),
        couponType: formData.couponType,
        discountType: formData.discountType,
        discountValue: parsedDiscountValue,
        customerScope: formData.customerScope,
        restaurantScope: formData.restaurantScope,
        restaurantId: formData.restaurantScope === 'selected' ? formData.restaurantId : undefined,
        endDate: formData.endDate || undefined,
        startDate: formData.startDate || undefined,
        minOrderValue: formData.minOrderValue !== '' ? Number(formData.minOrderValue) : undefined,
        maxDiscount: formData.discountType === 'percentage' && formData.maxDiscount !== '' ? Number(formData.maxDiscount) : undefined,
        usageLimit: formData.usageLimit !== '' ? Number(formData.usageLimit) : undefined,
        perUserLimit: formData.perUserLimit !== '' ? Number(formData.perUserLimit) : undefined,
        isFirstOrderOnly: Boolean(formData.isFirstOrderOnly),
      };
      if (editingOfferId) {
        await adminAPI.updateAdminOffer(editingOfferId, payload);
        toast.success('Coupon updated successfully');
      } else {
        await adminAPI.createAdminOffer(payload);
        toast.success('Coupon created successfully');
      }
      resetForm();
      setIsAddOpen(false);
      await fetchOffers();
    } catch (err) {
      debugError('Error saving coupon:', err);
      toast.error(err?.response?.data?.message || 'Failed to save coupon');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleToggleShowInCart = async (offerId, itemId, currentValue) => {
    const key = `${offerId}-${itemId}`;
    try {
      setUpdatingCartVisibility((prev) => ({
        ...prev,
        [key]: true,
      }));
      const nextValue = !currentValue;
      await adminAPI.updateAdminOfferCartVisibility(offerId, itemId, nextValue);
      setOffers((prev) =>
        prev.map((offer) =>
          offer.offerId === offerId && offer.dishId === itemId
            ? {
                ...offer,
                showInCart: nextValue,
              }
            : offer,
        ),
      );
    } catch (err) {
      debugError('Error updating cart visibility:', err);
    } finally {
      setUpdatingCartVisibility((prev) => ({
        ...prev,
        [key]: false,
      }));
    }
  };
  const handleDeleteOffer = async (offerId) => {
    if (!offerId) return;
    if (deletingOffer[offerId]) return;
    try {
      setDeletingOffer((prev) => ({
        ...prev,
        [offerId]: true,
      }));
      await adminAPI.deleteAdminOffer(offerId);
      setOffers((prev) => prev.filter((o) => o.offerId !== offerId));
      toast.success('Coupon deleted successfully');
    } catch (err) {
      debugError('Error deleting offer:', err);
      toast.error(err?.response?.data?.message || 'Failed to delete coupon');
    } finally {
      setDeletingOffer((prev) => ({
        ...prev,
        [offerId]: false,
      }));
    }
  };
  const handleEditClick = (offer) => {
    const formatDateForInput = (dateVal) => {
      if (!dateVal) return '';
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return '';
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      } catch (e) {
        return '';
      }
    };
    const mappedData = {
      couponType: offer.couponType || 'all',
      couponCode: offer.couponCode || '',
      discountType: offer.discountType || 'percentage',
      discountValue: offer.discountType === 'flat-price' ? String(offer.originalPrice || '') : String(offer.discountPercentage || ''),
      customerScope: offer.customerScope || (offer.customerGroup === 'new' ? 'first-time' : 'all'),
      restaurantScope: offer.restaurantScope || 'all',
      restaurantId: offer.restaurantId || '',
      endDate: formatDateForInput(offer.endDate),
      startDate: formatDateForInput(offer.startDate),
      minOrderValue: Number(offer.minOrderValue) > 0 ? String(offer.minOrderValue) : '',
      maxDiscount: offer.maxDiscount !== undefined && offer.maxDiscount !== null ? String(offer.maxDiscount) : '',
      usageLimit: offer.usageLimit !== undefined && offer.usageLimit !== null ? String(offer.usageLimit) : '',
      perUserLimit: offer.perUserLimit !== undefined && offer.perUserLimit !== null ? String(offer.perUserLimit) : '',
      isFirstOrderOnly: offer.isFirstOrderOnly === true,
    };
    setFormData(mappedData);
    setOriginalFormData(mappedData);
    setEditingOfferId(offer.offerId);
    setIsAddOpen(true);
    pageRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  };

  // Filter offers based on search query
  const filteredOffers = offers;
  return (
    <ScrollDiv ref={pageRef} className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
            <Div className="flex items-center gap-3">
              <H1 className="text-2xl font-bold text-slate-900">Restaurant Offers & Coupons</H1>
            </Div>
            <Button
              type="button"
              onClick={() => {
                if (isAddOpen) {
                  resetForm();
                  setIsAddOpen(false);
                } else {
                  setIsAddOpen(true);
                }
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              {isAddOpen ? 'Close' : 'Add Coupon'}
            </Button>
          </Div>

          {isAddOpen && (
            <Form onSubmit={handleCreateCoupon} className="border border-slate-200 rounded-xl p-4 mb-5 bg-slate-50">
              <H3 className="text-base font-semibold text-slate-900 mb-3">{editingOfferId ? 'Edit Coupon' : 'Create Coupon'}</H3>

              <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1">Coupon Type</Label>
                  <Select
                    value={formData.couponType}
                    onChange={(e) => handleFormChange('couponType', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <Option value="all">Both</Option>
                    <Option value="delivery">Delivery</Option>
                    <Option value="takeaway">Takeaway</Option>
                  </Select>
                </Div>

                <Div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1">
                    Coupon Code <RequiredMark />
                  </Label>
                  <Input
                    type="text"
                    value={formData.couponCode}
                    onChange={(e) => handleFormChange('couponCode', e.target.value)}
                    placeholder="e.g. NEWUSER50"
                    className={`w-full px-3 py-2.5 text-sm rounded-lg border ${errors.couponCode ? 'border-red-500' : 'border-slate-300'} bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.couponCode && <P className="mt-1 text-xs text-red-600">{errors.couponCode}</P>}
                </Div>

                <Div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1">Discount Type</Label>
                  <Select
                    value={formData.discountType}
                    onChange={(e) => handleFormChange('discountType', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <Option value="percentage">Percentage</Option>
                    <Option value="flat-price">Flat Amount</Option>
                  </Select>
                </Div>

                <Div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1">
                    {formData.discountType === 'percentage' ? 'Discount (%)' : 'Discount Amount'} <RequiredMark />
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.discountValue}
                    onChange={(e) => handleFormChange('discountValue', e.target.value)}
                    placeholder={formData.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 100'}
                    className={`w-full px-3 py-2.5 text-sm rounded-lg border ${errors.discountValue ? 'border-red-500' : 'border-slate-300'} bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.discountValue && <P className="mt-1 text-xs text-red-600">{errors.discountValue}</P>}
                </Div>

                <Div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1">Customer Scope</Label>
                  <Select
                    value={formData.customerScope}
                    onChange={(e) => handleFormChange('customerScope', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <Option value="all">All Users</Option>
                    <Option value="first-time">First-time Users</Option>
                  </Select>
                </Div>

                <Div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1">Restaurant Scope</Label>
                  <Select
                    value={formData.restaurantScope}
                    onChange={(e) => handleFormChange('restaurantScope', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <Option value="all">All Restaurants</Option>
                    <Option value="selected">Selected Restaurant</Option>
                  </Select>
                </Div>

                <Div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1">Start Date (Optional)</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleFormChange('startDate', e.target.value)}
                    min={editingOfferId ? undefined : todayYMD()}
                    className={`w-full px-3 py-2.5 text-sm rounded-lg border ${errors.startDate ? 'border-red-500' : 'border-slate-300'} bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.startDate && <P className="mt-1 text-xs text-red-600">{errors.startDate}</P>}
                </Div>

                <Div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1">Expiry Date (Optional)</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleFormChange('endDate', e.target.value)}
                    min={formData.startDate || (editingOfferId ? undefined : todayYMD())}
                    className={`w-full px-3 py-2.5 text-sm rounded-lg border ${errors.endDate ? 'border-red-500' : 'border-slate-300'} bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.endDate && <P className="mt-1 text-xs text-red-600">{errors.endDate}</P>}
                </Div>

                <Div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1">Min Order Value (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.minOrderValue}
                    onChange={(e) => handleFormChange('minOrderValue', e.target.value)}
                    placeholder="e.g. 199"
                    className={`w-full px-3 py-2.5 text-sm rounded-lg border ${errors.minOrderValue ? 'border-red-500' : 'border-slate-300'} bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.minOrderValue && <P className="mt-1 text-xs text-red-600">{errors.minOrderValue}</P>}
                </Div>

                <Div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1">
                    Max Discount (₹)
                    {formData.discountType === 'percentage' && (
                      <>
                        {' '}
                        <RequiredMark />
                      </>
                    )}
                    {formData.discountType === 'flat-price' && <Span className="font-normal text-slate-400"> (optional)</Span>}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.maxDiscount}
                    onChange={(e) => handleFormChange('maxDiscount', e.target.value)}
                    placeholder="e.g. 100"
                    disabled={formData.discountType === 'flat-price'}
                    className={`w-full px-3 py-2.5 text-sm rounded-lg border ${errors.maxDiscount ? 'border-red-500' : 'border-slate-300'} bg-white disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {formData.discountType === 'percentage' && errors.maxDiscount && <P className="mt-1 text-xs text-red-600">{errors.maxDiscount}</P>}
                </Div>

                <Div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1">Usage Limit (global)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.usageLimit}
                    onChange={(e) => handleFormChange('usageLimit', e.target.value)}
                    placeholder="e.g. 1000"
                    className={`w-full px-3 py-2.5 text-sm rounded-lg border ${errors.usageLimit ? 'border-red-500' : 'border-slate-300'} bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.usageLimit && <P className="mt-1 text-xs text-red-600">{errors.usageLimit}</P>}
                </Div>

                <Div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1">Per User Limit</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.perUserLimit}
                    onChange={(e) => handleFormChange('perUserLimit', e.target.value)}
                    placeholder="e.g. 1"
                    className={`w-full px-3 py-2.5 text-sm rounded-lg border ${errors.perUserLimit ? 'border-red-500' : 'border-slate-300'} bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.perUserLimit && <P className="mt-1 text-xs text-red-600">{errors.perUserLimit}</P>}
                </Div>

                <Div className="flex items-center gap-2">
                  <Input
                    nativeID="isFirstOrderOnly"
                    type="checkbox"
                    checked={formData.isFirstOrderOnly}
                    onChange={(e) => handleFormChange('isFirstOrderOnly', e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label className="text-sm text-slate-700">First order only</Label>
                </Div>

                {formData.restaurantScope === 'selected' && (
                  <Div className="md:col-span-2 lg:col-span-3">
                    <Label className="block text-xs font-semibold text-slate-600 mb-1">
                      Select Restaurant <RequiredMark />
                    </Label>
                    <Select
                      value={formData.restaurantId}
                      onChange={(e) => handleFormChange('restaurantId', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <Option value="">Choose a restaurant</Option>
                      {restaurants.map((restaurant) => (
                        <Option key={restaurant._id} value={restaurant._id}>
                          {restaurant.name}
                        </Option>
                      ))}
                    </Select>
                  </Div>
                )}
              </Div>

              <Div className="mt-4 flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting || Object.keys(errors).length > 0 || !isFormDirty}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {editingOfferId ? (isSubmitting ? 'Saving...' : 'Save Coupon') : isSubmitting ? 'Creating...' : 'Create Coupon'}
                </Button>
                {editingOfferId && (
                  <Button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setIsAddOpen(false);
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </Button>
                )}
              </Div>
            </Form>
          )}

          {/* Search Bar */}
          <Div className="relative">
            <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by restaurant name, dish name, or coupon code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </Div>
        </Div>

        {/* Offers List */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex items-center justify-between mb-4">
            <H2 className="text-xl font-bold text-slate-900">Offers List</H2>
            <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 flex items-center justify-center min-w-[2.5rem] h-7">
              {loading ? <Span className="w-5 h-3 rounded bg-slate-300/80 animate-pulse" /> : `${totalItems} ${totalItems === 1 ? 'offer' : 'offers'}`}
            </Span>
          </Div>

          {loading ? (
            <Div className="text-center py-20">
              <Div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></Div>
              <P className="text-sm text-slate-500 mt-4">Loading offers...</P>
            </Div>
          ) : error ? (
            <Div className="text-center py-20">
              <P className="text-lg font-semibold text-red-600 mb-1">Error</P>
              <P className="text-sm text-slate-500">{error}</P>
            </Div>
          ) : filteredOffers.length === 0 ? (
            <Div className="text-center py-20">
              <P className="text-lg font-semibold text-slate-700 mb-1">No Offers Found</P>
              <P className="text-sm text-slate-500">{searchQuery ? 'No offers match your search criteria' : 'No offers have been created yet'}</P>
            </Div>
          ) : (
            <Div>
              <Table className="w-full" cols={[70, 170, 160, 140, 130, 140, 120, 110, 110, 110, 120, 120, 140, 180]}>
                <Thead className="bg-slate-50 border-b border-slate-200">
                  <Tr>
                    <Th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">SI</Th>
                    <Th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Restaurant</Th>
                    <Th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Dish</Th>
                    <Th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Coupon Code</Th>
                    <Th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Coupon Type</Th>
                    <Th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Customer Scope</Th>
                    <Th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Discount</Th>
                    <Th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Price</Th>
                    <Th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Min Order</Th>
                    <Th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Usage</Th>
                    <Th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Status</Th>
                    <Th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Show In Cart</Th>
                    <Th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Valid Until</Th>
                    <Th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {filteredOffers.map((offer) => (
                    <Tr key={`${offer.offerId}-${offer.dishId}`} className="hover:bg-slate-50 transition-colors">
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-700">{offer.sl}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-900">
                          {offer.restaurantScope === 'all' || offer.restaurantName === 'All Restaurants' ? 'All Restaurants' : offer.restaurantName}
                        </Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{offer.dishName}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded whitespace-nowrap">{offer.couponCode}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${offer.couponType === 'delivery' ? 'bg-emerald-100 text-emerald-700' : offer.couponType === 'takeaway' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}
                        >
                          {offer.couponType === 'delivery' ? 'Delivery' : offer.couponType === 'takeaway' ? 'Takeaway' : 'Both'}
                        </Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${offer.customerGroup === 'new' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}
                        >
                          {offer.customerGroup === 'new' ? 'First-time Users' : 'All Users'}
                        </Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700 whitespace-nowrap">
                          {offer.discountType === 'flat-price'
                            ? `\u20B9${offer.originalPrice - offer.discountedPrice} OFF`
                            : `${offer.discountPercentage}% OFF${Number(offer.maxDiscount) ? ` (up to \u20B9${Number(offer.maxDiscount)})` : ''}`}
                        </Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">
                          {offer.dishId === 'all' ? (
                            Number(offer.minOrderValue) ? (
                              `Min \u20B9${Number(offer.minOrderValue)}`
                            ) : (
                              'All Items'
                            )
                          ) : (
                            <Div className="flex items-center gap-2">
                              <Span className="text-xs text-slate-400 line-through">
                                {'\u20B9'}
                                {offer.originalPrice}
                              </Span>
                              <Span className="text-sm font-semibold text-green-600">
                                {'\u20B9'}
                                {offer.discountedPrice}
                              </Span>
                            </Div>
                          )}
                        </Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">{Number(offer.minOrderValue) ? `\u20B9${Number(offer.minOrderValue)}` : '—'}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">
                          {`${Number(offer.usedCount || 0)} / ${Number(offer.usageLimit || 0) > 0 ? Number(offer.usageLimit) : '∞'}`}
                        </Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const expired = offer.endDate ? new Date(offer.endDate).getTime() < new Date(new Date().toDateString()).getTime() : false;
                          const status = expired ? 'expired' : offer.status || 'inactive';
                          const cls =
                            status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : status === 'paused'
                                ? 'bg-orange-100 text-orange-700'
                                : status === 'expired'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700';
                          return <Span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>{status}</Span>;
                        })()}
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Button
                          type="button"
                          onClick={() => handleToggleShowInCart(offer.offerId, offer.dishId, offer.showInCart !== false)}
                          disabled={!!updatingCartVisibility[`${offer.offerId}-${offer.dishId}`]}
                          className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${offer.showInCart !== false ? 'bg-green-600' : 'bg-slate-300'} disabled:opacity-60`}
                        >
                          <Span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${offer.showInCart !== false ? 'translate-x-7' : 'translate-x-1'}`}
                          />
                        </Button>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700 whitespace-nowrap">
                          {offer.endDate
                            ? (() => {
                                const d = new Date(offer.endDate);
                                const dd = String(d.getDate()).padStart(2, '0');
                                const month = d.toLocaleString('en-US', {
                                  month: 'short',
                                });
                                const yyyy = d.getFullYear();
                                return `${dd} ${month} ${yyyy}`;
                              })()
                            : 'No expiry'}
                        </Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => handleEditClick(offer)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleDeleteOffer(offer.offerId)}
                            disabled={!!deletingOffer[offer.offerId]}
                            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60"
                          >
                            {deletingOffer[offer.offerId] ? 'Deleting...' : 'Delete'}
                          </Button>
                        </Div>
                      </Td>
                    </Tr>
                  ))}
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
                localStorage.setItem('admin_coupons_pageSize', String(size));
              } catch {}
              setCurrentPage(1);
            }}
            itemLabel="offers"
          />
        </Div>
      </Div>
    </ScrollDiv>
  );
}
