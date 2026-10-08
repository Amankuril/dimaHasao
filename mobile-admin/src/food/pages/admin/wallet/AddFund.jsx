/* Ported from Frontend/src/modules/Food/pages/admin/wallet/AddFund.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Wallet } from 'lucide-react-native';
import { AdminPage, PageHeader, Card, Field, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../admin/ui';
import { Button, Div, Form, Input, Option, Select, Span, Textarea } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function AddFund() {
  const { tablet } = useLayoutWidth();
  const [formData, setFormData] = useState({
    customer: '',
    amount: '',
    reference: '',
  });
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    debugLog('Form submitted:', formData);
    alert('Fund added successfully!');
  };
  const handleReset = () => {
    setFormData({
      customer: '',
      amount: '',
      reference: '',
    });
  };
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={Wallet}
        title="Add Fund"
        subtitle="Credit a customer's wallet manually"
        breadcrumb={[{ label: 'Food' }, { label: 'Customer wallet' }, { label: 'Add fund' }]}
      />

      <Card>
        <Form onSubmit={handleSubmit}>
          <Div className={tablet ? 'grid grid-cols-2 gap-3' : 'gap-3'}>
            <Field label="Customer" required>
              <Select value={formData.customer} onChange={(e) => handleInputChange('customer', e.target.value)} className={INPUT} placeholder="Select customer">
                <Option value="">Select Customer</Option>
                <Option value="jane-doe">Jane Doe</Option>
                <Option value="john-doe">John Doe</Option>
              </Select>
            </Field>

            <Field label="Amount" required>
              <Input type="number" value={formData.amount} onChange={(e) => handleInputChange('amount', e.target.value)} placeholder="Enter amount" className={INPUT} />
            </Field>
          </Div>

          <Field label="Reference" hint="Optional — shown on the wallet statement" className="mt-3">
            <Textarea
              value={formData.reference}
              onChange={(e) => handleInputChange('reference', e.target.value)}
              placeholder="Enter reference"
              rows={4}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
            />
          </Field>

          <Div className="flex-row flex-wrap items-center justify-end gap-2 mt-4">
            <Button type="button" onClick={handleReset} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
            </Button>
            <Button type="submit" className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>Submit</Span>
            </Button>
          </Div>
        </Form>
      </Card>
    </AdminPage>
  );
}
