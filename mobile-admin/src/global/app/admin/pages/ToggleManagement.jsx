/* Ported from Frontend/src/modules/Global/app/admin/pages/ToggleManagement.jsx (tools/port.js first pass). */
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
import { Loader2, ToggleRight, Wrench } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import globalService from '../../../services/globalService';
import { adminAPI } from '../../../../api/food';
import {
  AdminPage,
  Card,
  EmptyState,
  ErrorState,
  INPUT,
  LoadingState,
  PageHeader,
  SectionTitle,
  StatusBadge,
} from '../../../../admin/ui';
import { Button, Div, Input, P, Span, Icon as UiIcon } from '../../../../components/web';
const FOOD_TOGGLES = [
  {
    key: 'cod_enabled',
    label: 'Global COD',
    hint: 'Cash on delivery across every food order type.',
  },
  {
    key: 'takeaway_cod_enabled',
    label: 'Takeaway COD',
    hint: 'Cash for takeaway orders.',
  },
  {
    key: 'delivery_cod_enabled',
    label: 'Delivery COD',
    hint: 'Cash for delivered orders.',
  },
  {
    key: 'dining_cod_enabled',
    label: 'Dining COD',
    hint: 'Cash for dining bookings.',
  },
  {
    key: 'wallet_payment_enabled',
    label: 'Wallet payment',
    hint: 'Paying from the wallet balance.',
  },
  {
    key: 'online_payment_enabled',
    label: 'Online payment',
    hint: 'Cards, UPI and net banking.',
  },
  {
    key: 'default_location_enabled',
    label: 'Default location mode',
    hint: 'Use a default location when none is set.',
  },
  {
    key: 'cod_blocking_feature_enabled',
    label: 'Global COD blocked',
    hint: 'Block cash for customers who owe.',
  },
];

