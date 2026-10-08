/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/CreatePackagePrice.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, Plus, Trash2, MapPin, X, Car } from 'lucide-react-native';
import { motion, AnimatePresence } from '../../../../../lib/motion';
import { useNavigate, useParams } from '../../../../../lib/webRouter';
import { toast } from '../../../../../lib/notify';
import { adminService } from '../../services/adminService';
import PlaceSearchField from './PlaceSearchField';
import { useAppGoogleMapsLoader, HAS_VALID_GOOGLE_MAPS_KEY } from '../../utils/googleMaps';
import { Button, Div, Form, H1, H2, H3, Input, Label, Link, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../../components/web';
const inputClass =
  'w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-slate-800 outline-none transition-all shadow-sm hover:border-amber-300 focus:border-amber-400 focus:ring-1 focus:ring-amber-400';
const labelClass = 'mb-0.5 block text-xs font-semibold text-slate-800';
const selectWrapClass = 'relative';
const createVehiclePriceRow = () => ({
  id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  vehicle_type: '',
  base_price: '',
  free_distance: '',
  distance_price: '',
  free_time: '',
  time_price: '',
  admin_commision_type: '1',
  admin_commision: '0',
  admin_commission_type_from_driver: '1',
  admin_commission_from_driver: '0',
  service_tax: '0',
  cancellation_fee: '',
  active: 1,
});
const initialFormState = {
  service_location_id: '',
  package_type_id: '',
  package_destination: '',
  package_availability: 'available',
  status: 'active',
  active: 1,
  package_vehicle_prices: [createVehiclePriceRow()],
};
const CreatePackagePrice = ({ mode = 'create' }) => {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === 'edit';
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [serviceLocations, setServiceLocations] = useState([]);
  const [packageTypes, setPackageTypes] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const { isLoaded } = useAppGoogleMapsLoader();
  const vehicleLabelMap = useMemo(
    () =>
      vehicleTypes.reduce((acc, item) => {
        acc[String(item._id || item.id)] = item.name || 'Vehicle';
        return acc;
      }, {}),
    [vehicleTypes],
  );
  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(isEdit);
        const [locationsRes, packagesRes, vehiclesRes] = await Promise.all([
          adminService.getServiceLocations(),
          adminService.getRentalPackageTypes(),
          adminService.getVehicleTypes(),
        ]);
        const locations = locationsRes?.data?.locations || locationsRes?.data?.results || locationsRes?.results || [];
        const packages =
          packagesRes?.data?.rental_packages?.results ||
          packagesRes?.data?.rental_packages ||
          packagesRes?.rental_packages?.results ||
          packagesRes?.rental_packages ||
          packagesRes?.results ||
          [];
        const vehicles = vehiclesRes?.data?.vehicle_types || vehiclesRes?.data?.results || vehiclesRes?.results || [];
        setServiceLocations(Array.isArray(locations) ? locations : []);
        setPackageTypes(Array.isArray(packages) ? packages : []);
        setVehicleTypes(Array.isArray(vehicles) ? vehicles : []);
        if (isEdit && packageId) {
          const response = await adminService.getSetPrices({
            scope: 'package',
          });
          const items = response?.data?.paginator?.data || response?.paginator?.data || response?.data?.results || [];
          const selected = (Array.isArray(items) ? items : []).find((item) => String(item.id || item._id) === String(packageId));
          if (!selected) {
            toast.error('Package pricing not found');
            navigate('/taxi/admin/pricing/package-pricing');
            return;
          }
          setFormData({
            service_location_id: selected.service_location?._id || selected.service_location?.id || '',
            package_type_id: selected.package_type?._id || selected.package_type?.id || selected.package_type_id || '',
            package_destination: selected.package_destination || '',
            package_availability: selected.package_availability || 'available',
            status: selected.status || 'active',
            active: Number(selected.active ?? 1),
            package_vehicle_prices:
              Array.isArray(selected.package_vehicle_prices) && selected.package_vehicle_prices.length
                ? selected.package_vehicle_prices.map((row, index) => ({
                    id: row.id || `row-${index}`,
                    vehicle_type: row.vehicle_type?._id || row.vehicle_type?.id || row.vehicle_type || '',
                    base_price: String(row.base_price ?? ''),
                    free_distance: String(row.free_distance ?? ''),
                    distance_price: String(row.distance_price ?? ''),
                    free_time: String(row.free_time ?? ''),
                    time_price: String(row.time_price ?? ''),
                    admin_commision_type: String(row.admin_commision_type ?? 1),
                    admin_commision: String(row.admin_commision ?? 0),
                    admin_commission_type_from_driver: String(row.admin_commission_type_from_driver ?? 1),
                    admin_commission_from_driver: String(row.admin_commission_from_driver ?? 0),
                    service_tax: String(row.service_tax ?? 0),
                    cancellation_fee: String(row.cancellation_fee ?? ''),
                    active: Number(row.active ?? 1),
                  }))
                : [createVehiclePriceRow()],
          });
        }
      } catch (error) {
        toast.error('Failed to load package pricing form');
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [isEdit, packageId, navigate]);
  const updateTopLevel = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };
  const updateRow = (rowId, field, value) => {
    setFormData((current) => ({
      ...current,
      package_vehicle_prices: current.package_vehicle_prices.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    }));
  };
  const addRow = () => {
    setFormData((current) => ({
      ...current,
      package_vehicle_prices: [...current.package_vehicle_prices, createVehiclePriceRow()],
    }));
  };
  const removeRow = (rowId) => {
    setFormData((current) => ({
      ...current,
      package_vehicle_prices: current.package_vehicle_prices.filter((row) => row.id !== rowId),
    }));
  };
  const handlePlaceChanged = (place) => {
    if (place && (place.formatted_address || place.name)) {
      updateTopLevel('package_destination', place.formatted_address || place.name);
    }
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.package_type_id) return toast.error('Choose a package type');
    if (!formData.package_destination.trim()) return toast.error('Add a destination');
    if (!formData.package_vehicle_prices.every((row) => row.vehicle_type && row.base_price !== '')) {
      return toast.error('Each vehicle row needs a vehicle and base price');
    }
    const payload = {
      pricing_scope: 'package',
      transport_type: 'rental',
      service_location_id: formData.service_location_id || null,
      package_type_id: formData.package_type_id,
      package_destination: formData.package_destination.trim(),
      package_availability: formData.package_availability,
      status: formData.status,
      active: Number(formData.active ?? 1),
      package_vehicle_prices: formData.package_vehicle_prices.map(({ id, ...row }) => ({
        ...row,
        active: Number(row.active ?? 1),
      })),
    };
    try {
      setSaving(true);
      if (isEdit && packageId) {
        await adminService.updateSetPrice(packageId, payload);
        toast.success('Package pricing updated');
      } else {
        await adminService.createSetPrice(payload);
        toast.success('Package pricing created');
      }
      navigate('/taxi/admin/pricing/package-pricing');
    } catch (error) {
      toast.error('Failed to save package pricing');
    } finally {
      setSaving(false);
    }
  };
  return (
    <ScrollDiv className="min-h-screen bg-[#F8F9FD] p-3 lg:p-4 font-sans">
      <Div className="flex flex-col gap-3 border-b border-gray-100 pb-2 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <Div>
          <H1
            className="text-2xl font-bold text-[#1E293B]"
            style={{
              fontFamily: 'Playfair',
            }}
          >
            {isEdit ? 'Edit Package Pricing' : 'Create Package Pricing'}
          </H1>
          <P className="mt-1 text-xs text-slate-500">Use a simple package form and set a different price block for each vehicle.</P>
        </Div>
        <Div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium tracking-tight">
          <Span className="hover:text-slate-600 transition-colors cursor-pointer" onClick={() => navigate('/taxi/admin/pricing/package-pricing')}>
            Package Pricing
          </Span>
          <UiIcon as={ChevronRight} size={10} className="text-slate-300" />
          <Span className="text-slate-800 font-bold">{isEdit ? 'Edit' : 'Create'}</Span>
        </Div>
      </Div>

      <Div className="relative rounded-[28px] border border-gray-100 bg-white shadow-sm">
        {loading && (
          <Div className="absolute inset-0 z-10 flex items-center justify-center rounded-[28px] bg-white/80">
            <UiIcon as={Loader2} className="h-8 w-8 animate-spin text-amber-500" />
          </Div>
        )}

        <Form onSubmit={handleSubmit} className="p-4">
          <Div className="mb-4 flex items-center justify-between">
            <Button
              type="button"
              onClick={() => navigate('/taxi/admin/pricing/package-pricing')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
            >
              <UiIcon as={ArrowLeft} size={16} />
              Back to Package Pricing
            </Button>
            <Button
              type="button"
              onClick={() => setShowHowItWorks(true)}
              className="text-[11px] font-bold text-amber-500 underline decoration-dotted underline-offset-4"
            >
              How It Works
            </Button>
          </Div>

          <Div className="grid grid-cols-1 gap-x-4 gap-y-3 border-b border-dashed border-gray-200 pb-4 md:grid-cols-3">
            <Div>
              <Label className={labelClass}>
                Package Type <Span className="text-rose-500">*</Span>
              </Label>
              <Div className={selectWrapClass}>
                <Select
                  value={formData.package_type_id}
                  onChange={(event) => updateTopLevel('package_type_id', event.target.value)}
                  className={`${inputClass} appearance-none`}
                  required
                >
                  {/* The list is empty until someone creates a package type, and
                      an empty dropdown with no explanation gives an admin
                      nothing to act on — the prerequisite lives on a different
                      screen entirely. Name it, and link to it. */}
                  <Option value="">{packageTypes.length ? 'Select package type' : 'No package types yet'}</Option>
                  {packageTypes.map((item) => (
                    <Option key={item._id || item.id} value={item._id || item.id}>
                      {item.name}
                    </Option>
                  ))}
                </Select>
                <UiIcon as={ChevronDown} size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </Div>
              {!packageTypes.length && (
                <P className="mt-1 text-xs text-amber-700">
                  Create one first under{' '}
                  <Link to="/taxi/admin/pricing/rental-packages/create" className="font-semibold underline underline-offset-2">
                    Rental Package Types
                  </Link>
                  , then come back here.
                </P>
              )}
            </Div>

            <Div>
              <Label className={labelClass}>
                Destination <Span className="text-rose-500">*</Span>
              </Label>
              {isLoaded && HAS_VALID_GOOGLE_MAPS_KEY ? (
                <PlaceSearchField
                  value={formData.package_destination}
                  onValueChange={(next) => updateTopLevel('package_destination', next)}
                  onPlace={handlePlaceChanged}
                  icon={MapPin}
                  placeholder="Search destination city (India)"
                  className={`${inputClass} pl-10`}
                />
              ) : (
                <Input
                  value={formData.package_destination}
                  onChange={(event) => updateTopLevel('package_destination', event.target.value)}
                  className={inputClass}
                  placeholder="Enter destination"
                  required
                />
              )}
            </Div>

            <Div>
              <Label className={labelClass}>Available In</Label>
              <Div className={selectWrapClass}>
                <Select
                  value={formData.service_location_id}
                  onChange={(event) => updateTopLevel('service_location_id', event.target.value)}
                  className={`${inputClass} appearance-none`}
                >
                  <Option value="">All service locations</Option>
                  {serviceLocations.map((item) => (
                    <Option key={item._id || item.id} value={item._id || item.id}>
                      {item.name || item.service_location_name}
                    </Option>
                  ))}
                </Select>
                <UiIcon as={ChevronDown} size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </Div>
            </Div>

            <Div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 md:col-span-3 lg:col-span-1">
              <Div>
                <Label className={labelClass}>Availability</Label>
                <Div className={selectWrapClass}>
                  <Select
                    value={formData.package_availability}
                    onChange={(event) => updateTopLevel('package_availability', event.target.value)}
                    className={`${inputClass} appearance-none`}
                  >
                    <Option value="available">Available</Option>
                    <Option value="unavailable">Unavailable</Option>
                  </Select>
                  <UiIcon as={ChevronDown} size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </Div>
              </Div>
              <Div>
                <Label className={labelClass}>Status</Label>
                <Div className={selectWrapClass}>
                  <Select
                    value={formData.active}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      updateTopLevel('active', next);
                      updateTopLevel('status', next === 1 ? 'active' : 'inactive');
                    }}
                    className={`${inputClass} appearance-none`}
                  >
                    <Option value={1}>Active</Option>
                    <Option value={0}>Inactive</Option>
                  </Select>
                  <UiIcon as={ChevronDown} size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </Div>
              </Div>
            </Div>
          </Div>

          <Div className="mt-4 space-y-4">
            <Div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Div>
                <H2 className="text-base font-bold text-slate-900">Vehicle-wise Pricing</H2>
                <P className="mt-1 text-sm text-slate-500">Each vehicle can have its own package amount and commission setup.</P>
              </Div>
              <Button
                type="button"
                onClick={addRow}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600 transition hover:bg-amber-100"
              >
                <UiIcon as={Plus} size={14} />
                Add Vehicle Price
              </Button>
            </Div>

            {formData.package_vehicle_prices.length === 0 ? (
              <Div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50/50 p-6 text-center">
                <P className="text-sm font-bold text-slate-500">No vehicle pricing added yet.</P>
                <Button
                  type="button"
                  onClick={addRow}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-500"
                >
                  <UiIcon as={Plus} size={16} /> Add Vehicle Price
                </Button>
              </Div>
            ) : (
              formData.package_vehicle_prices.map((row, index) => (
                <Div key={row.id} className="rounded-xl border border-gray-200 bg-[#FCFCFD] p-3 lg:p-4">
                  <Div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Div>
                      <P className="text-sm font-semibold text-amber-500">Vehicle Pricing {index + 1}</P>
                      <P className="mt-0.5 text-xs text-slate-500">{vehicleLabelMap[row.vehicle_type] || 'Choose vehicle and fill its package pricing'}</P>
                    </Div>
                    <Button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                    >
                      <UiIcon as={Trash2} size={14} />
                      Remove
                    </Button>
                  </Div>

                  <Div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
                    <Div>
                      <Label className={labelClass}>
                        Vehicle Type <Span className="text-rose-500">*</Span>
                      </Label>
                      <Div className={selectWrapClass}>
                        <Select
                          value={row.vehicle_type}
                          onChange={(event) => updateRow(row.id, 'vehicle_type', event.target.value)}
                          className={`${inputClass} appearance-none`}
                          required
                        >
                          <Option value="">{vehicleTypes.length ? 'Select vehicle type' : 'No vehicle types yet'}</Option>
                          {vehicleTypes.map((item) => (
                            <Option key={item._id || item.id} value={item._id || item.id}>
                              {item.name}
                            </Option>
                          ))}
                        </Select>
                        <UiIcon as={ChevronDown} size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      </Div>
                      {!vehicleTypes.length && (
                        <P className="mt-1 text-xs text-amber-700">
                          Add one under{' '}
                          <Link to="/taxi/admin/pricing/vehicle-type/create" className="font-semibold underline underline-offset-2">
                            Vehicle Type
                          </Link>
                          .
                        </P>
                      )}
                    </Div>

                    <Div>
                      <Label className={labelClass}>
                        Base Price Inclusive of tax <Span className="text-rose-500">*</Span>
                      </Label>
                      <Input
                        type="number"
                        value={row.base_price}
                        onChange={(event) => updateRow(row.id, 'base_price', event.target.value)}
                        className={inputClass}
                        placeholder="Enter Base Price Inclusive of tax"
                        required
                      />
                    </Div>

                    <Div>
                      <Label className={labelClass}>
                        Free Distance (Kilometers) <Span className="text-rose-500">*</Span>
                      </Label>
                      <Input
                        type="number"
                        value={row.free_distance}
                        onChange={(event) => updateRow(row.id, 'free_distance', event.target.value)}
                        className={inputClass}
                        placeholder="Enter Free Distance"
                        required
                      />
                    </Div>

                    <Div>
                      <Label className={labelClass}>
                        Distance Price <Span className="text-rose-500">*</Span>
                      </Label>
                      <Input
                        type="number"
                        value={row.distance_price}
                        onChange={(event) => updateRow(row.id, 'distance_price', event.target.value)}
                        className={inputClass}
                        placeholder="Enter Price Per Distance"
                        required
                      />
                    </Div>

                    <Div>
                      <Label className={labelClass}>Free Time in Minute</Label>
                      <Input
                        type="number"
                        value={row.free_time}
                        onChange={(event) => updateRow(row.id, 'free_time', event.target.value)}
                        className={inputClass}
                        placeholder="Enter Free minute"
                      />
                    </Div>

                    <Div>
                      <Label className={labelClass}>
                        Time Price in Minute <Span className="text-rose-500">*</Span>
                      </Label>
                      <Input
                        type="number"
                        value={row.time_price}
                        onChange={(event) => updateRow(row.id, 'time_price', event.target.value)}
                        className={inputClass}
                        placeholder="Enter Time Price"
                        required
                      />
                    </Div>

                    <Div>
                      <Label className={labelClass}>
                        Admin Commission Type From Customer <Span className="text-rose-500">*</Span>
                      </Label>
                      <Div className={selectWrapClass}>
                        <Select
                          value={row.admin_commision_type}
                          onChange={(event) => updateRow(row.id, 'admin_commision_type', event.target.value)}
                          className={`${inputClass} appearance-none`}
                          required
                        >
                          <Option value="1">Percentage</Option>
                          <Option value="2">Fixed</Option>
                        </Select>
                        <UiIcon as={ChevronDown} size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      </Div>
                    </Div>

                    <Div>
                      <Label className={labelClass}>
                        Admin Commission From Customer <Span className="text-rose-500">*</Span>
                      </Label>
                      <Input
                        type="number"
                        value={row.admin_commision}
                        onChange={(event) => updateRow(row.id, 'admin_commision', event.target.value)}
                        className={inputClass}
                        placeholder="0"
                        required
                      />
                    </Div>

                    <Div>
                      <Label className={labelClass}>
                        Admin Commission Type From Driver <Span className="text-rose-500">*</Span>
                      </Label>
                      <Div className={selectWrapClass}>
                        <Select
                          value={row.admin_commission_type_from_driver}
                          onChange={(event) => updateRow(row.id, 'admin_commission_type_from_driver', event.target.value)}
                          className={`${inputClass} appearance-none`}
                          required
                        >
                          <Option value="1">Percentage</Option>
                          <Option value="2">Fixed</Option>
                        </Select>
                        <UiIcon as={ChevronDown} size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      </Div>
                    </Div>

                    <Div>
                      <Label className={labelClass}>
                        Admin Commission From Driver <Span className="text-rose-500">*</Span>
                      </Label>
                      <Input
                        type="number"
                        value={row.admin_commission_from_driver}
                        onChange={(event) => updateRow(row.id, 'admin_commission_from_driver', event.target.value)}
                        className={inputClass}
                        placeholder="0"
                        required
                      />
                    </Div>

                    <Div>
                      <Label className={labelClass}>
                        Service Tax (%) <Span className="text-rose-500">*</Span>
                      </Label>
                      <Input
                        type="number"
                        value={row.service_tax}
                        onChange={(event) => updateRow(row.id, 'service_tax', event.target.value)}
                        className={inputClass}
                        placeholder="0"
                        required
                      />
                    </Div>

                    <Div>
                      <Label className={labelClass}>
                        Cancellation Fee <Span className="text-rose-500">*</Span>
                      </Label>
                      <Input
                        type="number"
                        value={row.cancellation_fee}
                        onChange={(event) => updateRow(row.id, 'cancellation_fee', event.target.value)}
                        className={inputClass}
                        placeholder="Cancellation Fee"
                        required
                      />
                    </Div>
                  </Div>
                </Div>
              ))
            )}
          </Div>

          <Div className="mt-8 flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-8 py-3 text-sm font-bold text-black transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : null}
              {isEdit ? 'Update Package Pricing' : 'Save Package Pricing'}
            </Button>
          </Div>
        </Form>

        <AnimatePresence>
          {showHowItWorks && (
            <motion.div
              initial={{
                x: '100%',
                opacity: 0,
              }}
              animate={{
                x: 0,
                opacity: 1,
              }}
              exit={{
                x: '100%',
                opacity: 0,
              }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 200,
              }}
              className="absolute top-10 right-4 h-auto max-h-[85%] w-72 bg-white border border-gray-100 shadow-2xl z-50 rounded-xl"
            >
              <ScrollDiv className="p-4">
              <Div className="flex items-center justify-between mb-4">
                <H3 className="text-sm font-semibold text-[#1E293B]">How It Works</H3>
                <Button
                  onClick={() => setShowHowItWorks(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <UiIcon as={X} size={14} />
                </Button>
              </Div>
              <Div className="space-y-3 text-xs text-gray-600">
                <Div>
                  <P className="font-bold text-gray-800 mb-0.5 flex items-center gap-1.5">
                    <UiIcon as={MapPin} size={12} className="text-[#00BFA5]" /> Destination
                  </P>
                  <P className="leading-snug text-gray-500 pl-4.5">Search and select the target city for this package pricing.</P>
                </Div>
                <Div>
                  <P className="font-bold text-gray-800 mb-0.5 flex items-center gap-1.5">
                    <UiIcon as={Car} size={12} className="text-[#00BFA5]" /> Vehicle-wise Pricing
                  </P>
                  <P className="leading-snug text-gray-500 pl-4.5">
                    Each vehicle added to this package gets its own base price, distance limits, and commission rules.
                  </P>
                </Div>
                <Div className="bg-emerald-50 rounded p-2 border border-emerald-100">
                  <P className="text-xs font-bold text-emerald-800 mb-1">PRO TIP</P>
                  <P className="text-[11px] leading-tight text-emerald-600">
                    You can add multiple vehicle pricing blocks within a single package form to save time.
                  </P>
                </Div>
              </Div>
              </ScrollDiv>
            </motion.div>
          )}
        </AnimatePresence>
      </Div>
    </ScrollDiv>
  );
};
export default CreatePackagePrice;
