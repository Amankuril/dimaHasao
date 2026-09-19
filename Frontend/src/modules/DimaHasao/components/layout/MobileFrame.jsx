import { useLayoutEffect, useRef } from 'react';
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
   * path: opening two different stays from the same list gives two entries
   * with two positions, which is what you want on the way back.
   *
   * A ref, not state — writing it must never cause a render.
   */
  const scrollMemory = useRef(new Map());

  /*
   * Record where this entry is scrolled to, continuously.
   *
   * Two listeners, because neither alone is enough:
   *
   * `scroll` is the obvious one and covers ordinary scrolling — but it does
   * not fire in every environment, and where it does not, nothing is ever
   * recorded.
   *
   * `click`, captured, is the one that actually matters. Every in-app
   * navigation starts with a tap, and this runs before React has swapped the
   * screen. That timing is the point: by the time a layout-effect cleanup
   * runs the new screen is already in the DOM, and if it is shorter than the
   * old scroll offset the browser has already clamped `scrollTop` — the
   * position is gone before anything gets a chance to read it. Saving on the
   * tap captures it while it is still true.
   */
  useLayoutEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return undefined;

    const key = location.key;
    const remember = () => {
      scrollMemory.current.set(key, viewport.scrollTop);
    };

    viewport.addEventListener('scroll', remember, { passive: true });
    viewport.addEventListener('click', remember, { capture: true, passive: true });

    return () => {
      viewport.removeEventListener('scroll', remember);
      viewport.removeEventListener('click', remember, { capture: true });
    };
  }, [location.key]);

  /*
   * Going back restores where you were; going somewhere new starts at the top.
   *
   * Layout effect so it lands before the browser paints — otherwise the screen
   * shows the top for a frame and then jumps, which looks worse than not
   * restoring at all.
   */
  useLayoutEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return undefined;

    const saved = navigationType === 'POP' ? scrollMemory.current.get(location.key) : undefined;
    const target = typeof saved === 'number' ? saved : 0;

    viewport.scrollTop = target;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // Cached data paints immediately, but images and lazy chunks can still
    // change the height a frame or two later and clamp the scroll range.
    // Re-applying over the next few frames makes the restore stick.
    if (!target) return undefined;
    let frame = 0;
    let id = requestAnimationFrame(function settle() {
      if (viewport.scrollTop !== target) viewport.scrollTop = target;
      if (frame++ < 5) id = requestAnimationFrame(settle);
    });
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
