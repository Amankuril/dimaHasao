/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/EditDriver.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { ChevronRight, ArrowLeft, Save, User, MapPin, Phone, Mail, Users, Car, CheckCircle2, AlertCircle, Globe, Loader2 } from 'lucide-react-native';
import { useLocation, useNavigate, useParams } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import { useTaxiTransportTypes } from '../../../../shared/hooks/useTaxiTransportTypes';
import { objectUrl, pickImage } from '../../../../../lib/files';
import { Button, Div, Form, H1, H3, Img, Input, Label, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../../components/web';
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

  // --- Shared input class ---
  const inputClass =
    'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-colors';
  const labelClass = 'block text-xs font-semibold text-gray-500 mb-1.5';
  const visibleZones = zones.filter((zone) => {
    if (!formData.area) return true;
    const zoneServiceLocationId = zone?.service_location_id?._id || zone?.service_location_id || '';
    return String(zoneServiceLocationId) === String(formData.area);
  });
  if (isFetching) {
    return (
      <ScrollDiv className="min-h-screen flex items-center justify-center bg-gray-50">
        <Div className="flex flex-col items-center gap-3">
          <UiIcon as={Loader2} className="w-8 h-8 text-indigo-600 animate-spin" />
          <P className="text-sm text-gray-500">Loading driver details...</P>
        </Div>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6 font-sans">
      {/* Breadcrumb & Header */}
      <Div className="mb-6">
        <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Span>Drivers</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span>{backRoute.includes('/pending') ? 'Pending' : 'Approved'}</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700">Edit Driver</Span>
        </Div>
        <Div className="flex items-center justify-between">
          <H1 className="text-xl text-gray-900 font-bold">Edit Driver</H1>
          <Button
            onClick={() => navigate(backRoute)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UiIcon as={ArrowLeft} size={16} />
            Back
          </Button>
        </Div>
      </Div>

      <Form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Form Fields */}
        <Div className="xl:col-span-2 space-y-6">
          {/* Identity Section */}
          <Div className="bg-white rounded-xl border border-gray-200 p-6">
            <Div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <Div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600">
                <UiIcon as={User} size={18} />
              </Div>
              <Div>
                <H3 className="text-sm text-gray-900 font-bold">Identity Details</H3>
                <P className="text-xs text-gray-400">Personal & contact information</P>
              </Div>
            </Div>

            <Div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Div>
                <Label className={labelClass}>
                  <UiIcon as={MapPin} size={12} className="inline mr-1 text-gray-400" />
                  Assigned Zone
                </Label>
                <Select name="zoneId" value={formData.zoneId} onChange={handleChange} className={inputClass}>
                  <Option value="">Select Zone</Option>
                  {visibleZones.map((zone) => (
                    <Option key={zone._id || zone.id} value={zone._id || zone.id}>
                      {zone.name || zone.zone_name || 'Unnamed Zone'}
                    </Option>
                  ))}
                </Select>
              </Div>

              <Div>
                <Label className={labelClass}>
                  <UiIcon as={Globe} size={12} className="inline mr-1 text-gray-400" />
                  Country *
                </Label>
                <Select name="country" required value={formData.country} onChange={handleChange} className={inputClass}>
                  <Option value="">Select Country</Option>
                  {countries.map((c) => (
                    <Option key={c._id} value={c._id}>
                      {c.name}
                    </Option>
                  ))}
                </Select>
              </Div>

              <Div>
                <Label className={labelClass}>
                  <UiIcon as={User} size={12} className="inline mr-1 text-gray-400" />
                  Name *
                </Label>
                <Input type="text" name="name" required placeholder="Driver name" value={formData.name} onChange={handleChange} className={inputClass} />
              </Div>

              <Div>
                <Label className={labelClass}>
                  <UiIcon as={Phone} size={12} className="inline mr-1 text-gray-400" />
                  Mobile *
                </Label>
                <Input type="tel" name="mobile" required placeholder="Mobile number" value={formData.mobile} onChange={handleChange} className={inputClass} />
              </Div>

              <Div>
                <Label className={labelClass}>
                  <UiIcon as={Users} size={12} className="inline mr-1 text-gray-400" />
                  Gender *
                </Label>
                <Select name="gender" required value={formData.gender} onChange={handleChange} className={inputClass}>
                  <Option value="Male">Male</Option>
                  <Option value="Female">Female</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Div>

              <Div>
                <Label className={labelClass}>
                  <UiIcon as={Mail} size={12} className="inline mr-1 text-gray-400" />
                  Email *
                </Label>
                <Input type="email" name="email" required placeholder="Email address" value={formData.email} onChange={handleChange} className={inputClass} />
              </Div>
            </Div>
          </Div>

          {/* Vehicle Section */}
          <Div className="bg-white rounded-xl border border-gray-200 p-6">
            <Div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <Div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600">
                <UiIcon as={Car} size={18} />
              </Div>
              <Div>
                <H3 className="text-sm text-gray-900 font-bold">Vehicle Information</H3>
                <P className="text-xs text-gray-400">Assigned vehicle specifications</P>
              </Div>
            </Div>

            <Div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Div>
                <Label className={labelClass}>Transport Type *</Label>
                <Select name="transportType" required value={formData.transportType} onChange={handleChange} className={inputClass}>
                  <Option value="">Select Transport Type</Option>
                  {transportTypes.map((t) => (
                    <Option key={t.id || t._id} value={t.name}>
                      {t.display_name}
                    </Option>
                  ))}
                </Select>
              </Div>

              <Div className="md:col-span-2">
                <Label className={labelClass}>Service Categories</Label>
                <Div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  {serviceCategoryOptions.map((option) => {
                    const selected = formData.serviceCategories.includes(option.value);
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        onClick={() => toggleServiceCategory(option.value)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${selected ? 'bg-yellow-400 text-black' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'}`}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </Div>
                <P className="mt-1 text-xs text-gray-500">Matches the service selection used during driver onboarding.</P>
              </Div>

              <Div>
                <Label className={labelClass}>Vehicle Type *</Label>
                <Select name="vehicleType" required value={formData.vehicleType} onChange={handleChange} className={inputClass}>
                  <Option value="">Select Vehicle Type</Option>
                  {vehicleTypeFallbackOption && !vehicleTypes.some((vt) => String(getVehicleTypeId(vt)) === String(vehicleTypeFallbackOption.value)) ? (
                    <Option value={vehicleTypeFallbackOption.value}>{vehicleTypeFallbackOption.label}</Option>
                  ) : null}
                  {vehicleTypes.map((vt) => (
                    <Option key={getVehicleTypeId(vt)} value={getVehicleTypeId(vt)}>
                      {getVehicleTypeLabel(vt)}
                    </Option>
                  ))}
                </Select>
              </Div>

              <Div>
                <Label className={labelClass}>Vehicle Make *</Label>
                <Input
                  type="text"
                  name="vehicleMake"
                  required
                  placeholder="e.g. Maruti Suzuki"
                  value={formData.vehicleMake}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Div>

              <Div>
                <Label className={labelClass}>Vehicle Model *</Label>
                <Input
                  type="text"
                  name="vehicleModel"
                  required
                  placeholder="e.g. Swift Dzire"
                  value={formData.vehicleModel}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Div>

              <Div>
                <Label className={labelClass}>Vehicle Year *</Label>
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
                  className={inputClass}
                />
              </Div>

              <Div>
                <Label className={labelClass}>Vehicle Color *</Label>
                <Input
                  type="text"
                  name="vehicleColor"
                  required
                  placeholder="e.g. White"
                  value={formData.vehicleColor}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Div>

              <Div>
                <Label className={labelClass}>Vehicle Number *</Label>
                <Input
                  type="text"
                  name="vehicleNumber"
                  required
                  placeholder="e.g. MH 12 AB 1234"
                  value={formData.vehicleNumber}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Div>
            </Div>
          </Div>
        </Div>

        {/* RIGHT: Sidebar */}
        <Div className="space-y-6">
          {/* Photo Upload */}
          <Div className="bg-white rounded-xl border border-gray-200 p-6">
            <H3 className="text-sm text-gray-900 mb-4 font-bold">Profile Photo</H3>
            <Button type="button" onClick={handleImageChange} className="relative group cursor-pointer w-full">
              <Div className="w-full aspect-square rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden transition-colors group-hover:border-yellow-400 group-hover:bg-yellow-50/30">
                {imagePreview ? (
                  <Img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Div className="flex flex-col items-center text-gray-400 gap-2">
                    <Div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-lg">
                      {formData.name ? formData.name.charAt(0).toUpperCase() : 'D'}
                    </Div>
                    <P className="text-xs text-gray-400">Click to upload photo</P>
                  </Div>
                )}
              </Div>
            </Button>
            <P className="text-[10px] text-gray-400 text-center mt-3">Allowed updates twice every 30 days.</P>
          </Div>

          {/* Actions */}
          <Div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <Button
              type="submit"
              disabled={isLoading || success}
              className="w-full py-3 bg-yellow-400 text-black rounded-lg text-sm font-bold shadow-sm hover:bg-yellow-500 active:bg-yellow-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <UiIcon as={Loader2} size={16} className="animate-spin" />
              ) : success ? (
                <UiIcon as={CheckCircle2} size={16} />
              ) : (
                <UiIcon as={Save} size={16} />
              )}
              {success ? 'Saved Successfully' : isLoading ? 'Saving...' : 'Save Changes'}
            </Button>

            <Button
              type="button"
              onClick={() => navigate('/taxi/admin/drivers')}
              className="w-full py-3 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Cancel
            </Button>

            <Div className="pt-3 border-t border-gray-100">
              <Button
                type="button"
                className="w-full py-2.5 text-red-500 bg-red-50 border border-red-100 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <UiIcon as={AlertCircle} size={13} />
                Disable Account
              </Button>
            </Div>
          </Div>

          {/* Metadata */}
          <Div className="bg-white rounded-xl border border-gray-200 p-5">
            <P className="text-xs font-semibold text-gray-500 mb-3">Metadata</P>
            <Div className="space-y-2 text-xs">
              <Div className="flex justify-between">
                <Span className="text-gray-400">Driver ID</Span>
                <Span className="text-gray-700 font-medium">DRV-{id?.substring(0, 8).toUpperCase() || 'NEW'}</Span>
              </Div>
              <Div className="flex justify-between">
                <Span className="text-gray-400">Status</Span>
                <Span className="text-emerald-600 font-medium">Active</Span>
              </Div>
            </Div>
          </Div>

          {/* Status Messages */}
          {success && (
            <Div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <P className="text-xs text-emerald-700 text-center font-medium">Driver profile updated successfully.</P>
            </Div>
          )}

          {error && (
            <Div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <P className="text-xs text-red-600 text-center font-medium">{error}</P>
            </Div>
          )}
        </Div>
      </Form>
    </ScrollDiv>
  );
};
export default EditDriver;
