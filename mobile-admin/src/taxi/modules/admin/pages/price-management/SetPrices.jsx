/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/SetPrices.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, Save, Zap, Gift, Filter, Cone, Info, X, DollarSign } from 'lucide-react-native';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';
import { useLocation, useNavigate, useParams } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
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
  Pagination,
  EmptyState,
  ErrorState,
  LoadingState,
  TableSkeleton,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, Div, Form, Input, Label, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
const PRICE_COLS = [150, 150, 170, 110, 230];
const PRICE_LABELS = ['Zone', 'Transport type', 'Vehicle type', 'Status', 'Actions'];
const paymentTypeOptions = [
  {
    value: 'cash',
    label: 'Cash',
  },
  {
    value: 'online',
    label: 'Online',
  },
  {
    value: 'wallet',
    label: 'Wallet',
  },
];
const ALL_ZONES_OPTION_VALUE = '__all_zones__';
const isAllZonesSelection = (value) => String(value || '').trim() === ALL_ZONES_OPTION_VALUE;
const normalizePaymentTypes = (value) => {
  const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const normalized = items
    .map((item) =>
      String(item || '')
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
  return Array.from(new Set(normalized)).filter((item) => paymentTypeOptions.some((option) => option.value === item));
};
const normalizeTransportType = (value = '') => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'delivery') return 'delivery';
  if (normalized === 'pooling') return 'pooling';
  if (normalized === 'both' || normalized === 'all') return 'both';
  return normalized === 'taxi' ? 'taxi' : '';
};
const getVehicleTransportType = (vehicle = {}) => normalizeTransportType(vehicle?.transport_type || vehicle?.is_taxi || '');
const formatTransportTypeLabel = (value = '') => {
  const normalized = normalizeTransportType(value);
  if (normalized === 'delivery') return 'Delivery';
  if (normalized === 'pooling') return 'Pooling';
  if (normalized === 'both') return 'Both';
  return normalized === 'taxi' ? 'Taxi' : 'Not assigned';
};
const buildSetPriceGroupingSignature = (item = {}) =>
  JSON.stringify({
    pricing_scope: item.pricing_scope || 'ride',
    transport_type: item.transport_type || '',
    vehicle_type: item.type_id || item.vehicle_type || '',
    service_location_id: item.service_location_id || '',
    vehicle_type_name: item.vehicle_type_name || '',
    payment_type: normalizePaymentTypes(item.payment_type),
    active: Number(item.active ?? 0),
    status: item.status || '',
    service_tax: Number(item.service_tax ?? 0),
    base_price: Number(item.base_price ?? 0),
    base_distance: Number(item.base_distance ?? 0),
    price_per_distance: Number(item.price_per_distance ?? 0),
    time_price: Number(item.time_price ?? 0),
    waiting_charge: Number(item.waiting_charge ?? 0),
    free_waiting_before: Number(item.free_waiting_before ?? 0),
    free_waiting_after: Number(item.free_waiting_after ?? 0),
    outstation_base_price: Number(item.outstation_base_price ?? 0),
    outstation_base_distance: Number(item.outstation_base_distance ?? 0),
    outstation_price_per_distance: Number(item.outstation_price_per_distance ?? 0),
    outstation_time_price: Number(item.outstation_time_price ?? 0),
  });
