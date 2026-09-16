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
import { Loader2, Plus, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';

import globalService from '../../../services/globalService';

const field =
  'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] focus:ring-4 focus:ring-[#0a4d2b]/10 transition';
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
  name: '', email: '', phone: '', password: '',
  adminLevel: 'subadmin', module: '', servicesAccess: [],
};

const Administrators = () => {
  const [administrators, setAdministrators] = useState([]);
  const [meta, setMeta] = useState({ levels: [], modules: [] });
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
        globalService.getMeta().catch(() => ({ levels: [], modules: [] })),
      ]);
      setAdministrators(list.administrators || []);
      setMeta({ levels: vocabulary.levels || [], modules: vocabulary.modules || [] });
    } catch (error) {
      if (error.status === 403) setDenied(true);
      else toast.error(error.message || 'Failed to load administrators');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key) => (event) => setForm((c) => ({ ...c, [key]: event.target.value }));

  const toggleService = (service) =>
    setForm((c) => ({
      ...c,
      servicesAccess: c.servicesAccess.includes(service)
        ? c.servicesAccess.filter((s) => s !== service)
        : [...c.servicesAccess, service],
    }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.email.trim()) return toast.error('Email is required');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    if (form.adminLevel === 'subadmin' && !form.module) {
      return toast.error('A subadmin needs a module');
    }

    try {
      setSaving(true);
      const result = await globalService.createAdministrator({
        ...form,
        email: form.email.trim().toLowerCase(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        module: form.module || undefined,
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
      await globalService.updateAdministrator(admin._id, { isActive });
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this administrator');
    } finally {
      setBusyId(null);
    }
  };

  if (denied) {
    return (
      <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center max-w-lg mx-auto">
        <ShieldCheck size={28} className="text-amber-500 mx-auto mb-3" />
        <h3 className="font-bold text-gray-900">Only a platform superadmin can manage administrators</h3>
        <p className="text-sm text-gray-500 mt-1.5">
          Your account administers its own modules. Ask a platform superadmin for changes here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Administrators</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            An access level decides which module tabs an admin sees.
          </p>
        </div>
        <button type="button" onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e]">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Add an administrator'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={label}>Name</label>
              <input className={field} value={form.name} onChange={set('name')} /></div>
            <div><label className={label}>Email <span className="text-red-500">*</span></label>
              <input className={field} type="email" value={form.email} onChange={set('email')} /></div>
            <div><label className={label}>Phone</label>
              <input className={field} value={form.phone} onChange={set('phone')} /></div>
            <div><label className={label}>Password <span className="text-red-500">*</span></label>
              <input className={field} type="password" value={form.password} onChange={set('password')} />
              <p className="text-xs text-gray-400 mt-1.5">At least 8 characters.</p></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={label}>Access level</label>
              <select className={field} value={form.adminLevel} onChange={set('adminLevel')}>
                {(meta.levels.length ? meta.levels : Object.keys(LEVEL_LABELS)).map((l) => (
                  <option key={l} value={l}>{LEVEL_LABELS[l] || l}</option>
                ))}
              </select></div>
            <div><label className={label}>
                Module {form.adminLevel === 'subadmin' && <span className="text-red-500">*</span>}
              </label>
              <select className={field} value={form.module} onChange={set('module')}>
                <option value="">Not scoped to one module</option>
                {meta.modules.map((m) => <option key={m} value={m}>{m}</option>)}
              </select></div>
          </div>

          <div>
            <label className={label}>Modules they may reach</label>
            <div className="flex flex-wrap gap-2">
              {meta.modules.map((m) => (
                <button key={m} type="button" onClick={() => toggleService(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    form.servicesAccess.includes(m)
                      ? 'bg-[#0a4d2b] text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Leave every module unselected only for a platform superadmin.
            </p>
          </div>

          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e] disabled:opacity-60">
            {saving && <Loader2 size={16} className="animate-spin" />} Create administrator
          </button>
        </form>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-400"><Loader2 size={22} className="animate-spin inline" /></div>
      ) : (
        <div className="space-y-3">
          {administrators.map((admin) => (
            <div key={admin._id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
              <div className="flex-1 basis-56 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-gray-900">{admin.name || admin.email}</p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#0a4d2b]/10 text-[#0a4d2b]">
                    {LEVEL_LABELS[admin.adminLevel] || admin.adminLevel}
                  </span>
                  {admin.isActive === false && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700">
                      deactivated
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{admin.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {admin.servicesAccess?.length ? admin.servicesAccess.join(' · ') : 'every module'}
                  {admin.module ? ` · scoped to ${admin.module}` : ''}
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-gray-600 shrink-0">
                <input
                  type="checkbox"
                  checked={admin.isActive !== false}
                  disabled={busyId === admin._id}
                  onChange={(e) => setActive(admin, e.target.checked)}
                />
                Active
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Administrators;
