/* Ported from Frontend/src/modules/Tours/app/admin/pages/Settings.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, Loader2, Percent, Save } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner } from '../components/ui';
import { toast } from '../../../../lib/notify';
import { Button, Div, Form, H3, Input, Label, P, Section, Span, Strong, Textarea, Icon as UiIcon, ScrollDiv } from '../../../../components/web';
const field = 'px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] transition';
const label = 'block text-[13px] font-semibold text-gray-700 mb-1.5';
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
  if (loading) return <Spinner />;
  if (!settings) return null;
  const set = (key) => (e) =>
    setSettings((c) => ({
      ...c,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));
  return (
    <ScrollDiv className="p-4 pb-20">
      <Form onSubmit={save} className="space-y-6">
        <PageHeader title="Tours Settings" subtitle="Rates and the booking kill switch for this module only." />

        <Div
          className={`flex items-center gap-3 p-4 rounded-2xl border ${settings.platformOpen ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-700'}`}
        >
          {settings.platformOpen ? <UiIcon as={CircleCheck} size={20} className="shrink-0" /> : <UiIcon as={CircleAlert} size={20} className="shrink-0" />}
          <Div>
            <P className="text-sm font-bold">{settings.platformOpen ? 'Accepting bookings' : 'Bookings paused'}</P>
            <P className="text-xs opacity-80">
              {settings.platformOpen ? 'Travellers can book any published tour right now.' : 'No new tour bookings can be made anywhere in the app.'}
            </P>
          </Div>
        </Div>

        <Section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <H3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100 flex items-center gap-2">
            <UiIcon as={Percent} size={15} className="text-[#0a4d2b]" /> Tax rate
          </H3>

          <Div className="max-w-xs">
            <Label className={label}>Tax (GST) %</Label>
            <Input type="number" min="0" max="100" value={settings.taxRate} onChange={set('taxRate')} className={field} />
            <P className="text-xs text-gray-400 mt-1.5">
              Charged on the full trip value, not on the advance. Defaults to 5% to match the approved booking screen.
            </P>
          </Div>

          <Div className="flex items-start gap-2.5 text-sm text-gray-700 pt-2 border-t border-gray-100">
            <Input type="checkbox" checked={settings.platformOpen} onChange={set('platformOpen')} className="mt-0.5" />
            <Div className="flex-1">
              <Strong>Accepting bookings</Strong>
              <P className="text-xs text-gray-400">Turn this off to stop new tour bookings platform-wide.</P>
            </Div>
          </Div>

          {!settings.platformOpen && (
            <Div>
              <Label className={label}>Message shown to travellers</Label>
              <Textarea value={settings.bookingDisabledMessage} onChange={set('bookingDisabledMessage')} rows={2} className={field} />
            </Div>
          )}
        </Section>

        <Button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e] disabled:opacity-60"
        >
          {saving ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : <UiIcon as={Save} size={16} />} Save settings
        </Button>
      </Form>
    </ScrollDiv>
  );
};
export default Settings;
