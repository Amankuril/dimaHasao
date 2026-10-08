/* Ported from Frontend/src/modules/Food/components/admin/orders/OrderDetectDeliveryTable.jsx (tools/port.js first pass). */
import { Eye, Printer, Phone, User } from 'lucide-react-native';
import { Button, Div, Span, Icon as UiIcon } from '../../../../components/web';
import { Cell, DataTable, EmptyState, Row, StatusBadge, TBody, THead } from '../../../../admin/ui';

/* The dispatch statuses this screen shows are not the kit's status words, so
   each maps to one of the kit's tones — the colour then stays stable. */
const STATUS_TONE = {
  Ordered: 'info',
  Accepted: 'success',
  'Restaurant Accepted': 'success',
  Rejected: 'danger',
  'Delivery Boy Assigned': 'info',
  'Reached Pickup': 'warning',
  'Reached Drop': 'warning',
  'Ordered Delivered': 'success',
};

/* Widths authored for a phone; DataTable scrolls sideways there and stretches
   them to fill a tablet. */
const WIDTHS = {
  si: 56,
  orderId: 120,
  userInfo: 180,
  restaurantName: 170,
  deliveryBoy: 190,
  status: 150,
  actions: 110,
};
const LABELS = {
  si: 'SI',
  orderId: 'Order ID',
  userInfo: 'User Name & Number',
  restaurantName: 'Restaurant Name',
  deliveryBoy: 'Delivery Boy Name & Number',
  status: 'Status',
  actions: 'Actions',
};
const ORDER = ['si', 'orderId', 'userInfo', 'restaurantName', 'deliveryBoy', 'status', 'actions'];

export default function OrderDetectDeliveryTable({ orders, visibleColumns, onViewOrder, onPrintOrder }) {
  if (orders.length === 0) {
    return <EmptyState title="No orders found" message="There are no orders matching your criteria. Clear the search or filters to see more." />;
  }
  const keys = ORDER.filter((key) => visibleColumns[key]);
  const cols = keys.map((key) => WIDTHS[key]);
  const widthOf = (key) => WIDTHS[key];
  return (
    <DataTable cols={cols}>
      <THead cols={cols} labels={keys.map((key) => LABELS[key])} />
      <TBody>
        {orders.map((order, index, all) => (
          <Row key={order.orderId || order.id || index} last={index === all.length - 1}>
            {visibleColumns.si && (
              <Cell width={widthOf('si')} numberOfLines={1}>
                {String(order.sl ?? order.si ?? index + 1)}
              </Cell>
            )}
            {visibleColumns.orderId && (
              <Cell width={widthOf('orderId')}>
                <Span className="text-sm font-semibold text-slate-900">#{order.orderId}</Span>
              </Cell>
            )}
            {visibleColumns.userInfo && (
              <Cell width={widthOf('userInfo')}>
                <Div className="gap-1">
                  <Div className="flex-row items-center gap-1.5">
                    <UiIcon as={User} size={13} className="text-slate-400" />
                    <Span className="text-sm font-medium text-slate-900 flex-1">{order.userName}</Span>
                  </Div>
                  <Div className="flex-row items-center gap-1.5">
                    <UiIcon as={Phone} size={13} className="text-slate-400" />
                    <Span className="text-xs text-slate-500 flex-1">{order.userNumber}</Span>
                  </Div>
                </Div>
              </Cell>
            )}
            {visibleColumns.restaurantName && <Cell width={widthOf('restaurantName')}>{order.restaurantName}</Cell>}
            {visibleColumns.deliveryBoy && (
              <Cell width={widthOf('deliveryBoy')}>
                {order.deliveryBoyName ? (
                  <Div className="gap-1">
                    <Div className="flex-row items-center gap-1.5">
                      <UiIcon as={User} size={13} className="text-slate-400" />
                      <Span className="text-sm font-medium text-slate-900 flex-1">{order.deliveryBoyName}</Span>
                    </Div>
                    <Div className="flex-row items-center gap-1.5">
                      <UiIcon as={Phone} size={13} className="text-slate-400" />
                      <Span className="text-xs text-slate-500 flex-1">{order.deliveryBoyNumber}</Span>
                    </Div>
                  </Div>
                ) : (
                  <Span className="text-sm text-slate-400">Not assigned</Span>
                )}
              </Cell>
            )}
            {visibleColumns.status && (
              <Cell width={widthOf('status')}>
                <StatusBadge status={order.status} tone={STATUS_TONE[order.status]} label={order.status} />
              </Cell>
            )}
            {visibleColumns.actions && (
              <Cell width={widthOf('actions')}>
                <Div className="flex-row items-center gap-1">
                  <Button
                    onClick={() => onViewOrder(order)}
                    className="w-11 h-11 rounded-lg items-center justify-center"
                    accessibilityLabel={`View order ${order.orderId}`}
                  >
                    <UiIcon as={Eye} size={18} className="text-blue-600" />
                  </Button>
                  <Button
                    onClick={() => onPrintOrder(order)}
                    className="w-11 h-11 rounded-lg items-center justify-center"
                    accessibilityLabel={`Print order ${order.orderId}`}
                  >
                    <UiIcon as={Printer} size={18} className="text-slate-600" />
                  </Button>
                </Div>
              </Cell>
            )}
          </Row>
        ))}
      </TBody>
    </DataTable>
  );
}
