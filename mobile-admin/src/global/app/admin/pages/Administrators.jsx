/* Ported from Frontend/src/modules/Global/app/admin/pages/Administrators.jsx (tools/port.js first pass). */
/**
 * Who can administer the platform, and over what.
 *
 * The older sub-admin CRUD under /food/admin predates the admin hierarchy — it
 * has no notion of an access level or a module scope, so it cannot create a
 * tours or hotel superadmin. This screen speaks that vocabulary, which is what
 * decides which tabs appear in the module switcher.
 *
 * It also replaces self-serve admin signup: an administrator is created by an
 * existing platform superadmin, not by whoever finds the signup page.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, ShieldCheck, X } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import globalService from '../../../services/globalService';
import FeaturePermissionMatrix from '../components/FeaturePermissionMatrix';
import {
  AdminPage,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  Card,
  EmptyState,
  ErrorState,
  Field,
  INPUT,
  PageHeader,
  SectionTitle,
  StatusBadge,
  TableSkeleton,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Form, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';
const LEVEL_LABELS = {
  platform_superadmin: 'Platform superadmin',
  food_superadmin: 'Food superadmin',
  taxi_superadmin: 'Taxi superadmin',
  tours_superadmin: 'Tours superadmin',
  hotel_superadmin: 'Hotel superadmin',
  subadmin: 'Subadmin',
};
const BLANK = {
  name: '',
  email: '',
  phone: '',
  password: '',
  adminLevel: 'subadmin',
  module: '',
  servicesAccess: [],
  featurePermissions: {},
};
const Administrators = () => {
  const { tablet } = useLayoutWidth();
  const cols = tablet ? 2 : 1;
  const [administrators, setAdministrators] = useState([]);
  const [meta, setMeta] = useState({
    levels: [],
    modules: [],
    features: [],
    featureActions: [],
  });
  // Editing an existing sub-admin's grants, by id.
  const [editing, setEditing] = useState(null);
  const [editGrants, setEditGrants] = useState({});
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [list, vocabulary] = await Promise.all([
        globalService.getAdministrators(),
        globalService.getMeta().catch(() => ({
          levels: [],
          modules: [],
          features: [],
          featureActions: [],
        })),
      ]);
      setAdministrators(list.administrators || []);
      setMeta({
        levels: vocabulary.levels || [],
        modules: vocabulary.modules || [],
        features: vocabulary.features || [],
        featureActions: vocabulary.featureActions || ['view', 'create', 'edit', 'delete'],
      });
    } catch (error) {
      if (error.status === 403) setDenied(true);
      else toast.error(error.message || 'Failed to load administrators');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const set = (key) => (event) =>
    setForm((c) => ({
      ...c,
      [key]: event.target.value,
    }));
  const toggleService = (service) =>
    setForm((c) => {
      const has = c.servicesAccess.includes(service);
      const servicesAccess = has ? c.servicesAccess.filter((s) => s !== service) : [...c.servicesAccess, service];

      // Grants for a module that was just taken away would be stored and never
      // checked, which reads as access the admin does not have.
      const featurePermissions = has
        ? Object.fromEntries(Object.entries(c.featurePermissions).filter(([key]) => !key.startsWith(`${service}.`)))
        : c.featurePermissions;
      return {
        ...c,
        servicesAccess,
        featurePermissions,
      };
    });
  const saveGrants = async (admin) => {
    try {
      setBusyId(admin._id);
      await globalService.updateAdministrator(admin._id, {
        featurePermissions: editGrants,
      });
      toast.success('Permissions updated');
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update permissions');
    } finally {
      setBusyId(null);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!form.email.trim()) return toast.error('Email is required');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    if (form.adminLevel === 'subadmin' && form.servicesAccess.length === 0) {
      return toast.error('A subadmin needs at least one module');
    }
    try {
      setSaving(true);
      const result = await globalService.createAdministrator({
        ...form,
        email: form.email.trim().toLowerCase(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        module: form.module || undefined,
        featurePermissions: form.adminLevel === 'subadmin' ? form.featurePermissions : {},
      });
      toast.success(result.message || 'Administrator created');
      setForm(BLANK);
      setShowForm(false);
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not create this administrator');
    } finally {
      setSaving(false);
    }
  };
  const setActive = async (admin, isActive) => {
    try {
      setBusyId(admin._id);
      await globalService.updateAdministrator(admin._id, {
        isActive,
      });
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this administrator');
    } finally {
      setBusyId(null);
    }
  };
  const header = <PageHeader title="Administrators" subtitle="An access level decides which module tabs an admin sees." icon={ShieldCheck} />;
  if (denied) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <ErrorState
          title="Only a platform superadmin can manage administrators"
          message="Your account administers its own modules. Ask a platform superadmin for changes here."
        />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        title="Administrators"
        subtitle="An access level decides which module tabs an admin sees."
        icon={ShieldCheck}
        actions={
          <Button type="button" onClick={() => setShowForm((s) => !s)} className={showForm ? BTN_SECONDARY : BTN_PRIMARY}>
            <UiIcon as={showForm ? X : Plus} size={16} className={showForm ? 'text-slate-600' : 'text-white'} />
            <Span className={showForm ? BTN_TEXT_SECONDARY : BTN_TEXT_PRIMARY}>{showForm ? 'Cancel' : 'Add an administrator'}</Span>
          </Button>
        }
      />

      {showForm && (
        <Form onSubmit={submit}>
          <Card className="mb-4 gap-4">
            <SectionTitle>New administrator</SectionTitle>

            <Div className={`grid grid-cols-${cols} gap-3`}>
              <Field label="Name">
                <Input className={INPUT} value={form.name} onChange={set('name')} />
              </Field>
              <Field label="Email" required>
                <Input className={INPUT} type="email" value={form.email} onChange={set('email')} />
              </Field>
              <Field label="Phone">
                <Input className={INPUT} value={form.phone} onChange={set('phone')} />
              </Field>
              <Field label="Password" required hint="At least 8 characters.">
                <Input className={INPUT} type="password" value={form.password} onChange={set('password')} />
              </Field>
            </Div>

            <Div className={`grid grid-cols-${cols} gap-3`}>
              <Field label="Access level">
                <Select className={INPUT} value={form.adminLevel} onChange={set('adminLevel')}>
                  {(meta.levels.length ? meta.levels : Object.keys(LEVEL_LABELS)).map((l) => (
                    <Option key={l} value={l}>
                      {LEVEL_LABELS[l] || l}
                    </Option>
                  ))}
                </Select>
              </Field>
              <Field label="Module" required={form.adminLevel === 'subadmin'}>
                <Select className={INPUT} value={form.module} onChange={set('module')}>
                  <Option value="">Not scoped to one module</Option>
                  {meta.modules.map((m) => (
                    <Option key={m} value={m}>
                      {m}
                    </Option>
                  ))}
                </Select>
              </Field>
            </Div>

            <Field label="Modules they may reach" hint="Leave every module unselected only for a platform superadmin.">
              <Div className="flex-row flex-wrap gap-2">
                {meta.modules.map((m) => (
                  <Button
                    key={m}
                    type="button"
                    onClick={() => toggleService(m)}
                    className={`h-11 px-4 rounded-full items-center justify-center ${form.servicesAccess.includes(m) ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
                  >
                    <Span className={`text-sm font-semibold ${form.servicesAccess.includes(m) ? 'text-white' : 'text-slate-700'}`}>{m}</Span>
                  </Button>
                ))}
              </Div>
            </Field>

            {form.adminLevel === 'subadmin' && (
              <Field label="What they may do" hint="Ticking anything grants View too — a row they can change but never open is no use.">
                <FeaturePermissionMatrix
                  catalogue={meta.features}
                  actions={meta.featureActions}
                  modules={form.servicesAccess}
                  value={form.featurePermissions}
                  onChange={(featurePermissions) =>
                    setForm((c) => ({
                      ...c,
                      featurePermissions,
                    }))
                  }
                />
              </Field>
            )}

            <Button type="submit" disabled={saving} className={BTN_PRIMARY}>
              {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
              <Span className={BTN_TEXT_PRIMARY}>Create administrator</Span>
            </Button>
          </Card>
        </Form>
      )}

      {loading ? (
        <TableSkeleton rows={4} />
      ) : administrators.length === 0 ? (
        <EmptyState
          title="No administrators yet"
          message="Add the first administrator; an access level decides what they can reach."
          actionLabel="Add an administrator"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <Div className="gap-3">
          {administrators.map((admin) => (
            <Card key={admin._id} className="gap-3">
              <Div className="flex-row items-start gap-3">
                <Div className="flex-1 min-w-0">
                  <P className="text-base font-semibold text-slate-900" numberOfLines={2}>
                    {admin.name || admin.email}
                  </P>
                  <P className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                    {admin.email}
                  </P>
                  <P className="text-xs text-slate-500 mt-0.5" numberOfLines={2}>
                    {admin.servicesAccess?.length ? admin.servicesAccess.join(' · ') : 'every module'}
                    {admin.module ? ` · scoped to ${admin.module}` : ''}
                  </P>
                </Div>
                <Div className="flex-row items-center gap-2 shrink-0">
                  <Input
                    type="checkbox"
                    className="w-5 h-5"
                    checked={admin.isActive !== false}
                    disabled={busyId === admin._id}
                    onChange={(e) => setActive(admin, e.target.checked)}
                  />
                  <Span className="text-sm text-slate-700">Active</Span>
                </Div>
              </Div>

              <Div className="flex-row flex-wrap items-center gap-2">
                <StatusBadge status="level" tone="info" label={LEVEL_LABELS[admin.adminLevel] || admin.adminLevel} />
                {admin.isActive === false && <StatusBadge status="deactivated" label="deactivated" />}
              </Div>

              {admin.adminLevel === 'subadmin' && (
                <Div className="flex-row flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    onClick={() => {
                      setEditing(editing === admin._id ? null : admin._id);
                      setEditGrants(admin.featurePermissions || {});
                    }}
                    className={BTN_SECONDARY}
                  >
                    <Span className={BTN_TEXT_SECONDARY}>{editing === admin._id ? 'Close' : 'Permissions'}</Span>
                  </Button>
                </Div>
              )}

              {editing === admin._id && (
                <Div className="pt-3 border-t border-slate-100 gap-3">
                  <FeaturePermissionMatrix
                    catalogue={meta.features}
                    actions={meta.featureActions}
                    modules={admin.servicesAccess || []}
                    value={editGrants}
                    onChange={setEditGrants}
                  />
                  <Button type="button" disabled={busyId === admin._id} onClick={() => saveGrants(admin)} className={BTN_PRIMARY}>
                    {busyId === admin._id ? <UiIcon as={Loader2} size={15} className="text-white" /> : null}
                    <Span className={BTN_TEXT_PRIMARY}>Save permissions</Span>
                  </Button>
                </Div>
              )}
            </Card>
          ))}
        </Div>
      )}
    </AdminPage>
  );
};
export default Administrators;
