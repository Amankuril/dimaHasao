import { useState, useEffect, useCallback } from "react"
import { Search, PiggyBank, Loader2, Package, RefreshCw } from "lucide-react"
import { adminAPI } from "@food/api"
import { toast } from "sonner"
const debugError = (...args) => {}

const formatCurrency = (amount) => {
  if (amount == null) return "₹0.00"
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function DeliveryBoyWallet() {
  const [wallets, setWallets] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [summary, setSummary] = useState(null)
  const limit = 20

  const fetchWallets = useCallback(async (overrides = {}) => {
    const p = overrides.page ?? page
    const q = overrides.search !== undefined ? overrides.search : searchQuery
    const silent = overrides.silent ?? false

    try {
      if (!silent) setLoading(true)
      const res = await adminAPI.getDeliveryWallets({
        search: q.trim() || undefined,
        page: p,
        limit,
      })
      if (res?.data?.success) {
        const data = res.data.data
        setWallets(data?.wallets || [])
        setTotal(data?.pagination?.total || 0)
        setPages(data?.pagination?.pages || 1)
        setSummary(data?.summary || null)
      } else {
        if (!silent) toast.error(res?.data?.message || "Failed to fetch delivery boy wallets")
        setWallets([])
      }
    } catch (err) {
      debugError("Error fetching delivery boy wallets:", err)
      if (!silent) toast.error(err?.response?.data?.message || "Failed to fetch delivery boy wallets")
      setWallets([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [page, searchQuery])

  useEffect(() => {
    fetchWallets()

    const interval = setInterval(() => {
      fetchWallets({ silent: true })
    }, 5000)

    return () => clearInterval(interval)
  }, [fetchWallets])

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      fetchWallets({ page: 1, search: searchQuery })
    }, 500)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const sumField = (key, fallback = 0) =>
    wallets.reduce((acc, w) => acc + Number(w?.[key] ?? fallback), 0)

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PiggyBank className="w-5 h-5 text-emerald-600" />
              <h1 className="text-2xl font-medium text-neutral-900">Delivery boy wallet</h1>
            </div>
            <button
              onClick={() => fetchWallets()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <p className="text-sm text-neutral-600 mt-1">
            Cash Collected = lifetime COD. Cash Deposited = amount already paid/settled. Cash In Hand = still unsettled.
          </p>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 mb-6">
          {[
            {
              label: "Remaining Cash Limit",
              value: summary?.totalRemainingCashLimit ?? sumField("remainingCashLimit"),
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: "Cash Collected (lifetime)",
              value: summary?.totalCashCollected ?? sumField("cashCollected"),
              color: "text-[#0a4d2b]",
              bg: "bg-neutral-50",
            },
            {
              label: "Cash Deposited (paid)",
              value: summary?.totalCashDeposited ?? sumField("cashDeposited"),
              color: "text-teal-600",
              bg: "bg-teal-50",
            },
            {
              label: "Cash In Hand",
              value: summary?.totalCashInHand ?? sumField("cashInHand"),
              color: "text-rose-600",
              bg: "bg-rose-50",
            },
            {
              label: "Total Earning",
              value: summary?.totalEarning ?? sumField("totalEarning"),
              color: "text-neutral-900",
              bg: "bg-neutral-100",
            },
            {
              label: "Bonus",
              value: summary?.totalBonus ?? sumField("bonus"),
              color: "text-[#0a4d2b]",
              bg: "bg-neutral-50",
            },
            {
              label: "Total Withdrawn",
              value: summary?.totalWithdrawn ?? sumField("totalWithdrawn"),
              color: "text-orange-600",
              bg: "bg-orange-50",
            },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} rounded-xl border border-neutral-200 p-4 shadow-sm`}>
              <p className="text-xs font-medium text-neutral-500 mb-1">{stat.label}</p>
              <p className={`text-lg font-medium ${stat.color}`}>{formatCurrency(stat.value)}</p>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-medium text-neutral-900">Wallets</h2>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-700 flex items-center justify-center min-w-[2.5rem] h-7">
                {loading ? (
                  <span className="w-5 h-3 rounded bg-neutral-300/80 animate-pulse" />
                ) : (
                  total
                )}
              </span>
            </div>
            <div className="relative flex-1 sm:flex-initial min-w-[200px] max-w-xs">
              <input
                type="text"
                placeholder="Search by name or phone"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
              <p className="text-neutral-600">Loading wallets…</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Remaining limit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Pocket balance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Cash collected</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Cash deposited</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Cash in hand</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Total earning</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Bonus</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Withdrawn</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-100">
                  {wallets.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Package className="w-16 h-16 text-neutral-400 mb-4" />
                          <p className="text-lg font-medium text-neutral-700">No wallets found</p>
                          <p className="text-sm text-neutral-500 mt-1">
                            {searchQuery ? `No results for "${searchQuery}"` : "No approved delivery boys found."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    wallets.map((w, i) => {
                      const remaining = Number(w.remainingCashLimit ?? w.availableCashLimit ?? 0)
                      const pocket = Number(w.pocketBalance ?? 0)
                      const collected = Number(w.cashCollected ?? 0)
                      const deposited = Number(w.cashDeposited ?? 0)
                      const cashInHand = Number(w.cashInHand ?? Math.max(0, collected - deposited))
                      const earning = Number(w.totalEarning ?? 0)
                      const bonus = Number(w.bonus ?? 0)
                      const withdrawn = Number(w.totalWithdrawn ?? 0)
                      const isSettled = deposited > 0 && cashInHand <= 0

                      return (
                        <tr key={w.walletId || w.deliveryId || i} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">{(page - 1) * limit + i + 1}</td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-neutral-800">{w.name || "—"}</span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-600">
                            {w.phone || w.deliveryIdString || "—"}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${remaining <= 0 ? "text-red-600" : "text-emerald-600"}`}>
                              {formatCurrency(remaining)}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-neutral-700">{formatCurrency(pocket)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-neutral-700">{formatCurrency(collected)}</td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium text-teal-700">{formatCurrency(deposited)}</span>
                              {deposited > 0 && (
                                <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-xs font-medium ${
                                  isSettled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                }`}>
                                  {isSettled ? "Fully paid" : "Partially paid"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${cashInHand > 0 ? "text-rose-600" : "text-neutral-700"}`}>
                              {formatCurrency(cashInHand)}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-neutral-800">{formatCurrency(earning)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-[#0a4d2b]">{formatCurrency(bonus)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-orange-600">{formatCurrency(withdrawn)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200">
              <p className="text-sm text-neutral-600">
                Page {page} of {pages} · {total} total
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
