/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/promotions/PromoCodes.jsx (tools/port.js first pass). */
import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Filter, Trash2, Loader2, Ticket, ArrowLeft, Save, Pencil, X } from 'lucide-react-native';
import { useLocation, useNavigate, useParams } from '../../../../../lib/webRouter';
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
  ErrorState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, CheckBox, Div, Form, Input, Option, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';
const BASE = API_BASE_URL + '/admin/promos';
const LIST_PATH = '/taxi/admin/promotions/promo-codes';
const CREATE_PATH = '/taxi/admin/promotions/promo-codes/create';
const PROMO_TRANSPORT_OPTIONS = [
  {
    value: 'all',
    label: 'All Modules',
  },
  {
    value: 'self_drive',
    label: 'Self Drive',
  },
  {
    value: 'bus',
    label: 'Bus',
  },
  {
    value: 'taxi',
    label: 'Taxi',
  },
  {
    value: 'delivery',
    label: 'Delivery',
  },
  {
    value: 'pooling',
    label: 'Pooling',
  },
];
const COLS = [120, 140, 170, 180, 120, 150];
const createInitialFormData = () => ({
  service_location_id: '',
  service_location_ids: [],
  transport_type: '',
  user_specific: false,
  user_id: '',
  code: '',
  minimum_trip_amount: '',
  maximum_discount_amount: '',
  cumulative_max_discount_amount: '',
  discount_percentage: '',
  from: '',
  to: '',
  uses_per_user: '1',
  active: true,
});
const createInitialFilters = () => ({
  service_location_id: '',
  transport_type: '',
  active: '',
});
const getPromoLocationIds = (promo) => {
  if (Array.isArray(promo?.service_location_ids) && promo.service_location_ids.length > 0) {
    return promo.service_location_ids.map((value) => String(value));
  }
  if (promo?.service_location_id) {
    return [String(promo.service_location_id)];
  }
  return [];
};
const getPromoLocationLabel = (promo) => {
  const names = Array.isArray(promo?.service_location_names) ? promo.service_location_names.filter(Boolean) : [];
  if (names.length > 0) {
    return names.join(', ');
  }
  return promo?.service_location_name || '-';
};
const normalizeTransportType = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (normalized === 'texi') return 'taxi';
  if (normalized === 'selfdrive') return 'self_drive';
  return normalized;
};
const getTransportTypeLabel = (value) => {
  const normalized = normalizeTransportType(value);
  return PROMO_TRANSPORT_OPTIONS.find((item) => item.value === normalized)?.label || value || '-';
};
const LocationMultiSelect = ({ locations, selectedIds, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filteredLocations = locations.filter((loc) => (loc.service_location_name || loc.name || '').toLowerCase().includes(search.toLowerCase()));
  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };
  const removeLocation = (e, id) => {
    e.stopPropagation();
    onChange(selectedIds.filter((i) => i !== id));
  };
  /*
   * The web closes this dropdown with a document mousedown listener (click
   * outside). There is no document-wide tap on native, so tapping the field
   * toggles the list instead.
   */
  return (
    <Div>
      <Div
        className="min-h-11 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white flex-row flex-wrap items-center gap-2"
        onClick={() => setIsOpen((open) => !open)}
      >
        {selectedIds.length === 0 && <Span className="text-sm text-slate-400">Select service locations…</Span>}
        {selectedIds.map((id) => {
          const loc = locations.find((l) => String(l._id) === String(id));
          return loc ? (
            <Div key={id} className="flex-row items-center gap-1.5 bg-blue-100 px-2.5 py-1 rounded-full">
              <Span className="text-xs font-semibold text-blue-700">{loc.service_location_name || loc.name}</Span>
              <Button type="button" onClick={(e) => removeLocation(e, id)} accessibilityLabel="Remove location" className="w-6 h-6 items-center justify-center">
                <UiIcon as={X} size={12} className="text-blue-700" />
              </Button>
            </Div>
          ) : null;
        })}
        <Input
          type="text"
          className="flex-1 min-w-[120px] text-sm text-slate-900"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={selectedIds.length === 0 ? '' : 'Search…'}
        />
      </Div>

      {isOpen && (
        <ScrollDiv className="mt-1 bg-white border border-slate-200 rounded-lg max-h-60">
          {filteredLocations.length === 0 ? (
            <Div className="p-3">
              <Span className="text-sm text-slate-500 text-center">No locations found.</Span>
            </Div>
          ) : (
            filteredLocations.map((loc) => {
              const isSelected = selectedIds.includes(String(loc._id));
              return (
                <Div
                  key={loc._id}
                  onClick={() => toggleSelection(String(loc._id))}
                  className="flex-row items-center gap-3 px-3 min-h-11 border-b border-slate-100"
                >
                  <CheckBox checked={isSelected} />
                  <Span className="text-sm text-slate-700 flex-1">{loc.service_location_name || loc.name}</Span>
                </Div>
              );
            })
          )}
        </ScrollDiv>
      )}
    </Div>
  );
};
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (err) {
    return dateString;
  }
};
const getStatusInfo = (promo) => {
  if (!promo.active) return { label: 'Disabled' };
  const now = new Date();
  const from = new Date(promo.from);
  const to = new Date(promo.to);
  if (now < from) return { label: 'Scheduled' };
  if (now > to) return { label: 'Expired' };
  return { label: 'Active' };
};
const PromoCodes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isCreateRoute = location.pathname.includes('/create');
  const isEditRoute = location.pathname.includes('/edit/');
  const isFormView = isCreateRoute || isEditRoute;
  const [promos, setPromos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [formData, setFormData] = useState(createInitialFormData);
  const [filters, setFilters] = useState(createInitialFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const token = localStorage.getItem('adminToken') || '';
  const { tablet } = useLayoutWidth();
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/promotions/bootstrap`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPromos(data.data?.promo_codes || []);
          setLocations(data.data?.service_locations || []);
          setUsersList(data.data?.users || []);
        } else {
          console.error('API returned failure:', data.message);
          setLoadError(data.message || 'Failed to load promo codes');
        }
      } else {
        console.error('API call failed with status:', res.status);
        setLoadError(`Request failed with status ${res.status}`);
      }
    } catch (err) {
      console.error('Fetch Data Error:', err);
      setLoadError(err?.message || 'Failed to load promo codes');
    } finally {
      setIsLoading(false);
    }
  }, [token]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    if (isEditRoute && id && promos.length > 0) {
      const promo = promos.find((p) => String(p._id) === String(id));
      if (promo) {
        setFormData({
          service_location_id: promo.service_location_id || '',
          service_location_ids: getPromoLocationIds(promo),
          transport_type: promo.transport_type || '',
          user_specific: promo.user_specific === true,
          user_id: promo.user_id || '',
          code: promo.code || '',
          minimum_trip_amount: promo.minimum_trip_amount || '',
          maximum_discount_amount: promo.maximum_discount_amount || '',
          cumulative_max_discount_amount: promo.cumulative_max_discount_amount || '',
          discount_percentage: promo.discount_percentage || '',
          from: promo.from ? new Date(promo.from).toISOString().split('T')[0] : '',
          to: promo.to ? new Date(promo.to).toISOString().split('T')[0] : '',
          uses_per_user: promo.uses_per_user || '1',
          active: promo.active !== false,
        });
      }
    } else if (isCreateRoute) {
      setFormData(createInitialFormData());
    }
  }, [isEditRoute, isCreateRoute, id, promos]);
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const clearFilters = () => {
    setFilters(createInitialFilters());
  };
  const handleUserSpecificChange = (checked) => {
    setFormData((prev) => ({
      ...prev,
      user_specific: checked,
      user_id: checked ? prev.user_id : '',
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.code || formData.code.trim() === '') {
      return alert('Promo code is required');
    }
    if (formData.service_location_ids.length === 0) {
      return alert('At least one service location is required');
    }
    if (!formData.transport_type) {
      return alert('Transport type is required');
    }
    const minTripAmount = Number(formData.minimum_trip_amount);
    if (isNaN(minTripAmount) || minTripAmount < 0) {
      return alert('Minimum trip amount must be a valid positive number');
    }
    const discPercentage = Number(formData.discount_percentage);
    const maxDiscAmount = Number(formData.maximum_discount_amount);
    if ((isNaN(discPercentage) || discPercentage <= 0) && (isNaN(maxDiscAmount) || maxDiscAmount <= 0)) {
      return alert('Please provide a valid discount percentage or discount amount');
    }
    if (!formData.from) return alert('From Date is required');
    if (!formData.to) return alert('To Date is required');
    const fromDate = new Date(formData.from);
    const toDate = new Date(formData.to);
    if (toDate < fromDate) {
      return alert('To Date cannot be before From Date');
    }
    const uses = Number(formData.uses_per_user);
    if (isNaN(uses) || uses < 1) {
      return alert('Usage limit per user must be at least 1');
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        code: formData.code.toUpperCase(),
        minimum_trip_amount: Number(formData.minimum_trip_amount),
        maximum_discount_amount: Number(formData.maximum_discount_amount),
        cumulative_max_discount_amount: Number(formData.cumulative_max_discount_amount),
        discount_percentage: Number(formData.discount_percentage),
        uses_per_user: Number(formData.uses_per_user),
        service_location_id: formData.service_location_ids[0] || formData.service_location_id,
        service_location_ids: formData.service_location_ids,
        user_id: formData.user_specific ? formData.user_id : '',
      };
      const url = isEditRoute ? `${BASE}/${id}` : BASE;
      const method = isEditRoute ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setFormData(createInitialFormData());
        await fetchData();
        navigate(LIST_PATH);
      } else {
        alert(data.message || `Failed to ${isEditRoute ? 'update' : 'create'} promo`);
      }
    } catch (error) {
      console.error(error);
      alert('Network Error');
    } finally {
      setSubmitting(false);
    }
  };
  const filteredPromos = promos.filter((promo) => {
    const matchesLocation = !filters.service_location_id || getPromoLocationIds(promo).includes(String(filters.service_location_id));
    const matchesTransport =
      !filters.transport_type || normalizeTransportType(promo.transport_type || 'all') === normalizeTransportType(filters.transport_type);
    const statusInfo = getStatusInfo(promo);
    const matchesStatus =
      filters.active === '' ||
      (filters.active === 'true'
        ? statusInfo.label === 'Active'
        : filters.active === 'false'
          ? statusInfo.label === 'Disabled'
          : filters.active === 'expired'
            ? statusInfo.label === 'Expired'
            : filters.active === 'scheduled'
              ? statusInfo.label === 'Scheduled'
              : true);
    return matchesLocation && matchesTransport && matchesStatus;
  });
  const handleDelete = async (promoId) => {
    if (!(await window.confirmAsync('Are you sure you want to delete this promo code?'))) return;
    try {
      const res = await fetch(`${BASE}/${promoId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      } else {
        alert(data.message || 'Failed to delete');
      }
    } catch (err) {
      console.error(err);
      alert('Network Error');
    }
  };
  const handleToggleStatus = async (promoId) => {
    try {
      const res = await fetch(`${BASE}/${promoId}/toggle`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      } else {
        alert(data.message || 'Failed to update promo status');
      }
    } catch (err) {
      console.error(err);
      alert('Network Error');
    }
  };
  const half = tablet ? 'flex-1' : '';
  return (
    <AdminPage maxWidth={isFormView ? 720 : 1200}>
      <PageHeader
        icon={Ticket}
        title={isEditRoute ? 'Edit promo code' : isCreateRoute ? 'Create promo code' : 'Promo codes'}
        subtitle={isFormView ? 'Discount limits, validity window and who the code applies to' : 'Rider discount codes across the transport modules'}
        breadcrumb={[
          { label: 'Promotions' },
          { label: 'Promo codes' },
          ...(isEditRoute ? [{ label: 'Edit' }] : isCreateRoute ? [{ label: 'Create' }] : []),
        ]}
        actions={
          isFormView ? (
            <Button type="button" onClick={() => navigate(LIST_PATH)} className={BTN_SECONDARY}>
              <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Back</Span>
            </Button>
          ) : (
            <>
              <Button type="button" onClick={() => navigate(CREATE_PATH)} className={BTN_PRIMARY}>
                <UiIcon as={Plus} size={16} className="text-white" />
                <Span className={BTN_TEXT_PRIMARY}>Add promo code</Span>
              </Button>
              <Button type="button" onClick={() => setIsFilterOpen((current) => !current)} className={BTN_SECONDARY}>
                <UiIcon as={Filter} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>{isFilterOpen ? 'Hide filters' : 'Filters'}</Span>
              </Button>
            </>
          )
        }
      />

      {!isFormView ? (
        <>
          <Card className="mb-4">
            <SectionTitle className={isFilterOpen ? undefined : 'mb-0'}>Promo codes · {filteredPromos.length} total</SectionTitle>

            {isFilterOpen ? (
              <Div className="gap-3">
                <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
                  <Field label="Service location" className={half}>
                    <Select
                      value={filters.service_location_id}
                      onChange={(event) => handleFilterChange('service_location_id', event.target.value)}
                      className={INPUT}
                    >
                      <Option value="">All service locations</Option>
                      {locations.map((locationItem) => (
                        <Option key={locationItem._id} value={locationItem._id}>
                          {locationItem.service_location_name || locationItem.name}
                        </Option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Transport type" className={half}>
                    <Select value={filters.transport_type} onChange={(event) => handleFilterChange('transport_type', event.target.value)} className={INPUT}>
                      <Option value="">All transport types</Option>
                      {PROMO_TRANSPORT_OPTIONS.map((option) => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </Field>
                </Div>

                <Field label="Status">
                  <Select value={filters.active} onChange={(event) => handleFilterChange('active', event.target.value)} className={INPUT}>
                    <Option value="">All statuses</Option>
                    <Option value="true">Active</Option>
                    <Option value="false">Disabled</Option>
                    <Option value="expired">Expired</Option>
                    <Option value="scheduled">Scheduled</Option>
                  </Select>
                </Field>

                <Toolbar className="mb-0">
                  <Button type="button" onClick={clearFilters} className={BTN_SECONDARY}>
                    <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
                  </Button>
                </Toolbar>
              </Div>
            ) : null}
          </Card>

          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : loadError ? (
            <ErrorState title="Could not load promo codes" message={loadError} onRetry={fetchData} />
          ) : filteredPromos.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No promo codes found"
              message={
                filters.service_location_id || filters.transport_type || filters.active
                  ? 'No promo code matches the filters you picked.'
                  : 'Add your first promo code and it will be listed here.'
              }
              actionLabel="Add promo code"
              onAction={() => navigate(CREATE_PATH)}
            />
          ) : (
            <DataTable cols={COLS}>
              <THead cols={COLS} labels={['Code', 'Transport type', 'Service location', 'From – to date', 'Status', 'Action']} />
              <TBody>
                {filteredPromos.map((promo, i) => {
                  const statusInfo = getStatusInfo(promo);
                  return (
                    <Row key={promo._id} last={i === filteredPromos.length - 1}>
                      <Cell width={COLS[0]}>
                        <Span className="text-sm font-semibold text-slate-900" numberOfLines={2}>
                          {promo.code}
                        </Span>
                      </Cell>
                      <Cell width={COLS[1]}>{getTransportTypeLabel(promo.transport_type)}</Cell>
                      <Cell width={COLS[2]}>{getPromoLocationLabel(promo)}</Cell>
                      <Cell width={COLS[3]}>
                        {formatDate(promo.from)} - {formatDate(promo.to)}
                      </Cell>
                      <Cell width={COLS[4]}>
                        <StatusBadge status={statusInfo.label} />
                      </Cell>
                      <Cell width={COLS[5]} align="right">
                        <Div className="flex-row items-center justify-end gap-1">
                          <Button
                            type="button"
                            onClick={() => handleToggleStatus(promo._id)}
                            className="h-11 px-3 rounded-lg border border-slate-300 bg-white items-center justify-center"
                          >
                            <Span className={`text-xs font-semibold ${promo.active ? 'text-red-600' : 'text-green-700'}`}>
                              {promo.active ? 'Deactivate' : 'Activate'}
                            </Span>
                          </Button>
                          <Button
                            type="button"
                            onClick={() => navigate(`/taxi/admin/promotions/promo-codes/edit/${promo._id}`)}
                            accessibilityLabel={`Edit ${promo.code}`}
                            className="w-11 h-11 items-center justify-center rounded-lg border border-slate-200 bg-white"
                          >
                            <UiIcon as={Pencil} size={16} className="text-slate-600" />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleDelete(promo._id)}
                            accessibilityLabel={`Delete ${promo.code}`}
                            className="w-11 h-11 items-center justify-center rounded-lg border border-slate-200 bg-white"
                          >
                            <UiIcon as={Trash2} size={16} className="text-red-600" />
                          </Button>
                        </Div>
                      </Cell>
                    </Row>
                  );
                })}
              </TBody>
            </DataTable>
          )}
        </>
      ) : (
        <Form onSubmit={handleSubmit}>
          <Card className="mb-4 gap-4">
            <SectionTitle className="mb-0">Promo details</SectionTitle>

            <Field label="Service locations" required>
              <LocationMultiSelect
                locations={locations}
                selectedIds={formData.service_location_ids}
                onChange={(ids) => handleFieldChange('service_location_ids', ids)}
              />
            </Field>

            <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
              <Field label="Transport type" required className={half}>
                <Select required value={formData.transport_type} onChange={(e) => handleFieldChange('transport_type', e.target.value)} className={INPUT}>
                  <Option value="">Select</Option>
                  {PROMO_TRANSPORT_OPTIONS.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Field>

              <Field label="Users" required={formData.user_specific} className={half}>
                <Select
                  required={formData.user_specific}
                  disabled={!formData.user_specific}
                  value={formData.user_id}
                  onChange={(e) => handleFieldChange('user_id', e.target.value)}
                  className={INPUT}
                >
                  <Option value="">{formData.user_specific ? 'Select Users' : 'All Users'}</Option>
                  {usersList.map((user) => (
                    <Option key={user._id} value={user._id}>
                      {user.name}
                    </Option>
                  ))}
                </Select>
              </Field>
            </Div>

            <Field label="User specific">
              <Div className="flex-row items-start gap-3 rounded-lg border border-slate-300 bg-white px-3 py-3">
                <CheckBox checked={formData.user_specific} onChange={(e) => handleUserSpecificChange(e.target.checked)} />
                <Div className="flex-1 min-w-0">
                  <Span className="text-sm font-medium text-slate-900">Apply for the selected user only</Span>
                  <Span className="text-xs text-slate-500">Left unchecked, the promo stays available to every user.</Span>
                </Div>
              </Div>
            </Field>

            <Field label="Code" required>
              <Input
                type="text"
                placeholder="Enter Code"
                required
                value={formData.code}
                onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
                className={INPUT}
              />
            </Field>

            <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
              <Field label="Minimum trip amount" required className={half}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter Minimum Trip Amount"
                  required
                  value={formData.minimum_trip_amount}
                  onChange={(e) => handleFieldChange('minimum_trip_amount', e.target.value)}
                  className={INPUT}
                />
              </Field>

              <Field label="Maximum discount amount" required className={half}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter Maximum Discount Amount"
                  required
                  value={formData.maximum_discount_amount}
                  onChange={(e) => handleFieldChange('maximum_discount_amount', e.target.value)}
                  className={INPUT}
                />
              </Field>
            </Div>

            <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
              <Field label="Cumulative maximum discount amount" required className={half}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter Cumulative Maximum Discount Amount"
                  required
                  value={formData.cumulative_max_discount_amount}
                  onChange={(e) => handleFieldChange('cumulative_max_discount_amount', e.target.value)}
                  className={INPUT}
                />
              </Field>

              <Field label="Discount percentage" required className={half}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter Discount Percentage"
                  required
                  value={formData.discount_percentage}
                  onChange={(e) => handleFieldChange('discount_percentage', e.target.value)}
                  className={INPUT}
                />
              </Field>
            </Div>

            <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
              <Field label="From date" required className={half}>
                <Input type="date" required value={formData.from} onChange={(e) => handleFieldChange('from', e.target.value)} className={INPUT} />
              </Field>
              <Field label="To date" required className={half}>
                <Input type="date" required value={formData.to} onChange={(e) => handleFieldChange('to', e.target.value)} className={INPUT} />
              </Field>
            </Div>

            <Field label="Uses per user" required hint="How many times one user can redeem the same code.">
              <Input
                type="number"
                min="1"
                placeholder="Enter how many times the user can use same promo code"
                required
                value={formData.uses_per_user}
                onChange={(e) => handleFieldChange('uses_per_user', e.target.value)}
                className={INPUT}
              />
            </Field>

            <Field label="Promo status">
              <Div className="flex-row items-start gap-3 rounded-lg border border-slate-300 bg-white px-3 py-3">
                <CheckBox checked={formData.active} onChange={(e) => handleFieldChange('active', e.target.checked)} />
                <Div className="flex-1 min-w-0">
                  <Span className="text-sm font-medium text-slate-900">Promo is active</Span>
                  <Span className="text-xs text-slate-500">Uncheck to save this promo deactivated.</Span>
                </Div>
              </Div>
            </Field>
          </Card>

          <Card className="mb-4 gap-2">
            <Button type="submit" disabled={submitting} className={`${BTN_PRIMARY} ${submitting ? 'opacity-60' : ''}`}>
              {submitting ? <UiIcon as={Loader2} size={16} className="text-white" /> : <UiIcon as={Save} size={16} className="text-white" />}
              <Span className={BTN_TEXT_PRIMARY}>{isEditRoute ? 'Update promo code' : 'Save promo code'}</Span>
            </Button>
            <Button type="button" onClick={() => navigate(LIST_PATH)} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
          </Card>

          <Card>
            <SectionTitle className="mb-2">How it works</SectionTitle>
            <Span className="text-sm text-slate-500">
              Service location, transport module, discount limits, the validity window, status control and uses-per-user are all live fields.
            </Span>
          </Card>
        </Form>
      )}
    </AdminPage>
  );
};
export default PromoCodes;
