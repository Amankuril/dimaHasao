/**
 * Ported from Frontend/src/modules/DimaHasao/context/BookingContext.jsx —
 * the single source of truth for the user app (lightweight session, cart,
 * and the five booking lists refreshed from their own modules).
 *
 * RN-specific changes:
 *  - `user` can't be read synchronously on mount (AsyncStorage is async), so
 *    it starts as a guest and an effect hydrates it once storage resolves.
 *  - `sessionStorage` (cleared on tab close) has no RN equivalent; AsyncStorage
 *    is used instead, which means the lightweight login now survives an app
 *    restart like everything else here — arguably the more correct mobile
 *    behaviour anyway.
 *  - `window.confirm` becomes `Alert.alert`, so `addToCart`'s cross-restaurant
 *    guard resolves via a callback instead of a return value.
 *  - The old `toastMessage` state existed only for the web's own toast UI
 *    (MobileFrame.jsx); RN renders toasts through `react-native-toast-message`
 *    directly, so `showToast` calls that instead of holding local state.
 */
import {createContext, useContext, useState, useEffect, useCallback} from 'react';
import {Alert} from 'react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {PLACES_DATA, TRANSPORTS_DATA} from '../data/tourismData';
import {calculateOrder, placeOrder, fetchMyOrders} from '../services/foodApi';
import {fetchMyBookings as fetchMyTourBookings} from '../services/toursApi';
import {fetchMyHotelBookings} from '../services/hotelApi';
import {fetchMyRides} from '../services/taxiApi';
import {fetchMyPasses} from '../services/festivalApi';
import {isModuleAuthenticated, getCurrentUser, clearAuthData} from '../utils/moduleAuth';
import {clearCache} from '../services/cache';

const PAYMENT_METHOD_MAP = {
  'Cash on Delivery': 'cash',
  'UPI (Instant)': 'razorpay',
  'Card / Net Banking': 'card',
};

const DIMA_USER_KEY = 'dima_user';

const BookingContext = createContext(null);

