import { useEffect, useRef, useState } from "react"

export function useDelayedLoading(loading, options = {}) {
  const { delay = 120, minDuration = 320 } = options
  const [visible, setVisible] = useState(false)
  const shownAtRef = useRef(0)

  useEffect(() => {
    let delayTimer
    let hideTimer

    if (loading) {
      delayTimer = setTimeout(() => {
        shownAtRef.current = Date.now()
        setVisible(true)
      }, delay)
    } else if (visible) {
      const elapsed = Date.now() - shownAtRef.current
      const remaining = Math.max(minDuration - elapsed, 0)

      hideTimer = setTimeout(() => {
        setVisible(false)
      }, remaining)
    } else {
      setVisible(false)
    }

    return () => {
      clearTimeout(delayTimer)
      clearTimeout(hideTimer)
    }
  }, [delay, loading, minDuration, visible])

  return visible
}
