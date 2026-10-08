/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/PaymentGateways.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Loader2, CreditCard, ArrowLeft, Save } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
import { AdminPage, PageHeader, Card, StatusBadge, Field, LoadingState, ErrorState, EmptyState, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../../admin/ui';
import { Button, Div, Img, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { Switch } from '../../../../../components/shadcn';
import { window } from '../../../../../lib/webShim';
const PaymentGateways = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [activeGateway, setActiveGateway] = useState(null);
  const [loadError, setLoadError] = useState('');
  const { tablet } = useLayoutWidth();
  const unwrapPayload = (response) => response?.data?.data || response?.data || {};
  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await adminService.getPaymentSettings();
      const payload = unwrapPayload(res);
      setSettings(payload.settings || {});
      setActiveGateway(payload.active_gateway || null);
    } catch (err) {
      console.error('Fetch error:', err);
      setLoadError(err?.message || 'Failed to load payment gateways');
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleSave = async (slug, data) => {
    try {
      setSubmitting((prev) => ({
        ...prev,
        [slug]: true,
      }));
      const response = await adminService.updatePaymentSettings(data);
      const payload = unwrapPayload(response);
      setSettings(payload.settings || {});
      setActiveGateway(payload.active_gateway || null);
      toast.success(`Configuration for ${slug} updated`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSubmitting((prev) => ({
        ...prev,
        [slug]: false,
      }));
    }
  };
  const handleToggle = async (gateway, currentValue) => {
    try {
      setSubmitting((prev) => ({
        ...prev,
        [gateway.slug]: true,
      }));
      const newValue = currentValue === '1' ? '0' : '1';
      const response = await adminService.updatePaymentSettings({
        [gateway.slug]: {
          ...(settings[gateway.slug] || {}),
          enabled: newValue,
        },
      });
      const payload = unwrapPayload(response);
      setSettings(payload.settings || {});
      setActiveGateway(payload.active_gateway || null);
      toast.success(`${gateway.name} ${newValue === '1' ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to toggle status');
    } finally {
      setSubmitting((prev) => ({
        ...prev,
        [gateway.slug]: false,
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
  const gatewayGroups = [
    {
      name: 'RAZOR PAY',
      slug: 'razor_pay',
      logo: 'https://cdn.razorpay.com/logo.svg',
      enableKey: 'razor_pay.enabled',
      color: 'indigo',
      fields: [
        {
          label: 'Environment',
          key: 'razor_pay.environment',
          type: 'select',
          options: ['test', 'live'],
        },
        {
          label: 'Test Api Key',
          key: 'razor_pay.test_api_key',
        },
        {
          label: 'Test Secret Key',
          key: 'razor_pay.test_secret_key',
        },
        {
          label: 'Live Api Key',
          key: 'razor_pay.live_api_key',
        },
        {
          label: 'Live Secret Key',
          key: 'razor_pay.live_secret_key',
        },
      ],
    },
    {
      name: 'PHONEPE',
      slug: 'phone_pay',
      logo: 'https://www.phonepe.com/webstatic/8101/static/m/83f6ed9f4a0a996dc7a69b7.svg',
      enableKey: 'phone_pay.enabled',
      color: 'purple',
      fields: [
        {
          label: 'Environment',
          key: 'phone_pay.environment',
          type: 'select',
          options: ['test', 'production'],
        },
        {
          label: 'Client ID / Merchant ID',
          key: 'phone_pay.merchant_id',
        },
        {
          label: 'Client Secret / Salt Key',
          key: 'phone_pay.salt_key',
        },
        {
          label: 'Client Version / Salt Index',
          key: 'phone_pay.salt_index',
        },
      ],
    },
    {
      name: 'STRIPE',
      slug: 'stripe',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg',
      enableKey: 'stripe.enabled',
      color: 'sky',
      fields: [
        {
          label: 'Environment',
          key: 'stripe.environment',
          type: 'select',
          options: ['test', 'live'],
        },
        {
          label: 'Test Secret Key',
          key: 'stripe.test_secret_key',
        },
        {
          label: 'Test Publishable Key',
          key: 'stripe.test_publishable_key',
        },
        {
          label: 'Production Secret Key',
          key: 'stripe.live_secret_key',
        },
        {
          label: 'Production Publishable Key',
          key: 'stripe.live_publishable_key',
        },
      ],
    },
  ];
  const header = (
    <PageHeader
      icon={CreditCard}
      title="Payment Gateways"
      subtitle="Credentials and the single live gateway"
      breadcrumb={[{ label: 'Settings' }, { label: 'Third-party' }, { label: 'Payment Gateways' }]}
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
        <LoadingState label="Loading gateways…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={900}>
        {header}
        <ErrorState title="Could not load gateways" message={loadError} onRetry={fetchData} />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={900}>
      {header}

      {gatewayGroups.length === 0 ? (
        <EmptyState icon={CreditCard} title="No gateways configured" message="No payment integrations are available in this build." />
      ) : (
        <Div className={tablet ? 'flex-row flex-wrap gap-4' : 'gap-4'}>
          {gatewayGroups.map((gw) => {
            const isEnabled = getSettingValue(gw.enableKey) === '1';
            const isSubmitting = Boolean(submitting[gw.slug]);
            return (
              <Card key={gw.slug} className={tablet ? 'gap-4 flex-1 min-w-[320px]' : 'gap-4'}>
                <Div className="flex-row items-center gap-3">
                  <Div className="w-12 h-12 rounded-lg border border-slate-200 bg-white p-2 shrink-0">
                    <Img src={gw.logo} alt={gw.name} className="w-full h-full" contentFit="contain" />
                  </Div>
                  <Div className="flex-1 min-w-0 gap-1">
                    <P className="text-sm font-semibold text-slate-900">{gw.name}</P>
                    <StatusBadge status={isEnabled ? 'active' : 'disabled'} label={isEnabled ? 'Active' : 'Disabled'} />
                  </Div>
                  <Switch checked={isEnabled} onCheckedChange={() => handleToggle(gw, getSettingValue(gw.enableKey))} disabled={isSubmitting} />
                </Div>

                <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3 gap-1">
                  <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Runtime status</P>
                  <P className="text-sm font-semibold text-slate-900">
                    {isEnabled
                      ? `${gw.name} is the live gateway for the app right now.`
                      : activeGateway?.slug === gw.slug
                        ? `${gw.name} was last marked active.`
                        : 'This gateway is currently inactive.'}
                  </P>
                  <P className="text-xs text-slate-500">
                    Only one payment gateway can stay enabled at a time, and enabling requires valid credentials for that gateway.
                  </P>
                </Div>

                {gw.fields.map((field) => (
                  <Field key={field.key} label={field.label}>
                    {field.type === 'select' ? (
                      <Select value={getSettingValue(field.key)} onChange={(e) => updateLocalValue(field.key, e.target.value)} className={INPUT}>
                        {field.options.map((opt) => (
                          <Option key={opt} value={opt}>
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </Option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        type="text"
                        value={getSettingValue(field.key)}
                        onChange={(e) => updateLocalValue(field.key, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className={INPUT}
                      />
                    )}
                  </Field>
                ))}

                <Div className="border-t border-slate-100 pt-4">
                  <Button
                    onClick={() =>
                      handleSave(gw.name, {
                        [gw.slug]: settings[gw.slug],
                      })
                    }
                    disabled={isSubmitting}
                    className={`${BTN_PRIMARY} ${isSubmitting ? 'opacity-60' : ''}`}
                  >
                    <UiIcon as={isSubmitting ? Loader2 : Save} size={16} className="text-white" />
                    <Span className={BTN_TEXT_PRIMARY}>{isSubmitting ? 'Updating…' : 'Update integration'}</Span>
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
export default PaymentGateways;
