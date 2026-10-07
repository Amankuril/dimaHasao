import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import Svg, { Circle, Line } from 'react-native-svg';
import { Press } from '../../../components/ui';
import { events } from '../../../lib/events';
import { geocodeAPI } from '../../../api/food';
import { HAS_VALID_GOOGLE_MAPS_KEY } from '../../utils/googleMaps';
import { getSavedLocation, saveLocation, LOCATION_UPDATED_EVENT } from '../../services/locationStore';
import { DEFAULT_COORDS } from '../../constants/districtPlaces';
import { color, elevation, radii, space, type } from '../../../theme';

/* Port of components/LocationMapSection.jsx (mobile branch: 220px map with centre pin, locator button, "Use my location"). */
// The district headquarters (Haflong), like every other default in this app. The web template defaults to Hyderabad,
// which sits outside every Dima Hasao taxi zone, so a pickup left on that default can never be matched to a zone.
const DEFAULT_CENTER = { lat: DEFAULT_COORDS[1], lon: DEFAULT_COORDS[0] };
const savedCenter = () => {
  const saved = getSavedLocation();
  return typeof saved?.lat === 'number' && typeof saved?.lon === 'number' ? { lat: saved.lat, lon: saved.lon } : DEFAULT_CENTER;
};
const LAT_DELTA = 0.005;
const LNG_DELTA = 0.0085;
const AUTO_REFRESH_INTERVAL_MS = 2 * 60 * 1000;
const areCentersNearlyEqual = (first, second, threshold = 0.00001) =>
  Math.abs(Number(first?.lat ?? 0) - Number(second?.lat ?? 0)) < threshold &&
  Math.abs(Number(first?.lon ?? 0) - Number(second?.lon ?? 0)) < threshold;

const reverseGeocode = async (lat, lon) => {
  try {
    const response = await geocodeAPI.reverse(lat, lon);
    const data = response?.data?.data;
    if (data?.status === 'OK' && data.results?.[0]?.formatted_address) return data.results[0].formatted_address;
  } catch {
    // geocoding is best-effort
  }
  return '';
};

const LocatorIcon = ({ color }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={10} />
    <Circle cx={12} cy={12} r={3} />
    <Line x1={12} y1={1} x2={12} y2={3} />
    <Line x1={12} y1={21} x2={12} y2={23} />
    <Line x1={1} y1={12} x2={3} y2={12} />
    <Line x1={21} y1={12} x2={23} y2={12} />
  </Svg>
);

