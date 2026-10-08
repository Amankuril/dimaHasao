/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/WalletSettings.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Wallet } from 'lucide-react-native';
import { toast } from '../../../../../lib/notify';
import api from '../../../../shared/api/axiosInstance';
import { AdminPage, PageHeader, Card, SectionTitle, StatCard, StatGrid, StatusBadge, Field, LoadingState, ErrorState, INPUT, BTN_PRIMARY, BTN_TEXT_PRIMARY, useLayoutWidth } from '../../../../../admin/ui';
import { Button, Div, Input, P, Span, Icon as UiIcon } from '../../../../../components/web';
import { Switch } from '../../../../../components/shadcn';
const AMOUNT_FIELDS = [
  {
    name: 'driver_wallet_minimum_amount_to_get_an_order',
    label: 'Driver minimum balance to get orders',
    help: 'Driver app blocks new orders when wallet balance is below this amount. Use a negative value to allow cash debt.',
    placeholder: '-500',
  },
  {
    name: 'minimum_amount_added_to_wallet',
    label: 'Minimum driver top-up amount',
    help: 'Driver cannot add less than this amount from the wallet page.',
    placeholder: '500',
  },
  {
    name: 'minimum_wallet_amount_for_transfer',
    label: 'Minimum transfer amount',
    help: 'Shown to drivers as the minimum amount for wallet transfers.',
    placeholder: '100',
  },
  {
    name: 'owner_wallet_minimum_amount_to_get_an_order',
    label: 'Owner minimum balance to get orders',
    help: 'Kept here for owner wallet rules.',
    placeholder: '-500',
  },
];
const SWITCH_FIELDS = [
  {
    name: 'show_wallet_feature_for_driver',
    label: 'Driver wallet enabled',
    help: 'Controls whether the driver wallet can be used.',
  },
  {
    name: 'enable_wallet_transfer_driver',
    label: 'Driver wallet transfer enabled',
    help: 'Controls the transfer status shown in driver wallet.',
  },
  {
    name: 'show_wallet_feature_for_owner',
    label: 'Owner wallet enabled',
    help: 'Keeps owner wallet visibility controlled from here too.',
  },
  {
    name: 'enable_wallet_transfer_owner',
    label: 'Owner wallet transfer enabled',
    help: 'Controls owner wallet transfer availability.',
  },
  {
    name: 'show_wallet_feature_on_mobile_app',
    label: 'Wallet feature on mobile app',
    help: 'Master mobile visibility flag for wallet features.',
  },
];
const isEnabled = (value) =>
  ['1', 'true', 'yes', 'on'].includes(
    String(value ?? '1')
      .trim()
      .toLowerCase(),
  );
