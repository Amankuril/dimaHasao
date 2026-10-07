/*
 * react-router-dom's hooks on top of Expo Router, for page logic ported from
 * the web as-is (tools/extract-hook.js): `navigate(path, { state, replace })`,
 * `navigate(-1)`, `useParams()`, `useSearchParams()` and `useLocation()` with
 * `location.state` (kept in memory by food/utils/routeState.js).
 */
import { useCallback, useMemo } from 'react';
import { Link, router, useLocalSearchParams, usePathname } from 'expo-router';

export { Link };
import { clearRouteState, readRouteState, stashRouteState } from './routeState';

// The bottom-bar destinations: returning to one must not stack a second copy.
const MAIN_TABS = new Set(['/food/restaurant', '/food/restaurant/reservations', '/food/restaurant/inventory', '/food/restaurant/feedback', '/food/restaurant/explore']);

const HOME = '/food/restaurant';

/** A web path as the app routes it. */
export function toAppPath(to) {
  let href = String(to || '').trim();
  if (!href) return HOME;
  if (/^https?:/i.test(href)) return href;
  if (!href.startsWith('/')) href = `/${href}`;
  const q = href.search(/[?#]/);
  let path = q >= 0 ? href.slice(0, q) : href;
  const rest = q >= 0 ? href.slice(q) : '';
  path = path.replace(/\/+$/, '') || '/';
  // The web mounts the restaurant app at /food/restaurant; some pages still link to /restaurant/...
  if (path === '/' || path === '/food' || path === '/restaurant') path = HOME;
  else if (path.startsWith('/restaurant/')) path = `/food${path}`;
  else if (path === '/login') path = `${HOME}/login`;
  return `${path}${rest}`;
}

const pathOnly = (href) => href.replace(/[?#].*$/, '');

export function navigateTo(to, options = {}) {
  if (typeof to === 'number') {
    if (to < 0) {
      if (router.canGoBack()) router.back();
      else router.replace(HOME);
    }
    return;
  }
  const href = toAppPath(typeof to === 'object' && to ? `${to.pathname || ''}${to.search || ''}` : to);
  const path = pathOnly(href);
  // `location.state` belongs to one history entry on the web. Here it is kept per path, so a navigation that
  // carries no state must drop what an earlier visit left, or "Add" would reopen the last edited property.
  if (options.state !== undefined) stashRouteState(path, options.state);
  else clearRouteState(path);
  // A main tab is already mounted under the stack: return to it, don't stack a copy.
  if (MAIN_TABS.has(path)) router.navigate(href);
  else if (options.replace) router.replace(href);
  else router.push(href);
}

export function useNavigate() {
  return useCallback((to, options) => navigateTo(to, options), []);
}

export function useParams() {
  return useLocalSearchParams();
}

const flat = (params) => {
  const out = {};
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v == null) return;
    out[k] = Array.isArray(v) ? v.join('/') : String(v);
  });
  return out;
};

export function useLocation() {
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const key = JSON.stringify(flat(params));
  return useMemo(() => {
    const search = new URLSearchParams(JSON.parse(key)).toString();
    return { pathname, search: search ? `?${search}` : '', hash: '', key: pathname, state: readRouteState(pathname) };
  }, [pathname, key]);
}

export function useSearchParams() {
  const params = useLocalSearchParams();
  const key = JSON.stringify(flat(params));
  const searchParams = useMemo(() => new URLSearchParams(JSON.parse(key)), [key]);
  const setSearchParams = useCallback(
    (next) => {
      const current = new URLSearchParams(JSON.parse(key));
      const resolved = typeof next === 'function' ? next(current) : next;
      const target = resolved instanceof URLSearchParams ? resolved : new URLSearchParams(resolved || {});
      const update = {};
      current.forEach((_, k) => {
        if (!target.has(k)) update[k] = undefined;
      });
      target.forEach((v, k) => {
        update[k] = v;
      });
      router.setParams(update);
    },
    [key],
  );
  return [searchParams, setSearchParams];
}

/** react-router's POP / PUSH / REPLACE. The web reads it to restore scroll after "back"; the stack does that here. */
export function useNavigationType() {
  return 'PUSH';
}
