import { useState, useEffect } from "react"
import { Search, Download, ChevronDown, Filter, Briefcase, RefreshCw, Settings, ArrowUpDown, FileText, FileSpreadsheet, Code, Loader2, Star } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@food/components/ui/dialog"
import { exportReportsToCSV, exportReportsToExcel, exportReportsToPDF, exportReportsToJSON } from "@food/components/admin/reports/reportsExportUtils"
import { adminAPI } from "@food/api"
import { toast } from "sonner"
import AdminListPagination from "@food/components/admin/AdminListPagination"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


export default function RestaurantReport() {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem("admin_restaurant_report_pageSize")) || 20
    } catch {
      return 20
    }
  })
  const [totalItems, setTotalItems] = useState(0)
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filters, setFilters] = useState({
    zone: "All Zones",
    all: "All",
    type: "All types",
    time: "All Time",
  })
  const [zones, setZones] = useState([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Fetch zones for filter dropdown
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await adminAPI.getZones({ limit: 1000 })
        if (response?.data?.success && response.data.data?.zones) {
          setZones(response.data.data.zones)
        }
      } catch (error) {
        debugError("Error fetching zones:", error)
      }
    }
    fetchZones()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters, debouncedSearch])

  // Fetch restaurant report data
  useEffect(() => {
    const fetchRestaurantReport = async () => {
      try {
        setIsRefreshing(true)
        
        const params = {
          zone: filters.zone !== "All Zones" ? filters.zone : undefined,
          all: filters.all !== "All" ? filters.all : undefined,
          type: filters.type !== "All types" ? filters.type : undefined,
          time: filters.time !== "All Time" ? filters.time : undefined,
          search: debouncedSearch || undefined,
          page: currentPage,
          limit: pageSize,
        }

        const response = await adminAPI.getRestaurantReport(params)

        if (response?.data?.success && response.data.data) {
          setRestaurants(response.data.data.restaurants || [])
          setTotalItems(response.data.data.total ?? 0)
        } else {
          setRestaurants([])
          setTotalItems(0)
          if (response?.data?.message) {
            toast.error(response.data.message)
          }
        }
      } catch (error) {
        debugError("Error fetching restaurant report:", error)
        toast.error("Failed to fetch restaurant report")
        setRestaurants([])
        setTotalItems(0)
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    }

    fetchRestaurantReport()
  }, [filters, debouncedSearch, currentPage, pageSize])

  const handleReset = () => {
    setFilters({
      zone: "All Zones",
      all: "All",
      type: "All types",
      time: "All Time",
    })
    setSearchQuery("")
    setCurrentPage(1)
  }

  const handleExport = (format) => {
    if (restaurants.length === 0) {
      alert("No data to export")
      return
    }
    const headers = [
      { key: "sl", label: "SL" },
      { key: "restaurantName", label: "Restaurant Name" },
      { key: "totalFood", label: "Total Food" },
      { key: "totalOrder", label: "Total Order" },
      { key: "totalOrderAmount", label: "Total Order Amount" },
      { key: "totalDiscountGiven", label: "Total Discount Given" },
      { key: "totalAdminCommission", label: "Total Admin Commission" },
      { key: "totalVATTAX", label: "Total VAT/TAX" },
      { key: "averageRatings", label: "Average Ratings" },
    ]
    switch (format) {
      case "csv": exportReportsToCSV(restaurants, headers, "restaurant_report"); break
      case "excel": exportReportsToExcel(restaurants, headers, "restaurant_report"); break
      case "pdf": exportReportsToPDF(restaurants, headers, "restaurant_report", "Restaurant Report"); break
      case "json": exportReportsToJSON(restaurants, "restaurant_report"); break
    }
  }

  const handleFilterApply = () => {
    // Filters are already applied via useMemo
  }

  const activeFiltersCount = (filters.zone !== "All Zones" ? 1 : 0) + (filters.all !== "All" ? 1 : 0) + (filters.type !== "All types" ? 1 : 0) + (filters.time !== "All Time" ? 1 : 0)

  const renderStars = (rating, reviews) => {
    const numericRating = Number(rating || 0)
    const safeReviews = Number(reviews || 0)
    const fullStars = Math.floor(numericRating)
    const hasHalfStar = numericRating % 1 >= 0.5
    const emptyStars = Math.max(0, 5 - fullStars - (hasHalfStar ? 1 : 0))

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: fullStars }).map((_, index) => (
            <Star key={`full-${index}`} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          ))}
          {hasHalfStar && (
            <Star className="w-3.5 h-3.5 fill-amber-200 text-amber-400" />
          )}
          {Array.from({ length: emptyStars }).map((_, index) => (
            <Star key={`empty-${index}`} className="w-3.5 h-3.5 text-neutral-300" />
          ))}
        </div>
        <span className="text-sm text-neutral-700 whitespace-nowrap">
          {numericRating.toFixed(1)} ({safeReviews})
        </span>
      </div>
    )
  }

  if (loading && restaurants.length === 0) {
    return (
      <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#0a4d2b] animate-spin" />
          <p className="text-neutral-600">Loading restaurant report...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
              <Briefcase className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-medium text-neutral-900">Restaurant report</h1>
          </div>
        </div>

        {/* Search Data Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <h3 className="text-sm font-medium text-neutral-700 mb-4">Search data</h3>
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
              <div className="relative">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Zone
                </label>
                <select
                  value={filters.zone}
                  onChange={(e) => setFilters(prev => ({ ...prev, zone: e.target.value }))}
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-neutral-300 bg-white text-neutral-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                >
                  <option value="All Zones">All Zones</option>
                  {zones.map(zone => (
                    <option key={zone._id} value={zone.name}>{zone.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-neutral-500 pointer-events-none" />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  All
                </label>
                <select
                  value={filters.all}
                  onChange={(e) => setFilters(prev => ({ ...prev, all: e.target.value }))}
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-neutral-300 bg-white text-neutral-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                >
                  <option value="All">All</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-neutral-500 pointer-events-none" />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-neutral-300 bg-white text-neutral-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                >
                  <option value="All types">All types</option>
                  <option value="Commission">Commission</option>
                  <option value="Subscription">Subscription</option>
                </select>
                <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-neutral-500 pointer-events-none" />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Time
                </label>
                <select
                  value={filters.time}
                  onChange={(e) => setFilters(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-neutral-300 bg-white text-neutral-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                >
                  <option value="All Time">All Time</option>
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="This Year">This Year</option>
                </select>
                <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-neutral-500 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-end gap-3">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 text-sm font-medium rounded-lg bg-neutral-600 text-white hover:bg-neutral-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
              <button 
                onClick={handleFilterApply}
                className={`px-6 py-2.5 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-900 transition-colors flex items-center gap-2 relative ${
                  activeFiltersCount > 0 ? "ring-2 ring-[#0a4d2b]/30" : ""
                }`}
              >
                <Filter className="w-4 h-4" />
                Filter
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#0a4d2b] text-white rounded-full text-xs flex items-center justify-center font-medium">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Restaurant Report Table Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-medium text-neutral-900">Restaurant report table {totalItems}</h2>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <input
                  type="text"
                  placeholder="Ex: search restaurant nam"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-4 pr-10 py-2.5 w-full text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                {isRefreshing && (
                  <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 animate-spin" />
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 flex items-center gap-2 transition-colors">
                    <Download className="w-4 h-4" />
                    <span className="text-black font-medium">Export</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border border-neutral-200 rounded-lg shadow-sm z-50 animate-in fade-in-0 zoom-in-95 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
                  <DropdownMenuLabel>Export format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport("csv")} className="cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />
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
                  <DropdownMenuItem onClick={() => handleExport("json")} className="cursor-pointer">
                    <Code className="w-4 h-4 mr-2" />
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-1">
                      <span>SL</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-1">
                      <span>Restaurant name</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-1">
                      <span>Total food</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-1">
                      <span>Total order</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-1">
                      <span>Total order amount</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-1">
                      <span>Total discount given</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-1">
                      <span>Total admin commission</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-1">
                      <span>Total VAT/TAX</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-1">
                      <span>Average ratings</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-100">
                {restaurants.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-lg font-medium text-neutral-700 mb-1">No data found</p>
                        <p className="text-sm text-neutral-500">No restaurants match your search</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  restaurants.map((restaurant) => (
                    <tr key={restaurant.sl} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-700">{restaurant.sl}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center flex-shrink-0">
                            {restaurant.icon ? (
                              <img
                                src={restaurant.icon}
                                alt={restaurant.restaurantName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = "https://via.placeholder.com/32"
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-neutral-300 flex items-center justify-center text-xs text-neutral-600 font-medium">
                                {restaurant.restaurantName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-medium text-neutral-900">{restaurant.restaurantName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-neutral-700">{restaurant.totalFood}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-neutral-700">{restaurant.totalOrder}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-900">{restaurant.totalOrderAmount}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-neutral-700">{restaurant.totalDiscountGiven}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          restaurant.totalAdminCommission.startsWith('?-') || restaurant.totalAdminCommission.startsWith('-?')
                            ? 'text-red-600'
                            : 'text-neutral-900'
                        }`}>
                          {restaurant.totalAdminCommission}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-neutral-700">{restaurant.totalVATTAX}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStars(restaurant.averageRatings, restaurant.reviews)}
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
                localStorage.setItem("admin_restaurant_report_pageSize", String(size))
              } catch {}
              setCurrentPage(1)
            }}
            itemLabel="restaurants"
          />
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Report settings
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <p className="text-sm text-neutral-700">
              Restaurant report settings and preferences will be available here
            </p>
          </div>
          <div className="px-6 pb-6 flex items-center justify-end">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[#0a4d2b] text-white hover:bg-[#06381e] transition-colors shadow-sm"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
