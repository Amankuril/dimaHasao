import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PLACES_DATA, TRANSPORTS_DATA } from '../data/dh/tourismData';
import { fetchMyOrders } from '../api/dh/foodApi';
import { fetchMyBookings as fetchMyTourBookings } from '../api/dh/toursApi';
import { fetchMyHotelBookings } from '../api/dh/hotelApi';
import { fetchMyRides } from '../api/dh/taxiApi';
import { fetchMyPasses } from '../api/dh/festivalApi';
import { useAuth } from './AuthContext';
import { localStore } from '../lib/storage';

/*
 * Port of Frontend/src/modules/DimaHasao/context/BookingContext.jsx.
 *
 * The v1 food cart (addToCart / createFoodOrder ...) is not ported: only the
 * unrouted v1 food screens used it, and the web redirects those paths to the
 * real food module.
 */

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  const { signedIn, user: authUser, loginWithAuthData, logout: authLogout } = useAuth();

  // The web keeps `dima_user` in sessionStorage and falls back to the module
  // session; here the module session is the single source.
  // The profile screen's edit dialog changes the name/phone shown for this
  // session only (web: sessionStorage `dima_user`); nothing is sent to the API.
  const [profileOverride, setProfileOverride] = useState(null);

  const user = useMemo(() => {
    if (!signedIn) return { name: 'Guest', phone: '', isLoggedIn: false };
    let info = {};
    try {
      info = JSON.parse(localStore.getItem('userInfo') || '{}') || {};
    } catch {
      info = {};
    }
    return {
      name: profileOverride?.name || authUser?.name || info.name || 'Explorer',
      phone: profileOverride?.phone || authUser?.phone || info.phone || '',
      id: authUser?._id || authUser?.id || null,
      isLoggedIn: true,
    };
  }, [signedIn, authUser, profileOverride]);

  const [selectedPlaceId, setSelectedPlaceId] = useState('1');
  const [selectedTransportId, setSelectedTransportId] = useState('auto');
  const [pickupLocation, setPickupLocation] = useState('Haflong Station');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const [favorites, setFavorites] = useState(['1']);
  const [favoriteHotels, setFavoriteHotels] = useState(['h1']);

  const [bookings, setBookings] = useState([]);
  const [hotelBookings, setHotelBookings] = useState([]);
  const [foodOrders, setFoodOrders] = useState([]);
  const [tourBookings, setTourBookings] = useState([]);
  const [tourBookingsLoading, setTourBookingsLoading] = useState(false);
  const [festivalBookings, setFestivalBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimer = useRef(null);

  const activePlace = PLACES_DATA.find((p) => p.id === selectedPlaceId) || PLACES_DATA[0];
  const activeTransport = TRANSPORTS_DATA.find((t) => t.id === selectedTransportId) || TRANSPORTS_DATA[1];

  const showToast = useCallback((msg, duration = 3000) => {
    setToastMessage(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), duration);
  }, []);

  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  const toggleFavorite = useCallback(
    (placeId) => {
      setFavorites((prev) => {
        const exists = prev.includes(placeId);
        showToast(exists ? 'Removed from favorites' : 'Added to favorites ❤️');
        return exists ? prev.filter((id) => id !== placeId) : [...prev, placeId];
      });
    },
    [showToast],
  );

  const toggleFavoriteHotel = useCallback(
    (hotelId) => {
      setFavoriteHotels((prev) => {
        const exists = prev.includes(hotelId);
        showToast(exists ? 'Removed hotel from saved' : 'Saved hotel to wishlist ❤️');
        return exists ? prev.filter((id) => id !== hotelId) : [...prev, hotelId];
      });
    },
    [showToast],
  );

  /** setUnifiedAuthData(data) + login(phone, profile) of the web. */
  const login = useCallback(
    async (data) => {
      const u = await loginWithAuthData(data);
      showToast('Welcome to Dima Hasao! 🌿');
      return u;
    },
    [loginWithAuthData, showToast],
  );

  const logout = useCallback(async () => {
    setProfileOverride(null);
    await authLogout();
    showToast('Logged out successfully');
  }, [authLogout, showToast]);

  const isLoggedIn = user.isLoggedIn;

  // Each list is refreshed independently so one module being down empties
  // only its own tab. A failed refresh keeps what the traveller is looking at.
  const refreshTourBookings = useCallback(async () => {
    if (!isLoggedIn) { setTourBookings([]); return []; }
    try {
      setTourBookingsLoading(true);
      const list = await fetchMyTourBookings();
      setTourBookings(list);
      return list;
    } catch {
      return null;
    } finally {
      setTourBookingsLoading(false);
    }
  }, [isLoggedIn]);

  const refreshHotelBookings = useCallback(async () => {
    if (!isLoggedIn) { setHotelBookings([]); return []; }
    try {
      const list = await fetchMyHotelBookings();
      setHotelBookings(list);
      return list;
    } catch {
      return null;
    }
  }, [isLoggedIn]);

  const refreshRides = useCallback(async () => {
    if (!isLoggedIn) { setBookings([]); return []; }
    try {
      const list = await fetchMyRides();
      setBookings(list);
      return list;
    } catch {
      return null;
    }
  }, [isLoggedIn]);

  const refreshFestivalBookings = useCallback(async () => {
    if (!isLoggedIn) { setFestivalBookings([]); return []; }
    try {
      const list = await fetchMyPasses();
      setFestivalBookings(list);
      return list;
    } catch {
      return null;
    }
  }, [isLoggedIn]);

  const refreshFoodOrders = useCallback(async () => {
    if (!isLoggedIn) { setFoodOrders([]); return []; }
    try {
      const list = await fetchMyOrders();
      setFoodOrders(list);
      return list;
    } catch {
      return null;
    }
  }, [isLoggedIn]);

  /** Everything at once: used on sign-in and when the bookings screen opens. */
  const refreshAllBookings = useCallback(async () => {
    setBookingsLoading(true);
    await Promise.allSettled([
      refreshTourBookings(),
      refreshHotelBookings(),
      refreshRides(),
      refreshFoodOrders(),
      refreshFestivalBookings(),
    ]);
    setBookingsLoading(false);
  }, [refreshTourBookings, refreshHotelBookings, refreshRides, refreshFoodOrders, refreshFestivalBookings]);

  useEffect(() => {
    refreshAllBookings();
  }, [refreshAllBookings]);

  const value = {
    user,
    login,
    logout,
    saveLocalProfile: setProfileOverride,
    selectedPlaceId,
    setSelectedPlaceId,
    selectedTransportId,
    setSelectedTransportId,
    pickupLocation,
    setPickupLocation,
    paymentMethod,
    setPaymentMethod,
    activePlace,
    activeTransport,
    favorites,
    toggleFavorite,
    favoriteHotels,
    toggleFavoriteHotel,
    bookings,
    hotelBookings,
    foodOrders,
    tourBookings,
    tourBookingsLoading,
    refreshTourBookings,
    refreshHotelBookings,
    refreshRides,
    refreshFoodOrders,
    refreshFestivalBookings,
    refreshAllBookings,
    bookingsLoading,
    festivalBookings,
    searchQuery,
    setSearchQuery,
    isNotificationsOpen,
    setIsNotificationsOpen,
    toastMessage,
    showToast,
  };

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) throw new Error('useBooking must be used within a BookingProvider');
  return context;
}
