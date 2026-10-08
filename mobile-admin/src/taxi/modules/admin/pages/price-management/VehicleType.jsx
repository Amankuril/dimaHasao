/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/VehicleType.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Car, Trash2, Edit2, ArrowLeft, Upload, Info, Save, X, CheckCircle2, Package } from 'lucide-react-native';
import { useNavigate, useParams } from '../../../../../lib/webRouter';
import { File } from 'expo-file-system';
import api from '../../../../shared/api/axiosInstance';
import { pickImage } from '../../../../../lib/files';
import { useTaxiTransportTypes } from '../../../../shared/hooks/useTaxiTransportTypes';
import CarIcon from '../../../../assets/icons/car.png';
import BikeIcon from '../../../../assets/icons/bike.png';
import AutoIcon from '../../../../assets/icons/auto.png';
import TruckIcon from '../../../../assets/icons/truck.png';
import EhcvIcon from '../../../../assets/icons/ehcv.png';
import HcvIcon from '../../../../assets/icons/hcv.png';
import LcvIcon from '../../../../assets/icons/LCV.png';
import McvIcon from '../../../../assets/icons/mcv.png';
import LuxuryIcon from '../../../../assets/icons/Luxury.png';
import PremiumIcon from '../../../../assets/icons/Premium.png';
import SuvIcon from '../../../../assets/icons/SUV.png';
import ScootyIcon from '../../../../assets/icons/scooty.png';
import HatchbackIcon from '../../../../assets/icons/Hatchback.png';
import BusIcon from '../../../../assets/icons/bus.png';
import MiniBusIcon from '../../../../assets/icons/mini_bus.png';
import MapBackground from '../../../../assets/map_image.png';
import trucksImg from '../../../../assets/images/delivery/trucks.png';
import bikeImg from '../../../../assets/images/delivery/bike.png';
import moversImg from '../../../../assets/images/delivery/movers.png';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
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
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, Div, Img, Input, Label, Option, Select, Span, Textarea, Icon as UiIcon } from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
const VEHICLE_COLS = [210, 140, 130, 120, 100];
const VEHICLE_LABELS = ['Vehicle', 'Transport', 'Dispatch', 'Active', 'Actions'];
const iconMap = {
  car: CarIcon,
  bike: BikeIcon,
  auto: AutoIcon,
  truck: TruckIcon,
  ehcb: EhcvIcon,
  HCV: HcvIcon,
  LCV: LcvIcon,
  MCV: McvIcon,
  Luxary: LuxuryIcon,
  premium: PremiumIcon,
  suv: SuvIcon,
  scooty: ScootyIcon,
  car_5_seater: HatchbackIcon,
  car_7_seater: SuvIcon,
  bus: BusIcon,
  mini_bus: MiniBusIcon,
};
const ICON_TYPE_ALIASES = {
  motor_bike: 'bike',
  motorbike: 'bike',
  mini_truck: 'truck',
  'mini truck': 'truck',
  pooling_truck: 'truck',
  'pooling truck': 'truck',
  loader: 'truck',
  hcv: 'HCV',
  lcv: 'LCV',
  mcv: 'MCV',
  luxary: 'Luxary',
  scooty: 'scooty',
  'car 5 seater': 'car_5_seater',
  'car 7 seater': 'car_7_seater',
  bus: 'bus',
  'mini bus': 'mini_bus',
};
const ICON_TYPE_LABELS = {
  car: 'Car',
  bike: 'Bike',
  auto: 'Auto',
  truck: 'Truck',
  ehcb: 'Extra Heavy Commercial Vehicle',
  HCV: 'Heavy Commercial Vehicle',
  LCV: 'Light Commercial Vehicle',
  MCV: 'Medium Commercial Vehicle',
  Luxary: 'Luxury',
  premium: 'Premium',
  suv: 'SUV',
  scooty: 'Scooty',
  car_5_seater: 'Car 5 Seater',
  car_7_seater: 'Car 7 Seater',
  bus: 'Bus',
  mini_bus: 'Mini Bus',
};
const normalizeIconType = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return 'car';
  const lower = raw.toLowerCase();
  if (ICON_TYPE_ALIASES[lower]) return ICON_TYPE_ALIASES[lower];
  const exactKey = Object.keys(iconMap).find((key) => key.toLowerCase() === lower);
  return exactKey || 'car';
};
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;
const normalizeTransportType = (value = '') => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'delivery') return 'delivery';
  if (normalized === 'pooling') return 'pooling';
  if (normalized === 'both' || normalized === 'all') return 'both';
  return 'taxi';
};
const normalizeTaxiMode = (value = '') => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'delivery') return 'delivery';
  if (normalized === 'pooling') return 'pooling';
  if (normalized === 'both' || normalized === 'all') return 'both';
  return 'taxi';
};
const getTransportTypeOptionDescription = (transportType = '', vehicleName = '') => {
  const normalizedTransportType = normalizeTransportType(transportType);
  const normalizedVehicleName = String(vehicleName || '').trim() || 'Vehicle name preview';
  if (normalizedTransportType === 'both') {
    return `${normalizedVehicleName} in both ride and delivery`;
  }
  if (normalizedTransportType === 'delivery') {
    return normalizedVehicleName;
  }
  return normalizedVehicleName;
};
const resolveVehicleTransportType = (vehicle = {}) => {
  const directTransportType = normalizeTransportType(vehicle?.transport_type || vehicle?.is_taxi || '');
  if (directTransportType !== 'taxi') {
    return directTransportType;
  }
  const hasDeliveryCategory = Boolean(String(vehicle?.delivery_category || '').trim());
  const hasDeliveryPricing = Boolean(
    vehicle?.delivery_distance_pricing?.enabled ||
    Number(vehicle?.delivery_distance_pricing?.base_price || 0) > 0 ||
    Number(vehicle?.delivery_distance_pricing?.distance_price || 0) > 0,
  );
  if (hasDeliveryCategory || hasDeliveryPricing) {
    return 'delivery';
  }
  return 'taxi';
};
const buildVehicleFormData = (selectedVehicle = {}) => ({
  name: selectedVehicle.name || '',
  short_description: selectedVehicle.short_description || '',
  description: selectedVehicle.description || '',
  transport_type: resolveVehicleTransportType(selectedVehicle),
  dispatch_type: selectedVehicle.dispatch_type || selectedVehicle.trip_dispatch_type || 'normal',
  icon_types: normalizeIconType(selectedVehicle.icon_types || selectedVehicle.icon_types_for),
  category: String(selectedVehicle.category || ''),
  image: selectedVehicle.image || '',
  map_icon: selectedVehicle.map_icon || selectedVehicle.icon || selectedVehicle.image || '',
  capacity: Number(selectedVehicle.capacity || 0),
  size: String(selectedVehicle.size || ''),
  is_taxi: selectedVehicle.is_taxi || resolveVehicleTransportType(selectedVehicle),
  is_accept_share_ride: Number(selectedVehicle.is_accept_share_ride || 0),
  delivery_category: String(selectedVehicle.delivery_category || ''),
  delivery_distance_pricing: normalizeDeliveryDistancePricing(selectedVehicle.delivery_distance_pricing),
  service_tax: String(selectedVehicle.service_tax ?? 0),
  admin_commission_type_from_driver: String(selectedVehicle.admin_commission_type_from_driver ?? 1),
  admin_commission_from_driver: String(selectedVehicle.admin_commission_from_driver ?? 0),
  status: Number(selectedVehicle.status ?? (selectedVehicle.active !== false ? 1 : 0)),
  active: selectedVehicle.active !== false && Number(selectedVehicle.status ?? 1) !== 0,
  supported_other_vehicle_types: Array.isArray(selectedVehicle.supported_other_vehicle_types)
    ? selectedVehicle.supported_other_vehicle_types.map((item) => String(item?._id || item))
    : typeof selectedVehicle.supported_vehicles === 'string' && selectedVehicle.supported_vehicles
      ? selectedVehicle.supported_vehicles
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
  vehicle_preference: Array.isArray(selectedVehicle.vehicle_preference) ? selectedVehicle.vehicle_preference.map((item) => String(item?._id || item)) : [],
});
const sanitizeObjectIdList = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        return String(item._id || item.id || '').trim();
      }
      return '';
    })
    .filter((item, index, array) => OBJECT_ID_PATTERN.test(item) && array.indexOf(item) === index);
