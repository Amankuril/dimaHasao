import { X } from "lucide-react"

export default function ZoneFilterPanel({ isOpen, onClose, filters, setFilters, onApply, onReset }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-neutral-900/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-medium text-neutral-900">Filter zones</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-600" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {["All", "Active", "Inactive"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilters(prev => ({ ...prev, status: status === "All" ? "" : status }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.status === status || (status === "All" && !filters.status)
                      ? "bg-[#0a4d2b] text-white shadow-sm"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Default Status Filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Default status
            </label>
            <div className="flex flex-wrap gap-2">
              {["All", "Default", "Not Default"].map((defaultStatus) => (
                <button
                  key={defaultStatus}
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    isDefault: defaultStatus === "All" ? "" : defaultStatus === "Default" ? "yes" : "no"
                  }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    (filters.isDefault === (defaultStatus === "Default" ? "yes" : defaultStatus === "Not Default" ? "no" : "")) || 
                    (defaultStatus === "All" && !filters.isDefault)
                      ? "bg-[#0a4d2b] text-white shadow-sm"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  }`}
                >
                  {defaultStatus}
                </button>
              ))}
            </div>
          </div>

          {/* Restaurants Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Min restaurants
              </label>
              <input
                type="number"
                value={filters.minRestaurants || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, minRestaurants: e.target.value }))}
                placeholder="0"
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Max restaurants
              </label>
              <input
                type="number"
                value={filters.maxRestaurants || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, maxRestaurants: e.target.value }))}
                placeholder="100"
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Deliverymen Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Min deliverymen
              </label>
              <input
                type="number"
                value={filters.minDeliverymen || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, minDeliverymen: e.target.value }))}
                placeholder="0"
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Max deliverymen
              </label>
              <input
                type="number"
                value={filters.maxDeliverymen || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, maxDeliverymen: e.target.value }))}
                placeholder="100"
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-neutral-50 border-t border-neutral-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onApply}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[#0a4d2b] text-white hover:bg-[#06381e] transition-colors shadow-sm"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  )
}

