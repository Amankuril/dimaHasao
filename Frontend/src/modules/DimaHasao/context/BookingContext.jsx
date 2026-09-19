import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PLACES_DATA, TRANSPORTS_DATA } from '../data/tourismData';
import { calculateOrder, placeOrder, fetchMyOrders } from '../services/foodApi';
import { fetchMyBookings as fetchMyTourBookings } from '../services/toursApi';
import { fetchMyHotelBookings } from '../services/hotelApi';
import { fetchMyRides } from '../services/taxiApi';
import { fetchMyPasses } from '../services/festivalApi';
import { isModuleAuthenticated, clearAuthData } from '../../../shared/utils/moduleAuth';
import { clearCache } from '../services/cache';

// v1's display labels -> the API's paymentMethod enum
const PAYMENT_METHOD_MAP = {
  'Cash on Delivery': 'cash',
  'UPI (Instant)': 'razorpay',
  'Card / Net Banking': 'card',
};

const BookingContext = createContext(null);

export const BookingProvider = ({ children }) => {
  // Authentication State. Survives a reload by trusting the real module session
  // (set by setUnifiedAuthData on login) before falling back to the local record.
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('dima_user');
      if (saved) return JSON.parse(saved);

      if (isModuleAuthenticated('user')) {
        const info = JSON.parse(localStorage.getItem('userInfo') || '{}');
        return {
          name: info.name || 'Explorer',
          phone: info.phone || '',
          isLoggedIn: true
        };
      }
    } catch {
      /* fall through to guest */
    }
    return { name: 'Guest', phone: '', isLoggedIn: false };
  });

  // Selected Trip Details
  const [selectedPlaceId, setSelectedPlaceId] = useState('1');
  const [selectedTransportId, setSelectedTransportId] = useState('auto');
  const [pickupLocation, setPickupLocation] = useState('Haflong Station');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Favorites
  const [favorites, setFavorites] = useState(['1']);
  const [favoriteHotels, setFavoriteHotels] = useState(['h1']);

  // Taxi Bookings list
  // Rides — the real ones, from the taxi module.
  const [bookings, setBookings] = useState([]);

  // Hotel stays — the real ones, from /v1/hotel/bookings/my.
  const [hotelBookings, setHotelBookings] = useState([]);

  // Food Ordering Cart State
  const [cart, setCart] = useState([]);
  const [cartRestaurant, setCartRestaurant] = useState(null);

  // Food Orders History
  const [foodOrders, setFoodOrders] = useState([]);

  // Tour Package Bookings — the real ones, from /v1/tours/bookings/my.
  const [tourBookings, setTourBookings] = useState([]);
  const [tourBookingsLoading, setTourBookingsLoading] = useState(false);

  // Festival Ticket Bookings
  // Festival passes — the real ones, from /v1/festivals/bookings/my.
  const [festivalBookings, setFestivalBookings] = useState([]);

  // Cart Management Functions
  const addToCart = (restaurant, item) => {
    // If cart has items from another restaurant, reset cart
    if (cartRestaurant && cartRestaurant.id !== restaurant.id) {
      if (
        !window.confirm(
          `Your cart contains items from "${cartRestaurant.name}". Reset cart to add items from "${restaurant.name}"?`
        )
      ) {
        return;
      }
      setCart([{ ...item, quantity: 1 }]);
      setCartRestaurant({ id: restaurant.id, name: restaurant.name });
      showToast(`Added ${item.name} to cart 🍲`);
      return;
    }

    setCartRestaurant({ id: restaurant.id, name: restaurant.name });
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    showToast(`Added ${item.name} to cart 🍲`);
  };

  const updateCartQuantity = (itemId, delta) => {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean);
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
    showToast('Item removed from cart');
  };

  const clearCart = () => {
    setCart([]);
    setCartRestaurant(null);
  };

  const createFoodOrder = async (orderDetails) => {
    const newId = `DH-FD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      id: newId,
      restaurantId: cartRestaurant?.id || 'r1',
      restaurantName: cartRestaurant?.name || 'Local Restaurant',
      items: [...cart],
      status: 'Placed',
      orderTime: 'Just now',
      deliveryPartner: 'Haflong Express Partner',
      partnerPhone: '+91 94350 44221',
      estimatedTime: '25-35 mins',
      ...orderDetails
    };

    // Try the real order API; fall back to the local record so the approved
    // flow still completes when the backend is unavailable.
    try {
      const placed = await submitFoodOrderToApi(orderDetails);
      if (placed?.id) {
        newOrder.id = placed.id;
        newOrder.serverOrder = placed.raw;
      }
    } catch {
      /* keep the local order */
    }

    setFoodOrders((prev) => [newOrder, ...prev]);
    clearCart();
    return newOrder;
  };

  const submitFoodOrderToApi = async (orderDetails = {}) => {
    const restaurantId = cartRestaurant?.id;
    if (!restaurantId || cart.length === 0) return null;

    const items = cart.map((item) => ({
      itemId: String(item.id),
      name: item.name,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      isVeg: item.isVeg !== false,
      ...(item.image ? { image: item.image } : {})
    }));

    const orderType = orderDetails.deliveryMode === 'delivery' ? 'delivery' : 'takeaway';
    const paymentMethod = PAYMENT_METHOD_MAP[orderDetails.paymentMethod] || 'cash';

    const basePayload = { useCart: false, items, restaurantId, orderType };

    // Let the server price the order; fall back to the UI's own totals.
    let pricing;
    try {
      const calculated = await calculateOrder(basePayload);
      pricing = calculated?.pricing || calculated;
    } catch {
      pricing = {
        subtotal: Number(orderDetails.subtotal) || 0,
        tax: Number(orderDetails.gst) || 0,
        packagingFee: Number(orderDetails.packagingFee) || 0,
        deliveryFee: Number(orderDetails.deliveryFee) || 0,
        discount: Number(orderDetails.discountAmount) || 0,
        total: Number(orderDetails.totalAmount) || 0
      };
    }

    const payload = {
      ...basePayload,
      paymentMethod,
      pricing,
      ...(orderDetails.cookingInstructions ? { restaurantNote: orderDetails.cookingInstructions } : {}),
      ...(orderType === 'delivery' && orderDetails.deliveryAddress
        ? {
            address: {
              street: String(orderDetails.deliveryAddress),
              city: 'Haflong',
              state: 'Assam'
            }
          }
        : {})
    };

    const result = await placeOrder(payload);
    const order = result?.order || result;
    const id = order?.orderId || order?._id || order?.id;
    return id ? { id: String(id), raw: order } : null;
  };

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Active Place & Transport Objects
  const activePlace = PLACES_DATA.find(p => p.id === selectedPlaceId) || PLACES_DATA[0];
  const activeTransport = TRANSPORTS_DATA.find(t => t.id === selectedTransportId) || TRANSPORTS_DATA[1];

  const showToast = (msg, duration = 3000) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, duration);
  };

  const toggleFavorite = (placeId) => {
    setFavorites(prev => {
      const exists = prev.includes(placeId);
      const updated = exists ? prev.filter(id => id !== placeId) : [...prev, placeId];
      showToast(exists ? 'Removed from favorites' : 'Added to favorites ❤️');
      return updated;
    });
  };

  const toggleFavoriteHotel = (hotelId) => {
    setFavoriteHotels(prev => {
      const exists = prev.includes(hotelId);
      const updated = exists ? prev.filter(id => id !== hotelId) : [...prev, hotelId];
      showToast(exists ? 'Removed hotel from saved' : 'Saved hotel to wishlist ❤️');
      return updated;
    });
  };

  const login = (phone, profile = null) => {
    // Whoever was cached before this is not the person signing in now.
    clearCache();
    const newUser = {
      name: profile?.name || 'Dima Explorer',
      phone: profile?.phone || phone || '',
      id: profile?._id || profile?.id || null,
      isLoggedIn: true
    };
    setUser(newUser);
    sessionStorage.setItem('dima_user', JSON.stringify(newUser));
    showToast('Welcome to Dima Hasao! 🌿');
  };

  const logout = () => {
    setUser({ name: 'Guest', phone: '', isLoggedIn: false });
    sessionStorage.removeItem('dima_user');
    clearAuthData();
    // Cached bookings and orders belong to the person who just left. Clearing
    // the token alone would leave the next person looking at their records.
    clearCache();
    showToast('Logged out successfully');
  };

  const createBooking = () => {
    const newId = `DH-BK-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking = {
      id: newId,
      placeId: activePlace.id,
      placeName: activePlace.name,
      pickup: pickupLocation,
      transport: activeTransport.name,
      fare: activeTransport.fare,
      date: 'Just now',
      status: 'Confirmed',
      driverName: 'Haflong Express Partner',
      driverPhone: '+91 94351 98765',
      vehicleNo: activeTransport.id === 'bike' ? 'AS-09-B-1089' : activeTransport.id === 'cab' ? 'AS-09-C-9921' : 'AS-09-A-5420',
      otp: Math.floor(1000 + Math.random() * 9000).toString(),
      createdAt: new Date().toISOString()
    };

    // Deliberately NOT pushed into `bookings`. That list is the real ride
    // history from the taxi module now, and RideBookingScreen is still a v1
    // shortcut that persists nothing — prepending this would put an invented
    // driver and OTP at the top of the rider's genuine history. The object is
    // still returned so the screen's own confirmation still renders.
    return newBooking;
  };


  /**
   * Every booking list the app shows, straight from its own module.
   *
   * These were all seeded fixtures before — a ride with an invented driver and
   * OTP, a stay nobody had booked — sitting next to the traveller's real ones.
   * Each list is refreshed independently so one module being down empties only
   * its own tab.
   */
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const refreshTourBookings = useCallback(async () => {
    if (!user.isLoggedIn) { setTourBookings([]); return []; }
    try {
      setTourBookingsLoading(true);
      const list = await fetchMyTourBookings();
      setTourBookings(list);
      return list;
    } catch {
      // A failed refresh must not blank a list the traveller is looking at.
      return tourBookings;
    } finally {
      setTourBookingsLoading(false);
    }
  }, [user.isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshHotelBookings = useCallback(async () => {
    if (!user.isLoggedIn) { setHotelBookings([]); return []; }
    try {
      const list = await fetchMyHotelBookings();
      setHotelBookings(list);
      return list;
    } catch {
      return hotelBookings;
    }
  }, [user.isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshRides = useCallback(async () => {
    if (!user.isLoggedIn) { setBookings([]); return []; }
    try {
      const list = await fetchMyRides();
      setBookings(list);
      return list;
    } catch {
      return bookings;
    }
  }, [user.isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshFestivalBookings = useCallback(async () => {
    if (!user.isLoggedIn) { setFestivalBookings([]); return []; }
    try {
      const list = await fetchMyPasses();
      setFestivalBookings(list);
      return list;
    } catch {
      return festivalBookings;
    }
  }, [user.isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshFoodOrders = useCallback(async () => {
    if (!user.isLoggedIn) { setFoodOrders([]); return []; }
    try {
      const list = await fetchMyOrders();
      setFoodOrders(list);
      return list;
    } catch {
      return foodOrders;
    }
  }, [user.isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Everything at once — used on sign-in and when the bookings screen opens. */
  const refreshAllBookings = useCallback(async () => {
    setBookingsLoading(true);
    // allSettled so one module's outage cannot stop the other three loading.
    await Promise.allSettled([
      refreshTourBookings(),
      refreshHotelBookings(),
      refreshRides(),
      refreshFoodOrders(),
      refreshFestivalBookings(),
    ]);
    setBookingsLoading(false);
  }, [refreshTourBookings, refreshHotelBookings, refreshRides, refreshFoodOrders, refreshFestivalBookings]);

  useEffect(() => { refreshAllBookings(); }, [refreshAllBookings]);

  return (
    <BookingContext.Provider
      value={{
        user,
        login,
        logout,
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
        createBooking,
        hotelBookings,
        cart,
        cartRestaurant,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        foodOrders,
        createFoodOrder,
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
        showToast
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
