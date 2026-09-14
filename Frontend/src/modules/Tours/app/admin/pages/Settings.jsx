import React, { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
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
        defaultCommission: Number(settings.defaultCommission),
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

      <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Platform commission %</label>
            <input type="number" min="0" max="100" value={settings.defaultCommission} onChange={set('defaultCommission')} className={field} />
            <p className="text-xs text-gray-400 mt-1.5">Charged on the full trip value, not on the advance.</p>
          </div>
          <div>
            <label className={label}>Tax (GST) %</label>
            <input type="number" min="0" max="100" value={settings.taxRate} onChange={set('taxRate')} className={field} />
            <p className="text-xs text-gray-400 mt-1.5">Defaults to 5% to match the approved booking screen.</p>
          </div>
        </div>

        <label className="flex items-start gap-2.5 text-sm text-gray-700">
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
