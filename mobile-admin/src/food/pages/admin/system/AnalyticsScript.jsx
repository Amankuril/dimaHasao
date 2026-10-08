/* Ported from Frontend/src/modules/Food/pages/admin/system/AnalyticsScript.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Lightbulb, ChevronDown, LineChart } from 'lucide-react-native';
import { AdminPage, PageHeader, Card, useLayoutWidth } from '../../../../admin/ui';
import { A, Button, Div, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const marketingTools = [
  {
    id: 1,
    name: 'Google Analytics',
    description: 'To know more click How it works.',
  },
  {
    id: 2,
    name: 'Google Tag Manager',
    description: 'To know more click How it works.',
  },
  {
    id: 3,
    name: 'LinkedIn Insight Tag',
    description: 'To know more click How it works.',
  },
  {
    id: 4,
    name: 'Meta Pixel',
    description: 'To know more click How it works.',
  },
  {
    id: 5,
    name: 'Pinterest Pixel',
    description: 'To know more click How it works.',
  },
  {
    id: 6,
    name: 'Snapchat Pixel',
    description: 'To know more click How it works.',
  },
  {
    id: 7,
    name: 'TikTok Pixel',
    description: 'To know more click How it works.',
  },
  {
    id: 8,
    name: 'X (Twitter) Pixel',
    description: 'To know more click How it works.',
  },
];
function ToggleSwitch({ enabled, onToggle, label }) {
  return (
    <Button type="button" onClick={onToggle} accessibilityLabel={label} className="w-11 h-11 items-center justify-end flex-row shrink-0">
      <Div className={`flex-row items-center w-11 h-6 rounded-full border px-0.5 ${enabled ? 'bg-blue-600 border-blue-600 justify-end' : 'bg-slate-200 border-slate-300 justify-start'}`}>
        <Span className="h-5 w-5 rounded-full bg-white" />
      </Div>
    </Button>
  );
}
export default function AnalyticsScript() {
  const [toolStates, setToolStates] = useState(
    marketingTools.reduce((acc, tool) => {
      acc[tool.id] = false;
      return acc;
    }, {}),
  );
  const { tablet } = useLayoutWidth();
  const cardWidth = tablet ? { width: '48.5%' } : { width: '100%' };
  const handleToggle = (id) => {
    setToolStates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };
  const handleView = (id) => {
    debugLog('View tool:', id);
  };
  const handleHowItWorks = (e) => {
    e.preventDefault();
    debugLog('How it works clicked');
  };
  return (
    <AdminPage>
      <PageHeader
        icon={LineChart}
        title="Marketing Tool"
        subtitle="Analytics and pixel credentials for the storefront"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'Marketing tools' }]}
      />

      <Card className="mb-4 bg-blue-50 border-blue-200 flex-row items-start gap-3">
        <UiIcon as={Lightbulb} size={16} className="text-blue-600 shrink-0 mt-0.5" />
        <Text style={tw`text-sm text-slate-700 flex-1`}>
          Add credentials here to show analytics on the platform. Fill them in correctly or the analytics will not report properly.
        </Text>
      </Card>

      <Div className="flex-row flex-wrap gap-3">
        {marketingTools.map((tool) => (
          <Div key={tool.id} style={cardWidth}>
            <Card className="gap-3">
              <Div className="gap-1">
                <Text style={tw`text-base font-semibold text-slate-900`} numberOfLines={2}>
                  {tool.name}
                </Text>
                <Text style={tw`text-sm text-slate-500`}>
                  {tool.description.split('How it works')[0]}
                  <A href="#" onClick={handleHowItWorks} className="text-sm font-semibold text-blue-600">
                    How it works
                  </A>
                  .
                </Text>
              </Div>

              <Div className="flex-row items-center justify-between gap-2">
                <Button type="button" onClick={() => handleView(tool.id)} className="flex-row items-center gap-1 h-11 pr-3">
                  <Span className="text-sm font-semibold text-slate-700">View</Span>
                  <UiIcon as={ChevronDown} size={14} className="text-slate-500" />
                </Button>
                <ToggleSwitch enabled={toolStates[tool.id]} onToggle={() => handleToggle(tool.id)} label={`Toggle ${tool.name}`} />
              </Div>
            </Card>
          </Div>
        ))}
      </Div>
    </AdminPage>
  );
}
