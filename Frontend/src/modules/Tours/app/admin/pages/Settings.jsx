import React, { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, Loader2, Percent, Save } from 'lucide-react';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner } from '../components/ui';
import toast from 'react-hot-toast';

const field = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] focus:ring-4 focus:ring-[#0a4d2b]/10 transition';
const label = 'block text-[13px] font-semibold text-gray-700 mb-1.5';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminService.getSettings()
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
    setSettings((c) => ({ ...c, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <form onSubmit={save} className="space-y-6 max-w-2xl">
      <PageHeader title="Tours Settings" subtitle="Rates and the booking kill switch for this module only." />

      <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
        settings.platformOpen ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-700'
      }`}>
        {settings.platformOpen ? <CircleCheck size={20} className="shrink-0" /> : <CircleAlert size={20} className="shrink-0" />}
        <div>
          <p className="text-sm font-bold">{settings.platformOpen ? 'Accepting bookings' : 'Bookings paused'}</p>
          <p className="text-xs opacity-80">
            {settings.platformOpen
              ? 'Travellers can book any published tour right now.'
              : 'No new tour bookings can be made anywhere in the app.'}
          </p>
        </div>
      </div>

      <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <h3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100 flex items-center gap-2">
          <Percent size={15} className="text-[#0a4d2b]" /> Tax rate
        </h3>

        <div className="max-w-xs">
          <label className={label}>Tax (GST) %</label>
          <input type="number" min="0" max="100" value={settings.taxRate} onChange={set('taxRate')} className={field} />
          <p className="text-xs text-gray-400 mt-1.5">Charged on the full trip value, not on the advance. Defaults to 5% to match the approved booking screen.</p>
        </div>

        <label className="flex items-start gap-2.5 text-sm text-gray-700 pt-2 border-t border-gray-100">
          <input type="checkbox" checked={settings.platformOpen} onChange={set('platformOpen')} className="mt-0.5" />
          <span>
            <strong>Accepting bookings</strong>
            <span className="block text-xs text-gray-400">Turn this off to stop new tour bookings platform-wide.</span>
          </span>
        </label>

        {!settings.platformOpen && (
          <div>
            <label className={label}>Message shown to travellers</label>
            <textarea value={settings.bookingDisabledMessage} onChange={set('bookingDisabledMessage')} rows={2} className={field} />
          </div>
        )}
      </section>

      <button type="submit" disabled={saving}
        className="flex items-center gap-2 px-6 py-3 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e] disabled:opacity-60">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save settings
      </button>
    </form>
  );
};

export default Settings;
