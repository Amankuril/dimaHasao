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
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

import globalService from '../../../services/globalService';

const field =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-[#0a4d2b]';
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

  useEffect(() => { load(); }, [load]);

  const set = (key) => (event) =>
    setSettings((current) => ({ ...current, [key]: event.target.value }));

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
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Brand &amp; Contact</h1>
        <p className="mt-1 text-sm text-gray-500">
          Used by every app — the customer app, food, taxi, hotels, tours and festivals.
        </p>
      </div>

      <form onSubmit={save} className="max-w-2xl space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-900">Identity</h2>

          <div>
            <label className={label}>Brand name</label>
            <input value={settings?.brandName || ''} onChange={set('brandName')} className={field} />
          </div>

          <div>
            <label className={label}>Tagline</label>
            <input value={settings?.tagline || ''} onChange={set('tagline')} className={field}
                   placeholder="Explore · Experience · Discover" />
          </div>

          <div>
            <label className={label}>Logo URL</label>
            <input value={settings?.logoUrl || ''} onChange={set('logoUrl')} className={field}
                   placeholder="/assets/logos/user-384.png" />
            <p className={hint}>
              Leave blank to use the crest that ships with the apps.
            </p>
          </div>
        </section>

        <section className="space-y-4 border-t border-gray-100 pt-5">
          <h2 className="text-sm font-bold text-gray-900">Support</h2>
          <p className="-mt-2 text-[11px] text-gray-400">
            The “Support” link on every sign-in screen uses these, in this order: link, then
            phone, then email. With none of them set, the link is hidden rather than broken.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Support link</label>
              <input value={settings?.supportUrl || ''} onChange={set('supportUrl')} className={field}
                     placeholder="https://…" />
            </div>
            <div>
              <label className={label}>Support phone</label>
              <input value={settings?.supportPhone || ''} onChange={set('supportPhone')} className={field}
                     placeholder="+91 98765 43210" />
            </div>
          </div>

          <div>
            <label className={label}>Support email</label>
            <input value={settings?.supportEmail || ''} onChange={set('supportEmail')} className={field}
                   placeholder="support@…" />
          </div>
        </section>

        <section className="space-y-4 border-t border-gray-100 pt-5">
          <h2 className="text-sm font-bold text-gray-900">Address</h2>

          <div>
            <label className={label}>Address</label>
            <input value={settings?.address || ''} onChange={set('address')} className={field} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>State</label>
              <input value={settings?.state || ''} onChange={set('state')} className={field} />
            </div>
            <div>
              <label className={label}>Pincode</label>
              <input value={settings?.pincode || ''} onChange={set('pincode')} className={field} />
            </div>
          </div>
        </section>

        <div className="border-t border-gray-100 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0a4d2b] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#06381e] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default BrandSettings;
