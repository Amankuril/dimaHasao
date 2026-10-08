/* Ported from Frontend/src/modules/Food/pages/admin/OrderDetectDelivery.jsx (tools/port.js first pass). */
import { useMemo, useState, useEffect, useRef } from 'react';
import { Package, Truck, CheckCircle, Clock, XCircle } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import OrdersTopbar from '../../components/admin/orders/OrdersTopbar';
import OrderDetectDeliveryTable from '../../components/admin/orders/OrderDetectDeliveryTable';
import ViewOrderDetectDeliveryDialog from '../../components/admin/orders/ViewOrderDetectDeliveryDialog';
import SettingsDialog from '../../components/admin/orders/SettingsDialog';
import FilterPanel from '../../components/admin/orders/FilterPanel';
import { useGenericTableManagement } from '../../components/admin/orders/useGenericTableManagement';
import AdminListPagination from '../../components/admin/AdminListPagination';

import { AdminPage, Card, ErrorState, Skeleton, StatCard, StatGrid, TableSkeleton } from '../../../admin/ui';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const getOrderStatus = (order) => String(order?.orderStatus || order?.status || '').toLowerCase();
const isCancelledOrder = (status, cancelledAt) =>
  status === 'cancelled' || status === 'cancelled_by_user' || status === 'cancelled_by_restaurant' || status === 'cancelled_by_admin' || Boolean(cancelledAt);

// Function to map backend order status to frontend display status
const mapOrderStatus = (order) => {
  const status = getOrderStatus(order);
  const { deliveryPartnerName, deliveryState, cancelledAt } = order;

  // If cancelled, show as Rejected
  if (isCancelledOrder(status, cancelledAt)) {
    return 'Rejected';
  }

  // If delivered, show as Ordered Delivered
  if (status === 'delivered') {
    return 'Ordered Delivered';
  }

  // Check delivery state phases
  if (deliveryState?.currentPhase === 'at_delivery' || deliveryState?.currentPhase === 'at_drop') {
    return 'Reached Drop';
  }
  if (deliveryState?.currentPhase === 'at_pickup') {
    return 'Delivery Boy Reached Pickup';
  }

  // Order ID Accepted
  if (deliveryState?.status === 'order_confirmed' || deliveryState?.currentPhase === 'en_route_to_delivery' || deliveryState?.orderIdConfirmedAt) {
    return 'Order ID Accepted';
  }

  // If delivery boy is assigned
  if (deliveryPartnerName) {
    return 'Delivery Boy Assigned';
  }

  // Map backend status to frontend status
  const statusMap = {
    created: 'Ordered',
    pending: 'Ordered',
    confirmed: 'Restaurant Accepted',
    preparing: 'Restaurant Accepted',
    ready_for_pickup: 'Restaurant Accepted',
    ready: 'Restaurant Accepted',
    picked_up: 'Order ID Accepted',
    out_for_delivery: 'Order ID Accepted',
  };
  return statusMap[status] || 'Ordered';
};

