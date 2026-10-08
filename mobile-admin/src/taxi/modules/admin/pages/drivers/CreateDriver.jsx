/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/CreateDriver.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { Camera, FileText, ImagePlus, Loader2, ShieldCheck, UploadCloud, User } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { File } from 'expo-file-system';
import { useTaxiTransportTypes } from '../../../../shared/hooks/useTaxiTransportTypes';
import { normalizeDriverDocumentTemplates } from '../../../driver/utils/documentTemplates';
import { pickImage } from '../../../../../lib/files';
import { adminService } from '../../services/adminService';
import { Button, Div, Form, Img, Input, Option, P, Select, Span, Textarea, Icon as UiIcon } from '../../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatusBadge,
  LoadingState,
  EmptyState,
  ErrorState,
  Field,
  useLayoutWidth,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../../admin/ui';
const NAME_REGEX = /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const VEHICLE_NUMBER_REGEX = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/;
const defaultVehicleFieldConfigs = [
  {
    field_key: 'locationId',
    name: 'Operating City',
    account_type: 'both',
    is_required: true,
    active: true,
    sort_order: 10,
    placeholder: '',
  },
  {
    field_key: 'serviceCategories',
    name: 'Service Category',
    account_type: 'individual',
    is_required: true,
    active: true,
    sort_order: 20,
    placeholder: '',
  },
  {
    field_key: 'vehicleTypeId',
    name: 'Vehicle Type',
    account_type: 'individual',
    is_required: true,
    active: true,
    sort_order: 30,
    placeholder: '',
  },
  {
    field_key: 'make',
    name: 'Brand / Make',
    account_type: 'individual',
    is_required: true,
    active: true,
    sort_order: 40,
    placeholder: 'e.g. Maruti Suzuki',
  },
  {
    field_key: 'model',
    name: 'Model',
    account_type: 'individual',
    is_required: true,
    active: true,
    sort_order: 50,
    placeholder: 'Swift, Bolt',
  },
  {
    field_key: 'year',
    name: 'Year',
    account_type: 'individual',
    is_required: true,
    active: true,
    sort_order: 60,
    placeholder: String(new Date().getFullYear()),
  },
  {
    field_key: 'number',
    name: 'Plate Number',
    account_type: 'individual',
    is_required: true,
    active: true,
    sort_order: 70,
    placeholder: 'DL1RT1234',
  },
  {
    field_key: 'color',
    name: 'Exterior Color',
    account_type: 'individual',
    is_required: true,
    active: true,
    sort_order: 80,
    placeholder: 'e.g. White, Black',
  },
];
const normalizeVehicleOptions = (payload) => {
  const results = Array.isArray(payload) ? payload : payload?.results || payload?.data?.results || payload?.data || [];
  return (Array.isArray(results) ? results : [])
    .map((item) => ({
      id: String(item?._id || item?.id || ''),
      value: String(item?.vehicle_type || item?.name || item?.slug || item?._id || '').toLowerCase(),
      label: item?.vehicle_type || item?.name || 'Vehicle',
      transportType: String(item?.transport_type || '').toLowerCase(),
      raw: item,
    }))
    .filter((item) => item.id);
};
const matchesVehicleFieldAccountType = (accountType) => {
  const normalized = String(accountType || 'individual')
    .trim()
    .toLowerCase();
  return ['both', 'individual'].includes(normalized);
};
const matchesDocumentRole = (accountType) => {
  const normalized = String(accountType || 'individual')
    .trim()
    .toLowerCase();
  return ['both', 'individual'].includes(normalized);
};
const normalizeVehicleNumber = (value = '') =>
  String(value)
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 11);
/* The web reads the picked File with FileReader.readAsDataURL; a picked file here is
   { uri, name, type }, so the bytes come from the cache file as base64. */
const fileToDataUrl = async (file) => {
  const base64 = await new File(file.uri).base64();
  return `data:${file.type || 'image/jpeg'};base64,${base64}`;
};
const normalizeDocument = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    return {
      previewUrl: value,
      secureUrl: value,
      uploaded: true,
    };
  }
  return {
    ...value,
    previewUrl: value.previewUrl || value.secureUrl || value.url || '',
    secureUrl: value.secureUrl || value.previewUrl || value.url || '',
    uploaded: value.uploaded ?? Boolean(value.previewUrl || value.secureUrl || value.url),
    identifyNumber: String(value.identifyNumber || value.identify_number || '').trim(),
    expiryDate: String(value.expiryDate || value.expiry_date || '').trim(),
  };
};
const buildTemplateMetaState = (templates = [], documents = {}) =>
  Object.fromEntries(
    templates.map((template) => {
      const firstDocument = (template.fields || []).map((field) => normalizeDocument(documents[field.key])).find(Boolean);
      return [
        template.id,
        {
          identifyNumber: String(firstDocument?.identifyNumber || '').trim(),
          expiryDate: String(firstDocument?.expiryDate || '').trim(),
        },
      ];
    }),
  );
