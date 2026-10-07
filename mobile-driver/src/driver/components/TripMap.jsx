import { useEffect, useMemo } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { ArrowLeft, ArrowUpRight, Clock3, MapPinned } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { alpha, outfit, shadow, tw } from '../../theme';
import { DT } from '../ui/dt';
import { HAS_VALID_GOOGLE_MAPS_KEY } from '../shared/utils/googleMaps';
import { CircleLocationMarker, toSrc, useTrackViews } from '../shared/live/parts';
import { normalizeHeading } from '../utils/activeTripHelpers';
import Text from './UpperText';

// Web: the map layer and its floating cards of Taxi/modules/driver/pages/ActiveTrip.jsx
// (GoogleMap + RotatingVehicleMarker + top bar + stage / ETA / route cards + simulation panel).

const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eef2f7' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dbeafe' }] },
];

const fo = outfit;
const toCoordinate = (point) => (point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)) ? { latitude: Number(point.lat), longitude: Number(point.lng) } : null);

function RotatingVehicleMarker({ position, iconUrl, heading = 0, title = 'Driver' }) {
  const track = useTrackViews(String(iconUrl), 2500);
  const coordinate = toCoordinate(position);
  if (!coordinate) return null;
  return (
    <Marker coordinate={coordinate} title={title} anchor={{ x: 0.5, y: 0.5 }} flat rotation={normalizeHeading(heading)} tracksViewChanges={track} tracksInfoWindowChanges={false}>
      <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        <Image source={toSrc(iconUrl)} style={{ width: 48, height: 48, boxShadow: '0 8px 10px rgba(15,23,42,0.35)' }} resizeMode="contain" />
      </View>
    </Marker>
  );
}

// animate-pulse on the simulation status dot.
function StatusDot({ pulsing, color }) {
  const v = useAnimatedValue(1);
  useEffect(() => {
    if (!pulsing) {
      v.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 0.5, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(v, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulsing, v]);
  return <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, opacity: v }} />;
}

const StageCard = ({ label, children, style }) => (
  <View style={[st.card, style]}>
    <Text style={[st.cardLabel, fo(900)]}>{label}</Text>
    {children}
  </View>
);

