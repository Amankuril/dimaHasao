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
import { Button, Div, Form, H2, H3, Input, Label, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
const field =
  'px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] transition';
const label = 'block text-[13px] font-semibold text-gray-700 mb-1.5';
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
  if (denied) {
    return (
      <ScrollDiv className="p-4 pb-20 bg-white p-10 rounded-2xl border border-gray-200 text-center max-w-lg mx-auto">
        <UiIcon as={ShieldCheck} size={28} className="text-amber-500 mx-auto mb-3" />
        <H3 className="font-bold text-gray-900">Only a platform superadmin can manage administrators</H3>
        <P className="text-sm text-gray-500 mt-1.5">Your account administers its own modules. Ask a platform superadmin for changes here.</P>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="p-4 pb-20 space-y-5">
      <Div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Div>
          <H2 className="text-2xl font-bold text-gray-900">Administrators</H2>
          <P className="text-gray-500 text-sm mt-0.5">An access level decides which module tabs an admin sees.</P>
        </Div>
        <Button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e]"
        >
          {showForm ? <UiIcon as={X} size={16} /> : <UiIcon as={Plus} size={16} />}
          {showForm ? 'Cancel' : 'Add an administrator'}
        </Button>
      </Div>

      {showForm && (
        <Form onSubmit={submit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Div>
              <Label className={label}>Name</Label>
              <Input className={field} value={form.name} onChange={set('name')} />
            </Div>
            <Div>
              <Label className={label}>
                Email <Span className="text-red-500">*</Span>
              </Label>
              <Input className={field} type="email" value={form.email} onChange={set('email')} />
            </Div>
            <Div>
              <Label className={label}>Phone</Label>
              <Input className={field} value={form.phone} onChange={set('phone')} />
            </Div>
            <Div>
              <Label className={label}>
                Password <Span className="text-red-500">*</Span>
              </Label>
              <Input className={field} type="password" value={form.password} onChange={set('password')} />
              <P className="text-xs text-gray-400 mt-1.5">At least 8 characters.</P>
            </Div>
          </Div>

          <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Div>
              <Label className={label}>Access level</Label>
              <Select className={field} value={form.adminLevel} onChange={set('adminLevel')}>
                {(meta.levels.length ? meta.levels : Object.keys(LEVEL_LABELS)).map((l) => (
                  <Option key={l} value={l}>
                    {LEVEL_LABELS[l] || l}
                  </Option>
                ))}
              </Select>
            </Div>
            <Div>
              <Label className={label}>Module {form.adminLevel === 'subadmin' && <Span className="text-red-500">*</Span>}</Label>
              <Select className={field} value={form.module} onChange={set('module')}>
                <Option value="">Not scoped to one module</Option>
                {meta.modules.map((m) => (
                  <Option key={m} value={m}>
                    {m}
                  </Option>
                ))}
              </Select>
            </Div>
          </Div>

          <Div>
            <Label className={label}>Modules they may reach</Label>
            <Div className="flex flex-wrap gap-2">
              {meta.modules.map((m) => (
                <Button
                  key={m}
                  type="button"
                  onClick={() => toggleService(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${form.servicesAccess.includes(m) ? 'bg-[#0a4d2b] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {m}
                </Button>
              ))}
            </Div>
            <P className="text-xs text-gray-400 mt-1.5">Leave every module unselected only for a platform superadmin.</P>
          </Div>

          {form.adminLevel === 'subadmin' && (
            <Div>
              <Label className={label}>What they may do</Label>
              <P className="text-xs text-gray-400 mb-3">Ticking anything grants View too — a row they can change but never open is no use.</P>
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
            </Div>
          )}

          <Button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e] disabled:opacity-60"
          >
            {saving && <UiIcon as={Loader2} size={16} className="animate-spin" />} Create administrator
          </Button>
        </Form>
      )}

      {loading ? (
        <Div className="p-12 text-center text-gray-400">
          <UiIcon as={Loader2} size={22} className="animate-spin inline" />
        </Div>
      ) : (
        <Div className="space-y-3">
          {administrators.map((admin) => (
            <Div key={admin._id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
              <Div className="flex-1 basis-56 min-w-0">
                <Div className="flex flex-wrap items-center gap-2">
                  <P className="font-bold text-gray-900">{admin.name || admin.email}</P>
                  <Span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#0a4d2b]/10 text-[#0a4d2b]">
                    {LEVEL_LABELS[admin.adminLevel] || admin.adminLevel}
                  </Span>
                  {admin.isActive === false && <Span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700">deactivated</Span>}
                </Div>
                <P className="text-xs text-gray-500 mt-1">{admin.email}</P>
                <P className="text-xs text-gray-400 mt-0.5">
                  {admin.servicesAccess?.length ? admin.servicesAccess.join(' · ') : 'every module'}
                  {admin.module ? ` · scoped to ${admin.module}` : ''}
                </P>
              </Div>

              {admin.adminLevel === 'subadmin' && (
                <Button
                  type="button"
                  onClick={() => {
                    setEditing(editing === admin._id ? null : admin._id);
                    setEditGrants(admin.featurePermissions || {});
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 shrink-0"
                >
                  {editing === admin._id ? 'Close' : 'Permissions'}
                </Button>
              )}

              <Div className="flex items-center gap-2 text-xs font-bold text-gray-600 shrink-0">
                <Input
                  type="checkbox"
                  checked={admin.isActive !== false}
                  disabled={busyId === admin._id}
                  onChange={(e) => setActive(admin, e.target.checked)}
                />
                Active
              </Div>

              {editing === admin._id && (
                <Div className="w-full pt-4 mt-1 border-t border-gray-100 space-y-4">
                  <FeaturePermissionMatrix
                    catalogue={meta.features}
                    actions={meta.featureActions}
                    modules={admin.servicesAccess || []}
                    value={editGrants}
                    onChange={setEditGrants}
                  />
                  <Button
                    type="button"
                    disabled={busyId === admin._id}
                    onClick={() => saveGrants(admin)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm disabled:opacity-60"
                  >
                    {busyId === admin._id && <UiIcon as={Loader2} size={15} className="animate-spin" />}
                    Save permissions
                  </Button>
                </Div>
              )}
            </Div>
          ))}
        </Div>
      )}
    </ScrollDiv>
  );
};
export default Administrators;
