/**
 * Ported from Frontend/src/modules/Food/context/CartContext.jsx.
 *
 * Adapted for RN: localStorage -> AsyncStorage (async, so every helper that
 * touched it directly is now async too); the web's `window` "userAuthChanged"
 * and "storage" CustomEvents become the `authEvents` emitter already built
 * into src/services/api/axios.js (now also fired by moduleAuth.js's
 * setAuthData/clearModuleAuth — see that file's comment). Business logic
 * (guest-vs-server cart, line-id resolution, restaurant-mismatch guard,
 * abort-in-flight-quantity-update dedup) is unchanged.
 */
import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import foodCartApi from '../services/food/cartApi';
import {buildCartLineId} from '../utils/foodVariants';
import {isModuleAuthenticated} from '../utils/moduleAuth';
import {authEvents} from '../services/api/axios';

const GUEST_CART_KEY = 'cart';

const defaultCartContext = {
  _isProvider: false,
  cart: [],
  items: [],
  itemCount: 0,
  total: 0,
  cartReady: false,
  couponCode: '',
  restaurantId: null,
  restaurantName: '',
  lastAddEvent: null,
  lastRemoveEvent: null,
  addToCart: async () => ({ok: false, error: 'Cart unavailable'}),
  removeFromCart: async () => {},
  updateQuantity: async () => {},
  getCartCount: () => 0,
  isInCart: () => false,
  getCartItem: () => null,
  clearCart: async () => {},
  cleanCartForRestaurant: async () => {},
  replaceCart: async () => ({ok: false}),
  setCartCoupon: async () => ({ok: false}),
  refreshCart: async () => [],
};

const FoodCartContext = createContext(defaultCartContext);

const getItemOrderType = item => (item?.orderType === 'quick' ? 'quick' : 'food');
const getItemSourceId = (item, orderType) =>
  String(item?.sourceId || (orderType === 'quick' ? item?.quickStoreId || item?.storeId || item?.sellerId || item?.restaurantId || '' : item?.restaurantId || item?.sourceRestaurantId || ''));

const normalizeCartData = rawCart => {
  if (!Array.isArray(rawCart)) return [];

  return rawCart
    .filter(item => item && typeof item === 'object')
    .map((item, index) => {
      const parsedQuantity = Number(item.quantity);
      const parsedPrice = Number(item.price);
      const normalizedRestaurantName =
        typeof item.restaurant === 'string' ? item.restaurant : typeof item.restaurant?.name === 'string' ? item.restaurant.name : typeof item.sourceName === 'string' ? item.sourceName : '';

      const normalizedRestaurantId = item.restaurantId || item.restaurant_id || item.restaurant?._id || item.restaurant?.restaurantId || item.sourceId || null;

      const normalizedImage = item.image || item.imageUrl || item.product?.imageUrl || item.product?.image || '';

      const baseItemId = item.itemId || item.productId || item.foodId || item.baseItemId || item.menuItemId || item.id || item._id || `cart-item-${index}`;

      const variantId = item.variantId || item.variant?._id || item.variant?.id || '';
      const variantName = typeof item.variantName === 'string' ? item.variantName : typeof item.variant?.name === 'string' ? item.variant.name : '';
      const parsedVariantPrice = Number(item.variantPrice ?? item.variant?.price ?? item.price);
      const orderType = item.orderType === 'quick' ? 'quick' : 'food';
      const sourceId = getItemSourceId({...item, restaurantId: normalizedRestaurantId}, orderType);
      const lineItemId = item.lineItemId || item.cartLineId || item.id || buildCartLineId(baseItemId, variantId);

      return {
        ...item,
        id: String(lineItemId),
        lineItemId: String(lineItemId),
        itemId: String(baseItemId),
        productId: String(baseItemId),
        variantId: variantId ? String(variantId) : '',
        variantName,
        variantPrice: Number.isFinite(parsedVariantPrice) ? parsedVariantPrice : 0,
        name: item.name || item.product?.name || 'Item',
        orderType,
        type: orderType,
        sourceId,
        sourceName: item.sourceName || (orderType === 'quick' ? item.quickStoreName || item.storeName || item.sellerName || 'Quick Commerce' : normalizedRestaurantName),
        quantity: Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? Math.floor(parsedQuantity) : 1,
        price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
        otherPrice: Number(item.otherPrice) || 0,
        restaurant: normalizedRestaurantName,
        restaurantId: normalizedRestaurantId,
        image: normalizedImage,
        imageUrl: normalizedImage,
      };
    });
};

