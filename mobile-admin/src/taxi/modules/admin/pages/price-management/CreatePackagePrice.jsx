/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/CreatePackagePrice.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2, MapPin, X, Package } from 'lucide-react-native';
import { useNavigate, useParams } from '../../../../../lib/webRouter';
import { toast } from '../../../../../lib/notify';
import { adminService } from '../../services/adminService';
import PlaceSearchField from './PlaceSearchField';
import { useAppGoogleMapsLoader, HAS_VALID_GOOGLE_MAPS_KEY } from '../../utils/googleMaps';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  EmptyState,
  ErrorState,
  LoadingState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, Div, Form, Input, Link, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';
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
  const [loadError, setLoadError] = useState('');
  const { columns, tablet } = useLayoutWidth();
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
        setLoadError(error?.response?.data?.message || 'Failed to load package pricing form');
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
  const header = (
    <PageHeader
      icon={Package}
      title={isEdit ? 'Edit package pricing' : 'Create package pricing'}
      subtitle="One package form, with a separate price block per vehicle"
      breadcrumb={[
        { label: 'Taxi' },
        { label: 'Package pricing', onPress: () => navigate('/taxi/admin/pricing/package-pricing') },
        { label: isEdit ? 'Edit' : 'Create' },
      ]}
      actions={
        <>
          <Button type="button" onClick={() => navigate('/taxi/admin/pricing/package-pricing')} className={BTN_SECONDARY}>
            <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Back</Span>
          </Button>
          <Button type="button" onClick={() => setShowHowItWorks((current) => !current)} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>{showHowItWorks ? 'Hide help' : 'How it works'}</Span>
          </Button>
        </>
      }
    />
  );
  if (loading) {
    return (
      <AdminPage maxWidth={900}>
        {header}
        <LoadingState label="Loading package pricing…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={900}>
        {header}
        <ErrorState title="Could not load this form" message={loadError} />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={900}>
      {header}

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
            <Div>
              <Span className="text-sm font-semibold text-slate-900">Destination</Span>
              <Span className="text-sm text-slate-500">Search and select the target city for this package pricing.</Span>
            </Div>
            <Div>
              <Span className="text-sm font-semibold text-slate-900">Vehicle-wise pricing</Span>
              <Span className="text-sm text-slate-500">Each vehicle added to this package gets its own base price, distance limits and commission rules.</Span>
            </Div>
            <Div className="p-3 rounded-lg bg-blue-50">
              <Span className="text-xs font-semibold text-slate-900">Pro tip</Span>
              <Span className="text-xs text-slate-700">You can add several vehicle pricing blocks within a single package form to save time.</Span>
            </Div>
          </Div>
        </Card>
      ) : null}

      <Form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <SectionTitle>Package</SectionTitle>
          <Div className={`grid grid-cols-${columns} gap-3`}>
            {/* The list is empty until someone creates a package type, and an
                empty dropdown with no explanation gives an admin nothing to act
                on — the prerequisite lives on a different screen entirely. */}
            <Field label="Package type" required>
              <Select value={formData.package_type_id} onChange={(event) => updateTopLevel('package_type_id', event.target.value)} className={INPUT} required>
                <Option value="">{packageTypes.length ? 'Select package type' : 'No package types yet'}</Option>
                {packageTypes.map((item) => (
                  <Option key={item._id || item.id} value={item._id || item.id}>
                    {item.name}
                  </Option>
                ))}
              </Select>
              {!packageTypes.length ? (
                <Link to="/taxi/admin/pricing/rental-packages/create" className="text-xs font-semibold text-blue-700">
                  Create a rental package type first
                </Link>
              ) : null}
            </Field>

            <Field label="Destination" required>
              {isLoaded && HAS_VALID_GOOGLE_MAPS_KEY ? (
                <PlaceSearchField
                  value={formData.package_destination}
                  onValueChange={(next) => updateTopLevel('package_destination', next)}
                  onPlace={handlePlaceChanged}
                  icon={MapPin}
                  placeholder="Search destination city (India)"
                  className={INPUT}
                />
              ) : (
                <Input
                  value={formData.package_destination}
                  onChange={(event) => updateTopLevel('package_destination', event.target.value)}
                  className={INPUT}
                  placeholder="Enter destination"
                  required
                />
              )}
            </Field>

            <Field label="Available in" hint="Leave on all locations to offer it district-wide">
              <Select value={formData.service_location_id} onChange={(event) => updateTopLevel('service_location_id', event.target.value)} className={INPUT}>
                <Option value="">All service locations</Option>
                {serviceLocations.map((item) => (
                  <Option key={item._id || item.id} value={item._id || item.id}>
                    {item.name || item.service_location_name}
                  </Option>
                ))}
              </Select>
            </Field>

            <Field label="Availability">
              <Select value={formData.package_availability} onChange={(event) => updateTopLevel('package_availability', event.target.value)} className={INPUT}>
                <Option value="available">Available</Option>
                <Option value="unavailable">Unavailable</Option>
              </Select>
            </Field>

            <Field label="Status">
              <Select
                value={formData.active}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  updateTopLevel('active', next);
                  updateTopLevel('status', next === 1 ? 'active' : 'inactive');
                }}
                className={INPUT}
              >
                <Option value={1}>Active</Option>
                <Option value={0}>Inactive</Option>
              </Select>
            </Field>
          </Div>
        </Card>

        <Card className="mb-4">
          <SectionTitle
            action={
              <Button type="button" onClick={addRow} className={BTN_SECONDARY}>
                <UiIcon as={Plus} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>Add vehicle</Span>
              </Button>
            }
          >
            Vehicle-wise pricing
          </SectionTitle>

          {formData.package_vehicle_prices.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No vehicle pricing yet"
              message="Each vehicle can have its own package amount and commission setup."
              actionLabel="Add vehicle price"
              onAction={addRow}
            />
          ) : (
            <Div className="gap-3">
              {formData.package_vehicle_prices.map((row, index) => (
                <Div key={row.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 gap-3">
                  <Div className="flex-row items-start justify-between gap-3">
                    <Div className="flex-1 min-w-0">
                      <Span className="text-sm font-semibold text-slate-900">{`Vehicle pricing ${index + 1}`}</Span>
                      <Span className="text-xs text-slate-500">{vehicleLabelMap[row.vehicle_type] || 'Choose a vehicle and fill its package pricing'}</Span>
                    </Div>
                    <Button type="button" accessibilityLabel={`Remove vehicle pricing ${index + 1}`} onClick={() => removeRow(row.id)} className={BTN_SECONDARY}>
                      <UiIcon as={Trash2} size={16} className="text-red-600" />
                      <Span className="text-sm font-semibold text-red-600">Remove</Span>
                    </Button>
                  </Div>

                  <Div className={`grid grid-cols-${columns} gap-3`}>
                    <Field label="Vehicle type" required>
                      <Select value={row.vehicle_type} onChange={(event) => updateRow(row.id, 'vehicle_type', event.target.value)} className={INPUT} required>
                        <Option value="">{vehicleTypes.length ? 'Select vehicle type' : 'No vehicle types yet'}</Option>
                        {vehicleTypes.map((item) => (
                          <Option key={item._id || item.id} value={item._id || item.id}>
                            {item.name}
                          </Option>
                        ))}
                      </Select>
                      {!vehicleTypes.length ? (
                        <Link to="/taxi/admin/pricing/vehicle-type/create" className="text-xs font-semibold text-blue-700">
                          Add a vehicle type first
                        </Link>
                      ) : null}
                    </Field>

                    <Field label="Base price (incl. tax)" required>
                      <Input
                        type="number"
                        value={row.base_price}
                        onChange={(event) => updateRow(row.id, 'base_price', event.target.value)}
                        className={INPUT}
                        placeholder="0"
                        required
                      />
                    </Field>

                    <Field label="Free distance (km)" required>
                      <Input
                        type="number"
                        value={row.free_distance}
                        onChange={(event) => updateRow(row.id, 'free_distance', event.target.value)}
                        className={INPUT}
                        placeholder="0"
                        required
                      />
                    </Field>

                    <Field label="Price per extra km" required>
                      <Input
                        type="number"
                        value={row.distance_price}
                        onChange={(event) => updateRow(row.id, 'distance_price', event.target.value)}
                        className={INPUT}
                        placeholder="0"
                        required
                      />
                    </Field>

                    <Field label="Free time (minutes)">
                      <Input
                        type="number"
                        value={row.free_time}
                        onChange={(event) => updateRow(row.id, 'free_time', event.target.value)}
                        className={INPUT}
                        placeholder="0"
                      />
                    </Field>

                    <Field label="Price per extra minute" required>
                      <Input
                        type="number"
                        value={row.time_price}
                        onChange={(event) => updateRow(row.id, 'time_price', event.target.value)}
                        className={INPUT}
                        placeholder="0"
                        required
                      />
                    </Field>

                    <Field label="Commission type from customer" required>
                      <Select
                        value={row.admin_commision_type}
                        onChange={(event) => updateRow(row.id, 'admin_commision_type', event.target.value)}
                        className={INPUT}
                        required
                      >
                        <Option value="1">Percentage</Option>
                        <Option value="2">Fixed</Option>
                      </Select>
                    </Field>

                    <Field label="Commission from customer" required>
                      <Input
                        type="number"
                        value={row.admin_commision}
                        onChange={(event) => updateRow(row.id, 'admin_commision', event.target.value)}
                        className={INPUT}
                        placeholder="0"
                        required
                      />
                    </Field>

                    <Field label="Commission type from driver" required>
                      <Select
                        value={row.admin_commission_type_from_driver}
                        onChange={(event) => updateRow(row.id, 'admin_commission_type_from_driver', event.target.value)}
                        className={INPUT}
                        required
                      >
                        <Option value="1">Percentage</Option>
                        <Option value="2">Fixed</Option>
                      </Select>
                    </Field>

                    <Field label="Commission from driver" required>
                      <Input
                        type="number"
                        value={row.admin_commission_from_driver}
                        onChange={(event) => updateRow(row.id, 'admin_commission_from_driver', event.target.value)}
                        className={INPUT}
                        placeholder="0"
                        required
                      />
                    </Field>

                    <Field label="Service tax (%)" required>
                      <Input
                        type="number"
                        value={row.service_tax}
                        onChange={(event) => updateRow(row.id, 'service_tax', event.target.value)}
                        className={INPUT}
                        placeholder="0"
                        required
                      />
                    </Field>

                    <Field label="Cancellation fee" required>
                      <Input
                        type="number"
                        value={row.cancellation_fee}
                        onChange={(event) => updateRow(row.id, 'cancellation_fee', event.target.value)}
                        className={INPUT}
                        placeholder="0"
                        required
                      />
                    </Field>
                  </Div>
                </Div>
              ))}
            </Div>
          )}
        </Card>

        <Card className={`${tablet ? 'flex-row justify-end' : ''} gap-3`}>
          <Button type="button" onClick={() => navigate('/taxi/admin/pricing/package-pricing')} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
          </Button>
          <Button type="submit" disabled={saving} className={BTN_PRIMARY}>
            <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : isEdit ? 'Update package pricing' : 'Save package pricing'}</Span>
          </Button>
        </Card>
      </Form>
    </AdminPage>
  );
};
export default CreatePackagePrice;
