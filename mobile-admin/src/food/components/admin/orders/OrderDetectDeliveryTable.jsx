/* Ported from Frontend/src/modules/Food/components/admin/orders/OrderDetectDeliveryTable.jsx (tools/port.js first pass). */
import { Eye, Printer, ArrowUpDown, Phone, User } from 'lucide-react-native';
import { Button, Div, P, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
const getStatusColor = (status) => {
  const colors = {
    Ordered: 'bg-blue-100 text-blue-700',
    Accepted: 'bg-green-100 text-green-700',
    Rejected: 'bg-red-100 text-red-700',
    'Delivery Boy Assigned': 'bg-purple-100 text-purple-700',
    'Reached Pickup': 'bg-orange-100 text-orange-700',
    'Reached Drop': 'bg-amber-100 text-amber-700',
    'Ordered Delivered': 'bg-emerald-100 text-emerald-700',
  };
  return colors[status] || 'bg-slate-100 text-slate-700';
};
export default function OrderDetectDeliveryTable({ orders, visibleColumns, onViewOrder, onPrintOrder }) {
  if (orders.length === 0) {
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
    visibleColumns.si && 70,
    visibleColumns.orderId && 130,
    visibleColumns.userInfo && 200,
    visibleColumns.restaurantName && 190,
    visibleColumns.deliveryBoy && 220,
    visibleColumns.status && 190,
    visibleColumns.actions && 110,
  ].filter(Boolean);
  return (
    <Div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <Table cols={cols} className="w-full min-w-full">
          <Thead className="bg-slate-50 border-b border-slate-200">
            <Tr>
              {visibleColumns.si && (
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  <Div className="flex items-center gap-2">
                    <Span>SI</Span>
                    <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                  </Div>
                </Th>
              )}
              {visibleColumns.orderId && (
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  <Div className="flex items-center gap-2">
                    <Span>Order ID</Span>
                    <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                  </Div>
                </Th>
              )}
              {visibleColumns.userInfo && (
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  <Div className="flex items-center gap-2">
                    <Span>User Name & Number</Span>
                    <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                  </Div>
                </Th>
              )}
              {visibleColumns.restaurantName && (
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  <Div className="flex items-center gap-2">
                    <Span>Restaurant Name</Span>
                    <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                  </Div>
                </Th>
              )}
              {visibleColumns.deliveryBoy && (
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  <Div className="flex items-center gap-2">
                    <Span>Delivery Boy Name & Number</Span>
                    <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                  </Div>
                </Th>
              )}
              {visibleColumns.status && (
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  <Div className="flex items-center gap-2">
                    <Span>Status</Span>
                    <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                  </Div>
                </Th>
              )}
              {visibleColumns.actions && <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Actions</Th>}
            </Tr>
          </Thead>
          <Tbody className="bg-white divide-y divide-slate-100">
            {orders.map((order, index) => (
              <Tr key={order.orderId || order.id || index} className="hover:bg-slate-50 transition-colors">
                {visibleColumns.si && (
                  <Td className="px-6 py-4 whitespace-nowrap">
                    <Span className="text-sm font-medium text-slate-700">{order.sl ?? order.si ?? index + 1}</Span>
                  </Td>
                )}
                {visibleColumns.orderId && (
                  <Td className="px-6 py-4 whitespace-nowrap">
                    <Span className="text-sm font-medium text-slate-900">#{order.orderId}</Span>
                  </Td>
                )}
                {visibleColumns.userInfo && (
                  <Td className="px-6 py-4">
                    <Div className="flex flex-col">
                      <Div className="flex items-center gap-1.5 mb-1">
                        <UiIcon as={User} className="w-3.5 h-3.5 text-slate-500" />
                        <Span className="text-sm font-medium text-slate-700">{order.userName}</Span>
                      </Div>
                      <Div className="flex items-center gap-1.5">
                        <UiIcon as={Phone} className="w-3.5 h-3.5 text-slate-500" />
                        <Span className="text-xs text-slate-600">{order.userNumber}</Span>
                      </Div>
                    </Div>
                  </Td>
                )}
                {visibleColumns.restaurantName && (
                  <Td className="px-6 py-4 whitespace-nowrap">
                    <Span className="text-sm font-medium text-slate-700">{order.restaurantName}</Span>
                  </Td>
                )}
                {visibleColumns.deliveryBoy && (
                  <Td className="px-6 py-4">
                    {order.deliveryBoyName ? (
                      <Div className="flex flex-col">
                        <Div className="flex items-center gap-1.5 mb-1">
                          <UiIcon as={User} className="w-3.5 h-3.5 text-slate-500" />
                          <Span className="text-sm font-medium text-slate-700">{order.deliveryBoyName}</Span>
                        </Div>
                        <Div className="flex items-center gap-1.5">
                          <UiIcon as={Phone} className="w-3.5 h-3.5 text-slate-500" />
                          <Span className="text-xs text-slate-600">{order.deliveryBoyNumber}</Span>
                        </Div>
                      </Div>
                    ) : (
                      <Span className="text-sm text-slate-400 italic">Not assigned</Span>
                    )}
                  </Td>
                )}
                {visibleColumns.status && (
                  <Td className="px-6 py-4 whitespace-nowrap">
                    <Div className="flex items-center gap-2">
                      <Span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </Span>
                    </Div>
                  </Td>
                )}
                {visibleColumns.actions && (
                  <Td className="px-6 py-4 whitespace-nowrap text-center">
                    <Div className="flex items-center justify-center gap-2">
                      <Button onClick={() => onViewOrder(order)} className="p-1.5 rounded text-orange-600 hover:bg-orange-50 transition-colors">
                        <UiIcon as={Eye} className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => onPrintOrder(order)} className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors">
                        <UiIcon as={Printer} className="w-4 h-4" />
                      </Button>
                    </Div>
                  </Td>
                )}
              </Tr>
            ))}
          </Tbody>
      </Table>
    </Div>
  );
}
