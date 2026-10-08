/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/EditDriver.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, User, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useLocation, useNavigate, useParams } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import { useTaxiTransportTypes } from '../../../../shared/hooks/useTaxiTransportTypes';
import { objectUrl, pickImage } from '../../../../../lib/files';
import { Button, Div, Form, Img, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatusBadge,
  LoadingState,
  ErrorState,
  Field,
  useLayoutWidth,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../../admin/ui';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';
const serviceCategoryOptions = [
  {
    value: 'taxi',
    label: 'Taxi',
  },
  {
    value: 'outstation',
    label: 'Outstation',
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
const normalizeTransportTypeForSelect = (value, options = []) => {
  const normalizedValue = String(value || '')
    .trim()
    .toLowerCase();
  if (!normalizedValue) return '';
  const availableNames = options.map((item) =>
    String(item.name || '')
      .trim()
      .toLowerCase(),
  );
  if (availableNames.includes(normalizedValue)) {
    return normalizedValue;
  }
  if (normalizedValue === 'both' && availableNames.includes('all')) {
    return 'all';
  }
  if (normalizedValue === 'all' && availableNames.includes('both')) {
    return 'both';
  }
  return normalizedValue;
};
const normalizeServiceCategories = (value, fallback = 'taxi') => {
  const rawValues = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const normalized = [
    ...new Set(
      rawValues
        .map((item) =>
          String(item || '')
            .trim()
            .toLowerCase(),
        )
        .flatMap((item) => (item === 'both' ? ['taxi', 'outstation'] : item ? [item] : []))
        .filter((item) => serviceCategoryOptions.some((option) => option.value === item)),
    ),
  ];
  if (normalized.length > 0) {
    return normalized;
  }
  const fallbackValue = String(fallback || 'taxi')
    .trim()
    .toLowerCase();
  if (fallbackValue === 'both') {
    return ['taxi', 'outstation'];
  }
  return serviceCategoryOptions.some((option) => option.value === fallbackValue) ? [fallbackValue] : ['taxi'];
};
const getVehicleTypeId = (item = {}) => String(item?._id || item?.id || '');
const getVehicleTypeLabel = (item = {}) => item?.vehicle_type || item?.name || item?.type || 'Vehicle';
const EditDriver = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { tablet } = useLayoutWidth();
  const backRoute = location.state?.from || '/admin/drivers';
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [locations, setLocations] = useState([]);
  const [zones, setZones] = useState([]);
  const [countries, setCountries] = useState([]);
  const { transportTypes } = useTaxiTransportTypes();
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [vehicleTypeFallbackOption, setVehicleTypeFallbackOption] = useState(null);
  const [success, setSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    area: '',
    zoneId: '',
    country: '',
    name: '',
    mobile: '',
    gender: 'Male',
    email: '',
    password: '',
    confirmPassword: '',
    transportType: 'taxi',
    serviceCategories: ['taxi'],
    vehicleType: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleColor: '',
    vehicleNumber: '',
  });
  const [error, setError] = useState('');
  const providedToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5YzdiZTZhYmJlOTJlYjYwMGYwMmQxNiIsImVtYWlsIjoiYWRtaW5AYWRtaW4uY29tIiwibW9iaWxlIjoiOTk5OTk5OTk5OSIsInJvbGUiOiJzdXBlci1hZG1pbiIsImlhdCI6MTc3NTA0OTExNywiZXhwIjoxODA2NTg1MTE3fQ.5KJmXJwaVefWhnc97EqtArkA1z7ZOhsJwA9fbyRVPdQ';
  const storedToken = localStorage.getItem('adminToken');
  const token = storedToken && storedToken !== 'undefined' && storedToken !== 'null' ? storedToken : providedToken;
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsFetching(true);
      try {
        const locRes = await fetch(API_BASE_URL + '/admin/service-locations', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const locData = await locRes.json();
        if (locData.success || locData.data) {
          const results = locData.data?.results || locData.data || locData.results || [];
          setLocations(Array.isArray(results) ? results : []);
        }
        const zoneRes = await fetch(API_BASE_URL + '/admin/zones', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const zoneData = await zoneRes.json();
        if (zoneData.success || zoneData.data) {
          const results = zoneData.data?.results || zoneData.data || zoneData.results || [];
          setZones(Array.isArray(results) ? results : []);
        }
        const countRes = await fetch(API_BASE_URL + '/countries', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const countData = await countRes.json();
        if (countData.success || countData.data) {
          const results = countData.data?.results || countData.data || countData.results || [];
          setCountries(Array.isArray(results) ? results : []);
        }

        // Fetching driver details
        const response = await fetch(`${API_BASE_URL}/admin/drivers/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok && data.success) {
          const d = data.data;
          const onboarding = d.onboarding || {};
          const onboardingPersonal = onboarding.personal || {};
          const onboardingVehicle = onboarding.vehicle || {};
          const savedVehicleTypeId = d.vehicle_type_id || d.vehicleTypeId || onboardingVehicle.vehicleTypeId || '';
          const savedVehicleTypeLabel = d.car_type || d.vehicle_type || d.vehicleType || onboardingVehicle.vehicleType || '';
          setVehicleTypeFallbackOption(
            savedVehicleTypeId || savedVehicleTypeLabel
              ? {
                  value: String(savedVehicleTypeId || savedVehicleTypeLabel),
                  label: String(savedVehicleTypeLabel || savedVehicleTypeId),
                }
              : null,
          );
          setFormData({
            area: d.service_location_id?._id || d.service_location_id || d.service_location?._id || d.service_location || onboardingVehicle.locationId || '',
            zoneId: d.zoneId?._id || d.zoneId || d.zone?._id || d.zone || '',
            country: d.country?._id || d.country || d.service_location?.country?._id || d.service_location?.country || '',
            name: d.name || d.user_id?.name || onboardingPersonal.fullName || '',
            mobile: d.phone || d.mobile || d.user_id?.mobile || '',
            gender: d.gender ? d.gender.charAt(0).toUpperCase() + d.gender.slice(1) : 'Male',
            email: d.email || d.user_id?.email || onboardingPersonal.email || '',
            password: '',
            confirmPassword: '',
            transportType: d.transport_type || d.register_for || d.registerFor || onboardingVehicle.registerFor || 'taxi',
            serviceCategories: normalizeServiceCategories(
              d.service_categories || d.serviceCategories || d.onboarding?.serviceCategories || onboardingVehicle.serviceCategories,
              d.transport_type || d.register_for || d.registerFor || onboardingVehicle.registerFor || 'taxi',
            ),
            vehicleType: savedVehicleTypeId || savedVehicleTypeLabel || '',
            vehicleMake: d.car_make || d.vehicle_make || d.vehicleMake || onboardingVehicle.make || '',
            vehicleModel: d.car_model || d.vehicle_model || d.vehicleModel || onboardingVehicle.model || '',
            vehicleYear: d.car_year || d.vehicle_year || d.vehicleYear || onboardingVehicle.year || '',
            vehicleColor: d.car_color || d.vehicle_color || d.vehicleColor || onboardingVehicle.color || '',
            vehicleNumber: d.car_number || d.vehicle_number || d.vehicleNumber || onboardingVehicle.number || '',
            companyName: onboardingVehicle.companyName || '',
            companyAddress: onboardingVehicle.companyAddress || '',
            city: onboardingVehicle.city || '',
            postalCode: onboardingVehicle.postalCode || '',
            taxNumber: onboardingVehicle.taxNumber || '',
          });
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setIsFetching(false);
      }
    };
    fetchInitialData();
  }, [id]);
  useEffect(() => {
    if (!transportTypes.length) return;
    setFormData((prev) => {
      const normalized = normalizeTransportTypeForSelect(prev.transportType, transportTypes);
      return normalized === prev.transportType
        ? prev
        : {
            ...prev,
            transportType: normalized,
          };
    });
  }, [transportTypes]);
  useEffect(() => {
    const fetchVehiclesForArea = async () => {
      if (!formData.transportType) return;
      try {
        const typeFilter = formData.transportType.toLowerCase() === 'delivery' ? 'delivery' : 'taxi';
        const res = await adminService.getVehicleTypes(typeFilter);
        if (res?.data) {
          setVehicleTypes(Array.isArray(res.data) ? res.data : res.data?.results || []);
        }
      } catch (e) {
        console.error('Vehicle types error:', e);
      }
    };
    fetchVehiclesForArea();
  }, [formData.transportType]);
  useEffect(() => {
    if (!vehicleTypes.length || !formData.vehicleType) return;
    const rawValue = String(formData.vehicleType);
    const alreadyMatchesId = vehicleTypes.some((item) => String(item._id) === rawValue);
    if (alreadyMatchesId) return;
    const matchedVehicleType = vehicleTypes.find((item) => {
      const labels = [item.vehicle_type, item.name, item.slug, item.type].filter(Boolean).map((value) => String(value).trim().toLowerCase());
      return labels.includes(rawValue.trim().toLowerCase());
    });
    if (matchedVehicleType?._id) {
      setFormData((prev) => ({
        ...prev,
        vehicleType: String(matchedVehicleType._id),
      }));
    }
  }, [vehicleTypes, formData.vehicleType]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'area') {
      const selectedLoc = locations.find((l) => l._id === value);
      if (selectedLoc) {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          zoneId: '',
          country: selectedLoc.country?._id || selectedLoc.country || prev.country,
        }));
        return;
      }
    }
    if (name === 'zoneId') {
      const selectedZone = zones.find((zone) => String(zone._id || zone.id) === String(value));
      if (selectedZone) {
        setFormData((prev) => ({
          ...prev,
          zoneId: value,
          area: selectedZone.service_location_id?._id || selectedZone.service_location_id || prev.area,
        }));
        return;
      }
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const toggleServiceCategory = (value) => {
    setFormData((prev) => {
      const exists = prev.serviceCategories.includes(value);
      const nextServiceCategories = exists ? prev.serviceCategories.filter((item) => item !== value) : [...prev.serviceCategories, value];
      return {
        ...prev,
        serviceCategories: nextServiceCategories,
      };
    });
  };
  const handleImageChange = async () => {
    const file = await pickImage();
    if (file) {
      setImagePreview(objectUrl(file));
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const selectedVehicleType = vehicleTypes.find((item) => String(getVehicleTypeId(item)) === String(formData.vehicleType));
      const selectedVehicleTypeLabel = selectedVehicleType
        ? getVehicleTypeLabel(selectedVehicleType)
        : vehicleTypeFallbackOption?.label || formData.vehicleType;
      const payload = {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        gender: formData.gender.toLowerCase(),
        transport_type: formData.transportType.toLowerCase(),
        register_for: formData.transportType.toLowerCase(),
        registerFor: formData.transportType.toLowerCase(),
        service_categories: formData.serviceCategories,
        serviceCategories: formData.serviceCategories,
        car_make: formData.vehicleMake,
        car_model: formData.vehicleModel,
        car_year: formData.vehicleYear,
        car_color: formData.vehicleColor,
        car_number: formData.vehicleNumber,
        car_type: formData.vehicleType,
        vehicle_type_id: formData.vehicleType,
        vehicle_type: selectedVehicleTypeLabel,
        zone_id: formData.zoneId || null,
        service_location_id: formData.area,
        country: formData.country,
        onboarding: {
          vehicle: {
            registerFor: formData.transportType.toLowerCase(),
            serviceCategories: formData.serviceCategories,
            locationId: formData.area,
            vehicleTypeId: formData.vehicleType,
            vehicleType: selectedVehicleTypeLabel,
            make: formData.vehicleMake,
            model: formData.vehicleModel,
            year: formData.vehicleYear,
            number: formData.vehicleNumber,
            color: formData.vehicleColor,
            companyName: formData.companyName,
            companyAddress: formData.companyAddress,
            city: formData.city,
            postalCode: formData.postalCode,
            taxNumber: formData.taxNumber,
          },
        },
      };
      const response = await fetch(`${API_BASE_URL}/admin/drivers/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => navigate(backRoute), 2000);
      } else {
        setError(data.message || 'Failed to update driver.');
      }
    } catch (err) {
      setError('Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const visibleZones = zones.filter((zone) => {
    if (!formData.area) return true;
    const zoneServiceLocationId = zone?.service_location_id?._id || zone?.service_location_id || '';
    return String(zoneServiceLocationId) === String(formData.area);
  });
  const col = tablet ? 'w-1/2 px-1.5' : 'w-full';
  const backButton = (
    <Button type="button" onClick={() => navigate(backRoute)} className={BTN_SECONDARY}>
      <UiIcon as={ArrowLeft} size={16} className="text-slate-700" />
      <Span className={BTN_TEXT_SECONDARY}>Back</Span>
    </Button>
  );
  const breadcrumb = [{ label: 'Drivers' }, { label: backRoute.includes('/pending') ? 'Pending' : 'Approved' }, { label: 'Edit driver' }];
  if (isFetching) {
    return (
      <AdminPage maxWidth={720}>
        <PageHeader icon={User} title="Edit driver" breadcrumb={breadcrumb} />
        <LoadingState label="Loading driver details…" />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={720}>
      <PageHeader icon={User} title="Edit driver" subtitle="Update the driver's identity and vehicle record" breadcrumb={breadcrumb} actions={backButton} />

      {error ? <ErrorState title="Could not save this driver" message={error} className="mb-4" /> : null}

      <Form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <SectionTitle>Identity details</SectionTitle>
          <Div className={`${tablet ? 'flex-row flex-wrap -mx-1.5' : 'gap-4'}`}>
            <Field label="Assigned zone" className={`${col} ${tablet ? 'mb-4' : ''}`}>
              <Select name="zoneId" value={formData.zoneId} onChange={handleChange} className={INPUT}>
                <Option value="">Select zone</Option>
                {visibleZones.map((zone) => (
                  <Option key={zone._id || zone.id} value={zone._id || zone.id}>
                    {zone.name || zone.zone_name || 'Unnamed Zone'}
                  </Option>
                ))}
              </Select>
            </Field>

            <Field label="Country" required className={`${col} ${tablet ? 'mb-4' : ''}`}>
              <Select name="country" required value={formData.country} onChange={handleChange} className={INPUT}>
                <Option value="">Select country</Option>
                {countries.map((c) => (
                  <Option key={c._id} value={c._id}>
                    {c.name}
                  </Option>
                ))}
              </Select>
            </Field>

            <Field label="Name" required className={`${col} ${tablet ? 'mb-4' : ''}`}>
              <Input type="text" name="name" required placeholder="Driver name" value={formData.name} onChange={handleChange} className={INPUT} />
            </Field>

            <Field label="Mobile" required className={`${col} ${tablet ? 'mb-4' : ''}`}>
              <Input type="tel" name="mobile" required placeholder="Mobile number" value={formData.mobile} onChange={handleChange} className={INPUT} />
            </Field>

            <Field label="Gender" required className={`${col} ${tablet ? 'mb-4' : ''}`}>
              <Select name="gender" required value={formData.gender} onChange={handleChange} className={INPUT}>
                <Option value="Male">Male</Option>
                <Option value="Female">Female</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Field>

            <Field label="Email" required className={`${col} ${tablet ? 'mb-4' : ''}`}>
              <Input type="email" name="email" required placeholder="Email address" value={formData.email} onChange={handleChange} className={INPUT} />
            </Field>
          </Div>
        </Card>

        <Card className="mb-4">
          <SectionTitle>Vehicle information</SectionTitle>
          <Div className={`${tablet ? 'flex-row flex-wrap -mx-1.5' : 'gap-4'}`}>
            <Field label="Transport type" required className={`${col} ${tablet ? 'mb-4' : ''}`}>
              <Select name="transportType" required value={formData.transportType} onChange={handleChange} className={INPUT}>
                <Option value="">Select transport type</Option>
                {transportTypes.map((t) => (
                  <Option key={t.id || t._id} value={t.name}>
                    {t.display_name}
                  </Option>
                ))}
              </Select>
            </Field>

            <Field label="Vehicle type" required className={`${col} ${tablet ? 'mb-4' : ''}`}>
              <Select name="vehicleType" required value={formData.vehicleType} onChange={handleChange} className={INPUT}>
                <Option value="">Select vehicle type</Option>
                {vehicleTypeFallbackOption && !vehicleTypes.some((vt) => String(getVehicleTypeId(vt)) === String(vehicleTypeFallbackOption.value)) ? (
                  <Option value={vehicleTypeFallbackOption.value}>{vehicleTypeFallbackOption.label}</Option>
                ) : null}
                {vehicleTypes.map((vt) => (
                  <Option key={getVehicleTypeId(vt)} value={getVehicleTypeId(vt)}>
                    {getVehicleTypeLabel(vt)}
                  </Option>
                ))}
              </Select>
            </Field>

            <Field label="Service categories" hint="Matches the service selection used during driver onboarding." className={`w-full px-1.5 ${tablet ? 'mb-4' : ''}`}>
              <Div className="flex-row flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                {serviceCategoryOptions.map((option) => {
                  const selected = formData.serviceCategories.includes(option.value);
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      onClick={() => toggleServiceCategory(option.value)}
                      className={`h-11 justify-center rounded-full px-4 ${selected ? 'bg-blue-600' : 'bg-white border border-slate-300'}`}
                    >
                      <Span className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-700'}`}>{option.label}</Span>
                    </Button>
                  );
                })}
              </Div>
            </Field>

            <Field label="Vehicle make" required className={`${col} ${tablet ? 'mb-4' : ''}`}>
              <Input type="text" name="vehicleMake" required placeholder="e.g. Maruti Suzuki" value={formData.vehicleMake} onChange={handleChange} className={INPUT} />
            </Field>

            <Field label="Vehicle model" required className={`${col} ${tablet ? 'mb-4' : ''}`}>
              <Input type="text" name="vehicleModel" required placeholder="e.g. Swift Dzire" value={formData.vehicleModel} onChange={handleChange} className={INPUT} />
            </Field>

            <Field label="Vehicle year" required className={`${col} ${tablet ? 'mb-4' : ''}`}>
              <Input
                type="text"
                name="vehicleYear"
                required
                maxLength={4}
                placeholder="e.g. 2024"
                value={formData.vehicleYear}
                onChange={(event) =>
                  handleChange({
                    target: {
                      name: 'vehicleYear',
                      value: event.target.value.replace(/\D/g, '').slice(0, 4),
                    },
                  })
                }
                className={INPUT}
              />
            </Field>

            <Field label="Vehicle color" required className={`${col} ${tablet ? 'mb-4' : ''}`}>
              <Input type="text" name="vehicleColor" required placeholder="e.g. White" value={formData.vehicleColor} onChange={handleChange} className={INPUT} />
            </Field>

            <Field label="Vehicle number" required className={`${col} ${tablet ? 'mb-4' : ''}`}>
              <Input type="text" name="vehicleNumber" required placeholder="e.g. MH 12 AB 1234" value={formData.vehicleNumber} onChange={handleChange} className={INPUT} />
            </Field>
          </Div>
        </Card>

        <Card className="mb-4">
          <SectionTitle>Profile photo</SectionTitle>
          <Button type="button" onClick={handleImageChange} accessibilityLabel="Upload profile photo" className="w-full">
            <Div className="w-full h-48 rounded-xl bg-slate-50 border border-dashed border-slate-300 items-center justify-center overflow-hidden">
              {imagePreview ? (
                <Img src={imagePreview} alt="Profile preview" className="w-full h-full" contentFit="cover" />
              ) : (
                <Div className="items-center gap-2">
                  <Div className="w-14 h-14 rounded-full bg-slate-100 items-center justify-center">
                    <Span className="text-lg font-semibold text-slate-500">{formData.name ? formData.name.charAt(0).toUpperCase() : 'D'}</Span>
                  </Div>
                  <P className="text-sm text-slate-500">Tap to upload a photo</P>
                </Div>
              )}
            </Div>
          </Button>
          <P className="text-xs text-slate-500 text-center mt-3">Allowed updates twice every 30 days.</P>
        </Card>

        <Card className="mb-4">
          <SectionTitle>Metadata</SectionTitle>
          <Div className="gap-2">
            <Div className="flex-row justify-between gap-3">
              <Span className="text-sm text-slate-500">Driver ID</Span>
              <Span className="text-sm font-medium text-slate-700">DRV-{id?.substring(0, 8).toUpperCase() || 'NEW'}</Span>
            </Div>
            <Div className="flex-row items-center justify-between gap-3">
              <Span className="text-sm text-slate-500">Status</Span>
              <StatusBadge status="active" />
            </Div>
          </Div>
        </Card>

        {success ? (
          <Div className="mb-4 flex-row items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-3">
            <UiIcon as={CheckCircle2} size={16} className="text-green-700" />
            <P className="text-sm font-medium text-green-700 flex-1">Driver profile updated successfully.</P>
          </Div>
        ) : null}

        <Card className="gap-2">
          <Button type="submit" disabled={isLoading || success} className={`${BTN_PRIMARY} w-full ${isLoading || success ? 'opacity-60' : ''}`}>
            <UiIcon as={success ? CheckCircle2 : Save} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>{success ? 'Saved successfully' : isLoading ? 'Saving…' : 'Save changes'}</Span>
          </Button>
          <Button type="button" onClick={() => navigate('/taxi/admin/drivers')} className={`${BTN_SECONDARY} w-full`}>
            <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
          </Button>
          <Button type="button" className={`${BTN_SECONDARY} w-full mt-1`}>
            <UiIcon as={AlertCircle} size={14} className="text-red-600" />
            <Span className="text-sm font-semibold text-red-600">Disable account</Span>
          </Button>
        </Card>
      </Form>
    </AdminPage>
  );
};
export default EditDriver;
