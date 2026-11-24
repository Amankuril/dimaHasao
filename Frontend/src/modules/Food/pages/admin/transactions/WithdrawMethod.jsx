import { useState, useMemo } from "react"
import { Search, Plus, Eye, Edit, Settings, ArrowUpDown, Check, Columns } from "lucide-react"
import { emptyWithdrawMethods } from "@food/utils/adminFallbackData"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@food/components/ui/dialog"

export default function WithdrawMethod() {
  const [searchQuery, setSearchQuery] = useState("")
  const [methods, setMethods] = useState(emptyWithdrawMethods)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    paymentMethodName: true,
    methodFields: true,
    activeStatus: true,
    defaultMethod: true,
    actions: true,
  })

  const filteredMethods = useMemo(() => {
    if (!searchQuery.trim()) {
      return methods
    }
    
    const query = searchQuery.toLowerCase().trim()
    return methods.filter(method =>
      method.paymentMethodName?.toLowerCase().includes(query)
    )
  }, [methods, searchQuery])

  const handleToggleActive = (index) => {
    const updated = [...methods]
    updated[index].activeStatus = !updated[index].activeStatus
    setMethods(updated)
  }

  const handleToggleDefault = (index) => {
    const updated = [...methods]
    // Only one can be default, so set all to false first
    updated.forEach(m => m.defaultMethod = false)
    updated[index].defaultMethod = !updated[index].defaultMethod
    setMethods(updated)
  }

  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({ ...prev, [columnKey]: !prev[columnKey] }))
  }

  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      paymentMethodName: true,
      methodFields: true,
      activeStatus: true,
      defaultMethod: true,
      actions: true,
    })
  }

  const columnsConfig = {
    si: "Serial Number",
    paymentMethodName: "Payment Method Name",
    methodFields: "Method Fields",
    activeStatus: "Active Status",
    defaultMethod: "Default Method",
    actions: "Actions",
  }

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-medium text-neutral-900">Withdraw method list</h1>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-700">
                {filteredMethods.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <input
                  type="text"
                  placeholder="Search method name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              </div>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button className="px-4 py-2.5 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-sm">
                <Plus className="w-4 h-4" />
                Add method
              </button>
            </div>
          </div>
        </div>

        {/* Methods Table */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  {visibleColumns.si && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                      <div className="flex items-center gap-2">
                        <span>SI</span>
                        <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                      </div>
                    </th>
                  )}
                  {visibleColumns.paymentMethodName && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                      <div className="flex items-center gap-2">
                        <span>Payment method name</span>
                        <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                      </div>
                    </th>
                  )}
                  {visibleColumns.methodFields && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                      <div className="flex items-center gap-2">
                        <span>Method fields</span>
                        <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                      </div>
                    </th>
                  )}
                  {visibleColumns.activeStatus && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                      <div className="flex items-center gap-2">
                        <span>Active status</span>
                        <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                      </div>
                    </th>
                  )}
                  {visibleColumns.defaultMethod && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                      <div className="flex items-center gap-2">
                        <span>Default method</span>
                        <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                      </div>
                    </th>
                  )}
                  {visibleColumns.actions && (
                    <th className="px-6 py-4 text-center text-xs font-medium text-neutral-700">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-100">
                {filteredMethods.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(v => v).length} className="px-6 py-8 text-center text-neutral-500">
                      No methods found
                    </td>
                  </tr>
                ) : (
                  filteredMethods.map((method, index) => (
                    <tr key={method.sl} className="hover:bg-neutral-50 transition-colors">
                      {visibleColumns.si && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-neutral-700">{method.sl}</span>
                        </td>
                      )}
                      {visibleColumns.paymentMethodName && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-neutral-700">{method.paymentMethodName}</span>
                        </td>
                      )}
                      {visibleColumns.methodFields && (
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            {method.methodFields.map((field, fieldIndex) => (
                              <div key={fieldIndex} className="flex items-start gap-2">
                                <span className="text-sm text-neutral-700">
                                  Name: <span className="font-medium">{field.name}</span> Type: <span className="font-medium">{field.type}</span> Placeholder: <span className="font-medium">{field.placeholder}</span>
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  field.required
                                    ? "bg-red-100 text-red-700"
                                    : "bg-neutral-100 text-[#0a4d2b]"
                                }`}>
                                  {field.required ? "Required" : "Optional"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      )}
                      {visibleColumns.activeStatus && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(index)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              method.activeStatus ? "bg-green-600" : "bg-neutral-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                method.activeStatus ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </td>
                      )}
                      {visibleColumns.defaultMethod && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleDefault(index)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              method.defaultMethod ? "bg-neutral-900" : "bg-neutral-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                method.defaultMethod ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button className="p-1.5 rounded text-[#0a4d2b] hover:bg-neutral-50 transition-colors" title="View">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 rounded text-[#0a4d2b] hover:bg-neutral-50 transition-colors" title="Edit">
                              <Edit className="w-4 h-4" />
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

