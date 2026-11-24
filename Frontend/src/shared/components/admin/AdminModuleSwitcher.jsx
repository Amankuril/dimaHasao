/**
 * The four-module tab strip that sits at the top of every admin sidebar.
 *
 * Food and Taxi each grew their own copy of this markup and Hotel had none at
 * all, which is why the tabs disappeared the moment you switched into Hotel.
 * Extracting it here lets a module adopt the strip with one line and without
 * importing a sibling module — shared/ only ever depends on shared/.
 *
 * Every shell renders this one copy, so the strip looks identical no matter
 * which module rendered it. The rail's other pieces live in adminShell.js.
 */
import { startTransition } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Compass, Globe, Hotel, Truck, UtensilsCrossed } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  FOOD_ADMIN_HOME,
  TAXI_ADMIN_HOME,
  HOTEL_ADMIN_HOME,
  TOURS_ADMIN_HOME,
  GLOBAL_ADMIN_HOME,
  prefetchFoodAdmin,
  prefetchTaxiAdmin,
  prefetchHotelAdmin,
  prefetchToursAdmin,
  prefetchGlobalAdmin,
} from '../../utils/activeModule.js'
import { getCurrentUser } from '../../utils/moduleAuth.js'
// The same rule the login screen uses to pick where to land, so the tab an
// admin arrives on is always one they can actually see.
import { canSeeAdminModule as canSeeModule } from '../../utils/adminHome.js'

const cn = (...inputs) => twMerge(clsx(inputs))

export default function AdminModuleSwitcher({ isCollapsed = false, className }) {
  const location = useLocation()
  const navigate = useNavigate()
  const adminProfile = getCurrentUser('admin') || {}

  const showFoodTab = canSeeModule(adminProfile, 'food')
  const showTaxiTab = canSeeModule(adminProfile, 'taxi')
  const showHotelTab = canSeeModule(adminProfile, 'hotel')
  const showToursTab = canSeeModule(adminProfile, 'tours')
  // Global is everyone's — it is where an admin edits their own profile. What
  // it *shows* is gated inside: only a platform superadmin can manage others.
  const showGlobalTab = true

  if (isCollapsed) return null
  if (!showFoodTab && !showTaxiTab && !showHotelTab && !showToursTab && !showGlobalTab) return null

  const PREFETCH_BY_HOME = {
    [FOOD_ADMIN_HOME]: prefetchFoodAdmin,
    [TAXI_ADMIN_HOME]: prefetchTaxiAdmin,
    [HOTEL_ADMIN_HOME]: prefetchHotelAdmin,
    [TOURS_ADMIN_HOME]: prefetchToursAdmin,
    [GLOBAL_ADMIN_HOME]: prefetchGlobalAdmin,
  }

  const switchAdminModule = (path) => {
    const go = () => startTransition(() => navigate(path))

    // Wait for the chunk so the first switch into a module has no blank
    // flash. A hover/focus on the button (below) usually already started
    // this, so most of the time it resolves instantly.
    const prefetch = PREFETCH_BY_HOME[path]
    if (prefetch) {
      Promise.resolve(prefetch()).finally(go)
      return
    }
    go()
  }

  const isFoodActive =
    location.pathname.includes('/admin/food') ||
    location.pathname === '/admin' ||
    location.pathname === '/admin/'
  const isTaxiActive = location.pathname.startsWith('/taxi')
  const isHotelActive = location.pathname.startsWith('/hotel')
  const isToursActive = location.pathname.startsWith('/tours')
  const isGlobalActive = location.pathname.startsWith('/global')

  const tabClass = (isActive) =>
    cn(
      'flex h-8 flex-1 items-center justify-center gap-2 rounded-md text-[13px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/25',
      isActive
        ? 'bg-white/[0.1] text-neutral-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
        : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-100',
    )

  const iconClass = (isActive) =>
    cn('h-4 w-4 shrink-0', isActive ? 'text-neutral-200' : 'text-neutral-500')

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-1 rounded-[10px] border border-white/[0.06] bg-white/[0.03] p-1',
        className,
      )}
    >
      {showFoodTab && (
        <button type="button" onClick={() => switchAdminModule(FOOD_ADMIN_HOME)} onMouseEnter={prefetchFoodAdmin} onFocus={prefetchFoodAdmin} className={tabClass(isFoodActive)}>
          <UtensilsCrossed className={iconClass(isFoodActive)} />
          Food
        </button>
      )}
      {showTaxiTab && (
        <button type="button" onClick={() => switchAdminModule(TAXI_ADMIN_HOME)} onMouseEnter={prefetchTaxiAdmin} onFocus={prefetchTaxiAdmin} className={tabClass(isTaxiActive)}>
          <Truck className={iconClass(isTaxiActive)} />
          Taxi
        </button>
      )}
      {showHotelTab && (
        <button type="button" onClick={() => switchAdminModule(HOTEL_ADMIN_HOME)} onMouseEnter={prefetchHotelAdmin} onFocus={prefetchHotelAdmin} className={tabClass(isHotelActive)}>
          <Hotel className={iconClass(isHotelActive)} />
          Hotel
        </button>
      )}
      {showToursTab && (
        <button type="button" onClick={() => switchAdminModule(TOURS_ADMIN_HOME)} onMouseEnter={prefetchToursAdmin} onFocus={prefetchToursAdmin} className={tabClass(isToursActive)}>
          <Compass className={iconClass(isToursActive)} />
          Tours
        </button>
      )}
      {showGlobalTab && (
        <button type="button" onClick={() => switchAdminModule(GLOBAL_ADMIN_HOME)} onMouseEnter={prefetchGlobalAdmin} onFocus={prefetchGlobalAdmin} className={cn(tabClass(isGlobalActive), 'col-span-2')}>
          <Globe className={iconClass(isGlobalActive)} />
          Global
        </button>
      )}
    </div>
  )
}
