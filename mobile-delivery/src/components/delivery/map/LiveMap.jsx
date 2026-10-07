import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Constants from 'expo-constants';
import Svg, { Circle, Path } from 'react-native-svg';
import { useDeliveryStore } from '../../../delivery/store/useDeliveryStore';
import { getHaversineDistance } from '../../../delivery/utils/geo';
import { zoneApi } from '../../../api/delivery';
import { computeDrivingRoute, encodePath } from '../../../delivery/routes';

/*
 * Port of components/map/LiveMap.jsx on react-native-maps.
 *
 * Same map style, route line (Google Routes API, straight-line fallback,
 * distance-based throttle), remaining-path trimming, zone polygons,
 * restaurant / customer pins with the 40 m overlap rule, rider bike icon,
 * and the per-trip fitBounds. The web passes heading and tilt to a raster
 * Google map, which ignores both, so the map stays north-up and flat here.
 */

const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
];

const MARKER_OVERLAP_HIDE_METERS = 40;
const DEFAULT_CENTER = { lat: 22.7196, lng: 75.8577 };
const RIDER_IMG = require('../../../../assets/images/MapRider.webp');
const CUTLERY_IMG = require('../../../../assets/images/cutlery_icon.webp');

const useGoogle = Platform.OS === 'android' || Constants.expoConfig?.extra?.iosGoogleMaps;

// Google zoom level <-> latitude span for the initial region.
const zoomToDelta = (zoom) => 360 / 2 ** zoom;

const toLL = (p) => ({ latitude: p.lat, longitude: p.lng });
const dist = (a, b) => (a && b ? getHaversineDistance(a.lat, a.lng, b.lat, b.lng) : Infinity);

function CustomerPin() {
  // map.icons.js CUSTOMER_PIN_SVG at 44 x 44, anchored bottom-centre.
  return (
    <Svg width={44} height={44} viewBox="0 0 24 24">
      <Path
        fill="#10B981"
        d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"
      />
      <Circle cx={12} cy={9} r={3} fill="#FFFFFF" />
    </Svg>
  );
}

