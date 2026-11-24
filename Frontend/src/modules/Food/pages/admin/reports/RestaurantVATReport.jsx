import { useState, useMemo } from "react"
import { Search, Download, ChevronDown, Filter, Calendar, ClipboardList, DollarSign, FileText, AlertCircle, Settings, FileSpreadsheet, Code } from "lucide-react"
import { emptyRestaurantVATReports, emptyRestaurantVATStats } from "@food/utils/adminFallbackData"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@food/components/ui/dialog"
import { exportReportsToCSV, exportReportsToExcel, exportReportsToPDF, exportReportsToJSON } from "@food/components/admin/reports/reportsExportUtils"

export default function RestaurantVATReport() {
  const [searchQuery, setSearchQuery] = useState("")
  const [reports, setReports] = useState(emptyRestaurantVATReports)
  const [filters, setFilters] = useState({
    dateRange: "",
    restaurant: "All Restaurants",
  })

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const filteredReports = useMemo(() => {
    let result = [...reports]
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(report =>
        report.restaurantName?.toLowerCase().includes(query)
      )
    }

    if (filters.restaurant !== "All Restaurants") {
      result = result.filter(r => r.restaurantName === filters.restaurant)
    }

    return result
  }, [reports, searchQuery, filters])

  const totalReports = filteredReports.length

  const handleExport = (format) => {
    if (filteredReports.length === 0) {
      alert("No data to export")
      return
    }
    const headers = [
      { key: "sl", label: "SI" },
      { key: "restaurantName", label: "Restaurant Info" },
      { key: "totalOrder", label: "Total Order" },
      { key: "totalOrderAmount", label: "Total Order Amount" },
      { key: "taxAmount", label: "Tax Amount" },
    ]
    switch (format) {
      case "csv": exportReportsToCSV(filteredReports, headers, "restaurant_vat_report"); break
      case "excel": exportReportsToExcel(filteredReports, headers, "restaurant_vat_report"); break
      case "pdf": exportReportsToPDF(filteredReports, headers, "restaurant_vat_report", "Restaurant VAT Report"); break
      case "json": exportReportsToJSON(filteredReports, "restaurant_vat_report"); break
    }
  }

  const handleFilterApply = () => {
    // Filters are already applied via useMemo
  }

  const handleResetFilters = () => {
    setFilters({
      dateRange: "",
      restaurant: "All Restaurants",
    })
  }

  const activeFiltersCount = (filters.dateRange ? 1 : 0) + (filters.restaurant !== "All Restaurants" ? 1 : 0)

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen overflow-x-hidden">
      <div className="w-full max-w-full">
        {/* Page Header */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <h1 className="text-2xl font-medium text-neutral-900">Restaurant tax report</h1>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex flex-wrap gap-4 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Date range
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    placeholder="11/27/2025 - 12/03/2025"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  />
                </div>
              </div>

              <div className="relative flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Select restaurant
                </label>
                <select
                  value={filters.restaurant}
                  onChange={(e) => setFilters(prev => ({ ...prev, restaurant: e.target.value }))}
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-neutral-300 bg-white text-neutral-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                >
                  <option value="All Restaurants">All Restaurants</option>
                  <option value="Café Monarch">Café Monarch</option>
                  <option value="Hungry Puppets">Hungry Puppets</option>
                  <option value="Cheesy Restaurant">Cheesy Restaurant</option>
                  <option value="Cheese Burger">Cheese Burger</option>
                  <option value="Frying Nemo">Frying Nemo</option>
                </select>
                <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-neutral-500 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <button 
                onClick={handleResetFilters}
                className="px-6 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Orders Card */}
          <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-900 mb-1">Total orders</p>
                <p className="text-xs text-neutral-600 mb-2">Total orders</p>
                <p className="text-3xl font-medium text-[#0a4d2b]">{emptyRestaurantVATStats.totalOrders}</p>
                <p className="text-lg font-medium text-[#0a4d2b] mt-1">{emptyRestaurantVATStats.totalOrders}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 bg-neutral-100 text-neutral-500">
                <ClipboardList className="w-7 h-7" />
              </div>
            </div>
          </div>

          {/* Total Order Amount Card */}
          <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-900 mb-1">Total order amount</p>
                <p className="text-xs text-neutral-600 mb-2">Total order amount</p>
                <p className="text-3xl font-medium text-green-600">{emptyRestaurantVATStats.totalOrderAmount}</p>
                <p className="text-lg font-medium text-green-600 mt-1">{emptyRestaurantVATStats.totalOrderAmount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-neutral-100 text-neutral-500">
                <DollarSign className="w-7 h-7" />
              </div>
            </div>
          </div>

          {/* Total Tax Amount Card */}
          <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-900 mb-1">Total tax amount</p>
                <p className="text-xs text-neutral-600 mb-2">Total tax amount</p>
                <p className="text-3xl font-medium text-red-600">{emptyRestaurantVATStats.totalTaxAmount}</p>
                <p className="text-lg font-medium text-red-600 mt-1">{emptyRestaurantVATStats.totalTaxAmount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 bg-neutral-100 text-neutral-500">
                <FileText className="w-7 h-7" />
              </div>
            </div>
          </div>
        </div>

        {/* All Restaurant Taxes Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-medium text-neutral-900">All restaurant taxes</h2>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <input
                  type="text"
                  placeholder="Ex: Name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-4 pr-10 py-2.5 w-full text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
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

          {/* Table or Empty State */}
          {filteredReports.length === 0 ? (
            <div className="py-20 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-lg bg-neutral-200 flex items-center justify-center mb-4">
                  <AlertCircle className="w-12 h-12 text-neutral-500" />
                </div>
                <p className="text-lg font-medium text-neutral-700 mb-2">No data found</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">
                      SI
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">
                      Restaurant info
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">
                      Total order
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">
                      Total order amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">
                      Tax amount
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-neutral-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-100">
                  {filteredReports.map((report) => (
                    <tr key={report.sl} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-700">{report.sl}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {report.icon && (
                            <img src={report.icon} alt={report.restaurantName} className="w-8 h-8 rounded" />
                          )}
                          <span className="text-sm text-neutral-700">{report.restaurantName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-900">{report.totalOrder}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-900">{report.totalOrderAmount}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-900">{report.taxAmount}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button className="text-[#0a4d2b] hover:text-neutral-900 text-sm font-medium">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
              Restaurant VAT report settings and preferences will be available here
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