const defaultFormData = {
  name: '',
  short_description: '',
  description: '',
  transport_type: 'taxi',
  dispatch_type: 'normal',
  icon_types: 'car',
  category: '',
  image: '',
  map_icon: '',
  capacity: 0,
  size: '',
  is_taxi: 'taxi',
  is_accept_share_ride: 0,
  delivery_category: '',
  delivery_distance_pricing: {
    enabled: false,
    base_price: '',
    free_distance: '',
    distance_price: '',
  },
  service_tax: '0',
  admin_commission_type_from_driver: '1',
  admin_commission_from_driver: '0',
  status: 1,
  active: true,
  supported_other_vehicle_types: [],
  vehicle_preference: [],
};
const DELIVERY_CATEGORY_OPTIONS = [
  {
    id: 'trucks',
    title: 'Trucks',
    image: trucksImg,
    description: 'Heavy goods, loaders, and cargo-style delivery vehicles.',
  },
  {
    id: '2wheeler',
    title: '2 Wheeler',
    image: bikeImg,
    description: 'Fast lightweight parcel bikes and two-wheel delivery options.',
  },
  {
    id: 'auto',
    title: 'Auto',
    image: '/2_AutoRickshaw.png',
    description: 'Classic three-wheeler Indian auto rickshaw for fast local parcel delivery.',
  },
  {
    id: 'movers',
    title: 'Packers & Movers',
    image: moversImg,
    description: 'Home shifting, helper-based, and larger move services.',
  },
];
const VEHICLE_CATEGORY_OPTIONS = [
  {
    id: '',
    label: 'Select Category',
  },
  {
    id: 'bike',
    label: 'Bike',
  },
  {
    id: 'car',
    label: 'Car',
  },
  {
    id: 'auto',
    label: 'Auto',
  },
];
const TRANSPORT_TYPE_OPTIONS = [
  {
    id: 'taxi',
    name: 'taxi',
    display_name: 'Ride',
  },
  {
    id: 'delivery',
    name: 'delivery',
    display_name: 'Delivery',
  },
  {
    id: 'both',
    name: 'both',
    display_name: 'Both',
  },
];
const unwrap = (response) => response?.data?.data || response?.data || response;
const normalizeDeliveryDistancePricing = (value = {}) => ({
  enabled: Boolean(value?.enabled),
  base_price: String(value?.base_price ?? ''),
  free_distance: String(value?.free_distance ?? value?.base_distance ?? ''),
  distance_price: String(value?.distance_price ?? ''),
});
const clampNonNegativeInput = (value) => {
  if (value === '') {
    return '';
  }
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '';
  }
  return String(Math.max(0, numericValue));
};
const normalizeVehicle = (item = {}) => ({
  ...item,
  id: String(item?._id || item?.id || ''),
});
/*
 * The web reads the picked file with FileReader.readAsDataURL and stores the
 * data URL in formData.image / map_icon, which the save payload sends as a
 * string. Here the picked file is read from its cache uri as base64 and wrapped
 * in the same data URL, so the payload is byte-for-byte what the web sends.
 */
