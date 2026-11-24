import { useState } from "react"
import { Cloud, Settings, Info } from "lucide-react"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


const languageTabs = [
  { key: "default", label: "Default" },
  { key: "en", label: "English(EN)" },
  { key: "bn", label: "Bengali - à¦¬à¦¾à¦‚à¦²à¦¾(BN)" },
  { key: "ar", label: "Arabic - Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© (AR)" },
  { key: "es", label: "Spanish - español(ES)" }
]

const notificationMessages = [
  {
    id: 1,
    key: "orderPending",
    label: "Order pending message",
    defaultText: "Your order {orderId} is pending",
    enabled: true
  },
  {
    id: 2,
    key: "orderConfirmation",
    label: "Order confirmation message",
    defaultText: "Your order {orderId} has been confirmed",
    enabled: true
  },
  {
    id: 3,
    key: "orderProcessing",
    label: "Order processing message",
    defaultText: "Your order {orderId} is being processed",
    enabled: true
  },
  {
    id: 4,
    key: "restaurantHandover",
    label: "Restaurant handover message",
    defaultText: "Your order {orderId} has been handed over to restaurant {restaurantName}",
    enabled: true
  },
  {
    id: 5,
    key: "orderOutForDelivery",
    label: "Order out for delivery message",
    defaultText: "Your order {orderId} is out for delivery",
    enabled: true
  },
  {
    id: 6,
    key: "orderDelivered",
    label: "Order delivered message",
    defaultText: "Your order {orderId} has been delivered",
    enabled: true
  },
  {
    id: 7,
    key: "deliverymanAssign",
    label: "Deliveryman assign message",
    defaultText: "Deliveryman {userName} has been assigned to your order {orderId}",
    enabled: true
  },
  {
    id: 8,
    key: "deliverymanDelivered",
    label: "Deliveryman delivered message",
    defaultText: "Deliveryman {userName} has delivered your order {orderId}",
    enabled: true
  },
  {
    id: 9,
    key: "orderCanceled",
    label: "Order canceled message",
    defaultText: "Your order {orderId} has been canceled",
    enabled: true
  },
  {
    id: 10,
    key: "orderRefunded",
    label: "Order refunded message",
    defaultText: "Your order {orderId} has been refunded",
    enabled: true
  },
  {
    id: 11,
    key: "orderRefundCancel",
    label: "Order Refund cancel message",
    defaultText: "Refund for order {orderId} has been canceled",
    enabled: true
  },
  {
    id: 12,
    key: "offlineOrderDeny",
    label: "Offline order deny message",
    defaultText: "Ex : Your offline payment is denied",
    enabled: false
  },
  {
    id: 13,
    key: "offlineOrderAccept",
    label: "Offline order accept message",
    defaultText: "Ex : Your offline payment is accepted",
    enabled: false
  }
]