export const BookingProvider = ({children}) => {
  const [user, setUser] = useState({name: 'Guest', phone: '', isLoggedIn: false});
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(DIMA_USER_KEY);
        if (saved) {
          setUser(JSON.parse(saved));
          return;
        }

        if (await isModuleAuthenticated('user')) {
          const info = (await getCurrentUser('user')) || {};
          setUser({name: info.name || 'Explorer', phone: info.phone || '', isLoggedIn: true});
        }
      } catch {
        // fall through to guest
      } finally {
        setIsHydrated(true);
      }
    })();
  }, []);

  const [selectedPlaceId, setSelectedPlaceId] = useState('1');
  const [selectedTransportId, setSelectedTransportId] = useState('auto');
  const [pickupLocation, setPickupLocation] = useState('Haflong Station');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const [favorites, setFavorites] = useState(['1']);
  const [favoriteHotels, setFavoriteHotels] = useState(['h1']);

  const [bookings, setBookings] = useState([]);
  const [hotelBookings, setHotelBookings] = useState([]);

  const [cart, setCart] = useState([]);
  const [cartRestaurant, setCartRestaurant] = useState(null);

  const [foodOrders, setFoodOrders] = useState([]);

  const [tourBookings, setTourBookings] = useState([]);
  const [tourBookingsLoading, setTourBookingsLoading] = useState(false);

  const [festivalBookings, setFestivalBookings] = useState([]);

  const showToast = (msg, duration = 3000) => {
    Toast.show({type: 'success', text1: msg, visibilityTime: duration});
  };

  const addItemToCart = (restaurant, item) => {
    setCartRestaurant({id: restaurant.id, name: restaurant.name});
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => (i.id === item.id ? {...i, quantity: i.quantity + 1} : i));
      }
      return [...prev, {...item, quantity: 1}];
    });
    showToast(`Added ${item.name} to cart 🍲`);
  };

  const addToCart = (restaurant, item) => {
    if (cartRestaurant && cartRestaurant.id !== restaurant.id) {
      Alert.alert(
        'Replace cart items?',
        `Your cart contains items from "${cartRestaurant.name}". Reset cart to add items from "${restaurant.name}"?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Reset',
            style: 'destructive',
            onPress: () => {
              setCart([{...item, quantity: 1}]);
              setCartRestaurant({id: restaurant.id, name: restaurant.name});
              showToast(`Added ${item.name} to cart 🍲`);
            },
          },
        ],
      );
      return;
    }

    addItemToCart(restaurant, item);
  };

  const updateCartQuantity = (itemId, delta) => {
    setCart(prev =>
      prev
        .map(i => {
          if (i.id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? {...i, quantity: newQty} : null;
          }
          return i;
        })
        .filter(Boolean),
    );
  };

  const removeFromCart = itemId => {
    setCart(prev => prev.filter(i => i.id !== itemId));
    showToast('Item removed from cart');
  };

  const clearCart = () => {
    setCart([]);
    setCartRestaurant(null);
  };

  const submitFoodOrderToApi = async (orderDetails = {}) => {
    const restaurantId = cartRestaurant?.id;
    if (!restaurantId || cart.length === 0) return null;

    const items = cart.map(item => ({
      itemId: String(item.id),
      name: item.name,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      isVeg: item.isVeg !== false,
      ...(item.image ? {image: item.image} : {}),
    }));

    const orderType = orderDetails.deliveryMode === 'delivery' ? 'delivery' : 'takeaway';
    const paymentMethodValue = PAYMENT_METHOD_MAP[orderDetails.paymentMethod] || 'cash';

    const basePayload = {useCart: false, items, restaurantId, orderType};

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
        total: Number(orderDetails.totalAmount) || 0,
      };
    }

    const payload = {
      ...basePayload,
      paymentMethod: paymentMethodValue,
      pricing,
      ...(orderDetails.cookingInstructions ? {restaurantNote: orderDetails.cookingInstructions} : {}),
      ...(orderType === 'delivery' && orderDetails.deliveryAddress
        ? {address: {street: String(orderDetails.deliveryAddress), city: 'Haflong', state: 'Assam'}}
        : {}),
    };

    const result = await placeOrder(payload);
    const order = result?.order || result;
    const id = order?.orderId || order?._id || order?.id;
    return id ? {id: String(id), raw: order} : null;
  };

  const createFoodOrder = async orderDetails => {
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
      ...orderDetails,
    };

    try {
      const placed = await submitFoodOrderToApi(orderDetails);
      if (placed?.id) {
        newOrder.id = placed.id;
        newOrder.serverOrder = placed.raw;
      }
    } catch {
      /* keep the local order */
    }

    setFoodOrders(prev => [newOrder, ...prev]);
    clearCart();
    return newOrder;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const activePlace = PLACES_DATA.find(p => p.id === selectedPlaceId) || PLACES_DATA[0];
  const activeTransport = TRANSPORTS_DATA.find(t => t.id === selectedTransportId) || TRANSPORTS_DATA[1];

  const toggleFavorite = placeId => {
    setFavorites(prev => {
      const exists = prev.includes(placeId);
      const updated = exists ? prev.filter(id => id !== placeId) : [...prev, placeId];
      showToast(exists ? 'Removed from favorites' : 'Added to favorites ❤️');
      return updated;
    });
  };

  const toggleFavoriteHotel = hotelId => {
    setFavoriteHotels(prev => {
      const exists = prev.includes(hotelId);
      const updated = exists ? prev.filter(id => id !== hotelId) : [...prev, hotelId];
      showToast(exists ? 'Removed hotel from saved' : 'Saved hotel to wishlist ❤️');
      return updated;
    });
  };

  const login = async (phone, profile = null) => {
    clearCache();
    const newUser = {
      name: profile?.name || 'Dima Explorer',
      phone: profile?.phone || phone || '',
      id: profile?._id || profile?.id || null,
      isLoggedIn: true,
    };
    setUser(newUser);
    await AsyncStorage.setItem(DIMA_USER_KEY, JSON.stringify(newUser));
    showToast('Welcome to Dima Hasao! 🌿');
  };

  const logout = async () => {
    setUser({name: 'Guest', phone: '', isLoggedIn: false});
    await AsyncStorage.removeItem(DIMA_USER_KEY);
    await clearAuthData();
    clearCache();
    showToast('Logged out successfully');
  };

  const createBooking = () => {
    const newId = `DH-BK-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
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
      vehicleNo:
        activeTransport.id === 'bike' ? 'AS-09-B-1089' : activeTransport.id === 'cab' ? 'AS-09-C-9921' : 'AS-09-A-5420',
      otp: Math.floor(1000 + Math.random() * 9000).toString(),
      createdAt: new Date().toISOString(),
    };
  };

  const [bookingsLoading, setBookingsLoading] = useState(false);

  const refreshTourBookings = useCallback(async () => {
    if (!user.isLoggedIn) {
      setTourBookings([]);
      return [];
    }
    try {
      setTourBookingsLoading(true);
      const list = await fetchMyTourBookings();
      setTourBookings(list);
      return list;
    } catch {
      return tourBookings;
    } finally {
      setTourBookingsLoading(false);
    }
  }, [user.isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshHotelBookings = useCallback(async () => {
    if (!user.isLoggedIn) {
      setHotelBookings([]);
      return [];
    }
    try {
      const list = await fetchMyHotelBookings();
      setHotelBookings(list);
      return list;
    } catch {
      return hotelBookings;
    }
  }, [user.isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshRides = useCallback(async () => {
    if (!user.isLoggedIn) {
      setBookings([]);
      return [];
    }
    try {
      const list = await fetchMyRides();
      setBookings(list);
      return list;
    } catch {
      return bookings;
    }
  }, [user.isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshFestivalBookings = useCallback(async () => {
    if (!user.isLoggedIn) {
      setFestivalBookings([]);
      return [];
    }
    try {
      const list = await fetchMyPasses();
      setFestivalBookings(list);
      return list;
    } catch {
      return festivalBookings;
    }
  }, [user.isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshFoodOrders = useCallback(async () => {
    if (!user.isLoggedIn) {
      setFoodOrders([]);
      return [];
    }
    try {
      const list = await fetchMyOrders();
      setFoodOrders(list);
      return list;
    } catch {
      return foodOrders;
    }
  }, [user.isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (isHydrated) refreshAllBookings();
  }, [isHydrated, refreshAllBookings]);

  return (
    <BookingContext.Provider
      value={{
        user,
        isHydrated,
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
        showToast,
      }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
