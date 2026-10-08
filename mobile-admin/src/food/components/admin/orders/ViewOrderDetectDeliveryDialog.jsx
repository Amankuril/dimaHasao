/* Ported from Frontend/src/modules/Food/components/admin/orders/ViewOrderDetectDeliveryDialog.jsx (tools/port.js first pass). */
import { X, Clock, CheckCircle, XCircle, User, Phone, MapPin } from 'lucide-react-native';
import { Button, Div, Overlay, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
import { Card, SectionTitle, StatusBadge, TONES, useLayoutWidth, BTN_SECONDARY, BTN_TEXT_SECONDARY } from '../../../../admin/ui';

/* Dispatch statuses are product words, not the kit's vocabulary, so each maps
   to one kit tone and keeps the same colour everywhere. */
const STATUS_TONE = {
  Ordered: 'info',
  'Restaurant Accepted': 'success',
  Accepted: 'success',
  Rejected: 'danger',
  'Delivery Boy Assigned': 'info',
  'Delivery Boy Reached Pickup': 'warning',
  'Reached Pickup': 'warning',
  'Order ID Accepted': 'success',
  'Reached Drop': 'warning',
  'Ordered Delivered': 'success',
};
const toneOf = (status) => STATUS_TONE[status] || 'neutral';
const getStatusIcon = (status) => {
  if (status === 'Rejected') return XCircle;
  if (status === 'Ordered Delivered') return CheckCircle;
  return Clock;
};

/** One labelled value inside a detail card. */
function Detail({ label, value, icon: IconCmp }) {
  return (
    <Div className="gap-0.5 flex-1 min-w-0">
      <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</Span>
      <Div className="flex-row items-center gap-1.5">
        {IconCmp ? <UiIcon as={IconCmp} size={13} className="text-slate-400" /> : null}
        <Span className="text-sm font-medium text-slate-900 flex-1">{value || '—'}</Span>
      </Div>
    </Div>
  );
}

export default function ViewOrderDetectDeliveryDialog({ isOpen, onOpenChange, order }) {
  const { tablet } = useLayoutWidth();
  if (!isOpen || !order) return null;
  const StatusIcon = getStatusIcon(order.status);
  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  return (
    <Overlay className="absolute inset-0 z-50 items-center justify-center p-4" onClose={() => onOpenChange(false)}>
      <Div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <Div className="relative bg-white rounded-xl w-full max-w-2xl max-h-[90%] overflow-hidden" onClick={(e) => e?.stopPropagation?.()}>
        <Div className="flex-row items-start justify-between gap-3 p-4 border-b border-slate-200">
          <Div className="flex-1 min-w-0">
            <Span className="text-xl font-bold text-slate-900">Order Details</Span>
            <Span className="text-sm text-slate-500">Order ID: #{order.orderId}</Span>
          </Div>
          <Button onClick={() => onOpenChange(false)} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="Close order details">
            <UiIcon as={X} size={18} className="text-slate-600" />
          </Button>
        </Div>

        <ScrollDiv className="p-4" contentClassName="gap-3">
          <Div className={tablet ? 'flex-row gap-3' : 'gap-3'}>
            <Card className="flex-1 gap-3">
              <SectionTitle>User Information</SectionTitle>
              <Detail label="Name" value={order.userName} icon={User} />
              <Detail label="Phone number" value={order.userNumber} icon={Phone} />
            </Card>
            <Card className="flex-1 gap-3">
              <SectionTitle>Restaurant</SectionTitle>
              <Detail label="Restaurant name" value={order.restaurantName} icon={MapPin} />
            </Card>
          </Div>

          {order.deliveryBoyName ? (
            <Card className="gap-3">
              <SectionTitle>Delivery Partner</SectionTitle>
              <Div className={tablet ? 'flex-row gap-3' : 'gap-3'}>
                <Detail label="Name" value={order.deliveryBoyName} icon={User} />
                <Detail label="Phone number" value={order.deliveryBoyNumber} icon={Phone} />
              </Div>
            </Card>
          ) : null}

          <Card className="gap-3">
            <SectionTitle>Current Status</SectionTitle>
            <StatusBadge status={order.status} tone={toneOf(order.status)} label={order.status} icon={StatusIcon} />
          </Card>

          <Card className="gap-3">
            <SectionTitle>Status History</SectionTitle>
            {history.length === 0 ? (
              <Span className="text-sm text-slate-500">No status updates recorded yet.</Span>
            ) : (
              <Div className="gap-3">
                {history.map((historyItem, index) => {
                  const HistoryIcon = getStatusIcon(historyItem.status);
                  const tone = TONES[toneOf(historyItem.status)];
                  return (
                    <Div key={`${historyItem.status}-${index}`} className="flex-row items-start gap-3">
                      <Div className="w-8 h-8 rounded-full items-center justify-center shrink-0" style={{ backgroundColor: tone.bg }}>
                        <UiIcon as={HistoryIcon} size={15} color={tone.fg} />
                      </Div>
                      <Div className="flex-1 min-w-0 gap-1">
                        <Div className="flex-row items-center justify-between gap-2">
                          <Span className="text-sm font-semibold text-slate-900 flex-1">{historyItem.status}</Span>
                          <Span className="text-xs text-slate-500">{historyItem.timestamp}</Span>
                        </Div>
                        {historyItem.deliveryBoy ? (
                          <Div className="gap-0.5 p-2 rounded-lg bg-slate-50">
                            <Span className="text-xs text-slate-600">Delivery partner: {historyItem.deliveryBoy}</Span>
                            {historyItem.deliveryBoyNumber ? <Span className="text-xs text-slate-600">Phone: {historyItem.deliveryBoyNumber}</Span> : null}
                          </Div>
                        ) : null}
                      </Div>
                    </Div>
                  );
                })}
              </Div>
            )}
          </Card>

          <Card className="gap-3">
            <SectionTitle>Placed</SectionTitle>
            <Div className="flex-row gap-3">
              <Detail label="Order date" value={order.orderDate} />
              <Detail label="Order time" value={order.orderTime} />
            </Div>
          </Card>
        </ScrollDiv>

        <Div className="flex-row items-center justify-end gap-2 p-4 border-t border-slate-200">
          <Button onClick={() => onOpenChange(false)} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Close</Span>
          </Button>
        </Div>
      </Div>
    </Overlay>
  );
}
