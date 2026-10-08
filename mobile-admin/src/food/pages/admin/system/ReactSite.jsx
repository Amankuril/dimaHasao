/* Ported from Frontend/src/modules/Food/pages/admin/system/ReactSite.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { X, Monitor } from 'lucide-react-native';
import { AdminPage, PageHeader, Card, Field, INPUT, BTN_PRIMARY, BTN_TEXT_PRIMARY, useLayoutWidth } from '../../../../admin/ui';
import { A, Button, Div, Form, Input, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import { alert } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function ReactSite() {
  const [reactLicenseCode, setReactLicenseCode] = useState('');
  const [reactDomain, setReactDomain] = useState('');
  const [showWarning, setShowWarning] = useState(true);
  const { tablet } = useLayoutWidth();
  const half = tablet ? { width: '48.5%' } : { width: '100%' };
  const handleSave = (e) => {
    e.preventDefault();
    debugLog('Saving React Site:', {
      reactLicenseCode,
      reactDomain,
    });
    alert('React Site settings saved successfully!');
  };
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={Monitor}
        title="React Site Setup"
        subtitle="License and domain for the React storefront"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'React site' }]}
      />

      {showWarning ? (
        <Card className="mb-4 bg-amber-50 border-amber-200 flex-row items-start gap-3">
          <Div className="flex-1 min-w-0">
            <Text style={tw`text-sm text-slate-700`}>
              Please check if your domain is registered at the 6amTech Store.{' '}
              <A href="#" className="text-sm font-semibold text-blue-600">
                Click here
              </A>{' '}
              to log in to the Store.
            </Text>
          </Div>
          <Button
            type="button"
            onClick={() => setShowWarning(false)}
            accessibilityLabel="Dismiss notice"
            className="w-11 h-11 -mt-2 -mr-2 rounded-lg items-center justify-center shrink-0"
          >
            <UiIcon as={X} size={16} className="text-slate-600" />
          </Button>
        </Card>
      ) : null}

      <Card>
        <Form onSubmit={handleSave}>
          <Div className="flex-row flex-wrap gap-3 mb-4">
            <Div style={half}>
              <Field label="React License Code">
                <Input
                  type="text"
                  value={reactLicenseCode}
                  onChange={(e) => setReactLicenseCode(e.target.value)}
                  placeholder="React license code"
                  className={INPUT}
                />
              </Field>
            </Div>
            <Div style={half}>
              <Field label="React Domain">
                <Input type="text" value={reactDomain} onChange={(e) => setReactDomain(e.target.value)} placeholder="React Domain" className={INPUT} />
              </Field>
            </Div>
          </Div>

          <Div className="flex-row justify-end">
            <Button type="submit" className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>Save</Span>
            </Button>
          </Div>
        </Form>
      </Card>
    </AdminPage>
  );
}
