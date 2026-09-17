import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { isModuleAuthenticated } from '../../shared/utils/moduleAuth';
import { isOperatorSignedIn } from './services/operatorService';

const L = (loader) => lazy(loader);

const AdminLayout = L(() => import('./app/admin/layouts/AdminLayout'));
const Dashboard = L(() => import('./app/admin/pages/Dashboard'));
const Operators = L(() => import('./app/admin/pages/Operators'));
const Packages = L(() => import('./app/admin/pages/Packages'));
const PackageCreate = L(() => import('./app/admin/pages/PackageCreate'));
const Bookings = L(() => import('./app/admin/pages/Bookings'));
const Payouts = L(() => import('./app/admin/pages/Payouts'));
const Reviews = L(() => import('./app/admin/pages/Reviews'));
const Destinations = L(() => import('./app/admin/pages/Destinations'));
const Offers = L(() => import('./app/admin/pages/Offers'));
const Settings = L(() => import('./app/admin/pages/Settings'));

const OperatorLogin = L(() => import('./app/operator/pages/OperatorLogin'));
const OperatorLayout = L(() => import('./app/operator/layouts/OperatorLayout'));
const OperatorDashboard = L(() => import('./app/operator/pages/OperatorDashboard'));
const OperatorPackages = L(() => import('./app/operator/pages/OperatorPackages'));
const OperatorPackageEditor = L(() => import('./app/operator/pages/OperatorPackageEditor'));
const OperatorBookings = L(() => import('./app/operator/pages/OperatorBookings'));
const OperatorWallet = L(() => import('./app/operator/pages/OperatorWallet'));
const OperatorReviews = L(() => import('./app/operator/pages/OperatorReviews'));
const OperatorProfile = L(() => import('./app/operator/pages/OperatorProfile'));

const Fallback = () => <div className="min-h-screen bg-transparent" aria-hidden="true" />;

// Tours admin rides the platform admin session, same as the hotel panel.
const RequireAdmin = () =>
  isModuleAuthenticated('admin') ? <Outlet /> : <Navigate to="/admin" replace />;

// Operators carry their own token, issued by the `tours-operator` audience —
// the platform admin session has nothing to do with this side of the module.
// Approval is *not* checked here: the layout gates on the live status so a
// pending operator can still reach their profile and KYC.
const RequireOperator = () =>
  isOperatorSignedIn() ? <Outlet /> : <Navigate to="/tours/operator/login" replace />;

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
            <Route path="reviews" element={<Reviews />} />
            <Route path="destinations" element={<Destinations />} />
            <Route path="offers" element={<Offers />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="operator/login" element={<OperatorLogin />} />

        <Route element={<RequireOperator />}>
          <Route path="operator" element={<OperatorLayout />}>
            <Route index element={<Navigate to="/tours/operator/dashboard" replace />} />
            <Route path="dashboard" element={<OperatorDashboard />} />
            {/* Before 'packages/:id' so "new" is never read as a package id. */}
            <Route path="packages/new" element={<OperatorPackageEditor />} />
            <Route path="packages/:id/edit" element={<OperatorPackageEditor />} />
            <Route path="packages" element={<OperatorPackages />} />
            <Route path="bookings" element={<OperatorBookings />} />
            <Route path="wallet" element={<OperatorWallet />} />
            <Route path="reviews" element={<OperatorReviews />} />
            <Route path="profile" element={<OperatorProfile />} />
          </Route>
        </Route>

        {/* Absolute, not relative: a relative target re-resolves against the
            unmatched URL and appends /admin forever. */}
        <Route path="*" element={<Navigate to="/tours/admin" replace />} />
      </Routes>
    </Suspense>
  );
}
