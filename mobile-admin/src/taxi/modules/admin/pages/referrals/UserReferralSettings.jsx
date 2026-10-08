/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/referrals/UserReferralSettings.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Share2, Save, Loader2, UserCheck, Check, X } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_TEXT_PRIMARY,
  LoadingState,
  ErrorState,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, Div, Input, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';
const unwrap = (response) => response?.data?.data || response?.data || response || {};
const UserReferralSettings = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    type: 'instant_referrer',
    amount: 0,
    ride_count: 0,
  });
  const { tablet } = useLayoutWidth();
  const referralTypes = [
    {
      value: 'instant_referrer',
      label: 'Instant for Referrer User',
    },
    {
      value: 'instant_referrer_new',
      label: 'Instant for Referrer User and New User',
    },
    {
      value: 'conditional_referrer',
      label: 'Conditional for Referrer User',
    },
    {
      value: 'conditional_referrer_new',
      label: 'Conditional for Referrer User and New User',
    },
  ];
  const fetchSettings = React.useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await adminService.getReferralSettings('user');
      const payload = unwrap(res);
      if (payload) {
        setSettings({
          enabled: payload.enabled ?? false,
          type: payload.type || 'instant_referrer',
          amount: payload.amount || 0,
          ride_count: payload.ride_count || 0,
        });
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setLoadError(err?.message || 'Failed to load settings');
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);
  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await adminService.updateReferralSettings('user', {
        ...settings,
        amount: Number(settings.amount || 0),
        ride_count: Number(settings.ride_count || 0),
      });
      if (unwrap(res)) {
        setShowSuccess(true);
        toast.success('Referral settings updated successfully');
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };
  const handleToggle = async (newVal) => {
    const updated = {
      ...settings,
      enabled: newVal,
    };
    setSettings(updated);
    try {
      await adminService.updateReferralSettings('user', updated);
      setShowSuccess(true);
      toast.success('Referral settings toggled successfully');
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      toast.error('Failed to toggle settings');
      setSettings(settings); // revert
    }
  };

  const header = (
    <PageHeader
      icon={UserCheck}
      title="User referral settings"
      subtitle="What a rider earns for inviting someone to the app"
      breadcrumb={[{ label: 'Taxi' }, { label: 'Referrals' }, { label: 'Users' }]}
    />
  );

  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <LoadingState label="Loading settings…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <ErrorState title="Could not load the settings" message={loadError} onRetry={fetchSettings} />
      </AdminPage>
    );
  }
  const isConditional = settings.type?.includes('conditional');
  return (
    <AdminPage maxWidth={720}>
      {header}

      <Card className="mb-4">
        <Div className="flex-row items-center gap-3">
          <Div className="flex-1 min-w-0">
            <Span className="text-base font-semibold text-slate-900">User referral earnings</Span>
            <Span className="text-sm text-slate-500">
              Riders invite others with their referral code and earn a reward for each one who joins.
            </Span>
          </Div>
          <Button
            onClick={() => handleToggle(!settings.enabled)}
            accessibilityLabel={settings.enabled ? 'Disable user referrals' : 'Enable user referrals'}
            className="h-11 w-11 items-center justify-center"
          >
            <Div className={`w-11 h-6 rounded-full justify-center ${settings.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <Div className={`w-4 h-4 rounded-full bg-white ${settings.enabled ? 'self-end mr-1' : 'ml-1'}`} />
            </Div>
          </Button>
        </Div>
      </Card>

      <Card className="mb-4 gap-4">
        <SectionTitle className="mb-0">Commission</SectionTitle>
        <Field label="Referral commission type" hint="Instant pays on signup; conditional waits for a number of rides.">
          <Select
            value={settings.type}
            onChange={(e) =>
              setSettings({
                ...settings,
                type: e.target.value,
              })
            }
            className={INPUT}
          >
            <Option value="">Select Commission Type</Option>
            {referralTypes.map((type) => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Field>

        <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
          {isConditional ? (
            <Field
              label="Required ride count"
              hint="Number of rides required before earning rewards."
              className={tablet ? 'flex-1' : ''}
            >
              <Input
                type="number"
                value={settings.ride_count}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ride_count: e.target.value,
                  })
                }
                className={INPUT}
                placeholder="e.g. 5"
              />
            </Field>
          ) : null}

          <Field
            label="Earnings per referral (₹)"
            hint="Amount users earn for each successful referral."
            className={tablet ? 'flex-1' : ''}
          >
            <Input
              type="number"
              value={settings.amount}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  amount: e.target.value,
                })
              }
              className={INPUT}
              placeholder="e.g. 100"
            />
          </Field>
        </Div>
      </Card>

      <Card className="mb-4">
        <Div className="flex-row items-start gap-3">
          <Div className="w-10 h-10 rounded-lg bg-blue-100 items-center justify-center shrink-0">
            <UiIcon as={Share2} size={20} className="text-blue-700" />
          </Div>
          <Div className="flex-1 min-w-0">
            <Span className="text-sm font-semibold text-slate-900">Share code to refer a user</Span>
            <Span className="text-sm text-slate-500">Offer a reward to users for each referral when they share their code.</Span>
          </Div>
        </Div>
      </Card>

      <Button onClick={handleUpdate} disabled={saving} className={`${BTN_PRIMARY} ${saving ? 'opacity-50' : ''}`}>
        {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : <UiIcon as={Save} size={16} className="text-white" />}
        <Span className={BTN_TEXT_PRIMARY}>Update referral settings</Span>
      </Button>

      {showSuccess ? (
        <Div className="flex-row items-center gap-2 mt-3 px-3 py-2.5 rounded-lg bg-green-100 border border-green-200">
          <UiIcon as={Check} size={14} className="text-green-700" />
          <Span className="text-xs font-semibold text-green-700 flex-1">Referral settings updated!</Span>
          <Button onClick={() => setShowSuccess(false)} accessibilityLabel="Dismiss" className="w-11 h-11 items-center justify-center">
            <UiIcon as={X} size={14} className="text-green-700" />
          </Button>
        </Div>
      ) : null}
    </AdminPage>
  );
};
export default UserReferralSettings;
