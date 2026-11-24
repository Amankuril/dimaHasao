import { useState, useMemo } from "react"
import { Search, Download, ChevronDown, Settings, Camera, FileText, ArrowUpDown, Eye, FileSpreadsheet, Code, Check, Columns } from "lucide-react"
import { emptyDeliveryManPayments } from "@food/utils/adminFallbackData"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@food/components/ui/dialog"
import { exportTransactionsToCSV, exportTransactionsToExcel, exportTransactionsToPDF, exportTransactionsToJSON } from "@food/components/admin/transactions/transactionsExportUtils"

export default function DeliveryManPayments() {
  const [formData, setFormData] = useState({
    deliveryman: "",
    amount: "",
    method: "",
    reference: "",
  })
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [payments, setPayments] = useState(emptyDeliveryManPayments)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    name: true,
    receivedAt: true,
    amount: true,
    method: true,
    reference: true,
    actions: true,
  })

  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) {
      return payments
    }
    
    const query = searchQuery.toLowerCase().trim()
    return payments.filter(payment =>
      payment.name?.toLowerCase().includes(query) ||
      payment.reference?.toLowerCase().includes(query) ||
      payment.method?.toLowerCase().includes(query)
    )
  }, [payments, searchQuery])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.deliveryman) errors.deliveryman = "Deliveryman is required."
    if (!formData.amount || parseFloat(formData.amount) <= 0) errors.amount = "Amount is required and must be greater than 0."
    if (!formData.method) errors.method = "Payment method is required."
    return errors
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)
    // Simulate API call
    setTimeout(() => {
      const newPayment = {
        sl: payments.length + 1,
        name: formData.deliveryman === "leslie-alexander" ? "Leslie Alexander" :
              formData.deliveryman === "jane-doe" ? "Jane Doe" :
              formData.deliveryman === "jhon-doe" ? "Jhon Doe" :
              formData.deliveryman === "jerome-bell" ? "Jerome Bell" :
              formData.deliveryman === "kathryn-murphy" ? "Kathryn Murphy" : "Robert Fox",
        receivedAt: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }),
        amount: parseFloat(formData.amount),
        method: formData.method,
        reference: formData.reference || "N/A",
      }
      setPayments([newPayment, ...payments])
      setIsSubmitting(false)
      setShowSuccessDialog(true)
      handleReset()
    }, 500)
  }

  const handleReset = () => {
    setFormData({
      deliveryman: "",
      amount: "",
      method: "",
      reference: "",
    })
    setFormErrors({})
  }

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment)
    setIsViewOpen(true)
  }

  const handleExport = (format) => {
    if (filteredPayments.length === 0) {
      alert("No data to export.")
      return
    }
    const headers = [
      { key: "sl", label: "SI" },
      { key: "name", label: "Name" },
      { key: "receivedAt", label: "Received At" },
      { key: "amount", label: "Amount" },
      { key: "method", label: "Method" },
      { key: "reference", label: "Reference" },
    ]
    switch (format) {
      case "csv": exportTransactionsToCSV(filteredPayments, headers, "delivery_man_payments"); break
      case "excel": exportTransactionsToExcel(filteredPayments, headers, "delivery_man_payments"); break
      case "pdf": exportTransactionsToPDF(filteredPayments, headers, "delivery_man_payments", "Delivery Man Payments Report"); break
      case "json": exportTransactionsToJSON(filteredPayments, "delivery_man_payments"); break
      default: break
    }
  }

  const toggleColumn = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      name: true,
      receivedAt: true,
      amount: true,
      method: true,
      reference: true,
      actions: true,
    })
  }

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Provide Delivery Man Earning Form */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Camera className="w-5 h-5 text-[#0a4d2b]" />
            <h1 className="text-2xl font-medium text-neutral-900">Provide delivery man earning</h1>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Deliveryman <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.deliveryman}
                  onChange={(e) => handleInputChange("deliveryman", e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-[#0a4d2b] text-sm ${
                    formErrors.deliveryman ? "border-red-500" : "border-neutral-300"
                  }`}
                >
                  <option value="">Select Deliveryman</option>
                  <option value="leslie-alexander">Leslie Alexander</option>
                  <option value="jane-doe">Jane Doe</option>
                  <option value="jhon-doe">Jhon Doe</option>
                  <option value="jerome-bell">Jerome Bell</option>
                  <option value="kathryn-murphy">Kathryn Murphy</option>
                  <option value="robert-fox">Robert Fox</option>
                </select>
                {formErrors.deliveryman && <p className="text-red-500 text-xs mt-1">{formErrors.deliveryman}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder="Ex: 100"
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-[#0a4d2b] text-sm ${
                    formErrors.amount ? "border-red-500" : "border-neutral-300"
                  }`}
                />
                {formErrors.amount && <p className="text-red-500 text-xs mt-1">{formErrors.amount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Method <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.method}
                  onChange={(e) => handleInputChange("method", e.target.value)}
                  placeholder="Ex: Cash"
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-[#0a4d2b] text-sm ${
                    formErrors.method ? "border-red-500" : "border-neutral-300"
                  }`}
                />
                {formErrors.method && <p className="text-red-500 text-xs mt-1">{formErrors.method}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Reference
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => handleInputChange("reference", e.target.value)}
                  placeholder="Ex: Collect cash"
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>

        {/* Distribute DM Earning Table */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#0a4d2b]" />
              <h2 className="text-xl font-medium text-neutral-900">Distribute DM earning table</h2>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-700">
                {filteredPayments.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <input
                  type="text"
                  placeholder="Ex: Search here by name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 flex items-center gap-2 transition-colors">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border border-neutral-200 rounded-lg shadow-sm z-50">
                  <DropdownMenuLabel>Export format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport("csv")} className="cursor-pointer flex items-center gap-2">
                    <FileText className="w-4 h-4" /> CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("excel")} className="cursor-pointer flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" /> Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer flex items-center gap-2">
                    <Code className="w-4 h-4" /> PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("json")} className="cursor-pointer flex items-center gap-2">
                    <Code className="w-4 h-4" /> Json
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 transition-colors flex items-center justify-center"
                title="Table Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  {visibleColumns.si && <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-2">
                      <span>SI</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                    </div>
                  </th>}
                  {visibleColumns.name && <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Name</th>}
                  {visibleColumns.receivedAt && <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Received at</th>}
                  {visibleColumns.amount && <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Amount</th>}
                  {visibleColumns.method && <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Method</th>}
                  {visibleColumns.reference && <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Reference</th>}
                  {visibleColumns.actions && <th className="px-6 py-4 text-center text-xs font-medium text-neutral-700">Action</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Camera className="w-16 h-16 text-neutral-400 mb-4" />
                        <p className="text-lg font-medium text-neutral-700">No data found</p>
                        <p className="text-sm text-neutral-500">No payments match your search</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.sl} className="hover:bg-neutral-50 transition-colors">
                      {visibleColumns.si && <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-700">{payment.sl}</span>
                      </td>}
                      {visibleColumns.name && <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#0a4d2b] font-medium cursor-pointer hover:underline">
                          {payment.name}
                        </span>
                      </td>}
                      {visibleColumns.receivedAt && <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-700">{payment.receivedAt}</span>
                      </td>}
                      {visibleColumns.amount && <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-700">
                          $ {payment.amount.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>}
                      {visibleColumns.method && <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-700">{payment.method}</span>
                      </td>}
                      {visibleColumns.reference && <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-700">{payment.reference}</span>
                      </td>}
                      {visibleColumns.actions && <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleViewPayment(payment)}
                          className="p-2 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors"
                        >
                          <Eye className="w-4 h-4 text-orange-600" />
                        </button>
                      </td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="max-w-sm bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                Success
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6">
              <p className="text-sm text-neutral-700">Earning provided successfully</p>
            </div>
            <DialogFooter className="px-6 pb-6">
              <button
                onClick={() => setShowSuccessDialog(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#0a4d2b] text-white hover:bg-[#06381e] transition-colors shadow-sm"
              >
                OK
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Payment Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-md bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Payment details</DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-neutral-500">Name</label>
                  <p className="text-sm font-medium text-neutral-900 mt-1">{selectedPayment.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Received at</label>
                  <p className="text-sm font-medium text-neutral-900 mt-1">{selectedPayment.receivedAt}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Amount</label>
                  <p className="text-sm font-medium text-neutral-900 mt-1">
                    $ {selectedPayment.amount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Method</label>
                  <p className="text-sm font-medium text-neutral-900 mt-1">{selectedPayment.method}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Reference</label>
                  <p className="text-sm font-medium text-neutral-900 mt-1">{selectedPayment.reference}</p>
                </div>
              </div>
            )}
            <DialogFooter className="px-6 pb-6">
              <button
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-sm"
              >
                Close
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                <h3 className="text-sm font-medium text-neutral-700 mb-2">Toggle columns</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(visibleColumns).map(([key, isVisible]) => (
                    <div key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`toggle-${key}`}
                        checked={isVisible}
                        onChange={() => toggleColumn(key)}
                        className="w-4 h-4 text-[#0a4d2b] border-neutral-300 rounded focus:ring-[#0a4d2b]/30"
                      />
                      <label htmlFor={`toggle-${key}`} className="ml-2 text-sm text-neutral-700 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="px-6 pb-6 flex justify-between">
              <button
                onClick={resetColumns}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Reset columns
              </button>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#0a4d2b] text-white hover:bg-[#06381e] transition-colors shadow-sm"
              >
                Apply
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
