/* Ported from Frontend/src/modules/Food/pages/admin/system/FirebaseNotification.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Cloud, Settings, Info } from 'lucide-react-native';
import { A, Button, Div, Form, H1, HScroll, Input, Label, ScrollDiv, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
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
export default function FirebaseNotification() {
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
  return (
    <ScrollDiv className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <Div className="w-full mx-auto max-w-6xl">
        {/* Page Title */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
          <Div className="flex items-center justify-between">
            <Div className="flex items-center gap-2">
              <Div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
                <UiIcon as={Cloud} className="w-3.5 h-3.5 text-white" />
              </Div>
              <H1 className="text-lg font-bold text-slate-900">Firebase Push Notification Setup</H1>
            </Div>
            {activeTab === 'push-notification' && (
              <A href="#" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                Read Documentation
                <UiIcon as={Info} className="w-3 h-3" />
              </A>
            )}
            {activeTab === 'firebase-configuration' && (
              <A href="#" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                Where to get this information
                <UiIcon as={Info} className="w-3 h-3" />
              </A>
            )}
          </Div>
        </Div>

        {/* Primary Tabs */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 mb-3">
          <Div className="flex gap-2">
            <Button
              onClick={() => setActiveTab('push-notification')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${activeTab === 'push-notification' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <UiIcon as={Settings} className="w-3.5 h-3.5" />
              <Span>Push Notification</Span>
            </Button>
            <Button
              onClick={() => setActiveTab('firebase-configuration')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${activeTab === 'firebase-configuration' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <UiIcon as={Cloud} className="w-3.5 h-3.5" />
              <UiIcon as={Settings} className="w-3.5 h-3.5" />
              <Span>Firebase Configuration</Span>
            </Button>
          </Div>
        </Div>

        {/* Push Notification Tab Content */}
        {activeTab === 'push-notification' && (
          <Div className="space-y-3">
            {/* Language Tabs */}
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 mb-3">
              <HScroll className="flex items-center gap-2">
                {languageTabs.map((tab) => (
                  <Button
                    key={tab.key}
                    onClick={() => setActiveLanguage(tab.key)}
                    className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${activeLanguage === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
                  >
                    {tab.label}
                  </Button>
                ))}
              </HScroll>
            </Div>

            {/* Notification Messages */}
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <Div className="space-y-4">
                {messages.map((message) => (
                  <Div key={message.id} className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
                    <Div className="flex items-start justify-between gap-4 mb-2">
                      <Label className="text-xs font-semibold text-slate-700 flex-1">{message.label}</Label>
                      <ToggleSwitch enabled={message.enabled} onToggle={() => handleMessageToggle(message.id)} />
                    </Div>
                    <Textarea
                      value={message.defaultText}
                      onChange={(e) => handleMessageChange(message.id, e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Enter notification message"
                    />
                  </Div>
                ))}
              </Div>
            </Div>
          </Div>
        )}

        {/* Firebase Configuration Tab Content */}
        {activeTab === 'firebase-configuration' && (
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <Form onSubmit={handleSubmit}>
              {/* Service File Content */}
              <Div className="mb-4">
                <Label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                  Service File Content
                  <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                </Label>
                <Textarea
                  value={firebaseConfig.serviceFileContent}
                  onChange={(e) => handleFirebaseConfigChange('serviceFileContent', e.target.value)}
                  rows={6}
                  placeholder="Paste your Firebase service file content here"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono"
                />
              </Div>

              {/* API Key */}
              <Div className="mb-4">
                <Label className="block text-xs font-semibold text-slate-700 mb-1.5">Api Key</Label>
                <Input
                  type="text"
                  value={firebaseConfig.apiKey}
                  onChange={(e) => handleFirebaseConfigChange('apiKey', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </Div>

              {/* Firebase Configuration Fields */}
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5">FCM Project ID</Label>
                  <Input
                    type="text"
                    value={firebaseConfig.fcmProjectId}
                    onChange={(e) => handleFirebaseConfigChange('fcmProjectId', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>

                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5">Auth Domain</Label>
                  <Input
                    type="text"
                    value={firebaseConfig.authDomain}
                    onChange={(e) => handleFirebaseConfigChange('authDomain', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>

                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5">Messaging Sender Id</Label>
                  <Input
                    type="text"
                    value={firebaseConfig.messagingSenderId}
                    onChange={(e) => handleFirebaseConfigChange('messagingSenderId', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>

                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5">App Id</Label>
                  <Input
                    type="text"
                    value={firebaseConfig.appId}
                    onChange={(e) => handleFirebaseConfigChange('appId', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>

                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5">Storage Bucket</Label>
                  <Input
                    type="text"
                    value={firebaseConfig.storageBucket}
                    onChange={(e) => handleFirebaseConfigChange('storageBucket', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>

                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5">Measurement Id</Label>
                  <Input
                    type="text"
                    value={firebaseConfig.measurementId}
                    onChange={(e) => handleFirebaseConfigChange('measurementId', e.target.value)}
                    placeholder="Ex: F-12345678"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
              </Div>

              {/* Submit Button */}
              <Div className="flex justify-end">
                <Button type="submit" className="px-6 py-2.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Submit
                </Button>
              </Div>
            </Form>
          </Div>
        )}

        {/* Action Buttons (for Push Notification tab) */}
        {activeTab === 'push-notification' && (
          <Div className="flex justify-end gap-2 mt-3">
            <Button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Reset
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit
            </Button>
          </Div>
        )}
      </Div>
    </ScrollDiv>
  );
}
