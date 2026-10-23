/**
 * Google Maps and Razorpay keys, changed here instead of in a new app release.
 *
 * The apps never hold these: Maps lookups go through the backend and Razorpay
 * Checkout takes its key id from each order. So a key saved here is used by the
 * very next request, in every installed version of every app.
 *
 * The server only ever returns a masked preview, so a field left empty means
 * "keep what is there".
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

import globalService from '../../../services/globalService';

const field =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-[#0a4d2b]';
const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500';
const hint = 'mt-1 text-[11px] text-gray-400';

const SOURCE_LABEL = { database: 'saved here', env: 'from server setting', none: 'not set' };

const GROUPS = [
  {
    title: 'Google Maps',
    fields: [
      { name: 'googleMapsApiKey', secret: true },
      { name: 'googleMapsBrowserKey', secret: false },
    ],
  },
  {
    title: 'Razorpay',
    fields: [
      { name: 'razorpayKeyId', secret: false },
      { name: 'razorpayKeySecret', secret: true },
      { name: 'razorpayWebhookSecret', secret: true },
    ],
  },
];

const ApiCredentials = () => {
  const [info, setInfo] = useState(null);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setInfo(await globalService.getCredentials());
    } catch (error) {
      toast.error(error.message || 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    const payload = {};
    for (const [name, value] of Object.entries(values)) {
      if (String(value).trim()) payload[name] = String(value).trim();
    }
    if (!Object.keys(payload).length) return toast.error('Enter at least one new value');

    try {
      setSaving(true);
      setInfo(await globalService.saveCredentials(payload));
      setValues({});
      toast.success('Saved. The next request uses the new keys.');
    } catch (error) {
      toast.error(error.message || 'Could not save these keys');
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

  if (!info) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-gray-900">API Keys</h1>
        <p className="text-sm text-gray-500">Keys could not be loaded. Only a platform superadmin can open this page.</p>
        <button type="button" onClick={load} className="text-sm font-bold text-[#0a4d2b]">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">API Keys</h1>
        <p className="mt-1 text-sm text-gray-500">
          Google Maps and Razorpay. Changes apply immediately — no app update needed.
        </p>
      </div>

      {!info.encryptionConfigured && (
        <div className="max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          The server has no CREDENTIALS_ENCRYPTION_KEY, so keys cannot be saved yet. Set it in the server
          environment and restart once.
        </div>
      )}

      <form onSubmit={save} className="max-w-2xl space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
        {GROUPS.map((group, index) => (
          <section key={group.title} className={`space-y-4 ${index ? 'border-t border-gray-100 pt-5' : ''}`}>
            <h2 className="text-sm font-bold text-gray-900">{group.title}</h2>
            {group.fields.map(({ name, secret }) => {
              const current = info.fields?.[name] || {};
              return (
                <div key={name}>
                  <label className={label}>{current.label || name}</label>
                  <input
                    type={secret ? 'password' : 'text'}
                    autoComplete="off"
                    value={values[name] || ''}
                    onChange={set(name)}
                    className={field}
                    placeholder={current.configured ? 'Leave empty to keep the current value' : 'Paste the new value'}
                  />
                  <p className={hint}>
                    {SOURCE_LABEL[current.source] || ''}{current.preview ? ` · ${current.preview}` : ''}
                  </p>
                </div>
              );
            })}
          </section>
        ))}

        <p className="border-t border-gray-100 pt-4 text-[11px] text-gray-400">
          The server key serves the mobile apps and the web panel's lookups; the web key draws maps in the browser (restrict it by website address). The map drawn inside the mobile apps uses a separate key built into the app, which cannot be changed from here.
        </p>

        <button
          type="submit"
          disabled={saving || !info.encryptionConfigured}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0a4d2b] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#06381e] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </form>
    </div>
  );
};

export default ApiCredentials;
