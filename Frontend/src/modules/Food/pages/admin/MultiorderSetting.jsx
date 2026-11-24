import { useCallback, useEffect, useRef, useState } from "react"
import { Package, Loader2, Bike } from "lucide-react"
import { adminAPI } from "@food/api"
import { toast } from "sonner"
const debugError = (...args) => {}


export default function MultiorderSetting() {
  const [loading, setLoading] = useState(true)
  const [savingConcurrent, setSavingConcurrent] = useState(false)
  const [maxConcurrentOrders, setMaxConcurrentOrders] = useState("1")
  const isMountedRef = useRef(true)

  const fetchSetting = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true)
      }
      const response = await adminAPI.getDeliveryCashLimit()
      const data = response?.data?.data || response?.data || {}
      const maxOrders = data.maxConcurrentOrders ?? 1
      if (!isMountedRef.current) return
      setMaxConcurrentOrders(maxOrders !== undefined && maxOrders !== null ? String(maxOrders) : "1")
    } catch (error) {
      debugError("Error fetching multiorder setting:", error)
      if (!isMountedRef.current) return
      if (!silent) {
        toast.error(error.response?.data?.message || "Failed to load multiorder setting")
      }
      setMaxConcurrentOrders("1")
    } finally {
      if (!silent && isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  const saveConcurrentLimit = async () => {
    const value = Number(maxConcurrentOrders)
    if (!Number.isFinite(value) || value < 1 || value > 5) {
      toast.error("Concurrent order limit must be between 1 and 5")
      return
    }

    try {
      setSavingConcurrent(true)
      const response = await adminAPI.updateDeliveryCashLimit({
        maxConcurrentOrders: value,
      })
      const saved =
        response?.data?.data?.maxConcurrentOrders ??
        response?.data?.maxConcurrentOrders ??
        value
      setMaxConcurrentOrders(String(saved))
      toast.success("Concurrent order limit updated successfully")
      await fetchSetting({ silent: true })
    } catch (error) {
      debugError("Error saving concurrent order limit:", error)
      toast.error(error.response?.data?.message || "Failed to update concurrent order limit")
    } finally {
      setSavingConcurrent(false)
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    fetchSetting()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchSetting])

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-5 h-5 text-neutral-700" />
            <h1 className="text-2xl font-medium text-neutral-900">Multiorder setting</h1>
          </div>

          <p className="text-sm text-neutral-600 mb-6">
            Configure how many orders a delivery partner can handle at the same time. This is a
            <strong> global setting</strong> and applies to all delivery partners.
          </p>

          <div className="rounded-xl border border-neutral-200 p-5 sm:p-6 bg-neutral-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                <Bike className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-medium text-neutral-900">
                  Delivery boy order limit
                </h2>
                <p className="text-xs text-[#0a4d2b]">Global setting · applies to all delivery partners</p>
              </div>
            </div>

            <p className="text-sm text-neutral-900 mb-4">
              Maximum number of orders a delivery partner can accept and work on at the same time.
              Allowed range is <strong>1 to 5</strong>.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-stretch">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-neutral-900">
                  Order limit per delivery boy
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="1"
                  value={maxConcurrentOrders}
                  onChange={(e) => setMaxConcurrentOrders(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                  placeholder={loading ? "Loading..." : "e.g., 3"}
                  disabled={loading || savingConcurrent}
                />
                {loading && (
                  <p className="mt-1 flex items-center gap-2 text-xs text-[#0a4d2b]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading current setting...
                  </p>
                )}
              </div>
              <button
                onClick={saveConcurrentLimit}
                disabled={loading || savingConcurrent}
                className="flex items-center justify-center gap-2 self-end rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingConcurrent && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