const collapseAllZonesSetPrices = (items = []) => {
  if (!items.length) {
    return items;
  }
  const grouped = new Map();
  items.forEach((item) => {
    const signature = buildSetPriceGroupingSignature(item);
    const bucket = grouped.get(signature) || [];
    bucket.push(item);
    grouped.set(signature, bucket);
  });
  return Array.from(grouped.values()).flatMap((bucket) => {
    const uniqueZoneIds = new Set(bucket.map((item) => String(item?.zone_id || '').trim()).filter(Boolean));
    const isAllZonesGroup = uniqueZoneIds.size > 1;
    if (!isAllZonesGroup) {
      return bucket;
    }
    const [firstItem] = bucket;
    return [
      {
        ...firstItem,
        zone_id: ALL_ZONES_OPTION_VALUE,
        zone_name: 'All',
        is_all_zones: true,
        grouped_ids: bucket.map((item) => String(item?.id || item?._id || '')).filter(Boolean),
        grouped_zone_ids: Array.from(uniqueZoneIds),
      },
    ];
  });
};
const NON_NEGATIVE_FORM_FIELDS = new Set([
  'admin_commission_from_driver',
  'service_tax',
  'order_number',
  'base_price',
  'base_distance',
  'price_per_distance',
  'time_price',
  'waiting_charge',
  'free_waiting_before',
  'free_waiting_after',
  'support_airport_fee',
  'airport_surge',
  'outstation_base_price',
  'outstation_base_distance',
  'outstation_price_per_distance',
  'outstation_time_price',
  'price_per_seat',
  'shared_price_per_distance',
  'shared_cancel_fee',
  'user_cancellation_fee',
  'driver_cancellation_fee',
]);
const clampNonNegativeInput = (field, value) => {
  if (!NON_NEGATIVE_FORM_FIELDS.has(field)) {
    return value;
  }
  if (value === '' || value === null || value === undefined) {
    return '';
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }
  return String(Math.max(0, numeric));
};
const togglePaymentType = (currentValue, targetValue) => {
  const currentItems = normalizePaymentTypes(currentValue);
  if (currentItems.includes(targetValue)) {
    return currentItems.filter((item) => item !== targetValue);
  }
  return [...currentItems, targetValue];
};
/** A 44 px-tall switch, so the row target is tappable on a phone. */
const StatusToggle = ({ active, onToggle, label }) => (
  <Button
    type="button"
    accessibilityLabel={label}
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    className="h-11 justify-center"
  >
    <Div className={`w-12 h-7 rounded-full justify-center px-1 ${active ? 'bg-green-600' : 'bg-slate-300'}`}>
      <Div className={`w-5 h-5 rounded-full bg-white ${active ? 'self-end' : 'self-start'}`} />
    </Div>
  </Button>
);
const initialFormState = {
  zone_id: '',
  transport_type: '',
  vehicle_type: '',
  payment_type: ['cash'],
  admin_commision_type: '1',
  admin_commision: '',
  admin_commission_type_from_driver: '1',
  admin_commission_from_driver: '',
  service_tax: '',
  order_number: '',
  base_price: '',
  base_distance: '',
  price_per_distance: '',
  time_price: '',
  waiting_charge: '',
  free_waiting_before: '',
  free_waiting_after: '',
  enable_airport_ride: false,
  support_airport_fee: '',
  airport_surge: '',
  enable_outstation_ride: false,
  outstation_base_price: '',
  outstation_base_distance: '',
  outstation_price_per_distance: '',
  outstation_time_price: '',
  enable_ride_sharing: false,
  enable_shared_ride: 0,
  price_per_seat: '',
  shared_price_per_distance: '',
  shared_cancel_fee: '',
  user_cancellation_fee: '',
  user_cancellation_fee_type: 'percentage',
  driver_cancellation_fee: '',
  driver_cancellation_fee_type: 'percentage',
  cancellation_fee_goes_to: 'admin',
  status: 'active',
  active: 1,
};
const SetPrices = ({ mode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isCreateOrEdit = mode === 'create' || mode === 'edit';
  const view = isCreateOrEdit ? 'create' : 'list';
  const editingId = id || null;
  const [prizes, setPrizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paginator, setPaginator] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
    from: 0,
    to: 0,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [transportFilter, setTransportFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [zones, setZones] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [loadError, setLoadError] = useState('');
  const { columns, tablet } = useLayoutWidth();
  const selectedVehicleType = React.useMemo(
    () => vehicleTypes.find((vehicle) => String(vehicle._id || vehicle.id) === String(formData.vehicle_type || '')) || null,
    [formData.vehicle_type, vehicleTypes],
  );
  const derivedTransportType = React.useMemo(() => getVehicleTransportType(selectedVehicleType), [selectedVehicleType]);
  const baseUrl = `${API_BASE_URL}/admin`;
  const token = localStorage.getItem('adminToken');
  useEffect(() => {
    fetchInitialData();
  }, [view, editingId, location.key, location.state?.refreshAt, page, itemsPerPage, searchTerm, transportFilter, statusFilter, zoneFilter, vehicleFilter]);
  useEffect(() => {
    if (mode === 'create') {
      setFormData({
        ...initialFormState,
      });
    }
  }, [mode]);
  useEffect(() => {
    if (!selectedVehicleType) {
      return;
    }
    const nextTransportType = getVehicleTransportType(selectedVehicleType);
    if (!nextTransportType) {
      return;
    }
    setFormData((previous) =>
      previous.transport_type === nextTransportType
        ? previous
        : {
            ...previous,
            transport_type: nextTransportType,
          },
    );
  }, [selectedVehicleType]);
  const fetchInitialData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const auth = {
        Authorization: `Bearer ${token}`,
      };
      if (view === 'list') {
        const [pricesResponse, zonesResponse, vehiclesResponse] = await Promise.all([
          adminService.getSetPrices({
            scope: 'ride',
            page,
            limit: itemsPerPage,
            search: searchTerm,
            transport_type: transportFilter || undefined,
            status: statusFilter || undefined,
            zone_id: zoneFilter && zoneFilter !== ALL_ZONES_OPTION_VALUE ? zoneFilter : undefined,
            vehicle_type: vehicleFilter || undefined,
          }),
          adminService.getZones(),
          adminService.getVehicleTypes(),
        ]);
        const prizesData = pricesResponse?.data || {};
        const items = prizesData.results || prizesData.data?.results || [];
        const pager = prizesData.paginator || {
          current_page: 1,
          last_page: 1,
          total: 0,
          per_page: itemsPerPage,
          from: 0,
          to: 0,
        };
        const zoneItems = zonesResponse?.data?.results || zonesResponse?.data?.data?.results || zonesResponse?.data?.data?.zones || [];
        const vehicleItems = vehiclesResponse?.data?.results || vehiclesResponse?.data?.data?.results || vehiclesResponse?.data?.data?.vehicle_types || [];
        const safeZoneItems = Array.isArray(zoneItems) ? zoneItems : [];
        const safeItems = Array.isArray(items) ? items : [];
        const collapsedItems = collapseAllZonesSetPrices(safeItems);
        const visibleItems = zoneFilter === ALL_ZONES_OPTION_VALUE ? collapsedItems.filter((item) => item.is_all_zones) : collapsedItems;
        setPrizes(visibleItems);
        setPaginator({
          current_page: Number(pager.current_page || 1),
          last_page: Number(pager.last_page || 1),
          total: visibleItems.length,
          per_page: Number(pager.per_page || itemsPerPage),
          from: visibleItems.length ? (Number(pager.current_page || 1) - 1) * Number(pager.per_page || itemsPerPage) + 1 : 0,
          to: visibleItems.length
            ? Math.min((Number(pager.current_page || 1) - 1) * Number(pager.per_page || itemsPerPage) + visibleItems.length, visibleItems.length)
            : 0,
        });
        setZones(safeZoneItems);
        setVehicleTypes(Array.isArray(vehicleItems) ? vehicleItems : []);
        return;
      }
      const requests = [
        fetch(`${baseUrl}/zones`, {
          headers: auth,
        }),
        fetch(`${baseUrl}/types/vehicle-types`, {
          headers: auth,
        }),
      ];
      const responses = await Promise.all(requests);
      const payloads = await Promise.all(responses.map((response) => response.json()));
      const [zonesData, vehiclesData] = payloads;
      const zItems = zonesData.results || zonesData.data?.zones || JSON.parse(JSON.stringify(zonesData.data?.results || []));
      setZones(Array.isArray(zItems) ? zItems : []);
      const vItems = vehiclesData.results || vehiclesData.data?.vehicle_types || JSON.parse(JSON.stringify(vehiclesData.data?.results || []));
      setVehicleTypes(Array.isArray(vItems) ? vItems : []);
      if (mode === 'edit' && editingId) {
        const detailResponse = await adminService.getSetPriceById(editingId);
        const pData = detailResponse?.data?.data || detailResponse?.data || {};
        setFormData({
          ...initialFormState,
          ...pData,
          zone_id: pData.zone_id?._id || pData.zone_id || ALL_ZONES_OPTION_VALUE,
          transport_type: normalizeTransportType(pData.transport_type),
          vehicle_type: pData.vehicle_type?._id || pData.vehicle_type || '',
          admin_commision: pData.admin_commision ?? pData.customer_commission ?? '',
          admin_commision_type: String(pData.admin_commision_type ?? 1),
          admin_commission_from_driver: pData.admin_commission_from_driver ?? pData.driver_commission ?? '',
          admin_commission_type_from_driver: String(pData.admin_commission_type_from_driver ?? 1),
          order_number: pData.order_number ?? pData.eta_sequence ?? '',
          payment_type: normalizePaymentTypes(pData.payment_type).length ? normalizePaymentTypes(pData.payment_type) : ['cash'],
          user_cancellation_fee_type: pData.user_cancellation_fee_type || 'percentage',
          driver_cancellation_fee_type: pData.driver_cancellation_fee_type || 'percentage',
        });
      }
    } catch (error) {
      console.error('Fetch Data Error:', error);
      setLoadError(error?.response?.data?.message || 'Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.zone_id) {
      alert('Zone is required.');
      return;
    }
    if (!formData.vehicle_type) {
      alert('Vehicle Type is required.');
      return;
    }
    if (normalizePaymentTypes(formData.payment_type).length === 0) {
      alert('At least one payment type is required.');
      return;
    }
    const numericFields = [
      {
        name: 'Admin Commission From Driver',
        val: formData.admin_commission_from_driver,
      },
      {
        name: 'Service Tax',
        val: formData.service_tax,
      },
      {
        name: 'Base Price',
        val: formData.base_price,
      },
      {
        name: 'Base Distance',
        val: formData.base_distance,
      },
      {
        name: 'Price Per Distance',
        val: formData.price_per_distance,
      },
      {
        name: 'Time Price',
        val: formData.time_price,
      },
      {
        name: 'Waiting Charge',
        val: formData.waiting_charge,
      },
      {
        name: 'User Cancellation Fee',
        val: formData.user_cancellation_fee,
      },
      {
        name: 'Driver Cancellation Fee',
        val: formData.driver_cancellation_fee,
      },
      ...(formData.enable_airport_ride
        ? [
            {
              name: 'Airport Surge Fee',
              val: formData.airport_surge,
            },
            {
              name: 'Support Airport Fee',
              val: formData.support_airport_fee,
            },
          ]
        : []),
      ...(formData.enable_outstation_ride
        ? [
            {
              name: 'Outstation Base Price',
              val: formData.outstation_base_price,
            },
            {
              name: 'Outstation Base Distance',
              val: formData.outstation_base_distance,
            },
            {
              name: 'Outstation Price Per Distance',
              val: formData.outstation_price_per_distance,
            },
            {
              name: 'Outstation Time Price',
              val: formData.outstation_time_price,
            },
          ]
        : []),
    ];
    for (const field of numericFields) {
      if (field.val !== '' && Number(field.val) < 0) {
        alert(`${field.name} cannot be negative.`);
        return;
      }
    }
    setSaving(true);
    try {
      const normalizedPaymentTypes = normalizePaymentTypes(formData.payment_type).length ? normalizePaymentTypes(formData.payment_type) : ['cash'];
      const basePayload = {
        ...formData,
        enable_ride_sharing: false,
        enable_shared_ride: 0,
        price_per_seat: 0,
        shared_price_per_distance: 0,
        shared_cancel_fee: 0,
        pricing_scope: 'ride',
        transport_type: derivedTransportType || normalizeTransportType(formData.transport_type),
        payment_type: normalizedPaymentTypes,
        zone_id: isAllZonesSelection(formData.zone_id) ? null : formData.zone_id,
        service_location_id: isAllZonesSelection(formData.zone_id) ? null : formData.service_location_id || null,
      };
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId ? `${baseUrl}/types/set-prices/${editingId}` : `${baseUrl}/types/set-prices`;
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(basePayload),
      });
      const data = await res.json();
      if (data.success) {
        navigate('/taxi/admin/pricing/set-price', {
          state: {
            refreshAt: Date.now(),
          },
        });
      } else alert(data.message || 'Failed to save');
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteSetPrice = async (prize) => {
    const groupedIds = Array.isArray(prize?.grouped_ids) && prize.grouped_ids.length > 0 ? prize.grouped_ids : [prize?.id || prize?._id || ''].filter(Boolean);
    const priceId = groupedIds[0] || '';
    const zoneName = prize?.zone_name || 'this zone';
    const vehicleName = prize?.vehicle_type_name || 'this vehicle type';
    if (!priceId) {
      alert('Pricing rule id is missing for this row.');
      return;
    }
    if (!(await window.confirmAsync(`Delete the pricing rule for "${zoneName}" and "${vehicleName}"?`))) {
      return;
    }
    try {
      const responses = await Promise.all(groupedIds.map((id) => adminService.deleteSetPrice(id)));
      const hasFailure = responses.some((response) => !response?.data?.success);
      if (!hasFailure) {
        setPrizes((previous) =>
          previous.filter((item) => {
            const itemIds = Array.isArray(item?.grouped_ids) && item.grouped_ids.length > 0 ? item.grouped_ids : [item?.id || item?._id || ''].filter(Boolean);
            return !itemIds.some((id) => groupedIds.includes(String(id)));
          }),
        );
        fetchInitialData();
        return;
      }
      alert('Failed to delete one or more grouped pricing rules.');
    } catch (error) {
      console.error('Delete set price error:', error);
      alert(error?.response?.data?.message || 'Failed to delete pricing rule.');
    }
  };
  if (view === 'list') {
    const clearFilters = () => {
      setTransportFilter('');
      setStatusFilter('');
      setZoneFilter('');
      setVehicleFilter('');
      setSearchTerm('');
      setPage(1);
    };
    const hasFilters = Boolean(transportFilter || statusFilter || zoneFilter || vehicleFilter || searchTerm);
    const lastPage = Math.max(1, Number(paginator.last_page || 1));
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={DollarSign}
          title="Set prices"
          subtitle="Per-zone, per-vehicle fare rules"
          breadcrumb={[{ label: 'Taxi' }, { label: 'Pricing' }, { label: 'Set prices' }]}
          actions={
            <Button type="button" onClick={() => navigate('/taxi/admin/pricing/set-price/create')} className={BTN_PRIMARY}>
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Add set price</Span>
            </Button>
          }
        />

        <Card className="mb-4">
          <SectionTitle
            action={
              <Button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                accessibilityLabel={showFilters ? 'Hide filters' : 'Show filters'}
                className={BTN_SECONDARY}
              >
                <UiIcon as={Filter} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>{showFilters ? 'Hide filters' : 'Filters'}</Span>
              </Button>
            }
          >
            Search
          </SectionTitle>
          <Toolbar className="mb-0">
            <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white flex-1 min-w-[200px]">
              <UiIcon as={Search} size={16} className="text-slate-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                placeholder="Search zone, vehicle or location"
                className="flex-1 text-sm text-slate-900"
              />
            </Div>
            <Select
              value={itemsPerPage}
              onChange={(event) => {
                setItemsPerPage(Number(event.target.value) || 10);
                setPage(1);
              }}
              className={`${INPUT} w-32`}
            >
              {[10, 25, 50].map((value) => (
                <Option key={value} value={value}>
                  {value} / page
                </Option>
              ))}
            </Select>
          </Toolbar>

          {showFilters ? (
            <Div className={`grid grid-cols-${columns} gap-3 mt-3`}>
              <Field label="Transport type">
                <Select
                  value={transportFilter}
                  onChange={(event) => {
                    setTransportFilter(event.target.value);
                    setPage(1);
                  }}
                  className={INPUT}
                >
                  <Option value="">All transport types</Option>
                  <Option value="taxi">Taxi</Option>
                  <Option value="delivery">Delivery</Option>
                  <Option value="pooling">Pooling</Option>
                  <Option value="both">Both</Option>
                </Select>
              </Field>

              <Field label="Status">
                <Select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                  className={INPUT}
                >
                  <Option value="">All statuses</Option>
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                </Select>
              </Field>

              <Field label="Zone">
                <Select
                  value={zoneFilter}
                  onChange={(event) => {
                    setZoneFilter(event.target.value);
                    setPage(1);
                  }}
                  className={INPUT}
                >
                  <Option value="">All zones</Option>
                  <Option value={ALL_ZONES_OPTION_VALUE}>All</Option>
                  {zones.map((zone) => (
                    <Option key={zone._id || zone.id} value={zone._id || zone.id}>
                      {zone.name}
                    </Option>
                  ))}
                </Select>
              </Field>

              <Field label="Vehicle type">
                <Select
                  value={vehicleFilter}
                  onChange={(event) => {
                    setVehicleFilter(event.target.value);
                    setPage(1);
                  }}
                  className={INPUT}
                >
                  <Option value="">All vehicle types</Option>
                  {vehicleTypes.map((vehicle) => (
                    <Option key={vehicle._id || vehicle.id} value={vehicle._id || vehicle.id}>
                      {vehicle.name}
                    </Option>
                  ))}
                </Select>
              </Field>

              <Div className="justify-end">
                <Button type="button" onClick={clearFilters} className={BTN_SECONDARY}>
                  <Span className={BTN_TEXT_SECONDARY}>Clear filters</Span>
                </Button>
              </Div>
            </Div>
          ) : null}
        </Card>

        {loading && prizes.length === 0 ? (
          <TableSkeleton rows={6} />
        ) : loadError ? (
          <ErrorState title="Could not load pricing rules" message={loadError} onRetry={() => fetchInitialData()} />
        ) : prizes.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title={hasFilters ? 'No price rules match' : 'No price rules yet'}
            message={hasFilters ? 'No price rules matched the current search or filters.' : 'Add a price rule so riders see a real fare instead of the fallback.'}
            actionLabel={hasFilters ? 'Clear filters' : 'Add set price'}
            onAction={hasFilters ? clearFilters : () => navigate('/taxi/admin/pricing/set-price/create')}
          />
        ) : (
          <>
            <DataTable cols={PRICE_COLS}>
              <THead cols={PRICE_COLS} labels={PRICE_LABELS} />
              <TBody>
                {prizes.map((prize, i, all) => (
                  <Row key={prize.id || prize._id} last={i === all.length - 1}>
                    <Cell width={PRICE_COLS[0]}>{prize.zone_name || 'India'}</Cell>
                    <Cell width={PRICE_COLS[1]}>
                      {prize.transport_type === 'both' ? 'All' : prize.transport_type === 'taxi' ? 'Ride hailing' : prize.transport_type || 'All'}
                    </Cell>
                    <Cell width={PRICE_COLS[2]}>
                      <Span className="text-sm font-semibold text-slate-900">{prize.vehicle_type_name || 'Premium Car'}</Span>
                    </Cell>
                    <Cell width={PRICE_COLS[3]}>
                      <StatusToggle
                        active={Number(prize.active) === 1}
                        label={`Toggle ${prize.vehicle_type_name || 'rule'}`}
                        onToggle={async () => {
                          try {
                            const idsToToggle =
                              Array.isArray(prize.grouped_ids) && prize.grouped_ids.length > 0 ? prize.grouped_ids : [prize.id || prize._id].filter(Boolean);
                            await Promise.all(
                              idsToToggle.map((targetId) =>
                                fetch(`${baseUrl}/types/set-prices/${targetId}`, {
                                  method: 'PATCH',
                                  headers: {
                                    Authorization: `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    active: Number(prize.active) === 1 ? 0 : 1,
                                  }),
                                }),
                              ),
                            );
                            fetchInitialData();
                          } catch (e) {}
                        }}
                      />
                    </Cell>
                    <Cell width={PRICE_COLS[4]}>
                      <Div className="flex-row items-center gap-1">
                        <Button
                          type="button"
                          accessibilityLabel="Edit price rule"
                          onClick={() => navigate(`/taxi/admin/pricing/set-price/edit/${prize.id || prize._id}`)}
                          className="w-11 h-11 rounded-lg items-center justify-center"
                        >
                          <UiIcon as={Edit2} size={16} className="text-slate-600" />
                        </Button>
                        <Button
                          type="button"
                          accessibilityLabel="Package pricing"
                          onClick={() => navigate('/taxi/admin/pricing/package-pricing')}
                          className="w-11 h-11 rounded-lg items-center justify-center"
                        >
                          <UiIcon as={Gift} size={16} className="text-slate-600" />
                        </Button>
                        <Button
                          type="button"
                          accessibilityLabel="Surge pricing"
                          onClick={() => navigate(`/taxi/admin/pricing/set-price/surge/${prize.id || prize._id}`)}
                          className="w-11 h-11 rounded-lg items-center justify-center"
                        >
                          <UiIcon as={Zap} size={16} className="text-slate-600" />
                        </Button>
                        <Button
                          type="button"
                          accessibilityLabel="Driver incentives"
                          onClick={() => navigate(`/taxi/admin/pricing/set-price/incentive/${prize.id || prize._id}`)}
                          className="w-11 h-11 rounded-lg items-center justify-center"
                        >
                          <UiIcon as={Cone} size={16} className="text-slate-600" />
                        </Button>
                        <Button
                          type="button"
                          accessibilityLabel="Delete price rule"
                          onClick={() => handleDeleteSetPrice(prize)}
                          className="w-11 h-11 rounded-lg items-center justify-center"
                        >
                          <UiIcon as={Trash2} size={16} className="text-red-600" />
                        </Button>
                      </Div>
                    </Cell>
                  </Row>
                ))}
              </TBody>
            </DataTable>
            <Pagination
              page={Number(paginator.current_page || page)}
              pages={lastPage}
              total={paginator.total || 0}
              onPrev={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() => setPage((current) => Math.min(lastPage, current + 1))}
            />
          </>
        )}
      </AdminPage>
    );
  }
  const formHeader = (
    <PageHeader
      icon={DollarSign}
      title={mode === 'edit' ? 'Edit set price' : 'Create set price'}
      subtitle="Zone, vehicle, fares and cancellation rules"
      breadcrumb={[
        { label: 'Taxi' },
        { label: 'Set prices', onPress: () => navigate('/taxi/admin/pricing/set-price') },
        { label: mode === 'edit' ? 'Edit' : 'Create' },
      ]}
      actions={
        <>
          <Button type="button" onClick={() => navigate('/taxi/admin/pricing/set-price')} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Back</Span>
          </Button>
          <Button type="button" onClick={() => setShowHowItWorks((current) => !current)} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>{showHowItWorks ? 'Hide help' : 'How it works'}</Span>
          </Button>
        </>
      }
    />
  );
  if (loading && mode === 'edit') {
    return (
      <AdminPage maxWidth={900}>
        {formHeader}
        <LoadingState label="Loading price rule…" />
      </AdminPage>
    );
  }
  if (loadError && mode === 'edit') {
    return (
      <AdminPage maxWidth={900}>
        {formHeader}
        <ErrorState title="Could not load this price rule" message={loadError} onRetry={() => fetchInitialData()} />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={900}>
      {formHeader}

      {showHowItWorks ? (
        <Card className="mb-4">
          <SectionTitle
            action={
              <Button type="button" accessibilityLabel="Close help" onClick={() => setShowHowItWorks(false)} className="w-11 h-11 items-center justify-center">
                <UiIcon as={X} size={16} className="text-slate-600" />
              </Button>
            }
          >
            How it works
          </SectionTitle>
          <Div className="gap-3">
            {[
              ['Zone', 'Select the geographical area where this pricing applies.'],
              ['Vehicle type', 'The vehicle category (Mini, SUV…). It also sets the transport type.'],
              ['Payment type', 'Allowed payment methods for this ride type.'],
              ['Commission', 'Platform earnings rules for drivers and fleet owners.'],
              ['Cancellation fee', 'Charges applied if the user or driver cancels the ride.'],
              ['Airport / outstation', 'Enable the toggles to add special pricing for airport or inter-city rides.'],
            ].map(([title, body]) => (
              <Div key={title}>
                <Span className="text-sm font-semibold text-slate-900">{title}</Span>
                <Span className="text-sm text-slate-500">{body}</Span>
              </Div>
            ))}
          </Div>
        </Card>
      ) : null}

      <Form onSubmit={handleSave}>
        <Card className="mb-4">
          <SectionTitle>Scope</SectionTitle>
          <Div className={`grid grid-cols-${columns} gap-3`}>
            <Field
              label="Zone"
              required
              hint={
                isAllZonesSelection(formData.zone_id)
                  ? 'All Zones creates one global rule for this vehicle type, used when no zone-specific rule is set.'
                  : undefined
              }
            >
              <Select
                required
                className={INPUT}
                value={formData.zone_id}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    zone_id: e.target.value,
                  }))
                }
              >
                <Option value="">Select zone</Option>
                <Option value={ALL_ZONES_OPTION_VALUE}>All zones</Option>
                {zones.map((z) => (
                  <Option key={z._id || z.id} value={z._id || z.id}>
                    {z.name}
                  </Option>
                ))}
              </Select>
            </Field>

            <Field label="Vehicle type" required hint={`Transport type: ${formatTransportTypeLabel(derivedTransportType || formData.transport_type)}`}>
              <Select
                required
                className={INPUT}
                value={formData.vehicle_type}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    vehicle_type: e.target.value,
                  }))
                }
              >
                <Option value="">Select vehicle type</Option>
                {vehicleTypes.map((v) => (
                  <Option key={v._id || v.id} value={v._id || v.id}>
                    {v.name}
                  </Option>
                ))}
              </Select>
            </Field>
          </Div>
        </Card>

        <Card className="mb-4">
          <SectionTitle>Payment types</SectionTitle>
          <Div className="flex-row flex-wrap gap-2">
            {paymentTypeOptions.map((option) => {
              const isSelected = normalizePaymentTypes(formData.payment_type).includes(option.value);
              return (
                <Button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setFormData((previous) => ({
                      ...previous,
                      payment_type: togglePaymentType(previous.payment_type, option.value),
                    }))
                  }
                  className={isSelected ? BTN_PRIMARY : BTN_SECONDARY}
                >
                  <Span className={isSelected ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>{option.label}</Span>
                </Button>
              );
            })}
          </Div>
          <Input type="hidden" required value={normalizePaymentTypes(formData.payment_type).join(',')} onChange={() => {}} />
        </Card>

        <Card className="mb-4">
          <SectionTitle>Fares</SectionTitle>
          <Div className={`grid grid-cols-${columns} gap-3`}>
            <Field label="Admin commission from driver" required>
              <Div className="flex-row gap-2">
                <Select
                  className={`${INPUT} w-24`}
                  value={formData.admin_commission_type_from_driver}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      admin_commission_type_from_driver: e.target.value,
                    }))
                  }
                >
                  <Option value="1">%</Option>
                  <Option value="2">Fixed</Option>
                </Select>
                <Input
                  type="number"
                  min="0"
                  required
                  className={`${INPUT} flex-1`}
                  value={formData.admin_commission_from_driver}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      admin_commission_from_driver: clampNonNegativeInput('admin_commission_from_driver', e.target.value),
                    }))
                  }
                />
              </Div>
            </Field>

            <Field label="Service tax (%)" required>
              <Input
                type="number"
                min="0"
                required
                className={INPUT}
                value={formData.service_tax}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    service_tax: clampNonNegativeInput('service_tax', e.target.value),
                  }))
                }
              />
            </Field>

            <Field label="Base price" required>
              <Input
                type="number"
                min="0"
                required
                className={INPUT}
                value={formData.base_price}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    base_price: clampNonNegativeInput('base_price', e.target.value),
                  }))
                }
              />
            </Field>

            <Field label="Base distance" required>
              <Input
                type="number"
                min="0"
                required
                className={INPUT}
                value={formData.base_distance}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    base_distance: clampNonNegativeInput('base_distance', e.target.value),
                  }))
                }
              />
            </Field>

            <Field label="Price per distance" required>
              <Input
                type="number"
                min="0"
                required
                className={INPUT}
                value={formData.price_per_distance}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    price_per_distance: clampNonNegativeInput('price_per_distance', e.target.value),
                  }))
                }
              />
            </Field>

            <Field label="Time price per minute" required>
              <Input
                type="number"
                min="0"
                required
                className={INPUT}
                value={formData.time_price}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    time_price: clampNonNegativeInput('time_price', e.target.value),
                  }))
                }
              />
            </Field>

            <Field label="Waiting charge" required>
              <Input
                type="number"
                min="0"
                required
                className={INPUT}
                value={formData.waiting_charge}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    waiting_charge: clampNonNegativeInput('waiting_charge', e.target.value),
                  }))
                }
              />
            </Field>

            <Field label="Free waiting before pickup" required>
              <Input
                type="number"
                min="0"
                required
                className={INPUT}
                value={formData.free_waiting_before}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    free_waiting_before: clampNonNegativeInput('free_waiting_before', e.target.value),
                  }))
                }
              />
            </Field>

            <Field label="Free waiting after pickup" required>
              <Input
                type="number"
                min="0"
                required
                className={INPUT}
                value={formData.free_waiting_after}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    free_waiting_after: clampNonNegativeInput('free_waiting_after', e.target.value),
                  }))
                }
              />
            </Field>
          </Div>
        </Card>

        <Card className="mb-4">
          <SectionTitle>Ride types</SectionTitle>
          <Label className="flex-row items-center gap-2 h-11">
            <Input
              type="checkbox"
              checked={formData.enable_airport_ride}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  enable_airport_ride: e.target.checked,
                }))
              }
            />
            <Span className="text-sm text-slate-700">Airport ride</Span>
          </Label>
          <Label className="flex-row items-center gap-2 h-11">
            <Input
              type="checkbox"
              checked={formData.enable_outstation_ride}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  enable_outstation_ride: e.target.checked,
                }))
              }
            />
            <Span className="text-sm text-slate-700">Outstation ride</Span>
          </Label>

          {formData.enable_airport_ride ? (
            <Div className={`grid grid-cols-${columns} gap-3 mt-3`}>
              <Field label="Airport surge">
                <Input
                  type="number"
                  className={INPUT}
                  value={formData.airport_surge}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      airport_surge: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Airport support fee">
                <Input
                  type="number"
                  className={INPUT}
                  value={formData.support_airport_fee}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      support_airport_fee: e.target.value,
                    }))
                  }
                />
              </Field>
            </Div>
          ) : null}

          {formData.enable_outstation_ride ? (
            <Div className={`grid grid-cols-${columns} gap-3 mt-3`}>
              <Field label="Outstation base price">
                <Input
                  type="number"
                  className={INPUT}
                  value={formData.outstation_base_price}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      outstation_base_price: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Outstation base distance">
                <Input
                  type="number"
                  className={INPUT}
                  value={formData.outstation_base_distance}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      outstation_base_distance: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Outstation price per distance">
                <Input
                  type="number"
                  className={INPUT}
                  value={formData.outstation_price_per_distance}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      outstation_price_per_distance: e.target.value,
                    }))
                  }
                />
              </Field>
            </Div>
          ) : null}
        </Card>

        <Card className="mb-4">
          <SectionTitle>Cancellation fee</SectionTitle>
          <Div className={`grid grid-cols-${columns} gap-3`}>
            <Field label="Cancellation fee for user" required>
              <Div className="flex-row gap-2">
                <Select
                  className={`${INPUT} w-24`}
                  value={formData.user_cancellation_fee_type}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      user_cancellation_fee_type: e.target.value,
                    }))
                  }
                >
                  <Option value="percentage">%</Option>
                  <Option value="fixed">Fixed</Option>
                </Select>
                <Input
                  type="number"
                  min="0"
                  className={`${INPUT} flex-1`}
                  placeholder="0"
                  value={formData.user_cancellation_fee}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      user_cancellation_fee: clampNonNegativeInput('user_cancellation_fee', e.target.value),
                    }))
                  }
                />
              </Div>
            </Field>

            <Field label="Cancellation fee for driver" required>
              <Div className="flex-row gap-2">
                <Select
                  className={`${INPUT} w-24`}
                  value={formData.driver_cancellation_fee_type}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      driver_cancellation_fee_type: e.target.value,
                    }))
                  }
                >
                  <Option value="percentage">%</Option>
                  <Option value="fixed">Fixed</Option>
                </Select>
                <Input
                  type="number"
                  min="0"
                  className={`${INPUT} flex-1`}
                  placeholder="0"
                  value={formData.driver_cancellation_fee}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      driver_cancellation_fee: clampNonNegativeInput('driver_cancellation_fee', e.target.value),
                    }))
                  }
                />
              </Div>
            </Field>

            <Field label="Fee goes to" required>
              <Select
                required
                className={INPUT}
                value={formData.cancellation_fee_goes_to}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    cancellation_fee_goes_to: e.target.value,
                  }))
                }
              >
                <Option value="">Select who gets the cancellation fee</Option>
                <Option value="admin">Admin</Option>
                <Option value="driver">Driver</Option>
              </Select>
            </Field>
          </Div>
          <Div className="flex-row items-start gap-2 p-3 rounded-lg bg-blue-50 mt-3">
            <UiIcon as={Info} size={16} className="text-blue-700 shrink-0 mt-0.5" />
            <Span className="text-xs text-slate-700 flex-1">A percentage fee is taken from the fare; a fixed fee is charged as entered.</Span>
          </Div>
        </Card>

        <Card className={`${tablet ? 'flex-row justify-end' : ''} gap-3`}>
          <Button type="button" onClick={() => navigate('/taxi/admin/pricing/set-price')} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
          </Button>
          <Button type="submit" disabled={saving} className={BTN_PRIMARY}>
            <UiIcon as={Save} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : 'Save'}</Span>
          </Button>
        </Card>
      </Form>
    </AdminPage>
  );
};
export default SetPrices;
