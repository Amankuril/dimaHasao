/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/management/AdminCreate.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Loader2, Shield } from 'lucide-react-native';
import { useNavigate, useParams } from '../../../../../lib/webRouter';
import { toast } from '../../../../../lib/notify';
import { adminService } from '../../services/adminService';
import { ADMIN_PERMISSION_GROUPS } from '../../constants/adminAccess';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  LoadingState,
  ErrorState,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, Div, Form, Input, Span, Icon as UiIcon } from '../../../../../components/web';
const initialForm = {
  name: '',
  email: '',
  phone: '',
  role: 'Operations Subadmin',
  admin_type: 'subadmin',
  permissions: [],
  service_location_ids: [],
  zone_ids: [],
  password: '',
  passwordConfirmation: '',
  active: true,
};
const PermissionCheckbox = ({ checked, label, onChange }) => (
  <Button
    type="button"
    onClick={onChange}
    accessibilityLabel={label}
    className={`flex-row items-center justify-between gap-3 min-h-11 rounded-lg border px-3 py-2 ${checked ? 'border-blue-600 bg-blue-100' : 'border-slate-300 bg-white'}`}
  >
    <Span className={`text-sm font-medium flex-1 ${checked ? 'text-blue-700' : 'text-slate-700'}`}>{label}</Span>
    <Div className={`h-5 w-5 items-center justify-center rounded-full border ${checked ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
      {checked ? <UiIcon as={Check} size={12} className="text-white" /> : null}
    </Div>
  </Button>
);
const AdminCreate = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(initialForm);
  const [serviceLocations, setServiceLocations] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const { tablet } = useLayoutWidth();
  const setField = (key, value) =>
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  const load = React.useCallback(async () => {
    {
      setLoading(true);
      setLoadError(null);
      try {
        const [serviceLocationResponse, zoneResponse, adminResponse] = await Promise.all([
          adminService.getServiceLocations(),
          adminService.getZones(),
          isEdit ? adminService.getAdmins() : Promise.resolve(null),
        ]);
        const nextServiceLocations = Array.isArray(serviceLocationResponse?.data) ? serviceLocationResponse.data : serviceLocationResponse?.data?.results || [];
        const nextZones = Array.isArray(zoneResponse?.data?.results) ? zoneResponse.data.results : zoneResponse?.data?.results || [];
        setServiceLocations(nextServiceLocations);
        setZones(nextZones);
        if (isEdit) {
          const adminList = Array.isArray(adminResponse?.data?.results) ? adminResponse.data.results : [];
          const existingAdmin = adminList.find((item) => String(item.id || item._id) === String(id));
          if (!existingAdmin) {
            toast.error('Admin account not found.');
            navigate('/taxi/admin/management/admins');
            return;
          }
          setForm({
            name: existingAdmin.name || '',
            email: existingAdmin.email || '',
            phone: existingAdmin.phone || '',
            role: existingAdmin.role || 'Operations Subadmin',
            admin_type: existingAdmin.admin_type || 'subadmin',
            permissions: Array.isArray(existingAdmin.permissions) ? existingAdmin.permissions.filter((item) => item !== '*') : [],
            service_location_ids: Array.isArray(existingAdmin.service_location_ids) ? existingAdmin.service_location_ids : [],
            zone_ids: Array.isArray(existingAdmin.zone_ids) ? existingAdmin.zone_ids : [],
            password: '',
            passwordConfirmation: '',
            active: existingAdmin.active !== false,
          });
        }
      } catch (error) {
        setLoadError(error?.response?.data?.message || error?.message || 'Unable to load admin setup data.');
        toast.error(error?.response?.data?.message || error?.message || 'Unable to load admin setup data.');
      } finally {
        setLoading(false);
      }
    }
  }, [id, isEdit, navigate]);
  useEffect(() => {
    load();
  }, [load]);
  const visibleZones = useMemo(() => {
    if (form.admin_type === 'superadmin') {
      return zones;
    }
    const serviceLocationSet = new Set((form.service_location_ids || []).map(String));
    return zones.filter((zone) => serviceLocationSet.has(String(zone.service_location_id || '')));
  }, [form.admin_type, form.service_location_ids, zones]);
  useEffect(() => {
    if (form.admin_type === 'superadmin') {
      if (form.permissions.length > 0 || form.service_location_ids.length > 0 || form.zone_ids.length > 0) {
        setForm((current) => ({
          ...current,
          permissions: [],
          service_location_ids: [],
          zone_ids: [],
        }));
      }
      return;
    }
    const allowedZoneIds = new Set(visibleZones.map((zone) => String(zone.id || zone._id || '')));
    setForm((current) => ({
      ...current,
      zone_ids: current.zone_ids.filter((zoneId) => allowedZoneIds.has(String(zoneId))),
    }));
  }, [form.admin_type, form.permissions.length, form.service_location_ids.length, form.zone_ids.length, visibleZones]);
  const handlePermissionToggle = (permission) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission) ? current.permissions.filter((item) => item !== permission) : [...current.permissions, permission],
    }));
  };
  const handleMultiSelect = (key, value) => {
    setForm((current) => {
      const currentValues = Array.isArray(current[key]) ? current[key] : [];
      return {
        ...current,
        [key]: currentValues.includes(value) ? currentValues.filter((item) => item !== value) : [...currentValues, value],
      };
    });
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    if (!isEdit && !form.password.trim()) {
      toast.error('Password is required for new admins.');
      return;
    }
    if (form.password || form.passwordConfirmation) {
      if (form.password !== form.passwordConfirmation) {
        toast.error('Passwords do not match.');
        return;
      }
    }
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.admin_type === 'superadmin' ? 'superadmin' : form.role.trim(),
      admin_type: form.admin_type,
      permissions: form.admin_type === 'superadmin' ? [] : form.permissions,
      service_location_ids: form.admin_type === 'superadmin' ? [] : form.service_location_ids,
      zone_ids: form.admin_type === 'superadmin' ? [] : form.zone_ids,
      active: form.active,
      status: form.active ? 'active' : 'inactive',
      password: form.password,
      passwordConfirmation: form.passwordConfirmation,
      password_confirmation: form.passwordConfirmation,
    };
    setSaving(true);
    try {
      if (isEdit) {
        await adminService.updateAdminAccount(id, payload);
        toast.success('Admin account updated.');
      } else {
        await adminService.createAdminAccount(payload);
        toast.success('Subadmin created.');
      }
      navigate('/taxi/admin/management/admins');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to save admin account.');
    } finally {
      setSaving(false);
    }
  };
  const header = (
    <PageHeader
      icon={Shield}
      title={isEdit ? 'Update scoped access' : 'Create scoped subadmin'}
      subtitle="Assign module access first, then limit the account to the right service locations and zones."
      breadcrumb={[{ label: 'Admin management' }, { label: isEdit ? 'Edit admin' : 'Create subadmin' }]}
      actions={
        <Button type="button" onClick={() => navigate('/taxi/admin/management/admins')} className={BTN_SECONDARY}>
          <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
          <Span className={BTN_TEXT_SECONDARY}>Back to admins</Span>
        </Button>
      }
    />
  );
  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <LoadingState label="Preparing access form…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <ErrorState title="Could not load the admin setup" message={loadError} onRetry={load} />
      </AdminPage>
    );
  }
  const half = tablet ? 'flex-1' : '';
  const grid = tablet ? 'grid grid-cols-2 gap-3' : 'gap-3';
  return (
    <AdminPage maxWidth={720}>
      {header}

      <Form onSubmit={handleSubmit}>
        <Card className="mb-4 gap-4">
          <SectionTitle className="mb-0">Identity</SectionTitle>

          <Field label="Admin type" hint="Who will use this access profile.">
            <Div className="flex-row gap-2">
              {[
                {
                  key: 'superadmin',
                  label: 'Superadmin',
                },
                {
                  key: 'subadmin',
                  label: 'Subadmin',
                },
              ].map((option) => (
                <Button
                  key={option.key}
                  type="button"
                  onClick={() => setField('admin_type', option.key)}
                  className={`flex-1 h-11 rounded-lg border items-center justify-center ${
                    form.admin_type === option.key ? 'border-blue-600 bg-blue-100' : 'border-slate-300 bg-white'
                  }`}
                >
                  <Span className={`text-sm font-semibold ${form.admin_type === option.key ? 'text-blue-700' : 'text-slate-700'}`}>{option.label}</Span>
                </Button>
              ))}
            </Div>
          </Field>

          <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
            <Field label="Name" required className={half}>
              <Input value={form.name} onChange={(event) => setField('name', event.target.value)} className={INPUT} />
            </Field>
            <Field label="Email" required className={half}>
              <Input value={form.email} onChange={(event) => setField('email', event.target.value)} className={INPUT} />
            </Field>
          </Div>

          <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
            <Field label="Phone" className={half}>
              <Input value={form.phone} onChange={(event) => setField('phone', event.target.value)} className={INPUT} />
            </Field>
            <Field label="Role label" className={half}>
              <Input value={form.role} onChange={(event) => setField('role', event.target.value)} className={INPUT} />
            </Field>
          </Div>

          <Field label="Account status">
            <Button
              type="button"
              onClick={() => setField('active', !form.active)}
              className={`flex-row items-center justify-between min-h-11 rounded-lg border px-3 ${
                form.active ? 'border-green-200 bg-green-100' : 'border-red-200 bg-red-100'
              }`}
            >
              <Span className={`text-sm font-medium ${form.active ? 'text-green-700' : 'text-red-700'}`}>
                {form.active ? 'Active account' : 'Inactive account'}
              </Span>
              <Span className={`text-xs font-semibold ${form.active ? 'text-green-700' : 'text-red-700'}`}>{form.active ? 'Enabled' : 'Disabled'}</Span>
            </Button>
          </Field>
        </Card>

        <Card className="mb-4 gap-4">
          <SectionTitle className="mb-0">Credentials</SectionTitle>
          <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
            <Field
              label="Password"
              required={!isEdit}
              hint={isEdit ? 'Leave blank to keep the current password.' : 'Set the initial login password.'}
              className={half}
            >
              <Input type="password" value={form.password} onChange={(event) => setField('password', event.target.value)} className={INPUT} />
            </Field>
            <Field label="Confirm password" required={!isEdit} className={half}>
              <Input
                type="password"
                value={form.passwordConfirmation}
                onChange={(event) => setField('passwordConfirmation', event.target.value)}
                className={INPUT}
              />
            </Field>
          </Div>
        </Card>

        <Card className="mb-4 gap-4">
          <SectionTitle className="mb-0">Sidebar permissions</SectionTitle>
          {form.admin_type === 'superadmin' ? (
            <Div className="rounded-lg border border-amber-200 bg-amber-100 px-3 py-3">
              <Span className="text-sm text-amber-700">Superadmin inherits all sidebar menus and API permissions automatically.</Span>
            </Div>
          ) : (
            <Div className="gap-4">
              <Span className="text-sm text-slate-500">Choose which menu groups and modules the admin can access.</Span>
              {ADMIN_PERMISSION_GROUPS.map((group) => (
                <Div key={group.title} className="gap-2">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.title}</Span>
                  <Div className={grid}>
                    {group.items.map((permission) => (
                      <PermissionCheckbox
                        key={permission.key}
                        checked={form.permissions.includes(permission.key)}
                        label={permission.label}
                        onChange={() => handlePermissionToggle(permission.key)}
                      />
                    ))}
                  </Div>
                </Div>
              ))}
            </Div>
          )}
        </Card>

        <Card className="mb-4 gap-4">
          <SectionTitle className="mb-0">Service location scope</SectionTitle>
          {form.admin_type === 'superadmin' ? (
            <Div className="rounded-lg border border-blue-200 bg-blue-100 px-3 py-3">
              <Span className="text-sm text-blue-700">Superadmin scope stays global, so no location or zone limits are applied.</Span>
            </Div>
          ) : (
            <Div className="gap-4">
              <Span className="text-sm text-slate-500">Subadmins only see records inside the locations and zones selected here.</Span>
              <Div className="gap-2">
                <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned service locations</Span>
                <Div className={grid}>
                  {serviceLocations.map((location) => {
                    const value = String(location._id || location.id || '');
                    const checked = form.service_location_ids.includes(value);
                    return (
                      <PermissionCheckbox
                        key={value}
                        checked={checked}
                        label={`${location.service_location_name || location.name} ${location.country ? `• ${location.country}` : ''}`}
                        onChange={() => handleMultiSelect('service_location_ids', value)}
                      />
                    );
                  })}
                </Div>
              </Div>

              <Div className="gap-2">
                <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned zones</Span>
                {visibleZones.length === 0 ? (
                  <Span className="text-sm text-slate-500">Select service locations first to unlock matching zones.</Span>
                ) : (
                  <Div className={grid}>
                    {visibleZones.map((zone) => {
                      const value = String(zone._id || zone.id || '');
                      const checked = form.zone_ids.includes(value);
                      return (
                        <PermissionCheckbox
                          key={value}
                          checked={checked}
                          label={zone.name || 'Unnamed Zone'}
                          onChange={() => handleMultiSelect('zone_ids', value)}
                        />
                      );
                    })}
                  </Div>
                )}
              </Div>
            </Div>
          )}
        </Card>

        <Card className="gap-2">
          <Button type="submit" disabled={saving} className={`${BTN_PRIMARY} ${saving ? 'opacity-70' : ''}`}>
            {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
            <Span className={BTN_TEXT_PRIMARY}>{isEdit ? 'Update admin access' : 'Create admin access'}</Span>
          </Button>
          <Button type="button" onClick={() => navigate('/taxi/admin/management/admins')} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
          </Button>
        </Card>
      </Form>
    </AdminPage>
  );
};
export default AdminCreate;
