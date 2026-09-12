import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { isModuleAuthenticated } from '../../shared/utils/moduleAuth';

const L = (loader) => lazy(loader);

// Admin
const AdminLayout = L(() => import('./app/admin/layouts/AdminLayout'));
const AdminDashboard = L(() => import('./app/admin/pages/AdminDashboard'));
const AdminUsers = L(() => import('./app/admin/pages/AdminUsers'));
const AdminUserDetail = L(() => import('./app/admin/pages/AdminUserDetail'));
const AdminBookings = L(() => import('./app/admin/pages/AdminBookings'));
const AdminBookingDetail = L(() => import('./app/admin/pages/AdminBookingDetail'));
const AdminPartners = L(() => import('./app/admin/pages/AdminPartners'));
const AdminPartnerDetail = L(() => import('./app/admin/pages/AdminPartnerDetail'));
const AdminProperties = L(() => import('./app/admin/pages/AdminProperties'));
const AdminHotelDetail = L(() => import('./app/admin/pages/AdminHotelDetail'));
const AdminReviews = L(() => import('./app/admin/pages/AdminReviews'));
const AdminFinance = L(() => import('./app/admin/pages/AdminFinance'));
const AdminOffers = L(() => import('./app/admin/pages/AdminOffers'));
const AdminCategories = L(() => import('./app/admin/pages/AdminCategories'));
const AdminNotifications = L(() => import('./app/admin/pages/AdminNotifications'));
const AdminSettings = L(() => import('./app/admin/pages/AdminSettings'));
const AdminFaqs = L(() => import('./app/admin/pages/AdminFaqs'));
const AdminLegalPages = L(() => import('./app/admin/pages/AdminLegalPages'));
const AdminContactMessages = L(() => import('./app/admin/pages/AdminContactMessages'));

// Partner (hotel/property vendor panel)
const PartnerDashboard = L(() => import('./app/partner/pages/PartnerDashboard'));
const PartnerProperties = L(() => import('./app/partner/pages/PartnerProperties'));
const PartnerPropertyDetails = L(() => import('./app/partner/pages/PartnerPropertyDetails'));
const PartnerInventory = L(() => import('./app/partner/pages/PartnerInventory'));
const PartnerInventoryProperties = L(() => import('./app/partner/pages/PartnerInventoryProperties'));
const PartnerBookings = L(() => import('./app/partner/pages/PartnerBookings'));
const PartnerBookingDetail = L(() => import('./app/partner/pages/PartnerBookingDetail'));
const PartnerWallet = L(() => import('./app/partner/pages/PartnerWallet'));
const PartnerRevenueReport = L(() => import('./app/partner/pages/PartnerRevenueReport'));
const PartnerReviews = L(() => import('./app/partner/pages/PartnerReviews'));
const PartnerKYC = L(() => import('./app/partner/pages/PartnerKYC'));
const PartnerBankDetails = L(() => import('./app/partner/pages/PartnerBankDetails'));
const PartnerProfile = L(() => import('./app/partner/pages/PartnerProfile'));
const PartnerSettings = L(() => import('./app/partner/pages/PartnerSettings'));
const PartnerNotifications = L(() => import('./app/partner/pages/PartnerNotifications'));
const PartnerJoinPropertyType = L(() => import('./app/partner/pages/PartnerJoinPropertyType'));
const AddHotelWizard = L(() => import('./app/partner/pages/AddHotelWizard'));
const AddResortWizard = L(() => import('./app/partner/pages/AddResortWizard'));
const AddHomestayWizard = L(() => import('./app/partner/pages/AddHomestayWizard'));
const HotelLogin = L(() => import('./app/partner/pages/HotelLogin'));

const Fallback = () => <div className="min-h-screen bg-transparent" aria-hidden="true" />;

// Hotel admin runs on the platform admin session (see Hotel apiService), so it
// reuses the same guard as the rest of the admin panel.
const RequireAdmin = () =>
  isModuleAuthenticated('admin') ? <Outlet /> : <Navigate to="/admin" replace />;

export default function HotelRoutes() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="partner/login" element={<HotelLogin />} />

        <Route element={<RequireAdmin />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="properties" element={<AdminProperties />} />
            <Route path="properties/:id" element={<AdminHotelDetail />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="bookings/:id" element={<AdminBookingDetail />} />
            <Route path="partners" element={<AdminPartners />} />
            <Route path="partners/:id" element={<AdminPartnerDetail />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="finance" element={<AdminFinance />} />
            <Route path="offers" element={<AdminOffers />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="faqs" element={<AdminFaqs />} />
            <Route path="legal" element={<AdminLegalPages />} />
            <Route path="contact-messages" element={<AdminContactMessages />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>

        <Route path="partner">
          <Route index element={<PartnerDashboard />} />
          <Route path="dashboard" element={<PartnerDashboard />} />
          <Route path="join" element={<PartnerJoinPropertyType />} />
          {/* The wizards existed but were never mounted, so every option on the
              type picker fell through to the catch-all. A lodge is a roomed
              property like a hotel, so it reuses that wizard. */}
          <Route path="join-hotel" element={<AddHotelWizard />} />
          <Route path="join-lodge" element={<AddHotelWizard />} />
          <Route path="join-resort" element={<AddResortWizard />} />
          <Route path="join-homestay" element={<AddHomestayWizard />} />
          <Route path="properties" element={<PartnerProperties />} />
          <Route path="properties/:id" element={<PartnerPropertyDetails />} />
          <Route path="inventory-properties" element={<PartnerInventoryProperties />} />
          <Route path="inventory/:id" element={<PartnerInventory />} />
          <Route path="bookings" element={<PartnerBookings />} />
          <Route path="bookings/:id" element={<PartnerBookingDetail />} />
          <Route path="wallet" element={<PartnerWallet />} />
          <Route path="revenue" element={<PartnerRevenueReport />} />
          <Route path="reviews" element={<PartnerReviews />} />
          <Route path="kyc" element={<PartnerKYC />} />
          <Route path="bank-details" element={<PartnerBankDetails />} />
          <Route path="notifications" element={<PartnerNotifications />} />
          <Route path="profile" element={<PartnerProfile />} />
          <Route path="settings" element={<PartnerSettings />} />
        </Route>

        {/* This module was ported from a standalone app where the partner
            pages sat at the root, so its own links still point at /hotel/<page>
            while the routes now live under /hotel/partner/<page>. Aliasing is a
            single place to absorb that instead of rewriting every navigate(). */}
        {[
          'dashboard',
          'properties',
          'inventory-properties',
          'bookings',
          'wallet',
          'revenue',
          'reviews',
          'kyc',
          'bank-details',
          'notifications',
          'profile',
          'settings',
          'join',
          'join-hotel',
          'join-lodge',
          'join-resort',
          'join-homestay',
        ].map((page) => (
          <Route key={page} path={page} element={<Navigate to={`/hotel/partner/${page}`} replace />} />
        ))}
        <Route path="login" element={<Navigate to="/hotel/partner/login" replace />} />
        <Route path="partner-dashboard" element={<Navigate to="/hotel/partner/dashboard" replace />} />

        {/* Absolute, not "admin": a relative target re-resolves against the
            unmatched URL, so every miss appended another /admin forever. */}
        <Route path="*" element={<Navigate to="/hotel/admin" replace />} />
      </Routes>
    </Suspense>
  );
}
