/* Ported from Frontend/src/modules/Global/app/admin/pages/BrandSettings.jsx (tools/port.js first pass). */
/**
 * The district's name, mark and contact details — set once, used everywhere.
 *
 * These lived in three module settings screens (food's business settings,
 * taxi's admin business settings, hotel's platform settings), so renaming the
 * district or changing the support number meant finding all three, and the
 * apps disagreed with each other until somebody did.
 *
 * Every sign-in and OTP screen reads this, along with the Privacy / Terms /
 * Support links published on the Legal & Policies page next door.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import globalService from '../../../services/globalService';
import { refreshPlatformSettings } from '../../../../shared/hooks/usePlatformSettings';
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
import { Button, Div, Form, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';
/** Icons the customer app can show beside a helpline. */
const HELPLINE_ICONS = [
  { value: 'fa-solid fa-shield', label: 'Police' },
  { value: 'fa-solid fa-hospital', label: 'Hospital' },
  { value: 'fa-solid fa-truck-medical', label: 'Ambulance' },
  { value: 'fa-solid fa-fire-extinguisher', label: 'Fire' },
  { value: 'fa-solid fa-person-military-pointing', label: 'Tourist police' },
  { value: 'fa-solid fa-triangle-exclamation', label: 'Disaster' },
  { value: 'fa-solid fa-person-dress', label: 'Women helpline' },
  { value: 'fa-solid fa-phone', label: 'Other' },
];
const BrandSettings = () => {
  const { tablet } = useLayoutWidth();
  const cols = tablet ? 2 : 1;
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await globalService.getPlatformSettings();
      setSettings(data.settings || {});
    } catch (error) {
      toast.error(error.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const set = (key) => (event) =>
    setSettings((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  const contacts = Array.isArray(settings?.emergencyContacts) ? settings.emergencyContacts : [];
  const setContacts = (next) => setSettings((current) => ({ ...current, emergencyContacts: next }));
  const setContact = (index, key) => (event) =>
    setContacts(contacts.map((row, i) => (i === index ? { ...row, [key]: event.target.value } : row)));
  const addContact = () => setContacts([...contacts, { label: '', number: '', icon: 'fa-solid fa-phone' }]);
  const removeContact = (index) => setContacts(contacts.filter((_, i) => i !== index));
  const moveContact = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= contacts.length) return;
    const next = [...contacts];
    [next[index], next[target]] = [next[target], next[index]];
    setContacts(next);
  };
  const save = async (event) => {
    event.preventDefault();
    if (!String(settings?.brandName || '').trim()) return toast.error('The brand name is required');
    if (!String(settings?.sosNumber || '').trim()) return toast.error('The SOS number is required');
    const incomplete = contacts.find((row) => (row.label || row.number) && !(String(row.label).trim() && String(row.number).trim()));
    if (incomplete) return toast.error('Each emergency contact needs both a name and a number');
    try {
      setSaving(true);
      const data = await globalService.savePlatformSettings(settings);
      setSettings(data.settings || settings);
      // Screens in this app read the cached copy; drop it so they see the change now.
      refreshPlatformSettings().catch?.(() => {});
      toast.success('Settings saved');
    } catch (error) {
      toast.error(error.message || 'Could not save these settings');
    } finally {
      setSaving(false);
    }
  };
  const header = (
    <PageHeader title="Brand & Contact" subtitle="Used by every app — the customer app, food, taxi, hotels, tours and festivals." />
  );
  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <LoadingState label="Loading settings…" />
      </AdminPage>
    );
  }
  if (!settings) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <ErrorState title="Settings could not be loaded" message="The platform settings did not come back." onRetry={load} />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={720}>
      <Form onSubmit={save}>
        {header}

        <Card className="mb-4 gap-4">
          <SectionTitle>Identity</SectionTitle>

          <Field label="Brand name" required>
            <Input value={settings?.brandName || ''} onChange={set('brandName')} className={INPUT} />
          </Field>

          <Field label="Tagline">
            <Input value={settings?.tagline || ''} onChange={set('tagline')} className={INPUT} placeholder="Explore · Experience · Discover" />
          </Field>

          <Field label="Logo URL" hint="Leave blank to use the crest that ships with the apps.">
            <Input value={settings?.logoUrl || ''} onChange={set('logoUrl')} className={INPUT} placeholder="/assets/logos/user-384.png" />
          </Field>
        </Card>

        <Card className="mb-4 gap-4">
          <SectionTitle>Support</SectionTitle>
          <P className="text-xs text-slate-500">
            The “Support” link on every sign-in screen uses these, in this order: link, then phone, then email. With none of them set, the link is hidden
            rather than broken.
          </P>

          <Div className={`grid grid-cols-${cols} gap-3`}>
            <Field label="Support link">
              <Input value={settings?.supportUrl || ''} onChange={set('supportUrl')} className={INPUT} placeholder="https://…" />
            </Field>
            <Field label="Support phone">
              <Input value={settings?.supportPhone || ''} onChange={set('supportPhone')} className={INPUT} placeholder="+91 98765 43210" />
            </Field>
          </Div>

          <Field label="Support email">
            <Input value={settings?.supportEmail || ''} onChange={set('supportEmail')} className={INPUT} placeholder="support@…" />
          </Field>
        </Card>

        <Card className="mb-4 gap-4">
          <SectionTitle>Emergency &amp; SOS</SectionTitle>
          <P className="text-xs text-slate-500">
            The SOS number is what every SOS button dials (driver app, rides, admin safety centre). The helplines are listed on the customer app&apos;s Home,
            More and Help &amp; Support screens, in this order.
          </P>

          <Div className={`grid grid-cols-${cols} gap-3`}>
            <Field label="SOS number" required>
              <Input value={settings?.sosNumber || ''} onChange={set('sosNumber')} className={INPUT} placeholder="112" type="tel" />
            </Field>
            <Field label="Tourism desk phone" hint="&quot;Contact Tourism Desk&quot; for local guides.">
              <Input value={settings?.tourismDeskPhone || ''} onChange={set('tourismDeskPhone')} className={INPUT} placeholder="+91 …" type="tel" />
            </Field>
          </Div>

          <Div className="gap-3">
            {contacts.map((row, index) => (
              <Div key={index} className="gap-2 p-3 rounded-lg border border-slate-200">
                <Div className={`grid grid-cols-${cols} gap-2`}>
                  <Field label="Name">
                    <Input value={row.label || ''} onChange={setContact(index, 'label')} className={INPUT} placeholder="Police Control Room" />
                  </Field>
                  <Field label="Number">
                    <Input value={row.number || ''} onChange={setContact(index, 'number')} className={INPUT} placeholder="112" type="tel" />
                  </Field>
                </Div>
                <Div className="flex-row flex-wrap items-center gap-2">
                  <Div className="flex-1 min-w-[160px]">
                    <Select value={row.icon || 'fa-solid fa-phone'} onChange={setContact(index, 'icon')} className={INPUT}>
                      {HELPLINE_ICONS.map((icon) => (
                        <Option key={icon.value} value={icon.value}>
                          {icon.label}
                        </Option>
                      ))}
                    </Select>
                  </Div>
                  <Button type="button" onClick={() => moveContact(index, -1)} disabled={index === 0} className="h-11 px-3 rounded-lg border border-slate-300 items-center justify-center">
                    <Span className="text-sm text-slate-700">Up</Span>
                  </Button>
                  <Button type="button" onClick={() => moveContact(index, 1)} disabled={index === contacts.length - 1} className="h-11 px-3 rounded-lg border border-slate-300 items-center justify-center">
                    <Span className="text-sm text-slate-700">Down</Span>
                  </Button>
                  <Button type="button" onClick={() => removeContact(index)} className="h-11 px-3 rounded-lg border border-red-200 items-center justify-center" accessibilityLabel="Remove this helpline">
                    <UiIcon as={Trash2} size={16} className="text-red-600" />
                  </Button>
                </Div>
              </Div>
            ))}
            <Button type="button" onClick={addContact} className="h-11 px-4 rounded-lg border border-dashed border-slate-400 flex-row items-center justify-center gap-2">
              <UiIcon as={Plus} size={16} className="text-slate-700" />
              <Span className="text-sm font-semibold text-slate-700">Add a helpline</Span>
            </Button>
          </Div>
        </Card>

        <Card className="mb-4 gap-4">
          <SectionTitle>Partner support</SectionTitle>
          <P className="text-xs text-slate-500">Shown to hotel and restaurant partners in the partner app. Left blank, the support phone and email above are used.</P>
          <Div className={`grid grid-cols-${cols} gap-3`}>
            <Field label="Partner support phone">
              <Input value={settings?.partnerSupportPhone || ''} onChange={set('partnerSupportPhone')} className={INPUT} type="tel" />
            </Field>
            <Field label="Partner support email">
              <Input value={settings?.partnerSupportEmail || ''} onChange={set('partnerSupportEmail')} className={INPUT} placeholder="partners@…" />
            </Field>
          </Div>
        </Card>

        <Card className="mb-4 gap-4">
          <SectionTitle>Address</SectionTitle>

          <Field label="Address">
            <Input value={settings?.address || ''} onChange={set('address')} className={INPUT} />
          </Field>

          <Div className={`grid grid-cols-${cols} gap-3`}>
            <Field label="State">
              <Input value={settings?.state || ''} onChange={set('state')} className={INPUT} />
            </Field>
            <Field label="Pincode">
              <Input value={settings?.pincode || ''} onChange={set('pincode')} className={INPUT} />
            </Field>
          </Div>
        </Card>

        <Button type="submit" disabled={saving} className={BTN_PRIMARY}>
          {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : <UiIcon as={Save} size={16} className="text-white" />}
          <Span className={BTN_TEXT_PRIMARY}>Save</Span>
        </Button>
      </Form>
    </AdminPage>
  );
};
export default BrandSettings;