const SwitchField = ({ field, checked, onToggle }) => (
  <Div className="flex-1 flex-row items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
    <Div className="flex-1 min-w-0">
      <P className="text-sm font-semibold text-slate-900">{field.label}</P>
      <P className="text-xs text-slate-500">{field.help}</P>
    </Div>
    <Switch checked={checked} onCheckedChange={() => onToggle(field.name)} />
  </Div>
);
const WalletSettings = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const { tablet } = useLayoutWidth();
  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await api.get('/admin/general-settings/wallet');
      setSettings(res.data?.settings || res.settings || {});
    } catch (err) {
      console.error('Fetch error:', err);
      setLoadError(err?.message || 'Failed to load wallet settings');
      toast.error('Failed to load wallet settings');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const preview = useMemo(() => {
    const driverMinimum = Number(settings.driver_wallet_minimum_amount_to_get_an_order || 0);
    const sampleBalance = -47.55;
    return {
      driverMinimum,
      sampleBalance,
      canReceiveOrders: isEnabled(settings.show_wallet_feature_for_driver) && sampleBalance >= driverMinimum,
    };
  }, [settings]);
  const handleUpdate = async () => {
    try {
      setSaving(true);
      const response = await api.patch('/admin/general-settings/wallet', {
        settings,
      });
      setSettings(response.data?.settings || response.settings || settings);
      toast.success('Wallet settings saved');
    } catch (err) {
      toast.error('Failed to save wallet settings');
    } finally {
      setSaving(false);
    }
  };
  const handleChange = (name, value) => {
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleToggle = (name) => {
    setSettings((prev) => ({
      ...prev,
      [name]: isEnabled(prev[name]) ? '0' : '1',
    }));
  };
  const header = (
    <PageHeader
      icon={Wallet}
      title="Wallet Settings"
      subtitle="Driver and owner wallet limits and feature flags"
      breadcrumb={[{ label: 'App Settings' }, { label: 'Wallet Settings' }]}
      actions={
        <Button onClick={handleUpdate} disabled={saving} className={`${BTN_PRIMARY} ${saving ? 'opacity-60' : ''}`}>
          <UiIcon as={saving ? Loader2 : Save} size={16} className="text-white" />
          <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : 'Save'}</Span>
        </Button>
      }
    />
  );
  if (loading) {
    return (
      <AdminPage maxWidth={900}>
        {header}
        <LoadingState label="Loading wallet settings…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={900}>
        {header}
        <ErrorState title="Could not load wallet settings" message={loadError} onRetry={fetchData} />
      </AdminPage>
    );
  }
  const rows = (items, render) => {
    const out = [];
    const per = tablet ? 2 : 1;
    for (let i = 0; i < items.length; i += per) {
      const chunk = items.slice(i, i + per);
      out.push(
        <Div key={items[i].name} className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>
          {chunk.map(render)}
          {tablet && chunk.length < per ? <Div className="flex-1" /> : null}
        </Div>,
      );
    }
    return out;
  };
  return (
    <AdminPage maxWidth={900}>
      {header}

      <Card className="gap-4 mb-4">
        <SectionTitle>Amounts</SectionTitle>
        <P className="text-sm text-slate-500">These numbers directly control driver wallet behaviour.</P>
        {rows(AMOUNT_FIELDS, (field) => (
          <Field key={field.name} label={field.label} hint={field.help} className="flex-1">
            <Input
              type="number"
              name={field.name}
              value={settings[field.name] ?? ''}
              onChange={(event) => handleChange(field.name, event.target.value)}
              placeholder={field.placeholder}
              className={INPUT}
            />
          </Field>
        ))}
      </Card>

      <Card className="gap-4 mb-4">
        <SectionTitle>Feature controls</SectionTitle>
        {rows(SWITCH_FIELDS, (field) => (
          <SwitchField key={field.name} field={field} checked={isEnabled(settings[field.name])} onToggle={handleToggle} />
        ))}
      </Card>

      <Card className="gap-3 mb-4">
        <SectionTitle>Driver preview</SectionTitle>
        <Div className="rounded-lg border border-slate-200 bg-slate-50 p-4 gap-2">
          <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sample wallet balance</P>
          <P className="text-2xl font-bold text-slate-900">₹{preview.sampleBalance.toFixed(2)}</P>
          <StatusBadge
            tone={preview.canReceiveOrders ? 'success' : 'danger'}
            label={preview.canReceiveOrders ? 'Ready for orders' : 'Top up to receive orders'}
          />
        </Div>
        <StatGrid>
          <StatCard label="Driver order minimum" value={`₹${preview.driverMinimum.toFixed(2)}`} tone="success" />
          <StatCard label="Driver wallet" value={isEnabled(settings.show_wallet_feature_for_driver) ? 'Enabled' : 'Disabled'} tone="info" />
          <StatCard label="Driver transfer" value={isEnabled(settings.enable_wallet_transfer_driver) ? 'Enabled' : 'Disabled'} tone="info" />
        </StatGrid>
      </Card>

      <Card className="gap-1">
        <P className="text-sm font-semibold text-slate-900">How driver control works</P>
        <P className="text-sm text-slate-500">
          The driver wallet page reads these settings from the backend. The top-up minimum is enforced by the API, and order eligibility uses the driver minimum
          balance.
        </P>
      </Card>
    </AdminPage>
  );
};
export default WalletSettings;
