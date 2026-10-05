import { useCallback } from "react"
import { router } from 'expo-router'
import { useLocation, navigateTo } from '../../lib/webRouter'
import { useProfile } from '../context/ProfileContext'

const toFoodPath = (value) => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("/food/")) return trimmed
  if (trimmed === "/food") return trimmed
  if (trimmed.startsWith("/user/")) return `/food${trimmed}`
  if (trimmed === "/user") return "/food/user"
  return null
}

const resolveExplicitBackPath = (state) => {
  for (const key of ["backTo", "from", "returnTo"]) {
    const foodPath = toFoodPath(state?.[key])
    if (foodPath) return foodPath

    const rawPath = typeof state?.[key] === "string" ? state[key].trim() : ""
    if (rawPath.startsWith("/")) return rawPath
  }

  return null
}

const getNormalizedUserPath = (pathname) => {
  if (pathname.startsWith("/food")) {
    return pathname.slice(5) || "/"
  }
  return pathname || "/"
}

const pathsMatch = (a, b) => {
  const norm = (p) => String(p || "").replace(/\/+$/, "") || "/"
  return norm(a) === norm(b)
}

const resolveBackPath = ({ pathname, search, state, orderType }) => {
  const normalizedPath = getNormalizedUserPath(pathname)
  const explicitBackPath = resolveExplicitBackPath(state)
  const searchParams = new URLSearchParams(search || "")
  const defaultHomePath = orderType === "takeaway" ? "/food/user/takeaway" : "/food/user"

  if (
    normalizedPath === "/user/profile/payments/new" ||
    /^\/user\/profile\/payments\/[^/]+\/edit$/.test(normalizedPath)
  ) {
    return explicitBackPath || "/food/user/profile/payments"
  }

  if (
    /^\/user\/profile\/(edit|favorites|support|coupons|about|report-safety-emergency|accessibility|logout|refer-earn|payments)$/.test(
      normalizedPath,
    )
  ) {
    return explicitBackPath || "/food/user/profile"
  }

  if (
    /^\/user\/profile\/(terms|privacy|refund|shipping|cancellation|support-info)$/.test(
      normalizedPath,
    )
  ) {
    return explicitBackPath || "/food/user/profile"
  }

  if (normalizedPath === "/user/wallet") {
    return explicitBackPath || "/food/user/profile"
  }

  if (normalizedPath === "/user/notifications") {
    return explicitBackPath || defaultHomePath
  }

  if (/^\/user\/restaurants\/[^/]+$/.test(normalizedPath)) {
    if (searchParams.get("under250") === "true") {
      return "/food/user/under-250"
    }
    return explicitBackPath || defaultHomePath
  }

  if (/^\/user\/dining\/book(\/|$)/.test(normalizedPath)) {
    return explicitBackPath || "/food/user/dining"
  }

  if (/^\/user\/dining\/[^/]+\/[^/]+$/.test(normalizedPath)) {
    return explicitBackPath || "/food/user/dining"
  }

  if (
    normalizedPath === "/user/dining/explore/upto50" ||
    normalizedPath === "/user/dining/explore/near-rated" ||
    normalizedPath === "/user/dining/coffee"
  ) {
    return "/food/user/dining"
  }

  if (/^\/user\/dining\/[^/]+$/.test(normalizedPath)) {
    return "/food/user/dining"
  }

  if (
    normalizedPath === "/user/orders" ||
    /^\/user\/orders\/[^/]+(\/invoice|\/details)?$/.test(normalizedPath)
  ) {
    if (state?.from === "profile" || state?.backTo?.includes("profile") || explicitBackPath?.includes("profile")) {
      return "/food/user/profile"
    }
    return defaultHomePath
  }

  if (
    normalizedPath === "/user/cart/checkout" ||
    normalizedPath === "/user/cart/select-address"
  ) {
    return "/food/user/cart"
  }

  if (normalizedPath === "/user/address-selector") {
    return explicitBackPath || defaultHomePath
  }

  if (/^\/user\/collections\/[^/]+$/.test(normalizedPath)) {
    return "/food/user/collections"
  }

  if (normalizedPath === "/user/categories") {
    return defaultHomePath
  }

  if (/^\/user\/category\/[^/]+$/.test(normalizedPath)) {
    return defaultHomePath
  }

  if (
    normalizedPath === "/user/offers" ||
    normalizedPath === "/user/gourmet" ||
    normalizedPath === "/user/coffee"
  ) {
    return defaultHomePath
  }

  if (/^\/user\/product\/[^/]+$/.test(normalizedPath)) {
    return explicitBackPath || defaultHomePath
  }

  if (/^\/user\/complaints(\/|$)/.test(normalizedPath)) {
    return explicitBackPath || "/food/user/orders"
  }

  if (explicitBackPath && !pathsMatch(explicitBackPath, pathname)) {
    return explicitBackPath
  }

  return defaultHomePath
}

/**
 * Back from a food page. The web replaces the URL with the page's known parent
 * because browser history fills up with query/sheet entries; the app's stack
 * holds exactly the page this one was opened from, so it pops that. The web's
 * parent table is the fallback when there is nothing to pop (a cold deep link).
 */
export default function useAppBackNavigation() {
  const location = useLocation()
  const profile = useProfile()
  const orderType = profile ? profile.orderType : null

  return useCallback(() => {
    // Restaurant "more info" sheet lives in ?info= — close it first.
    const searchParams = new URLSearchParams(location.search || "")
    if (searchParams.get("info") === "true") {
      router.setParams({ info: undefined })
      return
    }

    if (router.canGoBack()) {
      router.back()
      return
    }

    const target = resolveBackPath({ ...location, orderType })
    const home = orderType === "takeaway" ? "/food/user/takeaway" : "/food/user"
    navigateTo(target && !pathsMatch(target, location.pathname) ? target : home, { replace: true })
  }, [location, orderType])
}
