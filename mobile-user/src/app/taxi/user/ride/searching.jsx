import { Animated, Easing, Linking, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Calendar, CheckCircle2, MessageCircle, Phone, ShieldCheck, Star, X } from 'lucide-react-native';
import Image from '../../../../components/Img';
import { Dialog } from '../../../../components/kit';
import { Spinner } from '../../../../components/Loader';
import { Button, IconButton, StatusBadge } from '../../../../components/ds';
import { PinLocationMarker, toSrc, useLoop, useTrackViews } from '../../../../taxi/components/live/parts';
import { useSearchingDriver } from '../../../../taxi/hooks/useSearchingDriver';
import { HAS_VALID_GOOGLE_MAPS_KEY } from '../../../../taxi/utils/googleMaps';
import { MAP_STYLE } from '../../../../taxi/components/live/mapStyle';
import { color, elevation, radii, space, type } from '../../../../theme';

/** Pickup = brand-green, drop = red, everywhere in the ride flow. */
const PICKUP = color.primary;
const DROP = color.danger;

const CarIcon = require('../../../../../assets/taxi/icons/car.png');

function PulseRing({ index }) {
  const v = useLoop({ duration: 3000, delay: (index + 1) * 750, easing: Easing.out(Easing.quad) });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 4.5] }) }] },
      ]}
    />
  );
}

function BlinkingVehicle({ marker, iconSrc }) {
  const track = useTrackViews(String(iconSrc?.uri || iconSrc));
  return (
    <Marker coordinate={{ latitude: marker.position.lat, longitude: marker.position.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={track} tracksInfoWindowChanges={false}>
      <View style={styles.vehicleBox}>
        <View style={styles.vehicleRing} />
        <Image source={iconSrc} style={[styles.vehicleImg, { transform: [{ rotate: `${marker.heading}deg` }] }]} resizeMode="contain" />
      </View>
    </Marker>
  );
}

function Dot({ index }) {
  const v = useLoop({ duration: 1500, delay: index * 200, useNativeDriver: false });
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.3] }),
          backgroundColor: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [color.border, color.gold, color.border] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.4, 1] }) }],
        },
      ]}
    />
  );
}

function Ping() {
  const v = useLoop({ duration: 1000, easing: Easing.out(Easing.quad) });
  return (
    <View style={{ width: 8, height: 8 }}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.pingDot, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.75, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }] }]} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: 4, backgroundColor: color.success }]} />
    </View>
  );
}

