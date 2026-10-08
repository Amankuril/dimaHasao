/* Ported from Frontend/src/modules/Food/components/admin/orders/OrdersTable.jsx (tools/port.js first pass). */
import { useState, useEffect, useMemo } from 'react';
import { Eye, Printer, ArrowUpDown, Loader2, Check, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { resolveRestaurantItemUnitPrice, resolveItemMarkupUnit } from '../../../utils/restaurantOrderPricing';
import { Button, Div, Option, P, Select, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
const formatINR = (value, digits = 0) =>
  `₹${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: 2,
  })}`;
const getStatusColor = (orderStatus) => {
  const colors = {
    Delivered: 'bg-emerald-100 text-emerald-700',
    Pending: 'bg-blue-100 text-blue-700',
    Scheduled: 'bg-blue-100 text-blue-700',
    Accepted: 'bg-green-100 text-green-700',
    Processing: 'bg-orange-100 text-orange-700',
    'Food On The Way': 'bg-yellow-100 text-yellow-700',
    Canceled: 'bg-rose-100 text-rose-700',
    'Cancelled by Restaurant': 'bg-red-100 text-red-700',
    'Cancelled by User': 'bg-orange-100 text-orange-700',
    'Payment Failed': 'bg-red-100 text-red-700',
    Refunded: 'bg-sky-100 text-sky-700',
    'Dine In': 'bg-indigo-100 text-indigo-700',
    'Offline Payments': 'bg-slate-100 text-slate-700',
  };
  return colors[orderStatus] || 'bg-slate-100 text-slate-700';
};
const getPaymentStatusColor = (paymentStatus) => {
  if (paymentStatus === 'Paid' || paymentStatus === 'Collected') return 'text-emerald-600';
  if (paymentStatus === 'COD Pending' || paymentStatus === 'Not Collected') return 'text-amber-600';
  if (paymentStatus === 'Refunded') return 'text-sky-600';
  if (paymentStatus === 'Unpaid' || paymentStatus === 'Failed') return 'text-red-600';
  return 'text-slate-600';
};
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
    return (
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <Div className="flex flex-col items-center justify-center py-20">
          <Div className="w-32 h-32 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <Div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center shadow-md">
              <Span className="text-5xl text-orange-500 font-bold">!</Span>
            </Div>
          </Div>
          <P className="text-lg font-semibold text-slate-700 mb-1">No Data Found</P>
          <P className="text-sm text-slate-500">There are no orders matching your criteria</P>
        </Div>
      </Div>
    );
  }
  const cols = [
    visibleColumns.si && 80,
    visibleColumns.orderId && 150,
    visibleColumns.orderDate && 200,
    visibleColumns.orderOtp && 130,
    visibleColumns.customer && 230,
    visibleColumns.restaurant && 220,
    visibleColumns.foodItems && 280,
    visibleColumns.itemPrice && 130,
    visibleColumns.deliveryCharge && 160,
    visibleColumns.totalAmount && 160,
    visibleColumns.paymentType !== false && 160,
    visibleColumns.paymentCollectionStatus !== false && 160,
    visibleColumns.orderStatus && 190,
    visibleColumns.actions && 300,
  ].filter(Boolean);
  return (
    <Div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full max-w-full">
      <Table cols={cols} className="w-full">
          <Thead className="bg-slate-50 border-b border-slate-200">
            <Tr>
              {visibleColumns.si && (
                <Th className="w-[50px] px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                  <Div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort('si')}>
                    <Span>SI</Span>
                    <UiIcon
                      as={ArrowUpDown}
                      className={`w-3 h-3 transition-colors ${sortConfig.key === 'si' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}
                    />
                  </Div>
                </Th>
              )}
              {visibleColumns.orderId && (
                <Th className="w-[110px] px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                  <Div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort('orderId')}>
                    <Span>Order ID</Span>
                    <UiIcon
                      as={ArrowUpDown}
                      className={`w-3 h-3 transition-colors ${sortConfig.key === 'orderId' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}
                    />
                  </Div>
                </Th>
              )}
              {visibleColumns.orderDate && (
                <Th className="w-[160px] px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                  <Div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort('orderDate')}>
                    <Span>Order Date</Span>
                    <UiIcon
                      as={ArrowUpDown}
                      className={`w-3 h-3 transition-colors ${sortConfig.key === 'orderDate' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}
                    />
                  </Div>
                </Th>
              )}
              {visibleColumns.orderOtp && (
                <Th className="w-[90px] px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                  <Div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort('orderOtp')}>
                    <Span>Order OTP</Span>
                    <UiIcon
                      as={ArrowUpDown}
                      className={`w-3 h-3 transition-colors ${sortConfig.key === 'orderOtp' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}
                    />
                  </Div>
                </Th>
              )}
              {visibleColumns.customer && (
                <Th className="w-[200px] px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                  <Div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort('customer')}>
                    <Span>Customer Information</Span>
                    <UiIcon
                      as={ArrowUpDown}
                      className={`w-3 h-3 transition-colors ${sortConfig.key === 'customer' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}
                    />
                  </Div>
                </Th>
              )}
              {visibleColumns.restaurant && (
                <Th className="w-[200px] px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                  <Div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort('restaurant')}>
                    <Span>Restaurant</Span>
                    <UiIcon
                      as={ArrowUpDown}
                      className={`w-3 h-3 transition-colors ${sortConfig.key === 'restaurant' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}
                    />
                  </Div>
                </Th>
              )}
              {visibleColumns.foodItems && (
                <Th className="w-[240px] px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                  <Div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort('foodItems')}>
                    <Span>Food Items</Span>
                    <UiIcon
                      as={ArrowUpDown}
                      className={`w-3 h-3 transition-colors ${sortConfig.key === 'foodItems' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}
                    />
                  </Div>
                </Th>
              )}
              {visibleColumns.itemPrice && (
                <Th className="w-[100px] px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                  <Div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort('itemPrice')}>
                    <Span>Price</Span>
                    <UiIcon
                      as={ArrowUpDown}
                      className={`w-3 h-3 transition-colors ${sortConfig.key === 'itemPrice' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}
                    />
                  </Div>
                </Th>
              )}
              {visibleColumns.deliveryCharge && (
                <Th className="w-[110px] px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                  <Div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort('deliveryCharge')}>
                    <Span>Delivery Charge</Span>
                    <UiIcon
                      as={ArrowUpDown}
                      className={`w-3 h-3 transition-colors ${sortConfig.key === 'deliveryCharge' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}
                    />
                  </Div>
                </Th>
              )}
              {visibleColumns.totalAmount && (
                <Th className="w-[120px] px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                  <Div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort('totalAmount')}>
                    <Span>Total Amount</Span>
                    <UiIcon
                      as={ArrowUpDown}
                      className={`w-3 h-3 transition-colors ${sortConfig.key === 'totalAmount' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}
                    />
                  </Div>
                </Th>
              )}
              {visibleColumns.paymentType !== false && (
                <Th className="w-[120px] px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                  <Div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort('paymentType')}>
                    <Span>Payment Type</Span>
                    <UiIcon
                      as={ArrowUpDown}
                      className={`w-3 h-3 transition-colors ${sortConfig.key === 'paymentType' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}
                    />
                  </Div>
                </Th>
              )}
              {visibleColumns.paymentCollectionStatus !== false && (
                <Th className="w-[120px] px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                  <Div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort('paymentCollectionStatus')}>
                    <Span>Payment Status</Span>
                    <UiIcon
                      as={ArrowUpDown}
                      className={`w-3 h-3 transition-colors ${sortConfig.key === 'paymentCollectionStatus' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}
                    />
                  </Div>
                </Th>
              )}

              {visibleColumns.orderStatus && (
                <Th className="w-[150px] px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                  <Div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort('orderStatus')}>
                    <Span>Order Status</Span>
                    <UiIcon
                      as={ArrowUpDown}
                      className={`w-3 h-3 transition-colors ${sortConfig.key === 'orderStatus' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}
                    />
                  </Div>
                </Th>
              )}
              {visibleColumns.actions && (
                <Th className="w-[220px] px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Actions</Th>
              )}
            </Tr>
          </Thead>
          <Tbody className="bg-white divide-y divide-slate-100">
            {paginatedOrders.map((order, index) => (
              <Tr key={order.orderId} className="hover:bg-slate-50 transition-colors">
                {visibleColumns.si && (
                  <Td className="px-6 py-4 whitespace-nowrap">
                    <Span className="text-sm font-medium text-slate-700">{(currentPage - 1) * pageSize + index + 1}</Span>
                  </Td>
                )}
                {visibleColumns.orderId && (
                  <Td className="px-6 py-4 whitespace-nowrap">
                    <Span className="text-sm font-medium text-slate-900">{order.orderId}</Span>
                  </Td>
                )}
                {visibleColumns.orderDate && (
                  <Td className="px-6 py-4 whitespace-nowrap">
                    <Span className="text-sm font-medium text-slate-700">
                      {order.date}, {order.time}
                    </Span>
                  </Td>
                )}
                {visibleColumns.orderOtp && (
                  <Td className="px-6 py-4 whitespace-nowrap">
                    {order.orderStatus === 'Cancelled' ||
                    order.orderStatus === 'Cancelled by Restaurant' ||
                    order.orderStatus === 'Cancelled by User' ||
                    order.orderStatus === 'Canceled' ? (
                      <Span className="text-sm font-medium text-slate-900">N/A</Span>
                    ) : (
                      <Span className="text-sm font-semibold text-slate-900">{order.orderOtp || '--'}</Span>
                    )}
                  </Td>
                )}
                {visibleColumns.customer && (
                  <Td className="px-6 py-4">
                    <Div className="flex flex-col">
                      <Span className="text-sm font-medium text-slate-700">{order.customerName}</Span>
                      <Span className="text-xs text-slate-500 mt-0.5">{order.customerPhone}</Span>
                    </Div>
                  </Td>
                )}
                {visibleColumns.restaurant && (
                  <Td className="px-6 py-4 whitespace-nowrap">
                    <Span className="text-sm font-medium text-slate-700">{formatRestaurantName(order.restaurant)}</Span>
                  </Td>
                )}
                {visibleColumns.foodItems && (
                  <Td className="px-6 py-4">
                    <Div className="flex flex-col gap-2 min-w-[200px] max-w-md">
                      {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
                        (() => {
                          const isExpanded = expandedOrders[order.orderId] || false;
                          const hasMore = order.items.length > 1;
                          const itemsToShow = isExpanded ? order.items : order.items.slice(0, 1);
                          const remainingCount = order.items.length - 1;
                          return (
                            <>
                              {itemsToShow.map((item, idx) => (
                                <Div key={idx || item.itemId || idx} className="flex items-center gap-2 text-sm animate-fadeIn">
                                  <Span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded min-w-[2.5rem] text-center self-start mt-0.5">
                                    {item.quantity || 1}x
                                  </Span>
                                  <Div className="flex-1">
                                    <Span className="text-slate-800 font-medium">{item.name || item.itemName || item.title || 'Unknown Item'}</Span>
                                    {item.variantName && <P className="text-xs text-slate-500 font-medium">{item.variantName}</P>}
                                  </Div>
                                </Div>
                              ))}
                              {hasMore && (
                                <Button
                                  onClick={() => toggleOrderExpand(order.orderId)}
                                  className="px-2 py-0.5 bg-green-600 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm w-fit mt-1.5 active:scale-95"
                                >
                                  <Span>{isExpanded ? 'View Less' : `+${remainingCount} More Items`}</Span>
                                  {isExpanded ? (
                                    <UiIcon as={ChevronUp} className="w-3.5 h-3.5 text-white" />
                                  ) : (
                                    <UiIcon as={ChevronDown} className="w-3.5 h-3.5 text-white" />
                                  )}
                                </Button>
                              )}
                            </>
                          );
                        })()
                      ) : (
                        <Span className="text-sm text-slate-400 italic">No items found</Span>
                      )}
                    </Div>
                  </Td>
                )}
                {visibleColumns.itemPrice && (
                  <Td className="px-6 py-4 text-left">
                    <Div className="flex flex-col gap-2">
                      {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
                        (() => {
                          const isExpanded = expandedOrders[order.orderId] || false;
                          const itemsToShow = isExpanded ? order.items : order.items.slice(0, 1);
                          return (
                            <>
                              {itemsToShow.map((item, idx) => {
                                const qty = Number(item.quantity || 1) || 1;
                                const baseUnit = resolveRestaurantItemUnitPrice(item);
                                const baseLine = baseUnit * qty;
                                return (
                                  <Div key={idx || item.itemId || `item-price-${idx}`} className="text-sm text-left min-h-[20px] flex items-center">
                                    <Span className="font-medium text-slate-700">{formatINR(baseLine)}</Span>
                                  </Div>
                                );
                              })}
                              {
                                order.items.length > 1 && <Div className="h-[20px]" /> // Spacer to balance the View More button height in foodItems column!
                              }
                            </>
                          );
                        })()
                      ) : (
                        <Span className="text-sm text-slate-400 italic">-</Span>
                      )}
                    </Div>
                  </Td>
                )}
                {visibleColumns.deliveryCharge && (
                  <Td className="px-6 py-4 whitespace-nowrap text-left">
                    <Span className="text-sm font-medium text-slate-700">
                      {(() => {
                        const deliveryCharge = Number(order.deliveryCharge ?? 0);
                        return `₹${deliveryCharge.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`;
                      })()}
                    </Span>
                  </Td>
                )}
                {visibleColumns.totalAmount && (
                  <Td className="px-6 py-4 whitespace-nowrap text-left">
                    <Div className="text-sm font-medium text-slate-900">
                      {(() => {
                        const rawAmount = order.totalAmount ?? order.total ?? order.pricing?.total ?? 0;
                        const amount = Number.isFinite(Number(rawAmount)) ? Number(rawAmount) : 0;
                        return formatINR(amount, 2);
                      })()}
                    </Div>
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
                        <Div className="text-[11px] mt-0.5 font-semibold text-slate-500">
                          {formatINR(restaurantBase)} <Span className="text-rose-600">+ {formatINR(markup)}</Span>
                        </Div>
                      );
                    })()}
                    <Div className={`text-xs mt-0.5 text-left ${getPaymentStatusColor(order.paymentStatus)}`}>{order.paymentStatus}</Div>
                  </Td>
                )}
                {visibleColumns.paymentType !== false && (
                  <Td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      // Determine payment type display
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

                      // Override if payment method is wallet but paymentType is not set correctly
                      if (paymentMethod === 'wallet' && paymentTypeDisplay !== 'Wallet') {
                        paymentTypeDisplay = 'Wallet';
                      }
                      const isCod = paymentTypeDisplay === 'Cash on Delivery' || paymentTypeDisplay === 'COD (QR)';
                      const isWallet = paymentTypeDisplay === 'Wallet';
                      return (
                        <Span className={`text-sm font-medium ${isCod ? 'text-amber-600' : isWallet ? 'text-purple-600' : 'text-emerald-600'}`}>
                          {paymentTypeDisplay}
                        </Span>
                      );
                    })()}
                  </Td>
                )}
                {visibleColumns.paymentCollectionStatus !== false && (
                  <Td className="px-6 py-4 whitespace-nowrap">
                    <Div className="flex flex-col">
                      <Span className={`text-sm font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>{order.paymentStatus || 'Pending'}</Span>
                      {order.paymentCollectionStatus && <Span className="text-xs text-slate-500 mt-0.5">{order.paymentCollectionStatus}</Span>}
                    </Div>
                  </Td>
                )}

                {visibleColumns.orderStatus && (
                  <Td className="px-6 py-4 whitespace-nowrap">
                    <Div className="flex flex-col gap-1">
                      <Div className="flex items-center gap-2">
                        <Span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.orderStatus)}`}>
                          {order.orderStatus}
                        </Span>
                        <Span className="text-xs text-slate-500">{order.deliveryType}</Span>
                      </Div>
                      {order.cancellationReason &&
                        (() => {
                          const rowKey = order.id || order.orderId;
                          const isOpen = openReasonId === rowKey;
                          return (
                            <Div className="mt-1 max-w-[240px]">
                              <Button
                                type="button"
                                onClick={() => setOpenReasonId(isOpen ? null : rowKey)}
                                className={`rounded-md border border-red-200 bg-red-50 text-left transition-colors hover:bg-red-100 ${isOpen ? 'flex w-full flex-col items-start gap-1.5 px-2.5 py-2' : 'inline-flex items-center gap-1 px-2 py-0.5'}`}
                              >
                                <Span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                                  Reason
                                  {isOpen ? <UiIcon as={ChevronUp} className="w-3 h-3" /> : <UiIcon as={ChevronDown} className="w-3 h-3" />}
                                </Span>
                                {isOpen ? (
                                  <Span className="text-xs font-medium leading-snug text-red-700 whitespace-normal break-words">
                                    {order.cancellationReason}
                                  </Span>
                                ) : null}
                              </Button>
                            </Div>
                          );
                        })()}
                    </Div>
                  </Td>
                )}
                {visibleColumns.actions && (
                  <Td className="px-6 py-4 whitespace-nowrap text-center">
                    <Div className="flex items-center justify-center gap-3">
                      {/* Secondary Actions (Icon-only buttons) - Always aligned together */}
                      <Div className="flex items-center gap-1">
                        <Button
                          onClick={() => onViewOrder(order)}
                          className="p-1.5 rounded text-orange-600 hover:bg-orange-50 transition-colors flex items-center justify-center"
                        >
                          <UiIcon as={Eye} className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => onPrintOrder(order)}
                          className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center"
                        >
                          <UiIcon as={Printer} className="w-4 h-4" />
                        </Button>
                      </Div>

                      {/* Divider if we have primary actions */}
                      {((order.orderStatus === 'Pending' && (onAcceptOrder || onRejectOrder)) ||
                        (() => {
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
                        })()) && <Div className="h-4 w-[1px] bg-slate-200" />}

                      {/* Primary Actions (Text/Status buttons) */}
                      <Div className="flex items-center gap-2">
                        {order.orderStatus === 'Pending' &&
                          onAcceptOrder &&
                          (() => {
                            const isRowLoading = actionLoadingOrderId === (order.id || order.orderId);
                            const isAccepting = isRowLoading && actionLoadingType === 'accept';
                            return (
                              <Button
                                onClick={() => onAcceptOrder(order)}
                                disabled={isRowLoading}
                                className="px-2.5 py-1.5 rounded text-xs font-semibold text-white bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 flex items-center gap-1"
                              >
                                {isAccepting ? <UiIcon as={Loader2} className="w-3.5 h-3.5 animate-spin" /> : <UiIcon as={Check} className="w-3.5 h-3.5" />}
                                <Span>{isAccepting ? 'Accepting...' : 'Accept'}</Span>
                              </Button>
                            );
                          })()}
                        {order.orderStatus === 'Pending' &&
                          onRejectOrder &&
                          (() => {
                            const isRowLoading = actionLoadingOrderId === (order.id || order.orderId);
                            const isRejecting = isRowLoading && actionLoadingType === 'reject';
                            return (
                              <Button
                                onClick={() => onRejectOrder(order)}
                                disabled={isRowLoading}
                                className="px-2.5 py-1.5 rounded text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                              >
                                {isRejecting ? <UiIcon as={Loader2} className="w-3.5 h-3.5 animate-spin" /> : <UiIcon as={X} className="w-3.5 h-3.5" />}
                                <Span>{isRejecting ? 'Rejecting...' : 'Reject'}</Span>
                              </Button>
                            );
                          })()}

                        {/* Refund Block */}
                        {(() => {
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
                        })() && (
                          <>
                            {order.refundStatus === 'processed' || order.refundStatus === 'initiated' ? (
                              <Span
                                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold ${order.paymentType === 'Wallet' || order.payment?.method === 'wallet' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}
                              >
                                {order.paymentType === 'Wallet' || order.payment?.method === 'wallet' ? 'Wallet Refunded' : 'Refunded'}
                              </Span>
                            ) : onRefund ? (
                              <Button
                                onClick={() => onRefund(order)}
                                className={`px-3 py-1.5 rounded-md text-white text-xs font-semibold hover:opacity-90 transition-colors shadow-sm flex items-center gap-1 ${order.paymentType === 'Wallet' || order.payment?.method === 'wallet' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                              >
                                <Span className="text-sm font-bold">₹</Span>
                                <Span>Refund</Span>
                              </Button>
                            ) : null}
                          </>
                        )}
                      </Div>
                    </Div>
                  </Td>
                )}
              </Tr>
            ))}
          </Tbody>
      </Table>

      {/* Pagination Controls — same pattern as Delivery Man List */}
      {totalCount > 0 && (
        <Div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 bg-white px-4 py-4 sm:px-6">
          <Div className="flex items-center gap-3">
            <Span className="text-sm text-slate-500 font-medium">Rows per page:</Span>
            <Select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 cursor-pointer shadow-sm"
            >
              <Option value={10}>10</Option>
              <Option value={20}>20</Option>
              <Option value={50}>50</Option>
              <Option value={100}>100</Option>
            </Select>
          </Div>

          <Div className="flex flex-1 justify-between sm:hidden w-full">
            <Button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Previous
            </Button>
            <Button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Next
            </Button>
          </Div>

        </Div>
      )}
    </Div>
  );
}
