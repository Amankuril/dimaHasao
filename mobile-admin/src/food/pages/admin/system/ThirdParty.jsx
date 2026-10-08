/* Ported from Frontend/src/modules/Food/pages/admin/system/ThirdParty.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Settings, Info, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react-native';
import { Button, Div, H1, H2, H3, Input, Label, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
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
function ToggleSwitch({ enabled, onToggle }) {
  return (
    <Button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center w-11 h-6 rounded-full border transition-all ${enabled ? 'bg-blue-600 border-blue-600 justify-end' : 'bg-slate-200 border-slate-300 justify-start'}`}
    >
      <Span className="h-5 w-5 rounded-full bg-white shadow-sm" />
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
  return (
    <ScrollDiv className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <Div className="w-full mx-auto max-w-6xl">
        {/* Page Title */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
          <Div className="flex items-center gap-2">
            <Div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
              <UiIcon as={Settings} className="w-3.5 h-3.5 text-white" />
            </Div>
            <H1 className="text-lg font-bold text-slate-900">3rd Party Configuration</H1>
          </Div>
        </Div>

        {/* Services by Category */}
        <Div className="space-y-4">
          {categories.map((category) => {
            const categoryServices = services.filter((s) => s.category === category);
            return (
              <Div key={category} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                <H2 className="text-sm font-semibold text-slate-900 mb-3">{category}</H2>
                <Div className="space-y-3">
                  {categoryServices.map((service) => (
                    <Div key={service.id} className="border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
                      <Div className="flex items-start justify-between mb-2">
                        <Div className="flex-1">
                          <Div className="flex items-center gap-2 mb-1">
                            <H3 className="text-xs font-semibold text-slate-900">{service.name}</H3>
                            <Div className="flex items-center gap-1">
                              {service.configured ? (
                                <>
                                  <UiIcon as={CheckCircle} className="w-3.5 h-3.5 text-green-600" />
                                  <Span className="text-[10px] text-green-600">Configured</Span>
                                </>
                              ) : (
                                <>
                                  <UiIcon as={XCircle} className="w-3.5 h-3.5 text-red-600" />
                                  <Span className="text-[10px] text-red-600">Not Configured</Span>
                                </>
                              )}
                            </Div>
                          </Div>
                          <P className="text-[10px] text-slate-600">{service.description}</P>
                        </Div>
                        <Div className="flex items-center gap-3">
                          <ToggleSwitch enabled={service.enabled} onToggle={() => handleToggle(service.id)} />
                          <Button
                            type="button"
                            onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {expandedService === service.id ? 'Hide' : 'Configure'}
                          </Button>
                        </Div>
                      </Div>

                      {/* Configuration Fields */}
                      {expandedService === service.id && (
                        <Div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                          {service.fields.map((field) => {
                            const fieldKey = `${service.id}-${field.key}`;
                            const isPassword = field.type === 'password';
                            const isVisible = visibleFields[fieldKey];
                            const value = fieldValues[fieldKey] || field.value || '';
                            return (
                              <Div key={field.key}>
                                <Label className="block text-xs font-semibold text-slate-700 mb-1.5">{field.label}</Label>
                                <Div className="relative">
                                  <Input
                                    type={isPassword && !isVisible ? 'password' : 'text'}
                                    value={value}
                                    onChange={(e) => handleFieldChange(service.id, field.key, e.target.value)}
                                    placeholder={`Enter ${field.label.toLowerCase()}`}
                                    className="w-full px-3 py-2 pr-10 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                  {isPassword && (
                                    <Button
                                      type="button"
                                      onClick={() => toggleFieldVisibility(service.id, field.key)}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                                    >
                                      {isVisible ? <UiIcon as={EyeOff} className="w-3.5 h-3.5" /> : <UiIcon as={Eye} className="w-3.5 h-3.5" />}
                                    </Button>
                                  )}
                                </Div>
                              </Div>
                            );
                          })}
                          <Div className="flex justify-end gap-2 pt-2">
                            <Button
                              type="button"
                              onClick={() => handleReset(service.id)}
                              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              Reset
                            </Button>
                            <Button
                              type="button"
                              onClick={() => handleSave(service.id)}
                              className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Save
                            </Button>
                          </Div>
                        </Div>
                      )}
                    </Div>
                  ))}
                </Div>
              </Div>
            );
          })}
        </Div>
      </Div>
    </ScrollDiv>
  );
}
