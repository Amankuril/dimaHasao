/* Ported from Frontend/src/modules/Food/components/admin/orders/SettingsDialog.jsx (tools/port.js first pass). */
import { Settings, Check } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { Button, Div, Input, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
import { BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../../../../admin/ui';
export default function SettingsDialog({ isOpen, onOpenChange, visibleColumns, toggleColumn, resetColumns, columnsConfig }) {
  const defaultColumnsConfig = {
    si: 'Serial Number',
    orderId: 'Order ID',
    orderDate: 'Order Date',
    orderOtp: 'Order OTP',
    customer: 'Customer Information',
    restaurant: 'Restaurant',
    foodItems: 'Food Items',
    itemPrice: 'Price',
    deliveryCharge: 'Delivery Charge',
    totalAmount: 'Total Amount',
    paymentType: 'Payment Type',
    paymentCollectionStatus: 'Payment Status',
    orderStatus: 'Order Status',
    actions: 'Actions',
  };
  const columnLabels = columnsConfig || defaultColumnsConfig;
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white p-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
          <Div className="flex-row items-center gap-2">
            <UiIcon as={Settings} size={18} className="text-slate-700" />
            <DialogTitle>Table settings</DialogTitle>
          </Div>
          <Span className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Visible columns</Span>
        </DialogHeader>
        <ScrollDiv style={{ maxHeight: 360 }} contentClassName="px-4 py-3 gap-1">
          {Object.entries(columnLabels).map(([key, label]) => (
            <Div
              key={key}
              onClick={() => toggleColumn(key)}
              accessibilityRole="button"
              accessibilityLabel={`${visibleColumns[key] ? 'Hide' : 'Show'} the ${label} column`}
              className="min-h-[44px] flex-row items-center gap-3 px-2 rounded-lg"
            >
              <Input type="checkbox" checked={!!visibleColumns[key]} onChange={() => toggleColumn(key)} className="w-5 h-5" />
              <Span className="flex-1 text-sm text-slate-700">{label}</Span>
              {visibleColumns[key] ? <UiIcon as={Check} size={16} className="text-blue-600" /> : null}
            </Div>
          ))}
        </ScrollDiv>
        <Div className="flex-row items-center justify-end gap-2 px-4 py-3 border-t border-slate-200">
          <Button onClick={resetColumns} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
          </Button>
          <Button onClick={() => onOpenChange(false)} className={BTN_PRIMARY}>
            <Span className={BTN_TEXT_PRIMARY}>Apply</Span>
          </Button>
        </Div>
      </DialogContent>
    </Dialog>
  );
}
