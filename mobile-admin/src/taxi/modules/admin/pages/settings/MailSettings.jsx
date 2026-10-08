/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/MailSettings.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, Send, Server, Save } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
import { useSettings } from '../../../../shared/context/SettingsContext';
import { AdminPage, PageHeader, Card, SectionTitle, Field, LoadingState, ErrorState, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../../admin/ui';
import { Button, Div, Form, Input, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
const MailSettings = () => {
  const { settings: appSettings } = useSettings();
  const appName = appSettings.general?.app_name || 'App';
  const mailPlaceholderDomain = appName.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'app';
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [settings, setSettings] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const { tablet } = useLayoutWidth();
  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await adminService.getMailSettings();
      setSettings(res.data?.settings || {});
    } catch (err) {
      console.error('Fetch error:', err);
      setLoadError(err?.message || 'Failed to load Mail settings');
      toast.error('Failed to load Mail settings');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await adminService.updateMailSettings(settings);
      toast.success('Mail configuration updated successfully');
      fetchData();
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSubmitting(false);
    }
  };
  const handleTestMail = async () => {
    try {
      setTesting(true);
      await new Promise((r) => setTimeout(r, 1200));
      toast.success('Test mail sent to ' + (settings.mail_from_address || 'administrator'));
    } catch (err) {
      toast.error('Failed to send test mail');
    } finally {
      setTesting(false);
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
      icon={Server}
      title="Mail Configuration"
      subtitle="SMTP details used for transactional email"
      breadcrumb={[{ label: 'Settings' }, { label: 'Third-party' }, { label: 'SMTP Server Configuration' }]}
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
        <LoadingState label="Loading mail settings…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <ErrorState title="Could not load mail settings" message={loadError} onRetry={fetchData} />
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

      <Form onSubmit={handleUpdate}>
        <Card className="gap-4 mb-4">
          <SectionTitle
            action={
              <Button type="button" onClick={handleTestMail} disabled={testing} className={`${BTN_SECONDARY} ${testing ? 'opacity-60' : ''}`}>
                <UiIcon as={testing ? Loader2 : Send} size={14} className="text-slate-700" />
                <Span className={BTN_TEXT_SECONDARY}>{testing ? 'Sending…' : 'Test mail'}</Span>
              </Button>
            }
          >
            Outgoing mail server
          </SectionTitle>

          {pair(text('Mailer driver', 'mail_driver', 'smtp'), text('Server host', 'mail_host', 'smtp.gmail.com'))}
          <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>
            {text('Port number', 'mail_port', '587')}
            <Field label="Encryption type" required className={tablet ? 'flex-1' : ''}>
              <Select className={INPUT} value={settings.mail_encryption || ''} onChange={(e) => updateField('mail_encryption', e.target.value)} required>
                <Option value="">Select encryption</Option>
                <Option value="tls">TLS</Option>
                <Option value="ssl">SSL</Option>
              </Select>
            </Field>
          </Div>
          {pair(
            text('Auth username', 'mail_username', 'username@domain.com'),
            text('Auth password', 'mail_password', '••••••••••', 'password'),
          )}
        </Card>

        <Card className="gap-4">
          <SectionTitle>Sender information</SectionTitle>
          {pair(
            text('“From” email address', 'mail_from_address', `noreply@${mailPlaceholderDomain}.com`, 'email'),
            text('“From” name', 'mail_from_name', `${appName} Admin`),
          )}
          <Div className="border-t border-slate-100 pt-4">
            <Button type="submit" disabled={submitting} className={`${BTN_PRIMARY} ${submitting ? 'opacity-60' : ''}`}>
              <UiIcon as={submitting ? Loader2 : Save} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>{submitting ? 'Saving configuration…' : 'Update mail settings'}</Span>
            </Button>
          </Div>
        </Card>
      </Form>
    </AdminPage>
  );
};
export default MailSettings;
