/* Ported from Frontend/src/modules/Food/pages/admin/system/AddonActivation.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { ChevronDown, Puzzle, Settings } from 'lucide-react-native';
import { AdminPage, PageHeader, Card, StatusBadge } from '../../../../admin/ui';
import { Button, Div, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
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
function ToggleSwitch({ enabled, onToggle, label }) {
  return (
    <Button
      type="button"
      onClick={onToggle}
      accessibilityLabel={label}
      className="w-11 h-11 items-center justify-center shrink-0"
    >
      <Div className={`flex-row items-center w-11 h-6 rounded-full border px-0.5 ${enabled ? 'bg-blue-600 border-blue-600 justify-end' : 'bg-slate-200 border-slate-300 justify-start'}`}>
        <Span className="h-5 w-5 rounded-full bg-white" />
      </Div>
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
    <AdminPage>
      <PageHeader
        icon={Puzzle}
        title="Add on activation"
        subtitle="Turn the companion apps and storefront on or off"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'Add-ons' }]}
      />

      <Div className="gap-3">
        {addons.map((addon) => (
          <Card key={addon.id} className="gap-3">
            <Div className="flex-row items-start gap-3">
              <Div className="flex-1 min-w-0 gap-1">
                <Text style={tw`text-base font-semibold text-slate-900`}>{addon.title}</Text>
                <Text style={tw`text-sm text-slate-500`}>{addon.description}</Text>
              </Div>
              <StatusBadge status={addonStates[addon.id] ? 'enabled' : 'disabled'} label={addonStates[addon.id] ? 'Enabled' : 'Disabled'} />
            </Div>

            <Div className="flex-row flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <Button type="button" onClick={() => handleView(addon.id)} className="flex-row items-center gap-1 h-11 pr-3">
                <Span className="text-sm font-semibold text-slate-700">View</Span>
                <UiIcon as={ChevronDown} size={14} className="text-slate-500" />
              </Button>

              <Div className="flex-row items-center gap-1">
                <ToggleSwitch enabled={addonStates[addon.id]} onToggle={() => handleToggle(addon.id)} label={`Toggle ${addon.title}`} />
                {addon.hasSettings ? (
                  <Button
                    type="button"
                    onClick={() => handleSettings(addon.id)}
                    accessibilityLabel={`${addon.title} settings`}
                    className="w-11 h-11 rounded-lg items-center justify-center"
                  >
                    <UiIcon as={Settings} size={18} className="text-slate-600" />
                  </Button>
                ) : null}
              </Div>
            </Div>
          </Card>
        ))}
      </Div>
    </AdminPage>
  );
}
