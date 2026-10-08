/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/promotions/PromoCodes.jsx (tools/port.js first pass). */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Filter,
  ChevronRight,
  Trash2,
  Loader2,
  Ticket,
  MapPin,
  Users,
  Zap,
  Percent,
  ArrowLeft,
  Save,
  IndianRupee,
  Calendar,
  ShieldCheck,
  Hash,
  Pencil,
  X,
} from 'lucide-react-native';
import { motion, AnimatePresence } from '../../../../../lib/motion';
import { useLocation, useNavigate, useParams } from '../../../../../lib/webRouter';
import {
  Button,
  Div,
  H1,
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
} from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
const BASE = globalThis.__LEGACY_BACKEND_ORIGIN__ + '/api/v1/admin/promos';
const LIST_PATH = '/taxi/admin/promotions/promo-codes';
const CREATE_PATH = '/taxi/admin/promotions/promo-codes/create';
const Motion = motion;
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
const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed';
const labelClass = 'block text-xs font-medium text-gray-500 mb-1.5';
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
    <Div className="relative">
      <Div
        className="min-h-[42px] w-full border border-gray-200 rounded-lg px-3 py-2 bg-white flex flex-wrap gap-2 cursor-pointer focus-within:border-[#FFC400] focus-within:ring-1 focus-within:ring-[#FFC400] transition-colors"
        onClick={() => setIsOpen((open) => !open)}
      >
        {selectedIds.length === 0 && <Span className="text-gray-400 text-sm py-0.5">Select service locations...</Span>}
        {selectedIds.map((id) => {
          const loc = locations.find((l) => String(l._id) === String(id));
          return loc ? (
            <Span
              key={id}
              className="inline-flex items-center gap-1.5 bg-[#FFC400]/10 text-[#0B1220] px-2.5 py-1 rounded-md text-xs font-medium border border-[#FFC400]/20 transition-colors hover:bg-[#FFC400]/20"
            >
              {loc.service_location_name || loc.name}
              <Button type="button" onClick={(e) => removeLocation(e, id)} className="text-[#0B1220]/50 hover:text-[#0B1220] focus:outline-none">
                <UiIcon as={X} size={12} strokeWidth={3} />
              </Button>
            </Span>
          ) : null;
        })}
        <Input
          type="text"
          className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={selectedIds.length === 0 ? '' : 'Search...'}
        />
      </Div>

      {isOpen && (
        <ScrollDiv className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60">
          {filteredLocations.length === 0 ? (
            <Div className="p-3 text-sm text-gray-500 text-center">No locations found.</Div>
          ) : (
            filteredLocations.map((loc) => {
              const isSelected = selectedIds.includes(String(loc._id));
              return (
                <Div
                  key={loc._id}
                  onClick={() => toggleSelection(String(loc._id))}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                >
                  <Input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="w-4 h-4 text-[#0B1220] rounded border-gray-300 focus:ring-[#FFC400] cursor-pointer"
                  />
                  <Span className="text-sm text-gray-700">{loc.service_location_name || loc.name}</Span>
                </Div>
              );
            })
          )}
        </ScrollDiv>
      )}
    </Div>
  );
};
const HeaderBlock = ({ isCreateRoute, isEditRoute, onBack }) => {
  const title = isEditRoute ? 'Edit Promo Code' : isCreateRoute ? 'Create Promo Code' : 'Promo Code';
  return (
    <Div className="mb-4">
      <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
        <Span>Promotions</Span>
        <UiIcon as={ChevronRight} size={12} />
        <Span className="text-gray-700">{title}</Span>
      </Div>
      <Div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <H1 className="text-xl text-gray-900 font-bold">{title}</H1>
        {isCreateRoute || isEditRoute ? (
          <Button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UiIcon as={ArrowLeft} size={16} /> Back
          </Button>
        ) : null}
      </Div>
    </Div>
  );
};
const SectionCard = ({ icon: Icon, title, description, children }) => (
  <Div className="bg-white rounded-xl border border-gray-200 p-4">
    <Div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
      <Div className="w-9 h-9 rounded-lg bg-[#FFC400]/10 flex items-center justify-center text-[#0B1220]">
        <Icon size={18} />
      </Div>
      <Div>
        <H3 className="text-sm text-gray-900 font-bold">{title}</H3>
        <P className="text-xs text-gray-400">{description}</P>
      </Div>
    </Div>
    {children}
  </Div>
);
const FieldLabel = ({ icon: Icon, children, required = false }) => (
  <Label className={labelClass}>
    <UiIcon as={Icon} size={12} className="inline mr-1 text-gray-400" />
    {children}
    {required ? ' *' : ''}
  </Label>
);
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
  if (!promo.active)
    return {
      label: 'Disabled',
      color: 'bg-gray-100 text-gray-600 border border-gray-200',
    };
  const now = new Date();
  const from = new Date(promo.from);
  const to = new Date(promo.to);
  if (now < from)
    return {
      label: 'Scheduled',
      color: 'bg-[#FFC400]/10 text-[#0B1220] border border-[#FFC400]/30',
    };
  if (now > to)
    return {
      label: 'Expired',
      color: 'bg-rose-50 text-rose-700 border border-rose-200',
    };
  return {
    label: 'Active',
    color: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };
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
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [formData, setFormData] = useState(createInitialFormData);
  const [filters, setFilters] = useState(createInitialFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const token = localStorage.getItem('adminToken') || '';
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${globalThis.__LEGACY_BACKEND_ORIGIN__}/api/v1/admin/promotions/bootstrap`, {
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
        }
      } else {
        console.error('API call failed with status:', res.status);
      }
    } catch (err) {
      console.error('Fetch Data Error:', err);
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
  return (
    <ScrollDiv className="min-h-full bg-gray-50 text-gray-900">
      <HeaderBlock isCreateRoute={isCreateRoute} isEditRoute={isEditRoute} onBack={() => navigate(LIST_PATH)} />

      <AnimatePresence mode="wait">
        {!isFormView ? (
          <Motion.div
            key="list"
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -10,
            }}
            className="space-y-4"
          >
            <Div className="bg-white rounded-xl border border-gray-200 p-4">
              <Div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <Span className="font-medium text-gray-600">Promo codes management</Span>
                  <Span className="hidden sm:inline text-gray-300">|</Span>
                  <Span>Total: {filteredPromos.length}</Span>
                </Div>
                <Div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    onClick={() => setIsFilterOpen((current) => !current)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <UiIcon as={Filter} size={16} /> {isFilterOpen ? 'Hide Filters' : 'Filters'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => navigate(CREATE_PATH)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#FFC400] border border-[#FFC400] rounded-lg hover:bg-[#E5B000] transition-colors"
                  >
                    <UiIcon as={Plus} size={16} /> Add Promo Code
                  </Button>
                </Div>
              </Div>

              {isFilterOpen ? (
                <Div className="mt-5 grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <Div>
                    <Label className={labelClass}>Service Location</Label>
                    <Select
                      value={filters.service_location_id}
                      onChange={(event) => handleFilterChange('service_location_id', event.target.value)}
                      className={inputClass}
                    >
                      <Option value="">All service locations</Option>
                      {locations.map((locationItem) => (
                        <Option key={locationItem._id} value={locationItem._id}>
                          {locationItem.service_location_name || locationItem.name}
                        </Option>
                      ))}
                    </Select>
                  </Div>

                  <Div>
                    <Label className={labelClass}>Transport Type</Label>
                    <Select
                      value={filters.transport_type}
                      onChange={(event) => handleFilterChange('transport_type', event.target.value)}
                      className={inputClass}
                    >
                      <Option value="">All transport types</Option>
                      {PROMO_TRANSPORT_OPTIONS.map((option) => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </Div>

                  <Div>
                    <Label className={labelClass}>Status</Label>
                    <Select value={filters.active} onChange={(event) => handleFilterChange('active', event.target.value)} className={inputClass}>
                      <Option value="">All statuses</Option>
                      <Option value="true">Active</Option>
                      <Option value="false">Disabled</Option>
                      <Option value="expired">Expired</Option>
                      <Option value="scheduled">Scheduled</Option>
                    </Select>
                  </Div>

                  <Div className="flex items-end">
                    <Button
                      type="button"
                      onClick={clearFilters}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 md:w-auto"
                    >
                      Reset
                    </Button>
                  </Div>
                </Div>
              ) : null}
            </Div>

            <Div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <Table cols={[130, 150, 180, 190, 120, 96]} className="w-full text-left">
                  <Thead className="bg-gray-50">
                    <Tr className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <Th className="px-3 py-2">Code</Th>
                      <Th className="px-3 py-2">Transport Type</Th>
                      <Th className="px-3 py-2">Service Location</Th>
                      <Th className="px-3 py-2">From - To Date</Th>
                      <Th className="px-3 py-2">Status</Th>
                      <Th className="px-3 py-2 text-right">Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <Tr>
                        <Td colSpan="6" className="px-6 py-16 text-center text-sm font-medium text-gray-500">
                          <Div className="flex items-center justify-center gap-3">
                            <UiIcon as={Loader2} className="animate-spin text-[#FFC400]" size={24} />
                            Loading Promo Codes...
                          </Div>
                        </Td>
                      </Tr>
                    ) : filteredPromos.length === 0 ? (
                      <Tr>
                        <Td colSpan="6" className="px-6 py-16 text-center">
                          <Div className="flex flex-col items-center gap-3 text-gray-400">
                            <UiIcon as={Ticket} size={44} strokeWidth={1.5} className="text-gray-300" />
                            <P className="text-sm font-medium text-gray-500">No promo codes found.</P>
                            <Button
                              type="button"
                              onClick={() => navigate(CREATE_PATH)}
                              className="mt-2 text-sm font-medium text-[#0B1220] hover:text-[#0B1220] hover:underline"
                            >
                              + Add your first promo code
                            </Button>
                          </Div>
                        </Td>
                      </Tr>
                    ) : (
                      filteredPromos.map((promo) => (
                        <Tr key={promo._id} className="hover:bg-gray-50 transition-colors">
                          <Td className="px-4 py-2 whitespace-nowrap text-[13px] font-semibold text-gray-900">{promo.code}</Td>
                          <Td className="px-4 py-2 whitespace-nowrap text-[13px] text-gray-600">{getTransportTypeLabel(promo.transport_type)}</Td>
                          <Td className="px-4 py-2 whitespace-nowrap text-[13px] text-gray-600 max-w-[200px] truncate">{getPromoLocationLabel(promo)}</Td>
                          <Td className="px-4 py-2 whitespace-nowrap text-[13px] text-gray-600">
                            {formatDate(promo.from)} - {formatDate(promo.to)}
                          </Td>
                          <Td className="px-4 py-2 whitespace-nowrap">
                            {(() => {
                              const statusInfo = getStatusInfo(promo);
                              return (
                                <Span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </Span>
                              );
                            })()}
                          </Td>
                          <Td className="px-4 py-2 whitespace-nowrap text-right">
                            <Div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                onClick={() => handleToggleStatus(promo._id)}
                                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${promo.active ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                              >
                                {promo.active ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button
                                type="button"
                                onClick={() => navigate(`/taxi/admin/promotions/promo-codes/edit/${promo._id}`)}
                                className="p-1.5 text-[#0B1220] bg-[#FFC400]/10 rounded hover:bg-[#FFC400]/20 transition-colors"
                              >
                                <UiIcon as={Pencil} size={16} />
                              </Button>
                              <Button
                                type="button"
                                onClick={() => handleDelete(promo._id)}
                                className="p-1.5 text-rose-600 bg-rose-50 rounded hover:bg-rose-100 transition-colors"
                              >
                                <UiIcon as={Trash2} size={16} />
                              </Button>
                            </Div>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
              </Table>
            </Div>
          </Motion.div>
        ) : (
          <Motion.form
            key="form"
            initial={{
              opacity: 0,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              scale: 0.98,
            }}
            onSubmit={handleSubmit}
            className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4"
          >
            <Div className="space-y-4">
              <SectionCard icon={Ticket} title="Promo Details" description="Enter the basic promo code details">
                <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Div className="md:col-span-2">
                    <FieldLabel icon={MapPin} required>
                      Service Locations
                    </FieldLabel>
                    <LocationMultiSelect
                      locations={locations}
                      selectedIds={formData.service_location_ids}
                      onChange={(ids) => handleFieldChange('service_location_ids', ids)}
                    />
                  </Div>

                  <Div>
                    <FieldLabel icon={Zap} required>
                      Transport Type
                    </FieldLabel>
                    <Select
                      required
                      value={formData.transport_type}
                      onChange={(e) => handleFieldChange('transport_type', e.target.value)}
                      className={inputClass}
                    >
                      <Option value="">Select</Option>
                      {PROMO_TRANSPORT_OPTIONS.map((option) => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </Div>

                  <Div>
                    <FieldLabel icon={Users} required={formData.user_specific}>
                      Users
                    </FieldLabel>
                    <Select
                      required={formData.user_specific}
                      disabled={!formData.user_specific}
                      value={formData.user_id}
                      onChange={(e) => handleFieldChange('user_id', e.target.value)}
                      className={inputClass}
                    >
                      <Option value="">{formData.user_specific ? 'Select Users' : 'All Users'}</Option>
                      {usersList.map((user) => (
                        <Option key={user._id} value={user._id}>
                          {user.name}
                        </Option>
                      ))}
                    </Select>
                  </Div>

                  <Div>
                    <FieldLabel icon={ShieldCheck}>User Specific</FieldLabel>
                    <Label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 cursor-pointer">
                      <Input
                        type="checkbox"
                        checked={formData.user_specific}
                        onChange={(e) => handleUserSpecificChange(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0B1220] focus:ring-[#FFC400] cursor-pointer"
                      />
                      <Div>
                        <P className="text-sm font-medium text-gray-800">Apply for selected user only</P>
                        <P className="text-xs text-gray-400">Unchecked rehne par promo all users ke liye available rahega.</P>
                      </Div>
                    </Label>
                  </Div>

                  <Div>
                    <FieldLabel icon={Ticket} required>
                      Code
                    </FieldLabel>
                    <Input
                      type="text"
                      placeholder="Enter Code"
                      required
                      value={formData.code}
                      onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
                      className={inputClass}
                    />
                  </Div>

                  <Div>
                    <FieldLabel icon={IndianRupee} required>
                      Minimum Trip Amount
                    </FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter Minimum Trip Amount"
                      required
                      value={formData.minimum_trip_amount}
                      onChange={(e) => handleFieldChange('minimum_trip_amount', e.target.value)}
                      className={inputClass}
                    />
                  </Div>

                  <Div>
                    <FieldLabel icon={IndianRupee} required>
                      Maximum Discount Amount
                    </FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter Maximum Discount Amount"
                      required
                      value={formData.maximum_discount_amount}
                      onChange={(e) => handleFieldChange('maximum_discount_amount', e.target.value)}
                      className={inputClass}
                    />
                  </Div>

                  <Div>
                    <FieldLabel icon={IndianRupee} required>
                      Cumulative Maximum Discount Amount
                    </FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter Cumulative Maximum Discount Amount"
                      required
                      value={formData.cumulative_max_discount_amount}
                      onChange={(e) => handleFieldChange('cumulative_max_discount_amount', e.target.value)}
                      className={inputClass}
                    />
                  </Div>

                  <Div>
                    <FieldLabel icon={Percent} required>
                      Discount Percentage
                    </FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter Discount Percentage"
                      required
                      value={formData.discount_percentage}
                      onChange={(e) => handleFieldChange('discount_percentage', e.target.value)}
                      className={inputClass}
                    />
                  </Div>

                  <Div>
                    <FieldLabel icon={Calendar} required>
                      From Date
                    </FieldLabel>
                    <Input type="date" required value={formData.from} onChange={(e) => handleFieldChange('from', e.target.value)} className={inputClass} />
                  </Div>

                  <Div>
                    <FieldLabel icon={Calendar} required>
                      To Date
                    </FieldLabel>
                    <Input type="date" required value={formData.to} onChange={(e) => handleFieldChange('to', e.target.value)} className={inputClass} />
                  </Div>

                  <Div className="md:col-span-2">
                    <FieldLabel icon={Hash} required>
                      How many times the user can use Same promo code?
                    </FieldLabel>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter how many times the user can use same promo code"
                      required
                      value={formData.uses_per_user}
                      onChange={(e) => handleFieldChange('uses_per_user', e.target.value)}
                      className={inputClass}
                    />
                  </Div>

                  <Div className="md:col-span-2">
                    <FieldLabel icon={ShieldCheck}>Promo Status</FieldLabel>
                    <Label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 cursor-pointer">
                      <Input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => handleFieldChange('active', e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0B1220] focus:ring-[#FFC400] cursor-pointer"
                      />
                      <Div>
                        <P className="text-sm font-medium text-gray-800">Promo is active</P>
                        <P className="text-xs text-gray-400">Uncheck to save this promo in deactivated state.</P>
                      </Div>
                    </Label>
                  </Div>
                </Div>
              </SectionCard>
            </Div>

            <Div className="space-y-4">
              <Div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#FFC400] text-white rounded-lg text-sm font-medium hover:bg-[#E5B000] transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {submitting ? <UiIcon as={Loader2} className="animate-spin" size={16} /> : <UiIcon as={Save} size={16} />}
                  {isEditRoute ? 'Update Promo Code' : 'Save Promo Code'}
                </Button>
                <Button
                  type="button"
                  onClick={() => navigate(LIST_PATH)}
                  className="w-full py-3 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </Button>
              </Div>

              <Div className="bg-white rounded-xl border border-gray-200 p-4">
                <H3 className="text-sm text-gray-900 mb-2 font-bold">How It Works</H3>
                <P className="text-xs leading-5 text-gray-500">
                  Service location, transport module, discount limits, end-of-day expiry, status control, and uses-per-user sab fields active hain.
                </P>
              </Div>
            </Div>
          </Motion.form>
        )}
      </AnimatePresence>
    </ScrollDiv>
  );
};
export default PromoCodes;
