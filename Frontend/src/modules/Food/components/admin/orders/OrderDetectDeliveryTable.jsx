import { Eye, Printer, ArrowUpDown, Phone, User } from "lucide-react"

const getStatusColor = (status) => {
  const colors = {
    "Ordered": "bg-neutral-100 text-[#0a4d2b]",
    "Accepted": "bg-green-100 text-green-700",
    "Rejected": "bg-red-100 text-red-700",
    "Delivery Boy Assigned": "bg-neutral-100 text-[#0a4d2b]",
    "Reached Pickup": "bg-orange-100 text-orange-700",
    "Reached Drop": "bg-amber-100 text-amber-700",
    "Ordered Delivered": "bg-emerald-100 text-emerald-700",
  }
  return colors[status] || "bg-neutral-100 text-neutral-700"
}

export default function OrderDetectDeliveryTable({ orders, visibleColumns, onViewOrder, onPrintOrder }) {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-900/[0.08]">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-32 h-32 rounded-2xl flex items-center justify-center mb-6 shadow-inner bg-neutral-100">
            <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-5xl text-orange-500 font-medium">!</span>
            </div>
          </div>
          <p className="text-lg font-medium text-neutral-700 mb-1">No data found</p>
          <p className="text-sm text-neutral-500">There are no orders matching your criteria</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              {visibleColumns.si && (
                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                  <div className="flex items-center gap-2">
                    <span>SI</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                  </div>
                </th>
              )}
              {visibleColumns.orderId && (
                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                  <div className="flex items-center gap-2">
                    <span>Order ID</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                  </div>
                </th>
              )}
              {visibleColumns.userInfo && (
                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                  <div className="flex items-center gap-2">
                    <span>User name & number</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                  </div>
                </th>
              )}
              {visibleColumns.restaurantName && (
                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                  <div className="flex items-center gap-2">
                    <span>Restaurant name</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                  </div>
                </th>
              )}
              {visibleColumns.deliveryBoy && (
                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                  <div className="flex items-center gap-2">
                    <span>Delivery boy name & number</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                  </div>
                </th>
              )}
              {visibleColumns.status && (
                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                  <div className="flex items-center gap-2">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                  </div>
                </th>
              )}
              {visibleColumns.actions && (
                <th className="px-6 py-4 text-center text-xs font-medium text-neutral-700">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-100">
            {orders.map((order, index) => (
              <tr
                key={order.orderId || order.id || index}
                className="hover:bg-neutral-50 transition-colors"
              >
                {visibleColumns.si && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-neutral-700">
                      {order.sl ?? order.si ?? index + 1}
                    </span>
                  </td>
                )}
                {visibleColumns.orderId && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-neutral-900">#{order.orderId}</span>
                  </td>
                )}
                {visibleColumns.userInfo && (
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1">
                        <User className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="text-sm font-medium text-neutral-700">{order.userName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="text-xs text-neutral-600">{order.userNumber}</span>
                      </div>
                    </div>
                  </td>
                )}
                {visibleColumns.restaurantName && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-neutral-700">{order.restaurantName}</span>
                  </td>
                )}
                {visibleColumns.deliveryBoy && (
                  <td className="px-6 py-4">
                    {order.deliveryBoyName ? (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1">
                          <User className="w-3.5 h-3.5 text-neutral-500" />
                          <span className="text-sm font-medium text-neutral-700">{order.deliveryBoyName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-neutral-500" />
                          <span className="text-xs text-neutral-600">{order.deliveryBoyNumber}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-400">Not assigned</span>
                    )}
                  </td>
                )}
                {visibleColumns.status && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </td>
                )}
                {visibleColumns.actions && (
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onViewOrder(order)}
                        className="p-1.5 rounded text-orange-600 hover:bg-orange-50 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onPrintOrder(order)}
                        className="p-1.5 rounded text-[#0a4d2b] hover:bg-neutral-50 transition-colors"
                        title="Print Order"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
