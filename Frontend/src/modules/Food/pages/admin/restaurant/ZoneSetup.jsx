import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { MapPin, Plus, Search, Edit, Trash2, Eye, Map, Bike } from "lucide-react"
import { adminAPI } from "@food/api"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


export default function ZoneSetup() {
  const navigate = useNavigate()
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchZones()
  }, [])

  const fetchZones = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getZones()
      if (response.data?.success && response.data.data?.zones) {
        setZones(response.data.data.zones)
      }
    } catch (error) {
      debugError("Error fetching zones:", error)
      setZones([])
    } finally {
      setLoading(false)
    }
  }


  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm("Are you sure you want to delete this zone?")) {
      return
    }
    try {
      await adminAPI.deleteZone(zoneId)
      alert("Zone deleted successfully!")
      fetchZones()
    } catch (error) {
      debugError("Error deleting zone:", error)
      alert(error.response?.data?.message || "Failed to delete zone")
    }
  }

  const filteredZones = zones.filter(zone =>
    zone.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.serviceLocation?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-2 lg:p-3 bg-neutral-50 min-h-screen">
      <div className="w-full mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-medium text-neutral-900">Zone setup restaurant</h1>
              <p className="text-sm text-neutral-600">Manage delivery zones for restaurants</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin/food/zone-setup/delivery-boy-view")}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <Bike className="w-5 h-5" />
              <span>Delivery boy view</span>
            </button>
            <button
              onClick={() => navigate("/admin/food/zone-setup/map")}
              className="flex items-center gap-2 px-4 py-2 bg-[#0a4d2b] text-white rounded-lg hover:bg-[#06381e] transition-colors"
            >
              <Map className="w-5 h-5" />
              <span>View map</span>
            </button>
            <button
              onClick={() => navigate("/admin/food/zone-setup/add")}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add zone</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search zones by name or location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
            />
          </div>
        </div>

        {/* Zones List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a4d2b] mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading zones...</p>
          </div>
        ) : filteredZones.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-12 text-center">
            <MapPin className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No zones found</h3>
            <p className="text-neutral-600 mb-6">
              {searchQuery ? "Try adjusting your search query" : "Create your first delivery zone to get started"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate("/admin/food/zone-setup/add")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Add zone</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredZones.map((zone) => (
              <div
                key={zone._id || zone.id}
                className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-neutral-900 mb-1">{zone.name || "Unnamed Zone"}</h3>
                    <p className="text-sm text-neutral-600">{zone.serviceLocation || "N/A"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/admin/food/zone-setup/view/${zone._id || zone.id}`)}
                      className="p-2 text-neutral-600 hover:text-[#0a4d2b] hover:bg-neutral-50 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/admin/food/zone-setup/edit/${zone._id || zone.id}`)}
                      className="p-2 text-neutral-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteZone(zone._id || zone.id)}
                      className="p-2 text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Unit:</span>
                    <span className="font-medium text-neutral-900">{zone.unit || "km"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      zone.isActive ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-800"
                    }`}>
                      {zone.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {zone.coordinates && zone.coordinates.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">Points:</span>
                      <span className="font-medium text-neutral-900">{zone.coordinates.length}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

