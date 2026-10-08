/* Ported from Frontend/src/modules/Food/pages/admin/system/AISetup.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Bot, Info, Store } from 'lucide-react-native';
import { AdminPage, PageHeader, Card, SectionTitle, Field, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../../../../admin/ui';
import { A, Button, Div, Form, Input, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import { alert } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
function ToggleSwitch({ enabled, onToggle, label }) {
  return (
    <Button type="button" onClick={onToggle} accessibilityLabel={label} className="w-11 h-11 flex-row items-center justify-end shrink-0">
      <Div className={`flex-row items-center w-11 h-6 rounded-full border px-0.5 ${enabled ? 'bg-blue-600 border-blue-600 justify-end' : 'bg-slate-200 border-slate-300 justify-start'}`}>
        <Span className="h-5 w-5 rounded-full bg-white" />
      </Div>
    </Button>
  );
}
const TAB = 'flex-row items-center justify-center h-11 px-4 rounded-lg';
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
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={Bot}
        title="OpenAI Configuration"
        subtitle="Credentials and generation limits for AI features"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'AI setup' }]}
      />

      <Card className="mb-4 flex-row flex-wrap gap-2" padded={false}>
        <Div className="flex-row flex-wrap gap-2 p-2">
          <Button onClick={() => setActiveTab('ai-configuration')} className={`${TAB} ${activeTab === 'ai-configuration' ? 'bg-blue-600' : 'bg-white'}`}>
            <Span className={activeTab === 'ai-configuration' ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-600'}>AI Configuration</Span>
          </Button>
          <Button onClick={() => setActiveTab('ai-settings')} className={`${TAB} ${activeTab === 'ai-settings' ? 'bg-blue-600' : 'bg-white'}`}>
            <Span className={activeTab === 'ai-settings' ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-600'}>AI Settings</Span>
          </Button>
        </Div>
      </Card>

      {activeTab === 'ai-configuration' ? (
        <Card>
          <SectionTitle
            action={
              <A href="#" className="flex-row items-center gap-1">
                <Span className="text-sm font-semibold text-blue-600">How it Works</Span>
                <UiIcon as={Info} size={14} className="text-blue-600" />
              </A>
            }
          >
            OpenAI Configuration
          </SectionTitle>

          <Form onSubmit={handleAIConfigSave}>
            <Div className="flex-row items-center justify-between gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
              <Div className="flex-1 min-w-0">
                <Text style={tw`text-sm font-medium text-slate-700`}>OpenAI integration</Text>
                <Text style={tw`text-xs text-slate-500`}>{isEnabled ? 'On' : 'Off'}</Text>
              </Div>
              <ToggleSwitch enabled={isEnabled} onToggle={() => setIsEnabled(!isEnabled)} label="Toggle OpenAI integration" />
            </Div>

            <Div className="gap-3 mb-4">
              <Field label="OpenAI API Key">
                <Input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Ex: sk-proj-K0LhsdcbHJ......." className={INPUT} />
              </Field>
              <Field label="OpenAI Organization">
                <Input type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Ex: org-xxxxxxxxxxxx" className={INPUT} />
              </Field>
            </Div>

            <Div className="flex-row flex-wrap justify-end gap-2">
              <Button type="button" onClick={handleReset} className={BTN_SECONDARY}>
                <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
              </Button>
              <Button type="submit" className={BTN_PRIMARY}>
                <Span className={BTN_TEXT_PRIMARY}>Save</Span>
              </Button>
            </Div>
          </Form>
        </Card>
      ) : null}

      {activeTab === 'ai-settings' ? (
        <Card>
          <Form onSubmit={handleAISettingsSave}>
            <Div className="flex-row items-center gap-2 mb-3">
              <UiIcon as={Store} size={16} className="text-slate-600" />
              <Text style={tw`text-base font-semibold text-slate-900 flex-1`}>Restaurant Limits On Using AI</Text>
            </Div>

            <Div className="gap-3 mb-4">
              <Div className="p-3 bg-slate-50 rounded-lg border border-slate-200 gap-2">
                <Text style={tw`text-sm text-slate-500`}>Set how many times AI can generate data for each element of the restaurant panel or app.</Text>
                <Field label="Section Wise Data Generation Limit">
                  <Input type="number" value={sectionWiseLimit} onChange={(e) => setSectionWiseLimit(e.target.value)} className={INPUT} />
                </Field>
              </Div>

              <Div className="p-3 bg-slate-50 rounded-lg border border-slate-200 gap-2">
                <Text style={tw`text-sm text-slate-500`}>Set how many times AI can generate data from an image upload.</Text>
                <Field label="Image Upload Generation Limit">
                  <Input type="number" value={imageUploadLimit} onChange={(e) => setImageUploadLimit(e.target.value)} className={INPUT} />
                </Field>
              </Div>
            </Div>

            <Div className="flex-row flex-wrap justify-end gap-2">
              <Button type="button" onClick={handleAISettingsReset} className={BTN_SECONDARY}>
                <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
              </Button>
              <Button type="submit" className={BTN_PRIMARY}>
                <Span className={BTN_TEXT_PRIMARY}>Save Information</Span>
              </Button>
            </Div>
          </Form>
        </Card>
      ) : null}
    </AdminPage>
  );
}
