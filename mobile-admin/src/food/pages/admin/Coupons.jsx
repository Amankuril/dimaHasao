/* Ported from Frontend/src/modules/Food/pages/admin/Coupons.jsx (tools/port.js first pass). */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Ticket, Plus, X } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import AdminListPagination from '../../components/admin/AdminListPagination';
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
  EmptyState,
  ErrorState,
  TableSkeleton,
  Field,
  INPUT,
  INPUT_ERROR,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../admin/ui';
import { Button, Div, Form, Input, Option, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../components/web';
const debugError = (...args) => {};
export default function Coupons() {
  const pageRef = useRef(null);
  const { tablet, columns } = useLayoutWidth();
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
  const COLS = [56, 170, 150, 140, 120, 140, 160, 140, 110, 110, 120, 120, 130, 150];
  const LABELS = [
    'SI',
    'Restaurant',
    'Dish',
    'Coupon Code',
    'Coupon Type',
    'Customer Scope',
    'Discount',
    'Price',
    'Min Order',
    'Usage',
    'Status',
    'Show In Cart',
    'Valid Until',
    'Actions',
  ];
  const formatDate = (dateVal) => {
    const d = new Date(dateVal);
    const dd = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', {
      month: 'short',
    });
    return `${dd} ${month} ${d.getFullYear()}`;
  };
  return (
    <AdminPage maxWidth={1200} padded={false} scroll={false} contentClassName="flex-1">
      <ScrollDiv ref={pageRef} className="flex-1" contentStyle={{ padding: 16, paddingBottom: 32 }}>
        <PageHeader
          icon={Ticket}
          title="Restaurant Offers & Coupons"
          subtitle={loading ? 'Loading offers…' : `${totalItems} ${totalItems === 1 ? 'offer' : 'offers'} across the district`}
          breadcrumb={[{ label: 'Food' }, { label: 'Promotions' }, { label: 'Coupons' }]}
          actions={
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
              className={isAddOpen ? BTN_SECONDARY : BTN_PRIMARY}
            >
              <UiIcon as={isAddOpen ? X : Plus} size={16} className={isAddOpen ? 'text-slate-600' : 'text-white'} />
              <Span className={isAddOpen ? BTN_TEXT_SECONDARY : BTN_TEXT_PRIMARY}>{isAddOpen ? 'Close' : 'Add Coupon'}</Span>
            </Button>
          }
        />

        {isAddOpen && (
          <Card className="mb-4">
            <SectionTitle>{editingOfferId ? 'Edit Coupon' : 'Create Coupon'}</SectionTitle>
            <Form onSubmit={handleCreateCoupon}>
              <Div className={`grid grid-cols-${columns} gap-3`}>
                <Field label="Coupon Type">
                  <Select value={formData.couponType} onChange={(e) => handleFormChange('couponType', e.target.value)} className={INPUT}>
                    <Option value="all">Both</Option>
                    <Option value="delivery">Delivery</Option>
                    <Option value="takeaway">Takeaway</Option>
                  </Select>
                </Field>

                <Field label="Coupon Code" required error={errors.couponCode}>
                  <Input
                    type="text"
                    value={formData.couponCode}
                    onChange={(e) => handleFormChange('couponCode', e.target.value)}
                    placeholder="e.g. NEWUSER50"
                    className={errors.couponCode ? INPUT_ERROR : INPUT}
                  />
                </Field>

                <Field label="Discount Type">
                  <Select value={formData.discountType} onChange={(e) => handleFormChange('discountType', e.target.value)} className={INPUT}>
                    <Option value="percentage">Percentage</Option>
                    <Option value="flat-price">Flat Amount</Option>
                  </Select>
                </Field>

                <Field label={formData.discountType === 'percentage' ? 'Discount (%)' : 'Discount Amount'} required error={errors.discountValue}>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.discountValue}
                    onChange={(e) => handleFormChange('discountValue', e.target.value)}
                    placeholder={formData.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 100'}
                    className={errors.discountValue ? INPUT_ERROR : INPUT}
                  />
                </Field>

                <Field label="Customer Scope">
                  <Select value={formData.customerScope} onChange={(e) => handleFormChange('customerScope', e.target.value)} className={INPUT}>
                    <Option value="all">All Users</Option>
                    <Option value="first-time">First-time Users</Option>
                  </Select>
                </Field>

                <Field label="Restaurant Scope">
                  <Select value={formData.restaurantScope} onChange={(e) => handleFormChange('restaurantScope', e.target.value)} className={INPUT}>
                    <Option value="all">All Restaurants</Option>
                    <Option value="selected">Selected Restaurant</Option>
                  </Select>
                </Field>

                <Field label="Start Date" hint="Optional" error={errors.startDate}>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleFormChange('startDate', e.target.value)}
                    min={editingOfferId ? undefined : todayYMD()}
                    className={errors.startDate ? INPUT_ERROR : INPUT}
                  />
                </Field>

                <Field label="Expiry Date" hint="Optional" error={errors.endDate}>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleFormChange('endDate', e.target.value)}
                    min={formData.startDate || (editingOfferId ? undefined : todayYMD())}
                    className={errors.endDate ? INPUT_ERROR : INPUT}
                  />
                </Field>

                <Field label="Min Order Value (₹)" error={errors.minOrderValue}>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.minOrderValue}
                    onChange={(e) => handleFormChange('minOrderValue', e.target.value)}
                    placeholder="e.g. 199"
                    className={errors.minOrderValue ? INPUT_ERROR : INPUT}
                  />
                </Field>

                <Field
                  label="Max Discount (₹)"
                  required={formData.discountType === 'percentage'}
                  hint={formData.discountType === 'flat-price' ? 'Not used for flat amounts' : undefined}
                  error={formData.discountType === 'percentage' ? errors.maxDiscount : undefined}
                >
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.maxDiscount}
                    onChange={(e) => handleFormChange('maxDiscount', e.target.value)}
                    placeholder="e.g. 100"
                    disabled={formData.discountType === 'flat-price'}
                    className={errors.maxDiscount ? INPUT_ERROR : INPUT}
                  />
                </Field>

                <Field label="Usage Limit (global)" error={errors.usageLimit}>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.usageLimit}
                    onChange={(e) => handleFormChange('usageLimit', e.target.value)}
                    placeholder="e.g. 1000"
                    className={errors.usageLimit ? INPUT_ERROR : INPUT}
                  />
                </Field>

                <Field label="Per User Limit" error={errors.perUserLimit}>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.perUserLimit}
                    onChange={(e) => handleFormChange('perUserLimit', e.target.value)}
                    placeholder="e.g. 1"
                    className={errors.perUserLimit ? INPUT_ERROR : INPUT}
                  />
                </Field>

                <Div className="flex-row items-center gap-2 h-11">
                  <Input
                    nativeID="isFirstOrderOnly"
                    type="checkbox"
                    checked={formData.isFirstOrderOnly}
                    onChange={(e) => handleFormChange('isFirstOrderOnly', e.target.checked)}
                    className="w-5 h-5"
                  />
                  <Span className="text-sm text-slate-700">First order only</Span>
                </Div>

                {formData.restaurantScope === 'selected' && (
                  <Div className="col-span-full">
                    <Field label="Select Restaurant" required>
                      <Select value={formData.restaurantId} onChange={(e) => handleFormChange('restaurantId', e.target.value)} className={INPUT}>
                        <Option value="">Choose a restaurant</Option>
                        {restaurants.map((restaurant) => (
                          <Option key={restaurant._id} value={restaurant._id}>
                            {restaurant.name}
                          </Option>
                        ))}
                      </Select>
                    </Field>
                  </Div>
                )}
              </Div>

              <Div className={`flex-row items-center gap-2 mt-4 ${tablet ? 'justify-end' : ''}`}>
                {editingOfferId && (
                  <Button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setIsAddOpen(false);
                    }}
                    className={`${BTN_SECONDARY} ${tablet ? '' : 'flex-1'}`}
                  >
                    <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isSubmitting || Object.keys(errors).length > 0 || !isFormDirty}
                  className={`${BTN_PRIMARY} ${tablet ? '' : 'flex-1'}`}
                >
                  <Span className={BTN_TEXT_PRIMARY}>
                    {editingOfferId ? (isSubmitting ? 'Saving…' : 'Save Coupon') : isSubmitting ? 'Creating…' : 'Create Coupon'}
                  </Span>
                </Button>
              </Div>
            </Form>
          </Card>
        )}

        {/* Search */}
        <Card className="mb-4">
          <Toolbar className="mb-0">
            <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white flex-1 min-w-[200px]">
              <UiIcon as={Search} size={16} className="text-slate-400" />
              <Input
                type="text"
                placeholder="Search by restaurant, dish or coupon code"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-sm text-slate-900"
              />
            </Div>
          </Toolbar>
        </Card>

        {/* Offers List */}
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <ErrorState title="Could not load offers" message={error} onRetry={fetchOffers} />
        ) : filteredOffers.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No offers found"
            message={searchQuery ? 'No offers match your search criteria.' : 'No offers have been created yet. Add one to start discounting orders.'}
            actionLabel={searchQuery ? undefined : 'Add Coupon'}
            onAction={searchQuery ? undefined : () => setIsAddOpen(true)}
          />
        ) : (
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={LABELS} />
            <TBody>
              {filteredOffers.map((offer, i, all) => {
                const expired = offer.endDate ? new Date(offer.endDate).getTime() < new Date(new Date().toDateString()).getTime() : false;
                const status = expired ? 'expired' : offer.status || 'inactive';
                const shown = offer.showInCart !== false;
                return (
                  <Row key={`${offer.offerId}-${offer.dishId}`} last={i === all.length - 1}>
                    <Cell width={COLS[0]}>{String(offer.sl ?? '')}</Cell>
                    <Cell width={COLS[1]}>
                      <Span className="text-sm font-semibold text-slate-900">
                        {offer.restaurantScope === 'all' || offer.restaurantName === 'All Restaurants' ? 'All Restaurants' : offer.restaurantName}
                      </Span>
                    </Cell>
                    <Cell width={COLS[2]}>{offer.dishName}</Cell>
                    <Cell width={COLS[3]}>
                      <Span className="text-sm font-semibold text-blue-600">{offer.couponCode}</Span>
                    </Cell>
                    <Cell width={COLS[4]}>
                      <StatusBadge
                        tone={offer.couponType === 'delivery' ? 'success' : offer.couponType === 'takeaway' ? 'warning' : 'neutral'}
                        label={offer.couponType === 'delivery' ? 'Delivery' : offer.couponType === 'takeaway' ? 'Takeaway' : 'Both'}
                      />
                    </Cell>
                    <Cell width={COLS[5]}>
                      <StatusBadge
                        tone={offer.customerGroup === 'new' ? 'info' : 'neutral'}
                        label={offer.customerGroup === 'new' ? 'First-time Users' : 'All Users'}
                      />
                    </Cell>
                    <Cell width={COLS[6]}>
                      {offer.discountType === 'flat-price'
                        ? `₹${offer.originalPrice - offer.discountedPrice} OFF`
                        : `${offer.discountPercentage}% OFF${Number(offer.maxDiscount) ? ` (up to ₹${Number(offer.maxDiscount)})` : ''}`}
                    </Cell>
                    <Cell width={COLS[7]}>
                      {offer.dishId === 'all' ? (
                        Number(offer.minOrderValue) ? (
                          `Min ₹${Number(offer.minOrderValue)}`
                        ) : (
                          'All Items'
                        )
                      ) : (
                        <Div className="flex-row items-center gap-2">
                          <Span className="text-xs text-slate-400 line-through">{`₹${offer.originalPrice}`}</Span>
                          <Span className="text-sm font-semibold text-slate-900">{`₹${offer.discountedPrice}`}</Span>
                        </Div>
                      )}
                    </Cell>
                    <Cell width={COLS[8]}>{Number(offer.minOrderValue) ? `₹${Number(offer.minOrderValue)}` : '—'}</Cell>
                    <Cell width={COLS[9]}>{`${Number(offer.usedCount || 0)} / ${Number(offer.usageLimit || 0) > 0 ? Number(offer.usageLimit) : '∞'}`}</Cell>
                    <Cell width={COLS[10]}>
                      <StatusBadge status={status} tone={status === 'paused' ? 'warning' : undefined} />
                    </Cell>
                    <Cell width={COLS[11]}>
                      <Button
                        type="button"
                        onClick={() => handleToggleShowInCart(offer.offerId, offer.dishId, shown)}
                        disabled={!!updatingCartVisibility[`${offer.offerId}-${offer.dishId}`]}
                        className="h-11 justify-center"
                        accessibilityLabel={`Toggle cart visibility for ${offer.couponCode}`}
                      >
                        <StatusBadge tone={shown ? 'success' : 'neutral'} label={shown ? 'Shown' : 'Hidden'} />
                      </Button>
                    </Cell>
                    <Cell width={COLS[12]}>{offer.endDate ? formatDate(offer.endDate) : 'No expiry'}</Cell>
                    <Cell width={COLS[13]}>
                      <Div className="flex-row items-center gap-2">
                        <Button
                          type="button"
                          onClick={() => handleEditClick(offer)}
                          className="h-11 px-3 rounded-lg bg-blue-600 items-center justify-center"
                          accessibilityLabel={`Edit ${offer.couponCode}`}
                        >
                          <Span className="text-xs font-semibold text-white">Edit</Span>
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleDeleteOffer(offer.offerId)}
                          disabled={!!deletingOffer[offer.offerId]}
                          className="h-11 px-3 rounded-lg bg-red-600 items-center justify-center"
                          accessibilityLabel={`Delete ${offer.couponCode}`}
                        >
                          <Span className="text-xs font-semibold text-white">{deletingOffer[offer.offerId] ? 'Deleting…' : 'Delete'}</Span>
                        </Button>
                      </Div>
                    </Cell>
                  </Row>
                );
              })}
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
              localStorage.setItem('admin_coupons_pageSize', String(size));
            } catch {}
            setCurrentPage(1);
          }}
          itemLabel="offers"
        />
      </ScrollDiv>
    </AdminPage>
  );
}