export default function LocationMapSection({ onGestureChange }) {
  const [coords, setCoords] = useState(null);
  // initialRegion is read once at mount, so start from the saved location instead of the default.
  const [centerCoords, setCenterCoords] = useState(savedCenter);
  const [status, setStatusState] = useState('idle');
  const [isDragging, setIsDragging] = useState(false);
  const mapRef = useRef(null);
  const isDraggingRef = useRef(false);
  const requestedLocationRef = useRef(false);
  const statusRef = useRef('idle');
  const centerRef = useRef(centerCoords);

  const setStatus = (newStatus) => {
    statusRef.current = newStatus;
    setStatusState(newStatus);
    events.emit('Appzeto 24:location-status', newStatus);
  };

  const animateTo = (next) => {
    mapRef.current?.animateToRegion({ latitude: next.lat, longitude: next.lon, latitudeDelta: LAT_DELTA, longitudeDelta: LNG_DELTA }, 300);
  };

  const setCenter = (next) => {
    centerRef.current = next;
    setCenterCoords(next);
  };

  useEffect(() => {
    const handleUpdate = () => {
      const saved = getSavedLocation();
      if (saved && typeof saved.lat === 'number' && typeof saved.lon === 'number') {
        const nextCoords = { lat: saved.lat, lon: saved.lon };
        setCoords(nextCoords);
        setCenter(nextCoords);
        setStatus('ready');
      }
    };
    events.on(LOCATION_UPDATED_EVENT, handleUpdate);
    return () => events.off(LOCATION_UPDATED_EVENT, handleUpdate);
  }, []);

  const persistCoords = (next) => {
    setCoords(next);
    setCenter(next);
    setStatus('ready');
    saveLocation({ ...next, updatedAt: Date.now() });
  };

  const persistAddress = (address) => {
    saveLocation({ address: String(address || '').trim() });
  };

  const requestLocation = async () => {
    setStatus('loading');
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted && perm.canAskAgain !== false) perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setStatus('denied');
        return;
      }
      let position;
      try {
        position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      } catch {
        position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      const next = { lat: position.coords.latitude, lon: position.coords.longitude };
      persistCoords(next);
      animateTo(next);
      const address = await reverseGeocode(next.lat, next.lon);
      if (address) persistAddress(address);
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    const saved = getSavedLocation();
    if (typeof saved?.lat === 'number' && typeof saved?.lon === 'number') {
      persistCoords({ lat: saved.lat, lon: saved.lon });
    }
    const shouldRefreshCurrentLocation =
      !saved ||
      typeof saved?.lat !== 'number' ||
      typeof saved?.lon !== 'number' ||
      !saved?.updatedAt ||
      Date.now() - saved.updatedAt > AUTO_REFRESH_INTERVAL_MS;
    if (shouldRefreshCurrentLocation && !requestedLocationRef.current) {
      requestedLocationRef.current = true;
      requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (coords) animateTo(coords);
  }, [coords]);

  const handlePanDrag = () => {
    if (isDraggingRef.current) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    onGestureChange?.(true);
  };

  const handleRegionChangeComplete = async (region, details) => {
    const wasDragging = isDraggingRef.current;
    if (wasDragging || details?.isGesture) {
      isDraggingRef.current = false;
      setIsDragging(false);
      onGestureChange?.(false);
      const next = { lat: region.latitude, lon: region.longitude };
      persistCoords(next);
      const address = await reverseGeocode(next.lat, next.lon);
      if (address) persistAddress(address);
      return;
    }
    const next = { lat: region.latitude, lon: region.longitude };
    if (areCentersNearlyEqual(centerRef.current, next)) return;
    setCenter(next);
    // Not saved here: a region that settles without a gesture is the map's own start/animation (initially the default
    // centre), and saving it overwrote the real saved coordinates (Indore) while the saved address label stayed.
    // The user dragging the map is saved above; GPS fixes are saved by persistCoords.
  };

  return (
    <View style={styles.section}>
      <View style={styles.mapBox}>
        {!HAS_VALID_GOOGLE_MAPS_KEY ? (
          <View style={styles.center}>
            <View>
              <Text style={styles.msgTitle}>Google Maps key missing</Text>
              <Text style={styles.msgBody}>Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to the app environment.</Text>
            </View>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={{ latitude: centerCoords.lat, longitude: centerCoords.lon, latitudeDelta: LAT_DELTA, longitudeDelta: LNG_DELTA }}
            onPanDrag={handlePanDrag}
            onRegionChangeComplete={handleRegionChangeComplete}
            toolbarEnabled={false}
            showsCompass={false}
            showsMyLocationButton={false}
            rotateEnabled={false}
            pitchEnabled={false}
            moveOnMarkerPress={false}
          />
        )}

        {/* The Pinpoint */}
        <View pointerEvents="none" style={styles.pinWrap}>
          <View style={[styles.pinShadow, isDragging && { opacity: 0.28, transform: [{ translateY: 7 }] }]} />
          <View style={[styles.pin, isDragging && { transform: [{ translateY: -20 }, { scale: 1.06 }] }]}>
            <View style={styles.pickupLabel}>
              <Text style={styles.pickupLabelText} numberOfLines={1}>Pickup point</Text>
            </View>
            <View style={styles.pinStem} />
            <View style={styles.pinDot}>
              <View style={styles.pinDotInner} />
            </View>
          </View>
        </View>

        {/* Floating locator target button */}
        <Press
          onPress={requestLocation}
          accessibilityLabel={status === 'loading' ? 'Finding your location' : 'Use my location'}
          accessibilityState={{ busy: status === 'loading' }}
          style={styles.locator}
        >
          <LocatorIcon color={status === 'loading' ? color.goldText : color.primary} />
        </Press>

        {!coords && status !== 'loading' ? (
          <Press onPress={requestLocation} scale={0.99} accessibilityLabel="Use my location" style={styles.useMine}>
            <Text style={styles.useMineText}>Use my location</Text>
          </Press>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { flex: 1, width: '100%' },
  mapBox: { flex: 1, minHeight: 200, width: '100%', overflow: 'hidden', backgroundColor: color.surfaceMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  msgTitle: { ...type.label, textAlign: 'center', color: color.text },
  msgBody: { ...type.caption, marginTop: space.xs, textAlign: 'center', color: color.textMuted },
  // Over the map: the centre pin is the one place absolute positioning is expected.
  pinWrap: { position: 'absolute', left: 0, right: 0, top: '50%', alignItems: 'center', zIndex: 20 },
  pinShadow: { position: 'absolute', top: 0, width: 14, height: 3, borderRadius: 7, backgroundColor: color.overlay, opacity: 0.55 },
  pin: { alignItems: 'center', transform: [{ translateY: -17 }] },
  pickupLabel: {
    position: 'absolute', top: -36, alignSelf: 'center', width: 116, alignItems: 'center', backgroundColor: color.primary, paddingVertical: space.xs, borderRadius: radii.pill,
    borderWidth: 1, borderColor: color.gold, ...elevation.float,
  },
  pickupLabelText: { ...type.caption, color: color.onPrimary, fontFamily: 'Poppins_600SemiBold' },
  pinStem: { width: 2, height: 14, backgroundColor: color.primary },
  pinDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: color.primary, borderWidth: 2, borderColor: color.surface, alignItems: 'center', justifyContent: 'center', ...elevation.card },
  pinDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.surface },
  locator: {
    position: 'absolute', right: space.lg, top: space.md, zIndex: 20, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, ...elevation.float,
  },
  useMine: {
    position: 'absolute', top: space.md, left: space.lg, zIndex: 20, minHeight: 44, justifyContent: 'center', borderRadius: radii.pill, borderWidth: 1, borderColor: color.border,
    backgroundColor: color.surface, paddingHorizontal: space.md, ...elevation.card,
  },
  useMineText: { ...type.label, color: color.primary },
});
