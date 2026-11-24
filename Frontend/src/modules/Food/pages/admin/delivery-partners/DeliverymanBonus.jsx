import { useState, useEffect } from "react"
import { Search, Gift, Plus, Loader2 } from "lucide-react"
import { adminAPI } from "@food/api"
import { toast } from "sonner"
import AdminListPagination from "@food/components/admin/AdminListPagination"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@food/components/ui/dialog"

const formatCurrency = (amount) =>
  `\u20B9${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatDate = (dateString) => {
  if (!dateString) return "N/A"
  try {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateString
  }
}

export default function DeliverymanBonus() {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem("admin_deliveryman_bonus_pageSize")) || 20
    } catch {
      return 20
    }
  })
  const [totalItems, setTotalItems] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [deliveryPartners, setDeliveryPartners] = useState([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ deliveryPartnerId: "", amount: "", reference: "" })

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch])

  useEffect(() => {
    adminAPI.getDeliveryPartners({ limit: 1000, status: "approved" })
      .then((res) => {
        if (res?.data?.success) {
          setDeliveryPartners(res.data.data.deliveryPartners || [])
        }
      })
      .catch(() => {})
  }, [])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getDeliveryPartnerBonusTransactions({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
      })
      if (response?.data?.success) {
        setTransactions(response.data.data.transactions || [])
        setTotalItems(response.data.data.pagination?.total ?? (response.data.data.transactions || []).length)
      } else {
        setTransactions([])
        setTotalItems(0)
        toast.error(response?.data?.message || "Failed to fetch bonus transactions")
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch bonus transactions")
      setTransactions([])
      setTotalItems(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [currentPage, pageSize, debouncedSearch])

  const handleAddBonus = async (e) => {
    e.preventDefault()
    if (!form.deliveryPartnerId) {
      toast.error("Please select a delivery partner")
      return
    }
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }
    try {
      setSubmitting(true)
      await adminAPI.addDeliveryPartnerBonus(form.deliveryPartnerId, amount, form.reference.trim())
      toast.success("Bonus added successfully")
      setIsAddOpen(false)
      setForm({ deliveryPartnerId: "", amount: "", reference: "" })
      fetchTransactions()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add bonus")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-[#0a4d2b]" />
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-medium text-neutral-900">Deliveryman bonus</h1>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-700">
                  {loading ? "..." : totalItems}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <input
                  type="text"
                  placeholder="Search by name, phone, transaction ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add bonus
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#0a4d2b]" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">SI</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Transaction ID</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Deliveryman</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Reference</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-100">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                        No bonus transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx, index) => (
                      <tr key={tx.transactionId || tx._id || index} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-neutral-700">
                          {tx.transactionId || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#0a4d2b]">{tx.deliveryman || "Unknown"}</span>
                            {tx.deliveryId && (
                              <span className="text-xs text-neutral-500">{tx.deliveryId}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0a4d2b]">
                          {formatCurrency(tx.amount ?? tx.bonus)}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-700 max-w-xs truncate" title={tx.reference}>
                          {tx.reference || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                          {formatDate(tx.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <AdminListPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              try {
                localStorage.setItem("admin_deliveryman_bonus_pageSize", String(size))
              } catch {
                /* ignore */
              }
            }}
            itemLabel="transactions"
          />
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#0a4d2b]" />
              Add delivery bonus
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddBonus} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Delivery partner</label>
              <select
                required
                value={form.deliveryPartnerId}
                onChange={(e) => setForm({ ...form, deliveryPartnerId: e.target.value })}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 text-sm"
              >
                <option value="">Select delivery partner</option>
                {deliveryPartners.map((dp) => (
                  <option key={dp._id} value={dp._id}>{dp.name} {dp.phone ? `(${dp.phone})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Amount (?)</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 text-sm"
                placeholder="e.g. 500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Reference (optional)</label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 text-sm"
                placeholder="e.g. Performance bonus"
              />
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Bonus
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
