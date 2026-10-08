/* Ported from Frontend/src/modules/Food/pages/admin/system/AppWebSettings.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Settings, Info, Smartphone, Apple } from 'lucide-react-native';
import { Button, Div, H1, H2, Input, Label, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
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
export default function AppWebSettings() {
  const [generalSettings, setGeneralSettings] = useState({
    popularFoods: true,
    newRestaurants: true,
    popularRestaurants: true,
    mostReviewedFoods: true,
  });
  const [userAppAndroid, setUserAppAndroid] = useState({
    minVersion: '',
    downloadUrl: '',
  });
  const [userAppIOS, setUserAppIOS] = useState({
    minVersion: '',
    downloadUrl: '',
  });
  const [restaurantAppAndroid, setRestaurantAppAndroid] = useState({
    minVersion: '',
    downloadUrl: '',
  });
  const [restaurantAppIOS, setRestaurantAppIOS] = useState({
    minVersion: '',
    downloadUrl: '',
  });
  const [deliverymanAppAndroid, setDeliverymanAppAndroid] = useState({
    minVersion: '',
    downloadUrl: '',
  });
  const [deliverymanAppIOS, setDeliverymanAppIOS] = useState({
    minVersion: '',
    downloadUrl: '',
  });
  const handleGeneralToggle = (key) => {
    setGeneralSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  const handleUserAppAndroidReset = () => {
    setUserAppAndroid({
      minVersion: '',
      downloadUrl: '',
    });
  };
  const handleUserAppIOSReset = () => {
    setUserAppIOS({
      minVersion: '',
      downloadUrl: '',
    });
  };
  const handleRestaurantAppAndroidReset = () => {
    setRestaurantAppAndroid({
      minVersion: '',
      downloadUrl: '',
    });
  };
  const handleRestaurantAppIOSReset = () => {
    setRestaurantAppIOS({
      minVersion: '',
      downloadUrl: '',
    });
  };
  const handleDeliverymanAppAndroidReset = () => {
    setDeliverymanAppAndroid({
      minVersion: '',
      downloadUrl: '',
    });
  };
  const handleDeliverymanAppIOSReset = () => {
    setDeliverymanAppIOS({
      minVersion: '',
      downloadUrl: '',
    });
  };
  return (
    <ScrollDiv className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <Div className="w-full mx-auto max-w-6xl">
        {/* Page Title */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
          <Div className="flex items-center gap-2">
            <Div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
              <UiIcon as={Settings} className="w-3.5 h-3.5 text-white" />
            </Div>
            <H1 className="text-lg font-bold text-slate-900">App & Web Settings</H1>
          </Div>
        </Div>

        {/* General Web Settings */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-3">
          <H2 className="text-sm font-semibold text-slate-900 mb-4">General Web Settings</H2>
          <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Div className="flex items-center justify-between">
              <Div className="flex items-center gap-2">
                <Span className="text-xs text-slate-700">Popular Foods</Span>
                <UiIcon as={Info} className="w-3.5 h-3.5 text-slate-400" />
              </Div>
              <ToggleSwitch enabled={generalSettings.popularFoods} onToggle={() => handleGeneralToggle('popularFoods')} />
            </Div>
            <Div className="flex items-center justify-between">
              <Div className="flex items-center gap-2">
                <Span className="text-xs text-slate-700">New Restaurants</Span>
                <UiIcon as={Info} className="w-3.5 h-3.5 text-slate-400" />
              </Div>
              <ToggleSwitch enabled={generalSettings.newRestaurants} onToggle={() => handleGeneralToggle('newRestaurants')} />
            </Div>
            <Div className="flex items-center justify-between">
              <Div className="flex items-center gap-2">
                <Span className="text-xs text-slate-700">Popular Restaurants</Span>
                <UiIcon as={Info} className="w-3.5 h-3.5 text-slate-400" />
              </Div>
              <ToggleSwitch enabled={generalSettings.popularRestaurants} onToggle={() => handleGeneralToggle('popularRestaurants')} />
            </Div>
            <Div className="flex items-center justify-between">
              <Div className="flex items-center gap-2">
                <Span className="text-xs text-slate-700">Most Reviewed Foods</Span>
                <UiIcon as={Info} className="w-3.5 h-3.5 text-slate-400" />
              </Div>
              <ToggleSwitch enabled={generalSettings.mostReviewedFoods} onToggle={() => handleGeneralToggle('mostReviewedFoods')} />
            </Div>
          </Div>
        </Div>

        {/* User App Version Control */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-3">
          <Div className="flex items-center gap-2 mb-4">
            <UiIcon as={Settings} className="w-4 h-4 text-slate-600" />
            <H2 className="text-sm font-semibold text-slate-900">User App Version Control</H2>
          </Div>

          <Div className="space-y-4">
            {/* For Android */}
            <Div>
              <Div className="flex items-center gap-2 mb-3">
                <UiIcon as={Smartphone} className="w-4 h-4 text-green-600" />
                <Span className="text-xs font-semibold text-slate-700">For Android</Span>
              </Div>
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    Minimum User App Version for Force Update (Android)
                    <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                  </Label>
                  <Input
                    type="text"
                    value={userAppAndroid.minVersion}
                    onChange={(e) =>
                      setUserAppAndroid((prev) => ({
                        ...prev,
                        minVersion: e.target.value,
                      }))
                    }
                    placeholder="App minimum version"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    Download URL for User App (Android)
                    <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                  </Label>
                  <Input
                    type="text"
                    value={userAppAndroid.downloadUrl}
                    onChange={(e) =>
                      setUserAppAndroid((prev) => ({
                        ...prev,
                        downloadUrl: e.target.value,
                      }))
                    }
                    placeholder="Download Url"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
              </Div>
            </Div>

            {/* For IOS */}
            <Div>
              <Div className="flex items-center gap-2 mb-3">
                <UiIcon as={Apple} className="w-4 h-4 text-slate-700" />
                <Span className="text-xs font-semibold text-slate-700">For IOS</Span>
              </Div>
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    Minimum User App Version for Force Update (Ios)
                    <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                  </Label>
                  <Input
                    type="text"
                    value={userAppIOS.minVersion}
                    onChange={(e) =>
                      setUserAppIOS((prev) => ({
                        ...prev,
                        minVersion: e.target.value,
                      }))
                    }
                    placeholder="App minimum version"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    Download URL for User App (Ios)
                    <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                  </Label>
                  <Input
                    type="text"
                    value={userAppIOS.downloadUrl}
                    onChange={(e) =>
                      setUserAppIOS((prev) => ({
                        ...prev,
                        downloadUrl: e.target.value,
                      }))
                    }
                    placeholder="Download Url"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
              </Div>
            </Div>
          </Div>

          <Div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              onClick={handleUserAppAndroidReset}
              className="px-4 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Reset
            </Button>
            <Button type="button" className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Submit
            </Button>
          </Div>
        </Div>

        {/* Restaurant App Version Control */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-3">
          <Div className="flex items-center gap-2 mb-4">
            <UiIcon as={Settings} className="w-4 h-4 text-slate-600" />
            <H2 className="text-sm font-semibold text-slate-900">Restaurant App Version Control</H2>
          </Div>

          <Div className="space-y-4">
            {/* For Android */}
            <Div>
              <Div className="flex items-center gap-2 mb-3">
                <UiIcon as={Smartphone} className="w-4 h-4 text-green-600" />
                <Span className="text-xs font-semibold text-slate-700">For Android</Span>
              </Div>
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    Minimum Restaurant App Version for Force Update (Android)
                    <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                  </Label>
                  <Input
                    type="text"
                    value={restaurantAppAndroid.minVersion}
                    onChange={(e) =>
                      setRestaurantAppAndroid((prev) => ({
                        ...prev,
                        minVersion: e.target.value,
                      }))
                    }
                    placeholder="App minimum version"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    Download URL for Restaurant App (Android)
                    <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                  </Label>
                  <Input
                    type="text"
                    value={restaurantAppAndroid.downloadUrl}
                    onChange={(e) =>
                      setRestaurantAppAndroid((prev) => ({
                        ...prev,
                        downloadUrl: e.target.value,
                      }))
                    }
                    placeholder="Download Url"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
              </Div>
            </Div>

            {/* For IOS */}
            <Div>
              <Div className="flex items-center gap-2 mb-3">
                <UiIcon as={Apple} className="w-4 h-4 text-slate-700" />
                <Span className="text-xs font-semibold text-slate-700">For IOS</Span>
              </Div>
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    Minimum Restaurant App Version for Force Update (Ios)
                    <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                  </Label>
                  <Input
                    type="text"
                    value={restaurantAppIOS.minVersion}
                    onChange={(e) =>
                      setRestaurantAppIOS((prev) => ({
                        ...prev,
                        minVersion: e.target.value,
                      }))
                    }
                    placeholder="App minimum version"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    Download URL for Restaurant App (Ios)
                    <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                  </Label>
                  <Input
                    type="text"
                    value={restaurantAppIOS.downloadUrl}
                    onChange={(e) =>
                      setRestaurantAppIOS((prev) => ({
                        ...prev,
                        downloadUrl: e.target.value,
                      }))
                    }
                    placeholder="Download Url"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
              </Div>
            </Div>
          </Div>

          <Div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              onClick={handleRestaurantAppAndroidReset}
              className="px-4 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Reset
            </Button>
            <Button type="button" className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Submit
            </Button>
          </Div>
        </Div>

        {/* Deliveryman App Version Control */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <Div className="flex items-center gap-2 mb-4">
            <UiIcon as={Settings} className="w-4 h-4 text-slate-600" />
            <H2 className="text-sm font-semibold text-slate-900">Deliveryman App Version Control</H2>
          </Div>

          <Div className="space-y-4">
            {/* For Android */}
            <Div>
              <Div className="flex items-center gap-2 mb-3">
                <UiIcon as={Smartphone} className="w-4 h-4 text-green-600" />
                <Span className="text-xs font-semibold text-slate-700">For Android</Span>
              </Div>
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    Minimum Deliveryman App Version for Force Update (Android)
                    <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                  </Label>
                  <Input
                    type="text"
                    value={deliverymanAppAndroid.minVersion}
                    onChange={(e) =>
                      setDeliverymanAppAndroid((prev) => ({
                        ...prev,
                        minVersion: e.target.value,
                      }))
                    }
                    placeholder="App minimum version"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    Download URL for Deliveryman App (Android)
                    <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                  </Label>
                  <Input
                    type="text"
                    value={deliverymanAppAndroid.downloadUrl}
                    onChange={(e) =>
                      setDeliverymanAppAndroid((prev) => ({
                        ...prev,
                        downloadUrl: e.target.value,
                      }))
                    }
                    placeholder="Download Url"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
              </Div>
            </Div>

            {/* For IOS */}
            <Div>
              <Div className="flex items-center gap-2 mb-3">
                <UiIcon as={Apple} className="w-4 h-4 text-slate-700" />
                <Span className="text-xs font-semibold text-slate-700">For IOS</Span>
              </Div>
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    Minimum Deliveryman App Version for Force Update (Ios)
                    <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                  </Label>
                  <Input
                    type="text"
                    value={deliverymanAppIOS.minVersion}
                    onChange={(e) =>
                      setDeliverymanAppIOS((prev) => ({
                        ...prev,
                        minVersion: e.target.value,
                      }))
                    }
                    placeholder="App minimum version"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    Download URL for Deliveryman App (Ios)
                    <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                  </Label>
                  <Input
                    type="text"
                    value={deliverymanAppIOS.downloadUrl}
                    onChange={(e) =>
                      setDeliverymanAppIOS((prev) => ({
                        ...prev,
                        downloadUrl: e.target.value,
                      }))
                    }
                    placeholder="Download Url"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
              </Div>
            </Div>
          </Div>

          <Div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              onClick={handleDeliverymanAppAndroidReset}
              className="px-4 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Reset
            </Button>
            <Button type="button" className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Submit
            </Button>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
