import { useState } from "react"
import { Settings, Info, Smartphone, Apple } from "lucide-react"

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

export default function AppWebSettings() {
  const [generalSettings, setGeneralSettings] = useState({
    popularFoods: true,
    newRestaurants: true,
    popularRestaurants: true,
    mostReviewedFoods: true
  })

  const [userAppAndroid, setUserAppAndroid] = useState({
    minVersion: "",
    downloadUrl: ""
  })

  const [userAppIOS, setUserAppIOS] = useState({
    minVersion: "",
    downloadUrl: ""
  })

  const [restaurantAppAndroid, setRestaurantAppAndroid] = useState({
    minVersion: "",
    downloadUrl: ""
  })

  const [restaurantAppIOS, setRestaurantAppIOS] = useState({
    minVersion: "",
    downloadUrl: ""
  })

  const [deliverymanAppAndroid, setDeliverymanAppAndroid] = useState({
    minVersion: "",
    downloadUrl: ""
  })

  const [deliverymanAppIOS, setDeliverymanAppIOS] = useState({
    minVersion: "",
    downloadUrl: ""
  })

  const handleGeneralToggle = (key) => {
    setGeneralSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleUserAppAndroidReset = () => {
    setUserAppAndroid({ minVersion: "", downloadUrl: "" })
  }

  const handleUserAppIOSReset = () => {
    setUserAppIOS({ minVersion: "", downloadUrl: "" })
  }

  const handleRestaurantAppAndroidReset = () => {
    setRestaurantAppAndroid({ minVersion: "", downloadUrl: "" })
  }

  const handleRestaurantAppIOSReset = () => {
    setRestaurantAppIOS({ minVersion: "", downloadUrl: "" })
  }

  const handleDeliverymanAppAndroidReset = () => {
    setDeliverymanAppAndroid({ minVersion: "", downloadUrl: "" })
  }

  const handleDeliverymanAppIOSReset = () => {
    setDeliverymanAppIOS({ minVersion: "", downloadUrl: "" })
  }

  return (
    <div className="p-2 lg:p-3 bg-neutral-50 min-h-screen">
      <div className="w-full mx-auto max-w-6xl">
        {/* Page Title */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center">
              <Settings className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-lg font-medium text-neutral-900">App & web settings</h1>
          </div>
        </div>

        {/* General Web Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 mb-3">
          <h2 className="text-sm font-medium text-neutral-900 mb-4">General web settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-700">Popular foods</span>
                <Info className="w-3.5 h-3.5 text-neutral-400" />
              </div>
              <ToggleSwitch
                enabled={generalSettings.popularFoods}
                onToggle={() => handleGeneralToggle("popularFoods")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-700">New restaurants</span>
                <Info className="w-3.5 h-3.5 text-neutral-400" />
              </div>
              <ToggleSwitch
                enabled={generalSettings.newRestaurants}
                onToggle={() => handleGeneralToggle("newRestaurants")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-700">Popular restaurants</span>
                <Info className="w-3.5 h-3.5 text-neutral-400" />
              </div>
              <ToggleSwitch
                enabled={generalSettings.popularRestaurants}
                onToggle={() => handleGeneralToggle("popularRestaurants")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-700">Most reviewed foods</span>
                <Info className="w-3.5 h-3.5 text-neutral-400" />
              </div>
              <ToggleSwitch
                enabled={generalSettings.mostReviewedFoods}
                onToggle={() => handleGeneralToggle("mostReviewedFoods")}
              />
            </div>
          </div>
        </div>

        {/* User App Version Control */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 mb-3">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-neutral-600" />
            <h2 className="text-sm font-medium text-neutral-900">User app version control</h2>
          </div>

          <div className="space-y-4">
            {/* For Android */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-neutral-700">For android</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1">
                    Minimum User App Version for Force Update (Android)
                    <Info className="w-3 h-3 text-neutral-400" />
                  </label>
                  <input
                    type="text"
                    value={userAppAndroid.minVersion}
                    onChange={(e) => setUserAppAndroid(prev => ({ ...prev, minVersion: e.target.value }))}
                    placeholder="App minimum version"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1">
                    Download URL for User App (Android)
                    <Info className="w-3 h-3 text-neutral-400" />
                  </label>
                  <input
                    type="text"
                    value={userAppAndroid.downloadUrl}
                    onChange={(e) => setUserAppAndroid(prev => ({ ...prev, downloadUrl: e.target.value }))}
                    placeholder="Download url"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>
              </div>
            </div>

            {/* For IOS */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Apple className="w-4 h-4 text-neutral-700" />
                <span className="text-xs font-medium text-neutral-700">For IOS</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1">
                    Minimum User App Version for Force Update (Ios)
                    <Info className="w-3 h-3 text-neutral-400" />
                  </label>
                  <input
                    type="text"
                    value={userAppIOS.minVersion}
                    onChange={(e) => setUserAppIOS(prev => ({ ...prev, minVersion: e.target.value }))}
                    placeholder="App minimum version"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1">
                    Download URL for User App (Ios)
                    <Info className="w-3 h-3 text-neutral-400" />
                  </label>
                  <input
                    type="text"
                    value={userAppIOS.downloadUrl}
                    onChange={(e) => setUserAppIOS(prev => ({ ...prev, downloadUrl: e.target.value }))}
                    placeholder="Download url"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={handleUserAppAndroidReset}
              className="px-4 py-2 text-xs font-medium bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Submit
            </button>
          </div>
        </div>

        {/* Restaurant App Version Control */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 mb-3">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-neutral-600" />
            <h2 className="text-sm font-medium text-neutral-900">Restaurant app version control</h2>
          </div>

          <div className="space-y-4">
            {/* For Android */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-neutral-700">For android</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1">
                    Minimum Restaurant App Version for Force Update (Android)
                    <Info className="w-3 h-3 text-neutral-400" />
                  </label>
                  <input
                    type="text"
                    value={restaurantAppAndroid.minVersion}
                    onChange={(e) => setRestaurantAppAndroid(prev => ({ ...prev, minVersion: e.target.value }))}
                    placeholder="App minimum version"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1">
                    Download URL for Restaurant App (Android)
                    <Info className="w-3 h-3 text-neutral-400" />
                  </label>
                  <input
                    type="text"
                    value={restaurantAppAndroid.downloadUrl}
                    onChange={(e) => setRestaurantAppAndroid(prev => ({ ...prev, downloadUrl: e.target.value }))}
                    placeholder="Download url"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>
              </div>
            </div>

            {/* For IOS */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Apple className="w-4 h-4 text-neutral-700" />
                <span className="text-xs font-medium text-neutral-700">For IOS</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1">
                    Minimum Restaurant App Version for Force Update (Ios)
                    <Info className="w-3 h-3 text-neutral-400" />
                  </label>
                  <input
                    type="text"
                    value={restaurantAppIOS.minVersion}
                    onChange={(e) => setRestaurantAppIOS(prev => ({ ...prev, minVersion: e.target.value }))}
                    placeholder="App minimum version"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1">
                    Download URL for Restaurant App (Ios)
                    <Info className="w-3 h-3 text-neutral-400" />
                  </label>
                  <input
                    type="text"
                    value={restaurantAppIOS.downloadUrl}
                    onChange={(e) => setRestaurantAppIOS(prev => ({ ...prev, downloadUrl: e.target.value }))}
                    placeholder="Download url"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={handleRestaurantAppAndroidReset}
              className="px-4 py-2 text-xs font-medium bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Submit
            </button>
          </div>
        </div>

        {/* Deliveryman App Version Control */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-neutral-600" />
            <h2 className="text-sm font-medium text-neutral-900">Deliveryman app version control</h2>
          </div>

          <div className="space-y-4">
            {/* For Android */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-neutral-700">For android</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1">
                    Minimum Deliveryman App Version for Force Update (Android)
                    <Info className="w-3 h-3 text-neutral-400" />
                  </label>
                  <input
                    type="text"
                    value={deliverymanAppAndroid.minVersion}
                    onChange={(e) => setDeliverymanAppAndroid(prev => ({ ...prev, minVersion: e.target.value }))}
                    placeholder="App minimum version"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1">
                    Download URL for Deliveryman App (Android)
                    <Info className="w-3 h-3 text-neutral-400" />
                  </label>
                  <input
                    type="text"
                    value={deliverymanAppAndroid.downloadUrl}
                    onChange={(e) => setDeliverymanAppAndroid(prev => ({ ...prev, downloadUrl: e.target.value }))}
                    placeholder="Download url"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>
              </div>
            </div>

            {/* For IOS */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Apple className="w-4 h-4 text-neutral-700" />
                <span className="text-xs font-medium text-neutral-700">For IOS</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1">
                    Minimum Deliveryman App Version for Force Update (Ios)
                    <Info className="w-3 h-3 text-neutral-400" />
                  </label>
                  <input
                    type="text"
                    value={deliverymanAppIOS.minVersion}
                    onChange={(e) => setDeliverymanAppIOS(prev => ({ ...prev, minVersion: e.target.value }))}
                    placeholder="App minimum version"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1">
                    Download URL for Deliveryman App (Ios)
                    <Info className="w-3 h-3 text-neutral-400" />
                  </label>
                  <input
                    type="text"
                    value={deliverymanAppIOS.downloadUrl}
                    onChange={(e) => setDeliverymanAppIOS(prev => ({ ...prev, downloadUrl: e.target.value }))}
                    placeholder="Download url"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={handleDeliverymanAppAndroidReset}
              className="px-4 py-2 text-xs font-medium bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
