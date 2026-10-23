/**
 * Google Maps and Razorpay keys, changed here instead of in a new app release.
 *
 * The apps never hold these: Maps lookups go through the backend and Razorpay
 * Checkout takes its key id from each order. So a key saved here is used by the
 * very next request, in every installed version of every app.
 *
 * The server only ever returns a masked preview, so a field left empty means
 * "keep what is there". Clearing a stored value hands the field back to the
 * server's environment setting.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import globalService from '../../../services/globalService';
import {
  AdminPage,
  BTN_PRIMARY,
  BTN_TEXT_PRIMARY,
  Card,
  ErrorState,
  Field,
  INPUT,
  LoadingState,
  PageHeader,
  SectionTitle,
} from '../../../../admin/ui';
import { Button, Form, Input, P, Span, Icon as UiIcon } from '../../../../components/web';

const SOURCE_LABEL = { database: 'saved here', env: 'from server setting', none: 'not set' };

const GROUPS = [
  {
    title: 'Google Maps',
    fields: [
      { name: 'googleMapsApiKey', secret: true },
      { name: 'googleMapsBrowserKey', secret: false },
    ],
  },
  {
    title: 'Razorpay',
    fields: [
      { name: 'razorpayKeyId', secret: false },
      { name: 'razorpayKeySecret', secret: true },
      { name: 'razorpayWebhookSecret', secret: true },
    ],
  },
];

const ApiCredentials = () => {
  const [info, setInfo] = useState(null);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setInfo(await globalService.getCredentials());
    } catch (error) {
      toast.error(error.message || 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const set = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    const payload = {};
    for (const [name, value] of Object.entries(values)) {
      if (String(value).trim()) payload[name] = String(value).trim();
    }
    if (!Object.keys(payload).length) return toast.error('Enter at least one new value');
    try {
      setSaving(true);
      setInfo(await globalService.saveCredentials(payload));
      setValues({});
      toast.success('Saved. The next request uses the new keys.');
    } catch (error) {
      toast.error(error.message || 'Could not save these keys');
    } finally {
      setSaving(false);
    }
  };

  const header = <PageHeader title="API Keys" subtitle="Google Maps and Razorpay. Changes apply immediately — no app update needed." />;

  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <LoadingState label="Loading…" />
      </AdminPage>
    );
  }
  if (!info) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <ErrorState title="Keys could not be loaded" message="Only a platform superadmin can open this page." onRetry={load} />
      </AdminPage>
    );
  }

  return (
    <AdminPage maxWidth={720}>
      <Form onSubmit={save}>
        {header}

        {!info.encryptionConfigured && (
          <Card className="mb-4">
            <P className="text-sm text-red-600">
              The server has no CREDENTIALS_ENCRYPTION_KEY, so keys cannot be saved yet. Set it in the server environment and restart once.
            </P>
          </Card>
        )}

        {GROUPS.map((group) => (
          <Card key={group.title} className="mb-4 gap-4">
            <SectionTitle>{group.title}</SectionTitle>
            {group.fields.map(({ name, secret }) => {
              const field = info.fields?.[name] || {};
              const hint = `${SOURCE_LABEL[field.source] || ''}${field.preview ? ` · ${field.preview}` : ''}`;
              return (
                <Field key={name} label={field.label || name} hint={hint}>
                  <Input
                    type={secret ? 'password' : 'text'}
                    value={values[name] || ''}
                    onChange={set(name)}
                    className={INPUT}
                    placeholder={field.configured ? 'Leave empty to keep the current value' : 'Paste the new value'}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </Field>
              );
            })}
          </Card>
        ))}

        <P className="mb-4 text-xs text-slate-500">
          The map drawn inside the apps uses a separate key that is built into the app. It cannot be changed from here.
        </P>

        <Button type="submit" disabled={saving || !info.encryptionConfigured} className={BTN_PRIMARY}>
          {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : <UiIcon as={Save} size={16} className="text-white" />}
          <Span className={BTN_TEXT_PRIMARY}>Save</Span>
        </Button>
      </Form>
    </AdminPage>
  );
};
export default ApiCredentials;
