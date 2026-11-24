import { useState, useMemo } from "react"
import { Search, Wallet, Info, Calendar, Edit, Trash2 } from "lucide-react"
import { emptyWalletBonuses } from "@food/utils/adminFallbackData"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


export default function Bonus() {
  const [activeLanguage, setActiveLanguage] = useState("default")
  const [searchQuery, setSearchQuery] = useState("")
  const [bonuses, setBonuses] = useState(emptyWalletBonuses)
  const [formData, setFormData] = useState({
    bonusTitle: "",
    shortDescription: "",
    bonusType: "Percentage (%)",
    bonusAmount: "",
    minAddMoney: "",
    maxBonus: "",
    startDate: "",
    expireDate: "",
  })

  const languageTabs = [
    { key: "default", label: "Default" },
    { key: "en", label: "English(EN)" },
    { key: "bn", label: "Bengali - বাংলা(BN)" },
    { key: "ar", label: "Arabic - العربية (AR)" },
    { key: "es", label: "Spanish - espa�ol(ES)" },
  ]

  const filteredBonuses = useMemo(() => {
    if (!searchQuery.trim()) {
      return bonuses
    }
    
    const query = searchQuery.toLowerCase().trim()
    return bonuses.filter(bonus =>
      bonus.bonusTitle.toLowerCase().includes(query)
    )
  }, [bonuses, searchQuery])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    debugLog("Form submitted:", formData)
    alert("Bonus setup saved successfully!")
  }

  const handleReset = () => {
    setFormData({
      bonusTitle: "",
      shortDescription: "",
      bonusType: "Percentage (%)",
      bonusAmount: "",
      minAddMoney: "",
      maxBonus: "",
      startDate: "",
      expireDate: "",
    })
  }

  const handleToggleStatus = (sl) => {
    setBonuses(bonuses.map(bonus =>
      bonus.sl === sl ? { ...bonus, status: !bonus.status } : bonus
    ))
  }

  const handleDelete = (sl) => {
    if (window.confirm("Are you sure you want to delete this bonus?")) {
      setBonuses(bonuses.filter(bonus => bonus.sl !== sl))
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Bonus Setup Form */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
              <Wallet className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-medium text-neutral-900">Wallet bonus setup</h1>
          </div>

          {/* Language Tabs */}
          <div className="flex items-center gap-2 border-b border-neutral-200 mb-6">
            {languageTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveLanguage(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeLanguage === tab.key
                    ? "border-[#0a4d2b] text-[#0a4d2b]"
                    : "border-transparent text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Bonus Title ({activeLanguage === "default" ? "Default" : languageTabs.find(t => t.key === activeLanguage)?.label})
                </label>
                <input
                  type="text"
                  value={formData.bonusTitle}
                  onChange={(e) => handleInputChange("bonusTitle", e.target.value)}
                  placeholder="Ex: EID dhamaka"
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Short Description ({activeLanguage === "default" ? "Default" : languageTabs.find(t => t.key === activeLanguage)?.label})
                </label>
                <input
                  type="text"
                  value={formData.shortDescription}
                  onChange={(e) => handleInputChange("shortDescription", e.target.value)}
                  placeholder="Ex: EID dhamaka"
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Bonus type
                </label>
                <select
                  value={formData.bonusType}
                  onChange={(e) => handleInputChange("bonusType", e.target.value)}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
                >
                  <option value="Percentage (%)">Percentage (%)</option>
                  <option value="Amount ($)">Amount ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  <div className="flex items-center gap-2">
                    <span>Bonus Amount ({formData.bonusType === "Percentage (%)" ? "%" : "$"})</span>
                    <Info className="w-4 h-4 text-neutral-400" />
                  </div>
                </label>
                <input
                  type="number"
                  value={formData.bonusAmount}
                  onChange={(e) => handleInputChange("bonusAmount", e.target.value)}
                  placeholder="Ex: 100"
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  <div className="flex items-center gap-2">
                    <span>Minimum Add Money Amount ($)</span>
                    <Info className="w-4 h-4 text-neutral-400" />
                  </div>
                </label>
                <input
                  type="number"
                  value={formData.minAddMoney}
                  onChange={(e) => handleInputChange("minAddMoney", e.target.value)}
                  placeholder="Ex: 10"
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  <div className="flex items-center gap-2">
                    <span>Maximum Bonus ($)</span>
                    <Info className="w-4 h-4 text-neutral-400" />
                  </div>
                </label>
                <input
                  type="number"
                  value={formData.maxBonus}
                  onChange={(e) => handleInputChange("maxBonus", e.target.value)}
                  placeholder="Ex: 1000"
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Start date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange("startDate", e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Expire date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.expireDate}
                    onChange={(e) => handleInputChange("expireDate", e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                </div>
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
                className="px-6 py-2.5 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-sm"
              >
                Submit
              </button>
            </div>
          </form>
        </div>

        {/* Bonus List Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-medium text-neutral-900">Bonus list</h2>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-700">
                {filteredBonuses.length}
              </span>
            </div>

            <div className="relative flex-1 sm:flex-initial min-w-[200px]">
              <input
                type="text"
                placeholder="Ex: Search by bonus title"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">SI</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Bonus title</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Bonus info</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Bonus amount</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Started on</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Expires on</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-neutral-700">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-100">
                {filteredBonuses.map((bonus) => (
                  <tr key={bonus.sl} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-neutral-700">{bonus.sl}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-neutral-900">{bonus.bonusTitle}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-700">{bonus.bonusInfo}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-neutral-900">{bonus.bonusAmount}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-neutral-700">{bonus.startedOn}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-neutral-700">{bonus.expiresOn}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(bonus.sl)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:ring-offset-2 ${
                          bonus.status ? "bg-neutral-900" : "bg-neutral-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            bonus.status ? "translate-x-6" : "translate-x-1"
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
                          onClick={() => handleDelete(bonus.sl)}
                          className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

