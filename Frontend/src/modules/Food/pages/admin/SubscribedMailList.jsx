import { useState, useMemo } from "react"
import { Search, Download, ChevronDown, Mail, Calendar, Settings } from "lucide-react"
import { emptySubscribedEmails } from "@food/utils/adminFallbackData"

export default function SubscribedMailList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [emails, setEmails] = useState(emptySubscribedEmails)
  const [filters, setFilters] = useState({
    subscriptionDate: "",
    sortBy: "",
    chooseFirst: "",
  })

  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) {
      return emails
    }
    
    const query = searchQuery.toLowerCase().trim()
    return emails.filter(email =>
      email.email.toLowerCase().includes(query)
    )
  }, [emails, searchQuery])

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="w-5 h-5 text-[#0a4d2b]" />
            <h1 className="text-2xl font-medium text-neutral-900">Subscribed mail list</h1>
          </div>

          {/* Filter Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Subscription date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.subscriptionDate}
                  onChange={(e) => handleFilterChange("subscriptionDate", e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Sort by
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
              >
                <option value="">Select mail sorting order</option>
                <option value="email-asc">Email (A-Z)</option>
                <option value="email-desc">Email (Z-A)</option>
                <option value="date-asc">Date (oldest first)</option>
                <option value="date-desc">Date (newest first)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Choose first
              </label>
              <input
                type="number"
                value={filters.chooseFirst}
                onChange={(e) => handleFilterChange("chooseFirst", e.target.value)}
                placeholder="Ex: 100"
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
              />
            </div>

            <div className="flex items-end">
              <button className="px-6 py-2.5 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors">
                Filter
              </button>
            </div>
          </div>
        </div>

        {/* Mail List Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 relative">
          {/* Settings Icon */}
          <button className="absolute top-6 right-6 p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors">
            <Settings className="w-5 h-5 text-neutral-600" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-medium text-neutral-900">Mail list</h2>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-700">
                {filteredEmails.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <input
                  type="text"
                  placeholder="Ex: search email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              </div>

              <button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 flex items-center gap-2 transition-colors">
                <Download className="w-4 h-4" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">SI</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Created at</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-100">
                {filteredEmails.map((email) => (
                  <tr key={email.sl} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-neutral-700">{email.sl}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-neutral-900">{email.email || "NA"}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-neutral-700">{email.createdAt}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
