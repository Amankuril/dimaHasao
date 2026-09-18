import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Clock3, ShieldCheck, XCircle, AlertTriangle, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@food/components/ui/button"
import { restaurantAPI } from "@food/api"
import {
  clearRestaurantPendingPhone,
  getModuleToken,
  getRestaurantPendingPhone,
  clearModuleAuth,
} from "@food/utils/auth"
import { clearOnboardingFromLocalStorage } from "@food/utils/onboardingUtils"
import {
  enablePendingVerificationPush,
  getWebNotificationPermission,
  isNativeAppWebView,
  persistModuleFcmToken,
  setupPendingVerificationPushListeners,
  syncNativeAppPushToken,
  syncPendingPartnerFcmQuick,
} from "@food/utils/firebaseMessaging"

export default function VerificationPending() {
  const navigate = useNavigate()
  const location = useLocation()
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [pushPermission, setPushPermission] = useState(() => getWebNotificationPermission())
  const [enablingPush, setEnablingPush] = useState(false)

  const [localStatus, setLocalStatus] = useState(() => {
    if (location.state?.isDisabled) {
      return "banned"
    }
    if (location.state?.isRejected !== undefined) {
      return location.state.isRejected ? "rejected" : "pending"
    }
    return localStorage.getItem("restaurant_pendingStatus") || "pending"
  })

  const [localMessage, setLocalMessage] = useState(() => {
    if (location.state?.message) {
      return location.state.message
    }
    return localStorage.getItem("restaurant_pendingMessage") || ""
  })

  const pendingPhone = useMemo(() => {
    return (
      location.state?.phone ||
      getRestaurantPendingPhone() ||
      ""
    )
  }, [location.state?.phone])

  const parsedMessage = useMemo(() => {
    if (localStatus === "banned") {
      return {
        text: "Your restaurant has been disabled.",
        reason: "Disabled by admin"
      }
    }

    if (!localMessage) {
      return { text: "Your restaurant registration has been rejected. Please contact support.", reason: "" }
    }

    const parts = localMessage.split(/Reason:\s*/i)
    if (parts.length > 1) {
      return {
        text: parts[0].trim(),
        reason: parts[1].trim()
      }
    }
    const colonParts = localMessage.split(/:\s*/)
    if (colonParts.length > 1 && colonParts[0].toLowerCase().includes("rejected")) {
      return {
        text: colonParts[0].trim() + ".",
        reason: colonParts[1].trim()
      }
    }
    return {
      text: localMessage,
      reason: ""
    }
  }, [localMessage, localStatus])

  const isDisabledByAdmin = localStatus === "banned"

  const syncFcmBeforeLeave = () => {
    const phone = pendingPhone || getRestaurantPendingPhone() || ""
    if (phone) syncPendingPartnerFcmQuick("restaurant", phone)
  }

  useEffect(() => {
    let cancelled = false

    const syncPushToken = async () => {
      const phone =
        pendingPhone ||
        getRestaurantPendingPhone() ||
        ""

      await setupPendingVerificationPushListeners("restaurant")

      if (cancelled) return

      if (phone) {
        if (isNativeAppWebView()) {
          void syncNativeAppPushToken("restaurant", phone)
        } else {
          syncPendingPartnerFcmQuick("restaurant", phone)
        }
      }

      if (getModuleToken("restaurant")) {
        void persistModuleFcmToken("restaurant").catch(() => {})
      }

      if (!cancelled) {
        setPushPermission(getWebNotificationPermission())
      }
    }

    void syncPushToken()

    return () => {
      cancelled = true
    }
  }, [pendingPhone])

  const handleEnablePush = async () => {
    const phone = pendingPhone || getRestaurantPendingPhone() || ""
    if (!phone || enablingPush) return
    setEnablingPush(true)
    try {
      const saved = await enablePendingVerificationPush("restaurant", phone)
      setPushPermission(getWebNotificationPermission())
      if (saved) {
        toast.success("Push notifications enabled")
      } else if (getWebNotificationPermission() === "denied") {
        toast.error("Notifications blocked. Enable them in browser settings.")
      }
    } finally {
      setEnablingPush(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const checkApprovalStatus = async () => {
      const token = getModuleToken("restaurant")
      if (!token) {
        if (!cancelled) setCheckingStatus(false)
        return
      }

      try {
        const response = await restaurantAPI.getCurrentRestaurant()
        const restaurant =
          response?.data?.data?.restaurant ||
          response?.data?.restaurant ||
          response?.data?.data?.user ||
          response?.data?.user

        if (cancelled) return

        const status = String(restaurant?.status || "").toLowerCase()

        // Sync back to stored user status to keep ProtectedRoute up-to-date
        const storedUser = localStorage.getItem("restaurant_user")
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser)
            parsed.status = status
            if (restaurant?.rejectionReason) {
              parsed.rejectionReason = restaurant.rejectionReason
            }
            localStorage.setItem("restaurant_user", JSON.stringify(parsed))
          } catch (e) {}
        }

        if (status === "approved") {
          clearRestaurantPendingPhone()
          localStorage.removeItem("restaurant_pendingStatus")
          localStorage.removeItem("restaurant_pendingMessage")
          navigate("/food/restaurant", { replace: true })
          return
        } else if (status === "banned") {
          setLocalStatus("banned")
          const msg = "Your restaurant has been disabled. Reason: Disabled by admin"
          setLocalMessage(msg)
          localStorage.setItem("restaurant_pendingStatus", "banned")
          localStorage.setItem("restaurant_pendingMessage", msg)
        } else if (status === "rejected") {
          setLocalStatus("rejected")
          const msg = restaurant.rejectionReason
            ? `Your restaurant registration has been rejected. Reason: ${restaurant.rejectionReason}`
            : "Your restaurant registration has been rejected. Please contact support."
          setLocalMessage(msg)
          localStorage.setItem("restaurant_pendingStatus", "rejected")
          localStorage.setItem("restaurant_pendingMessage", msg)
        } else if (status === "pending") {
          setLocalStatus("pending")
          localStorage.setItem("restaurant_pendingStatus", "pending")
        }
      } catch (_) {
        // Keep the pending screen visible if the status check fails.
      } finally {
        if (!cancelled) setCheckingStatus(false)
      }
    }

    checkApprovalStatus()

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        checkApprovalStatus()
      }
    }

    window.addEventListener("focus", handleVisibilityOrFocus)
    document.addEventListener("visibilitychange", handleVisibilityOrFocus)

    return () => {
      cancelled = true
      window.removeEventListener("focus", handleVisibilityOrFocus)
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus)
    }
  }, [navigate])

  return (
    <div className={`min-h-[100dvh] overflow-y-auto overscroll-contain px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10 transition-all duration-300 ${isDisabledByAdmin
        ? "bg-[#1b0b09]"
        : "bg-[#04190c]"
      }`}>
      <div className="mx-auto flex w-full max-w-md min-h-[calc(100dvh-2rem)] flex-col justify-center py-2 sm:py-0">
        <div className="w-full rounded-[20px] sm:rounded-[28px] border border-[#caa83e]/30 bg-[#051f11] p-5 sm:p-8 shadow-[0_28px_80px_rgba(0,0,0,0.65)]">
          <div className="mb-4 sm:mb-6 flex items-center justify-center">
            {localStatus === "rejected" || localStatus === "banned" ? (
              <div className="flex items-center justify-center my-2 select-none">
                {/* Normal parent container to prevent clipping of absolute children */}
                <div className="relative flex items-center" style={{ height: "36px" }}>
                  {/* The red arrow banner */}
                  <div
                    className="bg-[#E51A21] text-white pl-8 pr-10 py-1.5 rounded-l-md font-black uppercase tracking-widest text-[13px] flex items-center justify-center shadow-[0_4px_10px_rgba(229,26,33,0.3)]"
                    style={{
                      clipPath: "polygon(0% 0%, 82% 0%, 100% 50%, 82% 100%, 0% 100%)",
                      height: "100%",
                      fontFamily: "'Outfit', 'Poppins', sans-serif"
                    }}
                  >
                    <span className="font-extrabold tracking-[0.2em] text-[13px] leading-none">
                      {isDisabledByAdmin ? "DISABLED" : "REJECTED"}
                    </span>
                  </div>

                  {/* Diamond shape on the left - overlaps without clipping! */}
                  <div
                    className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-8 h-8 bg-[#E51A21] border-[3px] border-[#051f11] rotate-45 flex items-center justify-center shadow-lg"
                    style={{
                      zIndex: 10
                    }}
                  >
                    {/* White X rotated back */}
                    <X className="w-4 h-4 text-white" style={{ transform: "rotate(-45deg)" }} strokeWidth={4} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#caa83e]/15 text-[#caa83e]">
                <Clock3 className="h-8 w-8" />
              </div>
            )}
          </div>

          <div className="mb-4 sm:mb-6 text-center">
            {localStatus === "rejected" || localStatus === "banned" ? (
              <>
                <h1 className="text-xl font-extrabold text-[#f4efe2]">
                  {isDisabledByAdmin ? "Restaurant Disabled" : "Registration Rejected"}
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#9fb3a4]">
                  {isDisabledByAdmin ? "Your restaurant has been disabled." : parsedMessage.text}
                </p>
                {parsedMessage.reason && !isDisabledByAdmin && (
                  <div className="mt-4 text-sm font-semibold text-left p-3.5 rounded-2xl border border-red-400/30 bg-red-500/10">
                    <span className="text-red-300 block text-xs uppercase tracking-widest font-extrabold mb-1">
                      Reason for Rejection:
                    </span>
                    <span className="text-[#f4efe2] font-medium leading-relaxed block">
                      {parsedMessage.reason}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#caa83e]">
                  Verification Pending
                </p>
                <h1 className="mx-auto max-w-[19rem] text-center text-[15px] font-extrabold leading-5 text-[#f4efe2] sm:text-xl sm:leading-tight">
                  <span className="block">Your restaurant is</span>
                  <span className="block">under{"\u00A0"}review</span>
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#9fb3a4]">
                  Admin received your onboarding details successfully. Our team will verify your restaurant and activate your dashboard once approval is complete.
                </p>
              </>
            )}
            {checkingStatus ? (
              <p className="mt-3 min-h-[1rem] text-xs font-medium uppercase tracking-[0.18em] text-[#5d7264]">
                Checking latest approval status...
              </p>
            ) : (
              <div className="mt-3 min-h-[1rem]" aria-hidden="true" />
            )}
          </div>

          <div className="mb-4 sm:mb-6 rounded-2xl border border-[#caa83e]/20 bg-[#02130a] p-3.5 sm:p-4">
            <div className="flex items-start gap-3">
              {localStatus === "rejected" || localStatus === "banned" ? (
                <>
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-red-300" />
                  <div className="text-sm text-[#9fb3a4]">
                    <p className="font-semibold text-[#f4efe2]">What to do next</p>
                    <p className="mt-1">
                      {isDisabledByAdmin
                        ? "Please reach out to support for more details or assistance regarding your account status."
                        : "Please review the reason above or reach out to support. You can register a new account if you need to submit new details."}
                    </p>
                    {pendingPhone ? (
                      <p className="mt-2 text-[#5d7264]">
                        Registered phone: <span className="font-medium text-[#9fb3a4]">{pendingPhone}</span>
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-[#caa83e]" />
                  <div className="text-sm text-[#9fb3a4]">
                    <p className="font-semibold text-[#f4efe2]">What happens next</p>
                    <p className="mt-1">We will notify you by email and push notification once verification is approved.</p>
                    {pendingPhone ? (
                      <p className="mt-2 text-[#5d7264]">
                        Registered phone: <span className="font-medium text-[#9fb3a4]">{pendingPhone}</span>
                      </p>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {isDisabledByAdmin ? (
              <>
                <Button
                  className="h-12 w-full rounded-xl text-base font-semibold bg-[#caa83e] hover:bg-[#e8c558] text-[#04190c] shadow-[0_10px_24px_rgba(202,168,62,0.25)] active:scale-[0.98] transition-all duration-300"
                  onClick={() => navigate("/food/restaurant/help-content")}
                >
                  Contact Support
                </Button>
                <Button
                  variant="outline"
                  className="h-12 w-full rounded-xl text-base font-semibold border border-[#caa83e]/35 bg-transparent text-[#9fb3a4] hover:border-[#caa83e] hover:text-[#f4efe2] active:scale-[0.98] transition-all duration-300"
                  onClick={() => {
                    syncFcmBeforeLeave()
                    clearModuleAuth("restaurant")
                    clearRestaurantPendingPhone()
                    localStorage.removeItem("restaurant_pendingStatus")
                    localStorage.removeItem("restaurant_pendingMessage")
                    navigate("/food/restaurant/login", { replace: true })
                  }}
                >
                  Back to login
                </Button>
              </>
            ) : localStatus === "rejected" ? (
              <>
                <Button
                  className="h-12 w-full rounded-xl text-base font-semibold transition-all duration-300 bg-[#caa83e] hover:bg-[#e8c558] text-[#04190c] active:scale-[0.98]"
                  onClick={() => {
                    clearOnboardingFromLocalStorage()
                    localStorage.removeItem("restaurant_pendingStatus")
                    localStorage.removeItem("restaurant_pendingMessage")
                    navigate("/food/restaurant/onboarding?step=1", { replace: true })
                  }}
                >
                  Re-apply
                </Button>
                <Button
                  variant="outline"
                  className="h-12 w-full rounded-xl text-base font-semibold border border-[#caa83e]/35 bg-transparent text-[#9fb3a4] hover:border-[#caa83e] hover:text-[#f4efe2] active:scale-[0.98] transition-all duration-300"
                  onClick={() => {
                    syncFcmBeforeLeave()
                    clearModuleAuth("restaurant")
                    clearRestaurantPendingPhone()
                    localStorage.removeItem("restaurant_pendingStatus")
                    localStorage.removeItem("restaurant_pendingMessage")
                    navigate("/food/restaurant/login", { replace: true })
                  }}
                >
                  Back to login
                </Button>
              </>
            ) : (
              <>
                {pushPermission !== "granted" && pushPermission !== "unsupported" && !isNativeAppWebView() ? (
                  <Button
                    className="h-12 w-full rounded-xl text-base font-semibold bg-[#0d6b39] hover:bg-[#108045] text-[#f4efe2] active:scale-[0.98] transition-all duration-300"
                    disabled={enablingPush}
                    onClick={handleEnablePush}
                  >
                    {enablingPush ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enabling...
                      </span>
                    ) : (
                      "Allow Mail Notifications"
                    )}
                  </Button>
                ) : null}
                <Button
                  className="h-12 w-full rounded-xl text-base font-semibold transition-all duration-300 bg-[#caa83e] hover:bg-[#e8c558] text-[#04190c] active:scale-[0.98]"
                  onClick={() => {
                    syncFcmBeforeLeave()
                    clearModuleAuth("restaurant")
                    clearRestaurantPendingPhone()
                    localStorage.removeItem("restaurant_pendingStatus")
                    localStorage.removeItem("restaurant_pendingMessage")
                    navigate("/food/restaurant/login", { replace: true })
                  }}
                >
                  Back to login
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}