function ToggleSwitch({ enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center w-11 h-6 rounded-full border transition-colors ${
        enabled
          ? "bg-neutral-900 border-[#0a4d2b] justify-end"
          : "bg-neutral-200 border-neutral-300 justify-start"
      }`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
    </button>
  )
}

export default function FirebaseNotification() {
  const [activeTab, setActiveTab] = useState("push-notification")
  const [activeLanguage, setActiveLanguage] = useState("bn")
  const [messages, setMessages] = useState(notificationMessages)
  const [firebaseConfig, setFirebaseConfig] = useState({
    serviceFileContent: "",
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    fcmProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
  })

  const handleMessageToggle = (id) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, enabled: !msg.enabled } : msg
    ))
  }

  const handleMessageChange = (id, value) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, defaultText: value } : msg
    ))
  }

  const handleFirebaseConfigChange = (key, value) => {
    setFirebaseConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    debugLog("Form submitted:", { activeTab, messages, firebaseConfig })
    alert("Firebase Notification settings saved successfully!")
  }

  const handleReset = () => {
    setMessages(notificationMessages)
    setFirebaseConfig({
      serviceFileContent: "",
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    fcmProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
    })
  }

  return (
    <div className="p-2 lg:p-3 bg-neutral-50 min-h-screen">
      <div className="w-full mx-auto max-w-6xl">
        {/* Page Title */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-3 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center">
                <Cloud className="w-3.5 h-3.5 text-white" />
              </div>
              <h1 className="text-lg font-medium text-neutral-900">Firebase push notification setup</h1>
            </div>
            {activeTab === "push-notification" && (
              <a
                href="#"
                className="flex items-center gap-1 text-xs text-[#0a4d2b] hover:underline"
              >
                Read documentation
                <Info className="w-3 h-3" />
              </a>
            )}
            {activeTab === "firebase-configuration" && (
              <a
                href="#"
                className="flex items-center gap-1 text-xs text-[#0a4d2b] hover:underline"
              >
                Where to get this information
                <Info className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Primary Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-2 mb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("push-notification")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                activeTab === "push-notification"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Push notification</span>
            </button>
            <button
              onClick={() => setActiveTab("firebase-configuration")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                activeTab === "firebase-configuration"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <Settings className="w-3.5 h-3.5" />
              <span>Firebase configuration</span>
            </button>
          </div>
        </div>

        {/* Push Notification Tab Content */}
        {activeTab === "push-notification" && (
          <div className="space-y-3">
            {/* Language Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-2 mb-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                {languageTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveLanguage(tab.key)}
                    className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeLanguage === tab.key
                        ? "border-[#0a4d2b] text-[#0a4d2b]"
                        : "border-transparent text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Messages */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="border-b border-neutral-200 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <label className="text-xs font-medium text-neutral-700 flex-1">
                        {message.label}
                      </label>
                      <ToggleSwitch
                        enabled={message.enabled}
                        onToggle={() => handleMessageToggle(message.id)}
                      />
                    </div>
                    <textarea
                      value={message.defaultText}
                      onChange={(e) => handleMessageChange(message.id, e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 resize-none"
                      placeholder="Enter notification message"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Firebase Configuration Tab Content */}
        {activeTab === "firebase-configuration" && (
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
            <form onSubmit={handleSubmit}>
              {/* Service File Content */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1">
                  Service file content
                  <Info className="w-3 h-3 text-neutral-400" />
                </label>
                <textarea
                  value={firebaseConfig.serviceFileContent}
                  onChange={(e) => handleFirebaseConfigChange("serviceFileContent", e.target.value)}
                  rows={6}
                  placeholder="Paste your Firebase service file content here"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 resize-none font-mono"
                />
              </div>

              {/* API Key */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Api key
                </label>
                <input
                  type="text"
                  value={firebaseConfig.apiKey}
                  onChange={(e) => handleFirebaseConfigChange("apiKey", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                />
              </div>

              {/* Firebase Configuration Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    FCM project ID
                  </label>
                  <input
                    type="text"
                    value={firebaseConfig.fcmProjectId}
                    onChange={(e) => handleFirebaseConfigChange("fcmProjectId", e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Auth domain
                  </label>
                  <input
                    type="text"
                    value={firebaseConfig.authDomain}
                    onChange={(e) => handleFirebaseConfigChange("authDomain", e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Messaging sender id
                  </label>
                  <input
                    type="text"
                    value={firebaseConfig.messagingSenderId}
                    onChange={(e) => handleFirebaseConfigChange("messagingSenderId", e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    App id
                  </label>
                  <input
                    type="text"
                    value={firebaseConfig.appId}
                    onChange={(e) => handleFirebaseConfigChange("appId", e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Storage bucket
                  </label>
                  <input
                    type="text"
                    value={firebaseConfig.storageBucket}
                    onChange={(e) => handleFirebaseConfigChange("storageBucket", e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Measurement id
                  </label>
                  <input
                    type="text"
                    value={firebaseConfig.measurementId}
                    onChange={(e) => handleFirebaseConfigChange("measurementId", e.target.value)}
                    placeholder="Ex: F-12345678"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Action Buttons (for Push Notification tab) */}
        {activeTab === "push-notification" && (
          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-xs font-medium bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Submit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


