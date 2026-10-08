/* Ported from Frontend/src/modules/Food/pages/admin/system/ThirdParty.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Settings, Eye, EyeOff } from 'lucide-react-native';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatusBadge,
  Field,
  EmptyState,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import { alert } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const thirdPartyServices = [
  {
    id: 1,
    name: 'Stripe',
    category: 'Payment Gateway',
    description: 'Online payment processing',
    enabled: true,
    configured: true,
    fields: [
      {
        key: 'publishableKey',
        label: 'Publishable Key',
        value: 'pk_test_...',
        type: 'password',
      },
      {
        key: 'secretKey',
        label: 'Secret Key',
        value: 'sk_test_...',
        type: 'password',
      },
    ],
  },
  {
    id: 2,
    name: 'PayPal',
    category: 'Payment Gateway',
    description: 'PayPal payment integration',
    enabled: true,
    configured: true,
    fields: [
      {
        key: 'clientId',
        label: 'Client ID',
        value: 'AeA1QIZXiflr1...',
        type: 'text',
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        value: 'ECm...',
        type: 'password',
      },
    ],
  },
  {
    id: 3,
    name: 'Razorpay',
    category: 'Payment Gateway',
    description: 'Razorpay payment gateway',
    enabled: false,
    configured: false,
    fields: [
      {
        key: 'keyId',
        label: 'Key ID',
        value: '',
        type: 'text',
      },
      {
        key: 'keySecret',
        label: 'Key Secret',
        value: '',
        type: 'password',
      },
    ],
  },
  {
    id: 4,
    name: 'Twilio',
    category: 'SMS Service',
    description: 'SMS and messaging service',
    enabled: true,
    configured: true,
    fields: [
      {
        key: 'accountSid',
        label: 'Account SID',
        value: 'AC...',
        type: 'text',
      },
      {
        key: 'authToken',
        label: 'Auth Token',
        value: '...',
        type: 'password',
      },
      {
        key: 'phoneNumber',
        label: 'Phone Number',
        value: '+1234567890',
        type: 'text',
      },
    ],
  },
  {
    id: 5,
    name: 'SendGrid',
    category: 'Email Service',
    description: 'Transactional email service',
    enabled: false,
    configured: false,
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        value: '',
        type: 'password',
      },
      {
        key: 'fromEmail',
        label: 'From Email',
        value: '',
        type: 'email',
      },
    ],
  },
  {
    id: 6,
    name: 'Google Maps',
    category: 'Map Service',
    description: 'Google Maps API integration',
    enabled: true,
    configured: true,
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        value: 'AIzaSy...',
        type: 'password',
      },
    ],
  },
  {
    id: 7,
    name: 'AWS S3',
    category: 'Storage Service',
    description: 'Amazon S3 file storage',
    enabled: false,
    configured: false,
    fields: [
      {
        key: 'accessKeyId',
        label: 'Access Key ID',
        value: '',
        type: 'text',
      },
      {
        key: 'secretAccessKey',
        label: 'Secret Access Key',
        value: '',
        type: 'password',
      },
      {
        key: 'bucketName',
        label: 'Bucket Name',
        value: '',
        type: 'text',
      },
      {
        key: 'region',
        label: 'Region',
        value: '',
        type: 'text',
      },
    ],
  },
];
function ToggleSwitch({ enabled, onToggle, label }) {
  return (
    <Button type="button" onClick={onToggle} accessibilityLabel={label} className="w-11 h-11 flex-row items-center justify-center shrink-0">
      <Div className={`flex-row items-center w-11 h-6 rounded-full border px-0.5 ${enabled ? 'bg-blue-600 border-blue-600 justify-end' : 'bg-slate-200 border-slate-300 justify-start'}`}>
        <Span className="h-5 w-5 rounded-full bg-white" />
      </Div>
    </Button>
  );
}
export default function ThirdParty() {
  const [services, setServices] = useState(thirdPartyServices);
  const [expandedService, setExpandedService] = useState(null);
  const [visibleFields, setVisibleFields] = useState({});
  const [fieldValues, setFieldValues] = useState(
    services.reduce((acc, service) => {
      service.fields.forEach((field) => {
        acc[`${service.id}-${field.key}`] = field.value;
      });
      return acc;
    }, {}),
  );
  const handleToggle = (id) => {
    setServices((prev) =>
      prev.map((service) =>
        service.id === id
          ? {
              ...service,
              enabled: !service.enabled,
            }
          : service,
      ),
    );
  };
  const handleFieldChange = (serviceId, fieldKey, value) => {
    const key = `${serviceId}-${fieldKey}`;
    setFieldValues((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Mark as configured if at least one field has value
    const service = services.find((s) => s.id === serviceId);
    const hasValue = service.fields.some((f) => {
      const fieldKey = `${serviceId}-${f.key}`;
      return fieldValues[fieldKey] || (f.key === fieldKey.split('-')[1] && value);
    });
    if (hasValue && !service.configured) {
      setServices((prev) =>
        prev.map((s) =>
          s.id === serviceId
            ? {
                ...s,
                configured: true,
              }
            : s,
        ),
      );
    }
  };
  const toggleFieldVisibility = (serviceId, fieldKey) => {
    const key = `${serviceId}-${fieldKey}`;
    setVisibleFields((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  const handleSave = (serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    const serviceFields = service.fields.map((field) => ({
      key: field.key,
      value: fieldValues[`${serviceId}-${field.key}`] || field.value,
    }));
    debugLog('Saving service:', service.name, serviceFields);
    alert(`${service.name} configuration saved successfully!`);
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId
          ? {
              ...s,
              configured: true,
            }
          : s,
      ),
    );
  };
  const handleReset = (serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    service.fields.forEach((field) => {
      const key = `${serviceId}-${field.key}`;
      setFieldValues((prev) => ({
        ...prev,
        [key]: field.value || '',
      }));
    });
  };
  const categories = [...new Set(services.map((s) => s.category))];
  const { tablet } = useLayoutWidth();
  const col = tablet ? { width: '48.5%' } : { width: '100%' };
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={Settings}
        title="3rd Party Configuration"
        subtitle="Payment, SMS, email, map and storage credentials"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: '3rd party' }]}
      />

      {categories.length === 0 ? (
        <EmptyState title="No integrations" message="Third-party services will appear here once they are registered." />
      ) : (
        <Div className="gap-4">
          {categories.map((category) => {
            const categoryServices = services.filter((s) => s.category === category);
            return (
              <Card key={category}>
                <SectionTitle>{category}</SectionTitle>
                <Div className="gap-3">
                  {categoryServices.map((service) => (
                    <Div key={service.id} className="border border-slate-200 rounded-lg p-3 gap-2">
                      <Div className="flex-row items-start gap-2">
                        <Div className="flex-1 min-w-0 gap-1">
                          <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={2}>
                            {service.name}
                          </Text>
                          <Text style={tw`text-xs text-slate-500`} numberOfLines={2}>
                            {service.description}
                          </Text>
                          <StatusBadge
                            tone={service.configured ? 'success' : 'danger'}
                            label={service.configured ? 'Configured' : 'Not configured'}
                          />
                        </Div>
                        <ToggleSwitch enabled={service.enabled} onToggle={() => handleToggle(service.id)} label={`Toggle ${service.name}`} />
                      </Div>

                      <Div className="flex-row justify-end">
                        <Button
                          type="button"
                          onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
                          className="h-11 px-2 flex-row items-center justify-center"
                        >
                          <Span className="text-sm font-semibold text-blue-600">{expandedService === service.id ? 'Hide' : 'Configure'}</Span>
                        </Button>
                      </Div>

                      {expandedService === service.id ? (
                        <Div className="pt-3 border-t border-slate-200 gap-3">
                          <Div className="flex-row flex-wrap gap-3">
                            {service.fields.map((field) => {
                              const fieldKey = `${service.id}-${field.key}`;
                              const isPassword = field.type === 'password';
                              const isVisible = visibleFields[fieldKey];
                              const value = fieldValues[fieldKey] || field.value || '';
                              return (
                                <Div key={field.key} style={col}>
                                  <Field label={field.label}>
                                    <Div className="flex-row items-center gap-1 h-11 px-3 rounded-lg border border-slate-300 bg-white">
                                      <Input
                                        type={isPassword && !isVisible ? 'password' : 'text'}
                                        value={value}
                                        onChange={(e) => handleFieldChange(service.id, field.key, e.target.value)}
                                        placeholder={`Enter ${field.label.toLowerCase()}`}
                                        className="flex-1 text-sm text-slate-900"
                                      />
                                      {isPassword ? (
                                        <Button
                                          type="button"
                                          onClick={() => toggleFieldVisibility(service.id, field.key)}
                                          accessibilityLabel={isVisible ? `Hide ${field.label}` : `Show ${field.label}`}
                                          className="w-9 h-11 items-center justify-center shrink-0"
                                        >
                                          <UiIcon as={isVisible ? EyeOff : Eye} size={16} className="text-slate-400" />
                                        </Button>
                                      ) : null}
                                    </Div>
                                  </Field>
                                </Div>
                              );
                            })}
                          </Div>
                          <Div className="flex-row flex-wrap justify-end gap-2">
                            <Button type="button" onClick={() => handleReset(service.id)} className={BTN_SECONDARY}>
                              <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
                            </Button>
                            <Button type="button" onClick={() => handleSave(service.id)} className={BTN_PRIMARY}>
                              <Span className={BTN_TEXT_PRIMARY}>Save</Span>
                            </Button>
                          </Div>
                        </Div>
                      ) : null}
                    </Div>
                  ))}
                </Div>
              </Card>
            );
          })}
        </Div>
      )}
    </AdminPage>
  );
}
