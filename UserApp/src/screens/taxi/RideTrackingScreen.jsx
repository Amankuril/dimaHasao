/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/ride/RideTracking.jsx
 * (1,816 lines on the web). Kept 1:1: hydrating the ride on mount (and
 * redirecting straight to RideComplete if it already ended while this
 * screen was closed), the socket event handling (ride:state,
 * ride:driver-location:updated, ride:status:updated), the OTP-visible-only-
 * before-pickup rule, the free-waiting-then-chargeable-per-minute math, and
 * cancel via PATCH /rides/:id/cancel.
 *
 * Dropped (disclosed, not silent): the Firebase Realtime Database SSE
 * fallback channel the web version falls back to when its socket drops —
 * that channel only ever activates when a deployment sets
 * VITE_FIREBASE_DATABASE_URL, RN has no EventSource, and socket.io's own
 * reconnection logic (already configured in services/taxi/socket.js)
 * covers the same "socket dropped" case. The route polyline comes from the
 * Google Directions REST API (same approach as SelectVehicleScreen) rather
 * than the browser Maps SDK. "Scheduled ride" countdown UI is skipped
 * since this port's SelectVehicleScreen never produces a scheduled ride
 * (see that screen's scope note).
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Linking, Pressable, SafeAreaView, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import {AlertTriangle, MessageCircle, Phone, Shield, Star} from 'lucide-react-native';

import api from '../../services/taxi/axiosInstance';
import socketService from '../../services/taxi/socket';
import {GOOGLE_MAPS_API_KEY} from '../../services/api/config';
import {clearCurrentRide, saveCurrentRide, getCurrentRide} from '../../services/taxi/currentRideService';
import VehicleIcon from '../../components/taxi/VehicleIcon';

const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'delivered']);
const POST_RIDE_REDIRECT_STATUSES = new Set(['arrived', 'completed', 'delivered']);
const unwrap = response => response?.data?.data || response?.data || response;

const toLatLng = (coords, fallback) => {
  const [lng, lat] = coords || [];
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) return {latitude: Number(lat), longitude: Number(lng)};
  return fallback;
};

async function fetchRoutePolyline(origin, destination) {
  if (!GOOGLE_MAPS_API_KEY) return [];
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const body = await res.json();
    const points = body?.routes?.[0]?.overview_polyline?.points;
    if (!points) return [];
    return decodePolyline(points);
  } catch {
    return [];
  }
}

function decodePolyline(encoded) {
  let index = 0,
    lat = 0,
    lng = 0;
  const coordinates = [];
  while (index < encoded.length) {
    let shift = 0,
      result = 0,
      byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({latitude: lat / 1e5, longitude: lng / 1e5});
  }
  return coordinates;
}

