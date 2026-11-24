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
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import globalService from '../../../services/globalService';

const field =
  'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus:border-[#0a4d2b]';
const label = 'mb-1.5 block text-[13px] font-medium text-neutral-700';
const hint = 'mt-1 text-xs text-neutral-500';

/** Icons the customer app can show beside a helpline (same list as the admin phone app). */
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
        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-medium text-neutral-900">Brand &amp; contact</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Used by every app — the customer app, food, taxi, hotels, tours and festivals.
        </p>
      </div>

      <form onSubmit={save} className="max-w-2xl space-y-5 rounded-2xl border border-neutral-200 bg-white p-5">
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-neutral-900">Identity</h2>

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

        <section className="space-y-4 border-t border-neutral-100 pt-5">
          <h2 className="text-sm font-medium text-neutral-900">Support</h2>
          <p className="-mt-2 text-xs text-neutral-500">
            The “Support” link on every sign-in screen uses these, in this order: link, then
            phone, then email. With none of them set, the link is hidden rather than broken.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Support link</label>
              <input value={settings?.supportUrl || ''} onChange={set('supportUrl')} className={field}
                     placeholder="https://example.com" />
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
                   placeholder="support@example.com" />
          </div>
        </section>

        <section className="space-y-4 border-t border-neutral-100 pt-5">
          <h2 className="text-sm font-medium text-neutral-900">Emergency &amp; SOS</h2>
          <p className="-mt-2 text-xs text-neutral-500">
            The SOS number is what every SOS button dials (driver app, rides, admin safety centre). The helplines are
            listed on the customer app&apos;s Home, More and Help &amp; Support screens, in this order.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>SOS number *</label>
              <input type="tel" value={settings?.sosNumber || ''} onChange={set('sosNumber')} className={field} placeholder="112" />
            </div>
            <div>
              <label className={label}>Tourism desk phone</label>
              <input type="tel" value={settings?.tourismDeskPhone || ''} onChange={set('tourismDeskPhone')} className={field} placeholder="+91" />
              <p className={hint}>&quot;Contact Tourism Desk&quot; for local guides.</p>
            </div>
          </div>

          <div className="space-y-3">
            {contacts.map((row, index) => (
              <div key={index} className="grid gap-2 rounded-xl border border-neutral-200 p-3 sm:grid-cols-[1fr_1fr_150px_auto] sm:items-end">
                <div>
                  <label className={label}>Name</label>
                  <input value={row.label || ''} onChange={setContact(index, 'label')} className={field} placeholder="Police control room" />
                </div>
                <div>
                  <label className={label}>Number</label>
                  <input type="tel" value={row.number || ''} onChange={setContact(index, 'number')} className={field} placeholder="112" />
                </div>
                <div>
                  <label className={label}>Icon</label>
                  <select value={row.icon || 'fa-solid fa-phone'} onChange={setContact(index, 'icon')} className={field}>
                    {HELPLINE_ICONS.map((icon) => (
                      <option key={icon.value} value={icon.value}>{icon.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => moveContact(index, -1)} disabled={index === 0}
                          className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40" aria-label="Move up">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => moveContact(index, 1)} disabled={index === contacts.length - 1}
                          className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40" aria-label="Move down">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => removeContact(index)}
                          className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50" aria-label="Remove this helpline">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addContact}
                    className="inline-flex items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              <Plus className="h-4 w-4" /> Add a helpline
            </button>
          </div>
        </section>

        <section className="space-y-4 border-t border-neutral-100 pt-5">
          <h2 className="text-sm font-medium text-neutral-900">Partner support</h2>
          <p className="-mt-2 text-xs text-neutral-500">
            Shown to hotel and restaurant partners in the partner app. Left blank, the support phone and email above are used.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Partner support phone</label>
              <input type="tel" value={settings?.partnerSupportPhone || ''} onChange={set('partnerSupportPhone')} className={field} />
            </div>
            <div>
              <label className={label}>Partner support email</label>
              <input value={settings?.partnerSupportEmail || ''} onChange={set('partnerSupportEmail')} className={field} placeholder="partners@" />
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t border-neutral-100 pt-5">
          <h2 className="text-sm font-medium text-neutral-900">Address</h2>

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

        <div className="border-t border-neutral-100 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0a4d2b] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#06381e] disabled:opacity-60"
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
