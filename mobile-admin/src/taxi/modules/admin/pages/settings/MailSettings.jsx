/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/MailSettings.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { ChevronRight, Loader2, ArrowLeft, Mail, Send, CheckCircle2, ShieldCheck, Server, Lock } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
import { useSettings } from '../../../../shared/context/SettingsContext';
import { Button, Div, Form, H1, H3, H4, Input, Label, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
const MailSettings = () => {
  const { settings: appSettings } = useSettings();
  const appName = appSettings.general?.app_name || 'App';
  const mailPlaceholderDomain = appName.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'app';
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminService.getMailSettings();
      setSettings(res.data?.settings || {});
    } catch (err) {
      console.error('Fetch error:', err);
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
  const inputClass =
    'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';
  const labelClass = 'block text-xs font-semibold text-gray-500 mb-1.5';
  if (loading) {
    return (
      <ScrollDiv className="flex items-center justify-center min-h-screen bg-gray-50">
        <UiIcon as={Loader2} className="animate-spin text-indigo-600" size={32} />
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 p-6 lg:p-8 font-sans">
      {/* Header Block */}
      <Div className="mb-8">
        <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Span>Settings</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span>Third-party</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700">SMTP Server Configuration</Span>
        </Div>
        <Div className="flex items-center justify-between">
          <H1 className="text-xl text-gray-900 font-bold">Mail Configuration</H1>
          <Button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <UiIcon as={ArrowLeft} size={16} /> Back
          </Button>
        </Div>
      </Div>

      <Div className="max-w-5xl mx-auto">
        {/* Main Card */}
        <Form onSubmit={handleUpdate} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Card Header */}
          <Div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
            <Div className="flex items-center gap-3">
              <Div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <UiIcon as={Server} size={20} />
              </Div>
              <Div>
                <H3 className="text-sm font-bold text-gray-900">Outgoing Mail Server</H3>
                <P className="text-xs text-gray-400">Configure your system SMTP details for sending transactional emails</P>
              </Div>
            </Div>
            <Button
              type="button"
              onClick={handleTestMail}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors uppercase tracking-wider"
            >
              {testing ? (
                <UiIcon as={Loader2} size={12} className="animate-spin" />
              ) : (
                <>
                  <UiIcon as={Send} size={12} /> Send Test Mail
                </>
              )}
            </Button>
          </Div>

          <Div className="p-8 space-y-8">
            <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Div className="md:col-span-1">
                <Label className={labelClass}>Mailer Driver (e.g. SMTP)</Label>
                <Input
                  className={inputClass}
                  value={settings.mail_driver || ''}
                  onChange={(e) => updateField('mail_driver', e.target.value)}
                  placeholder="smtp"
                  required
                />
              </Div>

              <Div className="md:col-span-1">
                <Label className={labelClass}>Server Host</Label>
                <Input
                  className={inputClass}
                  value={settings.mail_host || ''}
                  onChange={(e) => updateField('mail_host', e.target.value)}
                  placeholder="smtp.gmail.com"
                  required
                />
              </Div>

              <Div>
                <Label className={labelClass}>Port Number</Label>
                <Input
                  className={inputClass}
                  value={settings.mail_port || ''}
                  onChange={(e) => updateField('mail_port', e.target.value)}
                  placeholder="587"
                  required
                />
              </Div>

              <Div>
                <Label className={labelClass}>Encryption Type</Label>
                <Select className={inputClass} value={settings.mail_encryption || ''} onChange={(e) => updateField('mail_encryption', e.target.value)} required>
                  <Option value="">Select Encryption</Option>
                  <Option value="tls">TLS</Option>
                  <Option value="ssl">SSL</Option>
                </Select>
              </Div>

              <Div>
                <Label className={labelClass}>Auth Username</Label>
                <Input
                  className={inputClass}
                  value={settings.mail_username || ''}
                  onChange={(e) => updateField('mail_username', e.target.value)}
                  placeholder="username@domain.com"
                  required
                />
              </Div>

              <Div>
                <Label className={labelClass}>Auth Password</Label>
                <Div className="relative">
                  <Input
                    type="password"
                    className={inputClass}
                    value={settings.mail_password || ''}
                    onChange={(e) => updateField('mail_password', e.target.value)}
                    placeholder="**********************"
                    required
                  />
                  <UiIcon as={Lock} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                </Div>
              </Div>

              <Div className="md:col-span-2 pt-4 border-t border-gray-50">
                <H4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Sender Information</H4>
                <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Div>
                    <Label className={labelClass}>&quot;From&quot; Email Address</Label>
                    <Input
                      type="email"
                      className={inputClass}
                      value={settings.mail_from_address || ''}
                      onChange={(e) => updateField('mail_from_address', e.target.value)}
                      placeholder={`noreply@${mailPlaceholderDomain}.com`}
                      required
                    />
                  </Div>
                  <Div>
                    <Label className={labelClass}>&quot;From&quot; Name</Label>
                    <Input
                      className={inputClass}
                      value={settings.mail_from_name || ''}
                      onChange={(e) => updateField('mail_from_name', e.target.value)}
                      placeholder={`${appName} Admin`}
                      required
                    />
                  </Div>
                </Div>
              </Div>
            </Div>
          </Div>

          {/* Card Footer */}
          <Div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <Div className="flex items-center gap-2 text-[10px] text-gray-400 font-semibold uppercase tracking-widest px-2">
              <UiIcon as={ShieldCheck} size={12} className="text-gray-300" />
              Verified Connection
            </Div>
            <Button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <UiIcon as={Loader2} size={16} className="animate-spin" /> Saving Configuration...
                </>
              ) : (
                'Update Mail Settings'
              )}
            </Button>
          </Div>
        </Form>
      </Div>
    </ScrollDiv>
  );
};
export default MailSettings;
