import { useState, useEffect } from "react"
import { Search, Wallet, Eye, CheckCircle, XCircle, Loader2, Package, QrCode } from "lucide-react"
import { adminAPI } from "@food/api"
import { toast } from "sonner"
import AdminListPagination from "@food/components/admin/AdminListPagination"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@food/components/ui/dialog"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


const TABS = [
  { key: "All", label: "All" },
  { key: "Pending", label: "Pending" },
  { key: "Approved", label: "Approved" },
  { key: "Rejected", label: "Rejected" },
]

export default function DeliveryWithdrawal() {
  const [activeTab, setActiveTab] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem("admin_delivery_withdraws_pageSize")) || 20
    } catch {
      return 20
    }
  })
  const [totalItems, setTotalItems] = useState(0)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [processingAction, setProcessingAction] = useState(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, activeTab])

  useEffect(() => {
    fetchRequests()
  }, [activeTab, debouncedSearch, currentPage, pageSize])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getDeliveryWithdrawals({
        status: activeTab,
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
      })
      if (response?.data?.success) {
        setRequests(response.data.data?.requests || [])
        setTotalItems(
          response.data.data?.total ??
          response.data?.total ??
          (response.data.data?.requests || []).length,
        )
      } else {
        toast.error(response?.data?.message || "Failed to fetch delivery withdrawal requests")
        setRequests([])
        setTotalItems(0)
      }
    } catch (error) {
      debugError("Error fetching delivery withdrawal requests:", error)
      toast.error(error.response?.data?.message || "Failed to fetch delivery withdrawal requests")
      setRequests([])
      setTotalItems(0)
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = requests

  const getStatusBadge = (status) => {
    if (status === "Approved" || status === "Processed") return "bg-green-100 text-green-700"
    if (status === "Pending") return "bg-amber-100 text-amber-700"
    if (status === "Rejected") return "bg-red-100 text-red-700"
    return "bg-neutral-100 text-neutral-700"
  }

  const handleView = (req) => {
    setSelectedRequest(req)
    setIsViewOpen(true)
  }

  const handleApprove = async (id) => {
    if (!confirm("Are you sure you want to approve this withdrawal request?")) return
    try {
      setProcessingAction(id)
      const response = await adminAPI.updateDeliveryWithdrawalStatus(id, { status: "Approved" })
      if (response?.data?.success) {
        toast.success("Withdrawal request approved successfully")
        fetchRequests()
      }
 else {
        toast.error(response?.data?.message || "Failed to approve")
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message || "Failed to approve withdrawal request"
      debugError("Error approving delivery withdrawal:", error?.response?.data || error, msg)
      toast.error(msg)
    } finally {
      setProcessingAction(null)
    }
  }

  const handleReject = async (id) => {
    try {
      setProcessingAction(id)
      const response = await adminAPI.updateDeliveryWithdrawalStatus(id, {
        status: "Rejected",
        rejectionReason: rejectionReason,
      })
      if (response?.data?.success) {
        toast.success("Withdrawal request rejected successfully")
        setShowRejectModal(false)
        setRejectionReason("")
        setSelectedRequest(null)
        fetchRequests()
      }
 else {
        toast.error(response?.data?.message || "Failed to reject")
      }
    } catch (error) {
      debugError("Error rejecting delivery withdrawal:", error)
      toast.error(error.response?.data?.message || "Failed to reject withdrawal request")
    } finally {
      setProcessingAction(null)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return String(dateString)
    }
  }

  const formatCurrency = (amount) => {
    if (amount == null) return "\u20B90.00"
    return `\u20B9${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <h1 className="text-2xl font-medium text-neutral-900">Delivery withdrawal</h1>
          </div>
          <p className="text-sm text-neutral-600 mt-1">
            View and manage delivery boy withdrawal requests. Pending requests can be approved or rejected.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <div className="flex gap-2 border-b border-neutral-200">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-medium text-neutral-900">Withdrawal requests</h2>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-700">
                {totalItems}
              </span>
            </div>
            <div className="relative flex-1 sm:flex-initial min-w-[200px] max-w-xs">
              <input
                type="text"
                placeholder="Search by delivery name, ID, phone"
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
              <p className="text-neutral-600">Loading withdrawal requests…</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">#</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Delivery boy</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Request time</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-neutral-700">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-100">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Package className="w-16 h-16 text-neutral-400 mb-4" />
                          <p className="text-lg font-medium text-neutral-700">No requests</p>
                          <p className="text-sm text-neutral-500">
                            No {activeTab.toLowerCase()} withdrawal requests.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req, index) => (
                      <tr key={req.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-700">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-700">{formatCurrency(req.amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-700">{req.deliveryName || "N/A"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-700">{req.deliveryIdString || "N/A"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-700">{formatDate(req.requestedAt || req.createdAt)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(req.status)}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleView(req)}
                              className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4 text-amber-600" />
                            </button>
                            {req.status === "Pending" && (
                              <>
                                <button
                                  onClick={() => handleApprove(req.id)}
                                  disabled={processingAction === req.id}
                                  className="p-2 rounded-lg bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Approve"
                                >
                                  {processingAction === req.id ? (
                                    <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedRequest(req)
                                    setShowRejectModal(true)
                                  }}
                                  disabled={processingAction === req.id}
                                  className="p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Reject"
                                >
                                  <XCircle className="w-4 h-4 text-red-600" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <AdminListPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              try {
                localStorage.setItem("admin_delivery_withdraws_pageSize", String(size))
              } catch {}
              setCurrentPage(1)
            }}
            itemLabel="withdrawals"
          />
        </div>

        {/* View details dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-md bg-white p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Withdrawal request details</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-neutral-500">Amount</label>
                  <p className="text-sm font-medium text-neutral-900 mt-1">{formatCurrency(selectedRequest.amount)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Delivery boy</label>
                  <p className="text-sm font-medium text-neutral-900 mt-1">{selectedRequest.deliveryName || "N/A"}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Delivery ID</label>
                  <p className="text-sm font-medium text-neutral-900 mt-1">{selectedRequest.deliveryIdString || "N/A"}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Phone</label>
                  <p className="text-sm font-medium text-neutral-900 mt-1">{selectedRequest.deliveryPhone || "N/A"}</p>
                </div>
                {selectedRequest.upiId && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      <label className="text-xs font-medium text-emerald-800">UPI information</label>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-neutral-900">{selectedRequest.upiId}</p>
                      {selectedRequest.upiQrCode && (
                        <button 
                          onClick={() => window.open(selectedRequest.upiQrCode, '_blank')}
                          className="text-xs bg-[#0a4d2b] text-white px-2 py-1 rounded hover:bg-[#06381e] transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View QR
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-neutral-500">Bank name</label>
                    <p className="text-sm font-medium text-neutral-900 mt-1">{selectedRequest.bankDetails?.bankName || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500">Account number</label>
                    <p className="text-sm font-medium text-neutral-900 mt-1">{selectedRequest.bankDetails?.accountNumber || "N/A"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-neutral-500">IFSC code</label>
                    <p className="text-sm font-medium text-neutral-900 mt-1 text-emerald-600">{selectedRequest.bankDetails?.ifscCode || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500">Holder name</label>
                    <p className="text-sm font-medium text-neutral-900 mt-1">{selectedRequest.bankDetails?.accountHolderName || "N/A"}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Request time</label>
                  <p className="text-sm font-medium text-neutral-900 mt-1">{formatDate(selectedRequest.requestedAt || selectedRequest.createdAt)}</p>
                </div>
                {(selectedRequest.status === "Approved" || selectedRequest.status === "Processed") && selectedRequest.processedAt && (
                  <div>
                    <label className="text-xs font-medium text-neutral-500">Processed at</label>
                    <p className="text-sm font-medium text-neutral-900 mt-1">{formatDate(selectedRequest.processedAt)}</p>
                  </div>
                )}
                {selectedRequest.status === "Rejected" && selectedRequest.processedAt && (
                  <div>
                    <label className="text-xs font-medium text-neutral-500">Rejected at</label>
                    <p className="text-sm font-medium text-neutral-900 mt-1">{formatDate(selectedRequest.processedAt)}</p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-neutral-500">Status</label>
                  <p className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedRequest.status)}`}>
                      {selectedRequest.status}
                    </span>
                  </p>
                </div>
                {selectedRequest.rejectionReason && (
                  <div>
                    <label className="text-xs font-medium text-neutral-500">Rejection reason</label>
                    <p className="text-sm font-medium text-neutral-900 mt-1">{selectedRequest.rejectionReason}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="px-6 pb-6">
              <button
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#0a4d2b] text-white hover:bg-[#06381e] transition-colors"
              >
                Close
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject modal */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent className="max-w-md bg-white p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Reject withdrawal request</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Rejection reason (optional)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection"
                  rows={4}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
            <DialogFooter className="px-6 pb-6 flex gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason("")
                  setSelectedRequest(null)
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedRequest && handleReject(selectedRequest.id)}
                disabled={processingAction === selectedRequest?.id}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingAction === selectedRequest?.id ? "Rejecting…" : "Reject"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

