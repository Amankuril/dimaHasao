import { useState, useMemo } from "react"
import { Search, Download, ChevronDown, Filter, Calendar, Settings, TrendingUp, Wallet, Utensils, FileText, FileSpreadsheet, Code, Check, Columns } from "lucide-react"
import { emptyLoyaltyPointTransactions } from "@food/utils/adminFallbackData"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@food/components/ui/dialog"
import { exportLoyaltyPointsToCSV, exportLoyaltyPointsToExcel, exportLoyaltyPointsToPDF, exportLoyaltyPointsToJSON } from "@food/components/admin/loyalty-point/loyaltyPointExportUtils"

export default function Report() {
  const [searchQuery, setSearchQuery] = useState("")
  const [transactions, setTransactions] = useState(emptyLoyaltyPointTransactions)
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    customer: "All",
  })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    transactionId: true,
    customer: true,
    credit: true,
    debit: true,
    balance: true,
    transactionType: true,
    reference: true,
    createdAt: true,
  })

  const filteredTransactions = useMemo(() => {
    let result = [...transactions]
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(transaction =>
        transaction.transactionId.toLowerCase().includes(query) ||
        transaction.customer.toLowerCase().includes(query) ||
        transaction.reference.includes(query)
      )
    }

    // Apply date filters
    if (filters.startDate) {
      result = result.filter(transaction => {
        const transactionDate = new Date(transaction.createdAt)
        const startDate = new Date(filters.startDate)
        return transactionDate >= startDate
      })
    }

    if (filters.endDate) {
      result = result.filter(transaction => {
        const transactionDate = new Date(transaction.createdAt)
        const endDate = new Date(filters.endDate)
        endDate.setHours(23, 59, 59, 999) // Include the entire end date
        return transactionDate <= endDate
      })
    }

    // Apply customer filter
    if (filters.customer && filters.customer !== "All") {
      result = result.filter(transaction =>
        transaction.customer.toLowerCase().includes(filters.customer.toLowerCase())
      )
    }

    return result
  }, [transactions, searchQuery, filters])

  const totalDebit = filteredTransactions.reduce((sum, t) => sum + t.debit, 0)
  const totalCredit = filteredTransactions.reduce((sum, t) => sum + t.credit, 0)
  const balance = totalCredit - totalDebit

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleResetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      customer: "All",
    })
  }

  const handleExport = (format) => {
    if (filteredTransactions.length === 0) {
      alert("No data to export")
      return
    }

    switch (format) {
      case "csv":
        exportLoyaltyPointsToCSV(filteredTransactions)
        break
      case "excel":
        exportLoyaltyPointsToExcel(filteredTransactions)
        break
      case "pdf":
        exportLoyaltyPointsToPDF(filteredTransactions)
        break
      case "json":
        exportLoyaltyPointsToJSON(filteredTransactions)
        break
      default:
        break
    }
  }

  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }))
  }

  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      transactionId: true,
      customer: true,
      credit: true,
      debit: true,
      balance: true,
      transactionType: true,
      reference: true,
      createdAt: true,
    })
  }

  const columnsConfig = {
    si: "Serial Number",
    transactionId: "Transaction ID",
    customer: "Customer",
    credit: "Credit",
    debit: "Debit",
    balance: "Balance",
    transactionType: "Transaction Type",
    reference: "Reference",
    createdAt: "Created At",
  }

  const activeFiltersCount = (filters.startDate ? 1 : 0) + (filters.endDate ? 1 : 0) + (filters.customer !== "All" ? 1 : 0)

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-medium text-neutral-900 mb-6">Customer loyalty point report</h1>

        {/* Filter Options */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-neutral-600" />
            <h2 className="text-lg font-medium text-neutral-900">Filter options</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Start date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                End date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Select customer
              </label>
              <select
                value={filters.customer}
                onChange={(e) => handleFilterChange("customer", e.target.value)}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
              >
                <option value="All">All</option>
                <option value="jane-doe">Jane Doe</option>
                <option value="john-doe">John Doe</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button 
                onClick={handleResetFilters}
                className="px-6 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Reset
              </button>
              <button 
                onClick={() => {}} 
                className={`px-6 py-2.5 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-900 transition-colors flex items-center gap-2 relative ${activeFiltersCount > 0 ? "ring-2 ring-[#0a4d2b]/30" : ""}`}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="rounded-xl shadow-sm border border-green-200 p-6 bg-green-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-green-800">Debit</h3>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-medium text-green-900">{totalDebit.toFixed(3)}</p>
          </div>

          <div className="rounded-xl shadow-sm border border-red-200 p-6 bg-red-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-red-800">Credit</h3>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-medium text-red-900">{totalCredit.toFixed(3)}</p>
          </div>

          <div className="rounded-xl shadow-sm border border-neutral-200 p-6 bg-neutral-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-neutral-900">Balance</h3>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
                <Utensils className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-medium text-neutral-900">{balance}</p>
          </div>
        </div>

        {/* Transactions Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-neutral-600" />
            <h2 className="text-lg font-medium text-neutral-900">Transactions</h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="relative flex-1 sm:flex-initial min-w-[250px]">
              <input
                type="text"
                placeholder="Ex: Search by transactionl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            </div>

            <div className="flex items-center gap-2">
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
                  {visibleColumns.si && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">SI</th>
                  )}
                  {visibleColumns.transactionId && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Transaction id</th>
                  )}
                  {visibleColumns.customer && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Customer</th>
                  )}
                  {visibleColumns.credit && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Credit</th>
                  )}
                  {visibleColumns.debit && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Debit</th>
                  )}
                  {visibleColumns.balance && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Balance</th>
                  )}
                  {visibleColumns.transactionType && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Transaction type</th>
                  )}
                  {visibleColumns.reference && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Reference</th>
                  )}
                  {visibleColumns.createdAt && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Created at</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(v => v).length} className="px-6 py-8 text-center text-neutral-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction.sl} className="hover:bg-neutral-50 transition-colors">
                      {visibleColumns.si && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-neutral-700">{transaction.sl}</span>
                        </td>
                      )}
                      {visibleColumns.transactionId && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-neutral-700">{transaction.transactionId}</span>
                        </td>
                      )}
                      {visibleColumns.customer && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-neutral-900">{transaction.customer}</span>
                        </td>
                      )}
                      {visibleColumns.credit && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-neutral-700">{transaction.credit}</span>
                        </td>
                      )}
                      {visibleColumns.debit && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-neutral-700">{transaction.debit}</span>
                        </td>
                      )}
                      {visibleColumns.balance && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-neutral-900">{transaction.balance}</span>
                        </td>
                      )}
                      {visibleColumns.transactionType && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-neutral-700">{transaction.transactionType}</span>
                        </td>
                      )}
                      {visibleColumns.reference && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-neutral-700">{transaction.reference}</span>
                        </td>
                      )}
                      {visibleColumns.createdAt && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-neutral-700">{transaction.createdAt}</span>
                        </td>
                      )}
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
              Table settings
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
                <Columns className="w-4 h-4" />
                Visible columns
              </h3>
              <div className="space-y-2">
                {Object.entries(columnsConfig).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={() => toggleColumn(key)}
                      className="w-4 h-4 text-emerald-600 border-neutral-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-neutral-700">{label}</span>
                    {visibleColumns[key] && (
                      <Check className="w-4 h-4 text-emerald-600 ml-auto" />
                    )}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
              <button
                onClick={resetColumns}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#0a4d2b] text-white hover:bg-[#06381e] transition-colors shadow-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
