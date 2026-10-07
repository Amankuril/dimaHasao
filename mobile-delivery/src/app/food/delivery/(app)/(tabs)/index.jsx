import { useEffect } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { CheckCircle2, ChevronDown, Minus, Navigation, Navigation2, Package, Phone, Play, Plus, Target } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { openExternal } from '../../../../../lib/links';
import { toast } from '../../../../../lib/notify';
import { useAnimatedValue } from '../../../../../lib/useAnimatedValue';
import { display, poppins, shadow, tw } from '../../../../../theme';

/*
 * The feed tab of pages/DeliveryHomeV2.jsx: header, live map, map controls
 * and the trip overlays. State and effects live in DeliveryHomeProvider.
 *
 * Positions: the web's overlay container is `bottom-[92px]` above a ~80 px
 * nav, and the floating restore pill is `bottom-[100px]`; here both are
 * measured from the top of the tab bar, so the offsets are 92+16-80.5 and
 * 100-80.5.
 */

const NAV_HEIGHT = 80.5;
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
      <HomeHeader />

      <View style={styles.content}>
        {/* absolute inset-0 top-[-120px]: the map runs 120 px above the screen */}
        <View style={styles.mapBox}>
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

          {isSimMode ? (
            <View style={[styles.sim, shadow('2xl')]}>
              <View style={styles.simLeft}>
                <View style={styles.simIcon}>
                  <Play size={16} color="#fff" fill="#fff" />
                </View>
                <View>
                  <Text style={styles.simKicker}>Auto Navigation Active</Text>
                  <Text style={styles.simText}>Following actual road path...</Text>
                </View>
              </View>
              <Press onPress={() => setIsSimMode(false)} accessibilityLabel="Stop simulation" style={styles.simStop}>
                <Text style={styles.simStopText}>Stop</Text>
              </Press>
            </View>
          ) : null}

          <View style={styles.controls}>
            <View style={[styles.zoomCard, shadow('card')]}>
              <Press onPress={() => setZoom((z) => Math.min(22, z + 1))} scale={0.9} accessibilityLabel="Zoom in" style={[styles.zoomBtn, styles.zoomTop]}>
                <Plus size={20} color={tw.gray900} strokeWidth={2.75} />
              </Press>
              <Press onPress={() => setZoom((z) => Math.max(8, z - 1))} scale={0.9} accessibilityLabel="Zoom out" style={styles.zoomBtn}>
                <Minus size={20} color={tw.gray900} strokeWidth={2.75} />
              </Press>
            </View>
            <Press onPress={startSimulation} scale={1} accessibilityLabel="Simulate route" style={[styles.fab, shadow('2xl'), isSimMode && { backgroundColor: tw.primarySoft }]}>
              {/* border-green-500 is not repainted by the theme; the icon (text-green-500) is */}
              <View style={[styles.fabRing, { borderColor: isSimMode ? '#fff' : tw.borderGreen500 }]}>
                <Play size={16} color={isSimMode ? '#fff' : tw.primary} fill={isSimMode ? '#fff' : tw.primary} style={{ marginLeft: 2 }} />
              </View>
            </Press>
            <Press onPress={() => mapRef.current?.setOptions({ gestureHandling: 'greedy' })} scale={0.9} accessibilityLabel="Navigation mode" style={[styles.fab, shadow('2xl')]}>
              <View style={[styles.fabRing, { borderColor: tw.borderBlue600 }]}>
                <Navigation2 size={16} color={tw.primary} />
              </View>
            </Press>
            <Press onPress={home.handleCenterMap} scale={0.9} accessibilityLabel="Centre on me" style={[styles.fab, shadow('2xl')]}>
              <Target size={28} color={tw.gray900} />
            </Press>
          </View>
        </View>
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
        <SlideUp style={[styles.dropWrap, { bottom: 92 + 16 - NAV_HEIGHT }]}>
          {tripStatus === 'PICKED_UP' ? (
            <View style={[styles.dropCard, { boxShadow: '0 -20px 80px rgba(0,0,0,0.4)' }]}>
              <View style={styles.dropHandle}>
                <Press onPress={() => setIsModalMinimized(true)} accessibilityLabel="Minimise" style={styles.dropHandleBtn}>
                  <ChevronDown size={24} color={tw.gray400} strokeWidth={3} />
                </Press>
              </View>
              <View style={styles.dropTop}>
                <View style={styles.dropMain}>
                  <View style={[styles.dropAvatar, shadow('card')]}>
                    <Image
                      source={{ uri: activeOrder?.user?.logo || activeOrder?.user?.profileImage || activeOrder?.userId?.profileImage || CUSTOMER_FALLBACK_IMG }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={{ minWidth: 0, flex: 1 }}>
                    <Text style={styles.dropName}>{customerName}</Text>
                    {addr ? <Text style={styles.dropAddr}>{addr}</Text> : null}
                    <Text style={[styles.dropStatus, { color: tw.primary }]}>
                      {isWithinRange
                        ? 'Ready - Swipe to Arrive √'
                        : formatTripDistanceKm(distanceToTarget) === '--'
                          ? 'Locating customer…'
                          : `${formatTripDistanceKm(distanceToTarget)} km • ${eta || '--'} min Arrival`}
                    </Text>
                  </View>
                </View>
                <View style={styles.dropActions}>
                  <Press onPress={callCustomer} accessibilityLabel="Call customer" style={styles.dropCall}>
                    <Phone size={20} color={tw.primary} />
                  </Press>
                  <Press onPress={navigateToCustomer} accessibilityLabel="Navigate to customer" style={[styles.dropNav, shadow('lg')]}>
                    <Navigation size={20} color="#fff" />
                  </Press>
                </View>
              </View>
              {activeOrder?.note ? (
                <View style={[styles.dropNote, shadow('card')]}>
                  <View style={[styles.dropNoteIcon, shadow('card')]}>
                    <Package size={20} color={tw.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dropNoteKicker}>Drop Message</Text>
                    <Text style={styles.dropNoteText}>&quot;{activeOrder.note}&quot;</Text>
                  </View>
                </View>
              ) : null}
              <ActionSlider label="Slide to Arrive" successLabel="Arrived ✓" disabled={false} onConfirm={reachDrop} color="bg-blue-600" />
            </View>
          ) : (
            // The inline 0 14px 34px shadow loses to the theme's !important rounded-2xl card shadow.
            <Press onPress={() => setShowVerification(true)} accessibilityLabel="Verify and complete" style={[styles.verifyWrap, shadow('card')]}>
              {/* linear-gradient(33deg, #0A4D2B, #000) */}
              <LinearGradient colors={['#0A4D2B', '#000000']} start={{ x: 0.27, y: 1 }} end={{ x: 0.73, y: 0 }} style={styles.verify}>
                <CheckCircle2 size={24} color="#fff" />
                <Text style={styles.verifyText}>VERIFY & COMPLETE</Text>
              </LinearGradient>
            </Press>
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
        <SlideUp style={[styles.restoreWrap, { bottom: 100 - NAV_HEIGHT }]}>
          <Press onPress={() => setIsModalMinimized(false)} accessibilityLabel="Open delivery panel" style={[styles.restore, shadow('card')]}>
            <View style={{ gap: 2 }}>
              <Text style={styles.restoreKicker}>Order Action Pending</Text>
              <Text style={styles.restoreText}>Tap to open delivery panel</Text>
            </View>
            {/* bg-orange-500 -> #E8F2EC (substring rule), white plus on it */}
            <View style={styles.restorePlus}>
              <Plus size={20} color="#fff" />
            </View>
          </Press>
        </SlideUp>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff', overflow: 'hidden' },
  content: { flex: 1, paddingTop: 120 },
  mapBox: { ...StyleSheet.absoluteFill, top: -120 },
  sim: {
    position: 'absolute',
    top: 180,
    left: 16,
    right: 16,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  simIcon: { width: 32, height: 32, backgroundColor: tw.primarySoft, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  simKicker: { color: tw.primary, fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', ...poppins(700) },
  simText: { color: '#fff', fontSize: 11, lineHeight: 16.5, ...poppins(500) },
  simStop: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  simStopText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', ...poppins(700) },
  controls: { position: 'absolute', right: 16, bottom: 112, gap: 16, zIndex: 120 },
  zoomCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5DDC3', overflow: 'hidden' },
  zoomBtn: { padding: 12 },
  zoomTop: { borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tw.gray100 },
  fabRing: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dropWrap: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, zIndex: 120 },
  dropCard: { backgroundColor: '#fff', borderRadius: 48, padding: 32, borderWidth: 1, borderColor: tw.gray100, alignItems: 'center' },
  dropHandle: { width: '100%', alignItems: 'center', paddingBottom: 16, marginTop: -8 },
  dropHandleBtn: { padding: 4, borderRadius: 999 },
  dropTop: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start', marginBottom: 40, paddingHorizontal: 8, gap: 12 },
  dropMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, minWidth: 0, flex: 1 },
  dropAvatar: { width: 64, height: 64, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5DDC3' },
  // h3 text-xl font-bold leading-tight -> Sora
  dropName: { color: tw.gray950, fontSize: 20, lineHeight: 25, ...display(700, 20) },
  dropAddr: { color: tw.gray500, fontSize: 12, lineHeight: 16.5, marginTop: 6, ...poppins(500) },
  dropStatus: { fontSize: 10, lineHeight: 15, letterSpacing: 2, textTransform: 'uppercase', marginTop: 6, ...poppins(700) },
  dropActions: { flexDirection: 'row', gap: 8 },
  dropCall: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tw.primaryBorder },
  dropNav: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.gray900, alignItems: 'center', justifyContent: 'center' },
  dropNote: { width: '100%', backgroundColor: tw.primarySoft, borderWidth: 1, borderColor: tw.primaryBorder, borderRadius: 24, padding: 20, marginBottom: 32, marginHorizontal: 8, flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  dropNoteIcon: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5DDC3' },
  dropNoteKicker: { fontSize: 10, lineHeight: 15, textTransform: 'uppercase', color: tw.primary, marginBottom: 6, opacity: 0.8, ...display(900, 10) },
  dropNoteText: { fontSize: 14, lineHeight: 22.75, color: tw.gray950, textTransform: 'capitalize', ...poppins(700) },
  verifyWrap: { width: '100%', borderRadius: 16 },
  verify: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: '#E5DDC3' },
  verifyText: { color: '#fff', fontSize: 12, lineHeight: 16, letterSpacing: 1.68, ...poppins(700) },
  restoreWrap: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 17.6, zIndex: 300 },
  restore: {
    width: '100%',
    backgroundColor: 'rgba(16,24,40,0.9)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 17.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5DDC3',
  },
  restoreKicker: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, ...poppins(700) },
  restoreText: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase', color: '#fff', ...poppins(700) },
  restorePlus: { backgroundColor: tw.primarySoft, padding: 8, borderRadius: 12 },
});
