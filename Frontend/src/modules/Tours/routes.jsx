import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { isModuleAuthenticated } from '../../shared/utils/moduleAuth';

const L = (loader) => lazy(loader);

const AdminLayout = L(() => import('./app/admin/layouts/AdminLayout'));
const Dashboard = L(() => import('./app/admin/pages/Dashboard'));
const Packages = L(() => import('./app/admin/pages/Packages'));
const PackageCreate = L(() => import('./app/admin/pages/PackageCreate'));
const Bookings = L(() => import('./app/admin/pages/Bookings'));
const Reviews = L(() => import('./app/admin/pages/Reviews'));
const Destinations = L(() => import('./app/admin/pages/Destinations'));
const Offers = L(() => import('./app/admin/pages/Offers'));
const Festivals = L(() => import('./app/admin/pages/Festivals'));
const Settings = L(() => import('./app/admin/pages/Settings'));

const Fallback = () => <div className="min-h-screen bg-transparent" aria-hidden="true" />;

// Tours & Festivals rides the platform admin session, same as the hotel panel.
// There is no second session to check: tours are single-vendor and the vendor
// is the district, so an admin is the only person who administers anything here.
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
            {/* Before 'packages' so "new" is never read as a package id. */}
            <Route path="packages/new" element={<PackageCreate />} />
            <Route path="packages" element={<Packages />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="destinations" element={<Destinations />} />
            <Route path="offers" element={<Offers />} />
            <Route path="festivals" element={<Festivals />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        {/* The operator panel is gone; anyone holding an old bookmark lands on
            the admin panel rather than a blank screen. */}
        <Route path="operator/*" element={<Navigate to="/tours/admin" replace />} />

        {/* Absolute, not relative: a relative target re-resolves against the
            unmatched URL and appends /admin forever. */}
        <Route path="*" element={<Navigate to="/tours/admin" replace />} />
      </Routes>
    </Suspense>
  );
}