const extractCartPayload = response => {
  const data = response?.data?.data?.cart ?? response?.data?.cart ?? response?.data?.data ?? null;
  if (!data || typeof data !== 'object') return {items: [], couponCode: '', restaurantId: null, restaurantName: ''};
  if (Array.isArray(data)) return {items: data, couponCode: '', restaurantId: null, restaurantName: ''};
  return {
    items: Array.isArray(data.items) ? data.items : [],
    couponCode: data.couponCode || '',
    restaurantId: data.restaurantId || null,
    restaurantName: data.restaurantName || '',
  };
};

const readGuestCart = async () => {
  try {
    const saved = await AsyncStorage.getItem(GUEST_CART_KEY);
    return normalizeCartData(saved ? JSON.parse(saved) : []);
  } catch {
    return [];
  }
};

const writeGuestCart = async items => {
  try {
    const normalized = normalizeCartData(items);
    if (normalized.length > 0) await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(normalized));
    else await AsyncStorage.removeItem(GUEST_CART_KEY);
  } catch {
    // ignore
  }
};

const clearGuestCartStorage = () => AsyncStorage.removeItem(GUEST_CART_KEY).catch(() => {});

const normalizeVariantKey = value => {
  const raw = String(value || '').trim();
  if (!raw || raw === 'base') return '';
  return raw;
};

const parseCompositeLineId = value => {
  const str = String(value || '');
  const sep = str.indexOf('::');
  if (sep <= 0) return null;
  return {itemId: str.slice(0, sep), variantId: normalizeVariantKey(str.slice(sep + 2))};
};

const resolveCartEntryId = (items, itemId, variantId = '') => {
  const normalizedItemId = String(itemId || '');
  const safeItems = Array.isArray(items) ? items : [];
  const requestedVariant = normalizeVariantKey(variantId);

  const directMatch = safeItems.find(item => item.id === normalizedItemId);
  if (directMatch) return directMatch.id;

  const composite = parseCompositeLineId(normalizedItemId);
  if (composite) {
    const compositeMatch = safeItems.find(item => String(item.itemId || item.productId || '') === composite.itemId && normalizeVariantKey(item.variantId) === composite.variantId);
    if (compositeMatch) return compositeMatch.id;
  }

  const preferredId = buildCartLineId(normalizedItemId, requestedVariant || 'base');
  const exactMatch = safeItems.find(item => item.id === preferredId);
  if (exactMatch) return exactMatch.id;

  const byItemVariant = safeItems.find(item => String(item.itemId || item.productId || '') === normalizedItemId && normalizeVariantKey(item.variantId) === requestedVariant);
  if (byItemVariant) return byItemVariant.id;

  if (!requestedVariant) {
    const legacyBaseMatch = safeItems.find(item => String(item.itemId || item.productId || item.id || '') === normalizedItemId && !normalizeVariantKey(item.variantId));
    if (legacyBaseMatch) return legacyBaseMatch.id;
  }

  return preferredId;
};

const apiErrorMessage = (err, fallback = 'Cart update failed') => err?.response?.data?.message || err?.message || fallback;

