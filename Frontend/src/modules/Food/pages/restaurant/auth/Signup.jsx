import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Phone, User, AlertCircle, Loader2 } from "lucide-react"
import { restaurantAPI } from "@food/api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@food/components/ui/select"
import DimaHasaoAuthShell, {
  authFieldClass,
  authLabelClass,
  authInputClass,
  authButtonClass,
} from "@/shared/components/auth/DimaHasaoAuthShell"
import { RESTAURANT_BRAND_LOGO } from "@/shared/constants/brandLogo"

const countryCodes = [
  { code: "+91", country: "IN", flag: "🇮🇳" },
]

export default function RestaurantSignup() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    phone: "",
    countryCode: "+91",
    name: "",
  })
  const [errors, setErrors] = useState({
    phone: "",
    name: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState("")

  const validatePhone = (phone) => {
    if (!phone.trim()) {
      return "Phone number is required"
    }
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "")
    const phoneRegex = /^\d{7,15}$/
    if (!phoneRegex.test(cleanPhone)) {
      return "Phone number must be 7-15 digits"
    }
    return ""
  }

  const validateName = (name) => {
    if (!name.trim()) {
      return "Restaurant name is required"
    }
    if (name.trim().length < 2) {
      return "Restaurant name must be at least 2 characters"
    }
    if (name.trim().length > 50) {
      return "Restaurant name must be less than 50 characters"
    }
    return ""
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    // Real-time validation
    if (name === "phone") {
      setErrors({ ...errors, phone: validatePhone(value) })
    } else if (name === "name") {
      setErrors({ ...errors, name: validateName(value) })
    }
  }

  const handleCountryCodeChange = (value) => {
    setFormData({
      ...formData,
      countryCode: value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setApiError("")

    // Validate
    let hasErrors = false
    const newErrors = { phone: "", name: "" }

    const phoneError = validatePhone(formData.phone)
    newErrors.phone = phoneError
    if (phoneError) hasErrors = true

    const nameError = validateName(formData.name)
    newErrors.name = nameError
    if (nameError) hasErrors = true

    setErrors(newErrors)

    if (hasErrors) {
      setIsLoading(false)
      return
    }

    // Build full phone number
    const fullPhone = `${formData.countryCode} ${formData.phone}`.trim()

    try {
      // Send OTP with purpose 'register'
      await restaurantAPI.sendOTP(fullPhone, "register")

      // Store auth data in sessionStorage for OTP page
      const authData = {
        method: "phone",
        phone: fullPhone,
        name: formData.name,
        isSignUp: true,
        module: "restaurant",
      }
      sessionStorage.setItem("restaurantAuthData", JSON.stringify(authData))

      navigate("/food/restaurant/otp")
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to send OTP. Please try again."
      setApiError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DimaHasaoAuthShell
      logo={RESTAURANT_BRAND_LOGO}
      width="880px"
      blurb="Register your restaurant and start serving customers across the district."
      points={["List your menu", "Reach local diners", "Track every order", "Get paid on time"]}
    >
      <div className="mb-7 text-center md:text-left">
        <h2 className="dh-playfair text-[26px] font-black tracking-wide text-[#f4efe2]">
          Register Your Restaurant
        </h2>
        <div className="mt-2 flex items-center justify-center gap-2 md:justify-start">
          <span className="h-px w-6 bg-[#caa83e]" />
          <span className="dh-montserrat text-[9px] font-black uppercase tracking-[0.3em] text-[#caa83e]">
            Join as partner
          </span>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-[#9fb3a4]">
          Enter your details to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Restaurant name input */}
        <div>
          <label className={authLabelClass} htmlFor="name">
            Restaurant name
          </label>
          <div className={authFieldClass(!!errors.name)}>
            <span className="pl-4 text-[#5d7264]">
              <User className="h-4 w-4" />
            </span>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter restaurant name"
              value={formData.name}
              onChange={handleChange}
              className={`${authInputClass} px-3`}
              required
            />
          </div>
          {errors.name && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-red-300">
              <AlertCircle className="h-3 w-3" />
              <span>{errors.name}</span>
            </div>
          )}
        </div>

        {/* Phone input */}
        <div>
          <label className={authLabelClass} htmlFor="phone">
            Phone number
          </label>
          <div className="flex gap-2">
            <Select value={formData.countryCode} onValueChange={handleCountryCodeChange}>
              <SelectTrigger className="h-12 w-24 rounded-xl border border-[#caa83e]/35 bg-[#02130a] text-sm text-[#f4efe2] focus:ring-0 focus:ring-offset-0 data-[placeholder]:text-[#5d7264]">
                <SelectValue placeholder="Code" />
              </SelectTrigger>
              <SelectContent className="border-[#caa83e]/35 bg-[#051f11] text-[#f4efe2]">
                {countryCodes.map((country) => (
                  <SelectItem
                    key={country.code}
                    value={country.code}
                    className="text-[#f4efe2] focus:bg-[#caa83e]/15 focus:text-[#f4efe2]"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <span>{country.flag}</span>
                      <span>{country.code}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className={`${authFieldClass(!!errors.phone)} min-w-0 flex-1`}>
              <span className="pl-4 text-[#5d7264]">
                <Phone className="h-4 w-4" />
              </span>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={handleChange}
                className={`${authInputClass} px-3`}
                required
              />
            </div>
          </div>
          {errors.phone && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-red-300">
              <AlertCircle className="h-3 w-3" />
              <span>{errors.phone}</span>
            </div>
          )}
          {apiError && !errors.phone && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-red-300">
              <AlertCircle className="h-3 w-3" />
              <span>{apiError}</span>
            </div>
          )}
        </div>

        {/* Sign up button */}
        <button type="submit" className={authButtonClass} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending OTP...
            </>
          ) : (
            "Send OTP"
          )}
        </button>
      </form>

      {/* Login link */}
      <div className="mt-6 text-center text-sm">
        <span className="text-[#9fb3a4]">Already have an account? </span>
        <button
          type="button"
          onClick={() => navigate("/food/restaurant/login")}
          className="font-bold text-[#caa83e] transition-colors hover:text-[#e8c558] hover:underline"
        >
          Login
        </button>
      </div>

      {/* Demo credentials / info bar */}
      <div className="mt-8 flex items-start gap-3 rounded-xl border border-[#caa83e]/25 bg-[#caa83e]/8 px-4 py-3 text-xs text-[#9fb3a4]">
        <div className="mt-0.5 text-[#caa83e]">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div>
          <div className="dh-montserrat mb-1 font-bold uppercase tracking-[0.14em] text-[#caa83e]">
            Demo Credentials
          </div>
          <div>
            <span className="font-semibold text-[#f4efe2]">Phone :</span> +91 9876543210
          </div>
          <div>
            <span className="font-semibold text-[#f4efe2]">OTP :</span> 1234
          </div>
        </div>
      </div>
    </DimaHasaoAuthShell>
  )
}
