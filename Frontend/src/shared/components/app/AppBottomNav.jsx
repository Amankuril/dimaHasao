/**
 * The one consumer bottom nav.
 *
 * Food, Taxi and the tourism shell each grew their own bar, so the same person
 * met a different navigation — and two different Profile screens — depending on
 * which module they happened to be in. From a customer's point of view this is
 * one app, and one account: the same FoodUser row backs every module.
 *
 * The five anchors always point at the tourism shell's canonical screens, using
 * absolute paths because each module is a sibling route of /app rather than a
 * nested one. Whatever a module offers beyond those five goes in **More**,
 * supplied by that module via `extras` — so nothing is lost when a module
 * adopts this bar.
 */
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { isImmersiveRoute } from './immersiveRoutes'

const EMBLEM =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDHxXjaqg_p2_vshVQlQARltQKITPTxRdxMMlP-3QyFF5y8e2b25l5rewGDv8hjTJT1mIeodoXkQyW5Q5DbamrNM5Wqkn9zC5hXH-uNiaqjmuWSf0eYIG090j8R2skAqbm4nCA9jzMl8Rca5t2ANsI31UQDQpgiAqnjiXgjeFcP5hsy0iTh8orLvaeTNhXhfOJY7K7F6qam7R85TVEaEb8naGgso3oEml2Ix6YFyN-Jua917AHlmZIs'

/** Every module lands on the same five. */
const ANCHORS = [
  { id: 'home', label: 'Home', icon: 'fa-solid fa-house', path: '/app' },
  { id: 'bookings', label: 'My Bookings', icon: 'fa-regular fa-calendar-check', path: '/app/bookings' },
  { id: 'center', isCenter: true, label: 'Explore', path: '/app/places' },
  { id: 'profile', label: 'Profile', icon: 'fa-regular fa-circle-user', path: '/app/profile' },
  { id: 'more', label: 'More', icon: 'fa-solid fa-ellipsis', isMore: true },
]

/** The other modules, always reachable from More. */
const MODULES = [
  { label: 'Tourist Places', icon: 'fa-solid fa-mountain-sun', path: '/app/places' },
  { label: 'Tour Packages', icon: 'fa-solid fa-suitcase-rolling', path: '/app/packages' },
  { label: 'Hotels & Stays', icon: 'fa-solid fa-hotel', path: '/app/hotels' },
  { label: 'Taxi & Auto', icon: 'fa-solid fa-car', path: '/taxi/user' },
  { label: 'Food & Dining', icon: 'fa-solid fa-bowl-food', path: '/food/user' },
  { label: 'Events & Festivals', icon: 'fa-solid fa-ticket', path: '/app/festivals' },
]

/**
 * @param {Object} props
 * @param {{label: string, icon: string, path?: string, onClick?: Function}[]} [props.extras]
 *   This module's own destinations, shown above the module list in More.
 * @param {string} [props.extrasTitle]
 * @param {number} [props.badge] count on My Bookings
 */
export default function AppBottomNav({ extras = [], extrasTitle = 'In this section', badge = null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  const currentPath = location.pathname

  const isAnchorActive = (path) =>
    path === '/app' ? currentPath === '/app' || currentPath === '/app/' : currentPath.startsWith(path)

  const go = (path) => {
    setIsMoreOpen(false)
    if (path) navigate(path)
  }

  // Hooks above run unconditionally; only the render stands down.
  if (isImmersiveRoute(currentPath)) return null

  return (
    <>
      <div className="fixed bottom-2 left-0 right-0 z-50 px-2.5 flex justify-center pointer-events-none">
        <nav
          className="w-full max-w-[384px] bg-[#06381e] text-white rounded-full px-3 py-1 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-emerald-800/50 select-none pointer-events-auto h-[48px] flex items-center"
          data-purpose="bottom-nav"
        >
          <div className="flex justify-between items-center w-full relative px-1">
            {ANCHORS.map((item) => {
              if (item.isCenter) {
                return (
                  <div key="center-button" className="relative w-14 h-8 flex justify-center">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => go(item.path)}
                      aria-label="Explore Dima Hasao"
                      className="absolute -top-4 bg-[#06381e] rounded-full p-0.5 shadow-[0_6px_20px_rgba(0,0,0,0.55)] w-[58px] h-[58px] flex items-center justify-center border-[3.5px] border-[#06381e] cursor-pointer z-20"
                    >
                      <img alt="Dimasa Traditional Emblem" className="w-full h-full rounded-full object-cover shadow-inner" src={EMBLEM} />
                    </motion.button>
                  </div>
                )
              }

              const isActive = item.isMore ? isMoreOpen : isAnchorActive(item.path)
              const count = item.id === 'bookings' ? badge : null

              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => (item.isMore ? setIsMoreOpen((o) => !o) : go(item.path))}
                  className="flex flex-col items-center justify-center w-13 relative transition-colors cursor-pointer"
                >
                  <div className="relative flex items-center justify-center h-4">
                    <i className={`${item.icon} text-sm transition-colors ${isActive ? 'text-[#ffd027]' : 'text-white/85 hover:text-white'}`}></i>
                    {count ? (
                      <span className="absolute -top-1.5 -right-2 bg-[#ffd027] text-black text-[8px] font-extrabold w-3 h-3 rounded-full flex items-center justify-center border border-[#06381e]">
                        {count}
                      </span>
                    ) : null}
                  </div>

                  <span className={`text-[8.5px] font-medium tracking-tight mt-0.5 leading-none transition-colors ${isActive ? 'text-[#ffd027] font-semibold' : 'text-white/80 hover:text-white'}`}>
                    {item.label}
                  </span>

                  <div className="h-[2px] w-5 flex items-center justify-center mt-[2px]">
                    {isActive && (
                      <motion.div
                        layoutId="app-nav-active-line"
                        className="w-4 h-[1.8px] bg-[#ffd027] rounded-full"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      />
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF6ED] rounded-t-3xl border-t border-[#E5DDC3] max-h-[72vh] overflow-y-auto pb-20"
            >
              <div className="sticky top-0 bg-[#FAF6ED] pt-3 pb-2 flex justify-center">
                <span className="w-10 h-1 rounded-full bg-gray-300" />
              </div>

              {extras.length > 0 && (
                <div className="px-4 pb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{extrasTitle}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {extras.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => (item.onClick ? (setIsMoreOpen(false), item.onClick()) : go(item.path))}
                        className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-white border border-[#E5DDC3] hover:border-emerald-600/40 transition-colors cursor-pointer"
                      >
                        <i className={`${item.icon} text-emerald-800 text-base`}></i>
                        <span className="text-[10px] font-semibold text-gray-700 text-center leading-tight">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-4 pb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Everything in Dima Hasao</p>
                <div className="grid grid-cols-2 gap-2">
                  {MODULES.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => go(item.path)}
                      className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-[#E5DDC3] hover:border-emerald-600/40 transition-colors cursor-pointer text-left"
                    >
                      <i className={`${item.icon} text-emerald-800 text-sm w-4`}></i>
                      <span className="text-xs font-semibold text-gray-800">{item.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => go('/app/more')}
                  className="w-full mt-3 py-2.5 rounded-2xl bg-[#06381e] text-amber-300 text-xs font-bold cursor-pointer"
                >
                  Help, support & everything else
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
