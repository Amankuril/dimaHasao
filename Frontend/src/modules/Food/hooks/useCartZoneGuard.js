import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useCart } from "@food/context/CartContext"
import { useProfile } from "@food/context/ProfileContext"
import { restaurantAPI } from "@food/api"

/**
 * Empties the cart when the restaurant in it cannot deliver to the address the
 * customer has selected.
 *
 * This used to compare the restaurant's `zoneId` against the active zone's id
 * and clear the cart on any difference. The customer list is more generous
 * than that: it admits a restaurant whose zone id matches *or* whose
 * coordinates fall inside the zone's polygon. So a restaurant admitted on the
 * geometry arm — zone id unset, or stale after zones were redrawn — was
 * browsable, its menu opened, and then the cart emptied itself the instant an
 * item was added. Nothing in the UI explained why, because by the app's own
 * listing rule the restaurant did deliver there.
 *
 * The question now goes to the server, which answers it with the same rule the
 * list is built from, so the two cannot drift apart again.
 */
const readServiceable = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response
  return payload?.serviceable
}

const isDeliverable = async (cartItem, zoneId) => {
  const restaurantId = cartItem?.restaurantId || cartItem?.restaurant
  if (!restaurantId) return true

  try {
    const response = await restaurantAPI.getRestaurantServiceability(restaurantId, zoneId)
    const serviceable = readServiceable(response)
    // An unreadable answer is not a "no". Checkout validates serviceability
    // again, so letting the order through beats emptying a cart on a glitch.
    return serviceable !== false
  } catch {
    return true
  }
}

export function useCartZoneGuard(zoneId, zoneStatus) {
  const { cart, clearCart } = useCart()
  const { orderType } = useProfile()
  const validatingRef = useRef(false)
  const lastCheckedKeyRef = useRef("")

  useEffect(() => {
    if (orderType === "takeaway" || orderType === "dining") return
    if (!cart.length) {
      lastCheckedKeyRef.current = ""
      return
    }
    if (zoneStatus === "loading" || !zoneId) return

    const checkKey = `${String(zoneId).trim()}:${cart[0]?.restaurantId || cart[0]?.restaurant || ""}:${cart.length}`
    if (lastCheckedKeyRef.current === checkKey || validatingRef.current) return

    let cancelled = false

    const validateCartZone = async () => {
      validatingRef.current = true
      try {
        const deliverable = await isDeliverable(cart[0], zoneId)
        if (cancelled) return

        if (!deliverable) {
          clearCart()
          toast.error("Cart cleared — this restaurant does not deliver to your selected location.")
          lastCheckedKeyRef.current = ""
          return
        }

        lastCheckedKeyRef.current = checkKey
      } finally {
        validatingRef.current = false
      }
    }

    validateCartZone()

    return () => {
      cancelled = true
    }
  }, [zoneId, zoneStatus, cart, clearCart, orderType])
}
