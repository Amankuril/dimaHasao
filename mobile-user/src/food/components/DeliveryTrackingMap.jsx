import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Navigation } from 'lucide-react-native';
import { io } from 'socket.io-client';
import { API_ORIGIN } from '../../api/client';
import { getSocketOrigin } from '../../shared/utils/socketOrigin';
import { getGoogleMapsApiKey } from '../utils/googleMapsApiKey';
import { localStore } from '../../lib/storage';
import { color, elevation, radii, space, type } from '../../theme';

const RIDER = require('../../../assets/food/map_rider.png');
const MAP_STYLE = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

/** Plain {latitude, longitude} for react-native-maps from the web's {lat, lng}. */
const toCoord = (p) => ({ latitude: p.lat, longitude: p.lng });

function normPt(pt) {
  if (!pt) return null;
  if (Array.isArray(pt) && pt.length >= 2) {
    const lng = Number(pt[0]);
    const lat = Number(pt[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const lat = Number(pt.lat ?? pt.latitude);
  const lng = Number(pt.lng ?? pt.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** Google's encoded polyline -> [{lat,lng}] (the web gets this from the JS SDK). */
function decodePolyline(str) {
  const out = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < str.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    out.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return out;
}

const sqDist = (a, b) => (a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2;
function findClosestPointIndex(path, rider) {
  if (!path || !path.length || !rider) return 0;
  let min = Infinity;
  let idx = 0;
  for (let i = 0; i < path.length; i += 1) {
    const d = sqDist(path[i], rider);
    if (d < min) {
      min = d;
      idx = i;
    }
  }
  return idx;
}

function Pin({ color, uri, fallback }) {
  const [failed, setFailed] = useState(false);
  return (
    <View collapsable={false} style={{ alignItems: 'center' }}>
      <View style={[styles.pin, { borderColor: color }]}>
        {uri && !failed ? (
          <Image source={{ uri }} style={styles.pinImg} resizeMode="contain" onError={() => setFailed(true)} />
        ) : (
          <View style={[styles.pinFallback, { backgroundColor: fallback }]} />
        )}
      </View>
      <View style={[styles.pinTip, { borderTopColor: color }]} />
    </View>
  );
}

export default function DeliveryTrackingMap({ orderId, orderTrackingIds = [], restaurantCoords, customerCoords, order = null, onEtaUpdate = null }) {
  const isTakeaway = order?.orderType === 'takeaway';
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [riderLocation, setRiderLocation] = useState(null);
  const [currentEta, setCurrentEta] = useState(null);
  const [fullRoutePath, setFullRoutePath] = useState(null);
  const [smoothLocation, setSmoothLocation] = useState(null);
  const [riderLoaded, setRiderLoaded] = useState(false);
  const [pinsTracking, setPinsTracking] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setPinsTracking(false), 2500);
    return () => clearTimeout(t);
  }, []);
  const interpRef = useRef({ lastPos: null, nextPos: null, startTime: 0, durationMs: 1500 });
  const lastUpdateAtRef = useRef(0);
  const lastSmoothSetRef = useRef(0);
  const baselineRequestedRef = useRef(false);
  const etaRef = useRef(null);

  const trackingIds = useMemo(() => {
    const ids = [orderId, ...(Array.isArray(orderTrackingIds) ? orderTrackingIds : [])].map((id) => String(id || '').trim()).filter(Boolean);
    return [...new Set(ids)];
  }, [orderId, orderTrackingIds]);

  const backendUrl = useMemo(() => getSocketOrigin() || API_ORIGIN, []);

  // 1. Initial state from the order payload
  useEffect(() => {
    const loc = order?.deliveryState?.currentLocation;
    if (loc && !riderLocation) {
      const lat = typeof loc.lat === 'number' ? loc.lat : Array.isArray(loc.coordinates) ? Number(loc.coordinates[1]) : null;
      const lng = typeof loc.lng === 'number' ? loc.lng : Array.isArray(loc.coordinates) ? Number(loc.coordinates[0]) : null;
      if (Number.isFinite(lat) && Number.isFinite(lng)) setRiderLocation({ lat, lng, heading: loc.bearing || loc.heading || 0 });
    }
  }, [order, riderLocation]);

  // 2. Socket.IO realtime
  useEffect(() => {
    if (!trackingIds.length) return undefined;
    const token = localStore.getItem('user_accessToken') || localStore.getItem('accessToken') || '';
    const socket = io(backendUrl, { transports: ['websocket', 'polling'], auth: { token } });
    socket.on('connect', () => {
      trackingIds.forEach((id) => socket.emit('join-tracking', id));
    });
    socket.on('location-update', (data) => {
      const dataOrderId = data?.orderId || data?.order_id || data?.trackingId || data?.order?.id || data?.order?._id;
      const matchedId = dataOrderId ? trackingIds.find((id) => String(id) === String(dataOrderId)) : trackingIds.length === 1 ? trackingIds[0] : null;
      const lat = Number(data?.lat ?? data?.boy_lat ?? data?.location?.lat ?? data?.location?.coordinates?.[1]);
      const lng = Number(data?.lng ?? data?.boy_lng ?? data?.location?.lng ?? data?.location?.coordinates?.[0]);
      if (data && matchedId && Number.isFinite(lat) && Number.isFinite(lng)) {
        const nextPos = { lat, lng, heading: Number(data?.heading ?? data?.bearing ?? data?.location?.heading ?? 0) };
        const now = Date.now();
        const delta = Math.max(300, Math.min(now - (lastUpdateAtRef.current || now), 4000));
        lastUpdateAtRef.current = now;
        interpRef.current = { lastPos: interpRef.current.nextPos || nextPos, nextPos, startTime: now, durationMs: delta };
        setRiderLocation(nextPos);
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [trackingIds, backendUrl]);

  // 3. Smooth glide between two socket fixes (the web redraws at ~30 fps; a native map takes ~12)
  useEffect(() => {
    let frame;
    const update = () => {
      const { lastPos, nextPos, startTime, durationMs } = interpRef.current;
      if (lastPos && nextPos) {
        const duration = Math.max(600, durationMs || 1500);
        const raw = Math.min((Date.now() - startTime) / duration, 1);
        const progress = raw * raw * (3 - 2 * raw);
        const lat = lastPos.lat + (nextPos.lat - lastPos.lat) * progress;
        const lng = lastPos.lng + (nextPos.lng - lastPos.lng) * progress;
        let lastHead = lastPos.heading || 0;
        let nextHead = nextPos.heading || 0;
        if (Math.abs(nextHead - lastHead) > 180) {
          if (nextHead > lastHead) lastHead += 360;
          else nextHead += 360;
        }
        const heading = lastHead + (nextHead - lastHead) * progress;
        const now = Date.now();
        if (now - lastSmoothSetRef.current >= 80 || raw >= 1) {
          lastSmoothSetRef.current = now;
          setSmoothLocation((prev) => (prev && prev.lat === lat && prev.lng === lng ? prev : { lat, lng, heading: heading % 360 }));
        }
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);

  const displayRider = smoothLocation || riderLocation;
  const tripStatus = String(order?.status || order?.orderStatus || 'pending');
  const isOrderPickedUp = ['picked_up', 'out_for_delivery', 'delivered'].includes(tripStatus.toLowerCase());
  const normRest = useMemo(() => normPt(restaurantCoords), [restaurantCoords]);
  const normCust = useMemo(() => normPt(customerCoords), [customerCoords]);

  // 5. Camera: fit both pins (and the rider) when the leg changes, else at most every 15 s
  const lastCameraRef = useRef({ time: 0, status: null });
  useEffect(() => {
    if (!mapReady || !normRest || !normCust || !mapRef.current) return;
    const now = Date.now();
    const statusChanged = lastCameraRef.current.status !== isOrderPickedUp;
    if (!statusChanged && now - lastCameraRef.current.time < 15000) return;
    lastCameraRef.current = { time: now, status: isOrderPickedUp };
    const pts = [toCoord(normRest), toCoord(normCust)];
    if (riderLocation) pts.push(toCoord(riderLocation));
    mapRef.current.fitToCoordinates(pts, { edgePadding: { top: 100, bottom: 120, left: 60, right: 60 }, animated: true });
  }, [mapReady, riderLocation, normRest, normCust, isOrderPickedUp]);

  // 6. Baseline route restaurant -> customer (the web's DirectionsService)
  useEffect(() => {
    if (!normRest || !normCust || fullRoutePath || baselineRequestedRef.current) return undefined;
    baselineRequestedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const key = await getGoogleMapsApiKey();
        if (!key) return;
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${normRest.lat},${normRest.lng}&destination=${normCust.lat},${normCust.lng}&mode=driving&key=${key}`;
        const res = await fetch(url);
        const json = await res.json();
        if (cancelled) return;
        if (json.status !== 'OK') {
          console.warn('[DeliveryTrackingMap] Baseline Directions failed:', json.status);
          return;
        }
        const plain = decodePolyline(json.routes?.[0]?.overview_polyline?.points || '');
        if (plain.length > 1) setFullRoutePath(plain);
        const durationText = json.routes?.[0]?.legs?.[0]?.duration?.text;
        if (durationText && !etaRef.current) {
          etaRef.current = durationText;
          setCurrentEta(durationText);
          if (onEtaUpdate) onEtaUpdate(durationText);
        }
      } catch {
        // like the web, a failed lookup leaves the straight line
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [normRest, normCust, fullRoutePath, onEtaUpdate]);

  const { traveledPath, remainingPath } = useMemo(() => {
    if (!fullRoutePath || fullRoutePath.length < 2) {
      if (normRest && normCust) return { traveledPath: [], remainingPath: [normRest, normCust] };
      return { traveledPath: [], remainingPath: [] };
    }
    if (isTakeaway || !displayRider) return { traveledPath: [], remainingPath: fullRoutePath };
    const splitIdx = findClosestPointIndex(fullRoutePath, displayRider);
    return {
      traveledPath: [...fullRoutePath.slice(0, splitIdx + 1), { lat: displayRider.lat, lng: displayRider.lng }],
      remainingPath: [{ lat: displayRider.lat, lng: displayRider.lng }, ...fullRoutePath.slice(splitIdx + 1)],
    };
  }, [fullRoutePath, displayRider, normRest, normCust, isTakeaway]);

  const remainingColor = isOrderPickedUp ? color.info : color.success;
  const center = (isOrderPickedUp ? normCust : normRest) || { lat: 0, lng: 0 };
  const onRiderImage = useCallback(() => setRiderLoaded(true), []);

  const restImg = order?.restaurantLogo || order?.restaurantId?.logo || order?.restaurantId?.profileImage;
  const custImg = order?.customerImage || order?.userId?.profileImage || order?.userId?.avatar;
  const isUri = (v) => (typeof v === 'string' && v ? v : v?.url || null);

  return (
    <View style={styles.wrap}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
        customMapStyle={MAP_STYLE}
        onMapReady={() => setMapReady(true)}
        zoomControlEnabled
        mapType="standard"
        toolbarEnabled={false}
        rotateEnabled={false}
        showsScale
      >
        {traveledPath.length > 1 ? <Polyline coordinates={traveledPath.map(toCoord)} strokeColor={color.textDisabled} strokeWidth={6} lineDashPattern={[1, 10]} lineCap="round" zIndex={6} /> : null}
        {remainingPath.length > 1 ? <Polyline coordinates={remainingPath.map(toCoord)} strokeColor={remainingColor} strokeWidth={6} zIndex={8} /> : null}
        {normRest ? (
          <Marker coordinate={toCoord(normRest)} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={pinsTracking} zIndex={3}>
            <Pin color={color.primary} uri={isUri(restImg)} fallback={color.gold} />
          </Marker>
        ) : null}
        {normCust ? (
          <Marker coordinate={toCoord(normCust)} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={pinsTracking} zIndex={3}>
            <Pin color={color.success} uri={isUri(custImg)} fallback={color.success} />
          </Marker>
        ) : null}
        {displayRider && !isTakeaway ? (
          <Marker coordinate={toCoord(displayRider)} anchor={{ x: 0.5, y: 0.5 }} flat rotation={displayRider.heading || 0} tracksViewChanges={!riderLoaded} zIndex={5}>
            <View collapsable={false} style={styles.rider}>
              <Image source={RIDER} style={styles.riderImg} resizeMode="contain" onLoad={onRiderImage} />
            </View>
          </Marker>
        ) : null}
      </MapView>

      {riderLocation && currentEta && !isTakeaway ? (
        <View pointerEvents="none" style={styles.badge}>
          <Text style={[type.overline, { color: color.goldOnDark }]}>Arrival</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Text style={styles.badgeEta}>{currentEta}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.8 }}>
              <View style={styles.dot} />
              <Navigation size={14} color={color.textInverse} style={{ transform: [{ rotate: '45deg' }] }} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', height: '100%', overflow: 'hidden', borderRadius: radii.lg, borderWidth: 1, borderColor: color.border },
  pin: { width: 44, height: 44, borderRadius: 22, padding: 4, backgroundColor: color.surface, borderWidth: 2, overflow: 'hidden', ...elevation.float },
  pinImg: { width: '100%', height: '100%', borderRadius: 18, backgroundColor: color.surfaceMuted },
  pinFallback: { flex: 1, borderRadius: 18 },
  pinTip: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -2 },
  rider: { width: 64, height: 64 },
  riderImg: { width: 64, height: 64 },
  badge: { position: 'absolute', top: space.md, left: space.md, minWidth: 96, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radii.md, backgroundColor: color.primaryDeep, borderWidth: 1, borderColor: color.gold, ...elevation.float },
  badgeEta: { ...type.price, color: color.textInverse },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.textInverse },
});
