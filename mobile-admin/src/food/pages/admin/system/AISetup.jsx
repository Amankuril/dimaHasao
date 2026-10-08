/* Ported from Frontend/src/modules/Food/pages/admin/system/AISetup.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Bot, Settings, Info, Store } from 'lucide-react-native';
import { A, Button, Div, Form, H1, H2, Input, Label, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
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
export default function AISetup() {
  const [activeTab, setActiveTab] = useState('ai-configuration');
  const [isEnabled, setIsEnabled] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [organization, setOrganization] = useState('');
  const [sectionWiseLimit, setSectionWiseLimit] = useState('60');
  const [imageUploadLimit, setImageUploadLimit] = useState('20');
  const handleReset = () => {
    setApiKey('');
    setOrganization('');
  };
  const handleAIConfigSave = (e) => {
    e.preventDefault();
    debugLog('Saving AI Configuration:', {
      apiKey,
      organization,
      isEnabled,
    });
    alert('AI Configuration saved successfully!');
  };
  const handleAISettingsReset = () => {
    setSectionWiseLimit('60');
    setImageUploadLimit('20');
  };
  const handleAISettingsSave = (e) => {
    e.preventDefault();
    debugLog('Saving AI Settings:', {
      sectionWiseLimit,
      imageUploadLimit,
    });
    alert('AI Settings saved successfully!');
  };
  return (
    <ScrollDiv className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <Div className="w-full mx-auto max-w-5xl">
        {/* Page Title */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
          <Div className="flex items-center gap-2">
            <Div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
              <UiIcon as={Bot} className="w-3.5 h-3.5 text-white" />
            </Div>
            <H1 className="text-lg font-bold text-slate-900">OpenAI Configuration</H1>
          </Div>
        </Div>

        {/* Tabs */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 mb-3">
          <Div className="flex gap-2">
            <Button
              onClick={() => setActiveTab('ai-configuration')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'ai-configuration' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              AI Configuration
            </Button>
            <Button
              onClick={() => setActiveTab('ai-settings')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'ai-settings' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              AI Settings
            </Button>
          </Div>
        </Div>

        {/* AI Configuration Content */}
        {activeTab === 'ai-configuration' && (
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <Div className="flex items-center justify-between mb-4">
              <Div className="flex items-center gap-2">
                <UiIcon as={Settings} className="w-4 h-4 text-slate-600" />
                <H2 className="text-sm font-semibold text-slate-900">OpenAI Configuration</H2>
              </Div>
              <A href="#" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                How it Works
                <UiIcon as={Info} className="w-3 h-3" />
              </A>
            </Div>

            <Form onSubmit={handleAIConfigSave}>
              {/* Toggle Switch */}
              <Div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-lg">
                <Span className="text-xs font-medium text-slate-700">Turn OFF</Span>
                <ToggleSwitch enabled={isEnabled} onToggle={() => setIsEnabled(!isEnabled)} />
              </Div>

              {/* API Key Input */}
              <Div className="mb-4">
                <Label className="block text-xs font-semibold text-slate-700 mb-1.5">OpenAI API Key</Label>
                <Input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Ex: sk-proj-K0LhsdcbHJ......."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </Div>

              {/* Organization Input */}
              <Div className="mb-4">
                <Label className="block text-xs font-semibold text-slate-700 mb-1.5">OpenAI Organization</Label>
                <Input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Ex: org-xxxxxxxxxxxx"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </Div>

              {/* Action Buttons */}
              <Div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Reset
                </Button>
                <Button type="submit" className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Save
                </Button>
              </Div>
            </Form>
          </Div>
        )}

        {/* AI Settings Content */}
        {activeTab === 'ai-settings' && (
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <Form onSubmit={handleAISettingsSave}>
              {/* Restaurant Limits Section */}
              <Div className="mb-6">
                <Div className="flex items-center gap-2 mb-4">
                  <UiIcon as={Store} className="w-4 h-4 text-slate-600" />
                  <H2 className="text-sm font-semibold text-slate-900">Restaurant Limits On Using AI</H2>
                </Div>

                {/* Section Wise Data Generation */}
                <Div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <P className="text-xs text-slate-600 mb-3">Set how many times AI can generate data for each element of the restaurant panel or app.</P>
                  <Div>
                    <Label className="block text-xs font-semibold text-slate-700 mb-1.5">Section Wise Data Generation Limit</Label>
                    <Input
                      type="number"
                      value={sectionWiseLimit}
                      onChange={(e) => setSectionWiseLimit(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                </Div>

                {/* Image Based Data Generation */}
                <Div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <P className="text-xs text-slate-600 mb-3">Set how many times AI can generate data from an image upload.</P>
                  <Div>
                    <Label className="block text-xs font-semibold text-slate-700 mb-1.5">Image Upload Generation Limit</Label>
                    <Input
                      type="number"
                      value={imageUploadLimit}
                      onChange={(e) => setImageUploadLimit(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                </Div>
              </Div>

              {/* Action Buttons */}
              <Div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={handleAISettingsReset}
                  className="px-4 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Reset
                </Button>
                <Button type="submit" className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Save Information
                </Button>
              </Div>
            </Form>
          </Div>
        )}
      </Div>
    </ScrollDiv>
  );
}
