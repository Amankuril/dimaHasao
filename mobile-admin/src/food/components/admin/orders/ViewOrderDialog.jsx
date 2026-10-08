/* Ported from Frontend/src/modules/Food/components/admin/orders/ViewOrderDialog.jsx (tools/port.js first pass). */
import { useEffect, useState } from 'react';
import {
  Eye,
  MapPin,
  Package,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Truck,
  CreditCard,
  Receipt,
  CheckCircle2,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/shadcn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/shadcn';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { removePlusCode } from '../../../utils/common';
import { resolveRestaurantItemUnitPrice, resolveItemMarkupUnit } from '../../../utils/restaurantOrderPricing';
import { A, Button, Div, H3, H4, Img, Label, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
import { StatusBadge, useLayoutWidth, BTN_PRIMARY, BTN_TEXT_PRIMARY } from '../../../../admin/ui';

/* These order statuses are product words, not the kit's status vocabulary, so
   each maps to one kit tone and keeps a single colour across the panels. */
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
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const ADMIN_ORDER_STATUS_OPTIONS = [
  'Pending',
  'Accepted',
  'Processing',
  'Ready for Pickup',
  'Food On The Way',
  'Delivered',
  'Cancelled by User',
  'Cancelled by Restaurant',
  'Canceled',
];
const ADMIN_PAYMENT_STATUS_OPTIONS = ['Pending', 'Paid', 'COD Pending', 'Failed', 'Refunded'];
const resolveCustomerId = (order) => {
  if (!order) return null;
  return order.customerId || order.userId?._id || order.userId?.id || (typeof order.userId === 'string' ? order.userId : null);
};
const getPaymentStatusColor = (paymentStatus) => {
  if (paymentStatus === 'Paid' || paymentStatus === 'Collected') return 'text-green-700';
  if (paymentStatus === 'COD Pending' || paymentStatus === 'Not Collected') return 'text-amber-700';
  if (paymentStatus === 'Unpaid' || paymentStatus === 'Failed') return 'text-red-600';
  return 'text-slate-600';
};
const resolveDisplayOrderStatus = (order) => {
  if (!order) return 'Pending';
  const existing = String(order.orderStatus || '').trim();
  if (ADMIN_ORDER_STATUS_OPTIONS.includes(existing)) return existing;
  const backendStatus = String(order.orderStatus || order.status || '').toLowerCase();
  if (!backendStatus || backendStatus === 'created') return 'Pending';
  if (backendStatus === 'confirmed') return 'Accepted';
  if (backendStatus === 'preparing') return 'Processing';
  if (backendStatus === 'ready_for_pickup') return 'Ready for Pickup';
  if (backendStatus === 'reached_pickup') return 'Ready for Pickup';
  if (backendStatus === 'picked_up' || backendStatus === 'reached_drop') return 'Food On The Way';
  if (backendStatus === 'delivered') return 'Delivered';
  if (backendStatus === 'cancelled_by_restaurant') return 'Cancelled by Restaurant';
  if (backendStatus === 'cancelled_by_user') return 'Cancelled by User';
  if (backendStatus === 'cancelled_by_admin') return 'Canceled';
  return existing || 'Pending';
};
const resolveDisplayPaymentStatus = (order) => {
  if (!order) return 'Pending';

  // 1:1 with DB payment.status (friendly labels only)
  const raw = String(order.payment?.status || '').toLowerCase();
  if (raw === 'refunded') return 'Refunded';
  if (raw === 'failed') return 'Failed';
  if (raw === 'paid' || raw === 'authorized' || raw === 'captured' || raw === 'settled') {
    return 'Paid';
  }
  if (raw === 'cod_pending') return 'COD Pending';

  // Legacy UI labels → current friendly labels
  if (order.paymentStatus === 'Collected') return 'Paid';
  if (order.paymentStatus === 'Not Collected') return 'COD Pending';
  if (ADMIN_PAYMENT_STATUS_OPTIONS.includes(order.paymentStatus)) {
    return order.paymentStatus;
  }
  return 'Pending';
};
export default function ViewOrderDialog({ isOpen, onOpenChange, order, onOrderUpdated }) {
  const { tablet } = useLayoutWidth();
  const [customerTotalOrders, setCustomerTotalOrders] = useState(undefined);
  const [customerDeliveredOrders, setCustomerDeliveredOrders] = useState(undefined);
  const [customerCancelledOrders, setCustomerCancelledOrders] = useState(undefined);
  const [loadingCustomerOrders, setLoadingCustomerOrders] = useState(false);
  const [loadedCustomerId, setLoadedCustomerId] = useState(null);
  const [draftOrderStatus, setDraftOrderStatus] = useState('Pending');
  const [draftPaymentStatus, setDraftPaymentStatus] = useState('Pending');
  const [updatingStatuses, setUpdatingStatuses] = useState(false);
  const [billImageFailed, setBillImageFailed] = useState(false);
  const billImageSrc = order?.billImageUrl || order?.billImage || order?.deliveryState?.billImageUrl;
  useEffect(() => {
    setBillImageFailed(false);
  }, [billImageSrc]);
  useEffect(() => {
    if (!isOpen || !order) return;
    setDraftOrderStatus(resolveDisplayOrderStatus(order));
    setDraftPaymentStatus(resolveDisplayPaymentStatus(order));
  }, [isOpen, order?.id, order?.orderId, order?.orderStatus, order?.paymentStatus, order?.payment?.status]);
  useEffect(() => {
    if (draftOrderStatus === 'Delivered' && draftPaymentStatus !== 'Paid') {
      setDraftPaymentStatus('Paid');
    }
  }, [draftOrderStatus]);
  const baselineOrderStatus = resolveDisplayOrderStatus(order);
  const baselinePaymentStatus = resolveDisplayPaymentStatus(order);
  const hasAdminStatusChanges = draftOrderStatus !== baselineOrderStatus || draftPaymentStatus !== baselinePaymentStatus;
  useEffect(() => {
    if (!isOpen || !order) return;
    const customerId = resolveCustomerId(order);
    if (!customerId) {
      setCustomerTotalOrders(null);
      setCustomerDeliveredOrders(null);
      setCustomerCancelledOrders(null);
      setLoadingCustomerOrders(false);
      setLoadedCustomerId(null);
      return;
    }
    let cancelled = false;
    setLoadingCustomerOrders(true);
    setCustomerTotalOrders(undefined);
    setCustomerDeliveredOrders(undefined);
    setCustomerCancelledOrders(undefined);
    setLoadedCustomerId(null);
    (async () => {
      try {
        const response = await adminAPI.getCustomerById(customerId);
        const data = response?.data?.data || response?.data;
        const user = data?.user || data?.customer;
        if (!cancelled) {
          setCustomerTotalOrders(Number(user?.totalOrders ?? user?.totalOrder ?? 0));
          setCustomerDeliveredOrders(Number(user?.totalDeliveredOrders ?? 0));
          setCustomerCancelledOrders(Number(user?.totalCancelledOrders ?? 0));
          setLoadedCustomerId(customerId);
        }
      } catch (error) {
        debugError('Error fetching customer order count:', error);
        if (!cancelled) {
          setCustomerTotalOrders(null);
          setCustomerDeliveredOrders(null);
          setCustomerCancelledOrders(null);
          setLoadedCustomerId(customerId);
        }
      } finally {
        if (!cancelled) setLoadingCustomerOrders(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, order?.id, order?.orderId, order?.customerId, order?.userId]);
  if (!order) return null;
  const customerId = resolveCustomerId(order);
  const showTotalOrdersSkeleton = Boolean(customerId) && (loadingCustomerOrders || loadedCustomerId !== customerId);
  const customerPendingOrders =
    typeof customerTotalOrders === 'number' ? Math.max(0, customerTotalOrders - (customerDeliveredOrders || 0) - (customerCancelledOrders || 0)) : undefined;
  const displayOrderStatus = resolveDisplayOrderStatus(order);
  const displayPaymentStatus = resolveDisplayPaymentStatus(order);
  const handleAdminStatusUpdate = async () => {
    if (!hasAdminStatusChanges || updatingStatuses) return;
    const orderKey = order.id || order._id || order.orderId;
    if (!orderKey) {
      toast.error('Order id not found');
      return;
    }
    const payload = {};
    if (draftOrderStatus !== baselineOrderStatus) payload.orderStatus = draftOrderStatus;
    if (draftPaymentStatus !== baselinePaymentStatus) payload.paymentStatus = draftPaymentStatus;
    if (!payload.orderStatus && !payload.paymentStatus) return;
    setUpdatingStatuses(true);
    try {
      const response = await adminAPI.updateOrderStatuses(orderKey, payload);
      if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Update failed');
      }
      const updated = response?.data?.data?.order || response?.data?.order;
      const nextOrder = {
        ...order,
        ...(updated || {}),
        id: order.id || order._id || updated?._id,
        orderId: order.orderId || updated?.orderId,
        orderStatus:
          draftOrderStatus !== baselineOrderStatus
            ? draftOrderStatus
            : resolveDisplayOrderStatus({
                ...order,
                ...updated,
                orderStatus: updated?.orderStatus || order.orderStatus,
              }),
        paymentStatus:
          draftPaymentStatus !== baselinePaymentStatus
            ? draftPaymentStatus
            : resolveDisplayPaymentStatus({
                ...order,
                ...updated,
              }),
        payment: updated?.payment || order.payment,
        status: updated?.orderStatus || order.status,
        deliveredAt: updated?.deliveredAt || order.deliveredAt,
        items: Array.isArray(updated?.items) && updated.items.length ? updated.items : order.items,
      };
      onOrderUpdated?.(nextOrder);
      toast.success('Order updated successfully');
    } catch (error) {
      debugError('Admin status update failed:', error);
      toast.error(error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to update order');
    } finally {
      setUpdatingStatuses(false);
    }
  };

  // Debug: Log order data to check billImageUrl
  if (order.billImageUrl) {
    debugLog('?? Bill Image URL found:', order.billImageUrl);
  } else {
    debugLog('?? Bill Image URL not found in order:', {
      orderId: order.orderId,
      hasBillImageUrl: !!order.billImageUrl,
      orderKeys: Object.keys(order),
    });
  }

  // Format address for display
  const formatAddress = (address) => {
    if (!address || typeof address !== 'object') return 'N/A';
    const formattedAddress = String(address.formattedAddress || '').trim();
    const rawAddress = String(address.address || '').trim();
    const parts = [
      formattedAddress,
      rawAddress,
      address.label,
      address.street,
      address.additionalDetails,
      address.landmark,
      address.addressLine1,
      address.addressLine2,
      address.area,
      address.city,
      address.state,
      address.zipCode,
      address.postalCode,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    const uniqueParts = [];
    parts.forEach((part) => {
      const key = part.toLowerCase();
      const isContained = uniqueParts.some((existingPart) => {
        const existingKey = existingPart.toLowerCase();
        return existingKey === key || existingKey.includes(key) || key.includes(existingKey);
      });
      if (isContained) return;
      uniqueParts.push(part);
    });
    return uniqueParts.length > 0 ? removePlusCode(uniqueParts.join(', ')) : 'Address not available';
  };

  // Get coordinates if available
  const getCoordinates = (address) => {
    if (address?.location?.coordinates && Array.isArray(address.location.coordinates) && address.location.coordinates.length === 2) {
      const [lng, lat] = address.location.coordinates;
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
    return null;
  };
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] bg-white p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 bg-white">
          <DialogTitle className="flex items-center gap-2">
            <UiIcon as={Eye} size={18} className="text-blue-600" />
            Order Details
          </DialogTitle>
          <DialogDescription>View complete information about this order</DialogDescription>
        </DialogHeader>
        <ScrollDiv className="px-4 py-4" contentClassName="gap-4">
          {/* Basic Order Information */}
          <Div className={tablet ? 'flex-row gap-4' : 'gap-4'}>
            <Div className="space-y-4">
              <Div className="space-y-1">
                <P className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <UiIcon as={Package} className="w-4 h-4" />
                  Order ID
                </P>
                <P className="text-sm font-medium text-slate-900">{order.orderId || order.id || order.subscriptionId}</P>
              </Div>
              <Div className="space-y-1">
                <P className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <UiIcon as={Calendar} className="w-4 h-4" />
                  Order Date
                </P>
                <P className="text-sm font-medium text-slate-900">
                  {order.date}
                  {order.time ? `, ${order.time}` : ''}
                </P>
              </Div>
              <Div className="flex flex-wrap gap-3 mt-4">
                {/* Total Orders Box */}
                <Div className="inline-flex flex-col self-start w-fit min-w-[8.5rem] bg-blue-100 border border-blue-200 rounded-lg p-3">
                  <Div className="flex items-center gap-2 mb-1">
                    <UiIcon as={Package} className="w-4 h-4 text-blue-600 shrink-0" />
                    <Span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Total Orders</Span>
                  </Div>
                  {showTotalOrdersSkeleton ? (
                    <Span className="inline-block h-7 w-10 rounded bg-blue-200/70 animate-pulse" accessibilityLabel="Loading total orders" />
                  ) : !customerId ? (
                    <P className="text-xl font-bold text-blue-600">-</P>
                  ) : (
                    <P className="text-xl font-bold text-blue-600">{customerTotalOrders ?? '-'}</P>
                  )}
                </Div>

                {/* Delivered Orders Box */}
                <Div className="inline-flex flex-col self-start w-fit min-w-[8.5rem] bg-green-100 border border-green-200 rounded-lg p-3">
                  <Div className="flex items-center gap-2 mb-1">
                    <UiIcon as={CheckCircle} className="w-4 h-4 text-green-600 shrink-0" />
                    <Span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Delivered</Span>
                  </Div>
                  {showTotalOrdersSkeleton ? (
                    <Span className="inline-block h-7 w-10 rounded bg-green-200/70 animate-pulse" accessibilityLabel="Loading delivered orders" />
                  ) : !customerId ? (
                    <P className="text-xl font-bold text-green-600">-</P>
                  ) : (
                    <P className="text-xl font-bold text-green-600">{customerDeliveredOrders ?? '-'}</P>
                  )}
                </Div>

                {/* Cancelled Orders Box */}
                <Div className="inline-flex flex-col self-start w-fit min-w-[8.5rem] bg-red-100 border border-red-200 rounded-lg p-3">
                  <Div className="flex items-center gap-2 mb-1">
                    <UiIcon as={XCircle} className="w-4 h-4 text-red-600 shrink-0" />
                    <Span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Cancelled</Span>
                  </Div>
                  {showTotalOrdersSkeleton ? (
                    <Span className="inline-block h-7 w-10 rounded bg-red-200/70 animate-pulse" accessibilityLabel="Loading cancelled orders" />
                  ) : !customerId ? (
                    <P className="text-xl font-bold text-red-600">-</P>
                  ) : (
                    <P className="text-xl font-bold text-red-600">{customerCancelledOrders ?? '-'}</P>
                  )}
                </Div>

                {/* Pending Orders Box */}
                <Div className="inline-flex flex-col self-start w-fit min-w-[8.5rem] bg-amber-100 border border-amber-200 rounded-lg p-3">
                  <Div className="flex items-center gap-2 mb-1">
                    <UiIcon as={Clock} className="w-4 h-4 text-amber-600 shrink-0" />
                    <Span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Pending</Span>
                  </Div>
                  {showTotalOrdersSkeleton ? (
                    <Span className="inline-block h-7 w-10 rounded bg-amber-200/70 animate-pulse" accessibilityLabel="Loading pending orders" />
                  ) : !customerId ? (
                    <P className="text-xl font-bold text-amber-600">-</P>
                  ) : (
                    <P className="text-xl font-bold text-amber-600">{customerPendingOrders ?? '-'}</P>
                  )}
                </Div>
              </Div>
              {order.orderOtp && (
                <Div className="space-y-1">
                  <P className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex-row items-center gap-2">
                    <UiIcon as={CheckCircle2} className="w-4 h-4" />
                    Handover Code (OTP)
                  </P>
                  <P className="text-lg font-bold text-slate-950 tracking-[0.2em]">{order.orderOtp}</P>
                </Div>
              )}
              {order.estimatedDeliveryTime && (
                <Div className="space-y-1">
                  <P className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <UiIcon as={Clock} className="w-4 h-4" />
                    Estimated Delivery Time
                  </P>
                  <P className="text-sm font-medium text-slate-900">{order.estimatedDeliveryTime} minutes</P>
                </Div>
              )}
              {order.deliveredAt && (
                <Div className="space-y-1">
                  <P className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <UiIcon as={Clock} className="w-4 h-4" />
                    Delivered At
                  </P>
                  <P className="text-sm font-medium text-slate-900">
                    {new Date(order.deliveredAt)
                      .toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      .toUpperCase()}
                  </P>
                </Div>
              )}
            </Div>

            <Div className="space-y-4">
              {order.orderStatus && (
                <Div className="space-y-1">
                  <P className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Order Status</P>
                  <StatusBadge status={displayOrderStatus} tone={STATUS_TONE[displayOrderStatus]} label={displayOrderStatus} />
                  {order.cancellationReason && (
                    <P className="text-xs text-red-600 mt-1">
                      <Span className="font-medium">
                        {order.cancelledBy === 'user'
                          ? 'Cancelled by User - '
                          : order.cancelledBy === 'restaurant'
                            ? 'Cancelled by Restaurant - '
                            : 'Cancellation '}
                        Reason:
                      </Span>{' '}
                      {order.cancellationReason}
                    </P>
                  )}
                  {order.cancelledAt && (
                    <P className="text-xs text-slate-500 mt-1">
                      Cancelled:{' '}
                      {new Date(order.cancelledAt)
                        .toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        .toUpperCase()}
                    </P>
                  )}
                </Div>
              )}
              {(order.paymentStatus || order.paymentCollectionStatus != null || order.payment?.status) && (
                <Div className="space-y-1">
                  <P className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <UiIcon as={CreditCard} className="w-4 h-4" />
                    Payment Status
                  </P>
                  <P className={`text-sm font-medium ${getPaymentStatusColor(displayPaymentStatus)}`}>{displayPaymentStatus}</P>
                </Div>
              )}

              {/* Admin Controls — optional independent status updates */}
              <Div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <H4 className="text-sm font-bold text-slate-900 mb-4">Admin Controls</H4>
                <Div className={tablet ? 'flex-row gap-3' : 'gap-3'}>
                  <Div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Change Order Status</Label>
                    <Select value={draftOrderStatus} onValueChange={setDraftOrderStatus} disabled={updatingStatuses}>
                      <SelectTrigger className="h-11 w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-none hover:border-slate-300 focus:border-blue-600">
                        <SelectValue placeholder="Select order status" />
                      </SelectTrigger>
                      <SelectContent
                        side="bottom"
                        sideOffset={4}
                        avoidCollisions={false}
                        position="popper"
                        scrollToTopOnOpen
                        className="select-menu-scroll z-[12000] max-h-48 border-slate-200 bg-white text-slate-900 shadow-xl"
                      >
                        {ADMIN_ORDER_STATUS_OPTIONS.map((status) => (
                          <SelectItem
                            key={status}
                            value={status}
                            className="cursor-pointer rounded-md border-0 py-2.5 focus:bg-blue-50 focus:text-slate-900 data-[state=checked]:bg-blue-50 data-[state=checked]:font-semibold"
                          >
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Div>
                  <Div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Change Payment Status</Label>
                    <Select value={draftPaymentStatus} onValueChange={setDraftPaymentStatus} disabled={updatingStatuses}>
                      <SelectTrigger className="h-11 w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-none hover:border-slate-300 focus:border-blue-600">
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                      <SelectContent
                        side="bottom"
                        sideOffset={4}
                        avoidCollisions={false}
                        position="popper"
                        scrollToTopOnOpen
                        className="select-menu-scroll z-[12000] max-h-48 border-slate-200 bg-white text-slate-900 shadow-xl"
                      >
                        {ADMIN_PAYMENT_STATUS_OPTIONS.map((status) => (
                          <SelectItem
                            key={status}
                            value={status}
                            className="cursor-pointer rounded-md border-0 py-2.5 focus:bg-blue-50 focus:text-slate-900 data-[state=checked]:bg-blue-50 data-[state=checked]:font-semibold"
                          >
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Div>
                </Div>
                <Div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    onClick={handleAdminStatusUpdate}
                    disabled={!hasAdminStatusChanges || updatingStatuses}
                    className={BTN_PRIMARY}
                  >
                    {updatingStatuses ? <UiIcon as={Loader2} size={14} className="text-white" /> : null}
                    <Span className={BTN_TEXT_PRIMARY}>{updatingStatuses ? 'Updating…' : 'Update'}</Span>
                  </Button>
                </Div>
              </Div>

              {order.deliveryType && (
                <Div className="space-y-1">
                  <P className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <UiIcon as={Truck} className="w-4 h-4" />
                    Delivery Type
                  </P>
                  <P className="text-sm font-medium text-slate-900">{order.deliveryType}</P>
                </Div>
              )}
            </Div>
          </Div>

          {/* Customer Information */}
          <Div className="border-t border-slate-200 pt-4">
            <H3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <UiIcon as={User} className="w-4 h-4" />
              Customer Information
            </H3>
            <Div className={tablet ? 'flex-row gap-4' : 'gap-4'}>
              <Div className="space-y-1">
                <P className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer Name</P>
                <P className="text-sm font-medium text-slate-900">{order.customerName || 'N/A'}</P>
              </Div>
              {order.customerPhone && (
                <Div className="space-y-1">
                  <P className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <UiIcon as={Phone} className="w-4 h-4" />
                    Phone
                  </P>
                  <P className="text-sm font-medium text-slate-900">{order.customerPhone}</P>
                </Div>
              )}
              {order.customerEmail && (
                <Div className="space-y-1">
                  <P className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <UiIcon as={Mail} className="w-4 h-4" />
                    Email
                  </P>
                  <P className="text-sm font-medium text-slate-900">{order.customerEmail || 'NA'}</P>
                </Div>
              )}
            </Div>
            {order.note && (
              <Div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <P className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <UiIcon as={FileText} className="w-4 h-4" />
                  Note for Restaurant
                </P>
                <P className="text-sm text-blue-900 italic">{`"${order.note}"`}</P>
              </Div>
            )}
          </Div>

          {/* Restaurant Information */}
          {order.restaurant && (
            <Div className="border-t border-slate-200 pt-4">
              <H3 className="text-sm font-semibold text-slate-700 mb-4">Restaurant Information</H3>
              <Div className="space-y-1">
                <P className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Restaurant Name</P>
                <P className="text-sm font-medium text-slate-900">{order.restaurant}</P>
              </Div>
            </Div>
          )}

          {/* Order Items */}
          {order.items && Array.isArray(order.items) && order.items.length > 0 && (
            <Div className="border-t border-slate-200 pt-4">
              <H3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <UiIcon as={Package} className="w-4 h-4" />
                Order Items ({order.items.length})
              </H3>
              <Div className="space-y-3">
                {order.items.map((item, index) => {
                  const variantLabel = String(item.variantName || item.variant || item.selectedVariant?.name || item.variationName || '').trim();
                  return (
                    <Div key={index} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                      <Div className="flex-1 min-w-0">
                        <Div className="flex items-start gap-2">
                          <Span className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded shrink-0">{item.quantity || 1}x</Span>
                          <Div className="min-w-0">
                            <P className="text-sm font-medium text-slate-900">{item.name || item.foodName || item.title || 'Unknown Item'}</P>
                            {variantLabel ? <P className="text-xs text-slate-500 mt-0.5 font-medium">{variantLabel}</P> : null}
                            {Array.isArray(item.addons) && item.addons.length > 0 ? (
                              <P className="text-xs text-slate-400 mt-0.5">
                                {item.addons
                                  .map((a) => a.name || a.title || a)
                                  .filter(Boolean)
                                  .join(', ')}
                              </P>
                            ) : null}
                          </Div>
                          {item.isVeg !== undefined && (
                            <Span
                              className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${item.isVeg ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                            >
                              {item.isVeg ? 'Veg' : 'Non-Veg'}
                            </Span>
                          )}
                        </Div>
                        {item.description && <P className="text-xs text-slate-500 mt-1 ml-8">{item.description}</P>}
                      </Div>
                      <Div className="text-right shrink-0 ml-3">
                        {(() => {
                          const qty = Number(item.quantity || 1) || 1;
                          const sellingUnit = Number(item.customerPrice) || Number(item.otherPrice) || Number(item.price) || 0;
                          let baseUnit = resolveRestaurantItemUnitPrice(item);
                          let markupUnit = resolveItemMarkupUnit(item);

                          // Fallback: selling - base when markup fields missing
                          if (!(markupUnit > 0) && sellingUnit > baseUnit + 0.01) {
                            markupUnit = Math.round((sellingUnit - baseUnit) * 100) / 100;
                          }

                          // Order-level admin markup fallback (older / restaurant-rule orders)
                          if (!(markupUnit > 0)) {
                            const orderMarkup = Number(order.markupTotal ?? order.pricing?.markupTotal ?? 0);
                            const itemCount = Array.isArray(order.items) ? order.items.length : 0;
                            if (orderMarkup > 0 && itemCount === 1) {
                              markupUnit = Math.round((orderMarkup / qty) * 100) / 100;
                              if (!(Number(item.basePrice) >= 0) || Math.abs(baseUnit - sellingUnit) < 0.01) {
                                baseUnit = Math.max(0, Math.round((sellingUnit - markupUnit) * 100) / 100);
                              }
                            }
                          }
                          const baseLine = Math.round(baseUnit * qty * 100) / 100;
                          const markupLine = Math.round(markupUnit * qty * 100) / 100;
                          const totalLine =
                            markupLine > 0 ? Math.round((baseLine + markupLine) * 100) / 100 : Math.round((sellingUnit || baseUnit) * qty * 100) / 100;
                          if (markupLine > 0) {
                            return (
                              <Div className="leading-tight">
                                <P className="text-sm font-semibold text-slate-900">₹{baseLine.toFixed(2)}</P>
                                <P className="text-xs font-semibold text-red-600 mt-0.5">+ ₹{markupLine.toFixed(2)} admin</P>
                                <P className="text-xs font-bold text-slate-900 mt-0.5">Total ₹{totalLine.toFixed(2)}</P>
                              </Div>
                            );
                          }
                          return <P className="text-sm font-semibold text-slate-900">₹{baseLine.toFixed(2)}</P>;
                        })()}
                      </Div>
                    </Div>
                  );
                })}
              </Div>
            </Div>
          )}

          {/* Bill Image (Captured by Delivery Boy) */}
          {(order.billImageUrl || order.billImage || order.deliveryState?.billImageUrl) && (
            <Div className="border-t border-slate-200 pt-4">
              <H3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <UiIcon as={Receipt} size={16} className="text-slate-500" />
                Bill Image (Captured by Delivery Boy)
              </H3>
              <Div className="space-y-3">
                <Div className="w-full border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {!billImageFailed ? (
                    <Img
                      src={order.billImageUrl || order.billImage || order.deliveryState?.billImageUrl}
                      alt="Order Bill"
                      className="w-full h-[500px] object-contain mx-auto block"
                      onError={() => {
                        debugError('? Failed to load bill image');
                        setBillImageFailed(true);
                      }}
                      onLoad={() => {
                        debugLog('? Bill image loaded successfully');
                      }}
                    />
                  ) : (
                    <Div className="p-6 items-center text-center text-slate-500 text-sm bg-slate-50">
                      <UiIcon as={Receipt} className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                      Failed to load bill image
                    </Div>
                  )}
                </Div>
                <Div className="flex items-center gap-3">
                  <A
                    href={order.billImageUrl || order.billImage || order.deliveryState?.billImageUrl}
                    className={BTN_PRIMARY}
                  >
                    <UiIcon as={Eye} className="w-4 h-4" />
                    View Full Size
                  </A>
                  <A
                    href={order.billImageUrl || order.billImage || order.deliveryState?.billImageUrl}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <UiIcon as={Package} className="w-4 h-4" />
                    Download
                  </A>
                </Div>
              </Div>
            </Div>
          )}

          {/* Delivery Address */}
          {order.address && (
            <Div className="border-t border-slate-200 pt-4">
              <H3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <UiIcon as={MapPin} className="w-4 h-4" />
                Delivery Address
              </H3>
              <Div className="space-y-2 p-4 bg-slate-50 rounded-lg">
                <P className="text-sm text-slate-900">{formatAddress(order.address)}</P>
                {order.address.label && (
                  <P className="text-xs text-slate-500">
                    <Span className="font-medium">Label:</Span> {order.address.label}
                  </P>
                )}
              </Div>
            </Div>
          )}

          {/* Delivery Partner Information */}
          {(order.deliveryPartnerName || order.deliveryPartnerPhone) && (
            <Div className="border-t border-slate-200 pt-4">
              <H3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <UiIcon as={Truck} className="w-4 h-4" />
                Delivery Partner
              </H3>
              <Div className={tablet ? 'flex-row gap-4' : 'gap-4'}>
                {order.deliveryPartnerName && (
                  <Div className="space-y-1">
                    <P className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</P>
                    <P className="text-sm font-medium text-slate-900">{order.deliveryPartnerName}</P>
                  </Div>
                )}
                {order.deliveryPartnerPhone && (
                  <Div className="space-y-1">
                    <P className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</P>
                    <P className="text-sm font-medium text-slate-900">{order.deliveryPartnerPhone}</P>
                  </Div>
                )}
              </Div>
            </Div>
          )}

          {/* Pricing Breakdown */}
          <Div className="border-t border-slate-200 pt-4">
            <H3 className="text-sm font-semibold text-slate-700 mb-4">Pricing Breakdown</H3>
            <Div className="space-y-2">
              {(() => {
                const items = Array.isArray(order.items) ? order.items : [];
                const computedBase = items.reduce((sum, item) => {
                  const qty = Number(item.quantity || 1) || 1;
                  return sum + resolveRestaurantItemUnitPrice(item) * qty;
                }, 0);
                const computedMarkup = items.reduce((sum, item) => {
                  const qty = Number(item.quantity || 1) || 1;
                  return sum + resolveItemMarkupUnit(item) * qty;
                }, 0);
                const baseSubtotal = Number(
                  order.baseSubtotal ?? order.pricing?.baseSubtotal ?? (computedBase > 0 ? computedBase : order.totalItemAmount) ?? 0,
                );
                const markupTotal = Number(order.markupTotal ?? order.pricing?.markupTotal ?? computedMarkup ?? 0);
                return (
                  <>
                    <Div className="flex justify-between text-sm">
                      <Span className="text-slate-600">Subtotal (Restaurant)</Span>
                      <Span className="font-medium text-slate-900">₹{Number(baseSubtotal || 0).toFixed(2)}</Span>
                    </Div>
                    {markupTotal > 0 ? (
                      <Div className="flex justify-between text-sm">
                        <Span className="text-slate-600">Admin Pricing</Span>
                        <Span className="font-medium text-red-600">+ ₹{Number(markupTotal).toFixed(2)}</Span>
                      </Div>
                    ) : null}
                  </>
                );
              })()}
              {order.itemDiscount !== undefined && order.itemDiscount > 0 && (
                <Div className="flex justify-between text-sm">
                  <Span className="text-slate-600">Discount</Span>
                  <Span className="font-medium text-green-700">-₹{order.itemDiscount.toFixed(2)}</Span>
                </Div>
              )}
              {order.couponDiscount !== undefined && order.couponDiscount > 0 && (
                <Div className="flex justify-between text-sm">
                  <Span className="text-slate-600">Coupon Discount</Span>
                  <Span className="font-medium text-green-700">-₹{order.couponDiscount.toFixed(2)}</Span>
                </Div>
              )}
              {order.deliveryCharge !== undefined && (
                <Div className="flex justify-between text-sm">
                  <Span className="text-slate-600">Delivery Charge</Span>
                  <Span className="font-medium text-slate-900">
                    {order.deliveryCharge > 0 ? `₹${order.deliveryCharge.toFixed(2)}` : <Span className="text-green-700">Free delivery</Span>}
                  </Span>
                </Div>
              )}
              <Div className="flex justify-between text-sm">
                <Span className="text-slate-600">Platform Fee</Span>
                <Span className="font-medium text-slate-900">
                  {order.platformFee !== undefined && order.platformFee > 0 ? (
                    `₹${order.platformFee.toFixed(2)}`
                  ) : (
                    <Span className="text-slate-400">₹0.00</Span>
                  )}
                </Span>
              </Div>
              {order.vatTax !== undefined && order.vatTax > 0 && (
                <Div className="flex justify-between text-sm">
                  <Span className="text-slate-600">Tax (GST)</Span>
                  <Span className="font-medium text-slate-900">₹{order.vatTax.toFixed(2)}</Span>
                </Div>
              )}
              <Div className="pt-2 border-t border-slate-200">
                <Div className="flex justify-between items-center">
                  <Span className="text-base font-semibold text-slate-700">Total Amount</Span>
                  <Span className="text-xl font-bold text-green-700">
                    ₹
                    {(order.totalAmount || order.total || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Span>
                </Div>
              </Div>
            </Div>
          </Div>
        </ScrollDiv>
      </DialogContent>
    </Dialog>
  );
}