export function FoodCartProvider({children}) {
  const [cart, setCart] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [cartReady, setCartReady] = useState(false);
  const [lastAddEvent, setLastAddEvent] = useState(null);
  const [lastRemoveEvent, setLastRemoveEvent] = useState(null);

  const authRef = useRef(false);
  const loadSeqRef = useRef(0);
  const mutationSeqRef = useRef(0);
  const inflightQtyRef = useRef(new Map());

  const applyServerCart = useCallback(payload => {
    const next = normalizeCartData(payload?.items || []);
    setCart(next);
    setCouponCode(payload?.couponCode || '');
    setRestaurantId(payload?.restaurantId || null);
    setRestaurantName(payload?.restaurantName || '');
    clearGuestCartStorage();
    return next;
  }, []);

  const loadDbCart = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    try {
      const response = await foodCartApi.getCart();
      if (seq !== loadSeqRef.current) return [];
      return applyServerCart(extractCartPayload(response));
    } catch {
      return [];
    } finally {
      if (seq === loadSeqRef.current) setCartReady(true);
    }
  }, [applyServerCart]);

  useEffect(() => {
    (async () => {
      const authed = await isModuleAuthenticated('user');
      authRef.current = authed;
      if (authed) {
        await clearGuestCartStorage();
        await loadDbCart();
      } else {
        setCart(await readGuestCart());
        setCartReady(true);
      }
    })();
  }, [loadDbCart]);

  useEffect(() => {
    const unsubscribe = authEvents.on('authChanged', async ({module, authenticated}) => {
      if (module !== 'user') return;
      const wasAuthed = authRef.current;
      authRef.current = authenticated;
      if (authenticated && !wasAuthed) {
        await clearGuestCartStorage();
        await loadDbCart();
      } else if (!authenticated && wasAuthed) {
        setCart([]);
        setCouponCode('');
        setRestaurantId(null);
        setRestaurantName('');
        await clearGuestCartStorage();
        setCartReady(true);
      }
    });
    return unsubscribe;
  }, [loadDbCart]);

  useEffect(() => {
    if (!cartReady) return;
    if (authRef.current) {
      clearGuestCartStorage();
      return;
    }
    writeGuestCart(cart);
  }, [cart, cartReady]);

  const normalizedCart = useMemo(() => normalizeCartData(cart), [cart]);

  const triggerAddAnimation = (item, sourcePosition) => {
    if (!sourcePosition) return;
    setLastAddEvent({product: {id: item.id || item.itemId, name: item.name, imageUrl: item.image || item.imageUrl}, sourcePosition});
    setTimeout(() => setLastAddEvent(null), 1500);
  };

  const triggerRemoveAnimation = (item, sourcePosition, productInfo) => {
    if (!sourcePosition || !productInfo) return;
    setLastRemoveEvent({
      product: {id: productInfo.id || item?.id, name: productInfo.name || item?.name, imageUrl: productInfo.imageUrl || productInfo.image || item?.image || item?.imageUrl},
      sourcePosition,
    });
    setTimeout(() => setLastRemoveEvent(null), 1500);
  };

  const addToCart = useCallback(
    async (item, sourcePosition = null) => {
      if (!item) return {ok: false, error: 'Invalid item'};

      const authed = await isModuleAuthenticated('user');
      if (!authed) {
        if (normalizedCart.length > 0) {
          const currentOrderType = getItemOrderType(normalizedCart[0]);
          const nextOrderType = getItemOrderType(item);
          if (currentOrderType === 'food' && nextOrderType === 'food') {
            const firstName = String(normalizedCart[0]?.restaurant || '').trim().toLowerCase();
            const nextName = String(item?.restaurant || '').trim().toLowerCase();
            const firstId = normalizedCart[0]?.restaurantId;
            const nextId = item?.restaurantId;
            if ((firstName && nextName && firstName !== nextName) || (!firstName && !nextName && firstId && nextId && String(firstId) !== String(nextId))) {
              return {ok: false, error: `Cart already contains items from "${normalizedCart[0]?.restaurant || 'another restaurant'}". Please clear cart or complete order first.`, code: 'RESTAURANT_MISMATCH'};
            }
          }
        }
        if (!item?.restaurantId && !item?.restaurant) {
          return {ok: false, error: 'Item is missing restaurant information. Please refresh the page.', code: 'MISSING_RESTAURANT'};
        }

        const safePrev = normalizeCartData(cart);
        const lineId = item.id || buildCartLineId(item.itemId || item.productId || item.id, item.variantId || '');
        const existing = safePrev.find(i => i.id === lineId);
        triggerAddAnimation({...item, id: lineId}, sourcePosition);
        setCart(
          existing
            ? safePrev.map(i => (i.id === lineId ? {...i, quantity: i.quantity + (Number(item.quantity) || 1)} : i))
            : [...safePrev, {...item, id: lineId, lineItemId: lineId, quantity: Number(item.quantity) || 1}],
        );
        return {ok: true};
      }

      const seq = ++mutationSeqRef.current;
      try {
        const response = await foodCartApi.addItem({itemId: item.itemId || item.productId || item.foodId || item.id, variantId: item.variantId || '', quantity: Number(item.quantity) || 1});
        if (seq !== mutationSeqRef.current) return {ok: true};
        const payload = extractCartPayload(response);
        applyServerCart(payload);
        triggerAddAnimation(item, sourcePosition);
        return {ok: true, cart: payload.items};
      } catch (err) {
        const code = err?.response?.data?.code || err?.code;
        const message = apiErrorMessage(err);
        if (code === 'RESTAURANT_MISMATCH' || /another restaurant|already contains/i.test(message)) {
          return {ok: false, error: message, code: 'RESTAURANT_MISMATCH'};
        }
        return {ok: false, error: message};
      }
    },
    [applyServerCart, normalizedCart, cart],
  );

  const removeFromCart = useCallback(
    async (itemId, sourcePosition = null, productInfo = null) => {
      const resolvedItemId = resolveCartEntryId(normalizedCart, itemId);
      const itemToRemove = normalizedCart.find(i => i.id === resolvedItemId);

      if (!(await isModuleAuthenticated('user'))) {
        triggerRemoveAnimation(itemToRemove, sourcePosition, productInfo);
        setCart(prev => normalizeCartData(prev).filter(i => i.id !== resolvedItemId));
        return;
      }

      const lineId = itemToRemove?.lineItemId || itemToRemove?.id || resolvedItemId;
      const seq = ++mutationSeqRef.current;
      try {
        const response = await foodCartApi.removeItem(lineId);
        if (seq !== mutationSeqRef.current) return;
        applyServerCart(extractCartPayload(response));
        triggerRemoveAnimation(itemToRemove, sourcePosition, productInfo);
      } catch {
        // best-effort
      }
    },
    [applyServerCart, normalizedCart],
  );

  const updateQuantity = useCallback(
    async (itemId, quantity, sourcePosition = null, productInfo = null) => {
      const resolvedItemId = resolveCartEntryId(normalizedCart, itemId);
      const existingItem = normalizedCart.find(i => i.id === resolvedItemId);

      if (!(await isModuleAuthenticated('user'))) {
        if (quantity <= 0) {
          triggerRemoveAnimation(existingItem, sourcePosition, productInfo);
          setCart(prev => normalizeCartData(prev).filter(i => i.id !== resolvedItemId));
          return;
        }
        if (existingItem && quantity < existingItem.quantity) triggerRemoveAnimation(existingItem, sourcePosition, productInfo);
        setCart(prev => normalizeCartData(prev).map(i => (i.id === resolvedItemId ? {...i, quantity} : i)));
        return;
      }

      const lineId = existingItem?.lineItemId || existingItem?.id || resolvedItemId;
      if (!lineId) return;

      const prevInflight = inflightQtyRef.current.get(lineId);
      if (prevInflight?.controller) {
        try {
          prevInflight.controller.abort();
        } catch {
          // ignore
        }
      }
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const seq = ++mutationSeqRef.current;
      inflightQtyRef.current.set(lineId, {seq, controller});

      try {
        if (quantity <= 0) {
          const response = await foodCartApi.removeItem(lineId);
          if (seq !== mutationSeqRef.current) return;
          applyServerCart(extractCartPayload(response));
          triggerRemoveAnimation(existingItem, sourcePosition, productInfo);
          return;
        }

        if (existingItem && quantity < existingItem.quantity) triggerRemoveAnimation(existingItem, sourcePosition, productInfo);

        const response = await foodCartApi.updateItem(lineId, {quantity});
        if (seq !== mutationSeqRef.current) return;
        applyServerCart(extractCartPayload(response));
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      } finally {
        const current = inflightQtyRef.current.get(lineId);
        if (current?.seq === seq) inflightQtyRef.current.delete(lineId);
      }
    },
    [applyServerCart, normalizedCart],
  );

  const getCartCount = useCallback(() => normalizedCart.reduce((total, item) => total + (item.quantity || 0), 0), [normalizedCart]);

  const isInCart = useCallback((itemId, variantId = '') => normalizedCart.some(i => i.id === resolveCartEntryId(normalizedCart, itemId, variantId)), [normalizedCart]);

  const getCartItem = useCallback((itemId, variantId = '') => normalizedCart.find(i => i.id === resolveCartEntryId(normalizedCart, itemId, variantId)) || null, [normalizedCart]);

  const clearCart = useCallback(async () => {
    if (!(await isModuleAuthenticated('user'))) {
      setCart([]);
      await clearGuestCartStorage();
      return {ok: true};
    }
    const seq = ++mutationSeqRef.current;
    try {
      const response = await foodCartApi.clearCart();
      if (seq !== mutationSeqRef.current) return {ok: true};
      applyServerCart(extractCartPayload(response));
      return {ok: true};
    } catch (err) {
      return {ok: false, error: apiErrorMessage(err)};
    }
  }, [applyServerCart]);

  const replaceCart = useCallback(
    async items => {
      const normalizedItems = normalizeCartData(items).filter(item => {
        const quantity = Number(item?.quantity);
        return item?.id && (item?.restaurantId || item?.restaurant) && Number.isFinite(quantity) && quantity > 0;
      });

      if (!(await isModuleAuthenticated('user'))) {
        setCart(normalizedItems);
        return {ok: true, count: normalizedItems.length};
      }

      const seq = ++mutationSeqRef.current;
      try {
        await foodCartApi.clearCart();
        let lastPayload = {items: [], couponCode: '', restaurantId: null, restaurantName: ''};
        for (const item of normalizedItems) {
          const response = await foodCartApi.addItem({itemId: item.itemId || item.productId || item.id, variantId: item.variantId || '', quantity: item.quantity || 1});
          lastPayload = extractCartPayload(response);
        }
        if (seq !== mutationSeqRef.current) return {ok: true, count: 0};
        applyServerCart(lastPayload);
        return {ok: true, count: lastPayload.items?.length || 0};
      } catch (err) {
        return {ok: false, error: apiErrorMessage(err)};
      }
    },
    [applyServerCart],
  );

  const cleanCartForRestaurant = useCallback(
    async (targetRestaurantId, targetRestaurantName) => {
      const normalizeName = name => (name ? String(name).trim().toLowerCase() : '');
      const targetName = normalizeName(targetRestaurantName);

      if (!(await isModuleAuthenticated('user'))) {
        setCart(prev => {
          const safePrev = normalizeCartData(prev);
          return safePrev.filter(item => {
            const itemName = normalizeName(item?.restaurant);
            if (targetName && itemName) return itemName === targetName;
            if (targetRestaurantId && item?.restaurantId) return String(item.restaurantId) === String(targetRestaurantId);
            return false;
          });
        });
        return;
      }

      const keep = normalizedCart.filter(item => {
        const itemName = normalizeName(item?.restaurant);
        if (targetName && itemName) return itemName === targetName;
        if (targetRestaurantId && item?.restaurantId) return String(item.restaurantId) === String(targetRestaurantId);
        return false;
      });

      if (keep.length === normalizedCart.length) return;
      if (keep.length === 0) {
        await clearCart();
        return;
      }
      await replaceCart(keep);
    },
    [clearCart, normalizedCart, replaceCart],
  );

  const setCartCoupon = useCallback(
    async (code = '') => {
      if (!(await isModuleAuthenticated('user'))) {
        setCouponCode(String(code || '').trim().toUpperCase());
        return {ok: true};
      }
      try {
        const response = await foodCartApi.setCoupon(code);
        applyServerCart(extractCartPayload(response));
        return {ok: true};
      } catch (err) {
        return {ok: false, error: apiErrorMessage(err)};
      }
    },
    [applyServerCart],
  );

  const refreshCart = useCallback(async () => {
    if (!(await isModuleAuthenticated('user'))) return normalizedCart;
    return loadDbCart();
  }, [loadDbCart, normalizedCart]);

  const cartForAnimation = useMemo(() => {
    const items = normalizedCart.map(item => ({product: {id: item.id, name: item.name, imageUrl: item.image || item.imageUrl}, quantity: item.quantity || 1}));
    const itemCount = normalizedCart.reduce((total, item) => total + (item.quantity || 0), 0);
    const total = normalizedCart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
    return {items, itemCount, total};
  }, [normalizedCart]);

  const value = useMemo(
    () => ({
      _isProvider: true,
      cart: normalizedCart,
      deliveryCart: normalizedCart,
      takeawayCart: normalizedCart,
      items: cartForAnimation.items,
      itemCount: cartForAnimation.itemCount,
      total: cartForAnimation.total,
      cartReady,
      couponCode,
      restaurantId,
      restaurantName,
      lastAddEvent,
      lastRemoveEvent,
      addToCart,
      removeFromCart,
      updateQuantity,
      getCartCount,
      isInCart,
      getCartItem,
      clearCart,
      cleanCartForRestaurant,
      replaceCart,
      setCartCoupon,
      refreshCart,
    }),
    [
      normalizedCart,
      cartForAnimation,
      cartReady,
      couponCode,
      restaurantId,
      restaurantName,
      lastAddEvent,
      lastRemoveEvent,
      addToCart,
      removeFromCart,
      updateQuantity,
      getCartCount,
      isInCart,
      getCartItem,
      clearCart,
      cleanCartForRestaurant,
      replaceCart,
      setCartCoupon,
      refreshCart,
    ],
  );

  return <FoodCartContext.Provider value={value}>{children}</FoodCartContext.Provider>;
}

export function useFoodCart() {
  const context = useContext(FoodCartContext);
  if (!context || context._isProvider !== true) return defaultCartContext;
  return context;
}
