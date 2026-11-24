import { X, Clock, CheckCircle, XCircle, User, Phone, Package, MapPin } from "lucide-react"

const getStatusColor = (status) => {
  const colors = {
    "Ordered": "bg-neutral-100 text-[#0a4d2b] border-neutral-200",
    "Restaurant Accepted": "bg-green-100 text-green-700 border-green-200",
    "Accepted": "bg-green-100 text-green-700 border-green-200", // Keep for backward compatibility
    "Rejected": "bg-red-100 text-red-700 border-red-200",
    "Delivery Boy Assigned": "bg-neutral-100 text-[#0a4d2b] border-neutral-200",
    "Delivery Boy Reached Pickup": "bg-orange-100 text-orange-700 border-orange-200",
    "Reached Pickup": "bg-orange-100 text-orange-700 border-orange-200", // Keep for backward compatibility
    "Order ID Accepted": "bg-neutral-100 text-[#0a4d2b] border-neutral-200",
    "Reached Drop": "bg-amber-100 text-amber-700 border-amber-200",
    "Ordered Delivered": "bg-emerald-100 text-emerald-700 border-emerald-200",
  }
  return colors[status] || "bg-neutral-100 text-neutral-700 border-neutral-200"
}

const getStatusIcon = (status) => {
  if (status === "Rejected") return XCircle
  if (status === "Ordered Delivered") return CheckCircle
  return Clock
}

export default function ViewOrderDetectDeliveryDialog({ isOpen, onOpenChange, order }) {
  if (!isOpen || !order) return null

  const StatusIcon = getStatusIcon(order.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div>
            <h2 className="text-2xl font-medium text-neutral-900">Order details</h2>
            <p className="text-sm text-neutral-500 mt-1">Order ID: #{order.orderId}</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5 text-neutral-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* User Information */}
            <div className="bg-neutral-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                User information
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-neutral-500">Name</p>
                  <p className="text-sm font-medium text-neutral-900">{order.userName}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Phone number</p>
                  <p className="text-sm font-medium text-neutral-900 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {order.userNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* Restaurant Information */}
            <div className="bg-neutral-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Restaurant information
              </h3>
              <div>
                <p className="text-xs text-neutral-500">Restaurant name</p>
                <p className="text-sm font-medium text-neutral-900">{order.restaurantName}</p>
              </div>
            </div>

            {/* Delivery Boy Information */}
            {order.deliveryBoyName && (
              <div className="bg-neutral-50 rounded-lg p-4 md:col-span-2">
                <h3 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Delivery boy information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-neutral-500">Name</p>
                    <p className="text-sm font-medium text-neutral-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {order.deliveryBoyName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Phone number</p>
                    <p className="text-sm font-medium text-neutral-900 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {order.deliveryBoyNumber}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current Status */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Current status</h3>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${getStatusColor(order.status)}`}>
              <StatusIcon className="w-4 h-4" />
              <span className="font-medium">{order.status}</span>
            </div>
          </div>

          {/* Status History Timeline */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 mb-4">Status history</h3>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-neutral-200" />
              
              {/* Status items */}
              <div className="space-y-4">
                {order.statusHistory && order.statusHistory.map((historyItem, index) => {
                  const isLast = index === order.statusHistory.length - 1
                  const HistoryIcon = getStatusIcon(historyItem.status)
                  
                  return (
                    <div key={index} className="relative flex items-start gap-4">
                      {/* Icon */}
                      <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${getStatusColor(historyItem.status)}`}>
                        <HistoryIcon className="w-4 h-4" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${getStatusColor(historyItem.status).split(' ')[1]}`}>
                            {historyItem.status}
                          </span>
                          <span className="text-xs text-neutral-500">{historyItem.timestamp}</span>
                        </div>
                        {historyItem.deliveryBoy && (
                          <div className="mt-2 text-xs text-neutral-600 bg-neutral-50 rounded p-2">
                            <p><span className="font-medium">Delivery Boy:</span> {historyItem.deliveryBoy}</p>
                            {historyItem.deliveryBoyNumber && (
                              <p><span className="font-medium">Phone:</span> {historyItem.deliveryBoyNumber}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Order Date & Time */}
          <div className="mt-6 pt-6 border-t border-neutral-200">
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="text-neutral-500">Order date</p>
                <p className="font-medium text-neutral-900">{order.orderDate}</p>
              </div>
              <div>
                <p className="text-neutral-500">Order time</p>
                <p className="font-medium text-neutral-900">{order.orderTime}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200 bg-neutral-50">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

