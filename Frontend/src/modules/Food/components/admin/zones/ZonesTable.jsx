import { useState, useMemo } from "react"
import { Pencil, Settings, ChevronLeft, ChevronRight } from "lucide-react"

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

export default function ZonesTable({ 
  zones, 
  visibleColumns, 
  onEditZone, 
  onViewZone,
  onStatusToggle, 
  onMakeDefault 
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.ceil(zones.length / itemsPerPage)

  const paginatedZones = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return zones.slice(startIndex, startIndex + itemsPerPage)
  }, [zones, currentPage])

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              {visibleColumns.si && (
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700">
                  SI
                </th>
              )}
              {visibleColumns.zoneId && (
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700">
                  Zone id
                </th>
              )}
              {visibleColumns.name && (
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700">
                  Name
                </th>
              )}
              {visibleColumns.displayName && (
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700">
                  Zone display name
                </th>
              )}
              {visibleColumns.restaurants && (
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700">
                  Restaurants
                </th>
              )}
              {visibleColumns.deliverymen && (
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700">
                  Deliverymen
                </th>
              )}
              {visibleColumns.defaultStatus && (
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700">
                  Default status
                </th>
              )}
              {visibleColumns.status && (
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700">
                  Status
                </th>
              )}
              {visibleColumns.actions && (
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-100">
            {paginatedZones.length === 0 ? (
              <tr>
                <td colSpan={Object.values(visibleColumns).filter(v => v).length} className="px-6 py-8 text-center">
                  <p className="text-sm text-neutral-500">No zones found</p>
                </td>
              </tr>
            ) : (
              paginatedZones.map((zone, index) => {
                const globalIndex = (currentPage - 1) * itemsPerPage + index
                return (
                  <tr key={zone.id} className="hover:bg-neutral-50 transition-colors">
                    {visibleColumns.si && (
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-neutral-700">{globalIndex + 1}</span>
                      </td>
                    )}
                    {visibleColumns.zoneId && (
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-neutral-700">{zone.zoneId}</span>
                      </td>
                    )}
                    {visibleColumns.name && (
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-neutral-700">{zone.name}</span>
                      </td>
                    )}
                    {visibleColumns.displayName && (
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-neutral-700">{zone.displayName}</span>
                      </td>
                    )}
                    {visibleColumns.restaurants && (
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-neutral-700">{zone.restaurants}</span>
                      </td>
                    )}
                    {visibleColumns.deliverymen && (
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-neutral-700">{zone.deliverymen}</span>
                      </td>
                    )}
                    {visibleColumns.defaultStatus && (
                      <td className="px-3 py-2.5">
                        {zone.isDefault ? (
                          <span className="text-xs text-green-600 font-medium">Default</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onMakeDefault(zone.id)}
                            className="px-2 py-1 text-xs font-medium bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300 transition-colors"
                          >
                            Make default
                          </button>
                        )}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-3 py-2.5">
                        <ToggleSwitch
                          enabled={zone.status}
                          onToggle={() => onStatusToggle(zone.id)}
                        />
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditZone(zone)}
                            className="p-1.5 text-[#0a4d2b] hover:bg-neutral-50 rounded transition-colors"
                            title="Edit Zone"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onViewZone(zone)}
                            className="p-1.5 text-neutral-600 hover:bg-neutral-50 rounded transition-colors"
                            title="View Zone Details"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-neutral-200 flex items-center justify-between">
          <div className="text-xs text-neutral-600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, zones.length)} of {zones.length} zones
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                    currentPage === page
                      ? "bg-neutral-900 text-white"
                      : "bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

