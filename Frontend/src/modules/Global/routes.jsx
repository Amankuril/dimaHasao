import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { isModuleAuthenticated } from '../../shared/utils/moduleAuth';

const L = (loader) => lazy(loader);

const AdminLayout = L(() => import('./app/admin/layouts/AdminLayout'));
const Profile = L(() => import('./app/admin/pages/Profile'));
const Administrators = L(() => import('./app/admin/pages/Administrators'));
const Support = L(() => import('./app/admin/pages/Support'));
const Reports = L(() => import('./app/admin/pages/Reports'));

const Fallback = () => <div className="min-h-screen bg-transparent" aria-hidden="true" />;

// Global rides the same platform admin session as every other panel.
const RequireAdmin = () =>
  isModuleAuthenticated('admin') ? <Outlet /> : <Navigate to="/admin" replace />;

export default function GlobalRoutes() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<RequireAdmin />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Profile />} />
            <Route path="profile" element={<Profile />} />
            <Route path="administrators" element={<Administrators />} />
            <Route path="support" element={<Support />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        </Route>

        {/* Absolute, not relative: a relative target re-resolves against the
            unmatched URL and appends /admin forever. */}
        <Route path="*" element={<Navigate to="/global/admin" replace />} />
      </Routes>
    </Suspense>
  );
}