const fileToDataUrl = async (file) => {
  const base64 = await new File(file.uri).base64();
  return `data:${file.type || 'image/jpeg'};base64,${base64}`;
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
const VehicleMultiSelect = ({ label, options, value, onChange, placeholder = 'Select options' }) => {
  const selectedItems = options.filter((item) => value.includes(String(item.id || item._id)));
  const handleSelect = (event) => {
    const nextValue = event.target.value;
    if (!nextValue || value.includes(nextValue)) {
      return;
    }
    onChange([...value, nextValue]);
  };
  const removeItem = (id) => onChange(value.filter((item) => item !== id));
  return (
    <Field label={label}>
      <Div className="flex-row flex-wrap gap-2">
        {selectedItems.length ? (
          selectedItems.map((item) => (
            <Div key={String(item.id || item._id)} className="flex-row items-center gap-1 pl-3 pr-1 h-11 rounded-full bg-slate-100">
              <Span className="text-sm font-semibold text-slate-700">{item.name}</Span>
              <Button
                type="button"
                accessibilityLabel={`Remove ${item.name}`}
                onClick={() => removeItem(String(item.id || item._id))}
                className="w-9 h-9 items-center justify-center"
              >
                <UiIcon as={X} size={14} className="text-slate-600" />
              </Button>
            </Div>
          ))
        ) : (
          <Span className="text-sm text-slate-500">{placeholder}</Span>
        )}
      </Div>
      <Select value="" onChange={handleSelect} className={INPUT}>
        <Option value="">Add option</Option>
        {options
          .filter((item) => !value.includes(String(item.id || item._id)))
          .map((item) => (
            <Option key={String(item.id || item._id)} value={String(item.id || item._id)}>
              {item.name}
            </Option>
          ))}
      </Select>
    </Field>
  );
};
const VehicleType = ({ mode: propMode }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditor = propMode === 'create' || propMode === 'edit';
  const { columns, tablet } = useLayoutWidth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTransportTypeMenuOpen, setIsTransportTypeMenuOpen] = useState(false);
  const [vehiclePreferences, setVehiclePreferences] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    current_page: 1,
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    ...defaultFormData,
    transport_type: '',
  });
  const { transportTypes } = useTaxiTransportTypes({
    enabled: isEditor,
  });
  const transportTypeOptions = useMemo(() => {
    const normalized = new Map();
    [...TRANSPORT_TYPE_OPTIONS, ...(Array.isArray(transportTypes) ? transportTypes : [])].forEach((item) => {
      const value = normalizeTransportType(item?.name || item?.transport_type || item?.id || '');
      if (!value || value === 'pooling') return;
      normalized.set(value, {
        id: item?.id || item?._id || value,
        name: value,
        display_name: value === 'both' ? 'Both' : item?.display_name || item?.label || value.charAt(0).toUpperCase() + value.slice(1),
      });
    });
    return Array.from(normalized.values());
  }, [transportTypes]);
  const selectedTransportTypeOption = useMemo(
    () => transportTypeOptions.find((item) => item.name === formData.transport_type) || null,
    [formData.transport_type, transportTypeOptions],
  );
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const vehicleCatalogPromise = api.get(isEditor ? '/admin/types/vehicle-types' : '/admin/types/vehicle-types/list');
        const preferencePromise = isEditor ? api.get('/admin/vehicle_preference') : Promise.resolve(null);
        const detailPromise = isEditor && id ? api.get(`/admin/types/vehicle-types/${id}`) : Promise.resolve(null);
        if (!id && propMode === 'create') {
          setFormData(defaultFormData);
        }
        detailPromise
          .then((response) => {
            if (!mounted || !response) {
              return;
            }
            const detailPayload = unwrap(response);
            if (detailPayload) {
              setFormData(buildVehicleFormData(normalizeVehicle(detailPayload)));
            }
          })
          .catch(() => {});
        vehicleCatalogPromise
          .then((response) => {
            if (!mounted) {
              return;
            }
            const vehiclePayload = unwrap(response);
            const vehicleResults = Array.isArray(vehiclePayload?.results) ? vehiclePayload.results : Array.isArray(vehiclePayload) ? vehiclePayload : [];
            const normalizedVehicles = vehicleResults.map(normalizeVehicle);
            setVehicles(normalizedVehicles);
            setPagination(
              vehiclePayload?.paginator || {
                total: normalizedVehicles.length,
                current_page: 1,
              },
            );
            if (id && !formData.name) {
              const selectedVehicle = normalizedVehicles.find((item) => String(item.id) === String(id));
              if (selectedVehicle) {
                setFormData(buildVehicleFormData(selectedVehicle));
              }
            }
          })
          .catch(() => {});
        preferencePromise
          .then((response) => {
            if (!mounted || !response) {
              return;
            }
            const prefPayload = unwrap(response);
            const prefResults = Array.isArray(prefPayload?.results)
              ? prefPayload.results
              : Array.isArray(prefPayload?.data)
                ? prefPayload.data
                : Array.isArray(prefPayload)
                  ? prefPayload
                  : [];
            setVehiclePreferences(prefResults);
          })
          .catch(() => {});
        const [vehicleCatalogResult, preferenceResult, detailResult] = await Promise.allSettled([vehicleCatalogPromise, preferencePromise, detailPromise]);
        if (!mounted) {
          return;
        }
        const errors = [vehicleCatalogResult, preferenceResult, detailResult]
          .filter((result) => result.status === 'rejected')
          .map((result) => result.reason?.message || 'Request failed');
        if (errors.length === 3 || (id && detailResult.status === 'rejected')) {
          setErrorMessage(errors[0] || 'Could not load vehicle types.');
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(error.message || 'Could not load vehicle types.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [id, propMode]);
  const previewImage = useMemo(() => {
    if (formData.image && typeof formData.image === 'string') {
      return formData.image;
    }
    return '';
  }, [formData.image]);
  const mapIconPreview = useMemo(() => {
    if (formData.map_icon && typeof formData.map_icon === 'string') {
      return formData.map_icon;
    }
    return iconMap[formData.icon_types] || CarIcon;
  }, [formData.icon_types, formData.map_icon]);
  const availableSupportVehicles = useMemo(() => vehicles.filter((item) => String(item.id) !== String(id)), [id, vehicles]);
  const preferenceOptions = useMemo(
    () =>
      vehiclePreferences.map((item) => ({
        ...item,
        id: String(item._id || item.id),
      })),
    [vehiclePreferences],
  );
  const showsDeliveryCategorySelector = useMemo(
    () => ['delivery', 'both'].includes(normalizeTransportType(formData.transport_type)),
    [formData.transport_type],
  );
  const updateForm = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleImageChange = async (field = 'image') => {
    const file = await pickImage();
    if (!file) {
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    updateForm(field, dataUrl);
  };
  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage('');
    try {
      if (showsDeliveryCategorySelector && !formData.delivery_category) {
        throw new Error('Choose a delivery category for this delivery-enabled vehicle type.');
      }
      const payload = {
        name: formData.name.trim(),
        short_description: formData.short_description.trim(),
        description: formData.description.trim(),
        transport_type: normalizeTransportType(formData.transport_type),
        dispatch_type: formData.dispatch_type,
        icon_types: normalizeIconType(formData.icon_types),
        category: formData.category,
        image: formData.image || '',
        icon: formData.map_icon || '',
        map_icon: formData.map_icon || '',
        capacity: Number(formData.capacity || 0),
        size: formData.size,
        is_taxi: normalizeTaxiMode(formData.is_taxi || formData.transport_type),
        is_accept_share_ride: Number(formData.is_accept_share_ride || 0),
        delivery_category: showsDeliveryCategorySelector ? formData.delivery_category : '',
        delivery_distance_pricing: showsDeliveryCategorySelector
          ? {
              enabled: Boolean(formData.delivery_distance_pricing?.enabled),
              base_price: Number(formData.delivery_distance_pricing?.base_price || 0),
              free_distance: Number(formData.delivery_distance_pricing?.free_distance || 0),
              distance_price: Number(formData.delivery_distance_pricing?.distance_price || 0),
              free_time: 0,
              time_price: 0,
            }
          : {
              enabled: false,
              base_price: 0,
              free_distance: 0,
              distance_price: 0,
              free_time: 0,
              time_price: 0,
            },
        service_tax: showsDeliveryCategorySelector ? Number(formData.service_tax || 0) : 0,
        admin_commission_type_from_driver: Number(formData.admin_commission_type_from_driver || 1),
        admin_commission_from_driver: Number(formData.admin_commission_from_driver || 0),
        status: formData.active ? 1 : 0,
        active: formData.active,
        supported_other_vehicle_types: sanitizeObjectIdList(formData.supported_other_vehicle_types),
        vehicle_preference: sanitizeObjectIdList(formData.vehicle_preference),
      };
      if (id) {
        await api.patch(`/admin/types/vehicle-types/${id}`, payload);
      } else {
        await api.post('/admin/types/vehicle-types', payload);
      }
      navigate('/taxi/admin/pricing/vehicle-type');
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || error.message || 'Could not save vehicle type.');
    } finally {
      setIsSaving(false);
    }
  };
  const handleDelete = async (vehicleId) => {
    if (!(await window.confirmAsync('Delete this vehicle type?'))) {
      return;
    }
    try {
      await api.delete(`/admin/types/vehicle-types/${vehicleId}`);
      setVehicles((prev) => prev.filter((item) => String(item.id) !== String(vehicleId)));
    } catch (error) {
      setErrorMessage(error.message || 'Could not delete vehicle type.');
    }
  };
  if (!isEditor) {
    const deliveryTypes = vehicles.filter((item) => ['delivery', 'both'].includes(String(item.transport_type || '').toLowerCase())).length;
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={Car}
          title="Vehicle types"
          subtitle="The ride and delivery vehicle catalogue"
          breadcrumb={[{ label: 'Taxi' }, { label: 'Pricing' }, { label: 'Vehicle types' }]}
          actions={
            <Button type="button" onClick={() => navigate('/taxi/admin/pricing/vehicle-type/create')} className={BTN_PRIMARY}>
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Add vehicle</Span>
            </Button>
          }
        />

        <StatGrid className="mb-4">
          <StatCard label="Total types" value={String(vehicles.length)} icon={Car} tone="info" />
          <StatCard label="Active" value={String(vehicles.filter((item) => item.active !== false).length)} icon={CheckCircle2} tone="success" />
          <StatCard label="Delivery types" value={String(deliveryTypes)} icon={Package} tone="warning" />
        </StatGrid>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : errorMessage ? (
          <ErrorState title="Could not load vehicle types" message={errorMessage} />
        ) : !vehicles.length ? (
          <EmptyState
            icon={Car}
            title="No vehicle types yet"
            message="Add a vehicle type so riders and senders have something to choose."
            actionLabel="Add vehicle"
            onAction={() => navigate('/taxi/admin/pricing/vehicle-type/create')}
          />
        ) : (
          <DataTable cols={VEHICLE_COLS}>
            <THead cols={VEHICLE_COLS} labels={VEHICLE_LABELS} />
            <TBody>
              {vehicles.map((vehicle, i, all) => (
                <Row key={vehicle.id} last={i === all.length - 1}>
                  <Cell width={VEHICLE_COLS[0]}>
                    <Div className="flex-row items-center gap-2">
                      <Div className="w-10 h-10 rounded-lg bg-slate-100 items-center justify-center shrink-0">
                        <Img
                          src={vehicle.image || vehicle.map_icon || vehicle.icon || iconMap[normalizeIconType(vehicle.icon_types)] || CarIcon}
                          alt={vehicle.name}
                          className="w-7 h-7"
                          contentFit="contain"
                        />
                      </Div>
                      <Div className="flex-1 min-w-0">
                        <Span className="text-sm font-semibold text-slate-900">{vehicle.name || 'Unnamed'}</Span>
                        <Span className="text-xs text-slate-500">{vehicle.short_description || vehicle.description || 'No description added'}</Span>
                      </Div>
                    </Div>
                  </Cell>
                  <Cell width={VEHICLE_COLS[1]}>
                    <StatusBadge status={vehicle.transport_type || 'taxi'} tone="info" />
                  </Cell>
                  <Cell width={VEHICLE_COLS[2]}>{vehicle.trip_dispatch_type || vehicle.dispatch_type || 'normal'}</Cell>
                  <Cell width={VEHICLE_COLS[3]}>
                    <StatusToggle active={vehicle.active !== false} onToggle={() => {}} label={`Toggle ${vehicle.name || 'vehicle'}`} />
                  </Cell>
                  <Cell width={VEHICLE_COLS[4]}>
                    <Div className="flex-row items-center gap-1">
                      <Button
                        type="button"
                        accessibilityLabel={`Edit ${vehicle.name || 'vehicle'}`}
                        onClick={() => navigate(`/taxi/admin/pricing/vehicle-type/edit/${vehicle.id}`)}
                        className="w-11 h-11 rounded-lg items-center justify-center"
                      >
                        <UiIcon as={Edit2} size={16} className="text-slate-600" />
                      </Button>
                      <Button
                        type="button"
                        accessibilityLabel={`Delete ${vehicle.name || 'vehicle'}`}
                        onClick={() => handleDelete(vehicle.id)}
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
        )}
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={Car}
        title={id ? 'Edit vehicle type' : 'Create vehicle type'}
        subtitle="Transport, icon, dispatch and compatibility for one vehicle type"
        breadcrumb={[
          { label: 'Taxi' },
          { label: 'Vehicle types', onPress: () => navigate('/taxi/admin/pricing/vehicle-type') },
          { label: id ? 'Edit' : 'Create' },
        ]}
        actions={
          <Button type="button" onClick={() => navigate('/taxi/admin/pricing/vehicle-type')} className={BTN_SECONDARY}>
            <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Back</Span>
          </Button>
        }
      />

      {errorMessage ? <ErrorState title="Something went wrong" message={errorMessage} className="mb-4" /> : null}

      <Card className="mb-4">
        <SectionTitle>Identity</SectionTitle>
        <Div className={`grid grid-cols-${columns} gap-3`}>
          <Field label="Transport type" required hint="Choose Both for vehicles that handle rides and parcels">
            <Select
              value={formData.transport_type}
              onChange={(e) => {
                const nextTransportType = e.target.value;
                updateForm('transport_type', nextTransportType);
                if (!['delivery', 'both'].includes(normalizeTransportType(nextTransportType))) {
                  updateForm('delivery_category', '');
                  updateForm('delivery_distance_pricing', normalizeDeliveryDistancePricing());
                }
              }}
              className={INPUT}
            >
              <Option value="">Select transport type</Option>
              {transportTypeOptions.map((t) => (
                <Option key={t.id || t._id || t.name} value={t.name}>
                  {t.display_name}
                </Option>
              ))}
            </Select>
          </Field>

          <Field
            label="Name"
            required
            hint={selectedTransportTypeOption ? getTransportTypeOptionDescription(selectedTransportTypeOption.name, formData.name) : undefined}
          >
            <Input type="text" value={formData.name} onChange={(e) => updateForm('name', e.target.value)} className={INPUT} placeholder="Parcel" />
          </Field>

          <Field label="Icon type" required>
            <Select value={formData.icon_types} onChange={(e) => updateForm('icon_types', e.target.value)} className={INPUT}>
              {Object.keys(iconMap).map((key) => (
                <Option key={key} value={key}>
                  {ICON_TYPE_LABELS[key] || key}
                </Option>
              ))}
            </Select>
          </Field>

          <Field label="Category">
            <Select value={formData.category} onChange={(e) => updateForm('category', e.target.value)} className={INPUT}>
              {VEHICLE_CATEGORY_OPTIONS.map((option) => (
                <Option key={option.id || 'empty'} value={option.id}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Field>

          <Field label="Trip dispatch type" required>
            <Select value={formData.dispatch_type} onChange={(e) => updateForm('dispatch_type', e.target.value)} className={INPUT}>
              <Option value="normal">Normal</Option>
              <Option value="both">Both</Option>
            </Select>
          </Field>

          <Field label="Operational scope" required>
            <Select value={formData.is_taxi} onChange={(e) => updateForm('is_taxi', e.target.value)} className={INPUT}>
              <Option value="">Select scope</Option>
              {transportTypes.map((t) => (
                <Option key={t.id || t._id} value={t.name}>
                  {t.display_name}
                </Option>
              ))}
            </Select>
          </Field>

          <Field label="Maximum weight / capacity" required>
            <Input type="number" value={formData.capacity} onChange={(e) => updateForm('capacity', e.target.value)} className={INPUT} placeholder="12" />
          </Field>

          <Field label="Size" required>
            <Input type="text" value={formData.size} onChange={(e) => updateForm('size', e.target.value)} className={INPUT} placeholder="2" />
          </Field>

          <Field label="Short description" required>
            <Input
              type="text"
              value={formData.short_description}
              onChange={(e) => updateForm('short_description', e.target.value)}
              className={INPUT}
              placeholder="Normal delivery"
            />
          </Field>

          <Field label="Description" required>
            <Textarea
              rows={4}
              value={formData.description}
              onChange={(e) => updateForm('description', e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              placeholder="Parcel delivery"
            />
          </Field>
        </Div>
      </Card>

      {showsDeliveryCategorySelector ? (
        <Card className="mb-4">
          <SectionTitle>Delivery category</SectionTitle>
          <Span className="text-sm text-slate-500 mb-3">This decides which delivery card the vehicle appears under in the parcel flow.</Span>
          <Div className={`grid grid-cols-${columns} gap-3`}>
            {DELIVERY_CATEGORY_OPTIONS.map((option) => {
              const selected = formData.delivery_category === option.id;
              return (
                <Button
                  key={option.id}
                  type="button"
                  onClick={() => updateForm('delivery_category', option.id)}
                  className={`p-3 rounded-xl border ${selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}
                >
                  <Img src={option.image} alt={option.title} className="w-full h-24" contentFit="contain" />
                  <Div className="flex-row items-start justify-between gap-2 mt-3">
                    <Div className="flex-1 min-w-0">
                      <Span className="text-sm font-semibold text-slate-900">{option.title}</Span>
                      <Span className="text-xs text-slate-500">{option.description}</Span>
                    </Div>
                    {selected ? <UiIcon as={CheckCircle2} size={18} className="text-blue-600 shrink-0" /> : null}
                  </Div>
                </Button>
              );
            })}
          </Div>
        </Card>
      ) : null}

      {showsDeliveryCategorySelector ? (
        <Card className="mb-4">
          <SectionTitle>Delivery distance charges</SectionTitle>
          <Label className="flex-row items-center gap-2 h-11">
            <Input
              type="checkbox"
              checked={Boolean(formData.delivery_distance_pricing?.enabled)}
              onChange={(e) =>
                updateForm('delivery_distance_pricing', {
                  ...formData.delivery_distance_pricing,
                  enabled: e.target.checked,
                })
              }
            />
            <Span className="text-sm text-slate-700">Enable distance based charges</Span>
          </Label>

          <Div className={`grid grid-cols-${columns} gap-3 mt-3`}>
            <Field label="Base price">
              <Input
                type="number"
                min="0"
                value={formData.delivery_distance_pricing?.base_price ?? ''}
                onChange={(e) =>
                  updateForm('delivery_distance_pricing', {
                    ...formData.delivery_distance_pricing,
                    base_price: e.target.value,
                  })
                }
                className={INPUT}
                placeholder="45"
                disabled={!formData.delivery_distance_pricing?.enabled}
              />
            </Field>

            <Field label="Base distance (km)" hint="Distance covered by the base price before per-km charges begin">
              <Input
                type="number"
                min="0"
                value={formData.delivery_distance_pricing?.free_distance ?? ''}
                onChange={(e) =>
                  updateForm('delivery_distance_pricing', {
                    ...formData.delivery_distance_pricing,
                    free_distance: e.target.value,
                  })
                }
                className={INPUT}
                placeholder="2"
                disabled={!formData.delivery_distance_pricing?.enabled}
              />
            </Field>

            <Field label="Distance price">
              <Input
                type="number"
                min="0"
                value={formData.delivery_distance_pricing?.distance_price ?? ''}
                onChange={(e) =>
                  updateForm('delivery_distance_pricing', {
                    ...formData.delivery_distance_pricing,
                    distance_price: e.target.value,
                  })
                }
                className={INPUT}
                placeholder="12"
                disabled={!formData.delivery_distance_pricing?.enabled}
              />
            </Field>

            <Field label="Service tax (%)" hint="Added on top of the delivery fare shown to the user">
              <Input
                type="number"
                min="0"
                value={formData.service_tax}
                onChange={(e) => updateForm('service_tax', clampNonNegativeInput(e.target.value))}
                className={INPUT}
                placeholder="5"
              />
            </Field>

            <Field label="Commission type from driver">
              <Select
                value={formData.admin_commission_type_from_driver}
                onChange={(e) => updateForm('admin_commission_type_from_driver', e.target.value)}
                className={INPUT}
              >
                <Option value="1">Percentage</Option>
                <Option value="2">Fixed</Option>
              </Select>
            </Field>

            <Field label="Commission from driver">
              <Input
                type="number"
                min="0"
                value={formData.admin_commission_from_driver}
                onChange={(e) => updateForm('admin_commission_from_driver', clampNonNegativeInput(e.target.value))}
                className={INPUT}
                placeholder="0"
              />
            </Field>
          </Div>
        </Card>
      ) : null}

      <Card className="mb-4">
        <SectionTitle>Images</SectionTitle>
        <Div className={`grid grid-cols-${columns} gap-3`}>
          <Field label="Preview image" hint="Shown in the rider's vehicle selection card">
            <Div className="h-[220px] rounded-lg border border-slate-200 bg-slate-50 items-center justify-center">
              {previewImage ? (
                <>
                  <Img src={previewImage} alt="Vehicle preview" className="w-full h-[180px]" contentFit="contain" />
                  <Button type="button" accessibilityLabel="Remove preview image" onClick={() => updateForm('image', '')} className={`${BTN_SECONDARY} mt-2`}>
                    <UiIcon as={Trash2} size={16} className="text-red-600" />
                    <Span className="text-sm font-semibold text-red-600">Remove</Span>
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={() => handleImageChange('image')} className={BTN_SECONDARY}>
                  <UiIcon as={Upload} size={16} className="text-slate-600" />
                  <Span className={BTN_TEXT_SECONDARY}>Upload preview image</Span>
                </Button>
              )}
            </Div>
          </Field>

          <Field label="Map icon" hint="Saved to the database and used on the app maps">
            <Div className="h-[180px] rounded-lg border border-slate-200 bg-white overflow-hidden items-center justify-center">
              <Img src={MapBackground} alt="Map preview" className="absolute inset-0 w-full h-full" contentFit="cover" />
              <Img src={mapIconPreview} alt="Icon preview" className="w-14 h-14" contentFit="contain" />
            </Div>
            <Div className="flex-row flex-wrap gap-2 mt-2">
              <Button type="button" onClick={() => handleImageChange('map_icon')} className={BTN_SECONDARY}>
                <UiIcon as={Upload} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>Change</Span>
              </Button>
              {formData.map_icon ? (
                <Button type="button" onClick={() => updateForm('map_icon', '')} className={BTN_SECONDARY}>
                  <Span className="text-sm font-semibold text-red-600">Use icon type instead</Span>
                </Button>
              ) : null}
            </Div>
          </Field>
        </Div>

        <Span className="text-xs font-semibold uppercase text-slate-500 mt-4 mb-2">Rider card preview</Span>
        <Div className="flex-row items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
          <Div className="w-12 h-12 rounded-lg bg-slate-100 items-center justify-center shrink-0">
            <Img src={previewImage || mapIconPreview} alt="Rider card vehicle preview" className="w-9 h-9" contentFit="contain" />
          </Div>
          <Div className="flex-1 min-w-0">
            <Span className="text-sm font-semibold text-slate-900">{formData.name || 'Taxi'}</Span>
            <Span className="text-xs text-slate-500">{formData.short_description || formData.description || 'Closest driver 940 m away'}</Span>
            {showsDeliveryCategorySelector ? (
              <Span className="text-xs text-slate-500">{`Includes ${Number(formData.service_tax || 0).toFixed(2)}% service tax`}</Span>
            ) : null}
          </Div>
          <Span className="text-sm font-semibold text-slate-900">₹31</Span>
        </Div>
      </Card>

      <Card className="mb-4">
        <SectionTitle>Compatibility</SectionTitle>
        <Div className="gap-3">
          <VehicleMultiSelect
            label="Supported other vehicle types"
            options={availableSupportVehicles}
            value={formData.supported_other_vehicle_types}
            onChange={(next) => updateForm('supported_other_vehicle_types', next)}
            placeholder="No supporting vehicle types selected"
          />
          <VehicleMultiSelect
            label="Vehicle preferences"
            options={preferenceOptions}
            value={formData.vehicle_preference}
            onChange={(next) => updateForm('vehicle_preference', next)}
            placeholder="No preferences selected"
          />
        </Div>
      </Card>

      <Card className="mb-4">
        <SectionTitle>Availability</SectionTitle>
        <Label className="flex-row items-center gap-2 h-11">
          <Input type="checkbox" checked={formData.is_accept_share_ride === 1} onChange={(e) => updateForm('is_accept_share_ride', e.target.checked ? 1 : 0)} />
          <Span className="text-sm text-slate-700">Accept share ride</Span>
        </Label>
        <Label className="flex-row items-center gap-2 h-11">
          <Input
            type="checkbox"
            checked={formData.active}
            onChange={(e) => {
              updateForm('active', e.target.checked);
              updateForm('status', e.target.checked ? 1 : 0);
            }}
          />
          <Span className="text-sm text-slate-700">Active vehicle type</Span>
        </Label>
        <Div className="flex-row items-start gap-2 p-3 rounded-lg bg-blue-50 mt-2">
          <UiIcon as={Info} size={16} className="text-blue-700 shrink-0 mt-0.5" />
          <Span className="text-xs text-slate-700 flex-1">
            Transport type, icon type, supported vehicles and preferences all save to the live vehicle catalogue.
          </Span>
        </Div>
      </Card>

      <Card className={`${tablet ? 'flex-row justify-end' : ''} gap-3`}>
        <Button type="button" onClick={() => navigate('/taxi/admin/pricing/vehicle-type')} className={BTN_SECONDARY}>
          <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
        </Button>
        <Button type="button" onClick={handleSave} disabled={isSaving || loading} className={BTN_PRIMARY}>
          <UiIcon as={Save} size={16} className="text-white" />
          <Span className={BTN_TEXT_PRIMARY}>{isSaving ? 'Saving…' : id ? 'Update' : 'Create'}</Span>
        </Button>
      </Card>
    </AdminPage>
  );
};
export default VehicleType;
