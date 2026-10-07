import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Inbox, PackageCheck } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { useDeliveryStore, resolveOrderKey, dedupeOrdersByIdentity } from '../../../../../delivery/store/useDeliveryStore';
import { useOrderManager } from '../../../../../delivery/hooks/useOrderManager';
import { mapOrderLocations } from '../../../../../delivery/utils/orderMapping';
import { useDeliveryNotificationsContext } from '../../../../../delivery/DeliveryRealtimeContext';
import NewOrderCard from '../../../../../components/delivery/orders/NewOrderCard';
import AcceptedOrderCard from '../../../../../components/delivery/orders/AcceptedOrderCard';
import { Press } from '../../../../../components/ui';
import { toast } from '../../../../../lib/notify';
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../../../../../components/ds';
import { color, elevation, radii, space, type } from '../../../../../theme';

/** One option of the New orders / Accepted switch, always showing its count. */
function SegmentButton({ active, label, count, onPress }) {
  const shown = count > 9 ? '9+' : String(count);
  return (
    <Press
      onPress={onPress}
      scale={1}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}, ${count}`}
      style={[styles.segmentBtn, active && styles.segmentBtnOn]}
    >
      <Text style={[styles.segmentText, { color: active ? color.text : color.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={[styles.count, { backgroundColor: active ? color.primary : count > 0 ? color.primarySoft : color.border }]}>
        <Text style={[styles.countText, { color: active ? color.onPrimary : count > 0 ? color.primary : color.textSecondary }]}>{shown}</Text>
      </View>
    </Press>
  );
}

export default function OrdersV2() {
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
      <ScreenHeader
        title="Orders"
        subtitle={`${capacity.active}/${capacity.max} active slots used`}
        border={false}
        right={acceptDisabled ? <StatusBadge label="Slots full" tone="warning" style={{ marginRight: space.sm }} /> : null}
      />
      <View style={styles.segmentBar}>
        <View style={styles.segment} accessibilityRole="tablist">
          <SegmentButton active={activeTab === 'new'} label="New orders" count={visibleNewOrders.length} onPress={() => setActiveTab('new')} />
          <SegmentButton active={activeTab === 'accepted'} label="Accepted" count={acceptedOrders.length} onPress={() => setActiveTab('accepted')} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        {activeTab === 'new' ? (
          visibleNewOrders.length === 0 ? (
            <Card>
              <EmptyState icon={Inbox} title="No new order requests right now" message="Stay online. New requests near you will appear here." style={styles.empty} />
            </Card>
          ) : (
            <View style={styles.list}>
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
          <Card>
            <EmptyState icon={PackageCheck} title="No accepted orders" message="Accepted orders will appear here." style={styles.empty} />
          </Card>
        ) : (
          <View style={styles.list}>
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
  page: { flex: 1, backgroundColor: color.bg },
  segmentBar: {
    backgroundColor: color.surface,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.borderStrong,
  },
  segment: { flexDirection: 'row', gap: space.xs, padding: space.xs, borderRadius: radii.md, backgroundColor: color.surfaceMuted },
  segmentBtn: { flex: 1, minHeight: 44, borderRadius: radii.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.sm },
  segmentBtnOn: { backgroundColor: color.surface, ...elevation.card },
  segmentText: { ...type.buttonSm, flexShrink: 1 },
  count: { minWidth: 24, height: 24, borderRadius: radii.pill, paddingHorizontal: space.sm - 2, alignItems: 'center', justifyContent: 'center' },
  countText: { ...type.caption, fontFamily: 'NunitoSans_800ExtraBold' },
  body: { padding: space.lg, paddingBottom: space.xxxl },
  list: { gap: space.md },
  empty: { paddingVertical: space.xxl, paddingHorizontal: space.sm },
});
