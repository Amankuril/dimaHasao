/* Ported from Frontend/src/modules/Food/pages/admin/system/FirebaseNotification.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Cloud, Settings, Info } from 'lucide-react-native';
import {
  AdminPage,
  PageHeader,
  Card,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { A, Button, Div, Form, HScroll, Input, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import { alert } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const languageTabs = [
  {
    key: 'default',
    label: 'Default',
  },
  {
    key: 'en',
    label: 'English(EN)',
  },
  {
    key: 'bn',
    label: 'Bengali - à¦¬à¦¾à¦‚à¦²à¦¾(BN)',
  },
  {
    key: 'ar',
    label: 'Arabic - Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© (AR)',
  },
  {
    key: 'es',
    label: 'Spanish - español(ES)',
  },
];
const notificationMessages = [
  {
    id: 1,
    key: 'orderPending',
    label: 'Order pending message',
    defaultText: 'Your order {orderId} is pending',
    enabled: true,
  },
  {
    id: 2,
    key: 'orderConfirmation',
    label: 'Order confirmation message',
    defaultText: 'Your order {orderId} has been confirmed',
    enabled: true,
  },
  {
    id: 3,
    key: 'orderProcessing',
    label: 'Order processing message',
    defaultText: 'Your order {orderId} is being processed',
    enabled: true,
  },
  {
    id: 4,
    key: 'restaurantHandover',
    label: 'Restaurant handover message',
    defaultText: 'Your order {orderId} has been handed over to restaurant {restaurantName}',
    enabled: true,
  },
  {
    id: 5,
    key: 'orderOutForDelivery',
    label: 'Order out for delivery message',
    defaultText: 'Your order {orderId} is out for delivery',
    enabled: true,
  },
  {
    id: 6,
    key: 'orderDelivered',
    label: 'Order delivered message',
    defaultText: 'Your order {orderId} has been delivered',
    enabled: true,
  },
  {
    id: 7,
    key: 'deliverymanAssign',
    label: 'Deliveryman assign message',
    defaultText: 'Deliveryman {userName} has been assigned to your order {orderId}',
    enabled: true,
  },
  {
    id: 8,
    key: 'deliverymanDelivered',
    label: 'Deliveryman delivered message',
    defaultText: 'Deliveryman {userName} has delivered your order {orderId}',
    enabled: true,
  },
  {
    id: 9,
    key: 'orderCanceled',
    label: 'Order canceled message',
    defaultText: 'Your order {orderId} has been canceled',
    enabled: true,
  },
  {
    id: 10,
    key: 'orderRefunded',
    label: 'Order refunded message',
    defaultText: 'Your order {orderId} has been refunded',
    enabled: true,
  },
  {
    id: 11,
    key: 'orderRefundCancel',
    label: 'Order Refund cancel message',
    defaultText: 'Refund for order {orderId} has been canceled',
    enabled: true,
  },
  {
    id: 12,
    key: 'offlineOrderDeny',
    label: 'Offline order deny message',
    defaultText: 'Ex : Your offline payment is denied',
    enabled: false,
  },
  {
    id: 13,
    key: 'offlineOrderAccept',
    label: 'Offline order accept message',
    defaultText: 'Ex : Your offline payment is accepted',
    enabled: false,
  },
];
function ToggleSwitch({ enabled, onToggle, label }) {
  return (
    <Button type="button" onClick={onToggle} accessibilityLabel={label} className="w-11 h-11 flex-row items-center justify-end shrink-0">
      <Div className={`flex-row items-center w-11 h-6 rounded-full border px-0.5 ${enabled ? 'bg-blue-600 border-blue-600 justify-end' : 'bg-slate-200 border-slate-300 justify-start'}`}>
        <Span className="h-5 w-5 rounded-full bg-white" />
      </Div>
    </Button>
  );
}
const TEXTAREA = 'px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900';
export default function FirebaseNotification() {
  const { tablet } = useLayoutWidth();
  const col = tablet ? { width: '48.5%' } : { width: '100%' };
  const [activeTab, setActiveTab] = useState('push-notification');
  const [activeLanguage, setActiveLanguage] = useState('bn');
  const [messages, setMessages] = useState(notificationMessages);
  const [firebaseConfig, setFirebaseConfig] = useState({
    serviceFileContent: '',
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    fcmProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  });
  const handleMessageToggle = (id) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id
          ? {
              ...msg,
              enabled: !msg.enabled,
            }
          : msg,
      ),
    );
  };
  const handleMessageChange = (id, value) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id
          ? {
              ...msg,
              defaultText: value,
            }
          : msg,
      ),
    );
  };
  const handleFirebaseConfigChange = (key, value) => {
    setFirebaseConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    debugLog('Form submitted:', {
      activeTab,
      messages,
      firebaseConfig,
    });
    alert('Firebase Notification settings saved successfully!');
  };
  const handleReset = () => {
    setMessages(notificationMessages);
    setFirebaseConfig({
      serviceFileContent: '',
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      fcmProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
    });
  };
  const CONFIG_FIELDS = [
    { key: 'fcmProjectId', label: 'FCM Project ID' },
    { key: 'authDomain', label: 'Auth Domain' },
    { key: 'messagingSenderId', label: 'Messaging Sender Id' },
    { key: 'appId', label: 'App Id' },
    { key: 'storageBucket', label: 'Storage Bucket' },
    { key: 'measurementId', label: 'Measurement Id', placeholder: 'Ex: F-12345678' },
  ];
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={Cloud}
        title="Firebase Push Notification Setup"
        subtitle="Message templates and Firebase credentials"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'Firebase notifications' }]}
        actions={
          <A href="#" className="flex-row items-center gap-1 h-11">
            <Span className="text-sm font-semibold text-blue-600">
              {activeTab === 'push-notification' ? 'Read documentation' : 'Where to get this information'}
            </Span>
            <UiIcon as={Info} size={14} className="text-blue-600" />
          </A>
        }
      />

      <Card className="mb-4" padded={false}>
        <Div className="flex-row flex-wrap gap-2 p-2">
          <Button
            onClick={() => setActiveTab('push-notification')}
            className={`flex-row items-center justify-center gap-1.5 h-11 px-4 rounded-lg ${activeTab === 'push-notification' ? 'bg-blue-600' : 'bg-white'}`}
          >
            <UiIcon as={Settings} size={14} className={activeTab === 'push-notification' ? 'text-white' : 'text-slate-600'} />
            <Span className={activeTab === 'push-notification' ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-600'}>Push Notification</Span>
          </Button>
          <Button
            onClick={() => setActiveTab('firebase-configuration')}
            className={`flex-row items-center justify-center gap-1.5 h-11 px-4 rounded-lg ${activeTab === 'firebase-configuration' ? 'bg-blue-600' : 'bg-white'}`}
          >
            <UiIcon as={Cloud} size={14} className={activeTab === 'firebase-configuration' ? 'text-white' : 'text-slate-600'} />
            <Span className={activeTab === 'firebase-configuration' ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-600'}>Firebase Configuration</Span>
          </Button>
        </Div>
      </Card>

      {activeTab === 'push-notification' ? (
        <Div className="gap-3">
          <Card padded={false}>
            <HScroll contentClassName="flex-row items-center gap-2 p-2">
              {languageTabs.map((tab) => (
                <Button
                  key={tab.key}
                  onClick={() => setActiveLanguage(tab.key)}
                  className={`flex-row items-center justify-center h-11 px-3 rounded-lg ${activeLanguage === tab.key ? 'bg-blue-100' : 'bg-white'}`}
                >
                  <Span className={activeLanguage === tab.key ? 'text-sm font-semibold text-blue-700' : 'text-sm font-semibold text-slate-600'}>{tab.label}</Span>
                </Button>
              ))}
            </HScroll>
          </Card>

          <Card>
            <Div className="gap-4">
              {messages.map((message, i) => (
                <Div key={message.id} className={`gap-2 ${i === messages.length - 1 ? '' : 'pb-4 border-b border-slate-100'}`}>
                  <Div className="flex-row items-start gap-3">
                    <Text style={tw`text-sm font-medium text-slate-700 flex-1`} numberOfLines={2}>
                      {message.label}
                    </Text>
                    <ToggleSwitch enabled={message.enabled} onToggle={() => handleMessageToggle(message.id)} label={`Toggle ${message.label}`} />
                  </Div>
                  <Textarea
                    value={message.defaultText}
                    onChange={(e) => handleMessageChange(message.id, e.target.value)}
                    rows={2}
                    className={TEXTAREA}
                    placeholder="Enter notification message"
                  />
                </Div>
              ))}
            </Div>
          </Card>

          <Div className="flex-row flex-wrap justify-end gap-2">
            <Button type="button" onClick={handleReset} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
            </Button>
            <Button type="button" onClick={handleSubmit} className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>Submit</Span>
            </Button>
          </Div>
        </Div>
      ) : null}

      {activeTab === 'firebase-configuration' ? (
        <Card>
          <Form onSubmit={handleSubmit}>
            <Div className="gap-3 mb-4">
              <Field label="Service File Content" hint="Paste the JSON from your Firebase service account file">
                <Textarea
                  value={firebaseConfig.serviceFileContent}
                  onChange={(e) => handleFirebaseConfigChange('serviceFileContent', e.target.value)}
                  rows={6}
                  placeholder="Paste your Firebase service file content here"
                  className={TEXTAREA}
                />
              </Field>
              <Field label="Api Key">
                <Input type="text" value={firebaseConfig.apiKey} onChange={(e) => handleFirebaseConfigChange('apiKey', e.target.value)} className={INPUT} />
              </Field>
            </Div>

            <Div className="flex-row flex-wrap gap-3 mb-4">
              {CONFIG_FIELDS.map((f) => (
                <Div key={f.key} style={col}>
                  <Field label={f.label}>
                    <Input
                      type="text"
                      value={firebaseConfig[f.key]}
                      onChange={(e) => handleFirebaseConfigChange(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className={INPUT}
                    />
                  </Field>
                </Div>
              ))}
            </Div>

            <Div className="flex-row justify-end">
              <Button type="submit" className={BTN_PRIMARY}>
                <Span className={BTN_TEXT_PRIMARY}>Submit</Span>
              </Button>
            </Div>
          </Form>
        </Card>
      ) : null}
    </AdminPage>
  );
}
