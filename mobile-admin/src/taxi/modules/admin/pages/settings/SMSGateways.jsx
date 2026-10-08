/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/SMSGateways.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Loader2, MessageSquare, ArrowLeft, Smartphone, Save } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
import { AdminPage, PageHeader, Card, SectionTitle, StatusBadge, Field, LoadingState, ErrorState, EmptyState, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../../admin/ui';
import { Button, Div, Img, Input, P, Span, Icon as UiIcon } from '../../../../../components/web';
import { Switch } from '../../../../../components/shadcn';
import { window } from '../../../../../lib/webShim';
const SMSGateways = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [settings, setSettings] = useState({});
  const [submitting, setSubmitting] = useState({});
  const { tablet } = useLayoutWidth();
  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await adminService.getSMSSettings();
      setSettings(res.data?.settings || {});
    } catch (err) {
      console.error('Fetch error:', err);
      setLoadError(err?.message || 'Failed to load SMS settings');
      toast.error('Failed to load SMS settings');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleSave = async (slug, providerSlug) => {
    try {
      setSubmitting((prev) => ({
        ...prev,
        [slug]: true,
      }));
      await adminService.updateSMSSettings({
        [providerSlug]: settings[providerSlug],
      });
      toast.success(`${slug} configuration updated`);
    } catch (err) {
      toast.error('Failed to save configuration');
    } finally {
      setSubmitting((prev) => ({
        ...prev,
        [slug]: false,
      }));
    }
  };
  const getSettingValue = (key) => {
    const parts = key.split('.');
    if (parts.length === 2) {
      return settings[parts[0]]?.[parts[1]] || '';
    }
    return settings[key] || '';
  };
  const updateLocalValue = (key, value) => {
    const [parent, child] = key.split('.');
    setSettings((prev) => {
      const next = {
        ...prev,
      };
      if (!next[parent]) next[parent] = {};
      next[parent][child] = value;
      return next;
    });
  };
  const handleToggle = async (slug, key) => {
    try {
      const currentValue = getSettingValue(key);
      const newValue = currentValue === '1' ? '0' : '1';
      const [parent, child] = key.split('.');
      await adminService.updateSMSSettings({
        [parent]: {
          [child]: newValue,
        },
      });
      setSettings((prev) => {
        const next = {
          ...prev,
        };
        if (!next[parent]) next[parent] = {};
        next[parent][child] = newValue;
        return next;
      });
      toast.success(`${slug} ${newValue === '1' ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };
  const smsProviders = [
    {
      name: 'Twilio',
      slug: 'twilio',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Twilio-logo.svg',
      enableKey: 'twilio.enabled',
      fields: [
        {
          label: 'Sid',
          key: 'twilio.sid',
        },
        {
          label: 'Token',
          key: 'twilio.token',
        },
        {
          label: 'Twilio Mobile Number',
          key: 'twilio.from_number',
        },
      ],
    },
    {
      name: 'SMS ALA',
      slug: 'smsala',
      logo: 'https://smsala.com/wp-content/uploads/2021/04/smsala-logo-1.png',
      enableKey: 'smsala.enabled',
      fields: [
        {
          label: 'Api Key',
          key: 'smsala.api_key',
        },
        {
          label: 'Api Secret Key',
          key: 'smsala.secret_key',
        },
        {
          label: 'Token',
          key: 'smsala.token',
        },
        {
          label: 'SMS ALA Mobile Number',
          key: 'smsala.from_number',
        },
      ],
    },
    {
      name: 'SMS India Hub',
      slug: 'india_hub',
      logo: 'https://www.smsindiahub.in/wp-content/uploads/2019/11/sms-india-hub-logo-1.png',
      enableKey: 'india_hub.enabled',
      fields: [
        {
          label: 'SMS India Hub Api Key',
          key: 'india_hub.api_key',
        },
        {
          label: 'SMS India Hub SID',
          key: 'india_hub.sid',
        },
      ],
    },
  ];
  const header = (
    <PageHeader
      icon={MessageSquare}
      title="SMS Gateways"
      subtitle="OTP and transactional SMS providers"
      breadcrumb={[{ label: 'Settings' }, { label: 'Third-party' }, { label: 'SMS Gateways' }]}
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
      <AdminPage maxWidth={900}>
        {header}
        <LoadingState label="Loading SMS settings…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={900}>
        {header}
        <ErrorState title="Could not load SMS settings" message={loadError} onRetry={fetchData} />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={900}>
      {header}

      <Card className="mb-4">
        <Div className="flex-row items-center justify-between gap-3">
          <Div className="w-10 h-10 rounded-lg bg-blue-100 items-center justify-center shrink-0">
            <UiIcon as={Smartphone} size={20} className="text-blue-600" />
          </Div>
          <Div className="flex-1 min-w-0">
            <P className="text-sm font-semibold text-slate-900">Push notifications & OTP</P>
            <P className="text-xs text-slate-500">Enable Firebase OTP for user authentication</P>
          </Div>
          <Switch checked={getSettingValue('firebase.enabled') === '1'} onCheckedChange={() => handleToggle('Firebase OTP', 'firebase.enabled')} />
        </Div>
      </Card>

      {smsProviders.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No SMS providers" message="No gateway integrations are available in this build." />
      ) : (
        <Div className={tablet ? 'flex-row flex-wrap gap-4' : 'gap-4'}>
          {smsProviders.map((provider) => {
            const isEnabled = getSettingValue(provider.enableKey) === '1';
            return (
              <Card key={provider.slug} className={tablet ? 'gap-4 flex-1 min-w-[320px]' : 'gap-4'}>
                <Div className="flex-row items-center gap-3">
                  <Div className="w-12 h-12 rounded-lg border border-slate-200 bg-white p-2 shrink-0">
                    <Img src={provider.logo} alt={provider.name} className="w-full h-full" contentFit="contain" />
                  </Div>
                  <Div className="flex-1 min-w-0 gap-1">
                    <P className="text-sm font-semibold text-slate-900">{provider.name}</P>
                    <StatusBadge status={isEnabled ? 'enabled' : 'disabled'} label={isEnabled ? 'Enabled' : 'Disabled'} />
                  </Div>
                  <Switch checked={isEnabled} onCheckedChange={() => handleToggle(provider.name, provider.enableKey)} />
                </Div>

                {provider.fields.map((field) => (
                  <Field key={field.key} label={field.label}>
                    <Input
                      type="text"
                      value={getSettingValue(field.key)}
                      onChange={(e) => updateLocalValue(field.key, e.target.value)}
                      placeholder={`Your ${provider.name} ${field.label}`}
                      className={INPUT}
                    />
                  </Field>
                ))}

                <Div className="border-t border-slate-100 pt-4">
                  <Button
                    onClick={() => handleSave(provider.name, provider.slug)}
                    disabled={submitting[provider.name]}
                    className={`${BTN_PRIMARY} ${submitting[provider.name] ? 'opacity-60' : ''}`}
                  >
                    <UiIcon as={submitting[provider.name] ? Loader2 : Save} size={16} className="text-white" />
                    <Span className={BTN_TEXT_PRIMARY}>{submitting[provider.name] ? 'Updating…' : 'Update integration'}</Span>
                  </Button>
                </Div>
              </Card>
            );
          })}
        </Div>
      )}
    </AdminPage>
  );
};
export default SMSGateways;
