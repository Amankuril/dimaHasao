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
import { Button, Div, Form, H1, H2, Input, Label, P, ScrollDiv, Section, Icon as UiIcon } from '../../../../components/web';
const field = 'rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-[#0a4d2b]';
const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500';
const hint = 'mt-1 text-[11px] text-gray-400';
const BrandSettings = () => {
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
  if (loading) {
    return (
      <ScrollDiv className="p-4 pb-20">
        <Div className="flex justify-center py-16">
          <UiIcon as={Loader2} className="h-6 w-6 animate-spin text-gray-400" />
        </Div>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="p-4 pb-20 space-y-5">
      <Div>
        <H1 className="text-xl font-bold text-gray-900">Brand &amp; Contact</H1>
        <P className="mt-1 text-sm text-gray-500">Used by every app — the customer app, food, taxi, hotels, tours and festivals.</P>
      </Div>

      <Form onSubmit={save} className="max-w-2xl space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
        <Section className="space-y-4">
          <H2 className="text-sm font-bold text-gray-900">Identity</H2>

          <Div>
            <Label className={label}>Brand name</Label>
            <Input value={settings?.brandName || ''} onChange={set('brandName')} className={field} />
          </Div>

          <Div>
            <Label className={label}>Tagline</Label>
            <Input value={settings?.tagline || ''} onChange={set('tagline')} className={field} placeholder="Explore · Experience · Discover" />
          </Div>

          <Div>
            <Label className={label}>Logo URL</Label>
            <Input value={settings?.logoUrl || ''} onChange={set('logoUrl')} className={field} placeholder="/assets/logos/user-384.png" />
            <P className={hint}>Leave blank to use the crest that ships with the apps.</P>
          </Div>
        </Section>

        <Section className="space-y-4 border-t border-gray-100 pt-5">
          <H2 className="text-sm font-bold text-gray-900">Support</H2>
          <P className="-mt-2 text-[11px] text-gray-400">
            The “Support” link on every sign-in screen uses these, in this order: link, then phone, then email. With none of them set, the link is hidden rather
            than broken.
          </P>

          <Div className="grid gap-4 sm:grid-cols-2">
            <Div>
              <Label className={label}>Support link</Label>
              <Input value={settings?.supportUrl || ''} onChange={set('supportUrl')} className={field} placeholder="https://…" />
            </Div>
            <Div>
              <Label className={label}>Support phone</Label>
              <Input value={settings?.supportPhone || ''} onChange={set('supportPhone')} className={field} placeholder="+91 98765 43210" />
            </Div>
          </Div>

          <Div>
            <Label className={label}>Support email</Label>
            <Input value={settings?.supportEmail || ''} onChange={set('supportEmail')} className={field} placeholder="support@…" />
          </Div>
        </Section>

        <Section className="space-y-4 border-t border-gray-100 pt-5">
          <H2 className="text-sm font-bold text-gray-900">Address</H2>

          <Div>
            <Label className={label}>Address</Label>
            <Input value={settings?.address || ''} onChange={set('address')} className={field} />
          </Div>

          <Div className="grid gap-4 sm:grid-cols-2">
            <Div>
              <Label className={label}>State</Label>
              <Input value={settings?.state || ''} onChange={set('state')} className={field} />
            </Div>
            <Div>
              <Label className={label}>Pincode</Label>
              <Input value={settings?.pincode || ''} onChange={set('pincode')} className={field} />
            </Div>
          </Div>
        </Section>

        <Div className="border-t border-gray-100 pt-4">
          <Button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0a4d2b] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#06381e] disabled:opacity-60"
          >
            {saving ? <UiIcon as={Loader2} className="h-4 w-4 animate-spin" /> : <UiIcon as={Save} className="h-4 w-4" />}
            Save
          </Button>
        </Div>
      </Form>
    </ScrollDiv>
  );
};
export default BrandSettings;
