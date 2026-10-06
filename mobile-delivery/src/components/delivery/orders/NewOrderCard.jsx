import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChefHat, ChevronDown, Clock, Lock, MapPin, Navigation, Package, Phone, Volume2, VolumeX } from 'lucide-react-native';
import { ActionSlider } from '../ActionSlider';
import { useDeliveryStore } from '../../../delivery/store/useDeliveryStore';
import { computePickupMetrics, formatPickupRouteSummary } from '../../../delivery/utils/pickupMetrics';
import { openExternal } from '../../../lib/links';
import { toast } from '../../../lib/notify';
import { Spinner } from '../../Loader';
import { Press } from '../../ui';
import { display, poppins, shadow, tw } from '../../../theme';

/*
 * Port of components/orders/NewOrderCard.jsx, as deliveryTheme.css paints it:
 * the card is rounded-2xl (border #E5DDC3, card shadow); green/blue 500-600
 * become the primary, bg-green-500 the soft green (substring rule).
 */

export function PickupMetricsValue({ metrics, label, unit }) {
  return (
    <View>
      <Text style={styles.metricLabel}>{label}</Text>
      {metrics?.isReady ? (
        <Text style={styles.metricValue}>{unit === 'km' ? `${Number(metrics.distanceKm).toFixed(1)} km` : `${metrics.etaMins} mins`}</Text>
      ) : (
        <View style={styles.locating}>
          <Spinner size={14} color={tw.gray500} />
          <Text style={styles.locatingText}>Locating…</Text>
        </View>
      )}
    </View>
  );
}

