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
import {
  AdminPage,
  BTN_PRIMARY,
  BTN_TEXT_PRIMARY,
  Card,
  ErrorState,
  Field,
  INPUT,
  LoadingState,
  PageHeader,
  SectionTitle,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Form, Input, P, Span, Icon as UiIcon } from '../../../../components/web';
const LEVEL_LABELS = {
  platform_superadmin: 'Platform superadmin — every module',
  food_superadmin: 'Food superadmin',
  taxi_superadmin: 'Taxi superadmin',
  tours_superadmin: 'Tours superadmin',
  hotel_superadmin: 'Hotel superadmin',
  subadmin: 'Subadmin',
};
const Profile = () => {
  const { tablet } = useLayoutWidth();
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
  const header = <PageHeader title="My Profile" subtitle="Your administrator account, shared across every module." icon={ShieldCheck} />;
  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <LoadingState label="Loading your profile…" />
      </AdminPage>
    );
  }
  if (!admin) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <ErrorState title="Your profile could not be loaded" message="Reopen this screen to try again." />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={720}>
      <Form onSubmit={submit}>
        {header}

        <Card className="mb-4 flex-row items-start gap-3">
          <UiIcon as={ShieldCheck} size={18} className="text-blue-600 shrink-0" />
          <Div className="flex-1 min-w-0">
            <P className="text-sm font-semibold text-slate-900">{LEVEL_LABELS[admin.adminLevel] || admin.adminLevel}</P>
            <P className="text-sm text-slate-600 mt-0.5">
              {admin.servicesAccess?.length ? `Modules: ${admin.servicesAccess.join(', ')}` : 'No module restriction'}
              {admin.module ? ` · scoped to ${admin.module}` : ''}
            </P>
            <P className="text-xs text-slate-500 mt-1">Only a platform superadmin can change an access level.</P>
          </Div>
        </Card>

        <Card className="mb-4 gap-4">
          <SectionTitle>Details</SectionTitle>

          <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
            <Field label="Name">
              <Input nativeID="admin-name" className={INPUT} value={form.name} onChange={set('name')} />
            </Field>
            <Field label="Phone">
              <Input nativeID="admin-phone" className={INPUT} value={form.phone} onChange={set('phone')} />
            </Field>
          </Div>

          <Field label="Email" required hint="This is what you sign in with.">
            <Input nativeID="admin-email" className={INPUT} type="email" value={form.email} onChange={set('email')} />
          </Field>
        </Card>

        <Button type="submit" disabled={saving} className={BTN_PRIMARY}>
          {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : <UiIcon as={Save} size={16} className="text-white" />}
          <Span className={BTN_TEXT_PRIMARY}>Save changes</Span>
        </Button>
      </Form>
    </AdminPage>
  );
};
export default Profile;
