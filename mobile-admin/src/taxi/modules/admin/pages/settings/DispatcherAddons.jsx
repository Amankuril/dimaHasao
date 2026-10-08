/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/DispatcherAddons.jsx (tools/port.js first pass). */
import React, { useState } from 'react';
import { ChevronRight, Loader2, ExternalLink } from 'lucide-react-native';
import { toast } from '../../../../../lib/notify';
import { A, Button, Div, Form, H1, Input, Label, ScrollDiv, Span, Icon as UiIcon } from '../../../../../components/web';
const DispatcherAddons = () => {
  const [purchaseCode, setPurchaseCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
    <ScrollDiv className="min-h-screen bg-[#F0F2F5] font-sans pb-20">
      {/* Header Area */}
      <Div className="px-6 py-4 flex items-center justify-between border-b border-gray-200 bg-white shadow-sm shrink-0">
        <H1 className="text-[14px] font-black text-gray-700 uppercase tracking-tight">Dispatcher Addons</H1>
        <Div className="flex items-center gap-2 text-[12px] font-medium text-gray-500">
          <Span>Dispatcher Addons</Span>
          <UiIcon as={ChevronRight} size={12} className="text-gray-300" />
          <Span className="text-gray-400">Dispatcher Addons</Span>
        </Div>
      </Div>

      <Div className="p-8">
        {/* Main Card */}
        <Div className="bg-white rounded-lg shadow-sm border border-gray-100 p-10 min-h-[300px]">
          <Div className="flex justify-end mb-8">
            <A
              href="#"
              onClick={(e) => {
                e.preventDefault();
                toast('Help documentation is being updated');
              }}
              className="text-[13px] font-bold text-[#00A99D] underline underline-offset-4 hover:text-[#008f85] transition-all"
            >
              How It Works
            </A>
          </Div>

          <Form onSubmit={handleVerify} className="max-w-4xl">
            <Div className="flex flex-col md:flex-row items-end gap-6">
              <Div className="flex-1 space-y-2">
                <Label className="block text-[11px] font-black text-gray-700 uppercase tracking-tight">
                  Purchase Code <Span className="text-orange-500">*</Span>
                </Label>
                <Input
                  type="text"
                  value={purchaseCode}
                  onChange={(e) => setPurchaseCode(e.target.value)}
                  placeholder="Enter Purchase Code"
                  className="w-full border border-gray-200 rounded-md px-4 py-3 text-[14px] font-medium text-gray-600 outline-none focus:border-[#3F51B5] transition-all"
                />
              </Div>

              <Button
                type="submit"
                disabled={submitting}
                className="px-10 py-3.5 bg-[#4B5EAA] text-white rounded-md text-[12px] font-black uppercase tracking-widest hover:bg-[#3F51B5] shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
              >
                {submitting ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : 'Verify'}
              </Button>
            </Div>
          </Form>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default DispatcherAddons;
