import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PatternDivider } from './PatternDivider';
import AppBottomNav from '@/shared/components/app/AppBottomNav';
import '../../dimahasao.css';
import { isImmersiveRoute } from '@/shared/components/app/immersiveRoutes';

// The v1 Dima Hasao header, for wrapping the Hello-Parth food/taxi/hotel
// modules. Deliberately standalone: it uses the host router directly and takes
// no BookingContext, so it can render outside the DimaHasao route tree.
export const ModuleHeader = ({ title, subtitle, backTo = '/app' }) => {
  const navigate = useNavigate();

  return (
    <header className="bg-[#062c16] text-white px-3.5 py-3 sticky top-0 z-40 shadow-md backdrop-blur-md border-b border-emerald-900/50">
      <div className="flex items-center justify-between gap-2">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => navigate(backTo)}
          aria-label="Go Back"
          className="p-1 -ml-1 text-white hover:text-amber-300 transition-colors flex items-center justify-center text-base cursor-pointer shrink-0"
        >
          <i className="fa-solid fa-arrow-left text-base"></i>
        </motion.button>

        <div className="text-center flex-1 px-2">
          <h1 className="text-sm sm:text-base font-extrabold tracking-widest flex items-center justify-center gap-1.5 uppercase font-cinzel text-amber-300">
            <span className="text-amber-400 text-[10px]">
              <i className="fa-solid fa-leaf"></i>
            </span>
            <span className="truncate">{title}</span>
            <span className="text-amber-400 text-[10px]">
              <i className="fa-solid fa-leaf"></i>
            </span>
          </h1>
          {subtitle && (
            <p className="text-[10px] sm:text-[11px] italic font-playfair text-amber-100/90 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>

        <div className="w-6" />
      </div>
    </header>
  );
};

/**
 * The wrapper every consumer module shell passes through, which makes it the
 * one place the shared bottom nav belongs.
 *
 * Taxi's own BottomNavbar was unreachable in this mounting: TaxiApp is nested
 * under /taxi/user/*, so its inner paths resolve relative to that, and the
 * nav-bearing UserMainTabKeepAlive sits on the `user/...` routes meant for the
 * other mount. Rendering here sidesteps each module's internal routing and
 * gives food and taxi the identical nav.
 *
 * `navExtras` is what that module offers beyond the five shared anchors; it
 * shows under More so nothing is lost.
 */
/*
 * How much room the floating nav needs at the bottom of the viewport: the pill
 * sits 8px up and is 48px tall, and its raised centre button reaches 16px
 * above that. `pb-16` below only moves normal-flow content; a screen's own
 * `position: fixed` action bar escapes it and ends up underneath the nav, so
 * those bars pad themselves by this variable instead — and fall back to 0
 * wherever the module is mounted without the shell.
 */
const NAV_CLEARANCE = '72px';

export const ModuleShell = ({ title, subtitle, children, navExtras = [], navExtrasTitle }) => {
  const { pathname } = useLocation();
  // On a flow screen the nav hides itself, so the room reserved for it — both
  // the padding here and the variable the fixed action bars pad by — has to go
  // with it, or those screens gain a band of dead space.
  const immersive = isImmersiveRoute(pathname);

  return (
    <div
      className="dh-app min-h-screen flex flex-col bg-[#FAF6ED]"
      style={{ '--app-nav-clearance': immersive ? '0px' : NAV_CLEARANCE }}
    >
      <ModuleHeader title={title} subtitle={subtitle} />
      <PatternDivider variant="green-gold" />
      {/* Room for the floating nav so it never covers a module's last row. */}
      <div className={`flex-1 min-h-0 ${immersive ? '' : 'pb-16'}`}>{children}</div>
      <AppBottomNav extras={navExtras} extrasTitle={navExtrasTitle} />
    </div>
  );
};

export default ModuleShell;