export default function TripMap({ t }) {
  const insets = useSafeAreaInsets();
  const {
    navigate, phase, routePath, routeError, driverPosition, displayDriverHeading, vehicleIconUrl, activeDestination, pickupPosition, tripData,
    isSimulationEnabled, isSimulationRunning, simulationProgress, pauseSimulation, resumeSimulation, startSimulation, resetSimulation,
    isLoaded, mapViewRef, handleMapReady, handleMapUnmount,
  } = t;
  const toPickup = phase === 'to_pickup' || phase === 'otp_verification';
  const path = useMemo(() => routePath.map(toCoordinate).filter(Boolean), [routePath]);
  useEffect(() => () => handleMapUnmount(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const top8 = 32 + insets.top;

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tw.slate200, overflow: 'hidden' }]}>
        {!HAS_VALID_GOOGLE_MAPS_KEY ? (
          <View style={st.mapMsgWrap}>
            <View style={[st.mapMsg, { borderRadius: 18, paddingVertical: 16 }]}>
              <Text style={[{ fontSize: 12, color: tw.slate900 }, fo(600)]}>Google Maps key missing</Text>
              <Text style={[{ fontSize: 11, color: tw.slate500, marginTop: 4, textAlign: 'center' }, fo(700)]}>Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`.</Text>
            </View>
          </View>
        ) : isLoaded ? (
          <MapView
            ref={mapViewRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            customMapStyle={mapStyles}
            toolbarEnabled={false}
            showsCompass={false}
            zoomControlEnabled
            onMapReady={handleMapReady}
            initialRegion={{ latitude: pickupPosition.lat, longitude: pickupPosition.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
          >
            {path.length > 1 ? <Polyline coordinates={path} strokeColor={alpha(DT.brand, 0.18)} strokeWidth={9} zIndex={10} /> : null}
            {path.length > 1 ? <Polyline coordinates={path} strokeColor={DT.brand} strokeWidth={5} zIndex={20} /> : null}
            <RotatingVehicleMarker position={driverPosition} iconUrl={vehicleIconUrl} heading={displayDriverHeading} title="Driver" />
            {toCoordinate(activeDestination) ? <CircleLocationMarker position={activeDestination} title={toPickup ? 'Pickup' : 'Drop'} color={DT.brand} /> : null}
          </MapView>
        ) : (
          <View style={st.mapMsgWrap}>
            <View style={[st.mapMsg, { borderRadius: 16, paddingVertical: 12 }]}>
              <Text style={[{ fontSize: 12, color: tw.slate700 }, fo(600)]}>Loading map</Text>
            </View>
          </View>
        )}

        <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.7)']} locations={[0, 0.5, 1]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 176 }} />

        <Press scale={0.95} onPress={() => navigate(-1)} accessibilityLabel="Go back" style={[st.back, { top: top8 }]}>
          <ArrowLeft size={20} color={DT.brand} strokeWidth={2.5} />
        </Press>

        <View style={[st.topBar, { top: top8 }]}>
          <View style={st.vehBox}>
            <Image source={toSrc(vehicleIconUrl)} style={{ width: 28, height: 28 }} resizeMode="contain" accessibilityLabel="Vehicle" />
          </View>
          <View style={{ flex: 1, gap: 2, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[{ fontSize: 10, lineHeight: 14, textTransform: 'uppercase', letterSpacing: 0.4, minWidth: 64, color: DT.successInk }, fo(800)]}>Driver Live</Text>
              <ArrowUpRight size={12} strokeWidth={3} color={DT.successInk} />
            </View>
            <Text numberOfLines={1} style={[{ fontSize: 14, lineHeight: 18, color: DT.ink }, fo(700)]}>
              {toPickup ? `Near ${tripData.pickup}` : `Toward ${tripData.drop}`}
            </Text>
          </View>
        </View>

        <View style={[st.statRow, { top: 112 + insets.top }]}>
          <StageCard label="Trip Stage" style={{ flex: 1.25 }}>
            <Text numberOfLines={1} style={[st.cardValue, fo(900)]}>
              {phase === 'to_pickup' ? 'Heading To Pickup' : phase === 'otp_verification' ? 'Verify OTP' : phase === 'in_trip' ? 'On Trip' : phase === 'payment_confirm' ? 'Collect Payment' : 'Complete'}
            </Text>
          </StageCard>
          <StageCard label="ETA" style={{ flex: 0.75, minWidth: 72 }}>
            <View style={st.cardRow}>
              <Clock3 size={13} color={DT.brand} />
              <Text numberOfLines={1} style={[st.cardValue, fo(900), { marginTop: 0, flexShrink: 1 }]}>{phase === 'to_pickup' ? '2 mins' : '12 mins'}</Text>
            </View>
          </StageCard>
          <StageCard label="Route" style={{ flex: 1, minWidth: 104 }}>
            <View style={st.cardRow}>
              <MapPinned size={13} color={DT.muted} />
              <Text numberOfLines={1} style={[st.cardValue, fo(900), { marginTop: 0, flexShrink: 1 }]}>{phase === 'to_pickup' ? 'Pickup First' : 'To Destination'}</Text>
            </View>
          </StageCard>
        </View>

        {routeError ? (
          <View style={[st.routeErr, { top: 176 + insets.top }]}>
            <Text style={[{ fontSize: 10, lineHeight: 14, textTransform: 'uppercase', letterSpacing: 0.4, minWidth: 40, color: DT.warnInk }, fo(800)]}>Route</Text>
            <Text style={[{ marginTop: 2, fontSize: 11, color: DT.inkSoft }, fo(600)]}>Using fallback path while directions load.</Text>
          </View>
        ) : null}

        <View style={[st.sim, { top: 176 + insets.top }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <View style={{ minWidth: 0, flexShrink: 1 }}>
              <Text style={[st.cardLabel, fo(900)]}>Simulation</Text>
              <Text numberOfLines={1} style={[st.cardValue, fo(900), { marginTop: 2 }]}>
                {isSimulationRunning ? 'Following route' : isSimulationEnabled ? 'Paused' : 'Real GPS'}
              </Text>
            </View>
            <StatusDot pulsing={isSimulationRunning} color={isSimulationEnabled ? DT.success : DT.faint} />
          </View>
          <View style={{ height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: DT.borderSoft, marginBottom: 8 }}>
            <View style={{ height: '100%', borderRadius: 3, backgroundColor: DT.brand, width: `${isSimulationEnabled ? simulationProgress : 0}%` }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Press scale={0.95} onPress={isSimulationRunning ? pauseSimulation : isSimulationEnabled ? resumeSimulation : startSimulation} style={[st.simBtn, { backgroundColor: DT.brand, flex: 1 }]}>
              <Text style={[st.simBtnText, { color: DT.onBrand }, fo(900)]}>{isSimulationRunning ? 'Pause' : isSimulationEnabled ? 'Resume' : 'Start'}</Text>
            </Press>
            <Press scale={0.95} onPress={resetSimulation} disabled={!isSimulationEnabled} style={[st.simBtn, { flex: 1, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.bg, opacity: isSimulationEnabled ? 1 : 0.4 }]}>
              <Text style={[st.simBtnText, { color: DT.inkSoft }, fo(900)]}>Reset</Text>
            </Press>
          </View>
          <Text style={[{ marginTop: 8, fontSize: 10, lineHeight: 14, color: DT.muted }, fo(600)]}>Test mode emits live location events along this polyline.</Text>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  mapMsgWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: tw.slate200, paddingHorizontal: 24 },
  mapMsg: { backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 16, alignItems: 'center', ...shadow('sm') },
  back: { position: 'absolute', left: 16, zIndex: 50, width: 48, height: 48, borderRadius: 24, backgroundColor: DT.card, borderWidth: 1, borderColor: DT.borderSoft, alignItems: 'center', justifyContent: 'center', ...shadow('md') },
  topBar: { position: 'absolute', left: 72, right: 16, zIndex: 50, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: DT.card, paddingVertical: 8, paddingLeft: 8, paddingRight: 16, minHeight: 48, borderRadius: DT.radius.pill, borderWidth: 1, borderColor: DT.borderSoft, ...shadow('md') },
  vehBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: DT.brand, alignItems: 'center', justifyContent: 'center' },
  statRow: { position: 'absolute', left: 16, right: 16, zIndex: 40, flexDirection: 'row', gap: 8 },
  card: { minWidth: 0, borderRadius: DT.radius.lg, backgroundColor: DT.card, borderWidth: 1, borderColor: DT.borderSoft, paddingHorizontal: 12, paddingVertical: 8, ...shadow('md') },
  cardLabel: { fontSize: 10, lineHeight: 14, textTransform: 'uppercase', letterSpacing: 0.4, minWidth: 28, color: DT.muted },
  cardValue: { fontSize: 12, color: DT.ink, marginTop: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  routeErr: { position: 'absolute', right: 16, zIndex: 40, minWidth: 148, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.warnSoft, backgroundColor: DT.card, paddingHorizontal: 12, paddingVertical: 8, ...shadow('md') },
  sim: { position: 'absolute', left: 16, zIndex: 40, width: 190, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.card, paddingHorizontal: 12, paddingVertical: 12, ...shadow('md') },
  simBtn: { minHeight: 44, borderRadius: DT.radius.md, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  simBtnText: { fontSize: 11, lineHeight: 15, textTransform: 'uppercase', letterSpacing: 0.3, minWidth: 40, textAlign: 'center' },
});
