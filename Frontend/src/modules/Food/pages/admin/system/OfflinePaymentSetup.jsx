import { useState, useMemo } from "react"
import { Briefcase, Search, Plus, Pencil, Trash2, Settings, Download, ChevronDown, FileText, FileSpreadsheet, Code, Check, Columns, ArrowUpDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@food/components/ui/dialog"
import { exportPaymentMethodsToCSV, exportPaymentMethodsToExcel, exportPaymentMethodsToPDF, exportPaymentMethodsToJSON } from "@food/components/admin/payment-methods/paymentMethodsExportUtils"

const paymentMethods = [
  {
    id: 1,
    name: "bkash",
    paymentInfo: "Account Number : 017**********",
    requiredInfo: "Name | Transaction Number",
    status: true
  }
]

function ToggleSwitch({ enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center w-11 h-6 rounded-full border transition-colors ${
        enabled
          ? "bg-neutral-900 border-[#0a4d2b] justify-end"
          : "bg-neutral-200 border-neutral-300 justify-start"
      }`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
    </button>
  )
}

export default function OfflinePaymentSetup() {
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [methods, setMethods] = useState(paymentMethods)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [visibleColumns, setVisibleColumns] = useState({
    sl: true,
    name: true,
    paymentInfo: true,
    requiredInfo: true,
    status: true,
    actions: true,
  })

  const filteredMethods = useMemo(() => {
    let filtered = methods.filter(method => {
      if (activeTab === "active") return method.status
      if (activeTab === "inactive") return !method.status
      return true
    })
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(method =>
        method.name.toLowerCase().includes(query) ||
        method.paymentInfo.toLowerCase().includes(query) ||
        method.requiredInfo.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }, [methods, activeTab, searchQuery])

  const handleStatusToggle = (id) => {
    setMethods(prev => prev.map(method => 
      method.id === id ? { ...method, status: !method.status } : method
    ))
  }

  const handleDelete = (id) => {
    const method = methods.find(m => m.id === id)
    setSelectedMethod(method)
    setIsDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (selectedMethod) {
      setMethods(prev => prev.filter(method => method.id !== selectedMethod.id))
      setIsDeleteOpen(false)
      setSelectedMethod(null)
    }
  }

  const handleExport = (format) => {
    if (filteredMethods.length === 0) {
      alert("No data to export")
      return
    }
    switch (format) {
      case "csv": exportPaymentMethodsToCSV(filteredMethods); break
      case "excel": exportPaymentMethodsToExcel(filteredMethods); break
      case "pdf": exportPaymentMethodsToPDF(filteredMethods); break
      case "json": exportPaymentMethodsToJSON(filteredMethods); break
    }
  }

  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({ ...prev, [columnKey]: !prev[columnKey] }))
  }

  const resetColumns = () => {
    setVisibleColumns({
      sl: true,
      name: true,
      paymentInfo: true,
      requiredInfo: true,
      status: true,
      actions: true,
    })
  }

  const columnsConfig = {
    sl: "Serial Number",
    name: "Payment Method Name",
    paymentInfo: "Payment Info",
    requiredInfo: "Required Info From Customer",
    status: "Status",
    actions: "Actions",
  }

  return (
    <div className="p-2 lg:p-3 bg-neutral-50 min-h-screen">
      <div className="w-full mx-auto max-w-7xl">
        {/* Page Title */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-lg font-medium text-neutral-900">Offline payment method setup</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-2 mb-3">
          <div className="flex gap-2">
            {["All", "Active", "Inactive"].map((tab) => (
              <button
                key={tab.toLowerCase()}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === tab.toLowerCase()
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Actions Section */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-3 mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1 min-w-[250px]">
              <input
                type="text"
                placeholder="Search by name, payment info"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-2 py-1.5 w-full text-xs rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
              />
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-4 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 flex items-center gap-1 transition-colors">
                  <Download className="w-3.5 h-3.5" />
                  <span className="font-medium">Export</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-neutral-200 rounded-lg shadow-sm z-50">
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
              className="p-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button className="px-4 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              <span>Add new method</span>
            </button>
          </div>
        </div>

        {/* Payment Methods Table */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-700">Payment methods</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                {filteredMethods.length}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  {visibleColumns.sl && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700">
                      <div className="flex items-center gap-2">
                        <span>SL</span>
                        <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                      </div>
                    </th>
                  )}
                  {visibleColumns.name && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700">
                      <div className="flex items-center gap-2">
                        <span>Payment method name</span>
                        <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                      </div>
                    </th>
                  )}
                  {visibleColumns.paymentInfo && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700">
                      <div className="flex items-center gap-2">
                        <span>Payment info</span>
                        <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                      </div>
                    </th>
                  )}
                  {visibleColumns.requiredInfo && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700">
                      <div className="flex items-center gap-2">
                        <span>Required info from customer</span>
                        <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                      </div>
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700">
                      <div className="flex items-center gap-2">
                        <span>Status</span>
                        <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                      </div>
                    </th>
                  )}
                  {visibleColumns.actions && (
                    <th className="px-3 py-2 text-center text-xs font-medium text-neutral-700">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-100">
                {filteredMethods.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(v => v).length} className="px-6 py-8 text-center">
                      <p className="text-xs text-neutral-500">No payment methods found</p>
                    </td>
                  </tr>
                ) : (
                  filteredMethods.map((method, index) => (
                    <tr key={method.id} className="hover:bg-neutral-50 transition-colors">
                      {visibleColumns.sl && (
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-neutral-700">{index + 1}</span>
                        </td>
                      )}
                      {visibleColumns.name && (
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-neutral-700">{method.name}</span>
                        </td>
                      )}
                      {visibleColumns.paymentInfo && (
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-neutral-700">{method.paymentInfo}</span>
                        </td>
                      )}
                      {visibleColumns.requiredInfo && (
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-neutral-700">{method.requiredInfo}</span>
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-3 py-2.5">
                          <ToggleSwitch
                            enabled={method.status}
                            onToggle={() => handleStatusToggle(method.id)}
                          />
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-3 py-2.5 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              className="p-1.5 text-[#0a4d2b] hover:bg-neutral-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(method.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Delete payment method</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <p className="text-xs text-neutral-700">
              Are you sure you want to delete "{selectedMethod?.name}"? This action cannot be undone.
            </p>
          </div>
          <div className="px-6 pb-6 flex items-center justify-end gap-3">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Table settings
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <h3 className="text-xs font-medium text-neutral-700 mb-3 flex items-center gap-2">
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
                    <span className="text-xs text-neutral-700">{label}</span>
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
                className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[#0a4d2b] text-white hover:bg-[#06381e] transition-colors shadow-sm"
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