// Function to build status history from order data
const buildStatusHistory = (order) => {
  const history = [];
  const { createdAt, tracking, deliveryState, deliveryPartnerName, deliveryPartnerPhone, cancelledAt } = order;
  const status = getOrderStatus(order);

  // Format timestamp helper
  const formatTimestamp = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Ordered - always first
  history.push({
    status: 'Ordered',
    timestamp: formatTimestamp(createdAt) || 'N/A',
  });

  // Rejected (if cancelled)
  if (isCancelledOrder(status, cancelledAt)) {
    history.push({
      status: 'Rejected',
      timestamp: formatTimestamp(cancelledAt) || formatTimestamp(order.updatedAt) || 'N/A',
    });
    return history;
  }

  // Restaurant Accepted (confirmed)
  if (tracking?.confirmed?.status && tracking?.confirmed?.timestamp) {
    history.push({
      status: 'Restaurant Accepted',
      timestamp: formatTimestamp(tracking.confirmed.timestamp),
    });
  } else if (status === 'confirmed' || status === 'preparing' || status === 'ready' || status === 'ready_for_pickup') {
    history.push({
      status: 'Restaurant Accepted',
      timestamp: formatTimestamp(order.updatedAt) || 'N/A',
    });
  }

  // Delivery Boy Assigned
  if (deliveryPartnerName) {
    history.push({
      status: 'Delivery Boy Assigned',
      timestamp: formatTimestamp(deliveryState?.acceptedAt) || formatTimestamp(order.updatedAt) || 'N/A',
      deliveryBoy: deliveryPartnerName || 'Delivery Boy',
      deliveryBoyNumber: deliveryPartnerPhone || 'N/A',
    });
  }

  // Delivery Boy Reached Pickup
  if (deliveryState?.reachedPickupAt) {
    history.push({
      status: 'Delivery Boy Reached Pickup',
      timestamp: formatTimestamp(deliveryState.reachedPickupAt),
    });
  } else if (deliveryState?.currentPhase === 'at_pickup') {
    history.push({
      status: 'Delivery Boy Reached Pickup',
      timestamp: formatTimestamp(order.updatedAt) || 'N/A',
    });
  }

  // Order ID Accepted
  if (deliveryState?.orderIdConfirmedAt) {
    history.push({
      status: 'Order ID Accepted',
      timestamp: formatTimestamp(deliveryState.orderIdConfirmedAt),
    });
  } else if (deliveryState?.status === 'order_confirmed' || deliveryState?.currentPhase === 'en_route_to_delivery') {
    history.push({
      status: 'Order ID Accepted',
      timestamp: formatTimestamp(order.updatedAt) || 'N/A',
    });
  }

  // Reached Drop - must come before Ordered Delivered
  // Check multiple conditions to ensure we catch it even if order is already delivered
  if (deliveryState?.reachedDropAt) {
    // First priority: use reachedDropAt timestamp if available
    history.push({
      status: 'Reached Drop',
      timestamp: formatTimestamp(deliveryState.reachedDropAt),
    });
  } else if (deliveryState?.currentPhase === 'at_delivery' || deliveryState?.currentPhase === 'at_drop' || deliveryState?.status === 'en_route_to_delivery') {
    // Second priority: check if currently at delivery phase
    history.push({
      status: 'Reached Drop',
      timestamp: formatTimestamp(order.updatedAt) || 'N/A',
    });
  } else if (status === 'delivered' && deliveryPartnerName) {
    // Third priority: if order is delivered and delivery boy was assigned,
    // it means reached drop must have happened (can't deliver without reaching drop)
    // Only add if not already added above
    const hasReachedDrop = history.some((h) => h.status === 'Reached Drop');
    if (!hasReachedDrop) {
      history.push({
        status: 'Reached Drop',
        timestamp: formatTimestamp(order.deliveredAt) || formatTimestamp(order.updatedAt) || 'N/A',
      });
    }
  }

  // Ordered Delivered - must come after Reached Drop
  if (status === 'delivered' && tracking?.delivered?.timestamp) {
    history.push({
      status: 'Ordered Delivered',
      timestamp: formatTimestamp(tracking.delivered.timestamp),
    });
  } else if (status === 'delivered') {
    history.push({
      status: 'Ordered Delivered',
      timestamp: formatTimestamp(order.deliveredAt) || formatTimestamp(order.updatedAt) || 'N/A',
    });
  }
  return history;
};

