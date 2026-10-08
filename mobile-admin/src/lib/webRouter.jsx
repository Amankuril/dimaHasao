/*
 * react-router-dom's hooks on top of Expo Router, for page logic ported from
 * the web as-is (tools/extract-hook.js): `navigate(path, { state, replace })`,
 * `navigate(-1)`, `useParams()`, `useSearchParams()` and `useLocation()` with
 * `location.state` (kept in memory by food/utils/routeState.js).
 */
import { useCallback, useEffect, useMemo } from 'react';
import { Stack, router, useLocalSearchParams, usePathname } from 'expo-router';
import { clearRouteState, readRouteState, stashRouteState } from './routeState';

const LOGIN = '/admin/login';

/** Where "home" is for the signed-in admin (the first panel they can open). */
let resolveHome = () => '/admin/food';
export function setHomeResolver(fn) {
  resolveHome = fn;
}
export const homePath = () => resolveHome();

/*
 * A web path as the app routes it. The app keeps the web's admin URLs
 * (/admin/food/..., /taxi/admin/..., /hotel/admin/..., /tours/admin/...,
 * /global/admin/...), so most paths pass through; the web's redirects are
 * applied here (`/admin` -> `/admin/food`, `/login` -> `/admin/login`).
 */
export function toAppPath(to) {
  let href = String(to || '').trim();
  if (!href) return homePath();
  if (/^https?:/i.test(href)) return href;
  if (!href.startsWith('/')) href = `/${href}`;
  const q = href.search(/[?#]/);
  let path = q >= 0 ? href.slice(0, q) : href;
  const rest = q >= 0 ? href.slice(q).replace(/^#.*$/, '') : '';
  path = path.replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/admin') path = homePath();
  else if (path === '/login' || path === '/admin/signup' || /^\/(taxi|hotel|tours|global)\/admin\/login$/.test(path)) path = LOGIN;
  else if (path === '/taxi/admin') path = '/taxi/admin/dashboard';
  else if (path === '/hotel/admin') path = '/hotel/admin/dashboard';
  return `${path}${rest}`;
}

const pathOnly = (href) => href.replace(/[?#].*$/, '');

export function navigateTo(to, options = {}) {
  if (typeof to === 'number') {
    if (to < 0) {
      if (router.canGoBack()) router.back();
      else router.replace(homePath());
    }
    return;
  }
  const href = toAppPath(typeof to === 'object' && to ? `${to.pathname || ''}${to.search || ''}` : to);
  const path = pathOnly(href);
  // `location.state` belongs to one history entry on the web. Here it is kept per path, so a navigation that
  // carries no state must drop what an earlier visit left, or "Add" would reopen the last edited property.
  if (options.state !== undefined) stashRouteState(path, options.state);
  else clearRouteState(path);
  if (options.replace) router.replace(href);
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

/** react-router's <Navigate to replace />: redirect once mounted. */
export function Navigate({ to, replace = true, state }) {
  useEffect(() => {
    navigateTo(to, { replace, state });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/**
 * react-router's <Outlet /> in a panel layout: the matched child route, in a
 * Stack, so moving between pages keeps a history the Android back button walks
 * back through (the browser's back on the web).
 */
export function Outlet() {
  return <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />;
}

/** react-router's useMatch / matchPath, for the `pattern` strings the web uses ('/admin/food/orders/:id'). */
export function matchPath(pattern, pathname) {
  const p = typeof pattern === 'string' ? pattern : pattern?.path;
  if (!p) return null;
  const keys = [];
  const escaped = p
    .replace(/\/+$/, '')
    .replace(/[.+?^$()|[\]\\{}]/g, '\\$&')
    .replace(/\/:([A-Za-z0-9_]+)/g, (_, k) => {
      keys.push(k);
      return '/([^/]+)';
    })
    .replace(/\/\*$/, '(?:/.*)?');
  const re = new RegExp('^' + escaped + '/?$');
  const m = String(pathname || '').match(re);
  if (!m) return null;
  const params = {};
  keys.forEach((k, i) => {
    params[k] = decodeURIComponent(m[i + 1]);
  });
  return { params, pathname, pattern: p };
}

export function useMatch(pattern) {
  return matchPath(pattern, usePathname());
}