export default function SearchingDriverScreen() {
  const h = useSearchingDriver();
  const insets = useSafeAreaInsets();
  const { navigate, routeState, driver, rideOtp, searchStatus, isSearching, isAccepted, isScheduledRide, scheduledStatus, scheduledError, formattedScheduledTime } = h;
  const { showCancelConfirm, setShowCancelConfirm, handleCancel, pickupPos, dropPos, availableVehicleMarkers, availableVehicleIcon, userHomeRoute, routePrefix } = h;

  if (isScheduledRide) {
    const schedTone = scheduledStatus === 'scheduled' ? 'success' : scheduledStatus === 'error' ? 'danger' : 'info';
    const toneColors = { success: [color.successSoft, color.success], danger: [color.dangerSoft, color.danger], info: [color.infoSoft, color.info] }[schedTone];
    return (
      <View style={[styles.schedPage, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.schedCard}>
          <View style={[styles.schedIcon, { backgroundColor: toneColors[0] }]}>
            {scheduledStatus === 'scheduled' ? <CheckCircle2 size={28} color={toneColors[1]} /> : scheduledStatus === 'error' ? <AlertTriangle size={28} color={toneColors[1]} /> : <Spinner size={28} color={toneColors[1]} />}
          </View>
          <Text style={styles.schedTitle} accessibilityRole="header">{scheduledStatus === 'scheduled' ? 'Ride scheduled' : scheduledStatus === 'error' ? 'Scheduling failed' : 'Scheduling your ride'}</Text>
          <Text style={styles.schedSub}>
            {scheduledStatus === 'scheduled'
              ? 'Your booking has been saved. Drivers will be notified automatically at the scheduled time.'
              : scheduledStatus === 'error'
                ? scheduledError || 'Could not schedule this ride.'
                : 'Saving your booking and preparing automatic driver notification.'}
          </Text>
          <View style={styles.schedBox}>
            <View style={styles.row8}>
              <Calendar size={18} color={color.goldText} />
              <Text style={styles.schedBoxLabel}>Scheduled for</Text>
            </View>
            <Text style={styles.schedWhen}>{formattedScheduledTime}</Text>
            <View style={styles.schedRouteRows}>
              <View style={styles.row8}>
                <View style={styles.pickupDot} />
                <Text style={styles.schedRoute} numberOfLines={2}>{routeState.pickup || 'Pickup'}</Text>
              </View>
              <View style={styles.row8}>
                <View style={styles.dropSquare} />
                <Text style={styles.schedRoute} numberOfLines={2}>{routeState.drop || 'Drop'}</Text>
              </View>
            </View>
          </View>
          <Button title={scheduledStatus === 'error' ? 'Back to home' : 'Done'} size="lg" onPress={() => navigate(userHomeRoute, { replace: true })} style={{ marginTop: space.xxl }} />
        </View>
      </View>
    );
  }

  const vehicleSrc = toSrc(availableVehicleIcon || CarIcon);
  const driverAvatar = `https://ui-avatars.com/api/?name=${(driver.name || 'VK').replace(' ', '+')}&background=cbd5e1&color=0f172a&format=png`;
  const vehicleLine = [driver.vehicleColor, driver.vehicleMake, driver.vehicleModel, driver.vehicleType || 'Taxi'].filter(Boolean).join(' ') || 'White Dzire Taxi';

  return (
    <View style={styles.page}>
      <View style={StyleSheet.absoluteFill}>
        {HAS_VALID_GOOGLE_MAPS_KEY ? (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialCamera={{ center: { latitude: pickupPos.lat, longitude: pickupPos.lng }, zoom: 15, heading: 0, pitch: 0 }}
            customMapStyle={MAP_STYLE}
            toolbarEnabled={false}
            zoomControlEnabled={false}
            showsCompass={false}
            showsMyLocationButton={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <PinLocationMarker position={pickupPos} title="Pickup" color={PICKUP} zIndex={100} />
            {dropPos ? <PinLocationMarker position={dropPos} title="Drop" color={DROP} /> : null}
            {isSearching ? availableVehicleMarkers.map((m) => <BlinkingVehicle key={m.id} marker={m} iconSrc={vehicleSrc} />) : null}
            {dropPos ? (
              <Polyline coordinates={[{ latitude: pickupPos.lat, longitude: pickupPos.lng }, { latitude: dropPos.lat, longitude: dropPos.lng }]} strokeColor={color.primaryDeep} strokeWidth={2} lineDashPattern={[4, 6]} />
            ) : null}
          </MapView>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: color.surfaceMuted }]} />
        )}

        {isSearching ? (
          <View pointerEvents="none" style={styles.rings}>
            {[1, 2, 3, 4].map((i) => (
              <PulseRing key={i} index={i} />
            ))}
          </View>
        ) : null}

        {/* Route card over the map */}
        <View style={[styles.routeCard, { top: insets.top + space.md }]} pointerEvents="none">
          <View style={styles.row8}>
            <View style={styles.pickupDot} />
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeText} numberOfLines={1}>{routeState.pickup || 'Pickup'}</Text>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.row8}>
            <View style={styles.dropSquare} />
            <Text style={styles.routeLabel}>Drop</Text>
            <Text style={styles.routeText} numberOfLines={1}>{routeState.drop || 'Drop'}</Text>
          </View>
        </View>

        {isSearching || isAccepted ? (
          <IconButton icon={X} label="Cancel ride" onPress={() => setShowCancelConfirm(true)} style={[styles.closeBtn, { top: insets.top + space.md }]} />
        ) : null}
      </View>

      <View style={[styles.bottom, { bottom: space.lg + insets.bottom }]}>
        {isSearching ? (
          <View style={styles.searchCard}>
            <View style={styles.grabber} />
            <View style={{ alignItems: 'center', gap: space.sm }}>
              <StatusBadge label="Searching" tone="warning" style={{ alignSelf: 'center' }} />
              <Text style={styles.searchTitle} accessibilityRole="header">Finding your ride</Text>
              <Text style={styles.searchStatus} accessibilityLiveRegion="polite">{searchStatus}</Text>
            </View>
            <View style={styles.dots}>
              {[0, 1, 2, 3].map((i) => (
                <Dot key={i} index={i} />
              ))}
            </View>
            <View style={styles.pills}>
              <View style={styles.row8}>
                <View style={styles.pillIcon}>
                  <Ping />
                </View>
                <Text style={styles.pillText}>Fast matching</Text>
              </View>
              <View style={styles.pillDivider} />
              <View style={styles.row8}>
                <View style={[styles.pillIcon, { backgroundColor: color.infoSoft }]}>
                  <ShieldCheck size={18} color={color.info} />
                </View>
                <Text style={styles.pillText}>Top safety</Text>
              </View>
            </View>
            <Button title="Cancel search" variant="dangerSoft" onPress={() => setShowCancelConfirm(true)} />
          </View>
        ) : null}

        {isAccepted ? (
          <View>
            <View style={styles.acceptCard}>
              <View style={styles.acceptBar}>
                <CheckCircle2 size={18} color={color.primary} />
                <Text style={styles.acceptBarText}>Captain confirmed</Text>
              </View>
              <View style={{ padding: space.xl }}>
                <View style={styles.driverTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={[styles.row8, { marginBottom: space.xs }]}>
                      <Text style={styles.driverName} numberOfLines={1}>
                        {driver.name || 'Vishal K.'}
                      </Text>
                      <View style={styles.ratingPill}>
                        <Star size={12} color={color.gold} fill={color.gold} />
                        <Text style={styles.ratingText}>{driver.rating || '4.7'}</Text>
                      </View>
                    </View>
                    <Text style={styles.plateLabel}>Vehicle number</Text>
                    <Text style={styles.plate} numberOfLines={1} adjustsFontSizeToFit>
                      {(driver.plate || 'MP13ZL3184').toUpperCase()}
                    </Text>
                    <View style={styles.vehiclePill}>
                      <Text style={styles.vehiclePillText} numberOfLines={1}>{vehicleLine}</Text>
                    </View>
                  </View>
                  <View style={{ width: 96, height: 80 }}>
                    <View style={styles.vehicleTile}>
                      <Image source={vehicleSrc} style={{ width: 48, height: 48, tintColor: color.textInverse }} resizeMode="contain" />
                    </View>
                    <View style={styles.avatar}>
                      <Image source={{ uri: driverAvatar }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </View>
                  </View>
                </View>
                {rideOtp ? (
                  <View style={styles.otpBox} accessible accessibilityLabel={`Start OTP ${String(rideOtp).split('').join(' ')}. Share it with your captain.`}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.otpLabel}>Start OTP</Text>
                      <Text style={styles.otpHint}>Share with your captain at pickup</Text>
                    </View>
                    <Text style={styles.otpText}>{rideOtp}</Text>
                  </View>
                ) : null}
                <View style={styles.actions}>
                  <Button title="Call" icon={Phone} variant="secondary" onPress={() => Linking.openURL(`tel:${driver.phone}`).catch(() => {})} accessibilityLabel="Call captain" style={{ flex: 1 }} />
                  <Button title="Chat" icon={MessageCircle} onPress={() => navigate(`${routePrefix}/ride/chat`, { state: h.buildHistoryState({ driver }) })} accessibilityLabel="Chat with captain" style={{ flex: 1 }} />
                </View>
              </View>
            </View>
            <View style={styles.arriving}>
              <Ping />
              <Text style={styles.arrivingText}>Captain is arriving</Text>
            </View>
          </View>
        ) : null}
      </View>

      <Dialog visible={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} backdrop={color.overlay} blur={8} panelStyle={styles.dialog}>
        <View style={styles.dialogIcon}>
          <AlertTriangle size={26} color={color.danger} />
        </View>
        <Text style={styles.dialogTitle} accessibilityRole="header">Cancel ride?</Text>
        <Text style={styles.dialogSub}>{"We're still searching. Stop looking?"}</Text>
        <View style={{ gap: space.sm, alignSelf: 'stretch' }}>
          <Button title="Yes, cancel" variant="danger" onPress={handleCancel} />
          <Button title={isSearching ? 'Keep searching' : 'Go back'} variant="ghost" onPress={() => setShowCancelConfirm(false)} />
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.surfaceMuted, overflow: 'hidden' },
  row8: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pickupDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: PICKUP, borderWidth: 2, borderColor: color.primarySoft },
  dropSquare: { width: 12, height: 12, borderRadius: 2, backgroundColor: DROP },
  // scheduled
  schedPage: { flex: 1, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  schedCard: { width: '100%', maxWidth: 480, borderRadius: radii.xl, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.xl, paddingVertical: space.xxl, alignItems: 'center', ...elevation.card },
  schedIcon: { width: 64, height: 64, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  schedTitle: { ...type.heading, marginTop: space.lg, color: color.text, textAlign: 'center' },
  schedSub: { ...type.small, marginTop: space.sm, color: color.textSecondary, textAlign: 'center' },
  schedBox: { marginTop: space.xl, alignSelf: 'stretch', borderRadius: radii.lg, backgroundColor: color.goldSoft, padding: space.lg },
  schedBoxLabel: { ...type.label, color: color.goldText },
  schedWhen: { ...type.price, marginTop: space.sm, color: color.text },
  schedRouteRows: { marginTop: space.md, gap: space.sm },
  schedRoute: { ...type.small, flex: 1, minWidth: 0, color: color.textSecondary },
  // map overlays
  rings: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: 'rgba(202,168,62,0.5)', backgroundColor: 'rgba(202,168,62,0.06)', marginTop: -22 },
  vehicleBox: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  vehicleRing: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: color.primaryBorder, backgroundColor: 'rgba(10,77,43,0.08)' },
  vehicleImg: { width: 36, height: 36 },
  routeCard: { position: 'absolute', left: space.lg, right: space.lg + 44 + space.sm, backgroundColor: color.surface, borderRadius: radii.lg, paddingHorizontal: space.lg, paddingVertical: space.md, borderWidth: 1, borderColor: color.border, ...elevation.float },
  routeLabel: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.textMuted, width: 44 },
  routeText: { ...type.bodyStrong, flex: 1, minWidth: 0, color: color.text },
  routeDivider: { height: StyleSheet.hairlineWidth, backgroundColor: color.border, marginVertical: space.sm, marginLeft: 12 + space.sm },
  closeBtn: { position: 'absolute', right: space.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, ...elevation.float },
  bottom: { position: 'absolute', left: space.lg, right: space.lg },
  // searching card
  searchCard: { borderRadius: radii.xl, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.xl, gap: space.lg, ...elevation.sheet },
  grabber: { width: 44, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, alignSelf: 'center' },
  searchTitle: { ...type.heading, color: color.text },
  searchStatus: { ...type.small, color: color.textSecondary, textAlign: 'center', maxWidth: 280 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm + 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  pills: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radii.lg, backgroundColor: color.bg, borderWidth: 1, borderColor: color.border },
  pillIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.successSoft, alignItems: 'center', justifyContent: 'center' },
  pillDivider: { width: 1, height: 32, backgroundColor: color.border },
  pillText: { ...type.label, color: color.text },
  // accepted card
  acceptCard: { overflow: 'hidden', borderRadius: radii.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, ...elevation.sheet },
  acceptBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: color.primarySoft, paddingVertical: space.md },
  acceptBarText: { ...type.bodyStrong, color: color.primary },
  driverTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm },
  driverName: { ...type.subheading, flexShrink: 1, color: color.text },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: color.goldSoft, paddingHorizontal: space.sm, height: 24, borderRadius: radii.pill },
  ratingText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.goldText },
  plateLabel: { ...type.caption, color: color.textMuted },
  plate: { ...type.priceLg, color: color.text, marginBottom: space.sm },
  vehiclePill: { alignSelf: 'flex-start', paddingHorizontal: space.md, height: 28, justifyContent: 'center', borderRadius: radii.pill, backgroundColor: color.surfaceMuted, maxWidth: '100%' },
  vehiclePillText: { ...type.caption, color: color.textSecondary },
  vehicleTile: { position: 'absolute', right: 0, top: 0, width: 80, height: 80, borderRadius: radii.lg, backgroundColor: color.primaryDeep, borderWidth: 3, borderColor: color.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...elevation.card },
  avatar: { position: 'absolute', left: -8, bottom: 0, width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: color.surface, backgroundColor: color.surfaceMuted, overflow: 'hidden', ...elevation.card },
  otpBox: { marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radii.lg, borderWidth: 1.5, borderColor: color.gold, backgroundColor: color.goldSoft, paddingHorizontal: space.lg, paddingVertical: space.md },
  otpLabel: { ...type.bodyStrong, color: color.text },
  otpHint: { ...type.caption, color: color.textSecondary },
  otpText: { ...type.priceLg, fontSize: 30, lineHeight: 36, color: color.primary, letterSpacing: 4 },
  actions: { marginTop: space.lg, flexDirection: 'row', gap: space.md },
  arriving: { marginTop: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, alignSelf: 'center', backgroundColor: color.surface, borderRadius: radii.pill, paddingHorizontal: space.md, height: 32, ...elevation.card },
  arrivingText: { ...type.label, color: color.primary },
  pingDot: { borderRadius: 4, backgroundColor: color.success },
  // dialog
  dialog: { width: '86%', maxWidth: 384, backgroundColor: color.surface, borderRadius: radii.xl, padding: space.xxl, alignItems: 'center', alignSelf: 'center', ...elevation.sheet },
  dialogIcon: { width: 56, height: 56, borderRadius: radii.lg, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  dialogTitle: { ...type.heading, color: color.text, marginBottom: space.xs },
  dialogSub: { ...type.small, color: color.textSecondary, marginBottom: space.xl, textAlign: 'center' },
});