// Transform backend order to frontend format
const transformOrder = (order, index) => {
  const user = order?.userId && typeof order.userId === 'object' ? order.userId : null;
  const restaurant = order?.restaurantId && typeof order.restaurantId === 'object' ? order.restaurantId : null;
  const deliveryFromDispatch =
    order?.dispatch?.deliveryPartnerId && typeof order.dispatch.deliveryPartnerId === 'object' ? order.dispatch.deliveryPartnerId : null;
  const deliveryBoyName = order.deliveryPartnerName || order.deliveryBoyName || deliveryFromDispatch?.name || order.deliveryPartnerId?.name || null;
  const deliveryBoyNumber = order.deliveryPartnerPhone || order.deliveryBoyNumber || deliveryFromDispatch?.phone || order.deliveryPartnerId?.phone || null;
  const normalizedOrder = {
    ...order,
    status: order.status || order.orderStatus,
    deliveryPartnerName: deliveryBoyName,
    deliveryPartnerPhone: deliveryBoyNumber,
  };
  const orderDate = new Date(order.createdAt);
  const dateStr = orderDate
    .toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase();
  const timeStr = orderDate
    .toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .toUpperCase();
  const displayStatus = mapOrderStatus(normalizedOrder);
  return {
    sl: index + 1,
    orderId: order.orderId,
    userName: order.customerName || order.userName || user?.name || 'Unknown',
    userNumber: order.customerPhone || order.userNumber || user?.phone || order.deliveryAddress?.phone || 'N/A',
    restaurantName: order.restaurantName || order.restaurant || restaurant?.restaurantName || 'Unknown Restaurant',
    deliveryBoyName,
    deliveryBoyNumber,
    status: displayStatus,
    // Heavy status history only when opening detail dialog (keeps page changes fast)
    statusHistory: null,
    orderDate: dateStr,
    orderTime: timeStr,
    originalOrder: order,
  };
};
export default function OrderDetectDelivery() {
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    orderId: true,
    userInfo: true,
    restaurantName: true,
    deliveryBoy: true,
    status: true,
    actions: true,
  });
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_order_detect_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalOrders, setTotalOrders] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusStats, setStatusStats] = useState({
    total: 0,
    Ordered: 0,
    'Restaurant Accepted': 0,
    Rejected: 0,
    'Delivery Boy Assigned': 0,
    'Delivery Boy Reached Pickup': 0,
    'Order ID Accepted': 0,
    'Reached Drop': 0,
    'Ordered Delivered': 0,
  });
  const [countsReady, setCountsReady] = useState(false);
  const needDetectCountsRef = useRef(true);
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const withCounts = needDetectCountsRef.current;
      const params = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
        // Global dashboard counts — only when search changes / first load (keeps page flips fast)
        ...(withCounts
          ? {
              includeDetectDeliveryCounts: 1,
            }
          : {}),
      };
      const response = await adminAPI.getOrders(params);
      const payload = response?.data?.data || response?.data || {};
      const rawOrders = payload?.orders ?? payload?.docs ?? payload?.data ?? (Array.isArray(payload) ? payload : []);
      const nextOrders = Array.isArray(rawOrders) ? rawOrders : [];
      const meta = payload?.meta || payload?.pagination || {};
      const nextTotal = Number(meta.total ?? payload?.total ?? nextOrders.length) || 0;
      if (response.data?.success && nextOrders.length >= 0) {
        const transformedOrders = nextOrders.map((order, index) => transformOrder(order, (currentPage - 1) * pageSize + index));
        setOrders(transformedOrders);
        setTotalOrders(nextTotal);
        if (payload?.detectDeliveryCounts) {
          setStatusStats({
            Ordered: 0,
            'Restaurant Accepted': 0,
            Rejected: 0,
            'Delivery Boy Assigned': 0,
            'Delivery Boy Reached Pickup': 0,
            'Order ID Accepted': 0,
            'Reached Drop': 0,
            'Ordered Delivered': 0,
            ...payload.detectDeliveryCounts,
            total: nextTotal,
          });
          setCountsReady(true);
          needDetectCountsRef.current = false;
        } else {
          setStatusStats((prev) => ({
            ...prev,
            total: nextTotal,
          }));
        }
      } else {
        debugError('Failed to fetch orders:', response.data);
        setError(response.data?.message || 'Failed to fetch orders');
        toast.error('Failed to fetch orders');
        setOrders([]);
        setTotalOrders(0);
      }
    } catch (error) {
      debugError('Error fetching orders:', error);
      setError(error.response?.data?.message || 'Failed to fetch orders');
      toast.error(error.response?.data?.message || 'Failed to fetch orders');
      setOrders([]);
      setTotalOrders(0);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, debouncedSearch]);
  const {
    searchQuery,
    setSearchQuery,
    isFilterOpen,
    setIsFilterOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isViewOrderOpen,
    setIsViewOrderOpen,
    selectedOrder,
    filters,
    setFilters,
    filteredData,
    count,
    activeFiltersCount,
    handleApplyFilters,
    handleResetFilters,
    handleExport,
    handleViewOrder: openViewOrder,
    handlePrintOrder,
  } = useGenericTableManagement(orders, 'Order Detect Delivery', []);
  const handleViewOrder = (order) => {
    const original = order?.originalOrder || order;
    const withHistory = {
      ...order,
      statusHistory: buildStatusHistory({
        ...original,
        deliveryPartnerName: order.deliveryBoyName || original.deliveryPartnerName,
        deliveryPartnerPhone: order.deliveryBoyNumber || original.deliveryPartnerPhone,
        status: original.orderStatus || original.status,
      }),
    };
    openViewOrder(withHistory);
  };
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    needDetectCountsRef.current = true;
    setCountsReady(false);
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Statistics — from ALL matching orders (API), not current page
  const stats = useMemo(
    () => ({
      total: statusStats.total || totalOrders,
      ordered: statusStats.Ordered || 0,
      restaurantAccepted: statusStats['Restaurant Accepted'] || 0,
      rejected: statusStats.Rejected || 0,
      deliveryBoyAssigned: statusStats['Delivery Boy Assigned'] || 0,
      reachedPickup: statusStats['Delivery Boy Reached Pickup'] || 0,
      orderIdAccepted: statusStats['Order ID Accepted'] || 0,
      reachedDrop: statusStats['Reached Drop'] || 0,
      delivered: statusStats['Ordered Delivered'] || 0,
    }),
    [statusStats, totalOrders],
  );
  const showStatsSkeleton = isLoading && !countsReady;
  const showTableSkeleton = isLoading;
  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      orderId: true,
      userInfo: true,
      restaurantName: true,
      deliveryBoy: true,
      status: true,
      actions: true,
    });
  };
  const handleToggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  // Error state
  if (error && orders.length === 0 && !isLoading) {
    return (
      <AdminPage maxWidth={1200}>
        <ErrorState title="Could not load orders" message={error} onRetry={() => fetchOrders()} />
      </AdminPage>
    );
  }
  const statCards = [
    { key: 'total', label: 'Total Orders', value: stats.total, tone: 'info', Icon: Package },
    { key: 'ordered', label: 'Ordered', value: stats.ordered, tone: 'info', Icon: Clock },
    { key: 'restaurantAccepted', label: 'Restaurant Accepted', value: stats.restaurantAccepted, tone: 'success', Icon: CheckCircle },
    { key: 'rejected', label: 'Rejected', value: stats.rejected, tone: 'danger', Icon: XCircle },
    { key: 'deliveryBoyAssigned', label: 'Delivery Boy Assigned', value: stats.deliveryBoyAssigned, tone: 'info', Icon: Truck },
    { key: 'reachedPickup', label: 'Delivery Boy Reached Pickup', value: stats.reachedPickup, tone: 'warning', Icon: Package },
    { key: 'orderIdAccepted', label: 'Order ID Accepted', value: stats.orderIdAccepted, tone: 'success', Icon: CheckCircle },
    { key: 'reachedDrop', label: 'Reached Drop', value: stats.reachedDrop, tone: 'warning', Icon: Truck },
    { key: 'delivered', label: 'Delivered', value: stats.delivered, tone: 'success', Icon: CheckCircle },
  ];
  return (
    <AdminPage maxWidth={1200}>
      <OrdersTopbar
        title="Order Detect Delivery"
        count={totalOrders}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onFilterClick={() => setIsFilterOpen(true)}
        activeFiltersCount={activeFiltersCount}
        onExport={handleExport}
        onSettingsClick={() => setIsSettingsOpen(true)}
        isLoading={isLoading}
      />

      <StatGrid className="mb-4">
        {showStatsSkeleton
          ? Array.from({ length: 9 }, (_, index) => (
              <Card key={`stat-skel-${index}`} className="gap-2">
                <Skeleton width="60%" height={12} />
                <Skeleton width="40%" height={24} />
              </Card>
            ))
          : statCards.map(({ key, label, value, tone, Icon }) => <StatCard key={key} label={label} value={value} tone={tone} icon={Icon} />)}
      </StatGrid>

      <SettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        visibleColumns={visibleColumns}
        toggleColumn={handleToggleColumn}
        resetColumns={resetColumns}
        columnsConfig={{
          si: 'Serial Number',
          orderId: 'Order ID',
          userInfo: 'User Name & Number',
          restaurantName: 'Restaurant Name',
          deliveryBoy: 'Delivery Boy Name & Number',
          status: 'Status',
          actions: 'Actions',
        }}
      />
      <ViewOrderDetectDeliveryDialog isOpen={isViewOrderOpen} onOpenChange={setIsViewOrderOpen} order={selectedOrder} />
      {showTableSkeleton ? (
        <TableSkeleton rows={8} />
      ) : (
        <>
          <OrderDetectDeliveryTable orders={filteredData} visibleColumns={visibleColumns} onViewOrder={handleViewOrder} onPrintOrder={handlePrintOrder} />
          <AdminListPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalOrders}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              try {
                localStorage.setItem('admin_order_detect_pageSize', String(size));
              } catch {}
              setCurrentPage(1);
            }}
            itemLabel="orders"
          />
        </>
      )}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </AdminPage>
  );
}
