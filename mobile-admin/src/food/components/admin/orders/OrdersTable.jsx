/* Ported from Frontend/src/modules/Food/components/admin/orders/OrdersTable.jsx (tools/port.js first pass). */
import { useState, useEffect, useMemo } from 'react';
import { Eye, Printer, ArrowUpDown, Loader2, Check, X, ChevronDown, ChevronUp } from 'lucide-react-native';
import { resolveRestaurantItemUnitPrice, resolveItemMarkupUnit } from '../../../utils/restaurantOrderPricing';
import { Button, Div, Option, Select, Span, Icon as UiIcon } from '../../../../components/web';
import {
  Card,
  Cell,
  DataTable,
  EmptyState,
  Pagination,
  Row,
  StatusBadge,
  TBody,
  useColumnWidth,
  BTN_PRIMARY,
  BTN_DANGER,
  BTN_TEXT_PRIMARY,
} from '../../../../admin/ui';

const formatINR = (value, digits = 0) =>
  `₹${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: 2,
  })}`;

/* The order statuses this screen shows are product words, not the kit's status
   vocabulary, so each maps to one kit tone — the same word is then always the
   same colour across the panels. */
const STATUS_TONE = {
  Delivered: 'success',
  Pending: 'warning',
  Scheduled: 'warning',
  Accepted: 'success',
  Processing: 'warning',
  'Food On The Way': 'warning',
  Canceled: 'danger',
  Cancelled: 'danger',
  'Cancelled by Restaurant': 'danger',
  'Cancelled by User': 'danger',
  'Payment Failed': 'danger',
  Refunded: 'info',
  'Dine In': 'info',
  'Offline Payments': 'neutral',
};
const paymentStatusClass = (paymentStatus) => {
  if (paymentStatus === 'Paid' || paymentStatus === 'Collected') return 'text-green-700';
  if (paymentStatus === 'COD Pending' || paymentStatus === 'Not Collected') return 'text-amber-700';
  if (paymentStatus === 'Refunded') return 'text-blue-700';
  if (paymentStatus === 'Unpaid' || paymentStatus === 'Failed') return 'text-red-700';
  return 'text-slate-600';
};

/* Widths authored for a phone, where DataTable scrolls sideways; given a
   tablet the kit stretches them to fill the row. */
const WIDTHS = {
  si: 56,
  orderId: 120,
  orderDate: 150,
  orderOtp: 90,
  customer: 180,
  restaurant: 170,
  foodItems: 230,
  itemPrice: 110,
  deliveryCharge: 120,
  totalAmount: 130,
  paymentType: 130,
  paymentCollectionStatus: 130,
  orderStatus: 170,
  actions: 230,
};
const LABELS = {
  si: 'SI',
  orderId: 'Order ID',
  orderDate: 'Order Date',
  orderOtp: 'Order OTP',
  customer: 'Customer',
  restaurant: 'Restaurant',
  foodItems: 'Food Items',
  itemPrice: 'Price',
  deliveryCharge: 'Delivery',
  totalAmount: 'Total Amount',
  paymentType: 'Payment Type',
  paymentCollectionStatus: 'Payment Status',
  orderStatus: 'Order Status',
  actions: 'Actions',
};
const SORTABLE = new Set([
  'si',
  'orderId',
  'orderDate',
  'orderOtp',
  'customer',
  'restaurant',
  'foodItems',
  'itemPrice',
  'deliveryCharge',
  'totalAmount',
  'paymentType',
  'paymentCollectionStatus',
  'orderStatus',
]);
const ORDER = [
  'si',
  'orderId',
  'orderDate',
  'orderOtp',
  'customer',
  'restaurant',
  'foodItems',
  'itemPrice',
  'deliveryCharge',
  'totalAmount',
  'paymentType',
  'paymentCollectionStatus',
  'orderStatus',
  'actions',
];
/* These two were rendered unless explicitly switched off; keep that rule. */
const DEFAULT_ON = new Set(['paymentType', 'paymentCollectionStatus']);
const isVisible = (visibleColumns, key) => (DEFAULT_ON.has(key) ? visibleColumns[key] !== false : Boolean(visibleColumns[key]));

