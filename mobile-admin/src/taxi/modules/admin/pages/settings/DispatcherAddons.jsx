/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/DispatcherAddons.jsx (tools/port.js first pass). */
import React, { useState } from 'react';
import { Loader2, Puzzle } from 'lucide-react-native';
import { toast } from '../../../../../lib/notify';
import { AdminPage, PageHeader, Card, Field, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../../admin/ui';
import { Button, Div, Form, Input, Span, Icon as UiIcon } from '../../../../../components/web';
const DispatcherAddons = () => {
  const [purchaseCode, setPurchaseCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { tablet } = useLayoutWidth();
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!purchaseCode.trim()) {
      return toast.error('Please enter a purchase code');
    }
    try {
      setSubmitting(true);
      // Simulate verification
      await new Promise((r) => setTimeout(r, 1500));
      toast.error('Invalid purchase code. Please check and try again.');
    } catch (_error) {
      toast.error('Verification failed');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={Puzzle}
        title="Dispatcher Addons"
        subtitle="Unlock dispatcher features with a purchase code"
        breadcrumb={[{ label: 'Settings' }, { label: 'Dispatcher Addons' }]}
        actions={
          <Button
            className={BTN_SECONDARY}
            onClick={() => toast('Help documentation is being updated')}
          >
            <Span className={BTN_TEXT_SECONDARY}>How it works</Span>
          </Button>
        }
      />

      <Card>
        <Form onSubmit={handleVerify}>
          <Div className={tablet ? 'flex-row items-end gap-3' : 'gap-3'}>
            <Field label="Purchase code" required className={tablet ? 'flex-1' : ''}>
              <Input
                type="text"
                value={purchaseCode}
                onChange={(e) => setPurchaseCode(e.target.value)}
                placeholder="Enter purchase code"
                className={INPUT}
              />
            </Field>

            <Button type="submit" disabled={submitting} className={`${BTN_PRIMARY} ${submitting ? 'opacity-60' : ''}`}>
              {submitting ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
              <Span className={BTN_TEXT_PRIMARY}>{submitting ? 'Verifying…' : 'Verify'}</Span>
            </Button>
          </Div>
        </Form>
      </Card>
    </AdminPage>
  );
};
export default DispatcherAddons;