const mapsDir = (dest) => `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;

function CircleButton({ onPress, label, dark, Icon }) {
  return (
    <Press onPress={onPress} accessibilityLabel={label} style={[styles.circle, dark ? [styles.circleDark, shadow('md')] : [styles.circleLight, shadow('sm')]]}>
      <Icon size={16} color={dark ? '#fff' : tw.primary} />
    </Press>
  );
}

export default function NewOrderCard({
  order,
  onAccept,
  onReject,
  acceptDisabled = false,
  disabledMessage = 'Complete an active order to accept more',
  expanded = false,
  onToggle,
  isMuted = false,
  onToggleMute,
}) {
  const riderLocation = useDeliveryStore((state) => state.riderLocation);
  const metrics = useMemo(() => computePickupMetrics(order, riderLocation), [order, riderLocation]);
  const routeSummary = formatPickupRouteSummary(metrics);
  if (!order) return null;

  const earnings = order.earnings || order.riderEarning || order.pricing?.total || (order.orderAmount ? order.orderAmount * 0.1 : 0);
  const displayId = order?.orderId || order?.displayOrderId || order?._id;
  const restaurantName = order.restaurantName || order.restaurant_name || order.restaurantId?.restaurantName || order.restaurantId?.name || 'Restaurant';
  const restaurantAddress =
    order.restaurantAddress || order.restaurant_address || order.restaurantId?.addressLine1 || order.restaurantId?.location?.address || 'Address not available';
  const restaurantPhone =
    order.restaurantPhone || order.restaurant_phone || order.restaurantId?.primaryContactNumber || order.restaurantId?.ownerPhone || order.restaurantId?.phone || '';
  const deliveryAddress = order?.deliveryAddress || {};
  const geoCoords =
    Array.isArray(deliveryAddress?.location?.coordinates) && deliveryAddress.location.coordinates.length >= 2
      ? { lng: deliveryAddress.location.coordinates[0], lat: deliveryAddress.location.coordinates[1] }
      : null;
  const customerLocation = order.customerLocation || order.deliveryLocation || geoCoords || null;
  const addressParts = [deliveryAddress.street, deliveryAddress.additionalDetails, deliveryAddress.city, deliveryAddress.state, deliveryAddress.zipCode]
    .map((v) => String(v || '').trim())
    .filter(Boolean);
  const customerAddress =
    order.customerAddress ||
    order.customer_address ||
    (addressParts.length ? addressParts.join(', ') : '') ||
    (customerLocation?.lat != null && customerLocation?.lng != null
      ? `Lat ${Number(customerLocation.lat).toFixed(5)}, Lng ${Number(customerLocation.lng).toFixed(5)}`
      : 'Location not available');
  const customerName = order.userId?.name || order.customerName || order.user?.name || 'Customer';
  const customerPhone = order.userId?.phone || order.customerPhone || order.user?.phone || '';

  const call = (raw, missing) => {
    const num = String(raw || '').replace(/\D/g, '');
    if (!num) {
      toast.error(missing);
      return;
    }
    openExternal(`tel:${num}`);
  };

  const navigateTo = (coords, address, missing) => {
    const lat = parseFloat(coords?.lat ?? coords?.latitude);
    const lng = parseFloat(coords?.lng ?? coords?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) openExternal(mapsDir(`${lat},${lng}`));
    else if (address) openExternal(mapsDir(encodeURIComponent(address)));
    else toast.error(missing);
  };

  return (
    // Expanded: .border-blue-200 is repainted by a rule later in deliveryTheme.css
    // than the rounded-2xl one, so it wins (#BBCCC3); collapsed stays #E5DDC3.
    <View style={[styles.card, shadow('card'), expanded && { borderColor: tw.primaryBorder }]}>
      <View style={styles.top}>
        <Press onPress={() => onToggle?.()} scale={0.99} accessibilityLabel={`New order ${displayId}`} style={styles.topMain}>
          <View style={styles.pkg}>
            <Package size={20} color="#fff" />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.kicker}>New Order #{displayId}</Text>
            <Text numberOfLines={1} style={styles.name}>
              {restaurantName}
            </Text>
            <Text style={[styles.summary, { color: metrics.isReady ? tw.primary : tw.gray500 }]}>
              ₹{Number(earnings || 0).toFixed(2)} · {routeSummary}
            </Text>
          </View>
        </Press>
        <View style={styles.topActions}>
          {acceptDisabled ? (
            <View style={styles.lockChip}>
              <Lock size={14} color={tw.gray500} />
            </View>
          ) : null}
          <Press
            onPress={() => onToggleMute?.()}
            scale={1}
            accessibilityLabel={isMuted ? 'Unmute order alerts' : 'Mute order alerts'}
            style={[styles.iconBtn, isMuted && styles.muted]}
          >
            {isMuted ? <VolumeX size={16} color={tw.red600} /> : <Volume2 size={16} color={tw.gray500} />}
          </Press>
          <Press onPress={() => onToggle?.()} scale={1} accessibilityLabel={expanded ? 'Collapse order' : 'Expand order'} style={styles.iconBtn}>
            <ChevronDown size={20} color={tw.gray400} style={expanded ? { transform: [{ rotate: '180deg' }] } : undefined} />
          </Press>
        </View>
      </View>

      {expanded ? (
        <View style={styles.expanded}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={styles.timeline}>
              {/* bg-green-500 -> #E8F2EC; border-green-50 is untouched Tailwind green-50 */}
              <View style={[styles.dot, { backgroundColor: tw.primarySoft, borderColor: '#F0FDF4' }]} />
              <View style={styles.dash} />
              <View style={[styles.dot, { backgroundColor: tw.primary, borderColor: '#EFF6FF' }]} />
            </View>
            <View style={{ flex: 1, gap: 16 }}>
              <View style={styles.stop}>
                <View style={styles.stopText}>
                  <View style={styles.stopLabel}>
                    <ChefHat size={14} color={tw.primary} />
                    <Text style={styles.stopLabelText}>Restaurant Pickup</Text>
                  </View>
                  <Text style={styles.stopName}>{restaurantName}</Text>
                  <Text style={styles.stopSub}>{restaurantAddress}</Text>
                </View>
                <View style={styles.stopActions}>
                  <CircleButton Icon={Phone} label="Call restaurant" onPress={() => call(restaurantPhone, 'Restaurant phone number not available')} />
                  <CircleButton
                    Icon={Navigation}
                    dark
                    label="Navigate to restaurant"
                    onPress={() => navigateTo(order.restaurantLocation || order.restaurantId?.location || null, restaurantAddress, 'Restaurant location not available')}
                  />
                </View>
              </View>
              <View style={styles.stop}>
                <View style={styles.stopText}>
                  <View style={styles.stopLabel}>
                    <MapPin size={14} color={tw.primary} />
                    <Text style={styles.stopLabelText}>Customer Drop</Text>
                  </View>
                  <Text style={styles.stopName}>{customerName}</Text>
                  {customerPhone ? <Text style={styles.stopSub}>{customerPhone}</Text> : null}
                  <Text numberOfLines={2} style={styles.stopSub}>
                    {customerAddress}
                  </Text>
                </View>
                <View style={styles.stopActions}>
                  <CircleButton Icon={Phone} label="Call customer" onPress={() => call(customerPhone, 'Customer phone number not available')} />
                  <CircleButton Icon={Navigation} dark label="Navigate to customer" onPress={() => navigateTo(customerLocation, customerAddress, 'Customer location not available')} />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.metrics}>
            <View style={[styles.metricBox, shadow('card')]}>
              <Clock size={16} color={tw.primary} />
              <PickupMetricsValue metrics={metrics} label="Time" unit="min" />
            </View>
            <View style={[styles.metricBox, shadow('card')]}>
              <MapPin size={16} color={tw.gray400} />
              <PickupMetricsValue metrics={metrics} label="Distance" unit="km" />
            </View>
          </View>

          {acceptDisabled ? (
            <View style={[styles.disabledBox, shadow('card')]}>
              <Lock size={16} color={tw.amber700} style={{ marginTop: 2 }} />
              <Text style={styles.disabledText}>{disabledMessage}</Text>
            </View>
          ) : (
            <ActionSlider label="Slide to Accept" onConfirm={() => onAccept?.(order)} color="bg-black" successLabel="Order Accepted" />
          )}

          <Press onPress={() => onReject?.(order)} scale={1} accessibilityLabel="Pass this task" style={styles.pass}>
            <Text style={styles.passText}>Pass this task</Text>
          </Press>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5DDC3', overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16 },
  topMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pkg: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#0A4D2B', alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 10, lineHeight: 15, textTransform: 'uppercase', color: tw.gray400, ...display(900, 10) },
  name: { fontSize: 14, lineHeight: 20, color: tw.gray950, ...poppins(700) },
  summary: { marginTop: 2, fontSize: 11, lineHeight: 16.5, ...poppins(600) },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockChip: { borderRadius: 999, backgroundColor: tw.gray100, borderWidth: 1, borderColor: tw.gray200, padding: 6 },
  iconBtn: { borderRadius: 999, padding: 8 },
  muted: { backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red200 },
  expanded: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 16, gap: 16, borderTopWidth: 1, borderTopColor: tw.gray100 },
  timeline: { alignItems: 'center', gap: 6, marginTop: 8 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 4 },
  dash: { width: 2, height: 48, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: tw.gray100 },
  stop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  stopText: { minWidth: 0, flex: 1, paddingRight: 8 },
  stopLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  stopLabelText: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.primary, ...poppins(700) },
  stopName: { fontSize: 14, lineHeight: 17.5, color: tw.gray950, ...poppins(700) },
  stopSub: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  stopActions: { flexDirection: 'row', gap: 6, marginTop: 4 },
  circle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  circleLight: { backgroundColor: tw.primarySoft, borderWidth: 1, borderColor: tw.primaryBorder },
  circleDark: { backgroundColor: tw.gray900 },
  metrics: { flexDirection: 'row', gap: 8 },
  metricBox: { flex: 1, padding: 12, backgroundColor: tw.gray50, borderRadius: 16, borderWidth: 1, borderColor: '#E5DDC3', flexDirection: 'row', alignItems: 'center', gap: 8 },
  // An inline <span> in a block <div>: its line box takes the parent's 24 px strut.
  metricLabel: { fontSize: 10, lineHeight: 24, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, ...poppins(700) },
  metricValue: { fontSize: 14, lineHeight: 20, color: tw.gray900, fontVariant: ['tabular-nums'], ...poppins(700) },
  locating: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locatingText: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(600) },
  disabledBox: { borderRadius: 16, backgroundColor: tw.amber50, borderWidth: 1, borderColor: '#E5DDC3', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  disabledText: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.amber800, ...poppins(600) },
  pass: { width: '100%', paddingVertical: 8, alignItems: 'center' },
  passText: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, ...poppins(700) },
});