/** One header cell: the kit stretches the authored width, so read it from there. */
function HeadCell({ columnKey, sortConfig, requestSort }) {
  const width = useColumnWidth(WIDTHS[columnKey]);
  const sortable = SORTABLE.has(columnKey);
  const active = sortConfig.key === columnKey;
  const label = (
    <Div className="flex-row items-center gap-1.5">
      <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex-1">{LABELS[columnKey]}</Span>
      {sortable ? <UiIcon as={ArrowUpDown} size={12} className={active ? 'text-slate-700' : 'text-slate-400'} /> : null}
    </Div>
  );
  return (
    <Div style={{ width }} className="px-3 py-2.5 justify-center">
      {sortable ? (
        <Button onClick={() => requestSort(columnKey)} accessibilityLabel={`Sort by ${LABELS[columnKey]}`}>
          {label}
        </Button>
      ) : (
        label
      )}
    </Div>
  );
}

/** The header row: every cell is also its column's sort control. */
function SortableHead({ keys, sortConfig, requestSort }) {
  return (
    <Div className="flex-row bg-slate-50 border-b border-slate-200">
      {keys.map((key) => (
        <HeadCell key={key} columnKey={key} sortConfig={sortConfig} requestSort={requestSort} />
      ))}
    </Div>
  );
}

