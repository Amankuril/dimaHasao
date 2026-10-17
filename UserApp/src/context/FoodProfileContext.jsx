/**
 * Ported from Frontend/src/modules/Food/context/ProfileContext.jsx.
 * localStorage -> AsyncStorage (async hydration, same pattern as
 * BookingContext.jsx); window CustomEvents -> DeviceEventEmitter; the
 * "userAuthChanged" listener becomes the authEvents emitter (see
 * FoodCartContext.jsx's comment — same mechanism, same reason).
 * Payment-method functions are local-only here too, matching the web
 * source (no backend endpoint exists for them).
 */
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DeviceEventEmitter} from 'react-native';
import userApi from '../services/food/userApi';
import {authEvents} from '../services/api/axios';
import {isModuleAuthenticated} from '../utils/moduleAuth';

const FoodProfileContext = createContext(null);
const USER_SESSION_PREFERENCE_KEYS = ['userVegMode', 'userVegModeOption', 'userOrderType', 'food-under-250-filters'];

const getAddressId = address => address?.id || address?._id || null;
const normalizeAddressLabel = label => {
  const normalized = String(label || '').trim().toLowerCase();
  if (normalized === 'home') return 'Home';
  if (normalized === 'office' || normalized === 'work') return 'Office';
  return 'Other';
};
const normalizeAddress = address => {
  if (!address || typeof address !== 'object') return null;
  const id = getAddressId(address);
  return {...address, label: normalizeAddressLabel(address.label), ...(id ? {id: String(id)} : {})};
};
const dedupeAddressesByLabel = (addressList = []) => {
  const addressMap = new Map();
  addressList.forEach((addr, index) => {
    const normalizedAddress = normalizeAddress(addr);
    if (!normalizedAddress) return;
    const key = normalizedAddress.label || getAddressId(normalizedAddress) || index;
    addressMap.set(key, normalizedAddress);
  });
  return Array.from(addressMap.values());
};

