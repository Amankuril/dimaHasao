/* Ported from Frontend/src/modules/Tours/app/admin/pages/Settings.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, Loader2, Percent, Save } from 'lucide-react-native';
import adminService from '../../../services/adminService';
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
  StatusBadge,
} from '../../../../admin/ui';
import { toast } from '../../../../lib/notify';
import { Button, Div, Form, Input, P, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    adminService
      .getSettings()
      .then((d) => setSettings(d.settings))
      .catch((e) => toast.error(e.message || 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);
  const save = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const data = await adminService.updateSettings({
        platformOpen: settings.platformOpen,
        bookingDisabledMessage: settings.bookingDisabledMessage,
        taxRate: Number(settings.taxRate),
      });
      setSettings(data.settings);
      toast.success('Settings saved');
    } catch (error) {
      toast.error(error.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };
  const header = (
    <PageHeader
      title="Tours Settings"
      subtitle="Rates and the booking kill switch for this module only."
      breadcrumb={[{ label: 'Tours' }, { label: 'Settings' }]}
    />
  );
  if (loading)
    return (
      <AdminPage maxWidth={720}>
        {header}
        <LoadingState label="Loading settings…" />
      </AdminPage>
    );
  if (!settings)
    return (
      <AdminPage maxWidth={720}>
        {header}
        <ErrorState title="Settings could not be loaded" message="The tours settings did not come back. Reopen this screen to try again." />
      </AdminPage>
    );
  const set = (key) => (e) =>
    setSettings((c) => ({
      ...c,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));
  return (
    <AdminPage maxWidth={720}>
      <Form onSubmit={save}>
        {header}

        <Card className="mb-4 flex-row items-start gap-3">
          <UiIcon
            as={settings.platformOpen ? CircleCheck : CircleAlert}
            size={20}
            className={settings.platformOpen ? 'text-green-700 shrink-0' : 'text-red-700 shrink-0'}
          />
          <Div className="flex-1 min-w-0 gap-1">
            <Div className="flex-row items-center gap-2 flex-wrap">
              <P className="text-base font-semibold text-slate-900">{settings.platformOpen ? 'Accepting bookings' : 'Bookings paused'}</P>
              <StatusBadge status={settings.platformOpen ? 'active' : 'paused'} label={settings.platformOpen ? 'live' : 'paused'} />
            </Div>
            <P className="text-sm text-slate-500">
              {settings.platformOpen ? 'Travellers can book any published tour right now.' : 'No new tour bookings can be made anywhere in the app.'}
            </P>
          </Div>
        </Card>

        <Card className="mb-4 gap-4">
          <SectionTitle action={<UiIcon as={Percent} size={16} className="text-blue-600" />}>Tax rate</SectionTitle>

          <Field label="Tax (GST) %" hint="Charged on the full trip value, not on the advance. Defaults to 5% to match the approved booking screen.">
            <Input type="number" min="0" max="100" value={settings.taxRate} onChange={set('taxRate')} className={INPUT} />
          </Field>

          <Div className="flex-row items-start gap-3 pt-3 border-t border-slate-100">
            <Input type="checkbox" className="w-5 h-5" checked={settings.platformOpen} onChange={set('platformOpen')} />
            <Div className="flex-1 min-w-0">
              <P className="text-sm font-medium text-slate-700">Accepting bookings</P>
              <P className="text-xs text-slate-500 mt-0.5">Turn this off to stop new tour bookings platform-wide.</P>
            </Div>
          </Div>

          {!settings.platformOpen && (
            <Field label="Message shown to travellers">
              <Textarea value={settings.bookingDisabledMessage} onChange={set('bookingDisabledMessage')} rows={2} className={`${INPUT} h-auto py-2.5`} />
            </Field>
          )}
        </Card>

        <Button type="submit" disabled={saving} className={BTN_PRIMARY}>
          {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : <UiIcon as={Save} size={16} className="text-white" />}
          <Span className={BTN_TEXT_PRIMARY}>Save settings</Span>
        </Button>
      </Form>
    </AdminPage>
  );
};
export default Settings;
