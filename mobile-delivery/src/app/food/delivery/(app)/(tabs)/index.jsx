import { useEffect } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, ChevronDown, ChevronUp, MessageSquareText, Minus, Navigation, Navigation2, Phone, Play, Plus, Target } from 'lucide-react-native';
import { useDeliveryHome } from '../../../../../delivery/DeliveryHomeContext';
import { formatTripDistanceKm } from '../../../../../delivery/hooks/useProximityCheck';
import { writeOrderTracking } from '../../../../../delivery/realtimeTracking';
import HomeHeader from '../../../../../components/delivery/home/HomeHeader';
import LiveMap from '../../../../../components/delivery/map/LiveMap';
import { ActionSlider } from '../../../../../components/delivery/ActionSlider';
import { PickupActionModal } from '../../../../../components/delivery/modals/PickupActionModal';
import { DeliveryVerificationModal } from '../../../../../components/delivery/modals/DeliveryVerificationModal';
import { OrderSummaryModal } from '../../../../../components/delivery/modals/OrderSummaryModal';
import { Press } from '../../../../../components/ui';
import { Button, IconButton } from '../../../../../components/ds';
import { openExternal } from '../../../../../lib/links';
import { toast } from '../../../../../lib/notify';
import { useAnimatedValue } from '../../../../../lib/useAnimatedValue';
import { color, elevation, radii, space, type } from '../../../../../theme';

/*
 * The feed tab: header over a full-bleed live map, map controls, and the
 * trip panels. State and effects live in DeliveryHomeProvider. The scene
 * ends at the top of the tab bar, so bottom offsets are measured from there.
 */

const CUSTOMER_FALLBACK_IMG = 'https://cdn-icons-png.flaticon.com/512/1275/1275302.png';

function SlideUp({ children, style }) {
  // spring { damping: 25, stiffness: 200 } from 100 %
  const y = useAnimatedValue(400);
  useEffect(() => {
    Animated.spring(y, { toValue: 0, damping: 25, stiffness: 200, useNativeDriver: true }).start();
  }, [y]);
  return <Animated.View style={[style, { transform: [{ translateY: y }] }]}>{children}</Animated.View>;
}