export default function OrdersTable({
  orders,
  visibleColumns,
  onViewOrder,
  onPrintOrder,
  onRefund,
  onDeleteOrder,
  onAcceptOrder,
  onRejectOrder,
  actionLoadingOrderId,
  actionLoadingType,
  deletingOrderId,
  currentPage: controlledPage,
  pageSize: controlledPageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}) {
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(20);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [openReasonId, setOpenReasonId] = useState(null);
  const isServerPaged = typeof totalItems === 'number' && typeof onPageChange === 'function' && typeof onPageSizeChange === 'function';
  const currentPage = isServerPaged ? controlledPage || 1 : localPage;
  const pageSize = isServerPaged ? controlledPageSize || 20 : localPageSize;
  const totalCount = isServerPaged ? totalItems : orders.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);
  const setCurrentPage = (updater) => {
    const next = typeof updater === 'function' ? updater(currentPage) : updater;
    if (isServerPaged) onPageChange(next);
    else setLocalPage(next);
  };
  const setPageSize = (size) => {
    if (isServerPaged) onPageSizeChange(size);
    else {
      setLocalPageSize(size);
      setLocalPage(1);
    }
  };
  const toggleOrderExpand = (orderId) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  // Reset to page 1 when orders change (client-paged fallback only)
  useEffect(() => {
    if (!isServerPaged) setLocalPage(1);
  }, [orders.length, isServerPaged]);
  const [sortConfig, setSortConfig] = useState({
    key: 'orderDate',
    direction: 'desc',
  });
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({
      key,
      direction,
    });
  };
  const sortedOrders = useMemo(() => {
    const sortableOrders = [...orders];
    if (sortConfig.key) {
      sortableOrders.sort((a, b) => {
        let aVal = '';
        let bVal = '';
        switch (sortConfig.key) {
          case 'si':
            return 0;
          case 'orderId':
            aVal = String(a.orderId || '');
            bVal = String(b.orderId || '');
            break;
          case 'orderDate':
            aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            break;
          case 'orderOtp':
            aVal = String(a.orderOtp || '');
            bVal = String(b.orderOtp || '');
            break;
          case 'customer':
            aVal = String(a.customerName || '').toLowerCase();
            bVal = String(b.customerName || '').toLowerCase();
            break;
          case 'restaurant':
            aVal = String(a.restaurant || '').toLowerCase();
            bVal = String(b.restaurant || '').toLowerCase();
            break;
          case 'foodItems':
            aVal = a.items && a.items[0] ? String(a.items[0].name || a.items[0].foodName || '').toLowerCase() : '';
            bVal = b.items && b.items[0] ? String(b.items[0].name || b.items[0].foodName || '').toLowerCase() : '';
            break;
          case 'itemPrice':
            aVal = a.items && a.items[0] ? Number(a.items[0].price || 0) : 0;
            bVal = b.items && b.items[0] ? Number(b.items[0].price || 0) : 0;
            break;
          case 'deliveryCharge':
            aVal = Number(a.deliveryCharge || 0);
            bVal = Number(b.deliveryCharge || 0);
            break;
          case 'totalAmount':
            const rawAmountA = a.totalAmount ?? a.total ?? a.pricing?.total ?? 0;
            const rawAmountB = b.totalAmount ?? b.total ?? b.pricing?.total ?? 0;
            aVal = Number(rawAmountA);
            bVal = Number(rawAmountB);
            break;
          case 'paymentType':
            aVal = String(a.paymentType || '').toLowerCase();
            bVal = String(b.paymentType || '').toLowerCase();
            break;
          case 'paymentCollectionStatus':
            aVal = String(a.paymentStatus || '').toLowerCase();
            bVal = String(b.paymentStatus || '').toLowerCase();
            break;
          case 'orderStatus':
            aVal = String(a.orderStatus || '').toLowerCase();
            bVal = String(b.orderStatus || '').toLowerCase();
            break;
          default:
            break;
        }
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableOrders;
  }, [orders, sortConfig]);
  const paginatedOrders = useMemo(() => {
    if (isServerPaged) return sortedOrders;
    const start = (currentPage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, currentPage, pageSize, isServerPaged]);
  const formatRestaurantName = (name) => {
    if (name === 'Cafe Monarch') return 'Café Monarch';
    return name;
  };
  if (orders.length === 0 && totalCount === 0) {
    return <EmptyState title="No orders found" message="There are no orders matching your criteria. Clear the search or filters to see more." />;
  }
  const keys = ORDER.filter((key) => isVisible(visibleColumns, key));
  const cols = keys.map((key) => WIDTHS[key]);
  const w = (key) => WIDTHS[key];

  /** Is this a cancelled, already-paid order that can still be refunded? */
  const canRefund = (order) => {
    const isCancelled =
      order.orderStatus === 'Cancelled by Restaurant' ||
      order.orderStatus === 'Cancelled' ||
      order.orderStatus === 'Cancelled by User' ||
      (order.status === 'cancelled' && (order.cancelledBy === 'user' || order.cancelledBy === 'restaurant'));
    const paymentMethod = order.payment?.method || order.paymentMethod;
    const isOnlinePayment =
      order.paymentType === 'Online' ||
      (order.paymentType !== 'Cash on Delivery' &&
        order.payment?.method !== 'cash' &&
        order.payment?.method !== 'cod' &&
        (order.paymentMethod === 'razorpay' ||
          order.paymentMethod === 'online' ||
          order.payment?.paymentMethod === 'razorpay' ||
          order.payment?.method === 'razorpay' ||
          order.payment?.method === 'online'));
    const isWalletPayment = order.paymentType === 'Wallet' || paymentMethod === 'wallet';
    return isCancelled && (isOnlinePayment || isWalletPayment) && order.paymentStatus === 'Paid';
  };
  const paymentTypeOf = (order) => {
    let paymentTypeDisplay = order.paymentType;
    const paymentMethod = order.payment?.method || order.paymentMethod || order.payment?.paymentMethod;
    if (paymentMethod === 'razorpay_qr') {
      paymentTypeDisplay = 'COD (QR)';
    } else if (!paymentTypeDisplay) {
      if (paymentMethod === 'cash' || paymentMethod === 'cod') {
        paymentTypeDisplay = 'Cash on Delivery';
      } else if (paymentMethod === 'wallet') {
        paymentTypeDisplay = 'Wallet';
      } else {
        paymentTypeDisplay = 'Online';
      }
    }
    if (paymentMethod === 'wallet' && paymentTypeDisplay !== 'Wallet') {
      paymentTypeDisplay = 'Wallet';
    }
    return paymentTypeDisplay;
  };
  return (
    <>
      <DataTable cols={cols}>
        <SortableHead keys={keys} sortConfig={sortConfig} requestSort={requestSort} />
        <TBody>
          {paginatedOrders.map((order, index, all) => {
            const isExpanded = expandedOrders[order.orderId] || false;
            const items = Array.isArray(order.items) ? order.items : [];
            const itemsToShow = isExpanded ? items : items.slice(0, 1);
            const isRowLoading = actionLoadingOrderId === (order.id || order.orderId);
            const isCancelledOtp =
              order.orderStatus === 'Cancelled' ||
              order.orderStatus === 'Cancelled by Restaurant' ||
              order.orderStatus === 'Cancelled by User' ||
              order.orderStatus === 'Canceled';
            return (
              <Row key={order.orderId} last={index === all.length - 1}>
                {isVisible(visibleColumns, 'si') && (
                  <Cell width={w('si')} numberOfLines={1}>
                    {String((currentPage - 1) * pageSize + index + 1)}
                  </Cell>
                )}
                {isVisible(visibleColumns, 'orderId') && (
                  <Cell width={w('orderId')}>
                    <Span className="text-sm font-semibold text-slate-900">{order.orderId}</Span>
                  </Cell>
                )}
                {isVisible(visibleColumns, 'orderDate') && (
                  <Cell width={w('orderDate')}>
                    <Span className="text-sm text-slate-700">
                      {order.date}, {order.time}
                    </Span>
                  </Cell>
                )}
                {isVisible(visibleColumns, 'orderOtp') && (
                  <Cell width={w('orderOtp')} numberOfLines={1}>
                    <Span className="text-sm font-semibold text-slate-900">{isCancelledOtp ? 'N/A' : order.orderOtp || '--'}</Span>
                  </Cell>
                )}
                {isVisible(visibleColumns, 'customer') && (
                  <Cell width={w('customer')}>
                    <Div className="gap-0.5">
                      <Span className="text-sm font-medium text-slate-900">{order.customerName}</Span>
                      <Span className="text-xs text-slate-500">{order.customerPhone}</Span>
                    </Div>
                  </Cell>
                )}
                {isVisible(visibleColumns, 'restaurant') && <Cell width={w('restaurant')}>{formatRestaurantName(order.restaurant)}</Cell>}
                {isVisible(visibleColumns, 'foodItems') && (
                  <Cell width={w('foodItems')}>
                    {items.length > 0 ? (
                      <Div className="gap-2">
                        {itemsToShow.map((item, idx) => (
                          <Div key={item.itemId || `${order.orderId}-item-${idx}`} className="flex-row items-start gap-2">
                            <Div className="px-1.5 py-0.5 rounded bg-slate-100 min-w-[32px] items-center">
                              <Span className="text-xs font-semibold text-slate-700">{item.quantity || 1}x</Span>
                            </Div>
                            <Div className="flex-1 gap-0.5">
                              <Span className="text-sm text-slate-800">{item.name || item.itemName || item.title || 'Unknown Item'}</Span>
                              {item.variantName ? <Span className="text-xs text-slate-500">{item.variantName}</Span> : null}
                            </Div>
                          </Div>
                        ))}
                        {items.length > 1 ? (
                          <Button
                            onClick={() => toggleOrderExpand(order.orderId)}
                            className="flex-row items-center gap-1 self-start h-11 px-1"
                            accessibilityLabel={isExpanded ? 'Show fewer items' : `Show ${items.length - 1} more items`}
                          >
                            <Span className="text-xs font-semibold text-blue-600">{isExpanded ? 'View less' : `+${items.length - 1} more items`}</Span>
                            <UiIcon as={isExpanded ? ChevronUp : ChevronDown} size={14} className="text-blue-600" />
                          </Button>
                        ) : null}
                      </Div>
                    ) : (
                      <Span className="text-sm text-slate-400">No items found</Span>
                    )}
                  </Cell>
                )}
                {isVisible(visibleColumns, 'itemPrice') && (
                  <Cell width={w('itemPrice')} align="right">
                    {items.length > 0 ? (
                      <Div className="gap-2 items-end">
                        {itemsToShow.map((item, idx) => {
                          const qty = Number(item.quantity || 1) || 1;
                          return (
                            <Span key={item.itemId || `${order.orderId}-price-${idx}`} className="text-sm text-slate-700">
                              {formatINR(resolveRestaurantItemUnitPrice(item) * qty)}
                            </Span>
                          );
                        })}
                      </Div>
                    ) : (
                      <Span className="text-sm text-slate-400">-</Span>
                    )}
                  </Cell>
                )}
                {isVisible(visibleColumns, 'deliveryCharge') && (
                  <Cell width={w('deliveryCharge')} align="right" numberOfLines={1}>
                    <Span className="text-sm text-slate-700">{formatINR(order.deliveryCharge ?? 0, 2)}</Span>
                  </Cell>
                )}
                {isVisible(visibleColumns, 'totalAmount') && (
                  <Cell width={w('totalAmount')} align="right">
                    <Div className="items-end gap-0.5">
                      <Span className="text-sm font-semibold text-slate-900">
                        {(() => {
                          const rawAmount = order.totalAmount ?? order.total ?? order.pricing?.total ?? 0;
                          const amount = Number.isFinite(Number(rawAmount)) ? Number(rawAmount) : 0;
                          return formatINR(amount, 2);
                        })()}
                      </Span>
                      {(() => {
                        const base = Number(order.baseSubtotal) || Number(order.pricing?.baseSubtotal) || 0;
                        let markup = Number(order.markupTotal) || Number(order.pricing?.markupTotal) || 0;
                        if (!(markup > 0) && Array.isArray(order.items)) {
                          markup = order.items.reduce((sum, item) => {
                            const qty = Number(item.quantity || 1) || 1;
                            return sum + resolveItemMarkupUnit(item) * qty;
                          }, 0);
                        }
                        if (!(markup > 0)) return null;
                        const restaurantBase =
                          base > 0
                            ? base
                            : Array.isArray(order.items)
                              ? order.items.reduce((sum, item) => {
                                  const qty = Number(item.quantity || 1) || 1;
                                  return sum + resolveRestaurantItemUnitPrice(item) * qty;
                                }, 0)
                              : 0;
                        return (
                          <Span className="text-xs text-slate-500">
                            {formatINR(restaurantBase)} <Span className="text-red-600">+ {formatINR(markup)}</Span>
                          </Span>
                        );
                      })()}
                      <Span className={`text-xs ${paymentStatusClass(order.paymentStatus)}`}>{order.paymentStatus}</Span>
                    </Div>
                  </Cell>
                )}
                {isVisible(visibleColumns, 'paymentType') && (
                  <Cell width={w('paymentType')}>
                    <Span className="text-sm text-slate-700">{paymentTypeOf(order)}</Span>
                  </Cell>
                )}
                {isVisible(visibleColumns, 'paymentCollectionStatus') && (
                  <Cell width={w('paymentCollectionStatus')}>
                    <Div className="gap-0.5">
                      <Span className={`text-sm font-medium ${paymentStatusClass(order.paymentStatus)}`}>{order.paymentStatus || 'Pending'}</Span>
                      {order.paymentCollectionStatus ? <Span className="text-xs text-slate-500">{order.paymentCollectionStatus}</Span> : null}
                    </Div>
                  </Cell>
                )}
                {isVisible(visibleColumns, 'orderStatus') && (
                  <Cell width={w('orderStatus')}>
                    <Div className="gap-1.5">
                      <StatusBadge status={order.orderStatus} tone={STATUS_TONE[order.orderStatus]} label={order.orderStatus} />
                      {order.deliveryType ? <Span className="text-xs text-slate-500">{order.deliveryType}</Span> : null}
                      {order.cancellationReason
                        ? (() => {
                            const rowKey = order.id || order.orderId;
                            const isOpen = openReasonId === rowKey;
                            return (
                              <Button
                                onClick={() => setOpenReasonId(isOpen ? null : rowKey)}
                                className="self-start gap-1 px-2 py-2 rounded-lg border border-slate-200 bg-white"
                                accessibilityLabel={isOpen ? 'Hide cancellation reason' : 'Show cancellation reason'}
                              >
                                <Div className="flex-row items-center gap-1">
                                  <Span className="text-xs font-semibold text-red-600">Reason</Span>
                                  <UiIcon as={isOpen ? ChevronUp : ChevronDown} size={12} className="text-red-600" />
                                </Div>
                                {isOpen ? <Span className="text-xs text-slate-700">{order.cancellationReason}</Span> : null}
                              </Button>
                            );
                          })()
                        : null}
                    </Div>
                  </Cell>
                )}
                {isVisible(visibleColumns, 'actions') && (
                  <Cell width={w('actions')}>
                    <Div className="flex-row flex-wrap items-center gap-1">
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
                      {order.orderStatus === 'Pending' && onAcceptOrder ? (
                        <Button
                          onClick={() => onAcceptOrder(order)}
                          disabled={isRowLoading}
                          className={`${BTN_PRIMARY} px-3`}
                          accessibilityLabel={`Accept order ${order.orderId}`}
                        >
                          <UiIcon as={isRowLoading && actionLoadingType === 'accept' ? Loader2 : Check} size={14} className="text-white" />
                          <Span className={BTN_TEXT_PRIMARY}>{isRowLoading && actionLoadingType === 'accept' ? 'Accepting…' : 'Accept'}</Span>
                        </Button>
                      ) : null}
                      {order.orderStatus === 'Pending' && onRejectOrder ? (
                        <Button
                          onClick={() => onRejectOrder(order)}
                          disabled={isRowLoading}
                          className={`${BTN_DANGER} px-3`}
                          accessibilityLabel={`Reject order ${order.orderId}`}
                        >
                          <UiIcon as={isRowLoading && actionLoadingType === 'reject' ? Loader2 : X} size={14} className="text-white" />
                          <Span className={BTN_TEXT_PRIMARY}>{isRowLoading && actionLoadingType === 'reject' ? 'Rejecting…' : 'Reject'}</Span>
                        </Button>
                      ) : null}
                      {canRefund(order)
                        ? order.refundStatus === 'processed' || order.refundStatus === 'initiated'
                          ? <StatusBadge status="refunded" label={order.paymentType === 'Wallet' || order.payment?.method === 'wallet' ? 'Wallet refunded' : 'Refunded'} />
                          : onRefund
                            ? (
                                <Button onClick={() => onRefund(order)} className={`${BTN_PRIMARY} px-3`} accessibilityLabel={`Refund order ${order.orderId}`}>
                                  <Span className={BTN_TEXT_PRIMARY}>₹ Refund</Span>
                                </Button>
                              )
                            : null
                        : null}
                    </Div>
                  </Cell>
                )}
              </Row>
            );
          })}
        </TBody>
      </DataTable>
      {totalCount > 0 ? (
        <>
          <Pagination
            page={currentPage}
            pages={totalPages}
            total={totalCount}
            onPrev={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            onNext={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          />
          <Card className="mt-3 flex-row items-center justify-between gap-3">
            <Span className="text-sm text-slate-500">Rows per page</Span>
            <Select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900">
              <Option value={10}>10</Option>
              <Option value={20}>20</Option>
              <Option value={50}>50</Option>
              <Option value={100}>100</Option>
            </Select>
          </Card>
        </>
      ) : null}
    </>
  );
}
