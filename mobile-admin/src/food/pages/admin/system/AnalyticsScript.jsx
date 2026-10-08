/* Ported from Frontend/src/modules/Food/pages/admin/system/AnalyticsScript.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Lightbulb, ChevronDown } from 'lucide-react-native';
import { A, Button, Div, H1, H3, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
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
export default function AnalyticsScript() {
  const [toolStates, setToolStates] = useState(
    marketingTools.reduce((acc, tool) => {
      acc[tool.id] = false;
      return acc;
    }, {}),
  );
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
    <ScrollDiv className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <Div className="w-full mx-auto max-w-6xl">
        {/* Page Title */}
        <Div className="mb-3">
          <H1 className="text-lg font-bold text-slate-900">Marketing Tool</H1>
        </Div>

        {/* Info Banner */}
        <Div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-start gap-3">
          <UiIcon as={Lightbulb} className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <P className="text-xs text-slate-700">
            In this page you can add credentials to show your analytics on the platform make sure fill with proper data other wise you can not see the analytics
            properly
          </P>
        </Div>

        {/* Marketing Tools Grid */}
        <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {marketingTools.map((tool) => (
            <Div key={tool.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <Div className="mb-3">
                <H3 className="text-sm font-semibold text-slate-900 mb-2">{tool.name}</H3>
                <P className="text-xs text-slate-600">
                  {tool.description.split('How it works')[0]}
                  <A href="#" onClick={handleHowItWorks} className="text-blue-600 hover:underline">
                    How it works
                  </A>
                  .
                </P>
              </Div>

              <Div className="flex items-center justify-between">
                <Button type="button" onClick={() => handleView(tool.id)} className="flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900">
                  <Span>View</Span>
                  <UiIcon as={ChevronDown} className="w-3 h-3" />
                </Button>
                <ToggleSwitch enabled={toolStates[tool.id]} onToggle={() => handleToggle(tool.id)} />
              </Div>
            </Div>
          ))}
        </Div>
      </Div>
    </ScrollDiv>
  );
}
