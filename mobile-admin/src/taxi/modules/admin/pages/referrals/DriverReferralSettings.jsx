/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/referrals/DriverReferralSettings.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clock3, Gift, Loader2, Plus, Save, Share2, Sparkles, Trash2, Trophy, X } from 'lucide-react-native';
import { toast } from '../../../../../lib/notify';
import { adminService } from '../../services/adminService';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  LoadingState,
  ErrorState,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, Div, Input, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';

/** A 44 px-tall switch: the kit has no toggle, so the screens build it locally. */
const Toggle = ({ value, onToggle, label }) => (
  <Button onClick={onToggle} accessibilityLabel={label} className="h-11 w-11 items-center justify-center">
    <Div className={`w-11 h-6 rounded-full justify-center ${value ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <Div className={`w-4 h-4 rounded-full bg-white ${value ? 'self-end mr-1' : 'ml-1'}`} />
    </Div>
  </Button>
);
const defaultMilestone = (index = 1) => ({
  id: `milestone_${Date.now()}_${index}`,
  name: '',
  enabled: true,
  active_hours_per_day: 8,
  required_weeks: 4,
  min_trips_per_week: 40,
  payout_amount: 500,
  notes: '',
});
const defaultRewardFeatures = [
  {
    id: 'daily_active_streak',
    key: 'daily_active_streak',
    label: 'Daily active streak bonus',
    enabled: false,
    reward_amount: 150,
    target_value: 7,
    unit: 'days',
    description: 'Reward drivers for staying active every day for a full streak window.',
  },
  {
    id: 'weekly_trip_quest',
    key: 'weekly_trip_quest',
    label: 'Weekly trip quest',
    enabled: false,
    reward_amount: 600,
    target_value: 75,
    unit: 'trips',
    description: 'Uber and Ola style weekly quest for drivers who hit a trip slab.',
  },
  {
    id: 'peak_hour_booster',
    key: 'peak_hour_booster',
    label: 'Peak hour booster',
    enabled: false,
    reward_amount: 250,
    target_value: 20,
    unit: 'peak trips',
    description: 'Extra wallet reward for completing rides during demand-heavy hours.',
  },
  {
    id: 'weekend_warrior',
    key: 'weekend_warrior',
    label: 'Weekend warrior',
    enabled: false,
    reward_amount: 300,
    target_value: 2,
    unit: 'weekends',
    description: 'Bonus for maintaining availability and completing targets across weekends.',
  },
  {
    id: 'rating_guard',
    key: 'rating_guard',
    label: 'Rating guard bonus',
    enabled: false,
    reward_amount: 200,
    target_value: 4.8,
    unit: 'rating',
    description: 'Reward high-rated drivers who keep service quality consistently strong.',
  },
  {
    id: 'cancellation_guard',
    key: 'cancellation_guard',
    label: 'Low cancellation bonus',
    enabled: false,
    reward_amount: 180,
    target_value: 3,
    unit: '% cancel rate',
    description: 'Bonus for drivers who keep cancellation rate under a configured target.',
  },
];
const normalizeMilestone = (item, index = 1) => ({
  ...defaultMilestone(index),
  ...item,
  enabled: item?.enabled ?? true,
  active_hours_per_day: Number(item?.active_hours_per_day ?? 8),
  required_weeks: Number(item?.required_weeks ?? 4),
  min_trips_per_week: Number(item?.min_trips_per_week ?? 40),
  payout_amount: Number(item?.payout_amount ?? 500),
  notes: item?.notes || '',
});
const normalizeFeature = (baseFeature, storedFeature = {}) => ({
  ...baseFeature,
  ...storedFeature,
  enabled: storedFeature?.enabled ?? baseFeature.enabled,
  reward_amount: Number(storedFeature?.reward_amount ?? baseFeature.reward_amount),
  target_value: Number(storedFeature?.target_value ?? baseFeature.target_value),
  unit: storedFeature?.unit || baseFeature.unit,
  description: storedFeature?.description || baseFeature.description,
});
const normalizeDriverReferralSettings = (data = {}) => {
  const storedFeatures = Array.isArray(data.reward_features) ? data.reward_features : [];
  return {
    enabled: data.enabled ?? false,
    type: data.type || 'instant_referrer',
    amount: Number(data.amount || 0),
    ride_count: Number(data.ride_count || 0),
    milestone_program_enabled: data.milestone_program_enabled ?? false,
    milestone_programs:
      Array.isArray(data.milestone_programs) && data.milestone_programs.length > 0 ? data.milestone_programs.map(normalizeMilestone) : [defaultMilestone()],
    reward_features: defaultRewardFeatures.map((feature) =>
      normalizeFeature(
        feature,
        storedFeatures.find((item) => item?.key === feature.key || item?.id === feature.id),
      ),
    ),
  };
};
const referralTypes = [
  {
    value: 'instant_referrer',
    label: 'Instant for Referrer Driver',
  },
  {
    value: 'instant_referrer_new',
    label: 'Instant for Referrer Driver and New Driver',
  },
  {
    value: 'conditional_referrer',
    label: 'Conditional for Referrer Driver',
  },
  {
    value: 'conditional_referrer_new',
    label: 'Conditional for Referrer Driver and New Driver',
  },
];
const DriverReferralSettings = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [settings, setSettings] = useState(() => normalizeDriverReferralSettings());
  const { tablet } = useLayoutWidth();
  const fetchSettings = React.useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await adminService.getReferralSettings('driver');
      setSettings(normalizeDriverReferralSettings(res.data || {}));
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
      const payload = {
        ...settings,
        amount: Number(settings.amount || 0),
        ride_count: Number(settings.ride_count || 0),
        milestone_programs: settings.milestone_programs.map((item, index) => ({
          ...item,
          id: item.id || `milestone_${index + 1}`,
          active_hours_per_day: Number(item.active_hours_per_day || 0),
          required_weeks: Number(item.required_weeks || 0),
          min_trips_per_week: Number(item.min_trips_per_week || 0),
          payout_amount: Number(item.payout_amount || 0),
        })),
        reward_features: settings.reward_features.map((item, index) => ({
          ...item,
          id: item.id || `feature_${index + 1}`,
          reward_amount: Number(item.reward_amount || 0),
          target_value: Number(item.target_value || 0),
        })),
      };
      const res = await adminService.updateReferralSettings('driver', payload);
      if (res) {
        setShowSuccess(true);
        toast.success('Driver incentive settings updated');
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
    const previous = settings;
    const updated = {
      ...settings,
      enabled: newVal,
    };
    setSettings(updated);
    try {
      await adminService.updateReferralSettings('driver', updated);
      setShowSuccess(true);
      toast.success('Driver referral settings toggled');
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      toast.error('Failed to toggle settings');
      setSettings(previous);
    }
  };
  const updateMilestone = (index, key, value) => {
    setSettings((current) => ({
      ...current,
      milestone_programs: current.milestone_programs.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    }));
  };
  const addMilestone = () => {
    setSettings((current) => ({
      ...current,
      milestone_programs: [...current.milestone_programs, defaultMilestone(current.milestone_programs.length + 1)],
    }));
  };
  const removeMilestone = (index) => {
    setSettings((current) => ({
      ...current,
      milestone_programs:
        current.milestone_programs.length === 1 ? [defaultMilestone(1)] : current.milestone_programs.filter((_, itemIndex) => itemIndex !== index),
    }));
  };
  const updateRewardFeature = (key, field, value) => {
    setSettings((current) => ({
      ...current,
      reward_features: current.reward_features.map((item) =>
        item.key === key
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    }));
  };
  const isConditional = settings.type?.includes('conditional');
  const enabledFeatureCount = useMemo(() => settings.reward_features.filter((item) => item.enabled).length, [settings.reward_features]);
  const header = (
    <PageHeader
      icon={Gift}
      title="Driver referral settings"
      subtitle="Referral payouts plus long-term milestone programs for drivers"
      breadcrumb={[{ label: 'Taxi' }, { label: 'Referrals' }, { label: 'Drivers' }]}
    />
  );

  if (loading) {
    return (
      <AdminPage maxWidth={900}>
        {header}
        <LoadingState label="Loading settings…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={900}>
        {header}
        <ErrorState title="Could not load the settings" message={loadError} onRetry={fetchSettings} />
      </AdminPage>
    );
  }
  const half = tablet ? 'flex-1' : '';
  return (
    <AdminPage maxWidth={900}>
      {header}

      <Card className="mb-4">
        <Div className="flex-row items-center gap-3">
          <Div className="flex-1 min-w-0">
            <Span className="text-base font-semibold text-slate-900">Driver referral earnings</Span>
            <Span className="text-sm text-slate-500">Configure referral rewards plus long-term milestone programs for drivers.</Span>
          </Div>
          <Toggle
            value={settings.enabled}
            onToggle={() => handleToggle(!settings.enabled)}
            label={settings.enabled ? 'Disable driver referrals' : 'Enable driver referrals'}
          />
        </Div>
      </Card>

      <StatGrid className="mb-4">
        <StatCard label="Milestones" value={String(settings.milestone_programs.length)} icon={Trophy} tone="info" />
        <StatCard label="Active features" value={String(enabledFeatureCount)} icon={Sparkles} tone="success" />
      </StatGrid>

      <Card className="mb-4 gap-4">
        <SectionTitle className="mb-0">Referral payout</SectionTitle>
        <Field label="Driver referral type" hint="Instant pays on signup; conditional waits for a number of rides.">
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
            <Option value="">Select</Option>
            {referralTypes.map((type) => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Field>

        <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
          {isConditional ? (
            <Field label="Required ride count" hint="Number of rides required before referral rewards unlock." className={half}>
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
                placeholder="5"
              />
            </Field>
          ) : null}

          <Field label="Earnings to each referral" hint="Wallet amount credited for each successful driver referral." className={half}>
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
              placeholder="100"
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
            <Span className="text-sm font-semibold text-slate-900">Driver growth stack</Span>
            <Span className="text-sm text-slate-500">
              Mix the normal referral payout with milestone rewards like active-hour streaks, weekly quests, peak bonuses, rating protection and
              cancellation discipline.
            </Span>
          </Div>
        </Div>
      </Card>

      <Card className="mb-4">
        <Div className="flex-row items-center gap-3 mb-3">
          <Div className="flex-1 min-w-0">
            <Span className="text-base font-semibold text-slate-900">Driver milestone program</Span>
            <Span className="text-sm text-slate-500">Milestone payout slabs based on daily active time and sustained weekly performance.</Span>
          </Div>
          <Toggle
            value={settings.milestone_program_enabled}
            onToggle={() =>
              setSettings((current) => ({
                ...current,
                milestone_program_enabled: !current.milestone_program_enabled,
              }))
            }
            label={settings.milestone_program_enabled ? 'Disable milestone program' : 'Enable milestone program'}
          />
        </Div>

        <Div className="gap-3">
          {settings.milestone_programs.map((item, index) => (
            <Div key={item.id} className="rounded-xl border border-slate-200 p-4 bg-white gap-3">
              <Div className="flex-row items-center gap-2">
                <Div className="w-10 h-10 rounded-lg bg-slate-100 items-center justify-center shrink-0">
                  <UiIcon as={Clock3} size={18} className="text-slate-600" />
                </Div>
                <Div className="flex-1 min-w-0">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Milestone {index + 1}</Span>
                  <Span className="text-sm font-semibold text-slate-900" numberOfLines={2}>
                    {item.name || 'Untitled milestone'}
                  </Span>
                </Div>
                <Toggle
                  value={item.enabled}
                  onToggle={() => updateMilestone(index, 'enabled', !item.enabled)}
                  label={`${item.enabled ? 'Disable' : 'Enable'} milestone ${index + 1}`}
                />
                <Button
                  type="button"
                  onClick={() => removeMilestone(index)}
                  accessibilityLabel={`Remove milestone ${index + 1}`}
                  className="w-11 h-11 rounded-lg border border-slate-200 bg-white items-center justify-center"
                >
                  <UiIcon as={Trash2} size={16} className="text-red-600" />
                </Button>
              </Div>

              <Field label="Milestone name">
                <Input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateMilestone(index, 'name', e.target.value)}
                  className={INPUT}
                  placeholder="30-day active streak"
                />
              </Field>

              <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
                <Field label="Active hours / day" className={half}>
                  <Input
                    type="number"
                    value={item.active_hours_per_day}
                    onChange={(e) => updateMilestone(index, 'active_hours_per_day', e.target.value)}
                    className={INPUT}
                  />
                </Field>
                <Field label="Required weeks" className={half}>
                  <Input
                    type="number"
                    value={item.required_weeks}
                    onChange={(e) => updateMilestone(index, 'required_weeks', e.target.value)}
                    className={INPUT}
                  />
                </Field>
              </Div>

              <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
                <Field label="Payout amount" className={half}>
                  <Input
                    type="number"
                    value={item.payout_amount}
                    onChange={(e) => updateMilestone(index, 'payout_amount', e.target.value)}
                    className={INPUT}
                  />
                </Field>
                <Field label="Minimum trips / week" className={half}>
                  <Input
                    type="number"
                    value={item.min_trips_per_week}
                    onChange={(e) => updateMilestone(index, 'min_trips_per_week', e.target.value)}
                    className={INPUT}
                  />
                </Field>
              </Div>

              <Field label="Admin note">
                <Input
                  type="text"
                  value={item.notes}
                  onChange={(e) => updateMilestone(index, 'notes', e.target.value)}
                  className={INPUT}
                  placeholder="Credit after compliance review"
                />
              </Field>
            </Div>
          ))}

          <Button type="button" onClick={addMilestone} className={`${BTN_SECONDARY} self-start`}>
            <UiIcon as={Plus} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Add milestone</Span>
          </Button>
        </Div>
      </Card>

      <Card className="mb-4">
        <Div className="flex-row items-start gap-3 mb-3">
          <Div className="w-10 h-10 rounded-lg bg-blue-100 items-center justify-center shrink-0">
            <UiIcon as={Sparkles} size={18} className="text-blue-700" />
          </Div>
          <Div className="flex-1 min-w-0">
            <Span className="text-base font-semibold text-slate-900">Extra driver reward features</Span>
            <Span className="text-sm text-slate-500">Popular incentive mechanics from large fleet growth programs.</Span>
          </Div>
        </Div>

        <Div className="gap-3">
          {settings.reward_features.map((feature) => (
            <Div key={feature.key} className="rounded-xl border border-slate-200 p-4 bg-white gap-3">
              <Div className="flex-row items-start gap-2">
                <Div className="flex-1 min-w-0">
                  <Span className="text-sm font-semibold text-slate-900">{feature.label}</Span>
                  <Span className="text-xs text-slate-500">{feature.description}</Span>
                </Div>
                <Toggle
                  value={feature.enabled}
                  onToggle={() => updateRewardFeature(feature.key, 'enabled', !feature.enabled)}
                  label={`${feature.enabled ? 'Disable' : 'Enable'} ${feature.label}`}
                />
              </Div>

              <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
                <Field label="Reward amount" className={half}>
                  <Input
                    type="number"
                    value={feature.reward_amount}
                    onChange={(e) => updateRewardFeature(feature.key, 'reward_amount', e.target.value)}
                    className={INPUT}
                  />
                </Field>
                <Field label="Target value" className={half}>
                  <Input
                    type="number"
                    value={feature.target_value}
                    onChange={(e) => updateRewardFeature(feature.key, 'target_value', e.target.value)}
                    className={INPUT}
                  />
                </Field>
              </Div>

              <Field label="Unit / metric">
                <Input type="text" value={feature.unit} onChange={(e) => updateRewardFeature(feature.key, 'unit', e.target.value)} className={INPUT} />
              </Field>
            </Div>
          ))}
        </Div>
      </Card>

      <Button onClick={handleUpdate} disabled={saving} className={`${BTN_PRIMARY} ${saving ? 'opacity-50' : ''}`}>
        {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : <UiIcon as={Save} size={16} className="text-white" />}
        <Span className={BTN_TEXT_PRIMARY}>Update driver incentive settings</Span>
      </Button>

      {showSuccess ? (
        <Div className="flex-row items-center gap-2 mt-3 px-3 py-2.5 rounded-lg bg-green-100 border border-green-200">
          <UiIcon as={Check} size={14} className="text-green-700" />
          <Span className="text-xs font-semibold text-green-700 flex-1">Driver incentive settings updated successfully</Span>
          <Button onClick={() => setShowSuccess(false)} accessibilityLabel="Dismiss" className="w-11 h-11 items-center justify-center">
            <UiIcon as={X} size={14} className="text-green-700" />
          </Button>
        </Div>
      ) : null}
    </AdminPage>
  );
};
export default DriverReferralSettings;
