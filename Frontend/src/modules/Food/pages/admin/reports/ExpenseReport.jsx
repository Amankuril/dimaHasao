import { useState, useMemo } from "react"
import { Search, Download, ChevronDown, Filter, FileText, ArrowUpDown, Settings, FileSpreadsheet, Code } from "lucide-react"
import { emptyExpenseReports } from "@food/utils/adminFallbackData"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@food/components/ui/dialog"
import { exportReportsToCSV, exportReportsToExcel, exportReportsToPDF, exportReportsToJSON } from "@food/components/admin/reports/reportsExportUtils"

export default function ExpenseReport() {
  const [searchQuery, setSearchQuery] = useState("")
  const [expenses, setExpenses] = useState(emptyExpenseReports)
  const [filters, setFilters] = useState({
    zone: "All Zones",
    restaurant: "All restaurants",
    customer: "All customers",
    type: "All Type",
    time: "All Time",
  })

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const filteredExpenses = useMemo(() => {
    let result = [...expenses]
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(expense =>
        expense.orderId.toLowerCase().includes(query) ||
        expense.expenseType.toLowerCase().includes(query) ||
        expense.customerName.toLowerCase().includes(query)
      )
    }

    if (filters.zone !== "All Zones") {
      // Filter by zone if needed
    }

    if (filters.restaurant !== "All restaurants") {
      // Filter by restaurant if needed
    }

    if (filters.customer !== "All customers") {
      result = result.filter(e => e.customerName === filters.customer)
    }

    if (filters.type !== "All Type") {
      result = result.filter(e => e.expenseType === filters.type)
    }

    return result
  }, [expenses, searchQuery, filters])

  const totalExpenses = filteredExpenses.length

  const handleExport = (format) => {
    if (filteredExpenses.length === 0) {
      alert("No data to export")
      return
    }
    const headers = [
      { key: "sl", label: "SI" },
      { key: "orderId", label: "Order ID" },
      { key: "dateTime", label: "Date & Time" },
      { key: "expenseType", label: "Expense Type" },
      { key: "customerName", label: "Customer Name" },
      { key: "expenseAmount", label: "Expense Amount" },
    ]
    switch (format) {
      case "csv": exportReportsToCSV(filteredExpenses, headers, "expense_report"); break
      case "excel": exportReportsToExcel(filteredExpenses, headers, "expense_report"); break
      case "pdf": exportReportsToPDF(filteredExpenses, headers, "expense_report", "Expense Report"); break
      case "json": exportReportsToJSON(filteredExpenses, "expense_report"); break
    }
  }

  const handleFilterApply = () => {
    // Filters are already applied via useMemo
  }

  const handleResetFilters = () => {
    setFilters({
      zone: "All Zones",
      restaurant: "All restaurants",
      customer: "All customers",
      type: "All Type",
      time: "All Time",
    })
  }

  const activeFiltersCount = (filters.zone !== "All Zones" ? 1 : 0) + (filters.restaurant !== "All restaurants" ? 1 : 0) + (filters.customer !== "All customers" ? 1 : 0) + (filters.type !== "All Type" ? 1 : 0) + (filters.time !== "All Time" ? 1 : 0)

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-medium text-neutral-900">Expense report</h1>
              <p className="text-sm text-neutral-500 mt-1">Expense report description</p>
            </div>
          </div>
        </div>

        {/* Search Data Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
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
                  <option value="Zone 1">Zone 1</option>
                  <option value="Zone 2">Zone 2</option>
                  <option value="Zone 3">Zone 3</option>
                </select>
                <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-neutral-500 pointer-events-none" />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Restaurant
                </label>
                <select
                  value={filters.restaurant}
                  onChange={(e) => setFilters(prev => ({ ...prev, restaurant: e.target.value }))}
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-neutral-300 bg-white text-neutral-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                >
                  <option value="All restaurants">All restaurants</option>
                  <option value="Restaurant 1">Restaurant 1</option>
                  <option value="Restaurant 2">Restaurant 2</option>
                </select>
                <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-neutral-500 pointer-events-none" />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Customer
                </label>
                <select
                  value={filters.customer}
                  onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-neutral-300 bg-white text-neutral-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                >
                  <option value="All customers">All customers</option>
                  <option value="Customer 1">Customer 1</option>
                  <option value="Customer 2">Customer 2</option>
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
                  <option value="All Type">All Type</option>
                  <option value="Discount On Product">Discount On Product</option>
                  <option value="Cashback">Cashback</option>
                  <option value="Free Delivery">Free Delivery</option>
                  <option value="Add Fund Bonus">Add Fund Bonus</option>
                </select>
                <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-neutral-500 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Time
                </label>
                <select
                  value={filters.time}
                  onChange={(e) => setFilters(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full sm:w-48 px-4 py-2.5 pr-8 text-sm rounded-lg border border-neutral-300 bg-white text-neutral-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                >
                  <option value="All Time">All Time</option>
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="This Year">This Year</option>
                </select>
                <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-neutral-500 pointer-events-none" />
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
        </div>

        {/* Expense Lists Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-medium text-neutral-900">Expense lists {totalExpenses}</h2>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <input
                  type="text"
                  placeholder="Search by order ID or type"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-1">
                      <span>SI</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-1">
                      <span>Order id</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-1">
                      <span>Date & time</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-1">
                      <span>Expense type</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-1">
                      <span>Customer name</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-1">
                      <span>Expense amount</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-lg font-medium text-neutral-700 mb-1">No data found</p>
                        <p className="text-sm text-neutral-500">No expenses match your search</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.sl} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-700">{expense.sl}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a
                          href={`#order-${expense.orderId}`}
                          className="text-sm font-medium text-[#0a4d2b] hover:text-neutral-900 hover:underline"
                        >
                          {expense.orderId}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-neutral-700">{expense.dateTime}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-neutral-700">{expense.expenseType}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-neutral-900">{expense.customerName}</span>
                          <span className="text-xs text-neutral-500">{expense.customerPhone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-900">{expense.expenseAmount}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
              Expense report settings and preferences will be available here
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