export default function RideTrackingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [storedRide, setStoredRide] = useState(null);
  const [isResolvingStoredRide, setIsResolvingStoredRide] = useState(!route.params?.ride);

  // Only consulted when this screen is opened without a `ride` param (e.g.
  // the app reopened while a ride was active) — getCurrentRide() is async
  // (AsyncStorage), so it can't be read synchronously the way the web
  // version read localStorage. Until this resolves, `rideId` below is
  // deliberately not treated as "missing" (see the hydrate effect).
  useEffect(() => {
    if (route.params?.ride) return;
    getCurrentRide().then(ride => {
      setStoredRide(ride);
      setIsResolvingStoredRide(false);
    });
  }, [route.params?.ride]);

  const state = route.params?.ride || storedRide || {};
  const rideId = state.rideId || '';

  const [rideRealtime, setRideRealtime] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [waitingNow, setWaitingNow] = useState(Date.now());

  const latestStateRef = useRef(state);
  const completeTrackingRef = useRef(() => {});

  const fare = rideRealtime?.fare || state.fare || 22;
  const paymentMethod = rideRealtime?.paymentMethod || state.paymentMethod || 'Cash';
  const pickupLabel = rideRealtime?.pickup?.address || state.pickup || 'Pickup';
  const dropLabel = rideRealtime?.drop?.address || state.drop || '';
  const pickupPosition = toLatLng(rideRealtime?.pickup?.coordinates || state.pickupCoords, {latitude: 25.1667, longitude: 93.0167});
  const dropPosition = toLatLng(rideRealtime?.drop?.coordinates || state.dropCoords, pickupPosition);
  const driverPosition = toLatLng(rideRealtime?.driverLocation?.coordinates, pickupPosition);
  const tripStatus = String(rideRealtime?.status || state.liveStatus || state.status || 'accepted').toLowerCase();
  const otp = ['started', 'ongoing', 'arrived', 'completed'].includes(tripStatus) ? '' : String(rideRealtime?.otp || state.otp || '');
  const driver = {...(state.driver || {}), ...(rideRealtime?.driver || {})};
  const activeDestination = ['started', 'ongoing', 'arrived', 'completed'].includes(tripStatus) ? dropPosition : pickupPosition;

  const waitingPricing = rideRealtime?.pricingSnapshot || state.pricingSnapshot || {};
  const waitingChargePerMinute = Math.max(0, Number(waitingPricing?.waiting_charge ?? 0));
  const freeWaitingBeforeMinutes = Math.max(0, Number(waitingPricing?.free_waiting_before ?? 0));
  const waitingStartedAt = rideRealtime?.arrivedAt || state.arrivedAt || '';
  const waitingElapsedSeconds = waitingStartedAt ? Math.max(0, Math.floor((waitingNow - new Date(waitingStartedAt).getTime()) / 1000)) : 0;
  const waitingChargeableMinutes = Math.max(0, Math.ceil(waitingElapsedSeconds / 60) - freeWaitingBeforeMinutes);
  const isWaitingForOtp = Boolean(waitingStartedAt) && !['started', 'ongoing', 'arrived', 'completed', 'cancelled', 'delivered'].includes(tripStatus);

  const driverSubtitle = isWaitingForOtp
    ? `${driver.name || 'Driver'} has arrived`
    : tripStatus === 'arrived'
    ? 'Driver reached destination'
    : tripStatus === 'started' || tripStatus === 'ongoing'
    ? 'Trip started'
    : 'Captain is on the way';

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!isWaitingForOtp) return undefined;
    const interval = setInterval(() => setWaitingNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isWaitingForOtp]);

  const completeTracking = useCallback(
    (statusValue = 'completed') => {
      const snapshot = {
        ...state,
        rideId,
        fare,
        paymentMethod,
        pickup: pickupLabel,
        drop: dropLabel,
        driver,
        status: statusValue,
        liveStatus: statusValue,
        arrivedAt: rideRealtime?.arrivedAt || state.arrivedAt || '',
        completedAt: rideRealtime?.completedAt || Date.now(),
      };
      saveCurrentRide(snapshot);
      navigation.replace('RideComplete', {ride: snapshot});
    },
    [state, rideId, fare, paymentMethod, pickupLabel, dropLabel, driver, rideRealtime, navigation],
  );

  useEffect(() => {
    completeTrackingRef.current = completeTracking;
  }, [completeTracking]);

  // Hydrate on mount; jump straight to RideComplete if the ride already ended.
  useEffect(() => {
    if (isResolvingStoredRide) return undefined;
    if (!rideId) {
      navigation.replace('TaxiHome');
      return undefined;
    }
    let active = true;
    (async () => {
      try {
        const payload = unwrap(await api.get(`/rides/${rideId}`));
        if (!active) return;
        const nextStatus = String(payload?.liveStatus || payload?.status || '').toLowerCase();
        const nextRealtime = {
          pickup: {coordinates: payload?.pickupLocation?.coordinates, address: payload?.pickupAddress || state.pickup},
          drop: {coordinates: payload?.dropLocation?.coordinates, address: payload?.dropAddress || state.drop},
          driverLocation: payload?.lastDriverLocation ? {coordinates: payload.lastDriverLocation.coordinates} : null,
          status: nextStatus,
          fare: payload?.fare || state.fare,
          paymentMethod: payload?.paymentMethod || state.paymentMethod,
          otp: payload?.otp || state.otp,
          arrivedAt: payload?.arrivedAt || state.arrivedAt || '',
          pricingSnapshot: payload?.pricingSnapshot || null,
          driver: {...(state.driver || {}), ...(payload?.driver || {})},
        };
        setRideRealtime(nextRealtime);

        if (POST_RIDE_REDIRECT_STATUSES.has(nextStatus)) {
          completeTrackingRef.current(nextStatus);
          return;
        }
        if (nextStatus === 'cancelled') clearCurrentRide();
      } catch {
        // socket below is still the primary realtime path
      }
    })();
    return () => {
      active = false;
    };
  }, [rideId, isResolvingStoredRide]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live socket updates.
  useEffect(() => {
    if (!rideId) return undefined;

    const onRideState = payload => {
      if (!payload || String(payload.rideId || '') !== String(rideId)) return;
      setRideRealtime(prev => ({...(prev || {}), ...payload}));
    };
    const onLocationUpdated = payload => {
      if (!payload || String(payload.rideId || '') !== String(rideId)) return;
      setRideRealtime(prev => ({...(prev || {}), driverLocation: {coordinates: payload.coordinates, heading: payload.heading}}));
    };
    const onStatusUpdated = payload => {
      if (!payload || String(payload.rideId || '') !== String(rideId)) return;
      const nextStatus = String(payload.liveStatus || payload.status || 'accepted').toLowerCase();

      if (POST_RIDE_REDIRECT_STATUSES.has(nextStatus)) {
        setRideRealtime(prev => ({...(prev || {}), status: nextStatus, arrivedAt: payload.arrivedAt || prev?.arrivedAt}));
        completeTrackingRef.current(nextStatus);
        return;
      }
      if (nextStatus === 'cancelled') clearCurrentRide();
      else saveCurrentRide({...latestStateRef.current, rideId, status: nextStatus, arrivedAt: payload.arrivedAt || latestStateRef.current.arrivedAt});

      setRideRealtime(prev => ({...(prev || {}), status: nextStatus, arrivedAt: payload.arrivedAt || prev?.arrivedAt}));
    };

    socketService.on('ride:state', onRideState);
    socketService.on('ride:driver-location:updated', onLocationUpdated);
    socketService.on('ride:status:updated', onStatusUpdated);
    socketService.emit('ride:join', {rideId});

    return () => {
      socketService.off('ride:state', onRideState);
      socketService.off('ride:driver-location:updated', onLocationUpdated);
      socketService.off('ride:status:updated', onStatusUpdated);
    };
  }, [rideId]);

  // Route polyline from the driver/pickup toward the active destination.
  useEffect(() => {
    let active = true;
    fetchRoutePolyline(driverPosition, activeDestination).then(path => {
      if (active) setRoutePath(path);
    });
    return () => {
      active = false;
    };
  }, [driverPosition.latitude, driverPosition.longitude, activeDestination.latitude, activeDestination.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancelRide = async () => {
    try {
      if (rideId) await api.patch(`/rides/${rideId}/cancel`);
    } catch {
      // ride may have already advanced past cancellable; clear local state regardless
    } finally {
      clearCurrentRide();
      navigation.replace('TaxiHome');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View style={{height: '45%'}}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{flex: 1}}
          initialRegion={{...driverPosition, latitudeDelta: 0.02, longitudeDelta: 0.02}}
          region={{...driverPosition, latitudeDelta: 0.02, longitudeDelta: 0.02}}>
          <Marker coordinate={pickupPosition} pinColor="#f8e001" title="Pickup" />
          <Marker coordinate={dropPosition} pinColor="#fb923c" title="Drop" />
          <Marker coordinate={driverPosition} title={driver.name || 'Driver'}>
            <View className="bg-white rounded-full p-1.5 border border-slate-200">
              <VehicleIcon name={state.vehicleIconType || driver.vehicle} size={18} />
            </View>
          </Marker>
          {routePath.length > 1 && <Polyline coordinates={routePath} strokeColor="#111827" strokeWidth={4} />}
        </MapView>
      </View>

      <View className="flex-1 px-4 py-4">
        <View className="flex-row items-center gap-3 pb-3 border-b border-slate-100">
          <View className="w-14 h-14 rounded-full bg-slate-100 items-center justify-center">
            <VehicleIcon name={state.vehicleIconType || driver.vehicle} size={24} />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-extrabold text-slate-900">{driver.name || 'Captain'}</Text>
            <Text className="text-[12px] text-slate-500">{driverSubtitle}</Text>
            <View className="flex-row items-center gap-1 mt-0.5">
              <Star size={12} color="#f59e0b" fill="#f59e0b" />
              <Text className="text-[11px] text-slate-500">{Number(driver.rating || 4.9).toFixed(1)}</Text>
              <Text className="text-[11px] text-slate-400 ml-2">{driver.vehicleNumber || driver.plate || ''}</Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => driver.phone && Linking.openURL(`tel:${driver.phone}`)}
              className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center">
              <Phone size={16} color="#059669" />
            </Pressable>
            <Pressable onPress={() => navigation.navigate('RideChat', {ride: state})} className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center">
              <MessageCircle size={16} color="#2563eb" />
            </Pressable>
          </View>
        </View>

        {!!otp && (
          <View className="flex-row items-center justify-between py-3 border-b border-slate-100">
            <Text className="text-[12px] font-bold text-slate-600">Share this OTP with your captain</Text>
            <Text className="text-lg font-black text-slate-900 tracking-widest">{otp}</Text>
          </View>
        )}

        {isWaitingForOtp && waitingChargePerMinute > 0 && waitingChargeableMinutes > 0 && (
          <View className="py-2">
            <Text className="text-[11px] font-bold text-amber-600">
              Waiting charges apply: ₹{waitingChargePerMinute}/min after {freeWaitingBeforeMinutes} min free (
              {waitingChargeableMinutes} min so far)
            </Text>
          </View>
        )}

        <View className="py-3 gap-1.5">
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-emerald-500" />
            <Text className="text-[13px] text-slate-700 flex-1" numberOfLines={1}>
              {pickupLabel}
            </Text>
          </View>
          {!!dropLabel && (
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-rose-500" />
              <Text className="text-[13px] text-slate-700 flex-1" numberOfLines={1}>
                {dropLabel}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center justify-between py-2">
          <Text className="text-[12px] text-slate-500">
            {paymentMethod} • Fare
          </Text>
          <Text className="text-base font-black text-slate-900">₹{Math.round(fare)}</Text>
        </View>

        <View className="flex-row gap-2 mt-auto pt-3">
          <Pressable onPress={() => navigation.navigate('RideSupport')} className="flex-1 flex-row items-center justify-center gap-1.5 border border-slate-200 rounded-xl py-2.5">
            <Shield size={14} color="#0f172a" />
            <Text className="text-[12px] font-bold text-slate-800">Support</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('SOSContacts')} className="flex-1 flex-row items-center justify-center gap-1.5 border border-rose-200 rounded-xl py-2.5">
            <AlertTriangle size={14} color="#dc2626" />
            <Text className="text-[12px] font-bold text-rose-600">SOS</Text>
          </Pressable>
        </View>

        {!['started', 'ongoing'].includes(tripStatus) && !TERMINAL_STATUSES.has(tripStatus) && (
          <Pressable onPress={() => setShowCancelConfirm(true)} className="items-center py-3">
            <Text className="text-rose-500 font-bold text-[12px]">Cancel ride</Text>
          </Pressable>
        )}

        {showCancelConfirm && (
          <View className="absolute inset-0 bg-black/40 items-center justify-center px-6">
            <View className="bg-white rounded-2xl p-5 w-full">
              <Text className="text-base font-extrabold text-slate-900 mb-1">Cancel this ride?</Text>
              <Text className="text-[12px] text-slate-500 mb-4">A cancellation fee may apply depending on how far your captain has come.</Text>
              <View className="flex-row gap-2">
                <Pressable onPress={() => setShowCancelConfirm(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 items-center">
                  <Text className="text-slate-700 font-bold text-[12px]">Keep ride</Text>
                </Pressable>
                <Pressable onPress={handleCancelRide} className="flex-1 bg-rose-600 rounded-xl py-2.5 items-center">
                  <Text className="text-white font-bold text-[12px]">Yes, cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
