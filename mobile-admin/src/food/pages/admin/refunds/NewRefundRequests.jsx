/* Ported from Frontend/src/modules/Food/pages/admin/refunds/NewRefundRequests.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect } from 'react';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { Loader2 } from 'lucide-react-native';
import OrdersTopbar from '../../../components/admin/orders/OrdersTopbar';
import OrdersTable from '../../../components/admin/orders/OrdersTable';
import FilterPanel from '../../../components/admin/orders/FilterPanel';
import ViewOrderDialog from '../../../components/admin/orders/ViewOrderDialog';
import SettingsDialog from '../../../components/admin/orders/SettingsDialog';
import { useGenericTableManagement } from '../../../components/admin/orders/useGenericTableManagement';
import { Button, Div, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
import { Path, Svg } from 'react-native-svg';
import { window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function NewRefundRequests() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <OrdersTopbar
        title="Requested Orders"
        count={count}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onFilterClick={() => setIsFilterOpen(true)}
        activeFiltersCount={activeFiltersCount}
        onExport={handleExport}
        onSettingsClick={() => setIsSettingsOpen(true)}
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
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-20">
          <Div className="flex flex-col items-center justify-center">
            <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-orange-500 mb-4" />
            <P className="text-sm text-slate-600">Loading refund requests...</P>
          </Div>
        </Div>
      ) : (
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <Table cols={[70, 150, 200, 200, 200, 150, 240, 150, 120]} className="w-full min-w-full">
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase">SI</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase">Order ID</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase">Order Date</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase">Customer</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase">Restaurant</Th>
                  <Th className="px-6 py-4 text-right text-[10px] font-bold text-slate-700 uppercase">Total Amount</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase">Cancellation Reason</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase">Refund Status</Th>
                  <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase">Actions</Th>
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {filteredData.length === 0 ? (
                  <Tr>
                    <Td colSpan={9} className="px-6 py-20 text-center">
                      <P className="text-sm text-slate-500">No refund requests found</P>
                    </Td>
                  </Tr>
                ) : (
                  filteredData.map((order, index) => (
                    <Tr key={order.orderId} className="hover:bg-slate-50">
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-700">{index + 1}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-900">{order.orderId}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-700">
                          {order.date}, {order.time}
                        </Span>
                      </Td>
                      <Td className="px-6 py-4">
                        <Div className="flex flex-col">
                          <Span className="text-sm font-medium text-slate-700">{order.customerName}</Span>
                          <Span className="text-xs text-slate-500 mt-0.5">{order.customerPhone}</Span>
                        </Div>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-700">{order.restaurant}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap text-right">
                        <Div className="text-sm font-medium text-slate-900">
                          {'\u20B9'}
                          {order.totalAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Div>
                        <Div className="text-xs text-emerald-600 mt-0.5">{order.paymentStatus}</Div>
                      </Td>
                      <Td className="px-6 py-4">
                        <Div className="text-sm text-red-600 max-w-xs">{order.cancellationReason || 'Rejected by restaurant'}</Div>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${order.refundStatus === 'processed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                        >
                          {order.refundStatus === 'processed' ? 'Processed' : 'Pending'}
                        </Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap text-center">
                        <Div className="flex items-center justify-center gap-2">
                          <Button onClick={() => handleViewOrder(order)} className="p-1.5 rounded text-orange-600 hover:bg-orange-50 transition-colors">
                            <Svg width={16} height={16} fill="none" stroke="#EA580C" viewBox="0 0 24 24">
                              <Path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <Path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </Svg>
                          </Button>
                          {order.refundStatus !== 'processed' && (
                            <Button
                              onClick={() => handleProcessRefund(order)}
                              disabled={processingRefund === order.id}
                              className="p-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              {processingRefund === order.id ? <UiIcon as={Loader2} className="w-4 h-4 animate-spin" /> : <Span className="text-sm">?</Span>}
                            </Button>
                          )}
                        </Div>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
        </Div>
      )}
    </ScrollDiv>
  );
}
