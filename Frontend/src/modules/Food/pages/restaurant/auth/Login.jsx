import { useEffect, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Pencil, X, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { restaurantAPI } from "@food/api"
import {
  setAuthData as setRestaurantAuthData,
  setRestaurantPendingPhone,
} from "@food/utils/auth"
import { clearOnboardingFromLocalStorage, clearAllFilesFromDB, checkOnboardingStatus, isRestaurantOnboardingComplete } from "@/modules/Food/utils/onboardingUtils"
import { collectFcmTokenFast, persistModuleFcmToken } from "@food/utils/firebaseMessaging"
import DimaHasaoAuthShell, {
  authFieldClass,
  authLabelClass,
  authInputClass,
  authButtonClass,
} from "@/shared/components/auth/DimaHasaoAuthShell"
import { RESTAURANT_BRAND_LOGO } from "@/shared/constants/brandLogo"
import AuthLegalLinks from "@/shared/components/auth/AuthLegalLinks"

const DEFAULT_COUNTRY_CODE = "+91"

export default function RestaurantLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const isOtpStep = location.pathname.endsWith("/otp")

  // Cleanup onboarding on initial mount only
  useEffect(() => {
    clearOnboardingFromLocalStorage()
    clearAllFilesFromDB()
  }, [])

  // Step 1 States
  const phoneInputRef = useRef(null)
  const defaultTestPhone =
    import.meta.env.VITE_USE_DEFAULT_TEST_PHONE === "true"
      ? String(import.meta.env.VITE_DEFAULT_TEST_PHONE || "").replace(/\D/g, "").slice(0, 10)
      : ""

  const [phone, setPhone] = useState(() => {
    try {
      if (sessionStorage.getItem("restaurantClearLoginPhone") === "1") {
        sessionStorage.removeItem("restaurantClearLoginPhone")
        sessionStorage.removeItem("restaurantLoginPhone")
        // return ""
        return defaultTestPhone
      }
      // return sessionStorage.getItem("restaurantLoginPhone") || ""
      return sessionStorage.getItem("restaurantLoginPhone") || defaultTestPhone
    } catch {
      // return ""
      return defaultTestPhone
    }
  })
  const [loading, setLoading] = useState(false)
  const submitting = useRef(false)

  // Step 2 States
  const [otp, setOtp] = useState(["", "", "", ""])
  const [otpError, setOtpError] = useState("")
  const [resendTimer, setResendTimer] = useState(0)
  const [blockTimer, setBlockTimer] = useState(0)
  const [authData, setAuthData] = useState(null)
  const [contactInfo, setContactInfo] = useState("")
  const [showRestorePopup, setShowRestorePopup] = useState(false)
  const [deletedAccountData, setDeletedAccountData] = useState(null)
  const inputRefs = useRef([])
  const hasSubmittedRef = useRef(false)
  const isSuccessRef = useRef(false)
  // iOS only opens the soft-keyboard from a focus() that happens *inside* a
  // user gesture. This hidden input is focused synchronously on the "Log in"
  // tap so the keyboard opens, then focus is transferred to the OTP boxes once
  // they mount (focus transfer keeps the keyboard up on iOS).
  const focusKeeperRef = useRef(null)
  const keyboardPrimedRef = useRef(false)

  const clearPersistedLoginPhone = () => {
    try {
      sessionStorage.removeItem("restaurantLoginPhone")
      sessionStorage.setItem("restaurantClearLoginPhone", "1")
    } catch {
      // ignore
    }
    setPhone("")
  }

  const getBlockKey = (phoneStr) => {
    const clean = phoneStr?.replace(/\D/g, "") || ""
    return clean ? `restaurant_block_expires_at_${clean}` : "restaurant_block_expires_at"
  }

  const getResendKey = (phoneStr) => {
    const clean = phoneStr?.replace(/\D/g, "") || ""
    return clean ? `restaurant_resend_expires_at_${clean}` : "restaurant_resend_expires_at"
  }

  // Handle route changes between /login and /otp
  useEffect(() => {
    if (!isOtpStep) {
      setOtp(["", "", "", ""])
      setOtpError("")
      return
    }

    const stored = sessionStorage.getItem("restaurantAuthData")
    let currentPhone = ""
    if (stored) {
      const data = JSON.parse(stored)
      setAuthData(data)

      if (data.method === "email" && data.email) {
        setContactInfo(data.email)
        currentPhone = data.email
      } else if (data.phone) {
        const phoneMatch = data.phone?.match(/(\+\d+)\s*(.+)/)
        let formatted = ""
        if (phoneMatch) {
          formatted = `${phoneMatch[1]} ${phoneMatch[2].replace(/\D/g, "")}`
        } else {
          formatted = data.phone || ""
        }
        setContactInfo(formatted)
        currentPhone = formatted
      }
    } else {
      navigate("/food/restaurant/login", { replace: true })
      return
    }

    const blockKey = getBlockKey(currentPhone)
    const resendKey = getResendKey(currentPhone)

    // Resume block timer
    const savedBlockExpiry = sessionStorage.getItem(blockKey)
    if (savedBlockExpiry) {
      const remaining = Math.max(0, Math.floor((parseInt(savedBlockExpiry) - Date.now()) / 1000))
      if (remaining > 0) {
        setBlockTimer(remaining)
      } else {
        sessionStorage.removeItem(blockKey)
      }
    } else if (location.state?.initialBlockMins) {
      const seconds = Math.ceil(location.state.initialBlockMins * 60)
      setBlockTimer(seconds)
      sessionStorage.setItem(blockKey, (Date.now() + (seconds * 1000)).toString())
    }

    // Resume resend timer
    const savedResendExpiry = sessionStorage.getItem(resendKey)
    if (savedResendExpiry) {
      const remaining = Math.max(0, Math.floor((parseInt(savedResendExpiry) - Date.now()) / 1000))
      if (remaining > 0) {
        setResendTimer(remaining)
      } else {
        sessionStorage.removeItem(resendKey)
      }
    } else {
      setResendTimer(59)
      sessionStorage.setItem(resendKey, (Date.now() + (59 * 1000)).toString())
    }
  }, [isOtpStep, navigate, location.state])

  // OTP Timers
  useEffect(() => {
    if (resendTimer <= 0) return
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendTimer])

  useEffect(() => {
    if (blockTimer <= 0) return
    const timer = setInterval(() => {
      setBlockTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [blockTimer])

  // Autofocus first OTP box + open mobile keyboard automatically
  useEffect(() => {
    if (isOtpStep) {
      const focusFirst = () => {
        const el = inputRefs.current[0]
        if (el) {
          el.focus()
          // In mobile WebView the soft keyboard often won't open on a
          // programmatic focus alone, so also trigger a click to force it.
          el.click()
        }
      }
      // If the keyboard was primed on the "Log in" tap (iOS), transfer focus
      // ASAP so the already-open keyboard stays up instead of closing.
      if (keyboardPrimedRef.current) {
        keyboardPrimedRef.current = false
        requestAnimationFrame(focusFirst)
        return
      }
      const timer = setTimeout(focusFirst, 250)
      return () => clearTimeout(timer)
    }
  }, [isOtpStep])

  const validatePhone = (num) => {
    const digits = num.replace(/\D/g, "")
    if (digits.length !== 10) return false
    return ["6", "7", "8", "9"].includes(digits[0])
  }

  // Action Step 1: Send OTP
  const handleSendOTP = async (e) => {
    if (e) e.preventDefault()
    if (!validatePhone(phone)) {
      toast.error("Please enter a valid 10-digit mobile number")
      return
    }
    if (submitting.current) return
    // Prime the keyboard inside the tap gesture so iOS keeps it open while we
    // navigate to the OTP step (Android focuses fine on mount).
    if (focusKeeperRef.current) {
      focusKeeperRef.current.focus()
      keyboardPrimedRef.current = true
    }
    submitting.current = true
    setLoading(true)

    const fullPhone = `${DEFAULT_COUNTRY_CODE} ${phone}`.trim()

    try {
      await restaurantAPI.sendOTP(fullPhone, "login")
      const authData = {
        method: "phone",
        phone: fullPhone,
        isSignUp: false,
        module: "restaurant",
      }
      sessionStorage.setItem("restaurantAuthData", JSON.stringify(authData))
      sessionStorage.setItem("restaurantLoginPhone", phone)
      
      // Navigate to /otp - Since both routes render RestaurantLogin,
      // it transitions inline without unmounting the parent waves!
      navigate("/food/restaurant/otp")
    } catch (apiErr) {
      const msg = apiErr?.response?.data?.error || apiErr?.response?.data?.message || apiErr?.message || "Failed to send OTP."
      const lowerMsg = msg.toLowerCase()
      const isBlocked = lowerMsg.includes("blocked") || 
                        lowerMsg.includes("too many attempts") || 
                        lowerMsg.includes("try again after")

      if (isBlocked) {
        let totalMins = 3
        const timeMatch = msg.match(/(\d+)(?::(\d+))?/)
        if (timeMatch) {
          const mins = parseInt(timeMatch[1])
          const secs = timeMatch[2] ? parseInt(timeMatch[2]) / 60 : 0
          totalMins = mins + secs
        }

        const authData = {
          method: "phone",
          phone: fullPhone,
          isSignUp: false,
          module: "restaurant",
        }
        sessionStorage.setItem("restaurantAuthData", JSON.stringify(authData))
        sessionStorage.setItem("restaurantLoginPhone", phone)
        navigate("/food/restaurant/otp", { state: { initialBlockMins: totalMins } })
        return
      }
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  // Action Step 2: Verify OTP
  const handleVerify = async (otpValue = null, confirmAction = null) => {
    const code = otpValue || otp.join("")

    if (code.length !== 4) {
      toast.error("Please enter the complete 4-digit code")
      hasSubmittedRef.current = false
      return
    }

    if (isSuccessRef.current || loading || blockTimer > 0) return
    if (!confirmAction && hasSubmittedRef.current) return

    setLoading(true)
    if (!confirmAction) hasSubmittedRef.current = true

    try {
      if (!authData) throw new Error("Session expired. Please login again.")

      const phoneVal = authData.phone
      const purpose = authData.isSignUp ? "register" : "login"

      const { fcmToken, platform } = await collectFcmTokenFast("restaurant")

      const response = await restaurantAPI.verifyOTP(
        phoneVal,
        code,
        purpose,
        null,
        authData.email,
        fcmToken,
        platform,
        confirmAction,
      )
      const data = response?.data?.data || response?.data

      if (data.deletedAccountFound) {
        setDeletedAccountData(data)
        setShowRestorePopup(true)
        setLoading(false)
      } else if (data.pendingApproval === true) {
        isSuccessRef.current = true
        sessionStorage.removeItem("restaurantAuthData")
        sessionStorage.removeItem(getBlockKey(phoneVal))
        sessionStorage.removeItem(getResendKey(phoneVal))
        setRestaurantPendingPhone(phoneVal)
        const isRejected = Boolean(data.isRejected)
        const statusVal = isRejected ? "rejected" : "pending"
        localStorage.setItem("restaurant_pendingStatus", statusVal)
        localStorage.setItem("restaurant_pendingMessage", data.message || "")
        setShowRestorePopup(false)
        setLoading(false)
        navigate("/food/restaurant/pending-verification", {
          replace: true,
          state: {
            phone: phoneVal || "",
            isRejected,
            isDisabled: false,
            message: data.message,
          },
        })
      } else if (data.nextStep === 'onboarding') {
        isSuccessRef.current = true
        setRestaurantPendingPhone(phoneVal)
        sessionStorage.removeItem("restaurantAuthData")
        sessionStorage.removeItem(getBlockKey(phoneVal))
        sessionStorage.removeItem(getResendKey(phoneVal))
        setShowRestorePopup(false)
        window.location.replace("/food/restaurant/onboarding")
      } else {
        isSuccessRef.current = true
        const accessToken = data.accessToken
        const restaurant = data.restaurant || data.user
        const status = String(restaurant?.status || "").toLowerCase()

        if (status && status !== "approved") {
          sessionStorage.removeItem("restaurantAuthData")
          sessionStorage.removeItem(getBlockKey(phoneVal))
          sessionStorage.removeItem(getResendKey(phoneVal))
          setRestaurantPendingPhone(phoneVal)
          const isRejected = status === "rejected"
          const isDisabled = status === "banned" || status === "deleted"
          const statusVal = isDisabled ? "banned" : (isRejected ? "rejected" : "pending")
          localStorage.setItem("restaurant_pendingStatus", statusVal)
          localStorage.setItem(
            "restaurant_pendingMessage",
            isRejected
              ? (restaurant?.rejectionReason
                  ? `Your restaurant registration has been rejected. Reason: ${restaurant.rejectionReason}`
                  : "Your restaurant registration has been rejected. Please contact support.")
              : "Your restaurant registration is pending approval.",
          )
          setShowRestorePopup(false)
          setLoading(false)
          navigate("/food/restaurant/pending-verification", {
            replace: true,
            state: {
              phone: phoneVal || "",
              isRejected,
              isDisabled,
            },
          })
          return
        }

        setRestaurantAuthData("restaurant", accessToken, restaurant, data?.refreshToken)
        window.dispatchEvent(new Event("restaurantAuthChanged"))
        try {
          await persistModuleFcmToken("restaurant", { fcmToken, platform })
        } catch {}
        sessionStorage.removeItem("restaurantAuthData")
        sessionStorage.removeItem(getBlockKey(phoneVal))
        sessionStorage.removeItem(getResendKey(phoneVal))
        setShowRestorePopup(false)

        if (authData?.isSignUp) {
          window.location.replace("/food/restaurant/onboarding")
        } else {
          const onboardingComplete = isRestaurantOnboardingComplete(restaurant)
          if (!onboardingComplete) {
            const incompleteStep = await checkOnboardingStatus()
            if (incompleteStep) {
              window.location.replace(`/food/restaurant/onboarding?step=${incompleteStep}`)
              return
            }
          }
          window.location.replace("/food/restaurant")
        }
      }
    } catch (err) {
      const message = err?.response?.data?.error || err?.response?.data?.message || "Invalid OTP. Please try again."
      setOtp(["", "", "", ""])

      const isBlocked = message.toLowerCase().includes("blocked") || 
                        message.toLowerCase().includes("too many attempts") || 
                        message.toLowerCase().includes("try again after")

      if (isBlocked) {
        let totalSeconds = 180
        const timeMatch = message.match(/(\d+)(?::(\d+))?/)
        if (timeMatch) {
          const mins = parseInt(timeMatch[1])
          const secs = timeMatch[2] ? parseInt(timeMatch[2]) : 0
          totalSeconds = (mins * 60) + secs
        }
        setBlockTimer(totalSeconds)
        sessionStorage.setItem(getBlockKey(authData?.phone || ""), (Date.now() + (totalSeconds * 1000)).toString())
      } else {
        if (/pending approval|rejected|disabled|banned/i.test(message)) {
          const pendingPhone = authData?.phone || authData?.email || contactInfo
          setRestaurantPendingPhone(pendingPhone)
          
          const isRejected = /rejected/i.test(message)
          const isDisabled = /disabled|banned/i.test(message)
          const statusVal = isDisabled ? "banned" : (isRejected ? "rejected" : "pending")
          
          localStorage.setItem("restaurant_pendingStatus", statusVal)
          localStorage.setItem("restaurant_pendingMessage", message)
          
          navigate("/food/restaurant/pending-verification", {
            replace: true,
            state: { 
              phone: pendingPhone || "",
              isRejected: isRejected,
              isDisabled: isDisabled,
              message: message 
            },
          })
          return
        }

        if (/invalid/i.test(message)) {
          setOtpError("Invalid OTP")
        } else {
          toast.error(message)
        }
      }
      hasSubmittedRef.current = false
      setLoading(false)
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 50)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0 || blockTimer > 0) return
    setLoading(true)
    try {
      const purpose = authData.isSignUp ? "register" : "login"
      await restaurantAPI.sendOTP(authData.phone, purpose, authData.email)
      setResendTimer(59)
      sessionStorage.setItem(getResendKey(authData.phone), (Date.now() + (59 * 1000)).toString())
      toast.success("OTP resent successfully.")
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to resend code")
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreAction = async (action) => {
    const code = otp.join("")
    await handleVerify(code, action)
  }

  const handleChange = (index, value) => {
    if (index === 0 && value) {
      setOtpError("")
    }

    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 4 - index).split("")
      if (digits.length > 0) {
        const newOtp = [...otp]
        digits.forEach((digit, i) => {
          if (index + i < 4) {
            newOtp[index + i] = digit
          }
        })
        setOtp(newOtp)
        inputRefs.current[Math.min(3, index + digits.length)]?.focus()
      }
      return
    }

    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
        const newOtp = [...otp]
        newOtp[index - 1] = ""
        setOtp(newOtp)
      }
    }
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, "").slice(0, 4).split("")
        const newOtp = [...otp]
        digits.forEach((digit, i) => {
          if (i < 4) newOtp[i] = digit
        })
        setOtp(newOtp)
        inputRefs.current[Math.min(digits.length, 3)]?.focus()
      })
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text")
    const digits = pastedData.replace(/\D/g, "").slice(0, 4).split("")
    const newOtp = [...otp]
    digits.forEach((digit, i) => {
      if (i < 4) newOtp[i] = digit
    })
    setOtp(newOtp)
    inputRefs.current[Math.min(digits.length, 3)]?.focus()
  }

  const formatResendTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  const isOtpComplete = otp.every((digit) => digit !== "")

  // When an input is focused the mobile soft-keyboard opens and shrinks the
  // viewport. Scroll the focused field into the centre of the remaining space
  // so the submit button / logo never get hidden behind the keyboard.
  const handleInputFocusScroll = (e) => {
    const el = e.currentTarget
    setTimeout(() => {
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 300)
  }

  return (
    <DimaHasaoAuthShell
      logo={RESTAURANT_BRAND_LOGO}
      width="880px"
      blurb="Manage your menu, take orders and track payouts across the district's food network."
      points={["Menu & dishes", "Live orders", "Payouts & finance", "Ratings & reviews"]}
    >
      {/* Hidden keyboard-keeper: focused on the "Log in" tap so iOS keeps the
          soft-keyboard open while transitioning to the OTP step. */}
      <input
        ref={focusKeeperRef}
        type="tel"
        inputMode="numeric"
        tabIndex={-1}
        aria-label="Keyboard focus keeper"
        readOnly
        className="absolute opacity-0 w-px h-px -z-10 pointer-events-none"
      />

      <div className="mb-7 text-center md:text-left">
        <h2 className="dh-playfair text-[26px] font-black tracking-wide text-[#f4efe2]">
          Restaurant Partner
        </h2>
        <div className="mt-2 flex items-center justify-center gap-2 md:justify-start">
          <span className="h-px w-6 bg-[#caa83e]" />
          <span className="dh-montserrat text-[9px] font-black uppercase tracking-[0.3em] text-[#caa83e]">
            {!isOtpStep ? "Sign in" : "Verify"}
          </span>
        </div>

        {!isOtpStep ? (
          <p className="mt-4 text-[13px] leading-relaxed text-[#9fb3a4]">
            Enter your registered mobile number to manage your restaurant.
          </p>
        ) : (
          <div className="mt-4 flex items-center justify-center gap-2 text-[13px] text-[#9fb3a4] md:justify-start">
            <span>We&apos;ve sent a code to {contactInfo}</span>
            <button
              type="button"
              onClick={() => navigate("/food/restaurant/login")}
              className="rounded-lg border border-[#caa83e]/35 p-1.5 text-[#caa83e] transition-colors hover:bg-[#caa83e]/12"
              aria-label="Edit phone number"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          {!isOtpStep ? (
            // Step 1: Mobile Form
            <motion.form
              key="phone-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSendOTP}
              className="space-y-6"
            >
              <div>
                <label className={authLabelClass} htmlFor="restaurant-phone">
                  Mobile number
                </label>
                <div className={authFieldClass(false)}>
                  <span className="dh-montserrat border-r border-[#caa83e]/25 px-4 text-sm font-bold text-[#9fb3a4]">
                    {DEFAULT_COUNTRY_CODE}
                  </span>
                  <input
                    id="restaurant-phone"
                    ref={phoneInputRef}
                    type="tel"
                    required
                    autoFocus
                    onFocus={handleInputFocusScroll}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    maxLength={10}
                    className={`${authInputClass} px-4 tracking-[0.12em]`}
                    placeholder="10-digit number"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading || phone.length < 10} className={authButtonClass}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Log in"}
              </button>
            </motion.form>
          ) : (
            // Step 2: OTP Verification Form
            <motion.form
              key="otp-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={(e) => { e.preventDefault(); handleVerify(); }}
              className="space-y-6"
            >
              {otpError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-[13px] font-bold tracking-wide text-red-300"
                >
                  {otpError}
                </motion.div>
              )}

              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="tel"
                    inputMode="numeric"
                    required
                    disabled={loading || blockTimer > 0}
                    autoFocus={index === 0}
                    value={otp[index]}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className={`h-14 w-14 rounded-xl border bg-[#02130a] text-center text-2xl font-bold text-[#f4efe2] outline-none transition-colors focus:border-[#caa83e] sm:h-16 sm:w-16 ${
                      blockTimer > 0
                        ? "cursor-not-allowed border-red-400/70 opacity-50"
                        : "border-[#caa83e]/35"
                    }`}
                    placeholder="•"
                  />
                ))}
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {blockTimer > 0 ? (
                    <span className="uppercase tracking-wider text-[#5d7264]">Resend SMS</span>
                  ) : resendTimer > 0 ? (
                    <span className="text-[#9fb3a4]">
                      Resend SMS in{" "}
                      <span className="font-black text-[#caa83e]">{formatResendTimer(resendTimer)}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="font-bold text-[#caa83e] transition-colors hover:text-[#e8c558] hover:underline"
                    >
                      Didn&apos;t receive SMS? Resend SMS
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isOtpComplete || blockTimer > 0}
                className={authButtonClass}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Verify & Continue"
                )}
              </button>

              {blockTimer > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mx-auto mt-4 w-fit rounded-xl border border-red-400/30 bg-red-500/10 px-6 py-2.5 text-center"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-red-300">
                    Too many failed attempts
                  </p>
                  <p className="text-sm font-bold text-[#f4efe2]">
                    Try again after {Math.floor((blockTimer - 1) / 60)}:{String((blockTimer - 1) % 60).padStart(2, '0')}
                  </p>
                </motion.div>
              )}
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* The old footer hard-coded these three at food-module routes, which no
          other app could serve and which nobody could edit. They now come from
          Global Settings, via the shared component at the end of this shell. */}

      {/* Restore/New Account Popup */}
      <AnimatePresence>
        {showRestorePopup && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-[#caa83e]/30 bg-[#051f11] p-8 text-center shadow-[0_28px_80px_rgba(0,0,0,0.7)]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setShowRestorePopup(false)
                  navigate("/food/restaurant/login")
                }}
                className="absolute right-4 top-4 rounded-xl p-2 text-[#9fb3a4] transition-all hover:bg-[#caa83e]/12 hover:text-[#f4efe2] active:scale-95"
                aria-label="Close and return to login"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#caa83e]/12">
                <ShieldCheck className="h-10 w-10 text-[#caa83e]" />
              </div>

              <h3 className="dh-playfair mb-3 text-2xl font-bold text-[#f4efe2]">Restaurant Found!</h3>
              <p className="mb-8 text-sm leading-relaxed text-[#9fb3a4]">
                An existing deleted restaurant for{" "}
                <span className="font-bold text-[#f4efe2]">{contactInfo}</span> was found.
                Do you want to restore your old data or start fresh with a new account?
              </p>

              <div className="space-y-4">
                <button onClick={() => handleRestoreAction("restore")} className={authButtonClass}>
                  Restore My Account
                </button>
                <button
                  onClick={() => handleRestoreAction("new")}
                  className="dh-montserrat h-12 w-full rounded-xl border border-[#caa83e]/35 text-sm font-bold uppercase tracking-[0.16em] text-[#9fb3a4] transition-all hover:border-[#caa83e] hover:text-[#f4efe2] active:scale-[0.99]"
                >
                  Create New Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AuthLegalLinks
        module="food"
        className="dh-montserrat mt-8 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5d7264]"
        linkClassName="transition-colors hover:text-[#caa83e]"
      />
    </DimaHasaoAuthShell>
  )
}