const typeLabel = (value = '') =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
const extractResults = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.results)) {
    return payload.results;
  }
  if (Array.isArray(payload?.data?.results)) {
    return payload.data.results;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return [];
};
const serviceCategoryChoices = [
  {
    id: 'taxi',
    label: 'Taxi',
  },
  {
    id: 'outstation',
    label: 'Outstation',
  },
  {
    id: 'delivery',
    label: 'Delivery',
  },
  {
    id: 'pooling',
    label: 'Pooling',
  },
];
const initialFormData = {
  service_location_id: '',
  name: '',
  mobile: '',
  gender: '',
  email: '',
  password: '',
  password_confirmation: '',
  transport_type: 'taxi',
  service_categories: ['taxi'],
  vehicle_type_id: '',
  vehicle_make: '',
  vehicle_model: '',
  vehicle_year: '',
  vehicle_color: '',
  vehicle_number: '',
  country: '',
  profile_picture: '',
  customFields: {},
};
const CreateDriver = () => {
  const navigate = useNavigate();
  const { tablet } = useLayoutWidth();
  const { transportTypes } = useTaxiTransportTypes();
  const [formData, setFormData] = useState(initialFormData);
  const [areas, setAreas] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [vehicleFieldConfigs, setVehicleFieldConfigs] = useState(defaultVehicleFieldConfigs);
  const [documentTemplates, setDocumentTemplates] = useState([]);
  const [documents, setDocuments] = useState({});
  const [documentMeta, setDocumentMeta] = useState({});
  const [profileName, setProfileName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [uploadingDocKey, setUploadingDocKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const fetchBootstrap = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [locationsResponse, vehicleFieldResponse, documentResponse] = await Promise.all([
          adminService.getServiceLocations(),
          adminService.getDriverNeededDocuments('vehicle_field'),
          adminService.getDriverNeededDocuments('document'),
        ]);
        const nextAreas = extractResults(locationsResponse);
        const nextVehicleFields = extractResults(vehicleFieldResponse);
        const nextTemplates = extractResults(documentResponse);
        setAreas(Array.isArray(nextAreas) ? nextAreas : []);
        setVehicleFieldConfigs(Array.isArray(nextVehicleFields) && nextVehicleFields.length > 0 ? nextVehicleFields : defaultVehicleFieldConfigs);
        setDocumentTemplates(normalizeDriverDocumentTemplates(nextTemplates));
      } catch (apiError) {
        setError(apiError?.message || 'Unable to load driver onboarding form');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBootstrap();
  }, []);
  useEffect(() => {
    const fetchVehicleTypes = async () => {
      if (!formData.service_location_id || !formData.transport_type) {
        setVehicleTypes([]);
        setFormData((current) => ({
          ...current,
          vehicle_type_id: '',
        }));
        return;
      }
      setIsLoadingVehicles(true);
      try {
        let options = [];
        try {
          const locationResponse = await adminService.getLocationVehicleTypes(formData.service_location_id, formData.transport_type);
          options = normalizeVehicleOptions(locationResponse);
        } catch {
          options = [];
        }
        if (options.length === 0) {
          const catalogResponse = await adminService.getVehicleTypes(formData.transport_type === 'both' ? undefined : formData.transport_type);
          options = normalizeVehicleOptions(catalogResponse).filter((item) => {
            if (!item.transportType) return true;
            if (formData.transport_type === 'both') {
              return ['taxi', 'delivery', 'both'].includes(item.transportType);
            }
            return item.transportType === formData.transport_type || item.transportType === 'both';
          });
        }
        setVehicleTypes(options);
        setFormData((current) => {
          if (options.some((item) => item.id === current.vehicle_type_id)) {
            return current;
          }
          return {
            ...current,
            vehicle_type_id: '',
          };
        });
      } catch (apiError) {
        setVehicleTypes([]);
        setError(apiError?.message || 'Unable to load vehicle types');
      } finally {
        setIsLoadingVehicles(false);
      }
    };
    fetchVehicleTypes();
  }, [formData.service_location_id, formData.transport_type]);
  const visibleVehicleFields = useMemo(
    () =>
      [...vehicleFieldConfigs]
        .filter((item) => item?.active !== false && matchesVehicleFieldAccountType(item?.account_type))
        .sort((a, b) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0)),
    [vehicleFieldConfigs],
  );
  const fieldConfigMap = useMemo(
    () =>
      visibleVehicleFields.reduce((acc, item) => {
        acc[String(item.field_key || '').trim()] = item;
        return acc;
      }, {}),
    [visibleVehicleFields],
  );
  const builtInVehicleFieldKeys = new Set(['locationId', 'serviceCategories', 'vehicleTypeId', 'make', 'model', 'year', 'number', 'color']);
  const customVehicleFields = useMemo(
    () => visibleVehicleFields.filter((item) => !builtInVehicleFieldKeys.has(String(item.field_key || '').trim())),
    [visibleVehicleFields],
  );
  const visibleDocumentTemplates = useMemo(() => documentTemplates.filter((item) => matchesDocumentRole(item.account_type)), [documentTemplates]);
  useEffect(() => {
    setDocumentMeta((current) => ({
      ...buildTemplateMetaState(visibleDocumentTemplates, documents),
      ...current,
    }));
  }, [documents, visibleDocumentTemplates]);
  const selectedArea = useMemo(
    () => areas.find((area) => String(area._id) === String(formData.service_location_id)) || null,
    [areas, formData.service_location_id],
  );
  const selectedVehicle = useMemo(() => vehicleTypes.find((item) => item.id === formData.vehicle_type_id) || null, [vehicleTypes, formData.vehicle_type_id]);
  const setField = (name, value) => {
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };
  const getFieldConfig = (key, fallback = {}) => ({
    name: fallback.name || '',
    placeholder: fallback.placeholder || '',
    help_text: fallback.help_text || '',
    is_required: fallback.is_required ?? true,
    ...fieldConfigMap[key],
  });
  const shouldShowField = (key, fallback = true) => {
    if (!fieldConfigMap[key]) return fallback;
    return fieldConfigMap[key].active !== false;
  };
  const isFieldRequired = (key, fallback = true) => {
    if (!fieldConfigMap[key]) return fallback;
    return fieldConfigMap[key].is_required !== false;
  };
  const handleAreaChange = (event) => {
    const areaId = event.target.value;
    const area = areas.find((item) => String(item._id) === String(areaId));
    setFormData((current) => ({
      ...current,
      service_location_id: areaId,
      country: area?.country?._id || area?.country || current.country,
    }));
  };
  const handleTransportChange = (event) => {
    const nextTransportType = event.target.value;
    setFormData((current) => ({
      ...current,
      transport_type: nextTransportType,
      vehicle_type_id: '',
      service_categories:
        nextTransportType === 'both'
          ? ['taxi', 'outstation']
          : [nextTransportType === 'delivery' ? 'delivery' : nextTransportType === 'pooling' ? 'pooling' : 'taxi'],
    }));
  };
  const toggleServiceCategory = (categoryId) => {
    setFormData((current) => {
      const exists = current.service_categories.includes(categoryId);
      const nextValues = exists ? current.service_categories.filter((item) => item !== categoryId) : [...current.service_categories, categoryId];
      return {
        ...current,
        service_categories: nextValues,
      };
    });
  };
  const handleProfileChange = async ({ camera = false } = {}) => {
    const file = await pickImage({ camera });
    if (!file) return;
    setProfileName(file.name);
    try {
      const dataUrl = await fileToDataUrl(file);
      setField('profile_picture', dataUrl);
    } catch {
      setError('Unable to read profile image');
    }
  };
  const handleCustomFieldChange = (fieldKey, value) => {
    setFormData((current) => ({
      ...current,
      customFields: {
        ...(current.customFields || {}),
        [fieldKey]: value,
      },
    }));
  };
  const handleMetaChange = (templateId, fieldName, nextValue) => {
    setDocumentMeta((current) => ({
      ...current,
      [templateId]: {
        ...(current[templateId] || {}),
        [fieldName]: nextValue,
      },
    }));
  };
  const applyTemplateMetaToDocuments = (templateId, templateDocuments, metaOverride = null) => {
    const meta = metaOverride ||
      documentMeta[templateId] || {
        identifyNumber: '',
        expiryDate: '',
      };
    const identifyNumber = String(meta.identifyNumber || '').trim();
    const expiryDate = String(meta.expiryDate || '').trim();
    return Object.fromEntries(
      Object.entries(templateDocuments).map(([docKey, docValue]) => [
        docKey,
        docValue
          ? {
              ...docValue,
              identifyNumber,
              identify_number: identifyNumber,
              expiryDate,
              expiry_date: expiryDate,
            }
          : docValue,
      ]),
    );
  };
  const handleDocumentFileChange = async (templateId, fieldKey, { camera = false } = {}) => {
    const file = await pickImage({ camera });
    if (!file) return;
    setUploadingDocKey(fieldKey);
    setError('');
    try {
      const dataUrl = await fileToDataUrl(file);
      const nextDocument = applyTemplateMetaToDocuments(templateId, {
        [fieldKey]: {
          previewUrl: dataUrl,
          secureUrl: dataUrl,
          fileName: file.name,
          mimeType: file.type || 'image/jpeg',
          uploaded: true,
        },
      })[fieldKey];
      setDocuments((current) => ({
        ...current,
        [fieldKey]: nextDocument,
      }));
    } catch {
      setError('Unable to read document image');
    } finally {
      setUploadingDocKey('');
    }
  };
  const validateForm = () => {
    const fullName = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const phone = String(formData.mobile || '').replace(/\D/g, '');
    const currentYear = new Date().getFullYear();
    const vehicleYear = Number(formData.vehicle_year || 0);
    if (!fullName || !NAME_REGEX.test(fullName)) {
      return 'Please enter a valid driver name';
    }
    if (!EMAIL_REGEX.test(email)) {
      return 'Please enter a valid email address';
    }
    if (!/^\d{10}$/.test(phone)) {
      return 'Please enter a valid 10-digit mobile number';
    }
    if (!formData.gender) {
      return 'Please select gender';
    }
    if (!formData.password || formData.password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.password_confirmation) {
      return 'Password and confirm password must match';
    }
    if (!formData.service_location_id) {
      return 'Please select area';
    }
    if (isFieldRequired('serviceCategories', true) && formData.service_categories.length === 0) {
      return 'Please select at least one service category';
    }
    if (!formData.vehicle_type_id) {
      return 'Please select vehicle type';
    }
    if (!String(formData.vehicle_make || '').trim()) {
      return 'Please enter vehicle make';
    }
    if (!String(formData.vehicle_model || '').trim()) {
      return 'Please enter vehicle model';
    }
    if (!/^\d{4}$/.test(String(formData.vehicle_year || '')) || vehicleYear < 1980 || vehicleYear > currentYear) {
      return `Vehicle year must be between 1980 and ${currentYear}`;
    }
    if (!VEHICLE_NUMBER_REGEX.test(normalizeVehicleNumber(formData.vehicle_number))) {
      return 'Vehicle number must be in valid Indian format';
    }
    if (!String(formData.vehicle_color || '').trim()) {
      return 'Please enter vehicle color';
    }
    const missingCustomField = customVehicleFields.find(
      (field) =>
        field?.is_required !== false &&
        !String(
          Array.isArray(formData.customFields?.[field.field_key])
            ? formData.customFields?.[field.field_key]?.join(',')
            : formData.customFields?.[field.field_key] || '',
        ).trim(),
    );
    if (missingCustomField) {
      return `${missingCustomField.name || 'Additional field'} is required`;
    }
    for (const template of visibleDocumentTemplates) {
      const fields = Array.isArray(template.fields) ? template.fields : [];
      const requiredFields = fields.filter((field) => Boolean(field.required ?? template.is_required));
      const meta = documentMeta[template.id] || {};
      if (requiredFields.some((field) => !documents[field.key]?.uploaded && !documents[field.key]?.secureUrl)) {
        return `Please upload ${template.name}`;
      }
      if (template.has_identify_number && requiredFields.length > 0 && !String(meta.identifyNumber || '').trim()) {
        return `${template.name} number is required`;
      }
      if (template.has_expiry_date && requiredFields.length > 0 && !String(meta.expiryDate || '').trim()) {
        return `${template.name} expiry date is required`;
      }
    }
    return '';
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payloadDocuments = {
        ...documents,
      };
      for (const template of visibleDocumentTemplates) {
        const templateFields = Array.isArray(template.fields) ? template.fields : [];
        const templateDocuments = Object.fromEntries(
          templateFields.filter((field) => payloadDocuments[field.key]).map((field) => [field.key, payloadDocuments[field.key]]),
        );
        Object.assign(payloadDocuments, applyTemplateMetaToDocuments(template.id, templateDocuments));
      }
      const response = await adminService.createDriver({
        name: formData.name.trim(),
        mobile: String(formData.mobile || '').replace(/\D/g, ''),
        phone: String(formData.mobile || '').replace(/\D/g, ''),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        gender: formData.gender.toLowerCase(),
        service_location_id: formData.service_location_id,
        country: formData.country,
        profile_picture: formData.profile_picture,
        transport_type: formData.transport_type,
        serviceCategories: formData.service_categories,
        vehicle_type_id: formData.vehicle_type_id,
        vehicle_type: selectedVehicle?.label || '',
        vehicle_make: formData.vehicle_make.trim(),
        vehicle_model: formData.vehicle_model.trim(),
        vehicle_color: formData.vehicle_color.trim(),
        vehicle_number: normalizeVehicleNumber(formData.vehicle_number),
        approve: true,
        status: 'approved',
        documents: payloadDocuments,
        onboarding: {
          role: 'driver',
          customFields: formData.customFields,
          vehicleYear: String(formData.vehicle_year || '').trim(),
          createdFromAdminOnboarding: true,
          serviceLocationName: selectedArea?.service_location_name || selectedArea?.name || '',
        },
      });
      if (response?.success) {
        navigate('/taxi/admin/drivers');
        return;
      }
      setError(response?.message || 'Failed to create driver');
    } catch (apiError) {
      setError(apiError?.message || 'Failed to create driver');
    } finally {
      setSubmitting(false);
    }
  };
  const col = tablet ? 'w-1/2 px-1.5 mb-4' : 'w-full';
  const grid = tablet ? 'flex-row flex-wrap -mx-1.5' : 'gap-4';
  const breadcrumb = [{ label: 'Drivers' }, { label: 'Admin onboarding' }, { label: 'Create driver' }];
  if (isLoading) {
    return (
      <AdminPage maxWidth={720}>
        <PageHeader icon={User} title="Create driver" breadcrumb={breadcrumb} />
        <LoadingState label="Preparing the onboarding form…" />
      </AdminPage>
    );
  }
  const locationField = getFieldConfig('locationId', {
    name: 'Operating City',
  });
  const serviceCategoryField = getFieldConfig('serviceCategories', {
    name: 'Service Category',
  });
  const vehicleTypeField = getFieldConfig('vehicleTypeId', {
    name: 'Vehicle Type',
  });
  const makeField = getFieldConfig('make', {
    name: 'Brand / Make',
    placeholder: 'e.g. Maruti Suzuki',
  });
  const modelField = getFieldConfig('model', {
    name: 'Model',
    placeholder: 'Swift, Bolt',
  });
  const yearField = getFieldConfig('year', {
    name: 'Year',
    placeholder: String(new Date().getFullYear()),
  });
  const numberField = getFieldConfig('number', {
    name: 'Plate Number',
    placeholder: 'DL1RT1234',
  });
  const colorField = getFieldConfig('color', {
    name: 'Exterior Color',
    placeholder: 'e.g. White, Black',
  });
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={User}
        title="Create driver"
        subtitle="Fill personal info, vehicle setup and required KYC so the driver shows up ready across the app."
        breadcrumb={breadcrumb}
        actions={
          <Button type="button" onClick={() => navigate('/taxi/admin/drivers')} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Back to drivers</Span>
          </Button>
        }
      />

      <Form onSubmit={handleSubmit}>
        {error ? <ErrorState title="Could not save this driver" message={error} className="mb-4" /> : null}

        <Card className="mb-4">
          <SectionTitle>Step 1 · Personal info</SectionTitle>
          <Div className={grid}>
            <Field label="Full name" required className={col}>
              <Input
                value={formData.name}
                onChange={(event) => setField('name', event.target.value.replace(/[^A-Za-z .'-]/g, ''))}
                placeholder="Enter driver name"
                className={INPUT}
              />
            </Field>
            <Field label="Mobile number" required className={col}>
              <Input
                value={formData.mobile}
                onChange={(event) => setField('mobile', event.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10 digit mobile number"
                className={INPUT}
              />
            </Field>
            <Field label="Email" required className={col}>
              <Input type="email" value={formData.email} onChange={(event) => setField('email', event.target.value)} placeholder="name@gmail.com" className={INPUT} />
            </Field>
            <Field label="Gender" required className={col}>
              <Div className="flex-row flex-wrap gap-2">
                {['male', 'female', 'other'].map((gender) => (
                  <Button
                    key={gender}
                    type="button"
                    onClick={() => setField('gender', gender)}
                    className={`h-11 flex-1 min-w-[88px] items-center justify-center rounded-lg ${formData.gender === gender ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
                  >
                    <Span className={`text-sm font-semibold capitalize ${formData.gender === gender ? 'text-white' : 'text-slate-700'}`}>{gender}</Span>
                  </Button>
                ))}
              </Div>
            </Field>
            <Field label="Password" required hint="Minimum 6 characters" className={col}>
              <Input type="password" value={formData.password} onChange={(event) => setField('password', event.target.value)} placeholder="Minimum 6 characters" className={INPUT} />
            </Field>
            <Field label="Confirm password" required className={col}>
              <Input
                type="password"
                value={formData.password_confirmation}
                onChange={(event) => setField('password_confirmation', event.target.value)}
                placeholder="Re-enter password"
                className={INPUT}
              />
            </Field>
          </Div>

          <Field label="Profile image" className="mt-1">
            <Button
              type="button"
              onClick={() => handleProfileChange()}
              accessibilityLabel="Upload profile photo"
              className="w-full min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50"
            >
              {formData.profile_picture ? (
                <Img src={formData.profile_picture} alt="Driver profile" className="h-40 w-full rounded-lg" contentFit="cover" />
              ) : (
                <>
                  <UiIcon as={Camera} size={24} className="mb-2 text-slate-400" />
                  <Span className="text-sm font-semibold text-slate-700">{profileName || 'Upload profile photo'}</Span>
                </>
              )}
            </Button>
          </Field>
        </Card>

        <Card className="mb-4">
          <SectionTitle>Step 2 · Vehicle setup</SectionTitle>
          <Div className={grid}>
            {shouldShowField('locationId', true) ? (
              <Field label={locationField.name} className={col}>
                <Select value={formData.service_location_id} onChange={handleAreaChange} className={INPUT}>
                  <Option value="">Select area</Option>
                  {areas.map((area) => (
                    <Option key={area._id} value={area._id}>
                      {area.service_location_name || area.name || 'Area'}
                    </Option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <Field label="Transport type" className={col}>
              <Select value={formData.transport_type} onChange={handleTransportChange} className={INPUT}>
                <Option value="">Select transport type</Option>
                {transportTypes.map((type) => (
                  <Option key={type.id || type._id || type.name} value={type.name}>
                    {type.display_name || type.name}
                  </Option>
                ))}
              </Select>
            </Field>
          </Div>

          {shouldShowField('serviceCategories', true) ? (
            <Field label={serviceCategoryField.name} className="mb-4">
              <Div className="flex-row flex-wrap gap-2">
                {serviceCategoryChoices.map((item) => {
                  const selected = formData.service_categories.includes(item.id);
                  return (
                    <Button
                      key={item.id}
                      type="button"
                      onClick={() => toggleServiceCategory(item.id)}
                      className={`h-11 justify-center rounded-full px-4 ${selected ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
                    >
                      <Span className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-700'}`}>{item.label}</Span>
                    </Button>
                  );
                })}
              </Div>
            </Field>
          ) : null}

          <Div className={grid}>
            {shouldShowField('vehicleTypeId', true) ? (
              <Field label={vehicleTypeField.name} className={col}>
                <Select
                  value={formData.vehicle_type_id}
                  onChange={(event) => setField('vehicle_type_id', event.target.value)}
                  className={INPUT}
                  disabled={!formData.service_location_id || isLoadingVehicles}
                >
                  <Option value="">{isLoadingVehicles ? 'Loading…' : 'Select vehicle type'}</Option>
                  {vehicleTypes.map((vehicle) => (
                    <Option key={vehicle.id} value={vehicle.id}>
                      {vehicle.label}
                    </Option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {shouldShowField('make', true) ? (
              <Field label={makeField.name} className={col}>
                <Input value={formData.vehicle_make} onChange={(event) => setField('vehicle_make', event.target.value)} placeholder={makeField.placeholder} className={INPUT} />
              </Field>
            ) : null}

            {shouldShowField('model', true) ? (
              <Field label={modelField.name} className={col}>
                <Input value={formData.vehicle_model} onChange={(event) => setField('vehicle_model', event.target.value)} placeholder={modelField.placeholder} className={INPUT} />
              </Field>
            ) : null}

            {shouldShowField('year', true) ? (
              <Field label={yearField.name} className={col}>
                <Input
                  value={formData.vehicle_year}
                  onChange={(event) => setField('vehicle_year', event.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder={yearField.placeholder}
                  className={INPUT}
                />
              </Field>
            ) : null}

            {shouldShowField('number', true) ? (
              <Field label={numberField.name} className={col}>
                <Input
                  value={formData.vehicle_number}
                  onChange={(event) => setField('vehicle_number', normalizeVehicleNumber(event.target.value))}
                  placeholder={numberField.placeholder}
                  className={INPUT}
                />
              </Field>
            ) : null}

            {shouldShowField('color', true) ? (
              <Field label={colorField.name} className={col}>
                <Input value={formData.vehicle_color} onChange={(event) => setField('vehicle_color', event.target.value)} placeholder={colorField.placeholder} className={INPUT} />
              </Field>
            ) : null}
          </Div>

          {customVehicleFields.length > 0 ? (
            <Div className="mt-2 border-t border-slate-100 pt-4">
              <SectionTitle>Additional fields</SectionTitle>
              <P className="text-sm text-slate-500 mb-3">These are configured from admin onboarding settings.</P>
              <Div className={grid}>
                {customVehicleFields.map((field) => {
                  const fieldKey = String(field.field_key || '').trim();
                  const fieldType = String(field.field_type || 'text')
                    .trim()
                    .toLowerCase();
                  const value = formData.customFields?.[fieldKey] || (fieldType === 'multi_select' ? [] : '');
                  const options = Array.isArray(field.options) ? field.options : [];
                  if (fieldType === 'textarea') {
                    return (
                      <Field key={fieldKey} label={field.name} className={tablet ? 'w-full px-1.5 mb-4' : 'w-full'}>
                        <Textarea
                          value={value}
                          onChange={(event) => handleCustomFieldChange(fieldKey, event.target.value)}
                          placeholder={field.placeholder || ''}
                          rows={4}
                          className="min-h-[120px] px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                        />
                      </Field>
                    );
                  }
                  if (fieldType === 'select') {
                    return (
                      <Field key={fieldKey} label={field.name} className={col}>
                        <Select value={value} onChange={(event) => handleCustomFieldChange(fieldKey, event.target.value)} className={INPUT}>
                          <Option value="">{field.placeholder || `Select ${field.name}`}</Option>
                          {options.map((option) => (
                            <Option key={option} value={option}>
                              {option}
                            </Option>
                          ))}
                        </Select>
                      </Field>
                    );
                  }
                  if (fieldType === 'multi_select') {
                    const selectedValues = Array.isArray(value) ? value : [];
                    return (
                      <Field key={fieldKey} label={field.name} className={tablet ? 'w-full px-1.5 mb-4' : 'w-full'}>
                        <Div className="flex-row flex-wrap gap-2">
                          {options.map((option) => {
                            const selected = selectedValues.includes(option);
                            return (
                              <Button
                                key={option}
                                type="button"
                                onClick={() =>
                                  handleCustomFieldChange(fieldKey, selected ? selectedValues.filter((item) => item !== option) : [...selectedValues, option])
                                }
                                className={`h-11 justify-center rounded-full px-4 ${selected ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
                              >
                                <Span className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-700'}`}>{option}</Span>
                              </Button>
                            );
                          })}
                        </Div>
                      </Field>
                    );
                  }
                  return (
                    <Field key={fieldKey} label={field.name} className={col}>
                      <Input
                        type={fieldType === 'number' ? 'tel' : 'text'}
                        value={Array.isArray(value) ? value.join(', ') : value}
                        onChange={(event) => handleCustomFieldChange(fieldKey, fieldType === 'number' ? event.target.value.replace(/\D/g, '') : event.target.value)}
                        placeholder={field.placeholder || ''}
                        className={INPUT}
                      />
                    </Field>
                  );
                })}
              </Div>
            </Div>
          ) : null}
        </Card>

        <Card className="mb-4">
          <SectionTitle>Step 3 · Documents vault</SectionTitle>
          {visibleDocumentTemplates.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No document templates"
              message="No driver document templates are configured yet, so there is nothing to upload here."
            />
          ) : (
            <Div className="gap-4">
              {visibleDocumentTemplates.map((template) => (
                <Div key={template.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <Div className="mb-3 flex-row flex-wrap items-start justify-between gap-2">
                    <Div className="flex-1 min-w-0">
                      <P className="text-base font-semibold text-slate-900">{template.name}</P>
                      <P className="mt-0.5 text-xs text-slate-500">
                        {template.is_required ? 'Required' : 'Optional'} · {typeLabel(template.account_type || 'individual')}
                      </P>
                    </Div>
                    <StatusBadge tone="neutral" label={template.fields?.length > 1 ? 'Multiple sides' : 'Single side'} />
                  </Div>

                  <Div className={grid}>
                    {(template.fields || []).map((field) => {
                      const doc = documents[field.key];
                      const isUploading = uploadingDocKey === field.key;
                      const required = field.required ?? template.is_required;
                      return (
                        <Div key={field.key} className={`${col} `}>
                          <Div className="rounded-xl border border-slate-200 bg-white p-3">
                            <Div className="mb-2 flex-row items-center justify-between gap-2">
                              <Span className="text-sm font-medium text-slate-700 flex-1">{field.label}</Span>
                              <StatusBadge tone={required ? 'info' : 'neutral'} label={required ? 'Required' : 'Optional'} />
                            </Div>

                            <Div className="mb-3 h-36 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
                              {isUploading ? (
                                <Div className="items-center gap-2">
                                  <UiIcon as={Loader2} size={22} className="text-slate-500" />
                                  <Span className="text-xs text-slate-500">Uploading…</Span>
                                </Div>
                              ) : doc?.previewUrl ? (
                                <Img src={doc.previewUrl} alt={field.label} className="h-full w-full" contentFit="cover" />
                              ) : (
                                <Div className="items-center">
                                  <UiIcon as={UploadCloud} size={22} className="mb-2 text-slate-400" />
                                  <P className="text-xs text-slate-500">Tap a button below to upload</P>
                                </Div>
                              )}
                            </Div>

                            <Div className="flex-row gap-2">
                              <Button
                                type="button"
                                onClick={() => handleDocumentFileChange(template.id, field.key)}
                                className={`${BTN_SECONDARY} flex-1 px-2`}
                              >
                                <UiIcon as={ImagePlus} size={15} className="text-slate-700" />
                                <Span className={BTN_TEXT_SECONDARY}>Gallery</Span>
                              </Button>
                              <Button
                                type="button"
                                onClick={() => handleDocumentFileChange(template.id, field.key, { camera: true })}
                                className={`${BTN_PRIMARY} flex-1 px-2`}
                              >
                                <UiIcon as={Camera} size={15} className="text-white" />
                                <Span className={BTN_TEXT_PRIMARY}>Camera</Span>
                              </Button>
                            </Div>
                          </Div>
                        </Div>
                      );
                    })}
                  </Div>

                  {template.has_identify_number || template.has_expiry_date ? (
                    <Div className={grid}>
                      {template.has_identify_number ? (
                        <Field label={typeLabel(template.identify_number_key) || `${template.name} number`} className={col}>
                          <Input
                            value={documentMeta[template.id]?.identifyNumber || ''}
                            onChange={(event) => handleMetaChange(template.id, 'identifyNumber', event.target.value.toUpperCase())}
                            placeholder={`Enter ${typeLabel(template.identify_number_key) || 'document number'}`}
                            className={INPUT}
                          />
                        </Field>
                      ) : null}
                      {template.has_expiry_date ? (
                        <Field label="Expiry date" className={col}>
                          <Input
                            type="date"
                            value={documentMeta[template.id]?.expiryDate || ''}
                            onChange={(event) => handleMetaChange(template.id, 'expiryDate', event.target.value)}
                            className={INPUT}
                          />
                        </Field>
                      ) : null}
                    </Div>
                  ) : null}
                </Div>
              ))}
            </Div>
          )}
        </Card>

        <Card>
          <Button type="submit" disabled={submitting} className={`${BTN_PRIMARY} w-full ${submitting ? 'opacity-70' : ''}`}>
            <UiIcon as={submitting ? Loader2 : FileText} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>{submitting ? 'Creating driver…' : 'Create driver'}</Span>
          </Button>
        </Card>
      </Form>
    </AdminPage>
  );
};
export default CreateDriver;
