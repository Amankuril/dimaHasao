import { X } from "lucide-react"

export default function SubscriptionFilterPanel({ isOpen, onClose, filters, setFilters, onApply, onReset, restaurants = [] }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-neutral-900/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-medium text-neutral-900">Filter subscription orders</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-600" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {["All", "Active", "Expired", "Pending"].map((status) => (
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

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Order type
            </label>
            <div className="flex flex-wrap gap-2">
              {["All", "Daily", "Weekly", "Monthly"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilters(prev => ({ ...prev, orderType: type === "All" ? "" : type }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.orderType === type || (type === "All" && !filters.orderType)
                      ? "bg-[#0a4d2b] text-white shadow-sm"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {restaurants.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Restaurant
              </label>
              <select
                value={filters.restaurant || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, restaurant: e.target.value }))}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Restaurants</option>
                {restaurants.map((rest) => (
                  <option key={rest} value={rest}>{rest}</option>
                ))}
              </select>
            </div>
          )}
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

