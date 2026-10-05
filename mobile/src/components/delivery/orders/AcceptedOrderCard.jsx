import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Package } from 'lucide-react-native';
import { resolveOrderKey, mapDeliveryPhaseToTripStatus, useDeliveryStore } from '../../../delivery/store/useDeliveryStore';
import { Press } from '../../ui';
import { display, poppins, shadow, tw } from '../../../theme';

// Port of components/orders/AcceptedOrderCard.jsx. rounded-2xl: #E5DDC3 border and card shadow in both states.

const phaseLabel = (order, session) => {
  switch (session?.tripStatus || mapDeliveryPhaseToTripStatus(order)) {
    case 'REACHED_PICKUP':
      return 'At Pickup';
    case 'PICKED_UP':
      return 'Delivering';
    case 'REACHED_DROP':
      return 'At Drop';
    case 'COMPLETED':
      return 'Completed';
    default:
      return 'Picking Up';
  }
};

export default function AcceptedOrderCard({ order, focused = false, onSelect }) {
  const orderId = resolveOrderKey(order);
  const session = useDeliveryStore((state) => (orderId ? state.orderSessions[orderId] : null));
  const displayId = order?.orderId || order?.displayOrderId || orderId;
  const restaurantName = order?.restaurantName || order?.restaurantId?.restaurantName || order?.restaurantId?.name || 'Restaurant';

  return (
    <Press
      onPress={() => onSelect?.(order)}
      scale={0.98}
      accessibilityLabel={`Order ${displayId}`}
      style={[styles.card, shadow('card'), { backgroundColor: focused ? '#E7EFFA' : '#fff' }]}
    >
      <View style={styles.row}>
        <View style={styles.main}>
          <View style={[styles.icon, shadow('sm')]}>
            <Package size={20} color="#fff" strokeWidth={2.25} />
          </View>
          <View style={{ minWidth: 0, flexShrink: 1 }}>
            <Text style={styles.kicker}>Order #{displayId}</Text>
            <Text numberOfLines={1} style={styles.name}>
              {restaurantName}
            </Text>
            <Text style={styles.phase}>{phaseLabel(order, session)}</Text>
          </View>
        </View>
        <ChevronRight size={20} color={focused ? '#0A4D2B' : tw.gray300} />
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderRadius: 16, borderWidth: 1, borderColor: '#E5DDC3', padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  main: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0, flexShrink: 1 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A4D2B' },
  kicker: { fontSize: 10, lineHeight: 15, textTransform: 'uppercase', color: tw.gray500, ...display(900, 10) },
  name: { fontSize: 14, lineHeight: 20, color: tw.gray950, ...poppins(700) },
  phase: { marginTop: 2, fontSize: 11, lineHeight: 16.5, color: '#0A4D2B', ...poppins(600) },
});