export default function Feed() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const home = useDeliveryHome();
  const {
    activeOrder,
    tripStatus,
    showVerification,
    setShowVerification,
    isModalMinimized,
    setIsModalMinimized,
    isWithinRange,
    distanceToTarget,
    eta,
    zoom,
    setZoom,
    isSimMode,
    setIsSimMode,
    startSimulation,
    setSimPath,
    setActivePolyline,
    mapRef,
    orderManager,
  } = home;
  const { reachPickup, pickUpOrder, reachDrop, completeDelivery, resetTrip } = orderManager;

  const customerName =
    activeOrder?.customerName || activeOrder?.userId?.name || activeOrder?.user?.name || activeOrder?.deliveryAddress?.fullName || activeOrder?.deliveryAddress?.name || 'Customer';
  const addr =
    activeOrder?.customerAddress ||
    [
      activeOrder?.deliveryAddress?.street,
      activeOrder?.deliveryAddress?.additionalDetails,
      activeOrder?.deliveryAddress?.landmark,
      activeOrder?.deliveryAddress?.area,
      activeOrder?.deliveryAddress?.city,
      activeOrder?.deliveryAddress?.state,
      activeOrder?.deliveryAddress?.zipCode || activeOrder?.deliveryAddress?.pincode,
    ]
      .map((v) => String(v || '').trim())
      .filter(Boolean)
      .join(', ');

  const callCustomer = () => {
    const raw = activeOrder?.customerPhone || activeOrder?.userPhone || activeOrder?.userId?.phone || activeOrder?.user?.phone || activeOrder?.deliveryAddress?.phone || '';
    const num = String(raw).replace(/\D/g, '');
    if (!num) {
      toast.error('Customer number not available');
      return;
    }
    openExternal(`tel:${num}`);
  };
  const navigateToCustomer = () => {
    const loc = activeOrder?.customerLocation;
    const lat = parseFloat(loc?.lat ?? loc?.latitude);
    const lng = parseFloat(loc?.lng ?? loc?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error('Customer location not available');
      return;
    }
    openExternal(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`);
  };

  // Overlays only while the feed tab is showing (web: currentTab === 'feed').
  const overlaysOn = isFocused && !isModalMinimized;

  return (
    <View style={styles.page}>
      <View style={StyleSheet.absoluteFill}>
        <LiveMap
          onMapLoad={(m) => {
            mapRef.current = m;
          }}
          onMapClick={home.handleMapClick}
          onPathReceived={setSimPath}
          onPolylineReceived={(poly) => {
            setActivePolyline(poly);
            const orderId = activeOrder?.orderId || activeOrder?._id;
            if (orderId && poly) writeOrderTracking(orderId, { polyline: poly, status: tripStatus, eta }).catch(() => {});
          }}
          zoom={zoom}
        />
      </View>

      <HomeHeader />

      {isSimMode ? (
        // Sits below the header's status block.
        <View style={[styles.sim, elevation.float, { top: insets.top + 196 }]}>
          <View style={styles.simIcon}>
            <Play size={16} color={color.onPrimary} fill={color.onPrimary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.simTitle}>Auto navigation active</Text>
            <Text style={styles.simText}>Following the road path</Text>
          </View>
          <Button title="Stop" variant="outline" size="sm" fullWidth={false} onPress={() => setIsSimMode(false)} accessibilityLabel="Stop simulation" />
        </View>
      ) : null}

      <View style={styles.controls}>
        <View style={[styles.zoomCard, elevation.float]}>
          <IconButton icon={Plus} label="Zoom in" size={48} onPress={() => setZoom((z) => Math.min(22, z + 1))} style={styles.zoomBtn} />
          <View style={styles.zoomDivider} />
          <IconButton icon={Minus} label="Zoom out" size={48} onPress={() => setZoom((z) => Math.max(8, z - 1))} style={styles.zoomBtn} />
        </View>
        <IconButton
          icon={Play}
          label={isSimMode ? 'Simulating route' : 'Simulate route'}
          size={48}
          variant={isSimMode ? 'solid' : 'ghost'}
          iconColor={isSimMode ? color.onPrimary : color.primary}
          onPress={startSimulation}
          style={[styles.fab, elevation.float, isSimMode && { backgroundColor: color.primary }]}
        />
        <IconButton icon={Navigation2} label="Navigation mode" size={48} iconColor={color.primary} onPress={() => mapRef.current?.setOptions({ gestureHandling: 'greedy' })} style={[styles.fab, elevation.float]} />
        <IconButton icon={Target} label="Centre on me" size={48} onPress={home.handleCenterMap} style={[styles.fab, elevation.float]} />
      </View>

      {overlaysOn && (tripStatus === 'PICKING_UP' || tripStatus === 'REACHED_PICKUP') && activeOrder ? (
        <PickupActionModal
          order={activeOrder}
          status={tripStatus}
          isWithinRange={isWithinRange}
          distanceToTarget={distanceToTarget}
          eta={eta}
          onReachedPickup={reachPickup}
          onPickedUp={(billImageUrl) => pickUpOrder(billImageUrl)}
          onMinimize={() => setIsModalMinimized(true)}
        />
      ) : null}

      {overlaysOn && (tripStatus === 'PICKED_UP' || tripStatus === 'REACHED_DROP') ? (
        <SlideUp style={styles.dropWrap}>
          {tripStatus === 'PICKED_UP' ? (
            <View style={[styles.dropCard, elevation.sheet]}>
              <Press onPress={() => setIsModalMinimized(true)} scale={1} accessibilityLabel="Minimise delivery panel" style={styles.dropHandle}>
                <View style={styles.grabber} />
                <ChevronDown size={20} color={color.textMuted} />
              </Press>

              <Text style={styles.kicker}>Deliver to</Text>
              <View style={styles.dropTop}>
                <View style={styles.dropAvatar}>
                  <Image
                    source={{ uri: activeOrder?.user?.logo || activeOrder?.user?.profileImage || activeOrder?.userId?.profileImage || CUSTOMER_FALLBACK_IMG }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ minWidth: 0, flex: 1 }}>
                  <Text style={styles.dropName} numberOfLines={1}>
                    {customerName}
                  </Text>
                  {addr ? (
                    <Text style={styles.dropAddr} numberOfLines={3}>
                      {addr}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={[styles.etaRow, isWithinRange && { backgroundColor: color.successSoft }]}>
                <Navigation2 size={16} color={isWithinRange ? color.success : color.primary} />
                <Text style={[styles.etaText, { color: isWithinRange ? color.success : color.primary }]}>
                  {isWithinRange
                    ? 'You have arrived · slide to confirm'
                    : formatTripDistanceKm(distanceToTarget) === '--'
                      ? 'Locating customer…'
                      : `${formatTripDistanceKm(distanceToTarget)} km · ${eta || '--'} min away`}
                </Text>
              </View>

              <View style={styles.dropActions}>
                <Button title="Call" icon={Phone} variant="secondary" onPress={callCustomer} accessibilityLabel="Call customer" style={{ flex: 1 }} />
                <Button title="Navigate" icon={Navigation} variant="outline" onPress={navigateToCustomer} accessibilityLabel="Navigate to customer" style={{ flex: 1 }} />
              </View>

              {activeOrder?.note ? (
                <View style={styles.dropNote}>
                  <MessageSquareText size={18} color={color.info} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.dropNoteKicker}>Customer note</Text>
                    <Text style={styles.dropNoteText}>{activeOrder.note}</Text>
                  </View>
                </View>
              ) : null}

              <ActionSlider label="Slide to Arrive" successLabel="Arrived ✓" disabled={false} onConfirm={reachDrop} color="bg-blue-600" />
            </View>
          ) : (
            <View style={[styles.dropCard, elevation.sheet]}>
              <Button title="Verify & complete delivery" icon={CheckCircle2} size="lg" onPress={() => setShowVerification(true)} accessibilityLabel="Verify and complete" />
            </View>
          )}
        </SlideUp>
      ) : null}

      {overlaysOn && showVerification && tripStatus !== 'COMPLETED' && activeOrder ? (
        <DeliveryVerificationModal
          order={activeOrder}
          onComplete={async (otp, paymentOverride) => {
            const res = await completeDelivery(otp, paymentOverride);
            setShowVerification(false);
            return res;
          }}
          onClose={() => setShowVerification(false)}
        />
      ) : null}

      {overlaysOn && tripStatus === 'COMPLETED' ? (
        <OrderSummaryModal
          order={activeOrder}
          onDone={() => {
            resetTrip(activeOrder);
            home.goHome();
          }}
        />
      ) : null}

      {isFocused && isModalMinimized && (activeOrder || showVerification) ? (
        <SlideUp style={styles.restoreWrap}>
          <Press onPress={() => setIsModalMinimized(false)} accessibilityLabel="Open delivery panel" style={[styles.restore, elevation.float]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.restoreTitle}>Order action pending</Text>
              <Text style={styles.restoreText}>Tap to open the delivery panel</Text>
            </View>
            <View style={styles.restoreIcon}>
              <ChevronUp size={22} color={color.primary} strokeWidth={2.6} />
            </View>
          </Press>
        </SlideUp>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg, overflow: 'hidden' },
  sim: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    zIndex: 150,
    backgroundColor: color.surface,
    borderRadius: radii.lg,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  simIcon: { width: 36, height: 36, backgroundColor: color.primary, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  simTitle: { ...type.label, color: color.text },
  simText: { ...type.caption, color: color.textMuted },
  controls: { position: 'absolute', right: space.lg, bottom: space.xxl, gap: space.md, zIndex: 120, alignItems: 'center' },
  zoomCard: { backgroundColor: color.surface, borderRadius: radii.pill, overflow: 'hidden' },
  zoomBtn: { borderRadius: 0 },
  zoomDivider: { height: StyleSheet.hairlineWidth, backgroundColor: color.borderStrong, marginHorizontal: space.sm },
  fab: { backgroundColor: color.surface },

  dropWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.sm, paddingBottom: space.sm, zIndex: 130 },
  dropCard: { backgroundColor: color.surface, borderRadius: radii.xl, padding: space.lg, paddingTop: space.xs, gap: space.md },
  dropHandle: { alignItems: 'center', alignSelf: 'center', paddingHorizontal: space.xl, paddingTop: space.xs, minHeight: 36 },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, marginTop: space.xs },
  kicker: { ...type.overline, color: color.textMuted, marginTop: -space.xs },
  dropTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  dropAvatar: { width: 48, height: 48, borderRadius: radii.md, overflow: 'hidden', backgroundColor: color.surfaceMuted },
  dropName: { ...type.heading, color: color.text },
  dropAddr: { ...type.small, color: color.textSecondary, marginTop: 2 },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.primarySoft, borderRadius: radii.md, paddingHorizontal: space.md, paddingVertical: space.sm + 2 },
  etaText: { ...type.bodyStrong, flex: 1 },
  dropActions: { flexDirection: 'row', gap: space.sm },
  dropNote: { flexDirection: 'row', gap: space.sm, backgroundColor: color.infoSoft, borderRadius: radii.md, padding: space.md },
  dropNoteKicker: { ...type.label, color: color.info },
  dropNoteText: { ...type.body, color: color.text, marginTop: 2 },

  restoreWrap: { position: 'absolute', left: 0, right: 0, bottom: space.md, paddingHorizontal: space.lg, zIndex: 300 },
  restore: {
    backgroundColor: color.primary,
    borderRadius: radii.lg,
    paddingVertical: space.md,
    paddingLeft: space.lg,
    paddingRight: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
  },
  restoreTitle: { ...type.bodyStrong, color: color.onPrimary },
  restoreText: { ...type.small, color: 'rgba(255,255,255,0.85)' },
  restoreIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
});
