import { useCallback, useEffect, useState } from "react"
import { Search, Receipt, Loader2, Package, RefreshCw } from "lucide-react"
import { adminAPI } from "@food/api"
import { toast } from "sonner"

const formatCurrency = (amount) => {
  if (amount == null) return "\u20B90.00"
  return `\u20B9${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatDate = (value) => {
  if (!value) return "\u2014"
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "\u2014"
  }
}

const TABS = [
  { key: "All", label: "All" },
  { key: "Completed", label: "Paid / Completed" },
  { key: "Pending", label: "Pending" },
  { key: "Failed", label: "Failed" },
]

export default function CashLimitSettlement() {
  const [activeTab, setActiveTab] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  const fetchSettlements = useCallback(async (overrides = {}) => {
    const p = overrides.page ?? page
    const q = overrides.search !== undefined ? overrides.search : searchQuery
    const status = overrides.status ?? activeTab

    try {
      setLoading(true)
      const res = await adminAPI.getCashLimitSettlements({
        search: q.trim() || undefined,
        status: status === "All" ? undefined : status,
        page: p,
        limit,
      })
      if (res?.data?.success) {
        const data = res.data.data
        setTransactions(data?.transactions || [])
        setTotal(data?.pagination?.total || 0)
        setPages(data?.pagination?.pages || 1)
      } else {
        toast.error(res?.data?.message || "Failed to fetch cash limit settlements")
        setTransactions([])
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to fetch cash limit settlements")
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, page, searchQuery])

  useEffect(() => {
    fetchSettlements()
  }, [fetchSettlements])

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      fetchSettlements({ page: 1, search: searchQuery })
    }, 500)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const getStatusBadge = (status) => {
    const s = String(status || "").toLowerCase()
    if (s === "completed") return "bg-emerald-100 text-emerald-700"
    if (s === "pending") return "bg-amber-100 text-amber-700"
    if (s === "failed") return "bg-red-100 text-red-700"
    return "bg-neutral-100 text-neutral-700"
  }

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      <div className="max-w-full mx-auto">
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h1 className="text-2xl font-medium text-neutral-900">Cash limit settlement</h1>
                <p className="text-sm text-neutral-600 mt-1">
                  Delivery boy cash deposits (COD settlement). Completed = paid back to company.
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchSettlements()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key)
                    setPage(1)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                    activeTab === tab.key
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 lg:flex-initial min-w-[220px] max-w-sm">
              <input
                type="text"
                placeholder="Search name, phone, or pay_ id"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
              <p className="text-neutral-600">Loading settlements...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px]">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">S.No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Delivery boy</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Payment ID</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-100">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Package className="w-16 h-16 text-neutral-400 mb-4" />
                          <p className="text-lg font-medium text-neutral-700">No settlements found</p>
                          <p className="text-sm text-neutral-500 mt-1">
                            {searchQuery
                              ? `No results for "${searchQuery}"`
                              : "No cash deposit records yet."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx, i) => (
                      <tr key={tx.id || i} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">{(page - 1) * limit + i + 1}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-600">{formatDate(tx.createdAt)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-neutral-800">{tx.deliveryName || "\u2014"}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-600">{tx.deliveryPhone || tx.deliveryIdString || "\u2014"}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-emerald-700">{formatCurrency(tx.amount)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-600">{tx.paymentMethod || "\u2014"}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(tx.status)}`}>
                            {String(tx.status || "\u2014")}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-xs font-mono text-neutral-500">{tx.razorpayPaymentId || "N/A"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200">
              <p className="text-sm text-neutral-600">
                Page {page} of {pages} &middot; {total} total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
