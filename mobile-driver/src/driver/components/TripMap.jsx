import { useEffect, useMemo } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { ArrowLeft, ArrowUpRight, Clock3, MapPinned } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { outfit, tw } from '../../theme';
import { HAS_VALID_GOOGLE_MAPS_KEY } from '../shared/utils/googleMaps';
import { CircleLocationMarker, toSrc, useTrackViews } from '../shared/live/parts';
import { normalizeHeading } from '../utils/activeTripHelpers';

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
    routeStrokeColor, routeAccentBorder, isLoaded, mapViewRef, handleMapReady, handleMapUnmount,
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
            {path.length > 1 ? <Polyline coordinates={path} strokeColor="rgba(0,0,0,0.16)" strokeWidth={9} zIndex={10} /> : null}
            {path.length > 1 ? <Polyline coordinates={path} strokeColor="rgba(0,0,0,0.95)" strokeWidth={5} zIndex={20} /> : null}
            <RotatingVehicleMarker position={driverPosition} iconUrl={vehicleIconUrl} heading={displayDriverHeading} title="Driver" />
            {toCoordinate(activeDestination) ? <CircleLocationMarker position={activeDestination} title={toPickup ? 'Pickup' : 'Drop'} color={routeStrokeColor} /> : null}
          </MapView>
        ) : (
          <View style={st.mapMsgWrap}>
            <View style={[st.mapMsg, { borderRadius: 16, paddingVertical: 12 }]}>
              <Text style={[{ fontSize: 12, color: tw.slate700 }, fo(600)]}>Loading map</Text>
            </View>
          </View>
        )}

        <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.7)']} locations={[0, 0.5, 1]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 176 }} />

        <Press scale={0.95} onPress={() => navigate(-1)} style={[st.back, { top: top8 }]}>
          <ArrowLeft size={18} color={tw.slate900} />
        </Press>

        <View style={[st.topBar, { top: top8 }]}>
          <View style={[st.vehBox, { backgroundColor: routeStrokeColor }]}>
            <Image source={toSrc(vehicleIconUrl)} style={{ width: 28, height: 28 }} resizeMode="contain" accessibilityLabel="Vehicle" />
          </View>
          <View style={{ flex: 1, gap: 2, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[{ fontSize: 9, lineHeight: 9, textTransform: 'uppercase', letterSpacing: 0.225, color: routeStrokeColor }, fo(600)]}>Driver Live</Text>
              <ArrowUpRight size={12} strokeWidth={3} color={routeStrokeColor} />
            </View>
            <Text numberOfLines={1} style={[{ fontSize: 13, lineHeight: 16.25, color: '#fff', textTransform: 'uppercase' }, fo(600)]}>
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
              <Clock3 size={12} color={routeStrokeColor} />
              <Text numberOfLines={1} style={[st.cardValue, fo(900), { marginTop: 0, flexShrink: 1 }]}>{phase === 'to_pickup' ? '2 mins' : '12 mins'}</Text>
            </View>
          </StageCard>
          <StageCard label="Route" style={{ flex: 1, minWidth: 104 }}>
            <View style={st.cardRow}>
              <MapPinned size={12} color={tw.slate500} />
              <Text numberOfLines={1} style={[st.cardValue, fo(900), { marginTop: 0, flexShrink: 1 }]}>{phase === 'to_pickup' ? 'Pickup First' : 'To Destination'}</Text>
            </View>
          </StageCard>
        </View>

        {routeError ? (
          <View style={[st.routeErr, { top: 176 + insets.top, borderColor: routeAccentBorder }]}>
            <Text style={[{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 1.76, color: routeStrokeColor }, fo(600)]}>Route</Text>
            <Text style={[{ marginTop: 4, fontSize: 10, color: tw.slate700 }, fo(600)]}>Using fallback path while directions load.</Text>
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
            <StatusDot pulsing={isSimulationRunning} color={isSimulationEnabled ? routeStrokeColor : '#cbd5e1'} />
          </View>
          <View style={{ height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: tw.slate100, marginBottom: 8 }}>
            <View style={{ height: '100%', borderRadius: 3, backgroundColor: routeStrokeColor, width: `${isSimulationEnabled ? simulationProgress : 0}%` }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Press scale={0.95} onPress={isSimulationRunning ? pauseSimulation : isSimulationEnabled ? resumeSimulation : startSimulation} style={[st.simBtn, { backgroundColor: routeStrokeColor, flex: 1 }]}>
              <Text style={[st.simBtnText, { color: '#fff' }, fo(900)]}>{isSimulationRunning ? 'Pause' : isSimulationEnabled ? 'Resume' : 'Start'}</Text>
            </Press>
            <Press scale={0.95} onPress={resetSimulation} disabled={!isSimulationEnabled} style={[st.simBtn, { flex: 1, borderWidth: 1, borderColor: tw.slate100, backgroundColor: tw.slate50, opacity: isSimulationEnabled ? 1 : 0.4 }]}>
              <Text style={[st.simBtnText, { color: tw.slate500 }, fo(900)]}>Reset</Text>
            </Press>
          </View>
          <Text style={[{ marginTop: 8, fontSize: 9, lineHeight: 9, color: tw.slate400 }, fo(600)]}>Test mode emits live location events along this polyline.</Text>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  mapMsgWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: tw.slate200, paddingHorizontal: 24 },
  mapMsg: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 16, alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  back: { position: 'absolute', left: 16, zIndex: 50, width: 40, height: 40, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)' },
  topBar: { position: 'absolute', left: 64, right: 16, zIndex: 50, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(15,23,43,0.92)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  vehBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' },
  statRow: { position: 'absolute', left: 16, right: 16, zIndex: 40, flexDirection: 'row', gap: 8 },
  card: { minWidth: 0, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 12, paddingVertical: 8, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)' },
  cardLabel: { fontSize: 8, textTransform: 'uppercase', letterSpacing: 1.76, color: tw.slate400 },
  cardValue: { fontSize: 11, color: tw.slate900, marginTop: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  routeErr: { position: 'absolute', right: 16, zIndex: 40, minWidth: 148, borderRadius: 16, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 12, paddingVertical: 8, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)' },
  sim: { position: 'absolute', left: 16, zIndex: 40, width: 190, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 12, paddingVertical: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)' },
  simBtn: { height: 36, borderRadius: 12, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  simBtnText: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.225 },
});
