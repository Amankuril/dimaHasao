/* Ported from Frontend/src/modules/Food/components/admin/orders/RefundModal.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Wallet, X } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/shadcn';
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../../components/web';
import { Card, Field, INPUT, INPUT_ERROR, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../../../../admin/ui';
export default function RefundModal({ isOpen, onOpenChange, order, onConfirm, isProcessing }) {
  const [refundAmount, setRefundAmount] = useState('');
  const [error, setError] = useState('');

  // Set default refund amount when order changes
  useEffect(() => {
    if (order && isOpen) {
      const defaultAmount = order.totalAmount || 0;
      setRefundAmount(defaultAmount.toString());
      setError('');
    }
  }, [order, isOpen]);
  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setRefundAmount(value);
      setError('');
    }
  };
  const handleConfirm = () => {
    const amount = parseFloat(refundAmount);
    const maxAmount = order?.totalAmount || 0;
    if (!refundAmount || refundAmount.trim() === '') {
      setError('Refund राशि डालना अनिवार्य है');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setError('कृपया सही राशि डालें');
      return;
    }
    if (amount > maxAmount) {
      setError(`Refund राशि कुल राशि (₹${maxAmount.toFixed(2)}) से अधिक नहीं हो सकती`);
      return;
    }
    onConfirm(amount);
  };
  const handleClose = () => {
    if (!isProcessing) {
      setRefundAmount('');
      setError('');
      onOpenChange(false);
    }
  };
  if (!order) return null;
  const maxAmount = order.totalAmount || 0;
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Div className="flex-row items-center gap-2">
              <UiIcon as={Wallet} size={18} className="text-blue-600" />
              <Span className="text-lg font-bold text-slate-900">Wallet Refund</Span>
            </Div>
          </DialogTitle>
          <DialogDescription>
            <Span className="text-sm text-slate-500">
              Order ID: <Span className="font-semibold text-slate-700">{order.orderId}</Span>
            </Span>
          </DialogDescription>
        </DialogHeader>

        <Div className="gap-4 py-4">
          <Field label="Refund amount (₹)" required error={error} hint={`Maximum refundable amount: ₹${maxAmount.toFixed(2)}`}>
            <Input
              type="text"
              value={refundAmount}
              onChange={handleAmountChange}
              placeholder="0.00"
              disabled={isProcessing}
              className={`${error ? INPUT_ERROR : INPUT} ${isProcessing ? 'bg-slate-100' : ''}`}
            />
          </Field>

          <Card className="bg-blue-50 border-blue-200">
            <Span className="text-sm text-slate-700">
              <Span className="font-semibold">Note:</Span> यह पैसा ग्राहक के वॉलेट में क्रेडिट हो जाएगा और ऑर्डर का स्टेटस {'"Refunded"'} हो जाएगा।
            </Span>
          </Card>
        </Div>

        <Div className="flex-row items-center justify-end gap-2 pt-4 border-t border-slate-200">
          <Button onClick={handleClose} disabled={isProcessing} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing || !refundAmount || parseFloat(refundAmount) <= 0} className={BTN_PRIMARY}>
            <Span className={BTN_TEXT_PRIMARY}>{isProcessing ? 'Processing…' : 'Refund'}</Span>
          </Button>
        </Div>
      </DialogContent>
    </Dialog>
  );
}
