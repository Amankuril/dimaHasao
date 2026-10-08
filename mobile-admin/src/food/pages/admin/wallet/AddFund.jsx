/* Ported from Frontend/src/modules/Food/pages/admin/wallet/AddFund.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Wallet, Settings } from 'lucide-react-native';
import { Button, Div, Form, H1, Input, Label, Option, ScrollDiv, Select, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function AddFund() {
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
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-3xl mx-auto">
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
          {/* Settings Icon */}
          <Button className="absolute top-6 right-6 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
            <UiIcon as={Settings} className="w-5 h-5 text-slate-600" />
          </Button>

          {/* Header */}
          <Div className="flex items-center gap-3 mb-6">
            <Div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
              <UiIcon as={Wallet} className="w-5 h-5 text-white" />
            </Div>
            <H1 className="text-2xl font-bold text-slate-900">Add Fund</H1>
          </Div>

          <Form onSubmit={handleSubmit}>
            <Div className="space-y-6">
              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  Customer <Span className="text-red-500">*</Span>
                </Label>
                <Select
                  value={formData.customer}
                  onChange={(e) => handleInputChange('customer', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <Option value="">Select Customer</Option>
                  <Option value="jane-doe">Jane Doe</Option>
                  <Option value="john-doe">John Doe</Option>
                </Select>
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  Amount <Span className="text-red-500">*</Span>
                </Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Reference (Optional)</Label>
                <Textarea
                  value={formData.reference}
                  onChange={(e) => handleInputChange('reference', e.target.value)}
                  placeholder="Enter reference"
                  rows={4}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                />
              </Div>

              <Div className="flex items-center justify-end gap-4">
                <Button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Reset
                </Button>
                <Button type="submit" className="px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md">
                  Submit
                </Button>
              </Div>
            </Div>
          </Form>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
