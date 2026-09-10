import { Routes, Route, useLocation, Navigate } from '../router';
import { motion } from 'framer-motion';
import { useBooking } from '../context/BookingContext';

import { LoginScreen } from '../pages/LoginScreen';
import { HomeScreen } from '../pages/HomeScreen';
import { TouristPlacesList } from '../pages/TouristPlacesList';
import { TouristPlaceDetail } from '../pages/TouristPlaceDetail';
import { RideBookingScreen } from '../pages/RideBookingScreen';
import { HotelListScreen } from '../pages/HotelListScreen';
import { HotelDetailScreen } from '../pages/HotelDetailScreen';
import { HotelBookingScreen } from '../pages/HotelBookingScreen';
import { RestaurantListScreen } from '../pages/RestaurantListScreen';
import { RestaurantDetailScreen } from '../pages/RestaurantDetailScreen';
import { CartScreen } from '../pages/CartScreen';
import { OrderTrackingScreen } from '../pages/OrderTrackingScreen';
import { TourPackageListScreen } from '../pages/TourPackageListScreen';
import { TourPackageDetailScreen } from '../pages/TourPackageDetailScreen';
import { TourBookingScreen } from '../pages/TourBookingScreen';
import { FestivalListScreen } from '../pages/FestivalListScreen';
import { FestivalDetailScreen } from '../pages/FestivalDetailScreen';
import { HelpSupportScreen } from '../pages/HelpSupportScreen';
import { RatingReviewScreen } from '../pages/RatingReviewScreen';
import { MyBookingsScreen } from '../pages/MyBookingsScreen';
import { ProfileScreen } from '../pages/ProfileScreen';
import { MoreScreen } from '../pages/MoreScreen';
import { BottomNav } from '../components/layout/BottomNav';

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0.9 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.12, ease: 'easeOut' }}
    className="w-full flex-1 flex flex-col"
  >
    {children}
  </motion.div>
);

export const UserRoutes = () => {
  const location = useLocation();
  const { user } = useBooking();

  // Hide bottom nav on any detail page (places, restaurants, hotels, packages, festivals),
  // taxi ride booking, checkouts, live order tracking, support, review, and login.
  const isDetailPageOrSubflow =
    location.pathname === '/login' ||
    location.pathname === '/book-ride' ||
    location.pathname === '/support' ||
    location.pathname === '/review' ||
    location.pathname === '/food/cart' ||
    location.pathname.startsWith('/food/orders') ||
    location.pathname.endsWith('/book') ||
    /^\/places\/[^/]+$/.test(location.pathname) ||
    /^\/hotels\/[^/]+$/.test(location.pathname) ||
    /^\/food\/[^/]+$/.test(location.pathname) ||
    /^\/packages\/[^/]+$/.test(location.pathname) ||
    /^\/festivals\/[^/]+$/.test(location.pathname);

  const showBottomNav = user.isLoggedIn && !isDetailPageOrSubflow;

  return (
    <div className="w-full flex-1 flex flex-col relative">
      {/* Route Content */}
      <div className="flex-1 w-full flex flex-col">
        {/* No `location` prop: this is a descendant <Routes> mounted under the
            module's base, while `location` here is base-stripped for the path
            checks above. Passing it would fight the router's own base. */}
        <Routes key={location.pathname}>
          {/* Default demo entrypoint: If not logged in, show Login Screen */}
          <Route
            path="login"
            element={
              <PageWrapper>
                <LoginScreen />
              </PageWrapper>
            }
          />

          <Route
            path=""
            element={
              user.isLoggedIn ? (
                <PageWrapper>
                  <HomeScreen />
                </PageWrapper>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="home"
            element={
              <PageWrapper>
                <HomeScreen />
              </PageWrapper>
            }
          />

          <Route
            path="places"
            element={
              <PageWrapper>
                <TouristPlacesList />
              </PageWrapper>
            }
          />
          <Route
            path="places/:id"
            element={
              <PageWrapper>
                <TouristPlaceDetail />
              </PageWrapper>
            }
          />
          <Route
            path="book-ride"
            element={
              <PageWrapper>
                <RideBookingScreen />
              </PageWrapper>
            }
          />
          <Route
            path="hotels"
            element={
              <PageWrapper>
                <HotelListScreen />
              </PageWrapper>
            }
          />
          <Route
            path="hotels/:id"
            element={
              <PageWrapper>
                <HotelDetailScreen />
              </PageWrapper>
            }
          />
          <Route
            path="hotels/:id/book"
            element={
              <PageWrapper>
                <HotelBookingScreen />
              </PageWrapper>
            }
          />
          <Route
            path="food"
            element={
              <PageWrapper>
                <RestaurantListScreen />
              </PageWrapper>
            }
          />
          <Route
            path="food/:id"
            element={
              <PageWrapper>
                <RestaurantDetailScreen />
              </PageWrapper>
            }
          />
          <Route
            path="food/cart"
            element={
              <PageWrapper>
                <CartScreen />
              </PageWrapper>
            }
          />
          <Route
            path="food/orders/:id"
            element={
              <PageWrapper>
                <OrderTrackingScreen />
              </PageWrapper>
            }
          />
          <Route
            path="packages"
            element={
              <PageWrapper>
                <TourPackageListScreen />
              </PageWrapper>
            }
          />
          <Route
            path="packages/:id"
            element={
              <PageWrapper>
                <TourPackageDetailScreen />
              </PageWrapper>
            }
          />
          <Route
            path="packages/:id/book"
            element={
              <PageWrapper>
                <TourBookingScreen />
              </PageWrapper>
            }
          />
          <Route
            path="festivals"
            element={
              <PageWrapper>
                <FestivalListScreen />
              </PageWrapper>
            }
          />
          <Route
            path="festivals/:id"
            element={
              <PageWrapper>
                <FestivalDetailScreen />
              </PageWrapper>
            }
          />
          <Route
            path="support"
            element={
              <PageWrapper>
                <HelpSupportScreen />
              </PageWrapper>
            }
          />
          <Route
            path="review"
            element={
              <PageWrapper>
                <RatingReviewScreen />
              </PageWrapper>
            }
          />
          <Route
            path="bookings"
            element={
              <PageWrapper>
                <MyBookingsScreen />
              </PageWrapper>
            }
          />
          <Route
            path="profile"
            element={
              <PageWrapper>
                <ProfileScreen />
              </PageWrapper>
            }
          />
          <Route
            path="more"
            element={
              <PageWrapper>
                <MoreScreen />
              </PageWrapper>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Persistent Bottom Nav (Mounted only when logged in) */}
      {showBottomNav && <BottomNav />}
    </div>
  );
};
