/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/TransportRideSettings.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Save, Loader2, Car } from 'lucide-react-native';
import api from '../../../../shared/api/axiosInstance';
import { toast } from '../../../../../lib/notify';
import { AdminPage, PageHeader, Card, SectionTitle, Field, LoadingState, ErrorState, INPUT, BTN_PRIMARY, BTN_TEXT_PRIMARY, useLayoutWidth } from '../../../../../admin/ui';
import { Button, Div, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../../components/web';
const TransportRideSettings = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const { tablet } = useLayoutWidth();
  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await api.get('/admin/general-settings/transport-ride');
      setSettings(res.data?.settings || res.settings || {});
    } catch (err) {
      console.error('Fetch error:', err);
      setLoadError(err?.message || 'Failed to load transport parameters');
      toast.error('Failed to load transport parameters');
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
      await api.patch('/admin/general-settings/transport-ride', {
        settings,
      });
      toast.success('Transport settings updated successfully!');
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to save changes');
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
  const header = (
    <PageHeader
      icon={Car}
      title="Transport Ride Settings"
      subtitle="Regular ride search and dispatch behaviour"
      breadcrumb={[{ label: 'Settings' }, { label: 'Transport Ride Settings' }]}
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
        <ErrorState title="Could not load settings" message={loadError} onRetry={fetchData} />
      </AdminPage>
    );
  }
  const numberField = (label, name, hint) => (
    <Field label={label} hint={hint} className={tablet ? 'flex-1' : ''}>
      <Input
        type="number"
        name={name}
        value={settings[name] || ''}
        onChange={(e) => handleChange(name, e.target.value)}
        className={INPUT}
      />
    </Field>
  );
  return (
    <AdminPage maxWidth={720}>
      {header}

      <Card className="mb-4 gap-1">
        <P className="text-sm font-semibold text-slate-900">Regular ride search behaviour is controlled from this page.</P>
        <P className="text-sm text-slate-500">Only the settings below are currently wired into the live dispatch flow.</P>
      </Card>

      <Card className="gap-4">
        <SectionTitle>Dispatch</SectionTitle>

        <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>
          <Field label="Trip dispatch type" className={tablet ? 'flex-1' : ''}>
            <Select
              value={settings.trip_dispatch_type || '1'}
              onChange={(e) => handleChange('trip_dispatch_type', e.target.value)}
              className={INPUT}
            >
              <Option value="1">One by one</Option>
              <Option value="2">Broadcast</Option>
            </Select>
          </Field>
          {numberField('Driver search radius', 'driver_search_radius', 'In kilometres')}
        </Div>

        <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>
          {numberField('Maximum time to find drivers', 'maximum_time_for_find_drivers_for_regular_ride', 'Regular ride, in seconds')}
          {numberField('Accept / reject window', 'trip_accept_reject_duration_for_driver', 'Per driver, in seconds')}
        </Div>

        <Field label="Require admin approval to end rental">
          <Select
            value={settings.require_admin_approval_to_end_rental || '0'}
            onChange={(e) => handleChange('require_admin_approval_to_end_rental', e.target.value)}
            className={INPUT}
          >
            <Option value="0">No (auto-complete ride)</Option>
            <Option value="1">Yes (awaiting confirmation)</Option>
          </Select>
        </Field>

        <Div className="border-t border-slate-100 pt-4">
          <Button onClick={handleUpdate} disabled={saving} className={`${BTN_PRIMARY} ${saving ? 'opacity-60' : ''}`}>
            <UiIcon as={saving ? Loader2 : Save} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : 'Update settings'}</Span>
          </Button>
        </Div>
      </Card>
    </AdminPage>
  );
};
export default TransportRideSettings;