const readJson = async (key, fallback) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export function FoodProfileProvider({children}) {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [dishFavorites, setDishFavorites] = useState([]);
  const [vegMode, setVegMode] = useState(false);
  const [vegModeOption, setVegModeOptionState] = useState('all');
  const [orderType, _setOrderType] = useState('delivery');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const [storedUser, savedProfile, savedAddresses, savedPayments, savedFavorites, savedDishFavorites, savedVegMode, savedVegModeOption, savedOrderType] = await Promise.all([
        AsyncStorage.getItem('user_user'),
        AsyncStorage.getItem('userProfile'),
        readJson('userAddresses', []),
        readJson('userPaymentMethods', []),
        readJson('userFavorites', []),
        readJson('userDishFavorites', []),
        AsyncStorage.getItem('userVegMode'),
        AsyncStorage.getItem('userVegModeOption'),
        AsyncStorage.getItem('userOrderType'),
      ]);

      try {
        setUserProfile(storedUser ? JSON.parse(storedUser) : savedProfile ? JSON.parse(savedProfile) : null);
      } catch {
        setUserProfile(null);
      }
      setAddresses(savedAddresses);
      setPaymentMethods(savedPayments);
      setFavorites(savedFavorites);
      setDishFavorites(savedDishFavorites);
      setVegMode(savedVegMode !== null ? savedVegMode === 'true' : false);
      setVegModeOptionState(savedVegModeOption === 'pure-veg' ? 'pure-veg' : 'all');
      _setOrderType(['delivery', 'dining', 'takeaway'].includes(savedOrderType) ? savedOrderType : 'delivery');
      setIsAuthenticated(await isModuleAuthenticated('user'));
      setIsHydrated(true);
    })();
  }, []);

  const setVegModeOption = useCallback(next => {
    const normalized = next === 'pure-veg' ? 'pure-veg' : 'all';
    AsyncStorage.setItem('userVegModeOption', normalized).catch(() => {});
    setVegModeOptionState(normalized);
  }, []);

  const setOrderType = useCallback(newType => {
    if (['delivery', 'dining', 'takeaway'].includes(newType)) {
      AsyncStorage.setItem('userOrderType', newType).catch(() => {});
      _setOrderType(newType);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (userProfile || isAuthenticated) AsyncStorage.setItem('userProfile', JSON.stringify(userProfile)).catch(() => {});
  }, [userProfile, isAuthenticated, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (addresses.length > 0 || isAuthenticated) AsyncStorage.setItem('userAddresses', JSON.stringify(addresses)).catch(() => {});
  }, [addresses, isAuthenticated, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (paymentMethods.length > 0 || isAuthenticated) AsyncStorage.setItem('userPaymentMethods', JSON.stringify(paymentMethods)).catch(() => {});
  }, [paymentMethods, isAuthenticated, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (favorites.length > 0 || isAuthenticated) AsyncStorage.setItem('userFavorites', JSON.stringify(favorites)).catch(() => {});
  }, [favorites, isAuthenticated, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (dishFavorites.length > 0 || isAuthenticated) AsyncStorage.setItem('userDishFavorites', JSON.stringify(dishFavorites)).catch(() => {});
  }, [dishFavorites, isAuthenticated, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    AsyncStorage.setItem('userVegMode', vegMode.toString()).catch(() => {});
  }, [vegMode, isAuthenticated, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    AsyncStorage.setItem('userVegModeOption', vegModeOption).catch(() => {});
  }, [vegModeOption, isAuthenticated, isHydrated]);

  const fetchUserProfile = useCallback(async () => {
    const authed = await isModuleAuthenticated('user');
    setIsAuthenticated(authed);

    if (!authed) {
      setUserProfile(null);
      setAddresses([]);
      setPaymentMethods([]);
      setFavorites([]);
      setDishFavorites([]);
      setVegMode(false);
      setVegModeOptionState('all');
      await AsyncStorage.multiRemove(USER_SESSION_PREFERENCE_KEYS);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await userApi.getProfile();
      const userData = response?.data?.data?.user || response?.data?.user || response?.data;

      if (userData) {
        setUserProfile(prev => {
          const mergedData = {...userData, localImagePreview: prev?.localImagePreview};
          AsyncStorage.setItem('user_user', JSON.stringify(mergedData)).catch(() => {});
          AsyncStorage.setItem('userProfile', JSON.stringify(mergedData)).catch(() => {});
          return mergedData;
        });
      }

      try {
        const addressesResponse = await userApi.getAddresses();
        const addressesData = addressesResponse?.data?.data?.addresses || addressesResponse?.data?.addresses || [];
        const normalizedAddresses = dedupeAddressesByLabel(addressesData);
        setAddresses(normalizedAddresses);
        await AsyncStorage.setItem('userAddresses', JSON.stringify(normalizedAddresses));
      } catch {
        const saved = await readJson('userAddresses', null);
        if (saved) setAddresses(dedupeAddressesByLabel(saved));
      }
    } catch {
      const saved = await readJson('userAddresses', null);
      if (saved) setAddresses(dedupeAddressesByLabel(saved));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    fetchUserProfile();
    const unsubscribe = authEvents.on('authChanged', ({module}) => {
      if (module === 'user') fetchUserProfile();
    });
    return unsubscribe;
  }, [isHydrated, fetchUserProfile]);

  const addAddress = useCallback(async address => {
    const response = await userApi.addAddress(address);
    const newAddress = response?.data?.data?.address || response?.data?.address;
    if (!newAddress) return undefined;

    const normalizedNewAddress = normalizeAddress(newAddress);
    setAddresses(prev => {
      const filtered = prev.filter(addr => normalizeAddressLabel(addr?.label) !== normalizeAddressLabel(normalizedNewAddress?.label));
      const updated = dedupeAddressesByLabel([...filtered, normalizedNewAddress]);
      AsyncStorage.setItem('userAddresses', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    return normalizedNewAddress;
  }, []);

  const updateAddress = useCallback(async (id, updatedAddress) => {
    const response = await userApi.updateAddress(id, updatedAddress);
    const updatedAddr = response?.data?.data?.address || response?.data?.address;
    if (!updatedAddr) return undefined;

    const normalizedUpdatedAddress = normalizeAddress(updatedAddr);
    setAddresses(prev => {
      const updated = dedupeAddressesByLabel(prev.map(addr => (String(getAddressId(addr)) === String(id) ? normalizedUpdatedAddress : normalizeAddress(addr))));
      AsyncStorage.setItem('userAddresses', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    return normalizedUpdatedAddress;
  }, []);

  const deleteAddress = useCallback(async id => {
    await userApi.deleteAddress(id);
    setAddresses(prev => {
      const newAddresses = prev.filter(addr => String(getAddressId(addr)) !== String(id));
      AsyncStorage.setItem('userAddresses', JSON.stringify(newAddresses)).catch(() => {});
      return newAddresses;
    });
  }, []);

  const setDefaultAddress = useCallback(async id => {
    setAddresses(prev => {
      const updatedAddresses = prev.map(addr => ({...addr, isDefault: String(getAddressId(addr)) === String(id)}));
      const selectedAddress = updatedAddresses.find(addr => addr.isDefault) || updatedAddresses[0];

      (async () => {
        await AsyncStorage.setItem('userAddresses', JSON.stringify(updatedAddresses));
        await AsyncStorage.setItem('deliveryAddressMode', 'saved');
        DeviceEventEmitter.emit('deliveryAddressModeUpdated');

        if (!selectedAddress) return;
        const coordinates = selectedAddress?.location?.coordinates;
        const lngFromCoords = Array.isArray(coordinates) && coordinates.length >= 2 ? Number(coordinates[0]) : null;
        const latFromCoords = Array.isArray(coordinates) && coordinates.length >= 2 ? Number(coordinates[1]) : null;
        const lat = Number(Number.isFinite(latFromCoords) ? latFromCoords : selectedAddress?.latitude ?? selectedAddress?.lat);
        const lng = Number(Number.isFinite(lngFromCoords) ? lngFromCoords : selectedAddress?.longitude ?? selectedAddress?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        let existingLocation = {};
        try {
          existingLocation = JSON.parse((await AsyncStorage.getItem('userLocation')) || '{}') || {};
        } catch {
          existingLocation = {};
        }

        const parts = [selectedAddress?.additionalDetails, selectedAddress?.street, selectedAddress?.city, selectedAddress?.state, selectedAddress?.zipCode].filter(Boolean);
        const resolvedAddress = parts.length > 0 ? parts.join(', ') : selectedAddress?.formattedAddress || selectedAddress?.address || '';

        const syncedLocation = {
          ...existingLocation,
          latitude: lat,
          longitude: lng,
          area: selectedAddress?.additionalDetails || selectedAddress?.street || selectedAddress?.area || existingLocation?.area || '',
          city: selectedAddress?.city || existingLocation?.city || '',
          state: selectedAddress?.state || existingLocation?.state || '',
          address: resolvedAddress || existingLocation?.address || '',
          formattedAddress: resolvedAddress || existingLocation?.formattedAddress || '',
        };
        await AsyncStorage.setItem('userLocation', JSON.stringify(syncedLocation));
        DeviceEventEmitter.emit('userLocationUpdated', {location: syncedLocation});
      })();

      return updatedAddresses;
    });

    try {
      await userApi.setDefaultAddress(id);
    } catch {
      // Keep UI stable even if backend call fails
    }
  }, []);

  const getDefaultAddress = useCallback(() => addresses.find(addr => addr.isDefault) || addresses[0] || null, [addresses]);

  const addPaymentMethod = useCallback(payment => {
    setPaymentMethods(prev => [...prev, {...payment, id: Date.now().toString(), isDefault: prev.length === 0}]);
  }, []);

  const updatePaymentMethod = useCallback((id, updatedPayment) => {
    setPaymentMethods(prev => prev.map(pm => (pm.id === id ? {...pm, ...updatedPayment} : pm)));
  }, []);

  const deletePaymentMethod = useCallback(id => {
    setPaymentMethods(prev => {
      const paymentToDelete = prev.find(pm => pm.id === id);
      const newPayments = prev.filter(pm => pm.id !== id);
      if (paymentToDelete?.isDefault && newPayments.length > 0) newPayments[0].isDefault = true;
      return newPayments;
    });
  }, []);

  const setDefaultPaymentMethod = useCallback(id => {
    setPaymentMethods(prev => prev.map(pm => ({...pm, isDefault: pm.id === id})));
  }, []);

  const getDefaultPaymentMethod = useCallback(() => paymentMethods.find(pm => pm.isDefault) || paymentMethods[0] || null, [paymentMethods]);
  const getAddressById = useCallback(id => addresses.find(addr => String(getAddressId(addr)) === String(id)), [addresses]);
  const getPaymentMethodById = useCallback(id => paymentMethods.find(pm => pm.id === id), [paymentMethods]);

  const addFavorite = useCallback(restaurant => {
    setFavorites(prev => (prev.find(fav => fav.slug === restaurant.slug) ? prev : [...prev, restaurant]));
  }, []);
  const removeFavorite = useCallback(slug => {
    setFavorites(prev => prev.filter(fav => fav.slug !== slug));
  }, []);
  const isFavorite = useCallback(slug => favorites.some(fav => fav.slug === slug), [favorites]);
  const getFavorites = useCallback(() => favorites, [favorites]);

  const addDishFavorite = useCallback(dish => {
    setDishFavorites(prev => (prev.find(fav => fav.id === dish.id && fav.restaurantId === dish.restaurantId) ? prev : [...prev, dish]));
  }, []);
  const removeDishFavorite = useCallback((dishId, restaurantId) => {
    setDishFavorites(prev => prev.filter(fav => !(fav.id === dishId && fav.restaurantId === restaurantId)));
  }, []);
  const isDishFavorite = useCallback((dishId, restaurantId) => dishFavorites.some(fav => fav.id === dishId && fav.restaurantId === restaurantId), [dishFavorites]);
  const getDishFavorites = useCallback(() => dishFavorites, [dishFavorites]);

  const updateUserProfile = useCallback(updatedProfile => {
    setUserProfile(prev => ({...prev, ...updatedProfile}));
  }, []);

  const value = useMemo(
    () => ({
      userProfile,
      loading,
      updateUserProfile,
      addresses,
      paymentMethods,
      favorites,
      vegMode,
      setVegMode,
      vegModeOption,
      setVegModeOption,
      orderType,
      setOrderType,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      getDefaultAddress,
      getAddressById,
      addPaymentMethod,
      updatePaymentMethod,
      deletePaymentMethod,
      setDefaultPaymentMethod,
      getDefaultPaymentMethod,
      getPaymentMethodById,
      addFavorite,
      removeFavorite,
      isFavorite,
      getFavorites,
      dishFavorites,
      addDishFavorite,
      removeDishFavorite,
      isDishFavorite,
      getDishFavorites,
      isAuthenticated,
    }),
    [
      userProfile,
      loading,
      updateUserProfile,
      addresses,
      paymentMethods,
      favorites,
      dishFavorites,
      vegMode,
      vegModeOption,
      setVegModeOption,
      orderType,
      setOrderType,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      getDefaultAddress,
      getAddressById,
      addPaymentMethod,
      updatePaymentMethod,
      deletePaymentMethod,
      setDefaultPaymentMethod,
      getDefaultPaymentMethod,
      getPaymentMethodById,
      addFavorite,
      removeFavorite,
      isFavorite,
      getFavorites,
      addDishFavorite,
      removeDishFavorite,
      isDishFavorite,
      getDishFavorites,
      isAuthenticated,
    ],
  );

  return <FoodProfileContext.Provider value={value}>{children}</FoodProfileContext.Provider>;
}

export function useFoodProfile() {
  const context = useContext(FoodProfileContext);
  if (!context) {
    return {
      userProfile: null,
      loading: false,
      updateUserProfile: () => {},
      addresses: [],
      paymentMethods: [],
      favorites: [],
      addAddress: async () => {},
      updateAddress: async () => {},
      deleteAddress: async () => {},
      setDefaultAddress: async () => {},
      getDefaultAddress: () => null,
      getAddressById: () => null,
      addPaymentMethod: () => {},
      updatePaymentMethod: () => {},
      deletePaymentMethod: () => {},
      setDefaultPaymentMethod: () => {},
      getDefaultPaymentMethod: () => null,
      getPaymentMethodById: () => null,
      addFavorite: () => {},
      removeFavorite: () => {},
      isFavorite: () => false,
      getFavorites: () => [],
      dishFavorites: [],
      addDishFavorite: () => {},
      removeDishFavorite: () => {},
      isDishFavorite: () => false,
      getDishFavorites: () => [],
      vegMode: false,
      setVegMode: () => {},
      vegModeOption: 'all',
      setVegModeOption: () => {},
      orderType: 'delivery',
      setOrderType: () => {},
      isAuthenticated: false,
    };
  }
  return context;
}
