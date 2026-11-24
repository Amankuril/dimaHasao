import { useState } from "react"
import { Bot, Settings, Info, Store } from "lucide-react"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


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

export default function AISetup() {
  const [activeTab, setActiveTab] = useState("ai-configuration")
  const [isEnabled, setIsEnabled] = useState(true)
  const [apiKey, setApiKey] = useState("")
  const [organization, setOrganization] = useState("")
  const [sectionWiseLimit, setSectionWiseLimit] = useState("60")
  const [imageUploadLimit, setImageUploadLimit] = useState("20")

  const handleReset = () => {
    setApiKey("")
    setOrganization("")
  }

  const handleAIConfigSave = (e) => {
    e.preventDefault()
    debugLog("Saving AI Configuration:", { apiKey, organization, isEnabled })
    alert("AI Configuration saved successfully!")
  }

  const handleAISettingsReset = () => {
    setSectionWiseLimit("60")
    setImageUploadLimit("20")
  }

  const handleAISettingsSave = (e) => {
    e.preventDefault()
    debugLog("Saving AI Settings:", { sectionWiseLimit, imageUploadLimit })
    alert("AI Settings saved successfully!")
  }

  return (
    <div className="p-2 lg:p-3 bg-neutral-50 min-h-screen">
      <div className="w-full mx-auto max-w-5xl">
        {/* Page Title */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-lg font-medium text-neutral-900">OpenAI configuration</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-2 mb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("ai-configuration")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "ai-configuration"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              AI configuration
            </button>
            <button
              onClick={() => setActiveTab("ai-settings")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "ai-settings"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              AI settings
            </button>
          </div>
        </div>

        {/* AI Configuration Content */}
        {activeTab === "ai-configuration" && (
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-neutral-600" />
                <h2 className="text-sm font-medium text-neutral-900">OpenAI configuration</h2>
              </div>
              <a
                href="#"
                className="flex items-center gap-1 text-xs text-[#0a4d2b] hover:underline"
              >
                How it Works
                <Info className="w-3 h-3" />
              </a>
            </div>

            <form onSubmit={handleAIConfigSave}>
              {/* Toggle Switch */}
              <div className="flex items-center justify-between mb-4 p-3 bg-neutral-50 rounded-lg">
                <span className="text-xs font-medium text-neutral-700">Turn OFF</span>
                <ToggleSwitch
                  enabled={isEnabled}
                  onToggle={() => setIsEnabled(!isEnabled)}
                />
              </div>

              {/* API Key Input */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  OpenAI API key
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Ex: sk-proj-K0LhsdcbHJ...."
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                />
              </div>

              {/* Organization Input */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  OpenAI organization
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Ex: org-xxxxxxxxxxxx"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-medium bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        )}

        {/* AI Settings Content */}
        {activeTab === "ai-settings" && (
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
            <form onSubmit={handleAISettingsSave}>
              {/* Restaurant Limits Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Store className="w-4 h-4 text-neutral-600" />
                  <h2 className="text-sm font-medium text-neutral-900">Restaurant limits on using AI</h2>
                </div>

                {/* Section Wise Data Generation */}
                <div className="mb-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <p className="text-xs text-neutral-600 mb-3">
                    Set how many times AI can generate data for each element of the restaurant panel or app
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                      Section wise data generation limit
                    </label>
                    <input
                      type="number"
                      value={sectionWiseLimit}
                      onChange={(e) => setSectionWiseLimit(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                    />
                  </div>
                </div>

                {/* Image Based Data Generation */}
                <div className="mb-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <p className="text-xs text-neutral-600 mb-3">
                    Set how many times AI can generate data from an image upload
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                      Image upload generation limit
                    </label>
                    <input
                      type="number"
                      value={imageUploadLimit}
                      onChange={(e) => setImageUploadLimit(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleAISettingsReset}
                  className="px-4 py-2 text-xs font-medium bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Save information
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

