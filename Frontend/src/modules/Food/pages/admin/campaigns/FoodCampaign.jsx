import { useState, useMemo } from "react"
import { Search, Download, ChevronDown, ArrowUpDown, Plus, Edit, Trash2, Megaphone, Settings } from "lucide-react"
import { emptyFoodCampaigns } from "@food/utils/adminFallbackData"

export default function FoodCampaign() {
  const [searchQuery, setSearchQuery] = useState("")
  const [campaigns, setCampaigns] = useState(emptyFoodCampaigns)

  const filteredCampaigns = useMemo(() => {
    if (!searchQuery.trim()) {
      return campaigns
    }
    
    const query = searchQuery.toLowerCase().trim()
    return campaigns.filter(campaign =>
      campaign.title.toLowerCase().includes(query)
    )
  }, [campaigns, searchQuery])

  const handleToggleStatus = (sl) => {
    setCampaigns(campaigns.map(campaign =>
      campaign.sl === sl ? { ...campaign, status: !campaign.status } : campaign
    ))
  }

  const handleDelete = (sl) => {
    if (window.confirm("Are you sure you want to delete this campaign?")) {
      setCampaigns(campaigns.filter(campaign => campaign.sl !== sl))
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-medium text-neutral-900">Food campaign</h1>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-700">
                {filteredCampaigns.length}
              </span>
            </div>
          </div>

          <button className="px-4 py-2.5 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 flex items-center gap-2 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Add new campaign
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:flex-initial min-w-[200px]">
            <input
              type="text"
              placeholder="Ex : title"
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

          <button className="p-2.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
        <div className="overflow-x-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                  <div className="flex items-center gap-2">
                    <span>SI</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                  <div className="flex items-center gap-2">
                    <span>Title</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                  <div className="flex items-center gap-2">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                  <div className="flex items-center gap-2">
                    <span>Time</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                  <div className="flex items-center gap-2">
                    <span>Price</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                  <div className="flex items-center gap-2">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-neutral-700">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-100">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <p className="text-lg font-medium text-neutral-700 mb-1">No data found</p>
                    <p className="text-sm text-neutral-500">No campaigns match your search</p>
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <tr
                    key={campaign.sl}
                    className="hover:bg-neutral-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-neutral-700">{campaign.sl}</span>
                    </td>
                    <td className="px-6 py-4">
                      <a href="#" className="text-sm font-medium text-[#0a4d2b] hover:text-[#0a4d2b]">
                        {campaign.title}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-neutral-700">{campaign.dateStart} - {campaign.dateEnd}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-neutral-700">{campaign.timeStart} - {campaign.timeEnd}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-neutral-900">$ {campaign.price.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(campaign.sl)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:ring-offset-2 ${
                          campaign.status ? "bg-neutral-900" : "bg-neutral-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            campaign.status ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="p-1.5 rounded text-[#0a4d2b] hover:bg-neutral-50 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(campaign.sl)}
                          className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
