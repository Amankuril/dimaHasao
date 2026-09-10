import { useCallback, useMemo } from 'react';
import {
  useNavigate as useRouterNavigate,
  useLocation as useRouterLocation,
  Navigate as RouterNavigate,
} from 'react-router-dom';

// The Dima Hasao customer app is mounted under this prefix inside the host app.
// Screens keep using their original absolute paths ('/hotels', '/food/cart', ...)
// and this shim maps them onto the mount point, so the client-approved code is
// never rewritten. Set to '' to serve the app from the domain root.
export const DH_BASE = '/app';

export const toHostPath = (path) => {
  if (typeof path !== 'string' || !path.startsWith('/')) return path;
  if (!DH_BASE) return path;
  return path === '/' ? DH_BASE : `${DH_BASE}${path}`;
};

export const toAppPath = (pathname) => {
  if (typeof pathname !== 'string' || !DH_BASE) return pathname;
  if (pathname === DH_BASE) return '/';
  return pathname.startsWith(`${DH_BASE}/`) ? pathname.slice(DH_BASE.length) : pathname;
};

export function useNavigate() {
  const navigate = useRouterNavigate();

  return useCallback(
    (to, options) => {
      // navigate(-1) and friends must reach the router untouched.
      if (typeof to === 'number') return navigate(to);
      return navigate(toHostPath(to), options);
    },
    [navigate],
  );
}

// Navigate to routes OUTSIDE this module (e.g. the Hello-Parth food/taxi
// shells at /food/user, /taxi/user) without the module prefix applied.
export function useHostNavigate() {
  return useRouterNavigate();
}

export function useLocation() {
  const location = useRouterLocation();

  return useMemo(
    () => ({ ...location, pathname: toAppPath(location.pathname) }),
    [location],
  );
}

export function Navigate({ to, ...props }) {
  return <RouterNavigate to={toHostPath(to)} {...props} />;
}

export { useParams, useSearchParams, Routes, Route } from 'react-router-dom';
