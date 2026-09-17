import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, KeyRound, Loader2, Mail, Shield, Eye, EyeOff } from "lucide-react"
import { adminAPI } from "@food/api"
import AdminAuthShell, {
  authFieldClass,
  authLabelClass,
  authInputClass,
  authButtonClass,
} from "./AdminAuthShell"

/**
 * Admin password reset: email → 6-digit code → new password.
 *
 * Shares AdminAuthShell with the login it is reached from, so the two read as
 * one flow. Nothing linked here before, so this page existed and worked but was
 * unreachable.
 */
export default function AdminForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: email, 2: OTP, 3: new password
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendTimer, setResendTimer] = useState(0)
  const inputRefs = useRef(Array(6).fill(null).map(() => null))

  const startResendCountdown = () => {
    setResendTimer(60)
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError("")

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setError("Email is required")
      return
    }

    setIsLoading(true)
    try {
      await adminAPI.requestForgotPasswordOtp(trimmedEmail)
      setEmail(trimmedEmail)
      setStep(2)
      startResendCountdown()
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "This email is not registered as an admin account or something went wrong."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text")
    const digits = pastedData.replace(/\D/g, "").slice(0, 6).split("")
    const newOtp = [...otp]
    digits.forEach((digit, i) => {
      if (i < 6) {
        newOtp[i] = digit
      }
    })
    setOtp(newOtp)
    if (digits.length === 6) {
      inputRefs.current[5]?.focus()
    } else {
      inputRefs.current[digits.length]?.focus()
    }
  }

  const handleOtpSubmit = (e) => {
    e.preventDefault()
    setError("")

    const otpCode = otp.join("")
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code")
      return
    }
    setStep(3)
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0) return

    setIsLoading(true)
    setError("")
    try {
      await adminAPI.requestForgotPasswordOtp(email)
      startResendCountdown()
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to resend the code. Please try again."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields")
      return
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)
    try {
      await adminAPI.resetPasswordWithOtp(email, otp.join(""), newPassword)

      navigate("/admin/login", {
        state: { message: "Password reset successfully. Please login with your new password." },
      })
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to reset password. Please try again."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const heading = { 1: "Forgot password", 2: "Check your email", 3: "Set a new password" }[step]
  const subheading = {
    1: "We'll email you a 6-digit verification code.",
    2: `Enter the code we sent to ${email}.`,
    3: "Choose a password you have not used before.",
  }[step]

  return (
    <AdminAuthShell>
      <div className="flex items-center justify-center gap-2.5 md:justify-start">
        <KeyRound size={15} className="text-[#caa83e]" />
        <span className="dh-cinzel text-[11px] font-bold uppercase tracking-[0.22em] text-[#caa83e]">
          Step {step} of 3
        </span>
      </div>

      <h2 className="dh-montserrat mt-3 text-center text-2xl font-black tracking-wide text-[#f4efe2] md:text-left">
        {heading}
      </h2>
      <p className="mt-1.5 break-words text-center text-[13px] text-[#9fb3a4] md:text-left">
        {subheading}
      </p>

      {error && (
        <p className="mt-5 rounded-xl border border-red-400/40 bg-red-500/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-red-200">
          {error}
        </p>
      )}

      {step === 1 && (
        <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="reset-email" className={authLabelClass}>
              Email
            </label>
            <div className={authFieldClass(false)}>
              <span className="grid w-11 shrink-0 place-items-center text-[#caa83e]">
                <Mail size={16} />
              </span>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="admin@dimahasao.in"
                className={`${authInputClass} pr-3`}
              />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className={authButtonClass}>
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Send code"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleOtpSubmit} className="mt-6 space-y-4">
          <div>
            <span className={authLabelClass}>Verification code</span>
            <div className="flex justify-between gap-1.5 sm:gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    if (inputRefs.current) inputRefs.current[index] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  // Only the first box takes a paste, so one paste fills the row.
                  onPaste={index === 0 ? handleOtpPaste : undefined}
                  disabled={isLoading}
                  className="h-13 w-full rounded-xl border border-[#caa83e]/35 bg-[#02130a] py-3 text-center text-xl font-bold text-[#f4efe2] outline-none transition-colors focus:border-[#caa83e] focus:ring-0"
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[12px]">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={isLoading}
              className="flex items-center gap-1.5 font-semibold text-[#9fb3a4] transition-colors hover:text-[#f4efe2]"
            >
              <ArrowLeft size={13} />
              Change email
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendTimer > 0 || isLoading}
              className="font-semibold text-[#caa83e] transition-colors hover:text-[#e8c558] disabled:text-[#5d7264]"
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
            </button>
          </div>

          <button type="submit" disabled={isLoading} className={authButtonClass}>
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Verify code"}
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4" noValidate>
          {[
            {
              id: "new-password",
              label: "New password",
              value: newPassword,
              onChange: setNewPassword,
              visible: showPassword,
              toggle: () => setShowPassword((c) => !c),
              placeholder: "At least 6 characters",
            },
            {
              id: "confirm-password",
              label: "Confirm password",
              value: confirmPassword,
              onChange: setConfirmPassword,
              visible: showConfirmPassword,
              toggle: () => setShowConfirmPassword((c) => !c),
              placeholder: "Type it again",
            },
          ].map((field) => (
            <div key={field.id}>
              <label htmlFor={field.id} className={authLabelClass}>
                {field.label}
              </label>
              <div className={authFieldClass(false)}>
                <span className="grid w-11 shrink-0 place-items-center text-[#caa83e]">
                  <Shield size={16} />
                </span>
                <input
                  id={field.id}
                  type={field.visible ? "text" : "password"}
                  autoComplete="new-password"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  disabled={isLoading}
                  placeholder={field.placeholder}
                  className={authInputClass}
                />
                <button
                  type="button"
                  onClick={field.toggle}
                  disabled={isLoading}
                  aria-label={field.visible ? "Hide password" : "Show password"}
                  className="grid w-11 shrink-0 place-items-center text-[#5d7264] transition-colors hover:text-[#caa83e]"
                >
                  {field.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}

          <button type="submit" disabled={isLoading} className={authButtonClass}>
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Reset password"}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={() => navigate("/admin/login")}
        className="mt-7 flex w-full items-center justify-center gap-1.5 text-[12px] font-semibold text-[#9fb3a4] transition-colors hover:text-[#f4efe2] md:justify-start"
      >
        <ArrowLeft size={13} />
        Back to sign in
      </button>
    </AdminAuthShell>
  )
}
