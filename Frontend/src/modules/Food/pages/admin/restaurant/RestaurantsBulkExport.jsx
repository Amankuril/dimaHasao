import { Download, RefreshCw, FileSpreadsheet } from "lucide-react"

export default function RestaurantsBulkExport() {
  const handleExport = () => {
    // Handle export logic here
    alert("Exporting all restaurant data...")
  }

  const handleReset = () => {
    // Reset logic if needed
  }

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Download className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-medium text-neutral-900">Export restaurants</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Export restaurant data in bulk using filters
            </p>
          </div>
        </div>
      </div>

      {/* Export Info */}
      <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#0a4d2b] text-white flex items-center justify-center font-medium text-lg">
            1
          </div>
          <h2 className="text-xl font-medium text-neutral-900">Export all restaurant data</h2>
        </div>
        <div className="ml-14">
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>All restaurant data will be exported in Excel (.xlsx) format</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleReset}
          className="px-6 py-2.5 text-sm font-medium rounded-lg bg-neutral-600 text-white hover:bg-neutral-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reset
        </button>
        <button
          onClick={handleExport}
          className="px-6 py-2.5 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
    </div>
  )
}
