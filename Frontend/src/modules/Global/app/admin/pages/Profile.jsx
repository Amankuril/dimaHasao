/**
 * The admin's own account.
 *
 * There was no such screen before — an admin could not see or change their own
 * name, and hotel had a second `update-profile` endpoint for the same record.
 * Access level and module scope are deliberately read-only here: raising your
 * own level is what the Administrators screen is for, and only a platform
 * superadmin may do it.
 */
import React, { useEffect, useState } from 'react';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import globalService from '../../../services/globalService';

const field =
  'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] focus:ring-4 focus:ring-[#0a4d2b]/10 transition disabled:bg-gray-50 disabled:text-gray-500';
const label = 'block text-[13px] font-semibold text-gray-700 mb-1.5';

const LEVEL_LABELS = {
  platform_superadmin: 'Platform superadmin — every module',
  food_superadmin: 'Food superadmin',
  taxi_superadmin: 'Taxi superadmin',
  tours_superadmin: 'Tours superadmin',
  hotel_superadmin: 'Hotel superadmin',
  subadmin: 'Subadmin',
};

const Profile = () => {
  const [admin, setAdmin] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    globalService
      .getMyProfile()
      .then(({ admin: me }) => {
        setAdmin(me);
        setForm({ name: me.name || '', email: me.email || '', phone: me.phone || '' });
      })
      .catch((error) => toast.error(error.message || 'Failed to load your profile'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (event) => setForm((c) => ({ ...c, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.email.trim()) return toast.error('Email is required — it is your sign-in');

    try {
      setSaving(true);
      const result = await globalService.updateMyProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setAdmin(result.admin);
      toast.success(result.message || 'Profile saved');
    } catch (error) {
      toast.error(error.message || 'Could not save your profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-400"><Loader2 size={22} className="animate-spin inline" /></div>;
  }

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
        <p className="text-gray-500 text-sm mt-0.5">Your administrator account, shared across every module.</p>
      </div>

      {admin && (
        <div className="bg-[#0a4d2b]/5 border border-[#0a4d2b]/15 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck size={18} className="text-[#0a4d2b] mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-bold text-gray-900">
              {LEVEL_LABELS[admin.adminLevel] || admin.adminLevel}
            </p>
            <p className="text-gray-600 mt-0.5">
              {admin.servicesAccess?.length
                ? `Modules: ${admin.servicesAccess.join(', ')}`
                : 'No module restriction'}
              {admin.module ? ` · scoped to ${admin.module}` : ''}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Only a platform superadmin can change an access level.
            </p>
          </div>
        </div>
      )}

      <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <h3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100">Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="admin-name">Name</label>
            <input id="admin-name" className={field} value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className={label} htmlFor="admin-phone">Phone</label>
            <input id="admin-phone" className={field} value={form.phone} onChange={set('phone')} />
          </div>
        </div>

        <div>
          <label className={label} htmlFor="admin-email">Email <span className="text-red-500">*</span></label>
          <input id="admin-email" className={field} type="email" value={form.email} onChange={set('email')} />
          <p className="text-xs text-gray-400 mt-1.5">This is what you sign in with.</p>
        </div>
      </section>

      <button type="submit" disabled={saving}
        className="flex items-center gap-2 px-6 py-3 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e] disabled:opacity-60">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save changes
      </button>
    </form>
  );
};

export default Profile;
