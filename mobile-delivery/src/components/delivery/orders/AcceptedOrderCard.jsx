import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight, MapPin, Store } from 'lucide-react-native';
import { resolveOrderKey, mapDeliveryPhaseToTripStatus, useDeliveryStore } from '../../../delivery/store/useDeliveryStore';
import { Press } from '../../ui';
import { StatusBadge } from '../../ds';
import { color, elevation, radii, space, tone, type } from '../../../theme';

/*
 * One accepted order in the Orders tab. The phase reads as a word + tone
 * badge, and the leading tile tells pickup legs (store) from drop legs (pin).
 */

// tone: info = moving, warning = arrived/waiting, success = done (DESIGN_SYSTEM.md).
const phaseInfo = (order, session) => {
  switch (session?.tripStatus || mapDeliveryPhaseToTripStatus(order)) {
    case 'REACHED_PICKUP':
      return { label: 'At pickup', tone: 'warning', leg: 'pickup' };
    case 'PICKED_UP':
      return { label: 'Delivering', tone: 'info', leg: 'drop' };
    case 'REACHED_DROP':
      return { label: 'At drop', tone: 'warning', leg: 'drop' };
    case 'COMPLETED':
      return { label: 'Completed', tone: 'success', leg: 'drop' };
    default:
      return { label: 'Picking up', tone: 'info', leg: 'pickup' };
  }
};

export default function AcceptedOrderCard({ order, focused = false, onSelect }) {
  const orderId = resolveOrderKey(order);
  const session = useDeliveryStore((state) => (orderId ? state.orderSessions[orderId] : null));
  const displayId = order?.orderId || order?.displayOrderId || orderId;
  const restaurantName = order?.restaurantName || order?.restaurantId?.restaurantName || order?.restaurantId?.name || 'Restaurant';
  const phase = phaseInfo(order, session);
  const isPickup = phase.leg === 'pickup';
  const LegIcon = isPickup ? Store : MapPin;
  const legTone = isPickup ? tone.warning : tone.primary;

  return (
    <Press
      onPress={() => onSelect?.(order)}
      scale={0.98}
      accessibilityLabel={`Order ${displayId}, ${restaurantName}, ${phase.label}${focused ? ', current order' : ''}`}
      accessibilityState={{ selected: focused }}
      style={[styles.card, focused && styles.cardFocused]}
    >
      <View style={[styles.icon, { backgroundColor: legTone.bg }]}>
        <LegIcon size={22} color={legTone.fg} strokeWidth={2.2} />
      </View>
      <View style={styles.main}>
        <Text style={styles.kicker} numberOfLines={1}>
          {isPickup ? 'Pickup' : 'Drop'} · Order #{displayId}
        </Text>
        <Text numberOfLines={2} style={styles.name}>
          {restaurantName}
        </Text>
        <View style={styles.badges}>
          <StatusBadge label={phase.label} tone={phase.tone} />
          {focused ? <StatusBadge label="Current" tone="primary" /> : null}
        </View>
      </View>
      <ChevronRight size={22} color={focused ? color.primary : color.textDisabled} />
    </Press>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radii.lg,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    ...elevation.card,
  },
  cardFocused: { borderWidth: 2, borderColor: color.primary, padding: space.lg - 2 },
  icon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, minWidth: 0, gap: space.xxs },
  kicker: { ...type.caption, color: color.textMuted },
  name: { ...type.subheading, color: color.text },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
});
