/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverDocumentForm.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, Save } from 'lucide-react-native';
import { useNavigate, useParams, useSearchParams } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field as FormField,
  LoadingState,
  ErrorState,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, Div, Form, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { Switch } from '../../../../../components/shadcn';
const customVehicleFieldSentinel = '__custom__';
const initialDocumentForm = {
  name: '',
  account_type: '',
  has_expiry_date: '',
  image_type: '',
  has_identify_number: '',
  identify_number_key: '',
  verification_type: 'none',
  is_editable: false,
  is_required: false,
  active: true,
};
const initialVehicleFieldForm = {
  name: '',
  account_type: '',
  field_key: customVehicleFieldSentinel,
  custom_field_key: '',
  field_type: 'text',
  field_group: 'custom',
  placeholder: '',
  help_text: '',
  sort_order: 1,
  options_text: '',
  is_editable: true,
  is_required: true,
  active: true,
};
const accountTypeOptions = [
  {
    value: 'individual',
    label: 'Individual',
  },
  {
    value: 'fleet_drivers',
    label: 'Fleet Drivers',
  },
  {
    value: 'both',
    label: 'Both',
  },
];
const yesNoOptions = [
  {
    value: '0',
    label: 'No',
  },
  {
    value: '1',
    label: 'Yes',
  },
];
const imageTypeOptions = [
  {
    value: 'front_back',
    label: 'Front & Back',
  },
  {
    value: 'image',
    label: 'Single Image',
  },
  {
    value: 'front',
    label: 'Front Only',
  },
  {
    value: 'back',
    label: 'Back Only',
  },
];
const verificationTypeOptions = [
  {
    value: 'none',
    label: 'General Document (No API)',
  },
  {
    value: 'driving_license',
    label: 'Driving License Verification',
  },
  {
    value: 'pan',
    label: 'PAN Verification',
  },
  {
    value: 'gstin',
    label: 'GSTIN Verification',
  },
  {
    value: 'rc',
    label: 'RC Verification',
  },
  {
    value: 'bank_account',
    label: 'Bank Account Verification',
  },
];
const documentVerificationPresets = {
  driving_license: {
    name: 'Driving License',
    image_type: 'image',
    has_expiry_date: '1',
    has_identify_number: '1',
    identify_number_key: 'license_no',
  },
  pan: {
    name: 'PAN Card',
    image_type: 'image',
    has_expiry_date: '0',
    has_identify_number: '1',
    identify_number_key: 'pan_no',
  },
  gstin: {
    name: 'GST Certificate',
    image_type: 'image',
    has_expiry_date: '0',
    has_identify_number: '1',
    identify_number_key: 'gstin',
  },
  rc: {
    name: 'Vehicle RC',
    image_type: 'image',
    has_expiry_date: '0',
    has_identify_number: '1',
    identify_number_key: 'rc_no',
  },
  bank_account: {
    name: 'Bank Proof',
    image_type: 'image',
    has_expiry_date: '0',
    has_identify_number: '1',
    identify_number_key: 'bank_account',
  },
};
const vehicleFieldOptions = [
  {
    value: 'locationId',
    label: 'Operating City',
    field_type: 'location_select',
    field_group: 'common',
    placeholder: '',
    account_type: 'both',
  },
  {
    value: 'serviceCategories',
    label: 'Service Category',
    field_type: 'multi_select',
    field_group: 'driver',
    placeholder: '',
    account_type: 'individual',
    options: ['taxi', 'outstation', 'delivery', 'pooling'],
  },
  {
    value: 'vehicleTypeId',
    label: 'Vehicle Type',
    field_type: 'vehicle_type_select',
    field_group: 'driver',
    placeholder: '',
    account_type: 'individual',
  },
  {
    value: 'make',
    label: 'Brand / Make',
    field_type: 'text',
    field_group: 'driver',
    placeholder: 'e.g. Maruti Suzuki',
    account_type: 'individual',
  },
  {
    value: 'model',
    label: 'Model',
    field_type: 'text',
    field_group: 'driver',
    placeholder: 'Swift, Bolt',
    account_type: 'individual',
  },
  {
    value: 'year',
    label: 'Year',
    field_type: 'number',
    field_group: 'driver',
    placeholder: 'e.g. 2024',
    account_type: 'individual',
  },
  {
    value: 'number',
    label: 'Plate Number',
    field_type: 'text',
    field_group: 'driver',
    placeholder: 'DL1RT1234',
    account_type: 'individual',
  },
  {
    value: 'color',
    label: 'Exterior Color',
    field_type: 'text',
    field_group: 'driver',
    placeholder: 'e.g. White, Black',
    account_type: 'individual',
  },
  {
    value: 'companyName',
    label: 'Company Name',
    field_type: 'text',
    field_group: 'owner',
    placeholder: 'Legal Company Name',
    account_type: 'fleet_drivers',
  },
  {
    value: 'companyAddress',
    label: 'Company Address',
    field_type: 'text',
    field_group: 'owner',
    placeholder: 'Business Address',
    account_type: 'fleet_drivers',
  },
  {
    value: 'city',
    label: 'City',
    field_type: 'text',
    field_group: 'owner',
    placeholder: 'City',
    account_type: 'fleet_drivers',
  },
  {
    value: 'postalCode',
    label: 'Postal Code',
    field_type: 'number',
    field_group: 'owner',
    placeholder: 'Pincode',
    account_type: 'fleet_drivers',
  },
  {
    value: 'taxNumber',
    label: 'Tax Number (GST/VAT)',
    field_type: 'text',
    field_group: 'owner',
    placeholder: 'Tax Identification',
    account_type: 'fleet_drivers',
  },
];
const vehicleFieldTypeOptions = [
  {
    value: 'text',
    label: 'Text',
  },
  {
    value: 'number',
    label: 'Number',
  },
  {
    value: 'textarea',
    label: 'Textarea',
  },
  {
    value: 'select',
    label: 'Select',
  },
  {
    value: 'multi_select',
    label: 'Multi Select',
  },
  {
    value: 'location_select',
    label: 'Location Select',
  },
  {
    value: 'vehicle_type_select',
    label: 'Vehicle Type Select',
  },
];
const getOptionLabel = (options, value, fallback = 'Not selected') => options.find((option) => option.value === value)?.label || fallback;
const normalizeBooleanLike = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return Boolean(value);
};
const fromDocumentResponse = (payload = {}) => ({
  name: payload.name || '',
  account_type: payload.account_type || '',
  has_expiry_date: payload.has_expiry_date === true ? '1' : payload.has_expiry_date === false ? '0' : '',
  image_type: payload.image_type || '',
  has_identify_number: payload.has_identify_number === true ? '1' : payload.has_identify_number === false ? '0' : '',
  identify_number_key: payload.identify_number_key || '',
  verification_type: payload.verification_type || 'none',
  is_editable: normalizeBooleanLike(payload.is_editable, false),
  is_required: normalizeBooleanLike(payload.is_required, false),
  active: normalizeBooleanLike(payload.active, true),
});
const fromVehicleFieldResponse = (payload = {}) => ({
  name: payload.name || '',
  account_type: payload.account_type || '',
  field_key: vehicleFieldOptions.some((option) => option.value === payload.field_key) ? payload.field_key || '' : customVehicleFieldSentinel,
  custom_field_key: vehicleFieldOptions.some((option) => option.value === payload.field_key) ? '' : payload.field_key || '',
  field_type: payload.field_type || '',
  field_group: payload.field_group || '',
  placeholder: payload.placeholder || '',
  help_text: payload.help_text || '',
  sort_order: Number(payload.sort_order || 0),
  options_text: Array.isArray(payload.options) ? payload.options.join(', ') : '',
  is_editable: normalizeBooleanLike(payload.is_editable, true),
  is_required: normalizeBooleanLike(payload.is_required, true),
  active: normalizeBooleanLike(payload.active, true),
});
const DriverDocumentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [searchParams] = useSearchParams();
  const requestedType = String(searchParams.get('type') || 'document')
    .trim()
    .toLowerCase();
  const [templateType, setTemplateType] = useState(requestedType === 'vehicle_field' ? 'vehicle_field' : 'document');
  const [documentForm, setDocumentForm] = useState(initialDocumentForm);
  const [vehicleFieldForm, setVehicleFieldForm] = useState(initialVehicleFieldForm);
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const { tablet } = useLayoutWidth();
  const isCustomVehicleField = templateType === 'vehicle_field' && vehicleFieldForm.field_key === customVehicleFieldSentinel;
  useEffect(() => {
    if (!isEditMode) {
      return;
    }
    const loadItem = async () => {
      setLoading(true);
      setError('');
      setLoadError('');
      try {
        const response = await adminService.getDriverNeededDocument(id);
        const payload = response?.data?.data || response?.data || {};
        const nextType = String(payload.template_type || requestedType || 'document')
          .trim()
          .toLowerCase();
        setTemplateType(nextType === 'vehicle_field' ? 'vehicle_field' : 'document');
        if (nextType === 'vehicle_field') {
          setVehicleFieldForm(fromVehicleFieldResponse(payload));
        } else {
          setDocumentForm(fromDocumentResponse(payload));
        }
      } catch (err) {
        setLoadError(err?.message || 'Unable to load onboarding item');
      } finally {
        setLoading(false);
      }
    };
    loadItem();
  }, [id, isEditMode, requestedType, reloadKey]);
  const selectedVehicleField = useMemo(() => vehicleFieldOptions.find((option) => option.value === vehicleFieldForm.field_key), [vehicleFieldForm.field_key]);
  const handleDocumentChange = (key, value) => {
    setDocumentForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'has_identify_number' && value !== '1'
        ? {
            identify_number_key: '',
          }
        : {}),
      ...(key === 'verification_type'
        ? {
            ...(value !== 'none' ? documentVerificationPresets[value] || {} : {}),
            verification_type: value,
          }
        : {}),
    }));
  };
  const handleVehicleFieldChange = (key, value) => {
    setVehicleFieldForm((current) => {
      const next = {
        ...current,
        [key]: value,
      };
      if (key === 'field_key') {
        const selected = vehicleFieldOptions.find((option) => option.value === value);
        if (selected) {
          next.name = current.name || selected.label;
          next.field_type = selected.field_type;
          next.field_group = selected.field_group;
          next.placeholder = current.placeholder || selected.placeholder || '';
          next.account_type = current.account_type || selected.account_type;
          next.options_text = current.options_text || (selected.options || []).join(', ');
          next.custom_field_key = '';
        } else if (value === customVehicleFieldSentinel) {
          next.field_type = current.field_type || 'text';
          next.field_group = current.field_group || 'custom';
        }
      }
      return next;
    });
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (templateType === 'vehicle_field') {
        const resolvedFieldKey =
          vehicleFieldForm.field_key === customVehicleFieldSentinel ? String(vehicleFieldForm.custom_field_key || '').trim() : vehicleFieldForm.field_key;
        if (!vehicleFieldForm.name.trim() || !vehicleFieldForm.account_type || !resolvedFieldKey) {
          setError('Please fill all required vehicle field settings.');
          setSubmitting(false);
          return;
        }
        const payload = {
          template_type: 'vehicle_field',
          name: String(vehicleFieldForm.name || '').trim(),
          account_type: vehicleFieldForm.account_type,
          field_key: resolvedFieldKey,
          field_type: vehicleFieldForm.field_type,
          field_group: vehicleFieldForm.field_group,
          placeholder: String(vehicleFieldForm.placeholder || '').trim(),
          help_text: String(vehicleFieldForm.help_text || '').trim(),
          sort_order: Number(vehicleFieldForm.sort_order || 0),
          options: String(vehicleFieldForm.options_text || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          is_editable: Boolean(vehicleFieldForm.is_editable),
          is_required: Boolean(vehicleFieldForm.is_required),
          active: Boolean(vehicleFieldForm.active),
        };
        if (isEditMode) {
          await adminService.updateDriverNeededDocument(id, payload);
        } else {
          await adminService.createDriverNeededDocument(payload);
        }
      } else {
        if (
          !documentForm.name.trim() ||
          !documentForm.account_type ||
          documentForm.has_expiry_date === '' ||
          !documentForm.image_type ||
          documentForm.has_identify_number === '' ||
          (documentForm.has_identify_number === '1' && !documentForm.identify_number_key.trim())
        ) {
          setError('Please fill all required document fields.');
          setSubmitting(false);
          return;
        }
        const payload = {
          template_type: 'document',
          name: String(documentForm.name || '').trim(),
          account_type: documentForm.account_type,
          has_expiry_date: documentForm.has_expiry_date === '1',
          image_type: documentForm.image_type,
          has_identify_number: documentForm.has_identify_number === '1',
          identify_number_key: documentForm.has_identify_number === '1' ? String(documentForm.identify_number_key || '').trim() : '',
          verification_type: documentForm.verification_type || 'none',
          is_editable: Boolean(documentForm.is_editable),
          is_required: Boolean(documentForm.is_required),
          active: Boolean(documentForm.active),
        };
        if (isEditMode) {
          await adminService.updateDriverNeededDocument(id, payload);
        } else {
          await adminService.createDriverNeededDocument(payload);
        }
      }
      navigate('/taxi/admin/drivers/documents');
    } catch (err) {
      setError(err?.message || 'Unable to save onboarding configuration');
    } finally {
      setSubmitting(false);
    }
  };
  const header = (
    <PageHeader
      icon={FileText}
      title={`${isEditMode ? 'Edit' : 'Create'} ${templateType === 'vehicle_field' ? 'Vehicle Field' : 'Document'}`}
      subtitle="Onboarding configuration for the driver app"
      breadcrumb={[
        { label: 'Driver Onboarding Config', onPress: () => navigate('/taxi/admin/drivers/documents') },
        { label: isEditMode ? 'Edit' : 'Create' },
      ]}
      actions={
        <Button type="button" onClick={() => navigate('/taxi/admin/drivers/documents')} className={BTN_SECONDARY}>
          <UiIcon as={ArrowLeft} size={16} className="text-slate-700" />
          <Span className={BTN_TEXT_SECONDARY}>Back</Span>
        </Button>
      }
    />
  );
  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <LoadingState label="Loading configuration…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <ErrorState title="Could not load this item" message={loadError} onRetry={() => setReloadKey((k) => k + 1)} />
      </AdminPage>
    );
  }
  const pair = (a, b) => <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>{a}{b}</Div>;
  const toggleRow = (label, checked, onChange, strong) => (
    <Div className="flex-row items-center justify-between gap-3">
      <Span className={strong ? 'text-sm font-semibold text-slate-900 flex-1' : 'text-sm text-slate-700 flex-1'}>{label}</Span>
      <Switch checked={Boolean(checked)} onCheckedChange={() => onChange(!checked)} />
    </Div>
  );
  return (
    <AdminPage maxWidth={720}>
      {header}

      <Form onSubmit={handleSubmit}>
        {!isEditMode ? (
          <Card className="mb-4">
            <FormField label="Config type" required>
              <Select value={templateType} onChange={(event) => setTemplateType(event.target.value)} className={INPUT}>
                <Option value="document">Document</Option>
                <Option value="vehicle_field">Vehicle Field</Option>
              </Select>
            </FormField>
          </Card>
        ) : null}

        {templateType === 'vehicle_field' ? (
          <>
            <Card className="mb-4 gap-3">
              <SectionTitle>Field source</SectionTitle>
              <Div className="flex-row flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => handleVehicleFieldChange('field_key', customVehicleFieldSentinel)}
                  className={isCustomVehicleField ? BTN_PRIMARY : BTN_SECONDARY}
                >
                  <Span className={isCustomVehicleField ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>Create custom field</Span>
                </Button>
                <Button
                  type="button"
                  onClick={() => handleVehicleFieldChange('field_key', vehicleFieldOptions[0]?.value || '')}
                  className={!isCustomVehicleField ? BTN_PRIMARY : BTN_SECONDARY}
                >
                  <Span className={!isCustomVehicleField ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>Use built-in field</Span>
                </Button>
              </Div>
              <P className="text-sm text-slate-500">
                Create custom field adds a brand new field key for the vehicle step. Use built-in field when you only want to rename or reconfigure one of the
                existing onboarding fields.
              </P>
            </Card>

            <Card className="mb-4 gap-4">
              <SectionTitle>Field settings</SectionTitle>
              {pair(
                <FormField key="fk" label={isCustomVehicleField ? 'Field mode' : 'Field key'} required={!isCustomVehicleField} className="flex-1">
                  {isCustomVehicleField ? (
                    <Input type="text" value="Custom field" className={INPUT} readOnly />
                  ) : (
                    <Select
                      value={vehicleFieldForm.field_key}
                      onChange={(event) => handleVehicleFieldChange('field_key', event.target.value)}
                      className={INPUT}
                      required
                    >
                      <Option value="" disabled>
                        Select vehicle field
                      </Option>
                      {vehicleFieldOptions.map((option) => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  )}
                </FormField>,
                isCustomVehicleField ? (
                  <FormField key="cfk" label="Custom field key" required className="flex-1">
                    <Input
                      type="text"
                      value={vehicleFieldForm.custom_field_key}
                      onChange={(event) => handleVehicleFieldChange('custom_field_key', event.target.value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase())}
                      placeholder="e.g. permit_zone"
                      className={INPUT}
                      required
                    />
                  </FormField>
                ) : (
                  <Div key="spacer" className="flex-1" />
                ),
              )}
              {pair(
                <FormField key="lbl" label="Field label" required className="flex-1">
                  <Input
                    type="text"
                    value={vehicleFieldForm.name}
                    onChange={(event) => handleVehicleFieldChange('name', event.target.value)}
                    placeholder="Enter display label"
                    className={INPUT}
                    required
                  />
                </FormField>,
                <FormField key="acct" label="Account type" required className="flex-1">
                  <Select
                    value={vehicleFieldForm.account_type}
                    onChange={(event) => handleVehicleFieldChange('account_type', event.target.value)}
                    className={INPUT}
                    required
                  >
                    <Option value="" disabled>
                      Select account type
                    </Option>
                    {accountTypeOptions.map((option) => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </FormField>,
              )}
              {pair(
                <FormField key="ft" label="Field type" className="flex-1">
                  <Select value={vehicleFieldForm.field_type} onChange={(event) => handleVehicleFieldChange('field_type', event.target.value)} className={INPUT}>
                    {vehicleFieldTypeOptions.map((option) => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </FormField>,
                <FormField key="fg" label="Field group" className="flex-1">
                  <Input
                    type="text"
                    value={vehicleFieldForm.field_group}
                    onChange={(event) => handleVehicleFieldChange('field_group', event.target.value)}
                    placeholder="driver, owner, common"
                    className={INPUT}
                  />
                </FormField>,
              )}
              <FormField label="Position" hint="Lower numbers appear first">
                <Input
                  type="number"
                  value={vehicleFieldForm.sort_order}
                  onChange={(event) => handleVehicleFieldChange('sort_order', event.target.value)}
                  placeholder="1"
                  min={1}
                  className={INPUT}
                />
              </FormField>
              <FormField label="Placeholder">
                <Input
                  type="text"
                  value={vehicleFieldForm.placeholder}
                  onChange={(event) => handleVehicleFieldChange('placeholder', event.target.value)}
                  placeholder="Input placeholder"
                  className={INPUT}
                />
              </FormField>
              <FormField label="Help text">
                <Input
                  type="text"
                  value={vehicleFieldForm.help_text}
                  onChange={(event) => handleVehicleFieldChange('help_text', event.target.value)}
                  placeholder="Optional helper text below the field"
                  className={INPUT}
                />
              </FormField>
              <FormField label="Options" hint="Comma separated values">
                <Input
                  type="text"
                  value={vehicleFieldForm.options_text}
                  onChange={(event) => handleVehicleFieldChange('options_text', event.target.value)}
                  placeholder="Comma separated values"
                  className={INPUT}
                />
              </FormField>
            </Card>

            <Card className="mb-4 gap-3">
              <SectionTitle>Behaviour</SectionTitle>
              {toggleRow('Editable', vehicleFieldForm.is_editable, (v) => handleVehicleFieldChange('is_editable', v))}
              {toggleRow('Required', vehicleFieldForm.is_required, (v) => handleVehicleFieldChange('is_required', v), true)}
              {toggleRow('Active', vehicleFieldForm.active, (v) => handleVehicleFieldChange('active', v))}
              {selectedVehicleField ? (
                <P className="text-sm text-slate-500">
                  Default mapping: {selectedVehicleField.label} will be shown in the {selectedVehicleField.field_group || 'selected'} group.
                </P>
              ) : isCustomVehicleField ? (
                <P className="text-sm text-slate-500">
                  Custom fields are saved as dynamic vehicle-step data and appear in the Additional Details section for the selected account type.
                </P>
              ) : null}
            </Card>
          </>
        ) : (
          <>
            <Card className="mb-4 gap-4">
              <SectionTitle>Document</SectionTitle>
              {pair(
                <FormField key="dn" label="Document name" required className="flex-1">
                  <Input
                    type="text"
                    value={documentForm.name}
                    onChange={(event) => handleDocumentChange('name', event.target.value)}
                    placeholder="Enter name"
                    className={INPUT}
                    required
                  />
                </FormField>,
                <FormField key="dat" label="Account type" required className="flex-1">
                  <Select
                    value={documentForm.account_type}
                    onChange={(event) => handleDocumentChange('account_type', event.target.value)}
                    className={INPUT}
                    required
                  >
                    <Option value="" disabled>
                      Select account type
                    </Option>
                    {accountTypeOptions.map((option) => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </FormField>,
              )}
              <FormField label="Verification mapping" hint="Pick a mapping so the driver app shows the matching verify action">
                <Select
                  value={documentForm.verification_type}
                  onChange={(event) => handleDocumentChange('verification_type', event.target.value)}
                  className={INPUT}
                >
                  {verificationTypeOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </FormField>
              {pair(
                <FormField key="hed" label="Has expiry date" required className="flex-1">
                  <Select
                    value={documentForm.has_expiry_date}
                    onChange={(event) => handleDocumentChange('has_expiry_date', event.target.value)}
                    className={INPUT}
                    required
                  >
                    <Option value="" disabled>
                      Select expiry requirement
                    </Option>
                    {yesNoOptions.map((option) => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </FormField>,
                <FormField key="it" label="Image type" required className="flex-1">
                  <Select
                    value={documentForm.image_type}
                    onChange={(event) => handleDocumentChange('image_type', event.target.value)}
                    className={INPUT}
                    required
                  >
                    <Option value="" disabled>
                      Select image type
                    </Option>
                    {imageTypeOptions.map((option) => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </FormField>,
              )}
              {pair(
                <FormField key="hin" label="Has identify number" required className="flex-1">
                  <Select
                    value={documentForm.has_identify_number}
                    onChange={(event) => handleDocumentChange('has_identify_number', event.target.value)}
                    className={INPUT}
                    required
                  >
                    <Option value="" disabled>
                      Select identity number requirement
                    </Option>
                    {yesNoOptions.map((option) => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </FormField>,
                documentForm.has_identify_number === '1' ? (
                  <FormField key="ink" label="Identify number key" className="flex-1">
                    <Input
                      type="text"
                      value={documentForm.identify_number_key}
                      onChange={(event) => handleDocumentChange('identify_number_key', event.target.value)}
                      placeholder="Enter identify number key"
                      className={INPUT}
                    />
                  </FormField>
                ) : (
                  <Div key="spacer2" className="flex-1" />
                ),
              )}
            </Card>

            <Card className="mb-4 gap-3">
              <SectionTitle>Behaviour</SectionTitle>
              {toggleRow('Editable', documentForm.is_editable, (v) => handleDocumentChange('is_editable', v))}
              {toggleRow('Required', documentForm.is_required, (v) => handleDocumentChange('is_required', v), true)}
              {toggleRow('Active', documentForm.active, (v) => handleDocumentChange('active', v))}
              <P className="text-sm text-slate-500">
                When required is enabled, this document must be completed in the signup flow before registration can finish.
              </P>
            </Card>
          </>
        )}

        {error ? (
          <Card className="mb-4">
            <P className="text-sm text-red-600">{error}</P>
          </Card>
        ) : null}

        <Card>
          <Button type="submit" disabled={submitting} className={`${BTN_PRIMARY} ${submitting ? 'opacity-60' : ''}`}>
            <UiIcon as={Save} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>{submitting ? 'Saving…' : 'Save'}</Span>
          </Button>
        </Card>
      </Form>
    </AdminPage>
  );
};
export default DriverDocumentForm;
