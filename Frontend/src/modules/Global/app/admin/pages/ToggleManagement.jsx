/**
 * Every switch that changes what the apps will do, in one place.
 *
 * Two kinds live here. Module availability closes a whole consumer module —
 * its own routes and the places the app reaches it from — and returns 503 from
 * its API, so a closed module is closed rather than merely hidden. Below that
 * sit the food ordering and payment switches, which used to be in Food's own
 * Customization Settings; they are still food-specific, just no longer
 * somewhere else.
 *
 * Food's old `maintenance_mode_enabled` flag is NOT touched from here, and is
 * not offered as a switch. Despite living in food's settings it is enforced by
 * a middleware mounted on the whole API, so setting it closes every module at
 * once — flipping it from the Food switch took taxi, hotel and tours down with
 * it, and blocked the very endpoint the apps read toggles from. Per-module
 * maintenance is the section above; that flag is a platform-wide kill switch
 * and wants its own deliberate control, not a side effect.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, ToggleRight, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';

import globalService from '../../../services/globalService';
import { adminAPI } from '@/services/api';

const FOOD_TOGGLES = [
  { key: 'cod_enabled', label: 'Global COD', hint: 'Cash on delivery across every food order type.' },
  { key: 'takeaway_cod_enabled', label: 'Takeaway COD', hint: 'Cash for takeaway orders.' },
  { key: 'delivery_cod_enabled', label: 'Delivery COD', hint: 'Cash for delivered orders.' },
  { key: 'dining_cod_enabled', label: 'Dining COD', hint: 'Cash for dining bookings.' },
  { key: 'wallet_payment_enabled', label: 'Wallet payment', hint: 'Paying from the wallet balance.' },
  { key: 'online_payment_enabled', label: 'Online payment', hint: 'Cards, UPI and net banking.' },
  { key: 'default_location_enabled', label: 'Default location mode', hint: 'Use a default location when none is set.' },
  { key: 'cod_blocking_feature_enabled', label: 'Global COD blocked', hint: 'Block cash for customers who owe.' },
];

const Switch = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
      checked ? 'bg-[#0a4d2b]' : 'bg-gray-300'
    }`}
  >
    <span
      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
        checked ? 'left-[22px]' : 'left-0.5'
      }`}
    />
  </button>
);

const ToggleManagement = () => {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [savingKey, setSavingKey] = useState(null);

  const [modules, setModules] = useState([]);
  const [labels, setLabels] = useState({});
  const [toggles, setToggles] = useState({});
  const [defaultMessage, setDefaultMessage] = useState('');

  const [foodSettings, setFoodSettings] = useState({});
  const [foodAvailable, setFoodAvailable] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const availability = await globalService.getModuleToggles();
      setModules(availability.modules || []);
      setLabels(availability.labels || {});
      setToggles(availability.toggles || {});
      setDefaultMessage(availability.defaultMessage || '');

      // Food's own switches live behind the food admin API; a Global admin who
      // cannot reach it still gets the module section rather than an error.
      try {
        const response = await adminAPI.getCustomizationSettings();
        setFoodSettings(response?.data?.data || response?.data || {});
        setFoodAvailable(true);
      } catch {
        setFoodAvailable(false);
      }
    } catch (error) {
      if (error.status === 403) setDenied(true);
      else toast.error(error.message || 'Could not load toggles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveModule = async (module, next) => {
    const previous = toggles[module] || { enabled: true, message: '' };
    const updated = { ...previous, ...next };

    setToggles((current) => ({ ...current, [module]: updated }));
    setSavingKey(module);

    try {
      await globalService.saveModuleToggles([
        { module, enabled: updated.enabled, message: updated.message || '' },
      ]);

      toast.success(`${labels[module] || module} ${updated.enabled ? 'is live' : 'is under maintenance'}`);
    } catch (error) {
      setToggles((current) => ({ ...current, [module]: previous }));
      toast.error(error.message || 'Could not save that toggle');
    } finally {
      setSavingKey(null);
    }
  };

  const saveFoodToggle = async (key, checked) => {
    const previous = foodSettings[key];
    setFoodSettings((current) => ({ ...current, [key]: checked }));
    setSavingKey(key);

    try {
      await adminAPI.updateCustomizationSettings({ [key]: checked });
      toast.success(`${FOOD_TOGGLES.find((t) => t.key === key)?.label || key} ${checked ? 'ON' : 'OFF'}`);
    } catch (error) {
      setFoodSettings((current) => ({ ...current, [key]: previous }));
      toast.error(error.message || 'Could not save that toggle');
    } finally {
      setSavingKey(null);
    }
  };

  if (denied) {
    return (
      <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center max-w-lg mx-auto">
        <ToggleRight size={28} className="text-amber-500 mx-auto mb-3" />
        <h3 className="font-bold text-gray-900">Only a platform superadmin can change these</h3>
      </div>
    );
  }

  if (loading) {
    return <div className="p-12 text-center text-gray-400"><Loader2 size={22} className="animate-spin inline" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Toggle Management</h2>
        <p className="text-sm text-gray-500 mt-1">
          Every switch that changes what the apps do, in one place.
        </p>
      </div>

      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Wrench size={16} className="text-amber-500" /> Module availability
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Switching a module off shows an under-maintenance screen across all of its pages and
            stops its API. Admin panels stay open.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {modules.map((module) => {
            const entry = toggles[module] || { enabled: true, message: '' };

            return (
              <div key={module} className="px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{labels[module] || module}</p>
                    <p className="text-xs mt-0.5 font-medium">
                      {entry.enabled ? (
                        <span className="text-emerald-600">Live</span>
                      ) : (
                        <span className="text-amber-600">Under maintenance</span>
                      )}
                    </p>
                  </div>

                  {savingKey === module && <Loader2 size={15} className="animate-spin text-gray-400" />}

                  <Switch
                    checked={entry.enabled}
                    disabled={savingKey === module}
                    onChange={(enabled) => saveModule(module, { enabled })}
                  />
                </div>

                {!entry.enabled && (
                  <div className="mt-3">
                    <input
                      value={entry.message || ''}
                      placeholder={defaultMessage}
                      onChange={(event) =>
                        setToggles((current) => ({
                          ...current,
                          [module]: { ...entry, message: event.target.value },
                        }))
                      }
                      onBlur={() => saveModule(module, { message: entry.message || '' })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#0a4d2b]"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Shown on the maintenance screen. Leave blank for the default.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Food ordering &amp; payments</h3>
          <p className="text-xs text-gray-500 mt-1">
            Moved here from Food&apos;s Customization Settings. These apply to the food module only.
          </p>
        </div>

        {!foodAvailable ? (
          <p className="px-5 py-6 text-sm text-gray-500">
            Food settings could not be loaded. They need access to the food admin API.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {FOOD_TOGGLES.map(({ key, label, hint }) => (
              <div key={key} className="px-5 py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
                </div>

                {savingKey === key && <Loader2 size={15} className="animate-spin text-gray-400" />}

                <Switch
                  checked={foodSettings[key] === true}
                  disabled={savingKey === key}
                  onChange={(checked) => saveFoodToggle(key, checked)}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ToggleManagement;
