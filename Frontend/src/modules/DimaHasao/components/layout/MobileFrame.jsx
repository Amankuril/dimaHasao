import { useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigationType } from 'react-router-dom';
import { useLocation } from '../../router';
import { useBooking } from '../../context/BookingContext';
import { NotificationsDrawer } from '../common/NotificationsDrawer';
import { AnimatePresence, motion } from 'framer-motion';

export const MobileFrame = ({ children }) => {
  const { toastMessage } = useBooking();
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollViewportRef = useRef(null);

  /*
   * Where each history entry was scrolled to.
   *
   * Keyed by `location.key`, which identifies a history *entry* rather than a
   * path: visiting the same list twice gives two entries with two positions,
   * which is what you want when you have opened a different item from each.
   *
   * A ref rather than state — writing it must never cause a render, it is
   * written on every scroll frame.
   */
  const scrollMemory = useRef(new Map());

  // Record where we are, continuously, so there is something to go back to.
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return undefined;

    const remember = () => {
      scrollMemory.current.set(location.key, viewport.scrollTop);
    };

    viewport.addEventListener('scroll', remember, { passive: true });
    return () => {
      remember();
      viewport.removeEventListener('scroll', remember);
    };
  }, [location.key]);

  /*
   * Going back restores where you were; going somewhere new starts at the top.
   *
   * Layout effect, not effect: this has to run before the browser paints, or
   * the screen shows the top for a frame and then jumps, which looks worse
   * than not restoring at all.
   */
  useLayoutEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return undefined;

    const saved = navigationType === 'POP' ? scrollMemory.current.get(location.key) : undefined;
    const target = typeof saved === 'number' ? saved : 0;

    viewport.scrollTop = target;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // Cached data paints immediately, but images and lazy chunks can still
    // change the height a frame or two later and shorten the scroll range.
    // Re-applying on the next frames makes the restore stick without
    // animating anything the person can see.
    if (!target) return undefined;
    let frame = 0;
    const settle = () => {
      if (viewport.scrollTop !== target) viewport.scrollTop = target;
      if (frame++ < 3) requestAnimationFrame(settle);
    };
    const id = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(id);
  }, [location.key, navigationType]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden overscroll-none flex justify-center bg-[#fdfbf7] select-none touch-manipulation">
      {/* Main Responsive Mobile View Container */}
      <div className="w-full max-w-[430px] h-full flex flex-col relative bg-[#fdfbf7] overflow-hidden overscroll-none shadow-sm">
        {/* Scrollable Viewport with overscroll bounce disabled */}
        <div
          ref={scrollViewportRef}
          data-scroll-container="true"
          className="flex-1 w-full overflow-y-auto overscroll-none hide-scrollbar flex flex-col relative bg-[#fdfbf7]"
        >
          {children}
        </div>

        {/* Global Toast Alert Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-16 left-4 right-4 max-w-sm mx-auto z-[999] pointer-events-none flex justify-center"
            >
              <div className="bg-slate-900/95 text-amber-300 text-xs font-medium px-4 py-2 rounded-full shadow-xl backdrop-blur-md border border-amber-400/30 flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
                <span>{toastMessage}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications Drawer (Bell icon action) */}
        <NotificationsDrawer />
      </div>
    </div>
  );
};
