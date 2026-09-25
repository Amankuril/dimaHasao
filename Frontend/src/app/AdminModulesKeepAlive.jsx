import { Suspense, lazy, useEffect, useLayoutEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import {
  prefetchFoodAdmin,
  prefetchTaxiAdmin,
  prefetchHotelAdmin,
  prefetchToursAdmin,
  prefetchGlobalAdmin,
} from '@/shared/utils/activeModule.js'

const FoodAdminRouter = lazy(() => import('../modules/Food/components/admin/AdminRouter.jsx'))
const TaxiApp = lazy(() => import('../modules/Taxi/TaxiApp.jsx'))
const HotelApp = lazy(() => import('../modules/Hotel/routes.jsx'))
const ToursApp = lazy(() => import('../modules/Tours/routes.jsx'))
const GlobalApp = lazy(() => import('../modules/Global/routes.jsx'))

/*
 * One pane per admin module, each holding the same {test, routePath,
 * Component} shape AdminModulesKeepAlive.jsx originally hard-coded twice for
 * Food and Taxi. `test` decides whether a pathname belongs to this module's
 * admin area (narrower than the module's full route tree for Hotel/Tours/
 * Global, which also serve non-admin content at the same prefix); `routePath`
 * is what this pane's own <Routes> needs to match that module's *whole*
 * lazy-loaded component (which does its own internal routing down to the
 * admin sub-route) — matching app/routes.jsx's split between an admin-only
 * slot route and the module's general route for the same prefix.
 */
const MODULES = [
  { key: 'food', test: (p) => p.startsWith('/admin'), routePath: '/admin/*', Component: FoodAdminRouter, prefetch: prefetchFoodAdmin },
  { key: 'taxi', test: (p) => p.startsWith('/taxi/admin'), routePath: '/taxi/*', Component: TaxiApp, prefetch: prefetchTaxiAdmin },
  { key: 'hotel', test: (p) => p.startsWith('/hotel/admin'), routePath: '/hotel/*', Component: HotelApp, prefetch: prefetchHotelAdmin },
  { key: 'tours', test: (p) => p.startsWith('/tours/admin'), routePath: '/tours/*', Component: ToursApp, prefetch: prefetchToursAdmin },
  { key: 'global', test: (p) => p.startsWith('/global/admin'), routePath: '/global/*', Component: GlobalApp, prefetch: prefetchGlobalAdmin },
]

/**
 * Keeps every admin module mounted after its first visit, so switching
 * between any of them (Food, Taxi, Hotel, Tours, Global) is a hide/show
 * toggle instead of an unmount-the-whole-tree-and-remount — no blank flash,
 * no re-running each module's mount-time data fetches on every switch, and
 * the sidebar inside each module's own layout never disappears mid-switch.
 */
export default function AdminModulesKeepAlive() {
  const location = useLocation()
  const pathname = String(location.pathname || '')
  const active = MODULES.find((m) => m.test(pathname))?.key || null

  const [visited, setVisited] = useState({})
  const [frozenLocation, setFrozenLocation] = useState({})

  useLayoutEffect(() => {
    if (!active) return
    setVisited((prev) => (prev[active] ? prev : { ...prev, [active]: true }))
    setFrozenLocation((prev) => ({ ...prev, [active]: location }))
  }, [active, location])

  // Free memory when leaving admin entirely (user/driver/food consumer).
  useEffect(() => {
    if (active) return
    setVisited({})
    setFrozenLocation({})
  }, [active])

  // Warm every other admin module as soon as any one is open, so the next
  // switch — to any of them — is already-cached rather than a cold chunk
  // fetch behind a blank Suspense fallback.
  useEffect(() => {
    if (!active) return
    MODULES.forEach((module) => module.prefetch?.())
  }, [active])

  if (!active) return null

  return (
    <>
      {MODULES.map((module) => {
        const show = active === module.key || visited[module.key]
        const effectiveLocation = active === module.key ? location : frozenLocation[module.key]

        if (!show || !effectiveLocation) return null

        return (
          <div
            key={module.key}
            className={`admin-module-keepalive admin-module-keepalive--${module.key}`}
            style={{ display: active === module.key ? 'block' : 'none' }}
            aria-hidden={active !== module.key}
          >
            <Suspense fallback={null}>
              <Routes location={effectiveLocation}>
                <Route path={module.routePath} element={<module.Component />} />
              </Routes>
            </Suspense>
          </div>
        )
      })}
    </>
  )
}

/** Placeholder route element — real UI is rendered by AdminModulesKeepAlive. */
export function AdminKeepAliveSlot() {
  return null
}
