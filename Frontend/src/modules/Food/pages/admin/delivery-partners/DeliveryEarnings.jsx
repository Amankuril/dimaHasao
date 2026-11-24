import { useState, useEffect, useCallback } from "react"
import { Search, Download, ChevronDown, DollarSign, Calendar, Filter, Loader2, FileText, FileSpreadsheet, Code } from "lucide-react"
import { adminAPI } from "@food/api"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu"
import { toast } from "sonner"
import AdminListPagination from "@food/components/admin/AdminListPagination"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


const formatCurrency = (amount) => {
  return `\u20B9${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function DeliveryEarnings() {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [earnings, setEarnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem("admin_delivery_earnings_pageSize")) || 20
    } catch {
      return 20
    }
  })
  const [totalItems, setTotalItems] = useState(0)
  const [summary, setSummary] = useState({
    totalDeliveryPartners: 0,
    totalEarnings: 0,
    totalOrders: 0
  })
  const [filters, setFilters] = useState({
    period: 'all',
    deliveryPartnerId: '',
    fromDate: '',
    toDate: ''
  })
  const [deliveryPartners, setDeliveryPartners] = useState([])

  // Fetch delivery partners for filter dropdown
  const fetchDeliveryPartners = useCallback(async () => {
    try {
      const response = await adminAPI.getDeliveryPartners({ limit: 1000 })
      if (response.data?.success) {
        setDeliveryPartners(response.data.data.deliveryPartners || [])
      }
    } catch (err) {
      debugError("Error fetching delivery partners:", err)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filters])

  // Fetch earnings from API
  const fetchEarnings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = {
        page: currentPage,
        limit: pageSize,
        period: filters.period,
        ...(filters.deliveryPartnerId && { deliveryPartnerId: filters.deliveryPartnerId }),
        ...(filters.fromDate && { fromDate: filters.fromDate }),
        ...(filters.toDate && { toDate: filters.toDate }),
        ...(debouncedSearch && { search: debouncedSearch })
      }

      const response = await adminAPI.getDeliveryEarnings(params)

      if (response.data?.success) {
        setEarnings(response.data.data.earnings || [])
        setSummary(response.data.data.summary || {})
        setTotalItems(response.data.data.pagination?.total ?? (response.data.data.earnings || []).length)
      } else {
        setError(response.data?.message || "Failed to fetch earnings")
        setEarnings([])
        setTotalItems(0)
      }
    } catch (err) {
      debugError("Error fetching earnings:", err)
      const errorMessage = err.response?.data?.message || "Failed to fetch earnings. Please try again."
      setError(errorMessage)
      toast.error(errorMessage)
      setEarnings([])
      setTotalItems(0)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, filters, debouncedSearch])

  useEffect(() => {
    fetchDeliveryPartners()
  }, [fetchDeliveryPartners])

  useEffect(() => {
    fetchEarnings()
  }, [fetchEarnings])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleExport = (format) => {
    if (earnings.length === 0) {
      toast.info("No data to export")
      return
    }

    const headers = [
      { key: "sl", label: "SI" },
      { key: "deliveryPartnerName", label: "Delivery Boy" },
      { key: "deliveryPartnerPhone", label: "Phone" },
      { key: "orderId", label: "Order ID" },
      { key: "restaurantName", label: "Restaurant" },
      { key: "amount", label: "Earning" },
      { key: "orderTotal", label: "Order Total" },
      { key: "deliveryFee", label: "Delivery Fee" },
      { key: "orderStatus", label: "Status" },
      { key: "createdAt", label: "Date" },
    ]

    const data = earnings.map((earning, index) => ({
      sl: (currentPage - 1) * pageSize + index + 1,
      deliveryPartnerName: earning.deliveryPartnerName || 'N/A',
      deliveryPartnerPhone: earning.deliveryPartnerPhone || 'N/A',
      orderId: earning.orderId || 'N/A',
      restaurantName: earning.restaurantName || 'N/A',
      amount: formatCurrency(earning.amount),
      orderTotal: formatCurrency(earning.orderTotal),
      deliveryFee: formatCurrency(earning.deliveryFee),
      orderStatus: earning.orderStatus || 'N/A',
      createdAt: formatDate(earning.createdAt)
    }))

    switch (format) {
      case "csv":
        const csvContent = [
          headers.map(h => h.label).join(","),
          ...data.map(row => headers.map(h => `"${row[h.key] || ''}"`).join(","))
        ].join("\n")
        const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const csvLink = document.createElement("a")
        csvLink.href = URL.createObjectURL(csvBlob)
        csvLink.download = `delivery_earnings_${new Date().toISOString().split('T')[0]}.csv`
        csvLink.click()
        toast.success("CSV exported successfully")
        break
      case "excel":
        toast.info("Excel export coming soon")
        break
      case "pdf":
        toast.info("PDF export coming soon")
        break
      case "json":
        const jsonContent = JSON.stringify(data, null, 2)
        const jsonBlob = new Blob([jsonContent], { type: "application/json" })
        const jsonLink = document.createElement("a")
        jsonLink.href = URL.createObjectURL(jsonBlob)
        jsonLink.download = `delivery_earnings_${new Date().toISOString().split('T')[0]}.json`
        jsonLink.click()
        toast.success("JSON exported successfully")
        break
      default:
        toast.error("Invalid export format")
    }
  }

  if (loading && earnings.length === 0) {
    return (
      <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen w-full max-w-full overflow-x-hidden flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#0a4d2b]" />
          <p className="text-neutral-600">Loading delivery earnings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="w-full mx-auto">
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-medium text-neutral-900">Delivery earning</h1>
                <p className="text-sm text-neutral-600">View all delivery boy earnings and details</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 mb-1">Total delivery boys</p>
                <p className="text-2xl font-medium text-neutral-900">{summary.totalDeliveryPartners || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center bg-neutral-100 text-neutral-500">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 mb-1">Total earnings</p>
                <p className="text-2xl font-medium text-green-600">{formatCurrency(summary.totalEarnings || 0)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 mb-1">Total orders</p>
                <p className="text-2xl font-medium text-neutral-900">{summary.totalOrders || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center bg-neutral-100 text-neutral-500">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Period</label>
              <select
                value={filters.period}
                onChange={(e) => handleFilterChange('period', e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Delivery boy</label>
              <select
                value={filters.deliveryPartnerId}
                onChange={(e) => handleFilterChange('deliveryPartnerId', e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
              >
                <option value="">All Delivery Boys</option>
                {deliveryPartners.map(dp => (
                  <option key={dp._id} value={dp._id}>{dp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">From date</label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">To date</label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
              />
            </div>
          </div>
        </div>

        {/* Search and Export */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by name, phone, order ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")}>
                  <Code className="w-4 h-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Earnings Table */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">SI</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Delivery boy</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Restaurant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Earning</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Order total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {earnings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-lg font-medium text-neutral-700 mb-1">No earnings found</p>
                        <p className="text-sm text-neutral-500">No earnings match your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  earnings.map((earning, index) => (
                    <tr key={earning.transactionId || index} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm text-neutral-700">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                        {earning.deliveryPartnerName || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-700">
                        {earning.deliveryPartnerPhone || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#0a4d2b] font-medium">
                        {earning.orderId || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-700">
                        {earning.restaurantName || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600">
                        {formatCurrency(earning.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-700">
                        {formatCurrency(earning.orderTotal)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          earning.orderStatus === 'delivered' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {earning.orderStatus || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-700">
                        {formatDate(earning.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <AdminListPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              try {
                localStorage.setItem("admin_delivery_earnings_pageSize", String(size))
              } catch {
                /* ignore */
              }
            }}
            itemLabel="earnings"
          />
        </div>
      </div>
    </div>
  )
}


