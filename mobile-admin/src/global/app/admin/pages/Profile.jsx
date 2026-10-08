/* Ported from Frontend/src/modules/Global/app/admin/pages/Profile.jsx (tools/port.js first pass). */
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
import { Loader2, Save, ShieldCheck } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import globalService from '../../../services/globalService';
import { Button, Div, Form, H2, H3, Input, Label, P, ScrollDiv, Section, Span, Icon as UiIcon } from '../../../../components/web';
const field =
  'px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] transition disabled:bg-gray-50 disabled:text-gray-500';
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
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    globalService
      .getMyProfile()
      .then(({ admin: me }) => {
        setAdmin(me);
        setForm({
          name: me.name || '',
          email: me.email || '',
          phone: me.phone || '',
        });
      })
      .catch((error) => toast.error(error.message || 'Failed to load your profile'))
      .finally(() => setLoading(false));
  }, []);
  const set = (key) => (event) =>
    setForm((c) => ({
      ...c,
      [key]: event.target.value,
    }));
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
    return (
      <ScrollDiv className="p-4 pb-20">
        <Div className="p-12 items-center">
          <UiIcon as={Loader2} size={22} className="animate-spin inline" />
        </Div>
      </ScrollDiv>
    );
  }
  return (
    // The web's page padding comes from the panel's <main className="p-4 pb-20">; here each page carries it.
    <ScrollDiv className="p-4 pb-20">
      <Form onSubmit={submit} className="space-y-6 max-w-3xl">
        <Div>
          <H2 className="text-2xl font-bold text-gray-900">My Profile</H2>
          <P className="text-gray-500 text-sm mt-0.5">Your administrator account, shared across every module.</P>
        </Div>

        {admin && (
          <Div className="bg-[#0a4d2b]/5 border border-[#0a4d2b]/15 rounded-2xl p-4 flex items-start gap-3">
            <UiIcon as={ShieldCheck} size={18} className="text-[#0a4d2b] mt-0.5 shrink-0" />
            <Div className="text-sm">
              <P className="font-bold text-gray-900">{LEVEL_LABELS[admin.adminLevel] || admin.adminLevel}</P>
              <P className="text-gray-600 mt-0.5">
                {admin.servicesAccess?.length ? `Modules: ${admin.servicesAccess.join(', ')}` : 'No module restriction'}
                {admin.module ? ` · scoped to ${admin.module}` : ''}
              </P>
              <P className="text-xs text-gray-400 mt-1">Only a platform superadmin can change an access level.</P>
            </Div>
          </Div>
        )}

        <Section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <H3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100">Details</H3>

          <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Div>
              <Label className={label}>Name</Label>
              <Input nativeID="admin-name" className={field} value={form.name} onChange={set('name')} />
            </Div>
            <Div>
              <Label className={label}>Phone</Label>
              <Input nativeID="admin-phone" className={field} value={form.phone} onChange={set('phone')} />
            </Div>
          </Div>

          <Div>
            <Label className={label}>
              Email <Span className="text-red-500">*</Span>
            </Label>
            <Input nativeID="admin-email" className={field} type="email" value={form.email} onChange={set('email')} />
            <P className="text-xs text-gray-400 mt-1.5">This is what you sign in with.</P>
          </Div>
        </Section>

        <Button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e] disabled:opacity-60"
        >
          {saving ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : <UiIcon as={Save} size={16} />} Save changes
        </Button>
      </Form>
    </ScrollDiv>
  );
};
export default Profile;