export function LiveMap({ onMapClick, onMapLoad, onPathReceived, onPolylineReceived, zoom = 12 }) {
  const riderLocation = useDeliveryStore((state) => state.riderLocation);
  const activeOrder = useDeliveryStore((state) => state.getFocusedOrder());
  const tripStatus = useDeliveryStore((state) => state.getFocusedTripStatus());
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [directions, setDirections] = useState(null); // { path: [{lat,lng}], encoded }
  const [zones, setZones] = useState([]);
  const [lastDirectionsAt, setLastDirectionsAt] = useState(0);
  const routeFetchInFlightRef = useRef(false);
  const framedTripKeyRef = useRef(null);

  const parsePoint = useCallback((raw) => {
    if (!raw) return null;
    const lat = parseFloat(raw.lat ?? raw.latitude);
    const lng = parseFloat(raw.lng ?? raw.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }, []);

  useEffect(() => {
    setLastDirectionsAt(0);
    setDirections(null);
  }, [tripStatus, activeOrder?._id]);

  const restaurantPoint = useMemo(() => parsePoint(activeOrder?.restaurantLocation), [activeOrder?.restaurantLocation, parsePoint]);
  const customerPoint = useMemo(() => parsePoint(activeOrder?.customerLocation), [activeOrder?.customerLocation, parsePoint]);
  const targetLocation = useMemo(() => {
    if (!activeOrder) return null;
    if (tripStatus === 'PICKING_UP' || tripStatus === 'REACHED_PICKUP') return parsePoint(activeOrder.restaurantLocation);
    if (tripStatus === 'PICKED_UP' || tripStatus === 'REACHED_DROP') return parsePoint(activeOrder.customerLocation);
    return null;
  }, [activeOrder, tripStatus, parsePoint]);
  const rider = useMemo(() => {
    if (!riderLocation) return null;
    const lat = parseFloat(riderLocation.lat || riderLocation.latitude);
    const lng = parseFloat(riderLocation.lng || riderLocation.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, heading: parseFloat(riderLocation.heading || 0) } : null;
  }, [riderLocation]);

  // The controller's mapRef: panTo + setOptions, as on the Google Maps JS object.
  const api = useMemo(
    () => ({
      panTo: ({ lat, lng }) => mapRef.current?.animateCamera({ center: { latitude: lat, longitude: lng } }, { duration: 300 }),
      setOptions: () => {},
    }),
    [],
  );

  useEffect(() => {
    if (!ready || typeof zoom !== 'number') return;
    mapRef.current?.animateCamera({ zoom }, { duration: 200 });
  }, [zoom, ready]);

  const routeThrottleMs = useMemo(() => {
    if (!rider || !targetLocation) return 20000;
    const d = dist(rider, targetLocation);
    if (d > 2000) return 60000;
    if (d > 500) return 20000;
    return 5000;
  }, [rider, targetLocation]);

  useEffect(() => {
    if (!rider || !targetLocation) return undefined;
    if (directions && Date.now() - lastDirectionsAt < routeThrottleMs) return undefined;
    if (routeFetchInFlightRef.current) return undefined;
    let cancelled = false;
    routeFetchInFlightRef.current = true;
    (async () => {
      try {
        const path = await computeDrivingRoute(rider, targetLocation);
        if (cancelled || !path?.length) return;
        const encoded = encodePath(path);
        setDirections({ path, encoded });
        setLastDirectionsAt(Date.now());
        if (encoded) onPolylineReceived?.(encoded);
      } catch {
        if (cancelled) return;
        // Routes API failed: straight-line fallback (no polyline is published).
        setDirections({ path: [{ lat: rider.lat, lng: rider.lng }, { lat: targetLocation.lat, lng: targetLocation.lng }], encoded: null });
        setLastDirectionsAt(Date.now());
      } finally {
        routeFetchInFlightRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rider?.lat, rider?.lng, targetLocation?.lat, targetLocation?.lng, routeThrottleMs, lastDirectionsAt, directions, onPolylineReceived]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (directions?.path && onPathReceived) onPathReceived(directions.path.map((p) => ({ lat: p.lat, lng: p.lng })));
  }, [directions, onPathReceived]);

  useEffect(() => {
    zoneApi
      .getPublicZones()
      .then((response) => {
        if (response?.data?.success && response.data.data?.zones) {
          setZones(
            response.data.data.zones
              .map((zone) => ({ ...zone, paths: (zone.coordinates || []).map((c) => ({ latitude: c.latitude, longitude: c.longitude })) }))
              .filter((z) => z.paths.length >= 3),
          );
        }
      })
      .catch(() => {});
  }, []);

  // Re-frame only when the focused order or the trip phase changes.
  useEffect(() => {
    framedTripKeyRef.current = null;
  }, [activeOrder?._id, tripStatus]);

  useEffect(() => {
    if (!ready) return;
    if (!(restaurantPoint || customerPoint) && !rider) return;
    const frameKey = `${activeOrder?._id || 'none'}:${tripStatus || 'idle'}`;
    if (framedTripKeyRef.current === frameKey) return;
    const coords = [restaurantPoint, customerPoint, rider].filter(Boolean).map(toLL);
    if (coords.length === 1) mapRef.current?.animateCamera({ center: coords[0] }, { duration: 0 });
    else mapRef.current?.fitToCoordinates(coords, { edgePadding: { top: 70, right: 70, bottom: 120, left: 70 }, animated: false });
    framedTripKeyRef.current = frameKey;
  }, [ready, rider, restaurantPoint, customerPoint, activeOrder?._id, tripStatus]);

  const remainingPath = useMemo(() => {
    const full = directions?.path;
    if (!full?.length || !rider) return [];
    let closestIndex = 0;
    let min = Infinity;
    full.forEach((p, i) => {
      const d = dist(rider, p);
      if (d < min) {
        min = d;
        closestIndex = i;
      }
    });
    let startIndex = closestIndex;
    if (closestIndex < full.length - 1) {
      const toCurrent = dist(rider, full[closestIndex]);
      const toNext = dist(rider, full[closestIndex + 1]);
      const segment = dist(full[closestIndex], full[closestIndex + 1]);
      if (toNext < segment && toNext < toCurrent) startIndex = closestIndex + 1;
    }
    return [{ lat: rider.lat, lng: rider.lng }, ...full.slice(startIndex)].map(toLL);
  }, [directions, rider]);

  const showRestaurantMarker =
    Boolean(restaurantPoint) &&
    (tripStatus === 'PICKING_UP' || tripStatus === 'REACHED_PICKUP') &&
    (!rider || dist(rider, restaurantPoint) > MARKER_OVERLAP_HIDE_METERS);
  const showCustomerMarker =
    Boolean(customerPoint) &&
    (tripStatus === 'PICKED_UP' || tripStatus === 'REACHED_DROP') &&
    (!rider || dist(rider, customerPoint) > MARKER_OVERLAP_HIDE_METERS);

  // Keep the seed centre stable so GPS/poll updates never fight a manual pan.
  const seedRef = useRef(null);
  if (!seedRef.current) seedRef.current = rider || targetLocation || DEFAULT_CENTER;
  const seed = seedRef.current;

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={useGoogle ? PROVIDER_GOOGLE : undefined}
        customMapStyle={MAP_STYLE}
        initialRegion={{ latitude: seed.lat, longitude: seed.lng, latitudeDelta: zoomToDelta(zoom), longitudeDelta: zoomToDelta(zoom) }}
        toolbarEnabled={false}
        showsCompass={false}
        showsMyLocationButton={false}
        showsIndoorLevelPicker={false}
        rotateEnabled
        pitchEnabled={false}
        onMapReady={() => {
          setReady(true);
          onMapLoad?.(api);
        }}
        onPress={(e) => onMapClick?.(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
      >
        {remainingPath.length > 0 ? <Polyline coordinates={remainingPath} strokeColor="rgba(59,130,246,0.9)" strokeWidth={8} zIndex={12} /> : null}

        {showRestaurantMarker ? (
          <Marker coordinate={toLL(restaurantPoint)} anchor={{ x: 0.5, y: 1 }} zIndex={20} tracksViewChanges={false}>
            <Image source={CUTLERY_IMG} style={{ width: 48, height: 48 }} />
          </Marker>
        ) : null}

        {showCustomerMarker ? (
          <Marker coordinate={toLL(customerPoint)} anchor={{ x: 0.5, y: 1 }} zIndex={20} tracksViewChanges={false}>
            <CustomerPin />
          </Marker>
        ) : null}

        {rider ? (
          // translate(-50%, -88%): the bike sits on the GPS point; rotated by heading.
          <Marker coordinate={toLL(rider)} anchor={{ x: 0.5, y: 0.88 }} zIndex={999} tracksViewChanges={false}>
            <View style={{ width: 72, height: 72, transform: [{ rotate: `${rider.heading || 0}deg` }] }}>
              <Image source={RIDER_IMG} style={{ width: 72, height: 72 }} resizeMode="contain" />
            </View>
          </Marker>
        ) : null}

        {zones.map((zone) => (
          <Polygon key={zone._id} coordinates={zone.paths} fillColor="rgba(34,197,94,0.03)" strokeColor="rgba(34,197,94,0.1)" strokeWidth={1} zIndex={1} />
        ))}
      </MapView>
      {!ready ? (
        <View style={[StyleSheet.absoluteFill, styles.loading]} pointerEvents="none">
          <ActivityIndicator color="#0A4D2B" />
        </View>
      ) : null}
    </View>
  );
}

export default LiveMap;

const styles = StyleSheet.create({
  loading: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
});
