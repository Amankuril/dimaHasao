/* Ported from Frontend/src/modules/Food/components/admin/orders/SettingsDialog.jsx (tools/port.js first pass). */
import { Settings, Columns, Check } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { Button, Div, H3, Input, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
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
        <DialogHeader className="px-6 pt-6 pb-4">
          <Div className="flex flex-row items-center gap-2">
            <UiIcon as={Settings} className="w-5 h-5" />
            <DialogTitle>Table Settings</DialogTitle>
          </Div>
        </DialogHeader>
        <ScrollDiv className="max-h-[70vh]" contentClassName="px-6 pb-6 gap-4">
          <Div>
            <Div className="mb-3 flex flex-row items-center gap-2">
              <UiIcon as={Columns} className="w-4 h-4 text-slate-700" />
              <H3 className="text-sm font-semibold text-slate-700">Visible Columns</H3>
            </Div>
            <Div className="space-y-2">
              {Object.entries(columnLabels).map(([key, label]) => (
                <Div key={key} onClick={() => toggleColumn(key)} className="flex flex-row items-center gap-3 p-2 rounded-lg">
                  <Input type="checkbox" checked={!!visibleColumns[key]} onChange={() => toggleColumn(key)} className="w-4 h-4" />
                  <Span className="text-sm text-slate-700">{label}</Span>
                  {visibleColumns[key] && <UiIcon as={Check} className="w-4 h-4 text-emerald-600 ml-auto" />}
                </Div>
              ))}
            </Div>
          </Div>
          <Div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button onClick={resetColumns} className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700">
              Reset
            </Button>
            <Button onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white shadow-md">
              Apply
            </Button>
          </Div>
        </ScrollDiv>
      </DialogContent>
    </Dialog>
  );
}
