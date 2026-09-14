import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { isModuleAuthenticated } from '../../shared/utils/moduleAuth';

const L = (loader) => lazy(loader);

const AdminLayout = L(() => import('./app/admin/layouts/AdminLayout'));
const Dashboard = L(() => import('./app/admin/pages/Dashboard'));
const Operators = L(() => import('./app/admin/pages/Operators'));
const Packages = L(() => import('./app/admin/pages/Packages'));
const PackageCreate = L(() => import('./app/admin/pages/PackageCreate'));
const Bookings = L(() => import('./app/admin/pages/Bookings'));
const Payouts = L(() => import('./app/admin/pages/Payouts'));
const Settings = L(() => import('./app/admin/pages/Settings'));

const Fallback = () => <div className="min-h-screen bg-transparent" aria-hidden="true" />;

// Tours admin rides the platform admin session, same as the hotel panel.
const RequireAdmin = () =>
  isModuleAuthenticated('admin') ? <Outlet /> : <Navigate to="/admin" replace />;

export default function ToursRoutes() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<RequireAdmin />}>
          <Route path="admin" element={<AdminLayout />}>
            {/* TOURS_ADMIN_HOME is '/tours/admin' with no suffix, so the index
                route has to render the dashboard itself. */}
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="operators" element={<Operators />} />
            {/* Before 'packages' so "new" is never read as a package id. */}
            <Route path="packages/new" element={<PackageCreate />} />
            <Route path="packages" element={<Packages />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="payouts" element={<Payouts />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Absolute, not relative: a relative target re-resolves against the
            unmatched URL and appends /admin forever. */}
        <Route path="*" element={<Navigate to="/tours/admin" replace />} />
      </Routes>
    </Suspense>
  );
}
