/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/FirebaseSettings.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, Flame, FileJson, UploadCloud, CheckCircle2, Save } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
import { pickDocument } from '../../../../../lib/files';
import { AdminPage, PageHeader, Card, SectionTitle, Field, LoadingState, ErrorState, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../../admin/ui';
import { Button, Div, Form, Input, P, Span, Icon as UiIcon } from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
const FirebaseSettings = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [settings, setSettings] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const { tablet } = useLayoutWidth();
  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await adminService.getFirebaseSettings();
      setSettings(res.data?.settings || {});
    } catch (err) {
      console.error('Fetch error:', err);
      setLoadError(err?.message || 'Failed to load Firebase settings');
      toast.error('Failed to load Firebase settings');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const data = {
        ...settings,
        firebase_json_name: selectedFile?.name || settings.firebase_json_name,
      };
      await adminService.updateFirebaseSettings(data);
      toast.success('Firebase configuration updated successfully');
      fetchData();
      setSelectedFile(null);
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
  const pickServiceAccountJson = async () => {
    const file = await pickDocument({ type: 'application/json' });
    if (file) setSelectedFile(file);
  };
  const header = (
    <PageHeader
      icon={Flame}
      title="Firebase Settings"
      subtitle="Realtime database and service account credentials"
      breadcrumb={[{ label: 'Settings' }, { label: 'Third-party' }, { label: 'Firebase Configuration' }]}
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
        <LoadingState label="Loading Firebase settings…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <ErrorState title="Could not load Firebase settings" message={loadError} onRetry={fetchData} />
      </AdminPage>
    );
  }
  const text = (label, key, placeholder, type) => (
    <Field label={label} required className={tablet ? 'flex-1' : ''}>
      <Input
        type={type}
        className={INPUT}
        value={settings[key] || ''}
        onChange={(e) => updateField(key, e.target.value)}
        placeholder={placeholder}
        required
      />
    </Field>
  );
  const pair = (a, b) => <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>{a}{b}</Div>;
  return (
    <AdminPage maxWidth={720}>
      {header}

      <Form onSubmit={handleSave}>
        <Card className="gap-4">
          <SectionTitle>Cloud infrastructure</SectionTitle>

          {text('Firebase database URL', 'firebase_database_url', 'https://your-project.firebaseio.com')}
          {pair(
            text('API key', 'firebase_api_key', '•••••••••••••••', 'password'),
            text('Auth domain', 'firebase_auth_domain', 'your-project.firebaseapp.com'),
          )}
          {pair(
            text('Project ID', 'firebase_project_id', 'your-project-id'),
            text('Storage bucket', 'firebase_storage_bucket', 'your-project.appspot.com'),
          )}
          {pair(
            text('Messaging sender ID', 'firebase_messaging_sender_id', 'xxxxxxxxxxxx'),
            text('App ID', 'firebase_app_id', '1:xxxxxxxxx:web:xxxxxxxxxxxx'),
          )}

          <Field label="Service account JSON" hint="Credentials are stored encrypted">
            <Div
              onClick={pickServiceAccountJson}
              accessibilityRole="button"
              accessibilityLabel="Upload service account JSON"
              className="items-center justify-center py-6 px-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 gap-1"
            >
              {selectedFile ? (
                <>
                  <UiIcon as={CheckCircle2} size={22} className="text-green-700" />
                  <P className="text-sm font-semibold text-slate-900">{selectedFile.name}</P>
                  <P className="text-xs text-slate-500">File selected</P>
                </>
              ) : (
                <>
                  <UiIcon as={UploadCloud} size={22} className="text-slate-400" />
                  <P className="text-sm font-semibold text-slate-700">Tap to upload</P>
                  <P className="text-xs text-slate-500">Service account credentials (.json)</P>
                </>
              )}
            </Div>
          </Field>

          {settings.firebase_json_name && !selectedFile ? (
            <Div className="flex-row items-center justify-between gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50">
              <Div className="flex-row items-center gap-2 flex-1 min-w-0">
                <UiIcon as={FileJson} size={14} className="text-blue-600" />
                <Span className="text-xs font-semibold text-slate-900">{settings.firebase_json_name}</Span>
              </Div>
              <Span className="text-xs text-slate-500">Currently active</Span>
            </Div>
          ) : null}

          <Div className="border-t border-slate-100 pt-4">
            <Button type="submit" disabled={submitting} className={`${BTN_PRIMARY} ${submitting ? 'opacity-60' : ''}`}>
              <UiIcon as={submitting ? Loader2 : Save} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>{submitting ? 'Saving changes…' : 'Save connection'}</Span>
            </Button>
          </Div>
        </Card>
      </Form>
    </AdminPage>
  );
};
export default FirebaseSettings;
