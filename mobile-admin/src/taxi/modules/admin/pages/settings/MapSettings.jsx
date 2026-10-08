/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/MapSettings.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, Map as MapIcon, Check, Save } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
import { AdminPage, PageHeader, Card, SectionTitle, Field, LoadingState, ErrorState, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../../admin/ui';
import { Button, Div, Img, Input, P, Span, Icon as UiIcon } from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
const MapSettings = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [settings, setSettings] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { tablet } = useLayoutWidth();
  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await adminService.getMapSettings();
      setSettings(res.data?.settings || {});
    } catch (err) {
      console.error('Fetch error:', err);
      setLoadError(err?.message || 'Failed to load Map settings');
      toast.error('Failed to load Map settings');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleUpdate = async () => {
    try {
      setSubmitting(true);
      await adminService.updateMapSettings(settings);
      toast.success('Map configuration updated successfully');
      fetchData();
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSubmitting(false);
    }
  };
  const updateField = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  const header = (
    <PageHeader
      icon={MapIcon}
      title="Map & API Settings"
      subtitle="Provider and credentials for maps and routing"
      breadcrumb={[{ label: 'Settings' }, { label: 'Third-party' }, { label: 'Map Configuration' }]}
      actions={
        <Button onClick={() => window.history.back()} className={BTN_SECONDARY}>
          <UiIcon as={ArrowLeft} size={16} className="text-slate-700" />
          <Span className={BTN_TEXT_SECONDARY}>Back</Span>
        </Button>
      }
    />
  );
  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <LoadingState label="Loading map settings…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <ErrorState title="Could not load map settings" message={loadError} onRetry={fetchData} />
      </AdminPage>
    );
  }
  const mapTypes = [
    {
      id: 'google_map',
      name: 'Google Maps',
      image: 'https://images.livemint.com/img/2021/11/17/1600x900/Google_Maps_rebranded_logo_1637135111166_1637135111306.jpg',
      description: 'Satellite imagery, 360° panoramic views.',
    },
    {
      id: 'open_street',
      name: 'Open Street Map',
      image: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/OpenStreetMap_logo.svg',
      description: 'Free, open source wiki world map.',
    },
  ];
  return (
    <AdminPage maxWidth={720}>
      {header}

      <Card className="mb-4">
        <SectionTitle>Default map provider</SectionTitle>
        <P className="text-sm text-slate-500 mb-3">Select which mapping service the mobile and web apps show.</P>
        <Div className={tablet ? 'flex-row gap-3' : 'gap-3'}>
          {mapTypes.map((map) => {
            const on = settings.map_type === map.id;
            return (
              <Div
                key={map.id}
                onClick={() => updateField('map_type', map.id)}
                accessibilityRole="button"
                accessibilityLabel={`Use ${map.name}`}
                className={`flex-1 rounded-xl border p-3 gap-2 ${on ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}
              >
                <Div className="h-20 rounded-lg bg-slate-50 items-center justify-center p-3 overflow-hidden">
                  <Img src={map.image} alt={map.name} className="w-full h-full" contentFit="contain" />
                </Div>
                <Div className="flex-row items-center gap-2">
                  <Div className="flex-1 min-w-0">
                    <P className="text-sm font-semibold text-slate-900">{map.name}</P>
                    <P className="text-xs text-slate-500">{map.description}</P>
                  </Div>
                  <Div className={`w-6 h-6 rounded-full items-center justify-center shrink-0 ${on ? 'bg-blue-600' : 'bg-slate-100'}`}>
                    {on ? <UiIcon as={Check} size={14} className="text-white" strokeWidth={3} /> : null}
                  </Div>
                </Div>
              </Div>
            );
          })}
        </Div>
      </Card>

      <Card className="gap-4">
        <SectionTitle>API credentials</SectionTitle>
        <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>
          <Field label="Google Map key (web apps)" className={tablet ? 'flex-1' : ''}>
            <Input
              type="password"
              className={INPUT}
              value={settings.google_map_key_for_web_apps || ''}
              onChange={(e) => updateField('google_map_key_for_web_apps', e.target.value)}
              placeholder="Enter API key"
            />
          </Field>
          <Field label="Distance Matrix API key" className={tablet ? 'flex-1' : ''}>
            <Input
              type="password"
              className={INPUT}
              value={settings.google_map_key_for_distance_matrix || ''}
              onChange={(e) => updateField('google_map_key_for_distance_matrix', e.target.value)}
              placeholder="Enter matrix key for routing"
            />
          </Field>
        </Div>
        <Div className="border-t border-slate-100 pt-4">
          <Button onClick={handleUpdate} disabled={submitting} className={`${BTN_PRIMARY} ${submitting ? 'opacity-60' : ''}`}>
            <UiIcon as={submitting ? Loader2 : Save} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>{submitting ? 'Updating…' : 'Save map connection'}</Span>
          </Button>
        </Div>
      </Card>
    </AdminPage>
  );
};
export default MapSettings;
