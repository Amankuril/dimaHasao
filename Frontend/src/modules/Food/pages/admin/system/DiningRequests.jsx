import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Clock, UtensilsCrossed, Loader2, AlertCircle, CheckCircle2, ChevronRight, User, MapPin } from "lucide-react"
import { adminAPI } from "@food/api"
import { Button } from "@food/components/ui/button"
import { Badge } from "@food/components/ui/badge"
import { toast } from "sonner"

const debugError = (...args) => {}

export default function DiningRequests() {
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchRequests()
    }, [])

    const fetchRequests = async () => {
        try {
            setLoading(true)
            const response = await adminAPI.getDiningRequests()
            if (response.data.success) {
                const data = response.data.data
                const list = Array.isArray(data?.requests)
                  ? data.requests
                  : Array.isArray(data)
                    ? data
                    : []
                setRequests(list)
            }
        } catch (err) {
            debugError("Error fetching dining requests:", err)
            setError("Failed to load requests")
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (requestId) => {
        if (!window.confirm("Approve this dining settings update?")) return
        try {
            setProcessingId(requestId)
            const response = await adminAPI.approveDiningRequest(requestId)
            if (response.data.success) {
                toast.success("Request approved successfully")
                setRequests(requests.filter(r => r._id !== requestId))
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to approve request")
        } finally {
            setProcessingId(null)
        }
    }

    const handleReject = async (requestId) => {
        const reason = window.prompt("Enter rejection reason (optional):")
        if (reason === null) return // Cancelled prompt
        
        try {
            setProcessingId(requestId)
            const response = await adminAPI.rejectDiningRequest(requestId, reason)
            if (response.data.success) {
                toast.success("Request rejected")
                setRequests(requests.filter(r => r._id !== requestId))
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to reject request")
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
                            <UtensilsCrossed className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-medium text-neutral-900">Dining category requests</h1>
                            <p className="text-sm text-neutral-600 mt-1">Review and approve restaurant dining setting updates</p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2 max-w-2xl">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                        <Button variant="link" onClick={fetchRequests} className="text-red-800 font-medium p-0 ml-auto">Retry</Button>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl border border-dashed border-neutral-300">
                        <Loader2 className="w-10 h-10 animate-spin text-plum-600 mb-4" />
                        <p className="text-neutral-500 font-medium">Loading pending requests...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl border border-dashed border-neutral-300">
                        <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-neutral-400" />
                        </div>
                        <h3 className="text-lg font-medium text-neutral-900">No pending requests</h3>
                        <p className="text-neutral-500 text-center max-w-xs mt-1">All dining settings updates have been processed</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {requests.map((request) => (
                            <div key={request._id} className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
                                <div className="p-6">
                                    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                                        <div className="flex items-center gap-4">
                                            {request.restaurant?.profileImage?.url ? (
                                                <img 
                                                    src={request.restaurant.profileImage.url} 
                                                    alt={request.restaurant.name} 
                                                    className="w-14 h-14 rounded-lg object-cover border border-neutral-100" 
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-lg bg-neutral-100 flex items-center justify-center border bg-neutral-100 text-neutral-500">
                                                    <UtensilsCrossed className="w-6 h-6" />
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="text-lg font-medium text-neutral-900">{request.restaurant?.name || "Unknown Restaurant"}</h3>
                                                <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    {request.restaurant?.address || "No address provided"}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5 py-1 px-3">
                                            <Clock className="w-3.5 h-3.5" />
                                            Pending
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-neutral-400">Dining status</p>
                                            <p className="font-medium text-neutral-900 flex items-center gap-2">
                                                {request.requestedSettings?.isEnabled ? (
                                                    <><CheckCircle2 className="w-4 h-4 text-green-500" /> Enabled</>
                                                ) : (
                                                    <><XCircle className="w-4 h-4 text-neutral-400" /> Disabled</>
                                                )}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-neutral-400">Requested category</p>
                                            <p className="font-medium text-neutral-900">
                                                {(() => {
                                                    const raw = request.requestedSettings?.diningType
                                                    if (!raw) return "Not specified"
                                                    // Handle array or string by converting to string and splitting everything
                                                    const allSlugs = String(raw).split(",").map(s => s.trim())
                                                    return [...new Set(allSlugs)].filter(Boolean).join(", ")
                                                })()}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-neutral-400">Max guests limit</p>
                                            <p className="font-medium text-neutral-900">{request.requestedSettings?.maxGuests || "No limit"} Guests</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-neutral-100">
                                        <div className="text-sm text-neutral-500">
                                            Requested on: {new Date(request.createdAt).toLocaleString()}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Button 
                                                variant="outline" 
                                                onClick={() => handleReject(request._id)}
                                                disabled={processingId === request._id}
                                                className="border-neutral-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors font-medium"
                                            >
                                                {processingId === request._id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
                                            </Button>
                                            <Button 
                                                onClick={() => handleApprove(request._id)}
                                                disabled={processingId === request._id}
                                                className="bg-[#0a4d2b] hover:bg-[#06381e] text-white font-medium px-6 shadow-sm shadow-emerald-200 transition-colors"
                                            >
                                                {processingId === request._id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve Changes"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
