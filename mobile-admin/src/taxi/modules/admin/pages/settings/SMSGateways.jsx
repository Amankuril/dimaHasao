/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/SMSGateways.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { ChevronRight, Loader2, MessageSquare, ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
import { Button, Div, H1, H3, Img, Input, Label, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../../components/web';
import { Switch } from '../../../../../components/shadcn';
import { window } from '../../../../../lib/webShim';
const SMSGateways = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const [submitting, setSubmitting] = useState({});
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminService.getSMSSettings();
      setSettings(res.data?.settings || {});
    } catch (err) {
      console.error('Fetch error:', err);
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
          <Span className="text-gray-700">SMS Gateways</Span>
        </Div>
        <Div className="flex items-center justify-between">
          <H1 className="text-xl text-gray-900 font-bold">SMS Gateways</H1>
          <Button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <UiIcon as={ArrowLeft} size={16} /> Back
          </Button>
        </Div>
      </Div>

      <Div className="space-y-8">
        {/* Top Feature Toggle Card */}
        <Div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between shadow-sm">
          <Div className="flex items-center gap-3">
            <Div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <UiIcon as={Smartphone} size={20} />
            </Div>
            <Div>
              <H3 className="text-sm font-bold text-gray-900">Push Notifications & OTP</H3>
              <P className="text-xs text-gray-400">Enable Firebase OTP for user authentication</P>
            </Div>
          </Div>
          <Switch checked={getSettingValue('firebase.enabled') === '1'} onCheckedChange={() => handleToggle('Firebase OTP', 'firebase.enabled')} className={getSettingValue('firebase.enabled') === '1' ? 'bg-indigo-600' : 'bg-gray-200'} />
        </Div>

        {/* SMS Provider Grid */}
        <Div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {smsProviders.map((provider) => {
            const isEnabled = getSettingValue(provider.enableKey) === '1';
            return (
              <Div
                key={provider.slug}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full transform transition-all duration-200 hover:shadow-md"
              >
                {/* Card Header */}
                <Div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                  <Div className="flex items-center gap-4">
                    <Div className="w-14 h-14 rounded-xl flex items-center justify-center border border-gray-100 bg-white p-2">
                      <Img src={provider.logo} alt={provider.name} className="w-full h-full object-contain" />
                    </Div>
                    <Div>
                      <H3 className="text-sm font-bold text-gray-900 tracking-tight">{provider.name} Integration</H3>
                      <P className="text-[11px] font-medium text-gray-400 flex items-center gap-1 mt-0.5">
                        {isEnabled ? (
                          <Span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                            <UiIcon as={CheckCircle2} size={10} /> Enabled
                          </Span>
                        ) : (
                          <Span className="flex items-center gap-1 text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                            <UiIcon as={AlertCircle} size={10} /> Disabled
                          </Span>
                        )}
                      </P>
                    </Div>
                  </Div>
                  <Switch checked={isEnabled} onCheckedChange={() => handleToggle(provider.name, provider.enableKey)} className={isEnabled ? 'bg-indigo-600' : 'bg-gray-200'} />
                </Div>

                {/* Card Body */}
                <Div className="p-6 flex-1 space-y-5">
                  {provider.fields.map((field) => (
                    <Div key={field.key}>
                      <Label className={labelClass}>{field.label}</Label>
                      <Input
                        type="text"
                        value={getSettingValue(field.key)}
                        onChange={(e) => updateLocalValue(field.key, e.target.value)}
                        placeholder={`Your ${provider.name} ${field.label}`}
                        className={inputClass}
                      />
                    </Div>
                  ))}
                </Div>

                {/* Card Footer */}
                <Div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                  <Div className="flex items-center gap-2 text-[10px] text-gray-400 font-semibold uppercase tracking-widest px-2">
                    <UiIcon as={MessageSquare} size={12} className="text-gray-300" />
                    SMS Verified
                  </Div>
                  <Button
                    onClick={() => handleSave(provider.name, provider.slug)}
                    disabled={submitting[provider.name]}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {submitting[provider.name] ? (
                      <>
                        <UiIcon as={Loader2} size={16} className="animate-spin" /> Updating...
                      </>
                    ) : (
                      'Update Integration'
                    )}
                  </Button>
                </Div>
              </Div>
            );
          })}
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default SMSGateways;
