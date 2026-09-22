/**
 * Screens that own the whole viewport, so the shared bottom nav stands down.
 *
 * These are the steps inside a flow rather than places you browse to: picking
 * a pickup and drop, choosing a vehicle, watching a driver arrive, paying.
 * Each ends in a full-width primary button pinned to the bottom of the screen,
 * and the floating nav pill sits exactly there — covering the one control the
 * screen exists for. They are also the screens where the nav's own
 * destinations are the wrong thing to offer: leaving mid-flow loses the
 * booking rather than navigating away from it.
 *
 * Matching is by prefix so both taxi mounts (/taxi/... and /taxi/user/...) are
 * covered by one entry.
 */
const IMMERSIVE_SUFFIXES = [
  // Taxi — the ride flow, start to finish
  '/ride/select-location',
  '/ride/select-vehicle',
  '/ride/searching',
  '/ride/tracking',
  '/ride/complete',
  '/ride/chat',

  // Taxi — outstation, once a trip is being configured
  '/intercity/vehicle',
  '/intercity/details',
  '/intercity/confirm',

  // Food — the address step, which is a picker, not a tab
  '/address-selector',
];

/**
 * @param {string} pathname
 * @returns {boolean} true when the shared nav should not render here.
 */
export const isImmersiveRoute = (pathname = '') => {
  const path = String(pathname || '').replace(/\/+$/, '');
  return IMMERSIVE_SUFFIXES.some((suffix) => path.endsWith(suffix));
};

export default isImmersiveRoute;
