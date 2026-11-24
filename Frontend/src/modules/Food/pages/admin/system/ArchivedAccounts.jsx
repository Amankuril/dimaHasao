import { useState, useMemo, useEffect } from "react"
import { Search, User, Smartphone, Mail, Calendar, Trash2, Shield, UserX, Store, Truck, Filter, RefreshCcw } from "lucide-react"
import { adminAPI } from "@food/api"
import { toast } from "sonner"

export default function ArchivedAccounts() {
  const [searchQuery, setSearchQuery] = useState("")
  const [archivedAccounts, setArchivedAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState("all")

  const filteredAccounts = useMemo(() => {
    let result = [...archivedAccounts]

    // Filter by role
    if (roleFilter !== "all") {
      result = result.filter(acc => acc.type === roleFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(acc =>
        acc.name?.toLowerCase().includes(query) ||
        (acc.email || "").toLowerCase().includes(query) ||
        acc.phone?.includes(query)
      )
    }

    return result
  }, [archivedAccounts, searchQuery, roleFilter])

  const fetchArchivedAccounts = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getArchivedAccounts()
      const data = response?.data?.data
      const list = Array.isArray(data?.accounts)
        ? data.accounts
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : []
      setArchivedAccounts(list)
    } catch (error) {
      console.error('Error fetching archived accounts:', error)
      toast.error('Failed to load archived accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArchivedAccounts()
  }, [])

  const getInitials = (name) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleIcon = (type) => {
    switch (type) {
      case 'user': return <User className="w-4 h-4" />
      case 'restaurant': return <Store className="w-4 h-4" />
      case 'delivery': return <Truck className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  const getRoleColor = (type) => {
    switch (type) {
      case 'user': return 'bg-neutral-50 text-[#0a4d2b] border-neutral-200'
      case 'restaurant': return 'bg-orange-50 text-orange-600 border-orange-100'
      case 'delivery': return 'bg-neutral-50 text-[#0a4d2b] border-neutral-200'
      default: return 'bg-neutral-50 text-neutral-600 border-neutral-100'
    }
  }

  // Clean phone number for display (remove _deleted_ suffix)
  const formatPhone = (phone) => {
    if (!phone) return "N/A"
    return phone.split('_')[0]
  }

  return (
    <div className="p-4 lg:p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-medium text-neutral-900 flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-xl">
                  <UserX className="w-6 h-6 text-red-600" />
                </div>
                Archived accounts
              </h1>
            </div>
            <p className="text-neutral-500 mt-2 text-sm font-medium">
              View and track deleted users, restaurants, and delivery partners
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={fetchArchivedAccounts}
              disabled={loading}
              className={`group p-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-xl hover:border-red-500 hover:text-red-600 transition-colors flex items-center justify-center shadow-sm ${loading ? 'opacity-50' : ''}`}
              title="Refresh Data"
            >
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ' transition-transform duration-500'}`} />
            </button>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by name, phone or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors text-sm font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-neutral-50 p-1.5 rounded-2xl border border-neutral-200">
                <button
                  onClick={() => setRoleFilter("all")}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                    roleFilter === "all" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  All entities
                </button>
                <button
                  onClick={() => setRoleFilter("user")}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                    roleFilter === "user" ? "bg-white text-[#0a4d2b] shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => setRoleFilter("restaurant")}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                    roleFilter === "restaurant" ? "bg-white text-orange-600 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  Restaurants
                </button>
                <button
                  onClick={() => setRoleFilter("delivery")}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                    roleFilter === "delivery" ? "bg-white text-[#0a4d2b] shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  Delivery
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-100">
                  <th className="px-6 py-5 text-xs font-medium text-neutral-500">Account information</th>
                  <th className="px-6 py-5 text-xs font-medium text-neutral-500">Contact details</th>
                  <th className="px-6 py-5 text-xs font-medium text-neutral-500">Role & status</th>
                  <th className="px-6 py-5 text-xs font-medium text-neutral-500">Deletion activity</th>
                  <th className="px-6 py-5 text-xs font-medium text-neutral-500">Re-registration Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-6" colSpan="5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-neutral-300 rounded-2xl" />
                          <div className="space-y-2">
                            <div className="h-4 w-48 bg-neutral-300 rounded" />
                            <div className="h-3 w-32 bg-neutral-200 rounded" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filteredAccounts.length > 0 ? (
                  filteredAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-neutral-50/50 transition-colors group">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden">
                              {account.profileImage ? (
                                <img src={account.profileImage} alt={account.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm font-medium text-neutral-400">{getInitials(account.name)}</span>
                              )}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg border-2 border-white flex items-center justify-center ${getRoleColor(account.type)}`}>
                              {getRoleIcon(account.type)}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-neutral-900 group-hover:text-red-600 transition-colors">{account.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-medium px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-md">
                                ID: {account.id.substring(account.id.length - 8)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-medium text-neutral-600">
                            <Smartphone className="w-3.5 h-3.5 text-neutral-400" />
                            {formatPhone(account.phone)}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-neutral-600">
                            <Mail className="w-3.5 h-3.5 text-neutral-400" />
                            {account.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="space-y-2">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-medium ${getRoleColor(account.type)}`}>
                            {account.role}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                            <span className="text-xs font-medium text-red-600">{account.status}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-medium text-neutral-700">
                            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                            {formatDate(account.deletedAt)}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
                            <Trash2 className="w-3 h-3" />
                            Soft deleted
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        {account.newAccountCreatedAt ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs font-medium text-green-600">
                              <Calendar className="w-3.5 h-3.5 text-green-400" />
                              {formatDate(account.newAccountCreatedAt)}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-100 w-fit">
                              New account created
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs font-medium text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded-md border border-neutral-100 w-fit">
                            No Re-registration
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center">
                          <Shield className="w-8 h-8 text-neutral-200" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-neutral-900">No archived accounts found</h3>
                          <p className="text-neutral-400 text-sm mt-1 max-w-xs mx-auto">
                            {searchQuery ? "Try adjusting your search or filters to find what you're looking for." : "When accounts are deleted, they will appear here for archival tracking."}
                          </p>
                        </div>
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery("")}
                            className="text-red-600 text-sm font-medium hover:underline"
                          >
                            Clear search
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="bg-neutral-50/50 px-6 py-4 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">
              Total Archived Records: {filteredAccounts.length}
            </span>
            <div className="flex items-center gap-2">
               <span className="text-xs font-medium text-neutral-400">
                 * Only records with 'deleted' status are shown here. Restored records are automatically moved to active lists.
               </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
