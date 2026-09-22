/**
 * Where the taxi consumer app is mounted for the path you are currently on.
 *
 * TaxiApp is mounted twice — at `/taxi/user/*` (inside the district shell) and
 * at `/taxi/*` — so screens that navigate have to build absolute paths against
 * whichever one they were reached through.
 *
 * Every screen used to do it inline as
 *
 *     location.pathname.startsWith('/taxi/user') ? '/taxi/user' : ''
 *
 * and the empty fallback is wrong: it dates from the standalone product, where
 * these screens sat at the domain root. Here nothing is mounted at `/ride/...`,
 * so a rider on `/taxi/ride/select-location` who picked a destination was sent
 * to `/ride/select-vehicle`, matched no route, and fell through the app's
 * catch-all to `/app` — losing the booking. The Flutter wrapper hits this
 * because it enters the module at `/taxi`.
 *
 * Both mounts live under `/taxi`, so that is the only correct fallback.
 */
export const getTaxiUserRoutePrefix = (pathname) => {
  const path = String(
    pathname ?? (typeof window === 'undefined' ? '' : window.location.pathname),
  );

  return path.startsWith('/taxi/user') ? '/taxi/user' : '/taxi';
};

export default getTaxiUserRoutePrefix;
