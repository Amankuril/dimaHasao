/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/TipSettings.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, X, Star } from 'lucide-react-native';
import api from '../../../../shared/api/axiosInstance';
import { toast } from '../../../../../lib/notify';
import { AdminPage, PageHeader, Card, SectionTitle, Field, LoadingState, ErrorState, EmptyState, INPUT, INPUT_ERROR, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../../../../../admin/ui';
import { Button, Div, Input, Li, P, Span, Ul, Icon as UiIcon } from '../../../../../components/web';
import { Switch } from '../../../../../components/shadcn';
const TipSettings = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enable_tips: '0',
    min_tip_amount: '',
  });

  // UI-only state for new features (backend doesn't support these natively yet)
  const [presets, setPresets] = useState([10, 20, 30, 50, 100]);
  const [allowCustom, setAllowCustom] = useState(true);
  const [newPreset, setNewPreset] = useState('');
  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await api.get('/admin/general-settings/tip');
      setSettings(
        res.data?.settings ||
          res.settings || {
            enable_tips: '0',
            min_tip_amount: '10',
          },
      );
    } catch (err) {
      console.error('Fetch error:', err);
      setLoadError(err?.message || 'Failed to load tip configurations');
      toast.error('Failed to load tip configurations');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleUpdate = async () => {
    try {
      setSaving(true);
      // We only save the fields the backend actually supports to prevent errors
      await api.patch('/admin/general-settings/tip', {
        settings: {
          enable_tips: settings.enable_tips,
          min_tip_amount: settings.min_tip_amount,
        },
      });
      toast.success('Settings updated successfully.', {
        style: {
          background: '#151515',
          color: '#fff',
        },
      });
    } catch (err) {
      console.error('Update settings failed:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  const handleAddPreset = () => {
    if (newPreset && !isNaN(newPreset)) {
      setPresets([...presets, parseInt(newPreset)].sort((a, b) => a - b));
      setNewPreset('');
    }
  };
  const handleRemovePreset = (valToRemove) => {
    setPresets(presets.filter((p) => p !== valToRemove));
  };
  const isEnabled = settings.enable_tips === '1';
  const header = (
    <PageHeader
      icon={Star}
      title="Tip Settings"
      subtitle="How customers reward drivers after a completed ride"
      breadcrumb={[{ label: 'App Settings' }, { label: 'Tip Settings' }]}
    />
  );
  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <LoadingState label="Loading tip settings…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <ErrorState title="Could not load tip settings" message={loadError} onRetry={fetchData} />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={720}>
      {header}

      <Card className="mb-4">
        <Div className="flex-row items-center justify-between gap-3">
          <Div className="flex-1 min-w-0">
            <P className="text-base font-semibold text-slate-900">Driver tips</P>
            <P className="text-sm text-slate-500">Allow customers to reward drivers after ride completion.</P>
            {!isEnabled ? <P className="text-xs text-slate-500 mt-1">Turning this off immediately hides the tip UI in the customer app.</P> : null}
          </Div>
          <Switch
            checked={isEnabled}
            onCheckedChange={() =>
              setSettings((s) => ({
                ...s,
                enable_tips: isEnabled ? '0' : '1',
              }))
            }
          />
        </Div>
      </Card>

      <Card className="gap-4 mb-4">
        <SectionTitle>Tip configuration</SectionTitle>

        <Field
          label="Minimum tip amount"
          required
          error={!settings.min_tip_amount ? 'Minimum value is required.' : undefined}
          hint="Minimum value allowed for tipping, in ₹."
        >
          <Input
            type="number"
            value={settings.min_tip_amount || ''}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                min_tip_amount: e.target.value,
              }))
            }
            placeholder="Example: 10"
            className={!settings.min_tip_amount ? INPUT_ERROR : INPUT}
          />
        </Field>

        <Div className="border-t border-slate-100 pt-4 gap-3">
          <Div>
            <P className="text-sm font-semibold text-slate-900">Preset tip amounts</P>
            <P className="text-xs text-slate-500">Quick-selection chips for the customer.</P>
          </Div>

          {presets.length === 0 ? (
            <EmptyState title="No presets" message="Add an amount below to offer customers a quick choice." className="py-6" />
          ) : (
            <Div className="flex-row flex-wrap gap-2">
              {presets.map((p, idx) => (
                <Div key={idx} className="flex-row items-center gap-1 pl-3 pr-1 h-11 rounded-full border border-slate-200 bg-slate-50">
                  <Span className="text-sm font-semibold text-slate-900">₹{p}</Span>
                  <Button
                    onClick={() => handleRemovePreset(p)}
                    accessibilityLabel={`Remove ₹${p} preset`}
                    className="w-9 h-9 rounded-full bg-white items-center justify-center border border-slate-200"
                  >
                    <UiIcon as={X} size={14} className="text-slate-500" />
                  </Button>
                </Div>
              ))}
            </Div>
          )}

          <Div className="flex-row items-center gap-2">
            <Input
              type="number"
              value={newPreset}
              onChange={(e) => setNewPreset(e.target.value)}
              placeholder="Amount"
              className={`${INPUT} flex-1`}
            />
            <Button onClick={handleAddPreset} className={BTN_SECONDARY}>
              <UiIcon as={Plus} size={14} className="text-slate-700" />
              <Span className={BTN_TEXT_SECONDARY}>Add</Span>
            </Button>
          </Div>
        </Div>

        <Div className="border-t border-slate-100 pt-4 flex-row items-center justify-between gap-3">
          <Div className="flex-1 min-w-0">
            <P className="text-sm font-semibold text-slate-900">Allow custom tip amount</P>
            <P className="text-xs text-slate-500">Customers can enter their own amount.</P>
          </Div>
          <Switch checked={allowCustom} onCheckedChange={() => setAllowCustom(!allowCustom)} />
        </Div>

        <Div className="border-t border-slate-100 pt-4">
          <Button onClick={handleUpdate} disabled={saving} className={`${BTN_PRIMARY} ${saving ? 'opacity-60' : ''}`}>
            <UiIcon as={saving ? Loader2 : Save} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : 'Save settings'}</Span>
          </Button>
        </Div>
      </Card>

      <Card>
        <SectionTitle>How driver tips work</SectionTitle>
        <Ul className="gap-2">
          {[
            'Tips are strictly optional for the customer.',
            'Tips are transferred directly to driver earnings.',
            'Customers can skip tipping entirely.',
            'The minimum amount is controlled from this panel.',
            'Driver tips do not affect base fare calculation.',
          ].map((line) => (
            <Li key={line} className="flex-row items-start gap-2">
              <Span className="text-sm text-slate-400">•</Span>
              <Span className="text-sm text-slate-700 flex-1">{line}</Span>
            </Li>
          ))}
        </Ul>
      </Card>
    </AdminPage>
  );
};
export default TipSettings;
