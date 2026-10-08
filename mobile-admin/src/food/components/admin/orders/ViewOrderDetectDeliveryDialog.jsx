/* Ported from Frontend/src/modules/Food/components/admin/orders/ViewOrderDetectDeliveryDialog.jsx (tools/port.js first pass). */
import { X, Clock, CheckCircle, XCircle, User, Phone, Package, MapPin } from 'lucide-react-native';
import { Button, Div, H2, H3, Overlay, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
const getStatusColor = (status) => {
  const colors = {
    Ordered: 'bg-blue-100 text-blue-700 border-blue-200',
    'Restaurant Accepted': 'bg-green-100 text-green-700 border-green-200',
    Accepted: 'bg-green-100 text-green-700 border-green-200',
    // Keep for backward compatibility
    Rejected: 'bg-red-100 text-red-700 border-red-200',
    'Delivery Boy Assigned': 'bg-purple-100 text-purple-700 border-purple-200',
    'Delivery Boy Reached Pickup': 'bg-orange-100 text-orange-700 border-orange-200',
    'Reached Pickup': 'bg-orange-100 text-orange-700 border-orange-200',
    // Keep for backward compatibility
    'Order ID Accepted': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Reached Drop': 'bg-amber-100 text-amber-700 border-amber-200',
    'Ordered Delivered': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200';
};
const getStatusIcon = (status) => {
  if (status === 'Rejected') return XCircle;
  if (status === 'Ordered Delivered') return CheckCircle;
  return Clock;
};
export default function ViewOrderDetectDeliveryDialog({ isOpen, onOpenChange, order }) {
  if (!isOpen || !order) return null;
  const StatusIcon = getStatusIcon(order.status);
  return (
    <Overlay className="fixed inset-0 z-50 flex items-center justify-center" onClose={() => onOpenChange(false)}>
      {/* Backdrop */}
      <Div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />

      {/* Dialog */}
      <Div className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <Div className="flex items-center justify-between p-6 border-b border-slate-200">
          <Div>
            <H2 className="text-2xl font-bold text-slate-900">Order Details</H2>
            <P className="text-sm text-slate-500 mt-1">Order ID: #{order.orderId}</P>
          </Div>
          <Button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <UiIcon as={X} className="w-5 h-5 text-slate-600" />
          </Button>
        </Div>

        {/* Content */}
        <ScrollDiv className="flex-shrink p-6">
          {/* Order Information */}
          <Div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* User Information */}
            <Div className="bg-slate-50 rounded-lg p-4">
              <H3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <UiIcon as={User} className="w-4 h-4" />
                User Information
              </H3>
              <Div className="space-y-2">
                <Div>
                  <P className="text-xs text-slate-500">Name</P>
                  <P className="text-sm font-medium text-slate-900">{order.userName}</P>
                </Div>
                <Div>
                  <P className="text-xs text-slate-500">Phone Number</P>
                  <P className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                    <UiIcon as={Phone} className="w-3.5 h-3.5" />
                    {order.userNumber}
                  </P>
                </Div>
              </Div>
            </Div>

            {/* Restaurant Information */}
            <Div className="bg-slate-50 rounded-lg p-4">
              <H3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <UiIcon as={MapPin} className="w-4 h-4" />
                Restaurant Information
              </H3>
              <Div>
                <P className="text-xs text-slate-500">Restaurant Name</P>
                <P className="text-sm font-medium text-slate-900">{order.restaurantName}</P>
              </Div>
            </Div>

            {/* Delivery Boy Information */}
            {order.deliveryBoyName && (
              <Div className="bg-slate-50 rounded-lg p-4 md:col-span-2">
                <H3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <UiIcon as={Package} className="w-4 h-4" />
                  Delivery Boy Information
                </H3>
                <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Div>
                    <P className="text-xs text-slate-500">Name</P>
                    <P className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                      <UiIcon as={User} className="w-3.5 h-3.5" />
                      {order.deliveryBoyName}
                    </P>
                  </Div>
                  <Div>
                    <P className="text-xs text-slate-500">Phone Number</P>
                    <P className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                      <UiIcon as={Phone} className="w-3.5 h-3.5" />
                      {order.deliveryBoyNumber}
                    </P>
                  </Div>
                </Div>
              </Div>
            )}
          </Div>

          {/* Current Status */}
          <Div className="mb-6">
            <H3 className="text-sm font-semibold text-slate-700 mb-3">Current Status</H3>
            <Div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${getStatusColor(order.status)}`}>
              <UiIcon as={StatusIcon} className={`w-4 h-4 ${(getStatusColor(order.status).match(/text-\S+/) || [""])[0]}`} />
              <Span className="font-semibold">{order.status}</Span>
            </Div>
          </Div>

          {/* Status History Timeline */}
          <Div>
            <H3 className="text-sm font-semibold text-slate-700 mb-4">Status History</H3>
            <Div className="relative">
              {/* Timeline line */}
              <Div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

              {/* Status items */}
              <Div className="space-y-4">
                {order.statusHistory &&
                  order.statusHistory.map((historyItem, index) => {
                    const isLast = index === order.statusHistory.length - 1;
                    const HistoryIcon = getStatusIcon(historyItem.status);
                    return (
                      <Div key={index} className="relative flex items-start gap-4">
                        {/* Icon */}
                        <Div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${getStatusColor(historyItem.status)}`}>
                          <HistoryIcon className="w-4 h-4" />
                        </Div>

                        {/* Content */}
                        <Div className="flex-1 pt-1">
                          <Div className="flex items-center justify-between mb-1">
                            <Span className={`text-sm font-semibold ${getStatusColor(historyItem.status).split(' ')[1]}`}>{historyItem.status}</Span>
                            <Span className="text-xs text-slate-500">{historyItem.timestamp}</Span>
                          </Div>
                          {historyItem.deliveryBoy && (
                            <Div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded p-2">
                              <P>
                                <Span className="font-medium">Delivery Boy:</Span> {historyItem.deliveryBoy}
                              </P>
                              {historyItem.deliveryBoyNumber && (
                                <P>
                                  <Span className="font-medium">Phone:</Span> {historyItem.deliveryBoyNumber}
                                </P>
                              )}
                            </Div>
                          )}
                        </Div>
                      </Div>
                    );
                  })}
              </Div>
            </Div>
          </Div>

          {/* Order Date & Time */}
          <Div className="mt-6 pt-6 border-t border-slate-200">
            <Div className="flex items-center justify-between text-sm">
              <Div>
                <P className="text-slate-500">Order Date</P>
                <P className="font-medium text-slate-900">{order.orderDate}</P>
              </Div>
              <Div>
                <P className="text-slate-500">Order Time</P>
                <P className="font-medium text-slate-900">{order.orderTime}</P>
              </Div>
            </Div>
          </Div>
        </ScrollDiv>

        {/* Footer */}
        <Div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <Button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
          >
            Close
          </Button>
        </Div>
      </Div>
    </Overlay>
  );
}