/** A 44 px-tall switch row target: the track itself stays 24 px tall. */
const Switch = ({ checked, onChange, disabled, label }) => (
  <Button
    type="button"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className="h-11 w-14 shrink-0 items-end justify-center disabled:opacity-50"
    accessibilityLabel={label}
  >
    <Div className={`h-6 w-11 rounded-full justify-center ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <Div className={`h-5 w-5 rounded-full bg-white ${checked ? 'ml-[22px]' : 'ml-0.5'}`} />
    </Div>
  </Button>
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
  useEffect(() => {
    load();
  }, [load]);
  const saveModule = async (module, next) => {
    const previous = toggles[module] || {
      enabled: true,
      message: '',
    };
    const updated = {
      ...previous,
      ...next,
    };
    setToggles((current) => ({
      ...current,
      [module]: updated,
    }));
    setSavingKey(module);
    try {
      await globalService.saveModuleToggles([
        {
          module,
          enabled: updated.enabled,
          message: updated.message || '',
        },
      ]);
      toast.success(`${labels[module] || module} ${updated.enabled ? 'is live' : 'is under maintenance'}`);
    } catch (error) {
      setToggles((current) => ({
        ...current,
        [module]: previous,
      }));
      toast.error(error.message || 'Could not save that toggle');
    } finally {
      setSavingKey(null);
    }
  };
  const saveFoodToggle = async (key, checked) => {
    const previous = foodSettings[key];
    setFoodSettings((current) => ({
      ...current,
      [key]: checked,
    }));
    setSavingKey(key);
    try {
      await adminAPI.updateCustomizationSettings({
        [key]: checked,
      });
      toast.success(`${FOOD_TOGGLES.find((t) => t.key === key)?.label || key} ${checked ? 'ON' : 'OFF'}`);
    } catch (error) {
      setFoodSettings((current) => ({
        ...current,
        [key]: previous,
      }));
      toast.error(error.message || 'Could not save that toggle');
    } finally {
      setSavingKey(null);
    }
  };
  const header = <PageHeader title="Toggle Management" subtitle="Every switch that changes what the apps do, in one place." icon={ToggleRight} />;
  if (denied) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <ErrorState title="Only a platform superadmin can change these" message="Ask a platform superadmin to flip a module or a payment switch." />
      </AdminPage>
    );
  }
  if (loading) {
    return (
      <AdminPage maxWidth={900}>
        {header}
        <LoadingState label="Loading the switches…" />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={900}>
      {header}

      <Card className="mb-4 gap-3">
        <SectionTitle action={<UiIcon as={Wrench} size={16} className="text-amber-600" />}>Module availability</SectionTitle>
        <P className="text-xs text-slate-500">
          Switching a module off shows an under-maintenance screen across all of its pages and stops its API. Admin panels stay open.
        </P>

        {modules.length === 0 ? (
          <EmptyState title="No modules to switch" message="The platform did not report any consumer modules." actionLabel="Reload" onAction={load} />
        ) : (
          modules.map((module, i, a) => {
            const entry = toggles[module] || {
              enabled: true,
              message: '',
            };
            return (
              <Div key={module} className={`gap-2 pb-3 ${i === a.length - 1 ? '' : 'border-b border-slate-100'}`}>
                <Div className="flex-row items-center gap-3">
                  <Div className="flex-1 min-w-0 gap-1">
                    <P className="text-sm font-semibold text-slate-900" numberOfLines={2}>
                      {labels[module] || module}
                    </P>
                    <StatusBadge
                      status={entry.enabled ? 'active' : 'pending'}
                      label={entry.enabled ? 'Live' : 'Under maintenance'}
                    />
                  </Div>

                  {savingKey === module && <UiIcon as={Loader2} size={15} className="text-slate-400" />}

                  <Switch
                    checked={entry.enabled}
                    disabled={savingKey === module}
                    label={`${labels[module] || module} availability`}
                    onChange={(enabled) =>
                      saveModule(module, {
                        enabled,
                      })
                    }
                  />
                </Div>

                {!entry.enabled && (
                  <Div className="gap-1">
                    <Input
                      value={entry.message || ''}
                      placeholder={defaultMessage}
                      onChange={(event) =>
                        setToggles((current) => ({
                          ...current,
                          [module]: {
                            ...entry,
                            message: event.target.value,
                          },
                        }))
                      }
                      onBlur={() =>
                        saveModule(module, {
                          message: entry.message || '',
                        })
                      }
                      className={INPUT}
                    />
                    <P className="text-xs text-slate-500">Shown on the maintenance screen. Leave blank for the default.</P>
                  </Div>
                )}
              </Div>
            );
          })
        )}
      </Card>

      <Card className="mb-4 gap-3">
        <SectionTitle>Food ordering &amp; payments</SectionTitle>
        <P className="text-xs text-slate-500">Moved here from Food&apos;s Customization Settings. These apply to the food module only.</P>

        {!foodAvailable ? (
          <ErrorState
            title="Food settings could not be loaded"
            message="They need access to the food admin API."
            onRetry={load}
          />
        ) : (
          FOOD_TOGGLES.map(({ key, label, hint }, i, a) => (
            <Div key={key} className={`flex-row items-center gap-3 pb-3 ${i === a.length - 1 ? '' : 'border-b border-slate-100'}`}>
              <Div className="flex-1 min-w-0">
                <P className="text-sm font-semibold text-slate-900" numberOfLines={2}>
                  {label}
                </P>
                <P className="text-xs text-slate-500 mt-0.5" numberOfLines={2}>
                  {hint}
                </P>
              </Div>

              {savingKey === key && <UiIcon as={Loader2} size={15} className="text-slate-400" />}

              <Switch checked={foodSettings[key] === true} disabled={savingKey === key} label={label} onChange={(checked) => saveFoodToggle(key, checked)} />
            </Div>
          ))
        )}
      </Card>
      <Span className="text-xs text-slate-500">A switch saves as soon as it is flipped.</Span>
    </AdminPage>
  );
};
export default ToggleManagement;
