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
import { Loader2, Save } from 'lucide-react-native';
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
  const save = async (event) => {
    event.preventDefault();
    if (!String(settings?.brandName || '').trim()) return toast.error('The brand name is required');
    try {
      setSaving(true);
      const data = await globalService.savePlatformSettings(settings);
      setSettings(data.settings || settings);
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
