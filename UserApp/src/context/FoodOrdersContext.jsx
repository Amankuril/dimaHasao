/**
 * Ported from Frontend/src/modules/Food/context/OrdersContext.jsx.
 * localStorage -> AsyncStorage; the synchronous useState initializer becomes
 * an async hydration effect (same pattern as BookingContext.jsx).
 */
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {isModuleAuthenticated} from '../utils/moduleAuth';

const FoodOrdersContext = createContext(null);

export function FoodOrdersProvider({children}) {
  const [orders, setOrders] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('userOrders');
        setOrders(saved ? JSON.parse(saved) : []);
      } catch {
        setOrders([]);
      } finally {
        setIsHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    (async () => {
      try {
        const authed = await isModuleAuthenticated('user');
        if (orders.length > 0 || authed) {
          await AsyncStorage.setItem('userOrders', JSON.stringify(orders));
        }
      } catch {
        // ignore storage errors
      }
    })();
  }, [orders, isHydrated]);

  const createOrder = useCallback(orderData => {
    const newOrder = {
      id: `ORD-${Date.now()}`,
      ...orderData,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      tracking: {
        confirmed: {status: true, timestamp: new Date().toISOString()},
        preparing: {status: false, timestamp: null},
        outForDelivery: {status: false, timestamp: null},
        delivered: {status: false, timestamp: null},
      },
    };
    setOrders(prevOrders => [newOrder, ...prevOrders]);
    return newOrder.id;
  }, []);

  const getOrderById = useCallback(orderId => orders.find(order => order.id === orderId || order._id === orderId || order.mongoId === orderId || order.orderId === orderId), [orders]);

  const getAllOrders = useCallback(() => [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [orders]);

  const updateOrderStatus = useCallback((orderId, status) => {
    setOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id !== orderId) return order;
        const updatedTracking = {...order.tracking};
        if (status === 'preparing') updatedTracking.preparing = {status: true, timestamp: new Date().toISOString()};
        else if (status === 'outForDelivery') updatedTracking.outForDelivery = {status: true, timestamp: new Date().toISOString()};
        else if (status === 'delivered') updatedTracking.delivered = {status: true, timestamp: new Date().toISOString()};
        return {...order, status, tracking: updatedTracking};
      }),
    );
  }, []);

  const value = useMemo(() => ({orders, createOrder, getOrderById, getAllOrders, updateOrderStatus}), [orders, createOrder, getOrderById, getAllOrders, updateOrderStatus]);

  return <FoodOrdersContext.Provider value={value}>{children}</FoodOrdersContext.Provider>;
}

export function useFoodOrders() {
  const context = useContext(FoodOrdersContext);
  if (!context) throw new Error('useFoodOrders must be used within a FoodOrdersProvider');
  return context;
}
