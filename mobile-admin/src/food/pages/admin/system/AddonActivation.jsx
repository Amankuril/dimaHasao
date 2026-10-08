/* Ported from Frontend/src/modules/Food/pages/admin/system/AddonActivation.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { ChevronDown, Settings } from 'lucide-react-native';
import { Button, Div, H1, H2, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const addons = [
  {
    id: 1,
    title: 'Restaurant app',
    description: 'With this app your vendor will mange their business through mobile app',
    enabled: true,
    hasSettings: true,
  },
  {
    id: 2,
    title: 'Deliveryman app',
    description: 'With this app your all your deliveryman will mange their orders through mobile app',
    enabled: false,
    hasSettings: false,
  },
  {
    id: 3,
    title: 'React user website',
    description: 'With this react website your customers will experience your system in a more attractive and seamless way',
    enabled: false,
    hasSettings: false,
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
export default function AddonActivation() {
  const [addonStates, setAddonStates] = useState(
    addons.reduce((acc, addon) => {
      acc[addon.id] = addon.enabled;
      return acc;
    }, {}),
  );
  const handleToggle = (id) => {
    setAddonStates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };
  const handleView = (id) => {
    debugLog('View addon:', id);
  };
  const handleSettings = (id) => {
    debugLog('Settings for addon:', id);
  };
  return (
    <ScrollDiv className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <Div className="w-full mx-auto max-w-5xl">
        {/* Page Title */}
        <Div className="mb-4">
          <H1 className="text-lg font-bold text-slate-900">Add on activation</H1>
        </Div>

        {/* Addon Cards */}
        <Div className="space-y-3">
          {addons.map((addon) => (
            <Div key={addon.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <Div className="flex items-start justify-between gap-4">
                {/* Left: Title and Description */}
                <Div className="flex-1">
                  <H2 className="text-sm font-semibold text-slate-900 mb-1">{addon.title}</H2>
                  <P className="text-xs text-slate-600">{addon.description}</P>
                </Div>

                {/* Right: Actions */}
                <Div className="flex items-center gap-3">
                  {/* View Dropdown */}
                  <Button type="button" onClick={() => handleView(addon.id)} className="flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900">
                    <Span>View</Span>
                    <UiIcon as={ChevronDown} className="w-3 h-3" />
                  </Button>

                  {/* Toggle Switch */}
                  <ToggleSwitch enabled={addonStates[addon.id]} onToggle={() => handleToggle(addon.id)} />

                  {/* Settings Icon (only for Restaurant app) */}
                  {addon.hasSettings && (
                    <Button
                      type="button"
                      onClick={() => handleSettings(addon.id)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                    >
                      <UiIcon as={Settings} className="w-4 h-4" />
                    </Button>
                  )}
                </Div>
              </Div>
            </Div>
          ))}
        </Div>
      </Div>
    </ScrollDiv>
  );
}
