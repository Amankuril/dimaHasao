import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { useDeliveryStore, resolveOrderKey, dedupeOrdersByIdentity } from '../../../../../delivery/store/useDeliveryStore';
import { useOrderManager } from '../../../../../delivery/hooks/useOrderManager';
import { mapOrderLocations } from '../../../../../delivery/utils/orderMapping';
import { useDeliveryNotificationsContext } from '../../../../../delivery/DeliveryRealtimeContext';
import NewOrderCard from '../../../../../components/delivery/orders/NewOrderCard';
import AcceptedOrderCard from '../../../../../components/delivery/orders/AcceptedOrderCard';
import { Press } from '../../../../../components/ui';
import { toast } from '../../../../../lib/notify';
import { display, poppins, shadow, tw } from '../../../../../theme';

// Web: pages/OrdersV2.jsx. Poppins base; font-black is Sora.

function TabButton({ active, label, count, onPress }) {
  return (
    <Press onPress={onPress} scale={1} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.tab, active && [styles.tabOn, shadow('sm')]]}>
      <Text style={[styles.tabText, { color: active ? tw.gray950 : 'rgba(255,255,255,0.7)' }]}>{label}</Text>
      {count > 0 ? (
        // !bg-orange-500 is an important utility in a cascade layer, so it beats the theme's repaint: real orange.
        <View style={[styles.count, active ? { backgroundColor: '#0A4D2B' } : [{ backgroundColor: '#FF6900', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }, shadow('sm')]]}>
          <Text style={styles.countText}>{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </Press>
  );
}

export default function OrdersV2() {
  const insets = useSafeAreaInsets();
  const newOrders = useDeliveryStore((state) => state.newOrders);
  const visibleNewOrders = useMemo(() => dedupeOrdersByIdentity(newOrders), [newOrders]);
  const acceptedOrders = useDeliveryStore((state) => state.acceptedOrders);
  const focusedOrderId = useDeliveryStore((state) => state.focusedOrderId);
  const capacity = useDeliveryStore((state) => state.capacity);
  const addNewOrder = useDeliveryStore((state) => state.addNewOrder);
  const setAcceptedOrders = useDeliveryStore((state) => state.setAcceptedOrders);
  const setCapacity = useDeliveryStore((state) => state.setCapacity);
  const setFocusedOrder = useDeliveryStore((state) => state.setFocusedOrder);

  const { acceptOrder } = useOrderManager();
  const { isOrderAlertMuted, toggleOrderAlertMuted, clearNewOrder, stopSound, triggerOrderAlertFor10Sec } = useDeliveryNotificationsContext();
  const [activeTab, setActiveTab] = useState('new');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const prevNewCountRef = useRef(visibleNewOrders.length);

  const hydrateOrders = useCallback(async () => {
    try {
      const [currentRes, availableRes] = await Promise.all([deliveryAPI.getCurrentDelivery(), deliveryAPI.getOrders({ limit: 20, page: 1 })]);
      const currentPayload = currentRes?.data?.data || {};
      const activeOrders = Array.isArray(currentPayload.activeOrders) ? currentPayload.activeOrders : currentPayload.activeOrder ? [currentPayload.activeOrder] : [];
      if (currentPayload.capacity) setCapacity(currentPayload.capacity);
      if (activeOrders.length) setAcceptedOrders(activeOrders.map(mapOrderLocations).filter(Boolean));
      const availablePayload = availableRes?.data?.data || availableRes?.data || {};
      if (availablePayload.capacity) setCapacity(availablePayload.capacity);
      const offers = Array.isArray(availablePayload.newOffers) ? availablePayload.newOffers : [];
      offers.forEach((order) => addNewOrder(order));
    } catch {
      /* hydrate failed */
    }
  }, [addNewOrder, setAcceptedOrders, setCapacity]);

  useEffect(() => {
    void hydrateOrders();
  }, [hydrateOrders]);

  // Opening Orders with unaccepted, unmuted offers rings for 10 s.
  useEffect(() => {
    if (visibleNewOrders.length > 0 && !isOrderAlertMuted(visibleNewOrders[0])) triggerOrderAlertFor10Sec?.(visibleNewOrders[0]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A new live offer switches to the New Orders tab.
  useEffect(() => {
    if (visibleNewOrders.length > prevNewCountRef.current) {
      setActiveTab('new');
      const latestOrder = visibleNewOrders[visibleNewOrders.length - 1];
      if (latestOrder && !isOrderAlertMuted(latestOrder)) triggerOrderAlertFor10Sec?.(latestOrder);
    }
    prevNewCountRef.current = visibleNewOrders.length;
  }, [visibleNewOrders, isOrderAlertMuted, triggerOrderAlertFor10Sec]);

  useEffect(() => {
    if (expandedOrderId && !visibleNewOrders.some((order) => resolveOrderKey(order) === expandedOrderId)) setExpandedOrderId(null);
  }, [visibleNewOrders, expandedOrderId]);

  const handleAccept = async (order) => {
    const orderId = resolveOrderKey(order);
    const isFirstAcceptedOrder = acceptedOrders.length === 0;
    stopSound?.();
    try {
      await acceptOrder(order);
      clearNewOrder(order);
      setExpandedOrderId(null);
      if (isFirstAcceptedOrder) {
        setFocusedOrder(orderId);
        toast.success('Order accepted');
        router.navigate('/food/delivery');
        return;
      }
      toast.success('Order accepted — added to your queue');
      setActiveTab('accepted');
    } catch {
      // useOrderManager already toasts
    }
  };

  const handleReject = async (order) => {
    const orderId = resolveOrderKey(order);
    if (!orderId) return;
    stopSound?.();
    try {
      await deliveryAPI.rejectOrder(orderId);
    } catch {
      /* reject failed */
    } finally {
      clearNewOrder(order);
      if (expandedOrderId === orderId) setExpandedOrderId(null);
    }
  };

  const handleSelectAccepted = (order) => {
    const orderId = resolveOrderKey(order);
    if (!orderId) return;
    setFocusedOrder(orderId);
    router.navigate('/food/delivery');
  };

  const acceptDisabled = capacity.remaining <= 0;

  return (
    <View style={styles.page}>
      {/* bg-[#121212] -> linear-gradient(160deg, #15498b, #000) */}
      <LinearGradient colors={['#15498B', '#000000']} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={[styles.header, { paddingTop: 24 + insets.top }]}>
        <Text style={styles.h1}>Orders</Text>
        <Text style={styles.slots}>
          {capacity.active}/{capacity.max} active slots used
        </Text>
        <View style={[styles.tabs, shadow('card')]}>
          <TabButton active={activeTab === 'new'} label="New Orders" count={visibleNewOrders.length} onPress={() => setActiveTab('new')} />
          <TabButton active={activeTab === 'accepted'} label="Accepted" count={acceptedOrders.length} onPress={() => setActiveTab('accepted')} />
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        {activeTab === 'new' ? (
          visibleNewOrders.length === 0 ? (
            <View style={[styles.empty, shadow('card')]}>
              <Text style={styles.emptyText}>No new order requests right now.</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {visibleNewOrders.map((order) => {
                const orderId = resolveOrderKey(order);
                return (
                  <NewOrderCard
                    key={orderId}
                    order={order}
                    expanded={expandedOrderId === orderId}
                    onToggle={() => setExpandedOrderId((cur) => (cur === orderId ? null : orderId))}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    acceptDisabled={acceptDisabled}
                    isMuted={isOrderAlertMuted(order)}
                    onToggleMute={() => toggleOrderAlertMuted(order)}
                    disabledMessage={`All ${capacity.max} slots in use — complete an active order to accept more`}
                  />
                );
              })}
            </View>
          )
        ) : acceptedOrders.length === 0 ? (
          <View style={[styles.empty, shadow('card')]}>
            <Text style={styles.emptyText}>Accepted orders will appear here.</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {acceptedOrders.map((order) => (
              <AcceptedOrderCard key={resolveOrderKey(order)} order={order} focused={resolveOrderKey(order) === focusedOrderId} onSelect={handleSelectAccepted} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tw.slate50 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  h1: { fontSize: 20, lineHeight: 28, color: '#fff', textTransform: 'uppercase', ...display(900, 20) },
  slots: { marginTop: 4, fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(600) },
  // rounded-2xl: border-white/10 becomes #E5DDC3
  tabs: { marginTop: 16, flexDirection: 'row', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', padding: 4, borderWidth: 1, borderColor: '#E5DDC3' },
  tab: { flex: 1, borderRadius: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: '#fff' },
  tabText: { fontSize: 11, lineHeight: 16.5, textTransform: 'uppercase', ...display(900, 11) },
  count: { marginLeft: 6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 10, lineHeight: 10, color: '#fff', ...display(900, 10) },
  // pb-28 minus the fixed nav it clears (~80 px) leaves ~32 px visible at the end
  body: { padding: 16, paddingBottom: 32 },
  // rounded-2xl border-dashed: the theme recolours the dashed border to #E5DDC3; p-6 -> 17.6
  empty: { borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#E5DDC3', backgroundColor: '#fff', padding: 17.6, alignItems: 'center' },
  emptyText: { fontSize: 14, lineHeight: 20, color: tw.gray500, textAlign: 'center', ...poppins(400) },
});
