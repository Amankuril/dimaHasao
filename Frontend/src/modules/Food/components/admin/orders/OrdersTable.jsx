import React, { useState, useEffect, useMemo } from "react"
import { Eye, Printer, ArrowUpDown, Loader2, Check, X, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import {
  resolveRestaurantItemUnitPrice,
  resolveItemMarkupUnit,
} from "@food/utils/restaurantOrderPricing"

const formatINR = (value, digits = 0) =>
  `₹${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: 2,
  })}`

const getStatusColor = (orderStatus) => {
  const colors = {
    "Delivered": "bg-emerald-100 text-emerald-700",
    "Pending": "bg-neutral-100 text-[#0a4d2b]",
    "Scheduled": "bg-neutral-100 text-[#0a4d2b]",
    "Accepted": "bg-green-100 text-green-700",
    "Processing": "bg-orange-100 text-orange-700",
    "Food On The Way": "bg-yellow-100 text-yellow-700",
    "Canceled": "bg-rose-100 text-rose-700",
    "Cancelled by Restaurant": "bg-red-100 text-red-700",
    "Cancelled by User": "bg-orange-100 text-orange-700",
    "Payment Failed": "bg-red-100 text-red-700",
    "Refunded": "bg-neutral-100 text-[#0a4d2b]",
    "Dine In": "bg-neutral-100 text-[#0a4d2b]",
    "Offline Payments": "bg-neutral-100 text-neutral-700",
  }
  return colors[orderStatus] || "bg-neutral-100 text-neutral-700"
}

const getPaymentStatusColor = (paymentStatus) => {
  if (paymentStatus === "Paid" || paymentStatus === "Collected") return "text-emerald-600"
  if (paymentStatus === "COD Pending" || paymentStatus === "Not Collected") return "text-amber-600"
  if (paymentStatus === "Refunded") return "text-[#0a4d2b]"
  if (paymentStatus === "Unpaid" || paymentStatus === "Failed") return "text-red-600"
  return "text-neutral-600"
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
  const [localPage, setLocalPage] = useState(1)
  const [localPageSize, setLocalPageSize] = useState(20)
  const [expandedOrders, setExpandedOrders] = useState({})
  const [openReasonId, setOpenReasonId] = useState(null)

  const isServerPaged =
    typeof totalItems === "number" &&
    typeof onPageChange === "function" &&
    typeof onPageSizeChange === "function"

  const currentPage = isServerPaged ? (controlledPage || 1) : localPage
  const pageSize = isServerPaged ? (controlledPageSize || 20) : localPageSize
  const totalCount = isServerPaged ? totalItems : orders.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1)

  const setCurrentPage = (updater) => {
    const next = typeof updater === "function" ? updater(currentPage) : updater
    if (isServerPaged) onPageChange(next)
    else setLocalPage(next)
  }

  const setPageSize = (size) => {
    if (isServerPaged) onPageSizeChange(size)
    else {
      setLocalPageSize(size)
      setLocalPage(1)
    }
  }

  const toggleOrderExpand = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }))
  }
  
  // Reset to page 1 when orders change (client-paged fallback only)
  useEffect(() => {
    if (!isServerPaged) setLocalPage(1)
  }, [orders.length, isServerPaged])
  
  const [sortConfig, setSortConfig] = useState({ key: "orderDate", direction: "desc" })

  const requestSort = (key) => {
    let direction = "asc"
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const sortedOrders = useMemo(() => {
    const sortableOrders = [...orders]
    if (sortConfig.key) {
      sortableOrders.sort((a, b) => {
        let aVal = ""
        let bVal = ""

        switch (sortConfig.key) {
          case "si":
            return 0
          case "orderId":
            aVal = String(a.orderId || "")
            bVal = String(b.orderId || "")
            break
          case "orderDate":
            aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0
            bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0
            break
          case "orderOtp":
            aVal = String(a.orderOtp || "")
            bVal = String(b.orderOtp || "")
            break
          case "customer":
            aVal = String(a.customerName || "").toLowerCase()
            bVal = String(b.customerName || "").toLowerCase()
            break
          case "restaurant":
            aVal = String(a.restaurant || "").toLowerCase()
            bVal = String(b.restaurant || "").toLowerCase()
            break
          case "foodItems":
            aVal = a.items && a.items[0] ? String(a.items[0].name || a.items[0].foodName || "").toLowerCase() : ""
            bVal = b.items && b.items[0] ? String(b.items[0].name || b.items[0].foodName || "").toLowerCase() : ""
            break
          case "itemPrice":
            aVal = a.items && a.items[0] ? Number(a.items[0].price || 0) : 0
            bVal = b.items && b.items[0] ? Number(b.items[0].price || 0) : 0
            break
          case "deliveryCharge":
            aVal = Number(a.deliveryCharge || 0)
            bVal = Number(b.deliveryCharge || 0)
            break
          case "totalAmount":
            const rawAmountA = a.totalAmount ?? a.total ?? a.pricing?.total ?? 0
            const rawAmountB = b.totalAmount ?? b.total ?? b.pricing?.total ?? 0
            aVal = Number(rawAmountA)
            bVal = Number(rawAmountB)
            break
          case "paymentType":
            aVal = String(a.paymentType || "").toLowerCase()
            bVal = String(b.paymentType || "").toLowerCase()
            break
          case "paymentCollectionStatus":
            aVal = String(a.paymentStatus || "").toLowerCase()
            bVal = String(b.paymentStatus || "").toLowerCase()
            break
          case "orderStatus":
            aVal = String(a.orderStatus || "").toLowerCase()
            bVal = String(b.orderStatus || "").toLowerCase()
            break
          default:
            break
        }

        if (aVal < bVal) {
          return sortConfig.direction === "asc" ? -1 : 1
        }
        if (aVal > bVal) {
          return sortConfig.direction === "asc" ? 1 : -1
        }
        return 0
      })
    }
    return sortableOrders
  }, [orders, sortConfig])

  const paginatedOrders = useMemo(() => {
    if (isServerPaged) return sortedOrders
    const start = (currentPage - 1) * pageSize
    return sortedOrders.slice(start, start + pageSize)
  }, [sortedOrders, currentPage, pageSize, isServerPaged])

  const formatRestaurantName = (name) => {
    if (name === "Cafe Monarch") return "Café Monarch"
    return name
  }

  if (orders.length === 0 && totalCount === 0) {
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
    <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden w-full max-w-full">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1800px]">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              {visibleColumns.si && (
                <th className="w-[50px] px-6 py-4 text-left text-xs font-medium text-neutral-700 whitespace-nowrap">
                  <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort("si")}>
                    <span>SI</span>
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${sortConfig.key === "si" ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"}`} />
                  </div>
                </th>
              )}
              {visibleColumns.orderId && (
                <th className="w-[110px] px-6 py-4 text-left text-xs font-medium text-neutral-700 whitespace-nowrap">
                  <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort("orderId")}>
                    <span>Order ID</span>
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${sortConfig.key === "orderId" ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"}`} />
                  </div>
                </th>
              )}
              {visibleColumns.orderDate && (
                <th className="w-[160px] px-6 py-4 text-left text-xs font-medium text-neutral-700 whitespace-nowrap">
                  <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort("orderDate")}>
                    <span>Order date</span>
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${sortConfig.key === "orderDate" ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"}`} />
                  </div>
                </th>
              )}
              {visibleColumns.orderOtp && (
                <th className="w-[90px] px-6 py-4 text-left text-xs font-medium text-neutral-700 whitespace-nowrap">
                  <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort("orderOtp")}>
                    <span>Order OTP</span>
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${sortConfig.key === "orderOtp" ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"}`} />
                  </div>
                </th>
              )}
              {visibleColumns.customer && (
                <th className="w-[200px] px-6 py-4 text-left text-xs font-medium text-neutral-700 whitespace-nowrap">
                  <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort("customer")}>
                    <span>Customer information</span>
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${sortConfig.key === "customer" ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"}`} />
                  </div>
                </th>
              )}
              {visibleColumns.restaurant && (
                <th className="w-[200px] px-6 py-4 text-left text-xs font-medium text-neutral-700 whitespace-nowrap">
                  <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort("restaurant")}>
                    <span>Restaurant</span>
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${sortConfig.key === "restaurant" ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"}`} />
                  </div>
                </th>
              )}
              {visibleColumns.foodItems && (
                <th className="w-[240px] px-6 py-4 text-left text-xs font-medium text-neutral-700 whitespace-nowrap">
                  <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort("foodItems")}>
                    <span>Food items</span>
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${sortConfig.key === "foodItems" ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"}`} />
                  </div>
                </th>
              )}
              {visibleColumns.itemPrice && (
                <th className="w-[100px] px-6 py-4 text-left text-xs font-medium text-neutral-700 whitespace-nowrap">
                  <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort("itemPrice")}>
                    <span>Price</span>
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${sortConfig.key === "itemPrice" ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"}`} />
                  </div>
                </th>
              )}
              {visibleColumns.deliveryCharge && (
                <th className="w-[110px] px-6 py-4 text-left text-xs font-medium text-neutral-700 whitespace-nowrap">
                  <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort("deliveryCharge")}>
                    <span>Delivery charge</span>
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${sortConfig.key === "deliveryCharge" ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"}`} />
                  </div>
                </th>
              )}
              {visibleColumns.totalAmount && (
                <th className="w-[120px] px-6 py-4 text-left text-xs font-medium text-neutral-700 whitespace-nowrap">
                  <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort("totalAmount")}>
                    <span>Total amount</span>
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${sortConfig.key === "totalAmount" ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"}`} />
                  </div>
                </th>
              )}
              {(visibleColumns.paymentType !== false) && (
                <th className="w-[120px] px-6 py-4 text-left text-xs font-medium text-neutral-700 whitespace-nowrap">
                  <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort("paymentType")}>
                    <span>Payment type</span>
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${sortConfig.key === "paymentType" ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"}`} />
                  </div>
                </th>
              )}
              {(visibleColumns.paymentCollectionStatus !== false) && (
                <th className="w-[120px] px-6 py-4 text-left text-xs font-medium text-neutral-700 whitespace-nowrap">
                  <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort("paymentCollectionStatus")}>
                    <span>Payment status</span>
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${sortConfig.key === "paymentCollectionStatus" ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"}`} />
                  </div>
                </th>
              )}

              {visibleColumns.orderStatus && (
                <th className="w-[150px] px-6 py-4 text-left text-xs font-medium text-neutral-700 whitespace-nowrap">
                  <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => requestSort("orderStatus")}>
                    <span>Order status</span>
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${sortConfig.key === "orderStatus" ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"}`} />
                  </div>
                </th>
              )}
              {visibleColumns.actions && (
                <th className="w-[220px] px-6 py-4 text-center text-xs font-medium text-neutral-700 whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-100">
            {paginatedOrders.map((order, index) => (
              <tr 
                key={order.orderId} 
                className="hover:bg-neutral-50 transition-colors"
              >
                {visibleColumns.si && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-neutral-700">{(currentPage - 1) * pageSize + index + 1}</span>
                  </td>
                )}
                {visibleColumns.orderId && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-neutral-900">{order.orderId}</span>
                  </td>
                )}
                {visibleColumns.orderDate && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-neutral-700">{order.date}, {order.time}</span>
                  </td>
                )}
                {visibleColumns.orderOtp && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(order.orderStatus === "Cancelled" || 
                      order.orderStatus === "Cancelled by Restaurant" || 
                      order.orderStatus === "Cancelled by User" || 
                      order.orderStatus === "Canceled") ? (
                        <span className="text-sm font-medium text-neutral-900">N/A</span>
                      ) : (
                        <span className="text-sm font-medium text-neutral-900">
                          {order.orderOtp || "--"}
                        </span>
                      )}
                  </td>
                )}
                {visibleColumns.customer && (
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-neutral-700">{order.customerName}</span>
                      <span className="text-xs text-neutral-500 mt-0.5">{order.customerPhone}</span>
                    </div>
                  </td>
                )}
                {visibleColumns.restaurant && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-neutral-700">{formatRestaurantName(order.restaurant)}</span>
                  </td>
                )}
                {visibleColumns.foodItems && (
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 min-w-[200px] max-w-md">
                      {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
                        (() => {
                          const isExpanded = expandedOrders[order.orderId] || false;
                          const hasMore = order.items.length > 1;
                          const itemsToShow = isExpanded ? order.items : order.items.slice(0, 1);
                          const remainingCount = order.items.length - 1;

                          return (
                            <>
                              {itemsToShow.map((item, idx) => (
                                <div key={idx || item.itemId || idx} className="flex items-center gap-2 text-sm animate-fadeIn">
                                  <span className="font-medium text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded min-w-[2.5rem] text-center self-start mt-0.5">
                                    {item.quantity || 1}x
                                  </span>
                                  <div className="flex-1">
                                    <span className="text-neutral-800 font-medium">
                                      {item.name || item.itemName || item.title || 'Unknown Item'}
                                    </span>
                                    {item.variantName && (
                                      <p className="text-xs text-neutral-500 font-medium">{item.variantName}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {hasMore && (
                                <button
                                  onClick={() => toggleOrderExpand(order.orderId)}
                                  className="px-2 py-0.5 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors shadow-sm w-fit mt-1.5 bg-[#0a4d2b]"
                                  title={isExpanded ? "Show less items" : "View all items"}
                                >
                                  <span>{isExpanded ? "View Less" : `+${remainingCount} More Items`}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-white" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-white" />
                                  )}
                                </button>
                              )}
                            </>
                          );
                        })()
                      ) : (
                        <span className="text-sm text-neutral-400">No items found</span>
                      )}
                    </div>
                  </td>
                )}
                {visibleColumns.itemPrice && (
                  <td className="px-6 py-4 text-left">
                    <div className="flex flex-col gap-2">
                      {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
                        (() => {
                          const isExpanded = expandedOrders[order.orderId] || false;
                          const itemsToShow = isExpanded ? order.items : order.items.slice(0, 1);

                          return (
                            <>
                              {itemsToShow.map((item, idx) => {
                                const qty = Number(item.quantity || 1) || 1
                                const baseUnit = resolveRestaurantItemUnitPrice(item)
                                const baseLine = baseUnit * qty
                                return (
                                  <div
                                    key={idx || item.itemId || `item-price-${idx}`}
                                    className="text-sm text-left min-h-[20px] flex items-center"
                                  >
                                    <span className="font-medium text-neutral-700">
                                      {formatINR(baseLine)}
                                    </span>
                                  </div>
                                )
                              })}
                              {order.items.length > 1 && (
                                <div className="h-[20px]" /> // Spacer to balance the View More button height in foodItems column!
                              )}
                            </>
                          );
                        })()
                      ) : (
                        <span className="text-sm text-neutral-400">-</span>
                      )}
                    </div>
                  </td>
                )}
                {visibleColumns.deliveryCharge && (
                  <td className="px-6 py-4 whitespace-nowrap text-left">
                    <span className="text-sm font-medium text-neutral-700">
                      {(() => {
                        const deliveryCharge = Number(order.deliveryCharge ?? 0)
                        return `₹${deliveryCharge.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}`
                      })()}
                    </span>
                  </td>
                )}
                {visibleColumns.totalAmount && (
                  <td className="px-6 py-4 whitespace-nowrap text-left">
                    <div className="text-sm font-medium text-neutral-900">
                      {(() => {
                        const rawAmount =
                          order.totalAmount ??
                          order.total ??
                          order.pricing?.total ??
                          0;
                        const amount = Number.isFinite(Number(rawAmount))
                          ? Number(rawAmount)
                          : 0;
                        return formatINR(amount, 2);
                      })()}
                    </div>
                    {(() => {
                      const base =
                        Number(order.baseSubtotal) ||
                        Number(order.pricing?.baseSubtotal) ||
                        0
                      let markup =
                        Number(order.markupTotal) ||
                        Number(order.pricing?.markupTotal) ||
                        0
                      if (!(markup > 0) && Array.isArray(order.items)) {
                        markup = order.items.reduce((sum, item) => {
                          const qty = Number(item.quantity || 1) || 1
                          return sum + resolveItemMarkupUnit(item) * qty
                        }, 0)
                      }
                      if (!(markup > 0)) return null
                      const restaurantBase =
                        base > 0
                          ? base
                          : Array.isArray(order.items)
                            ? order.items.reduce((sum, item) => {
                                const qty = Number(item.quantity || 1) || 1
                                return sum + resolveRestaurantItemUnitPrice(item) * qty
                              }, 0)
                            : 0
                      return (
                        <div className="text-xs mt-0.5 font-medium text-neutral-500">
                          {formatINR(restaurantBase)}{" "}
                          <span className="text-rose-600">+ {formatINR(markup)}</span>
                        </div>
                      )
                    })()}
                    <div className={`text-xs mt-0.5 text-left ${getPaymentStatusColor(order.paymentStatus)}`}>
                      {order.paymentStatus}
                    </div>
                  </td>
                )}
                {(visibleColumns.paymentType !== false) && (
                  <td className="px-6 py-4 whitespace-nowrap">
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
                        <span className={`text-sm font-medium ${
                          isCod ? 'text-amber-600' : 
                          isWallet ? 'text-[#0a4d2b]' : 
                          'text-emerald-600'
                        }`}>
                          {paymentTypeDisplay}
                        </span>
                      );
                    })()}
                  </td>
                )}
                {(visibleColumns.paymentCollectionStatus !== false) && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                        {order.paymentStatus || "Pending"}
                      </span>
                      {order.paymentCollectionStatus && (
                        <span className="text-xs text-neutral-500 mt-0.5">
                          {order.paymentCollectionStatus}
                        </span>
                      )}
                    </div>
                  </td>
                )}

                {visibleColumns.orderStatus && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.orderStatus)}`}>
                          {order.orderStatus}
                        </span>
                        <span className="text-xs text-neutral-500">{order.deliveryType}</span>
                      </div>
                      {order.cancellationReason && (() => {
                        const rowKey = order.id || order.orderId
                        const isOpen = openReasonId === rowKey
                        return (
                          <div className="mt-1 max-w-[240px]">
                            <button
                              type="button"
                              onClick={() => setOpenReasonId(isOpen ? null : rowKey)}
                              className={`rounded-md border border-red-200 bg-red-50 text-left transition-colors hover:bg-red-100 ${
                                isOpen
                                  ? "flex w-full flex-col items-start gap-1.5 px-2.5 py-2"
                                  : "inline-flex items-center gap-1 px-2 py-0.5"
                              }`}
                            >
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                                Reason
                                {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </span>
                              {isOpen ? (
                                <span className="text-xs font-medium leading-snug text-red-700 whitespace-normal break-words">
                                  {order.cancellationReason}
                                </span>
                              ) : null}
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  </td>
                )}
                {visibleColumns.actions && (
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-3">
                      {/* Secondary Actions (Icon-only buttons) - Always aligned together */}
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => onViewOrder(order)}
                          className="p-1.5 rounded text-orange-600 hover:bg-orange-50 transition-colors flex items-center justify-center"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onPrintOrder(order)}
                          className="p-1.5 rounded text-[#0a4d2b] hover:bg-neutral-50 transition-colors flex items-center justify-center"
                          title="Print Order"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Divider if we have primary actions */}
                      {( (order.orderStatus === "Pending" && (onAcceptOrder || onRejectOrder)) || 
                         ( (() => {
                           const isCancelled = order.orderStatus === "Cancelled by Restaurant" || 
                                             order.orderStatus === "Cancelled" || 
                                             order.orderStatus === "Cancelled by User" ||
                                             (order.status === "cancelled" && (order.cancelledBy === "user" || order.cancelledBy === "restaurant"));
                           const paymentMethod = order.payment?.method || order.paymentMethod;
                           const isOnlinePayment = order.paymentType === "Online" ||
                                                 (order.paymentType !== "Cash on Delivery" && 
                                                  order.payment?.method !== "cash" && 
                                                  order.payment?.method !== "cod" &&
                                                  (order.paymentMethod === "razorpay" || 
                                                   order.paymentMethod === "online" || 
                                                   order.payment?.paymentMethod === "razorpay" || 
                                                   order.payment?.method === "razorpay" ||
                                                   order.payment?.method === "online"));
                           const isWalletPayment = order.paymentType === "Wallet" || paymentMethod === "wallet";
                           return isCancelled && (isOnlinePayment || isWalletPayment) && order.paymentStatus === "Paid";
                         })() )
                      ) && (
                        <div className="h-4 w-[1px] bg-neutral-200" />
                      )}

                      {/* Primary Actions (Text/Status buttons) */}
                      <div className="flex items-center gap-2">
                        {order.orderStatus === "Pending" && onAcceptOrder && (() => {
                          const isRowLoading = actionLoadingOrderId === (order.id || order.orderId)
                          const isAccepting = isRowLoading && actionLoadingType === 'accept'
                          return (
                          <button
                            onClick={() => onAcceptOrder(order)}
                            disabled={isRowLoading}
                            className="px-2.5 py-1.5 rounded text-xs font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-1 bg-[#0a4d2b]"
                            title="Accept Order"
                          >
                            {isAccepting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>{isAccepting ? 'Accepting...' : 'Accept'}</span>
                          </button>
                          )
                        })()}
                        {order.orderStatus === "Pending" && onRejectOrder && (() => {
                          const isRowLoading = actionLoadingOrderId === (order.id || order.orderId)
                          const isRejecting = isRowLoading && actionLoadingType === 'reject'
                          return (
                          <button
                            onClick={() => onRejectOrder(order)}
                            disabled={isRowLoading}
                            className="px-2.5 py-1.5 rounded text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                            title="Reject Order"
                          >
                            {isRejecting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                            <span>{isRejecting ? 'Rejecting...' : 'Reject'}</span>
                          </button>
                          )
                        })()}

                        {/* Refund Block */}
                        {(() => {
                          const isCancelled = order.orderStatus === "Cancelled by Restaurant" || 
                                            order.orderStatus === "Cancelled" || 
                                            order.orderStatus === "Cancelled by User" ||
                                            (order.status === "cancelled" && (order.cancelledBy === "user" || order.cancelledBy === "restaurant"));
                          const paymentMethod = order.payment?.method || order.paymentMethod;
                          const isOnlinePayment = order.paymentType === "Online" ||
                                                (order.paymentType !== "Cash on Delivery" && 
                                                 order.payment?.method !== "cash" && 
                                                 order.payment?.method !== "cod" &&
                                                 (order.paymentMethod === "razorpay" || 
                                                  order.paymentMethod === "online" || 
                                                  order.payment?.paymentMethod === "razorpay" || 
                                                  order.payment?.method === "razorpay" ||
                                                  order.payment?.method === "online"));
                          const isWalletPayment = order.paymentType === "Wallet" || paymentMethod === "wallet";
                          return isCancelled && (isOnlinePayment || isWalletPayment) && order.paymentStatus === "Paid";
                        })() && (
                          <>
                            {order.refundStatus === 'processed' || order.refundStatus === 'initiated' ? (
                              <span className={`px-2.5 py-1.5 rounded-md text-xs font-medium ${
                                order.paymentType === "Wallet" || order.payment?.method === "wallet"
                                  ? "bg-neutral-100 text-[#0a4d2b]"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}>
                                {order.paymentType === "Wallet" || order.payment?.method === "wallet" 
                                  ? "Wallet Refunded" 
                                  : "Refunded"}
                              </span>
                            ) : onRefund ? (
                              <button 
                                onClick={() => onRefund(order)}
                                className={`px-3 py-1.5 rounded-md text-white text-xs font-medium hover:opacity-90 transition-colors shadow-sm flex items-center gap-1 ${
                                  order.paymentType === "Wallet" || order.payment?.method === "wallet"
                                    ? "bg-neutral-900 hover:bg-neutral-900"
                                    : "bg-neutral-900 hover:bg-neutral-900"
                                }`}
                                title={order.paymentType === "Wallet" || order.payment?.method === "wallet"
                                  ? "Process Wallet Refund (Add to user wallet)"
                                  : "Process Refund via Razorpay"}
                              >
                                <span className="text-sm font-medium">₹</span>
                                <span>Refund</span>
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls — same pattern as Delivery Man List */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-100 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500 font-medium">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400 cursor-pointer shadow-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex flex-1 justify-between sm:hidden w-full">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>

          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between w-full">
            <div className="pl-4">
              <p className="text-sm text-neutral-600">
                Showing{" "}
                <span className="font-medium text-neutral-900">
                  {Math.min(totalCount, (currentPage - 1) * pageSize + 1)}
                </span>{" "}
                to{" "}
                <span className="font-medium text-neutral-900">
                  {Math.min(totalCount, currentPage * pageSize)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-neutral-900">{totalCount}</span> orders
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md px-2.5 py-1.5 text-neutral-500 border border-neutral-200 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 2 && page <= currentPage + 2),
                  )
                  .map((page, index, arr) => {
                    const showEllipsisBefore = index > 0 && page - arr[index - 1] > 1
                    return (
                      <React.Fragment key={page}>
                        {showEllipsisBefore && (
                          <span className="px-3 py-1.5 text-neutral-400 text-sm">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            currentPage === page
                              ? "bg-neutral-900 text-white"
                              : "text-neutral-700 border border-neutral-200 hover:bg-neutral-50"
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    )
                  })}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="relative inline-flex items-center rounded-md px-2.5 py-1.5 text-neutral-500 border border-neutral-200 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                >
                  &gt;
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

