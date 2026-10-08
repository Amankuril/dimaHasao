/* Ported from Frontend/src/modules/Food/pages/admin/refunds/NewRefundRequests.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect } from 'react';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { Eye, Loader2, Wallet } from 'lucide-react-native';
import OrdersTopbar from '../../../components/admin/orders/OrdersTopbar';
import FilterPanel from '../../../components/admin/orders/FilterPanel';
import ViewOrderDialog from '../../../components/admin/orders/ViewOrderDialog';
import SettingsDialog from '../../../components/admin/orders/SettingsDialog';
import { useGenericTableManagement } from '../../../components/admin/orders/useGenericTableManagement';
import { Button, Div, Span, Icon as UiIcon } from '../../../../components/web';
import { window } from '../../../../lib/webShim';
import {
  AdminPage,
  Cell,
  DataTable,
  EmptyState,
  ErrorState,
  Row,
  StatusBadge,
  TBody,
  THead,
  TableSkeleton,
  BTN_PRIMARY,
  BTN_TEXT_PRIMARY,
} from '../../../../admin/ui';

/* Column widths authored for a phone; the kit's DataTable scrolls sideways
   there and stretches these to fill a tablet. */
const COLS = [60, 130, 150, 180, 170, 120, 220, 130, 110];
const LABELS = ['SI', 'Order ID', 'Order Date', 'Customer', 'Restaurant', 'Total', 'Cancellation Reason', 'Refund Status', 'Actions'];
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function NewRefundRequests() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [processingRefund, setProcessingRefund] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    orderId: true,
    orderDate: true,
    customer: true,
    restaurant: true,
    totalAmount: true,
    orderStatus: true,
    actions: true,
  });

  // Fetch refund requests from backend
  useEffect(() => {
    const fetchRefundRequests = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const params = {
          page: 1,
          limit: 1000,
        };
        const response = await adminAPI.getRefundRequests(params);
        if (response.data?.success && response.data?.data?.orders) {
          setOrders(response.data.data.orders);
          setTotalCount(response.data.data.pagination?.total || response.data.data.orders.length);
        } else {
          debugError('Failed to fetch refund requests:', response.data);
          toast.error('Failed to fetch refund requests');
          setLoadError('Failed to fetch refund requests');
          setOrders([]);
        }
      } catch (error) {
        debugError('Error fetching refund requests:', error);
        debugError('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText,
        });
        toast.error(error.response?.data?.message || error.message || 'Failed to fetch refund requests');
        setLoadError(error.response?.data?.message || error.message || 'Failed to fetch refund requests');
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRefundRequests();
  }, []);
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
    handleViewOrder,
    handlePrintOrder,
    toggleColumn,
  } = useGenericTableManagement(orders, 'New Refund Requests', ['orderId', 'customerName', 'restaurant', 'customerPhone']);
  const restaurants = useMemo(() => {
    return [...new Set(orders.map((o) => o.restaurant))];
  }, [orders]);

  // Handle refund processing
  const handleProcessRefund = async (order) => {
    if (!(await window.confirmAsync(`Are you sure you want to process refund for order ${order.orderId}?`))) {
      return;
    }
    try {
      setProcessingRefund(order.id);
      const response = await adminAPI.processRefund(order.id, {});
      if (response.data?.success) {
        toast.success(`Refund processed successfully for order ${order.orderId}`);
        // Refresh the list
        const params = {
          page: 1,
          limit: 1000,
        };
        const refreshResponse = await adminAPI.getRefundRequests(params);
        if (refreshResponse.data?.success && refreshResponse.data?.data?.orders) {
          setOrders(refreshResponse.data.data.orders);
          setTotalCount(refreshResponse.data.data.pagination?.total || refreshResponse.data.data.orders.length);
        }
      } else {
        toast.error(response.data?.message || 'Failed to process refund');
      }
    } catch (error) {
      debugError('Error processing refund:', error);
      toast.error(error.response?.data?.message || 'Failed to process refund');
    } finally {
      setProcessingRefund(null);
    }
  };
  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      orderId: true,
      orderDate: true,
      customer: true,
      restaurant: true,
      totalAmount: true,
      orderStatus: true,
      actions: true,
    });
  };
  return (
    <AdminPage maxWidth={1200}>
      <OrdersTopbar
        title="Requested Orders"
        count={count}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onFilterClick={() => setIsFilterOpen(true)}
        activeFiltersCount={activeFiltersCount}
        onExport={handleExport}
        onSettingsClick={() => setIsSettingsOpen(true)}
        isLoading={isLoading}
      />
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        restaurants={restaurants}
      />
      <SettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        visibleColumns={visibleColumns}
        toggleColumn={toggleColumn}
        resetColumns={resetColumns}
      />
      <ViewOrderDialog isOpen={isViewOrderOpen} onOpenChange={setIsViewOrderOpen} order={selectedOrder} />
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : loadError ? (
        <ErrorState title="Could not load refund requests" message={loadError} />
      ) : filteredData.length === 0 ? (
        <EmptyState
          title="No refund requests"
          message={totalCount > 0 ? 'No refund request matches the current search or filters.' : 'Cancelled orders awaiting a refund will appear here.'}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {filteredData.map((order, index, all) => (
              <Row key={order.orderId} last={index === all.length - 1}>
                <Cell width={COLS[0]} numberOfLines={1}>{String(index + 1)}</Cell>
                <Cell width={COLS[1]}>
                  <Span className="text-sm font-semibold text-slate-900">{order.orderId}</Span>
                </Cell>
                <Cell width={COLS[2]}>
                  <Span className="text-sm text-slate-700">
                    {order.date}, {order.time}
                  </Span>
                </Cell>
                <Cell width={COLS[3]}>
                  <Div className="gap-0.5">
                    <Span className="text-sm font-medium text-slate-900">{order.customerName}</Span>
                    <Span className="text-xs text-slate-500">{order.customerPhone}</Span>
                  </Div>
                </Cell>
                <Cell width={COLS[4]}>{order.restaurant}</Cell>
                <Cell width={COLS[5]} align="right">
                  <Div className="items-end gap-0.5">
                    <Span className="text-sm font-semibold text-slate-900">
                      {'\u20B9'}
                      {Number(order.totalAmount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Span>
                    <Span className="text-xs text-slate-500">{order.paymentStatus}</Span>
                  </Div>
                </Cell>
                <Cell width={COLS[6]} numberOfLines={3}>
                  <Span className="text-sm text-slate-700">{order.cancellationReason || 'Rejected by restaurant'}</Span>
                </Cell>
                <Cell width={COLS[7]}>
                  <StatusBadge status={order.refundStatus === 'processed' ? 'processed' : 'pending'} label={order.refundStatus === 'processed' ? 'Processed' : 'Pending'} />
                </Cell>
                <Cell width={COLS[8]}>
                  <Div className="flex-row items-center gap-1">
                    <Button
                      onClick={() => handleViewOrder(order)}
                      className="w-11 h-11 rounded-lg items-center justify-center"
                      accessibilityLabel={`View order ${order.orderId}`}
                    >
                      <UiIcon as={Eye} size={18} className="text-blue-600" />
                    </Button>
                    {order.refundStatus !== 'processed' && (
                      <Button
                        onClick={() => handleProcessRefund(order)}
                        disabled={processingRefund === order.id}
                        className={`${BTN_PRIMARY} px-3`}
                        accessibilityLabel={`Process refund for order ${order.orderId}`}
                      >
                        {processingRefund === order.id ? (
                          <UiIcon as={Loader2} size={14} className="text-white" />
                        ) : (
                          <UiIcon as={Wallet} size={14} className="text-white" />
                        )}
                        <Span className={BTN_TEXT_PRIMARY}>Refund</Span>
                      </Button>
                    )}
                  </Div>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}
    </AdminPage>
  );
}
