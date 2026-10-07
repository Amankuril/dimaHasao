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
import { Button, IconButton, StatusBadge } from '../../ds';
import { color, elevation, radii, space, type } from '../../../theme';

/*
 * An incoming order offer. Collapsed: what, from where, how much, how far.
 * Expanded: pickup and drop stops with call/navigate, time and distance,
 * then the accept slider. Pickup is brand green, drop is blue throughout.
 */

export function PickupMetricsValue({ metrics, label, unit }) {
  return (
    <View>
      <Text style={styles.metricLabel}>{label}</Text>
      {metrics?.isReady ? (
        <Text style={styles.metricValue}>{unit === 'km' ? `${Number(metrics.distanceKm).toFixed(1)} km` : `${metrics.etaMins} mins`}</Text>
      ) : (
        <View style={styles.locating}>
          <Spinner size={14} color={color.textMuted} />
          <Text style={styles.locatingText}>Locating…</Text>
        </View>
      )}
    </View>
  );
}

const mapsDir = (dest) => `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;

function CircleButton({ onPress, label, dark, Icon }) {
  return <IconButton icon={Icon} label={label} onPress={onPress} variant={dark ? 'solid' : 'primary'} size={44} iconSize={20} />;
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
    <View style={[styles.card, elevation.card, expanded && styles.cardExpanded]}>
      <View style={styles.top}>
        <Press onPress={() => onToggle?.()} scale={0.99} accessibilityLabel={`New order ${displayId}, ${restaurantName}, ₹${Number(earnings || 0).toFixed(2)}`} style={styles.topMain}>
          <View style={styles.pkg}>
            <Package size={22} color={color.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.kicker} numberOfLines={1}>
              New order · #{displayId}
            </Text>
            <Text numberOfLines={1} style={styles.name}>
              {restaurantName}
            </Text>
            <View style={styles.summaryRow}>
              <Text style={styles.earn}>₹{Number(earnings || 0).toFixed(2)}</Text>
              <Text style={[styles.summary, { color: metrics.isReady ? color.textSecondary : color.textMuted }]} numberOfLines={1}>
                · {routeSummary}
              </Text>
            </View>
          </View>
        </Press>
        <View style={styles.topActions}>
          {acceptDisabled ? <StatusBadge icon={Lock} label="Locked" tone="neutral" /> : null}
          <IconButton
            icon={isMuted ? VolumeX : Volume2}
            label={isMuted ? 'Unmute order alerts' : 'Mute order alerts'}
            onPress={() => onToggleMute?.()}
            variant={isMuted ? 'danger' : 'ghost'}
            iconColor={isMuted ? color.danger : color.textMuted}
            size={40}
            iconSize={20}
          />
          <IconButton
            icon={ChevronDown}
            label={expanded ? 'Collapse order' : 'Expand order'}
            onPress={() => onToggle?.()}
            iconColor={color.textMuted}
            size={40}
            iconSize={22}
            style={expanded ? { transform: [{ rotate: '180deg' }] } : undefined}
          />
        </View>
      </View>

      {expanded ? (
        <View style={styles.expanded}>
          <View style={styles.stops}>
            <View style={styles.timeline}>
              <View style={[styles.dot, { borderColor: color.primary }]} />
              <View style={styles.dash} />
              <View style={[styles.dot, { borderColor: color.info }]} />
            </View>
            <View style={{ flex: 1, gap: space.lg }}>
              <View style={styles.stop}>
                <View style={styles.stopText}>
                  <View style={styles.stopLabel}>
                    <ChefHat size={14} color={color.primary} />
                    <Text style={[styles.stopLabelText, { color: color.primary }]}>Pickup</Text>
                  </View>
                  <Text style={styles.stopName} numberOfLines={2}>
                    {restaurantName}
                  </Text>
                  <Text style={styles.stopSub} numberOfLines={2}>
                    {restaurantAddress}
                  </Text>
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
                    <MapPin size={14} color={color.info} />
                    <Text style={[styles.stopLabelText, { color: color.info }]}>Drop</Text>
                  </View>
                  <Text style={styles.stopName} numberOfLines={1}>
                    {customerName}
                  </Text>
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
            <View style={styles.metricBox}>
              <Clock size={18} color={color.primary} />
              <PickupMetricsValue metrics={metrics} label="Time" unit="min" />
            </View>
            <View style={styles.metricBox}>
              <MapPin size={18} color={color.primary} />
              <PickupMetricsValue metrics={metrics} label="Distance" unit="km" />
            </View>
          </View>

          {acceptDisabled ? (
            <View style={styles.disabledBox} accessibilityRole="alert">
              <Lock size={18} color={color.warning} style={{ marginTop: 1 }} />
              <Text style={styles.disabledText}>{disabledMessage}</Text>
            </View>
          ) : (
            <ActionSlider label="Slide to Accept" onConfirm={() => onAccept?.(order)} color="bg-green-600" successLabel="Order Accepted" />
          )}

          <Button title="Pass this task" variant="ghost" size="sm" onPress={() => onReject?.(order)} accessibilityLabel="Pass this task" style={styles.pass} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden' },
  cardExpanded: { borderColor: color.primaryBorder },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.lg, paddingRight: space.sm, paddingVertical: space.md },
  topMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.md },
  pkg: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  kicker: { ...type.caption, color: color.textMuted },
  name: { ...type.subheading, color: color.text },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, marginTop: 2 },
  earn: { ...type.bodyStrong, color: color.success },
  summary: { ...type.small, flexShrink: 1 },
  topActions: { flexDirection: 'row', alignItems: 'center' },
  expanded: { paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: space.lg, gap: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  stops: { flexDirection: 'row', gap: space.md },
  timeline: { alignItems: 'center', gap: space.xs, marginTop: 4 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 4, backgroundColor: color.surface },
  dash: { width: 2, flex: 1, minHeight: 40, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: color.borderStrong },
  stop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm },
  stopText: { minWidth: 0, flex: 1 },
  stopLabel: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: 2 },
  stopLabelText: { ...type.overline },
  stopName: { ...type.bodyStrong, color: color.text },
  stopSub: { ...type.small, color: color.textSecondary },
  stopActions: { flexDirection: 'row', gap: space.sm },
  metrics: { flexDirection: 'row', gap: space.sm },
  metricBox: { flex: 1, paddingHorizontal: space.md, paddingVertical: space.sm, backgroundColor: color.surfaceMuted, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  metricLabel: { ...type.caption, color: color.textMuted },
  metricValue: { ...type.bodyStrong, color: color.text, fontVariant: ['tabular-nums'] },
  locating: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  locatingText: { ...type.bodyStrong, color: color.textMuted },
  disabledBox: { borderRadius: radii.md, backgroundColor: color.warningSoft, paddingHorizontal: space.md, paddingVertical: space.md, flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  disabledText: { flex: 1, ...type.body, color: color.text },
  pass: { alignSelf: 'center' },
});
