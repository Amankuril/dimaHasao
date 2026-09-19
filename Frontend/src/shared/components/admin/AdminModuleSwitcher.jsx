/**
 * The four-module tab strip that sits at the top of every admin sidebar.
 *
 * Food and Taxi each grew their own copy of this markup and Hotel had none at
 * all, which is why the tabs disappeared the moment you switched into Hotel.
 * Extracting it here lets a module adopt the strip with one line and without
 * importing a sibling module — shared/ only ever depends on shared/.
 *
 * Markup and classes are kept byte-for-byte in step with the Food sidebar so
 * the strip looks identical no matter which module rendered it.
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

  const switchAdminModule = (path) => {
    const go = () => startTransition(() => navigate(path))

    // Wait for the sibling chunk so the first switch has no blank flash.
    if (path === FOOD_ADMIN_HOME) {
      Promise.resolve(prefetchFoodAdmin()).finally(go)
      return
    }
    if (path === TAXI_ADMIN_HOME) {
      Promise.resolve(prefetchTaxiAdmin()).finally(go)
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
      'flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all duration-300',
      isActive
        ? 'bg-white text-black shadow-[0_4px_12px_rgba(255,255,255,0.15)] scale-[1.02]'
        : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5',
    )

  const iconClass = (isActive) =>
    cn('w-3.5 h-3.5', isActive ? 'text-black' : 'text-neutral-500')

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-1 p-1 bg-neutral-800/40 backdrop-blur-sm rounded-xl mb-4 border border-white/5 shadow-inner',
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
        <button type="button" onClick={() => switchAdminModule(HOTEL_ADMIN_HOME)} className={tabClass(isHotelActive)}>
          <Hotel className={iconClass(isHotelActive)} />
          Hotel
        </button>
      )}
      {showToursTab && (
        <button type="button" onClick={() => switchAdminModule(TOURS_ADMIN_HOME)} className={tabClass(isToursActive)}>
          <Compass className={iconClass(isToursActive)} />
          Tours &amp; Festivals
        </button>
      )}
      {showGlobalTab && (
        <button type="button" onClick={() => switchAdminModule(GLOBAL_ADMIN_HOME)} className={cn(tabClass(isGlobalActive), 'col-span-2')}>
          <Globe className={iconClass(isGlobalActive)} />
          Global
        </button>
      )}
    </div>
  )
}
