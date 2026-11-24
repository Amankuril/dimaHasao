import React, { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Search, Download, ChevronDown, Eye, FileDown, FileSpreadsheet, FileText, X, Mail, Phone, MapPin, Package, IndianRupee, Calendar as CalendarIcon, User, CheckCircle, XCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu"
import { exportCustomersToCSV, exportCustomersToExcel, exportCustomersToPDF } from "@food/components/admin/customers/customersExportUtils"
import { adminAPI } from "@food/api"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@food/components/ui/dialog"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("")
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem('admin_customers_pageSize')) || 20)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [userDetails, setUserDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [filters, setFilters] = useState({
    orderDate: "",
    joiningDate: "",
    status: "",
    sortBy: "",
    chooseFirst: "",
  })

  const [globalCodBlockedFeatureEnabled, setGlobalCodBlockedFeatureEnabled] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchGlobalConfig = async () => {
      try {
        const res = await adminAPI.getCustomizationSettings()
        if (!cancelled && res?.data?.data) {
          const config = res.data.data
          if (config.cod_blocking_feature_enabled !== undefined) {
            setGlobalCodBlockedFeatureEnabled(config.cod_blocking_feature_enabled)
          }
        }
      } catch (err) {
        debugError("Error fetching global config", err)
      }
    }
    fetchGlobalConfig()
    return () => { cancelled = true }
  }, [])

  const filteredCustomers = useMemo(() => {
    let result = [...customers]

    // Search is handled by the API globally — do not re-filter the current page only.

    // Filter by order date when that field is available in the API payload.

    // Filter by joining date
    if (filters.joiningDate) {
      result = result.filter(customer => {
        // Parse joining date from format "17 Oct 2021"
        const customerDate = new Date(customer.joiningDate)
        const filterDate = new Date(filters.joiningDate)
        return customerDate.toDateString() === filterDate.toDateString()
      })
    }

    // Filter by status
    if (filters.status) {
      if (filters.status === "active") {
        result = result.filter(customer => customer.status === true)
      } else if (filters.status === "inactive") {
        result = result.filter(customer => customer.status === false)
      }
    }

    // Sort by options
    if (filters.sortBy) {
      if (filters.sortBy === "name-asc") {
        result.sort((a, b) => a.name.localeCompare(b.name))
      } else if (filters.sortBy === "name-desc") {
        result.sort((a, b) => b.name.localeCompare(a.name))
      } else if (filters.sortBy === "orders-asc") {
        result.sort((a, b) => a.totalOrder - b.totalOrder)
      } else if (filters.sortBy === "orders-desc") {
        result.sort((a, b) => b.totalOrder - a.totalOrder)
      }
    }

    // Limit results if "Choose First" is set
    if (filters.chooseFirst && parseInt(filters.chooseFirst) > 0) {
      result = result.slice(0, parseInt(filters.chooseFirst))
    }

    return result
  }, [customers, filters])

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
    setCurrentPage(1)
  }

  const formatDateTime = (value) => {
    if (!value) return "-"
    try {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return String(value)
      const day = String(d.getDate()).padStart(2, "0")
      const month = d.toLocaleString("en-GB", { month: "short" })
      const year = d.getFullYear()
      const time = d.toLocaleString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      return `${day} ${month} ${year}, ${time}`
    } catch {
      return String(value)
    }
  }

  // Fetch customers from API
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  useEffect(() => {
    let cancelled = false
    const fetchCustomers = async () => {
      try {
        setLoading(true)
        const params = {
          limit: pageSize,
          page: currentPage,
          ...(searchQuery && { search: searchQuery }),
          ...(filters.status && { status: filters.status }),
          ...(filters.joiningDate && { joiningDate: filters.joiningDate }),
          ...(filters.sortBy && { sortBy: filters.sortBy }),
          ...(filters.chooseFirst && { chooseFirst: filters.chooseFirst }),
        }

        const response = await adminAPI.getCustomers(params)
        const data = response?.data?.data || response?.data?.data || response?.data

        const list = Array.isArray(data?.customers)
          ? data.customers
          : Array.isArray(data?.users)
            ? data.users
            : Array.isArray(data)
              ? data
              : []
        if (!cancelled && Array.isArray(list)) {
          setCustomers(list)
          setTotalCustomers(data?.total || list.length)
        } else {
          if (!cancelled) {
            setCustomers([])
            setTotalCustomers(0)
          }
        }
      } catch (error) {
        debugError('Error fetching customers:', error)
        toast.error('Failed to load customers')
        if (!cancelled) {
          setCustomers([])
          setTotalCustomers(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const delay = searchQuery ? 250 : 0
    const t = setTimeout(fetchCustomers, delay)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [currentPage, pageSize, searchQuery, filters.status, filters.joiningDate, filters.sortBy, filters.chooseFirst])

  const [searchParams] = useSearchParams()
  const userIdFromUrl = searchParams.get("userId")

  useEffect(() => {
    if (userIdFromUrl && customers.length > 0) {
      const customer = customers.find(c => c.id === userIdFromUrl || c._id === userIdFromUrl)
      if (customer) {
        handleViewDetails(customer.id || customer.sl || customer._id)
      }
    }
  }, [userIdFromUrl, customers])

  const handleToggleStatus = async (customerId) => {
    try {
      // Find customer
      const customer = customers.find(c => (c._id || c.id) === customerId)
      if (!customer) return

      const newStatus = !customer.status

      // Optimistically update UI
      setCustomers(customers.map(c =>
        c.id === customerId ? { ...c, status: newStatus } : c
      ))

      // Call API to update user status
      await adminAPI.updateCustomerStatus(customerId, newStatus)
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`)
    } catch (error) {
      debugError('Error updating status:', error)
      toast.error('Failed to update status')
      // Revert optimistic update
      setCustomers(customers.map(c =>
        c.id === customerId ? { ...c, status: !c.status } : c
      ))
    }
  }

  const handleToggleCodStatus = async (customerId) => {
    try {
      const customer = customers.find(c => (c._id || c.id) === customerId)
      if (!customer) return

      const newCodStatus = !customer.isCodBlocked

      setCustomers(customers.map(c =>
        (c.id || c._id) === customerId ? { ...c, isCodBlocked: newCodStatus } : c
      ))

      await adminAPI.updateCustomerCodStatus(customerId, newCodStatus)
      toast.success(`User COD ${newCodStatus ? 'blocked' : 'unblocked'} successfully`)
    } catch (error) {
      debugError('Error updating COD status:', error)
      toast.error('Failed to update COD status')
      setCustomers(customers.map(c =>
        (c.id || c._id) === customerId ? { ...c, isCodBlocked: !c.isCodBlocked } : c
      ))
    }
  }

  const handleViewDetails = async (customerId) => {
    try {
      setLoadingDetails(true)
      setShowUserDetails(true)
      setSelectedCustomer(customerId)

      const response = await adminAPI.getCustomerById(customerId)
      const data = response?.data?.data || response?.data

      if (data?.user) {
        setUserDetails(data.user)
      } else {
        toast.error('Failed to load user details')
        setShowUserDetails(false)
      }
    } catch (error) {
      debugError('Error fetching user details:', error)
      toast.error('Failed to load user details')
      setShowUserDetails(false)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleExport = (format) => {
    if (filteredCustomers.length === 0) {
      toast.error("No customers to export")
      return
    }

    const filename = "customers"
    try {
      switch (format) {
        case "csv":
          exportCustomersToCSV(filteredCustomers, filename)
          toast.success("CSV export started")
          break
        case "excel":
          exportCustomersToExcel(filteredCustomers, filename)
          toast.success("Excel export started")
          break
        case "pdf":
          exportCustomersToPDF(filteredCustomers, filename)
          toast.success("PDF download started")
          break
        default:
          toast.error("Invalid export format")
          break
      }
    } catch (error) {
      debugError("Export error:", error)
      toast.error("Failed to export customers")
    }
  }

  const getInitials = (name) => {
    if (!name) return "NA"
    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "NA"
  }

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Filters Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Order date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.orderDate}
                  onChange={(e) => handleFilterChange("orderDate", e.target.value)}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Customer joining date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.joiningDate}
                  onChange={(e) => handleFilterChange("joiningDate", e.target.value)}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Customer status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
              >
                <option value="">Select Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Sort by
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
              >
                <option value="">Select Customer Sorting Order</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="orders-asc">Orders (Low to High)</option>
                <option value="orders-desc">Orders (High to Low)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Choose first
              </label>
              <input
                type="number"
                value={filters.chooseFirst}
                onChange={(e) => handleFilterChange("chooseFirst", e.target.value)}
                placeholder="Ex: 100"
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  // Filters are applied automatically via useMemo
                }}
                className="px-6 py-2.5 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
              >
                Apply filters
              </button>
              <button
                onClick={() => {
                  setFilters({
                    orderDate: "",
                    joiningDate: "",
                    status: "",
                    sortBy: "",
                    chooseFirst: "",
                  })
                }}
                className="px-6 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Reset filters
              </button>
            </div>
            <div className="text-sm text-neutral-600">
              {loading ? 'Loading...' : `Showing ${filteredCustomers.length} of ${totalCustomers} customers`}
            </div>
          </div>
        </div>

        {/* Customer List Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-medium text-neutral-900">Customer list</h2>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-700 flex items-center justify-center min-w-[2.5rem] h-7">
                {loading ? (
                  <span className="w-5 h-3 rounded bg-neutral-300/80 animate-pulse" />
                ) : (
                  totalCustomers
                )}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <input
                  type="text"
                  placeholder="Ex: Search by name"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 flex items-center gap-2 transition-colors">
                    <Download className="w-4 h-4" />
                    <span className="text-black font-medium">Export</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border border-neutral-200 rounded-lg shadow-sm z-50">
                  <DropdownMenuLabel>Export format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport("csv")} className="cursor-pointer">
                    <FileDown className="w-4 h-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("excel")} className="cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-3 py-4 text-left text-xs font-medium text-neutral-700">Sl</th>
                  <th className="px-3 py-4 text-left text-xs font-medium text-neutral-700">Name</th>
                  <th className="px-3 py-4 text-left text-xs font-medium text-neutral-700">Contact info</th>
                  <th className="px-3 py-4 text-left text-xs font-medium text-neutral-700">Total order</th>
                  <th className="px-3 py-4 text-left text-xs font-medium text-neutral-700">Total amount</th>
                  <th className="px-3 py-4 text-left text-xs font-medium text-neutral-700">Joining date</th>
                  <th className="px-3 py-4 text-left text-xs font-medium text-neutral-700">Active/Inactive</th>
                  {globalCodBlockedFeatureEnabled && (
                    <th className="px-3 py-4 text-left text-xs font-medium text-neutral-700">COD blocked</th>
                  )}
                  <th className="px-3 py-4 text-center text-xs font-medium text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan={globalCodBlockedFeatureEnabled ? 9 : 8} className="px-6 py-8 text-center">
                      <div className="text-sm text-neutral-500">Loading customers...</div>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={globalCodBlockedFeatureEnabled ? 9 : 8} className="px-6 py-8 text-center">
                      <div className="text-sm text-neutral-500">No customers found</div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer, index) => (
                    <tr key={customer.id || customer.sl} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-700">{(currentPage - 1) * pageSize + index + 1}</span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-colors border border-neutral-200"
                            style={{ background: 'linear-gradient(135deg, #E8EEF7 0%, #C5D3E5 100%)' }}
                            onClick={() => handleViewDetails(customer._id || customer.id || customer.sl)}
                          >
                            <img
                              src={customer.profileImage || "/assets/images/profile_avatar.webp"}
                              alt={customer.name}
                              className="w-full h-full object-cover"
                              style={{ mixBlendMode: 'multiply' }}
                              onError={(e) => {
                                e.currentTarget.src = "/assets/images/profile_avatar.webp"
                              }}
                            />
                          </div>
                          <span 
                            className="text-sm font-medium text-neutral-900 cursor-pointer hover:text-[#0a4d2b] transition-colors"
                            onClick={() => handleViewDetails(customer._id || customer.id || customer.sl)}
                          >
                            {customer.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-neutral-700">{customer.email || "NA"}</span>
                          <span className="text-xs text-neutral-500">{customer.phone}</span>
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className="text-sm text-neutral-700">{customer.totalOrder || 0}</span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-900">{"\u20B9"} {(customer.totalOrderAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className="text-sm text-neutral-700">{formatDateTime(customer.joiningDate)}</span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(customer.id || customer.sl)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${customer.status ? "bg-green-600" : "bg-neutral-300"
                            }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${customer.status ? "translate-x-6" : "translate-x-1"
                              }`}
                          />
                        </button>
                      </td>
                      {globalCodBlockedFeatureEnabled && (
                        <td className="px-3 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleCodStatus(customer.id || customer.sl || customer._id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${customer.isCodBlocked ? "bg-red-600" : "bg-neutral-300"
                              }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${customer.isCodBlocked ? "translate-x-6" : "translate-x-1"
                                }`}
                            />
                          </button>
                        </td>
                      )}
                      <td className="px-3 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleViewDetails(customer._id || customer.id || customer.sl)}
                          className="p-1.5 rounded text-[#0a4d2b] hover:bg-neutral-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalCustomers > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-100 bg-white px-4 py-4 sm:px-6 mt-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-500 font-medium">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const size = Number(e.target.value)
                    setPageSize(size)
                    localStorage.setItem('admin_customers_pageSize', size)
                    setCurrentPage(1)
                  }}
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
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(totalCustomers / pageSize)))}
                  disabled={currentPage >= Math.ceil(totalCustomers / pageSize)}
                  className="relative ml-3 inline-flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>

              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between w-full">
                <div className="pl-4">
                  <p className="text-sm text-neutral-600">
                    Showing <span className="font-medium text-neutral-900">{Math.min(totalCustomers, (currentPage - 1) * pageSize + 1)}</span> to{" "}
                    <span className="font-medium text-neutral-900">{Math.min(totalCustomers, currentPage * pageSize)}</span> of{" "}
                    <span className="font-medium text-neutral-900">{totalCustomers}</span> customers
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
                    {Array.from({ length: Math.ceil(totalCustomers / pageSize) }, (_, i) => i + 1)
                      .filter(page => page === 1 || page === Math.ceil(totalCustomers / pageSize) || (page >= currentPage - 2 && page <= currentPage + 2))
                      .map((page, index, arr) => {
                        const showEllipsisBefore = index > 0 && page - arr[index - 1] > 1;
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
                        );
                      })}
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(totalCustomers / pageSize)))}
                      disabled={currentPage >= Math.ceil(totalCustomers / pageSize)}
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
      </div>

      {/* User Details Modal */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto mx-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-neutral-200">
            <DialogTitle className="pr-12 text-xl font-medium text-neutral-900">User details</DialogTitle>
          </DialogHeader>

          {loadingDetails ? (
            <div className="px-6 py-8 text-center">
              <div className="text-sm text-neutral-500">Loading user details...</div>
            </div>
          ) : userDetails ? (
            <div className="space-y-4 px-6 py-5">
              {/* Profile Section */}
              <div className="bg-neutral-50 rounded-xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border border-neutral-200"
                    style={{ background: 'linear-gradient(135deg, #E8EEF7 0%, #C5D3E5 100%)' }}
                  >
                    <img
                      src={userDetails.profileImage || "/assets/images/profile_avatar.webp"}
                      alt={userDetails.name}
                      className="w-full h-full rounded-full object-cover"
                      style={{ mixBlendMode: 'multiply' }}
                      onError={(e) => { e.currentTarget.src = "/assets/images/profile_avatar.webp" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-medium text-neutral-900">{userDetails.name}</h3>
                      {userDetails.isActive ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="flex items-center gap-2 text-sm text-neutral-600 min-w-0">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{userDetails.email || "NA"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-600 min-w-0">
                        <Phone className="w-4 h-4" />
                        <span>{userDetails.phone}</span>
                        {userDetails.phoneVerified && (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <CalendarIcon className="w-4 h-4" />
                        <span>Joined: {formatDateTime(userDetails.joiningDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-neutral-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-[#0a4d2b]" />
                    <span className="text-xs font-medium text-neutral-700">Total orders</span>
                  </div>
                  <p className="text-xl font-medium text-[#0a4d2b]">{userDetails.totalOrders || 0}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <IndianRupee className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-neutral-700">Total spent</span>
                  </div>
                  <p className="text-xl font-medium text-green-600">
                    {"\u20B9"}{(userDetails.totalOrderAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarIcon className="w-4 h-4 text-[#0a4d2b]" />
                    <span className="text-xs font-medium text-neutral-700">Member since</span>
                  </div>
                  <p className="text-base font-medium text-[#0a4d2b]">{formatDateTime(userDetails.joiningDate)}</p>
                </div>
              </div>

              {/* Addresses Section */}
              {userDetails.addresses && userDetails.addresses.length > 0 && (
                <div>
                  <h4 className="text-base font-medium text-neutral-900 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Addresses
                  </h4>
                  <div className="space-y-2">
                    {userDetails.addresses.map((address, index) => (
                      <div key={index} className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-neutral-700">{address.label || 'Address'}</span>
                          {address.isDefault && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-[#0a4d2b]">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-600">
                          {address.street}
                          {address.additionalDetails && `, ${address.additionalDetails}`}
                          {address.city && `, ${address.city}`}
                          {address.state && `, ${address.state}`}
                          {address.zipCode && ` - ${address.zipCode}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Orders Section */}
              {userDetails.orders && userDetails.orders.length > 0 && (
                <div>
                  <h4 className="text-base font-medium text-neutral-900 mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Recent orders
                  </h4>
                  <div className="space-y-2">
                    {userDetails.orders.slice(0, 5).map((order, index) => (
                      <div key={index} className="bg-neutral-50 rounded-lg p-3 border border-neutral-200 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{order.orderId}</p>
                          <p className="text-xs text-neutral-600">{order.restaurantName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-neutral-900">{"\u20B9"}{(order.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="text-xs text-neutral-600 capitalize">{order.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {userDetails.gender && (
                  <div className="bg-neutral-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-neutral-700 mb-1">Gender</p>
                    <p className="text-sm text-neutral-600 capitalize">{userDetails.gender}</p>
                  </div>
                )}
                {userDetails.dateOfBirth && (
                  <div className="bg-neutral-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-neutral-700 mb-1">Date of birth</p>
                    <p className="text-sm text-neutral-600">
                      {new Date(userDetails.dateOfBirth).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="text-sm text-neutral-500">No user details available</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

