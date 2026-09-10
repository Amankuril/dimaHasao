import { createContext, useContext, useState } from 'react';
import { PLACES_DATA, TRANSPORTS_DATA } from '../data/tourismData';
import { calculateOrder, placeOrder } from '../services/foodApi';
import { isModuleAuthenticated, clearAuthData } from '../../../shared/utils/moduleAuth';

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
  const [bookings, setBookings] = useState([
    {
      id: 'DH-BK-8902',
      placeId: '1',
      placeName: 'I LOVE DIMA HASAO',
      pickup: 'Haflong Station',
      transport: 'Auto',
      fare: 150,
      date: 'Today, 4:30 PM',
      status: 'Confirmed',
      driverName: 'Ramen Dimasa',
      driverPhone: '+91 94350 12345',
      vehicleNo: 'AS-09-A-4821',
      otp: '7412'
    }
  ]);

  // Hotel Bookings list
  const [hotelBookings, setHotelBookings] = useState([
    {
      id: 'DH-HTL-7741',
      hotelId: 'h1',
      hotelName: 'The Landmark Hills Resort & Spa',
      roomName: 'Deluxe Valley View Room',
      location: 'Upper Bagetar, Haflong',
      checkIn: 'Tomorrow, 12:00 PM',
      checkOut: 'Next Day, 11:00 AM',
      nights: 1,
      guests: '2 Adults',
      roomCount: 1,
      totalAmount: 4256,
      paymentMethod: 'UPI (GPay)',
      paymentStatus: 'Paid',
      status: 'Confirmed',
      bookingDate: 'Today, 2:15 PM',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      guestName: 'Dima Explorer',
      guestPhone: '+91 98765 43210'
    }
  ]);

  // Food Ordering Cart State
  const [cart, setCart] = useState([]);
  const [cartRestaurant, setCartRestaurant] = useState(null);

  // Food Orders History
  const [foodOrders, setFoodOrders] = useState([
    {
      id: 'DH-FD-3109',
      restaurantId: 'r1',
      restaurantName: 'Dimasa Ethnic Kitchen & Judima Lounge',
      items: [
        { id: 'r1-m1', name: 'Muri Bamboo Smoked Pork', price: 320, quantity: 1 },
        { id: 'r1-m2', name: 'Mai-ju Sticky Rice', price: 80, quantity: 2 }
      ],
      subtotal: 480,
      deliveryFee: 40,
      gst: 24,
      totalAmount: 544,
      deliveryAddress: 'Circuit House Road, Haflong',
      status: 'Delivered',
      orderTime: 'Yesterday, 8:15 PM',
      deliveryPartner: 'Bijoy Dimasa',
      partnerPhone: '+91 94352 77112',
      estimatedTime: 'Delivered in 28 mins'
    }
  ]);

  // Tour Package Bookings
  const [tourBookings, setTourBookings] = useState([
    {
      id: 'DH-TOUR-1044',
      packageId: 'pkg-1',
      packageTitle: 'Haflong & Jatinga Bird Phenomenon Tour',
      duration: '2 Days / 1 Night',
      travelDate: 'Coming Weekend (Saturday)',
      travelers: '2 Adults',
      totalAmount: 8400,
      paymentMethod: 'UPI (GPay)',
      paymentStatus: 'Paid',
      status: 'Confirmed',
      guideAssigned: 'Sonjit Daulagupu (Certified Guide)',
      guidePhone: '+91 94353 11889',
      pickupPoint: 'Haflong Railway Station (Pickup at 9:00 AM)',
      bookingDate: 'Yesterday, 4:00 PM',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'
    }
  ]);

  // Festival Ticket Bookings
  const [festivalBookings, setFestivalBookings] = useState([
    {
      id: 'DH-FEST-9021',
      festivalId: 'fest-1',
      festivalName: 'Falcon Festival Umrangso 2026',
      ticketCategory: '3-Day All-Access Season Pass',
      ticketCount: 2,
      totalAmount: 1300,
      venue: 'Golf Field Grounds, Umrangso',
      dates: 'Nov 14 - Nov 17, 2026',
      status: 'Confirmed',
      paymentStatus: 'Paid Online',
      bookingDate: 'Yesterday, 6:30 PM',
      qrCode: 'DH-FF-74129',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'
    }
  ]);

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

    setBookings(prev => [newBooking, ...prev]);
    return newBooking;
  };

  const createHotelBooking = (bookingDetails) => {
    const newId = `DH-HTL-${Math.floor(1000 + Math.random() * 9000)}`;
    const newHotelBooking = {
      id: newId,
      bookingDate: 'Just now',
      status: 'Confirmed',
      paymentStatus: bookingDetails.paymentMethod === 'cash' ? 'Pay at Property' : 'Paid Online',
      createdAt: new Date().toISOString(),
      ...bookingDetails
    };

    setHotelBookings(prev => [newHotelBooking, ...prev]);
    return newHotelBooking;
  };

  const createTourBooking = (bookingDetails) => {
    const newId = `DH-TOUR-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTourBooking = {
      id: newId,
      bookingDate: 'Just now',
      status: 'Confirmed',
      paymentStatus: 'Paid Online',
      guideAssigned: 'Local Certified Dimasa Guide (Assigned)',
      guidePhone: '+91 94350 88334',
      createdAt: new Date().toISOString(),
      ...bookingDetails
    };

    setTourBookings((prev) => [newTourBooking, ...prev]);
    return newTourBooking;
  };

  const createFestivalBooking = (bookingDetails) => {
    const newId = `DH-FEST-${Math.floor(1000 + Math.random() * 9000)}`;
    const newFestBooking = {
      id: newId,
      bookingDate: 'Just now',
      status: 'Confirmed',
      paymentStatus: 'Paid Online',
      qrCode: `DH-PASS-${Math.floor(10000 + Math.random() * 90000)}`,
      createdAt: new Date().toISOString(),
      ...bookingDetails
    };

    setFestivalBookings((prev) => [newFestBooking, ...prev]);
    return newFestBooking;
  };

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
        createHotelBooking,
        cart,
        cartRestaurant,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        foodOrders,
        createFoodOrder,
        tourBookings,
        createTourBooking,
        festivalBookings,
        createFestivalBooking,
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
