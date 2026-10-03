/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/ride/SearchingDriver.jsx.
 *
 * Kept 1:1: the POST /rides payload shape, the socket join + event
 * handling (rideSearchUpdate/rideAccepted/ride:state/ride:status:updated/
 * rideCancelled/errorMessage), the 10s fallback poll against
 * /rides/active/me for when the socket doesn't deliver, and cancel via
 * PATCH /rides/:id/cancel.
 *
 * Dropped: the web's sessionStorage "search nonce" + popstate back-button
 * guard (preventing a double ride-create on browser back/StrictMode
 * remount) — React Navigation's stack doesn't remount a screen the way the
 * browser's back button could re-run an effect, so a plain `hasStarted`
 * ref is enough here. Android's hardware back button is wired to the same
 * cancel flow instead, which is the back button's RN equivalent. The
 * decorative animated "nearby vehicles" map markers are cosmetic and
 * skipped, same call as the other ride screens.
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, BackHandler, Pressable, SafeAreaView, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Car, X} from 'lucide-react-native';

import api from '../../services/taxi/axiosInstance';
import socketService from '../../services/taxi/socket';
import {getLocalUserToken} from '../../services/taxi/authService';
import {saveCurrentRide} from '../../services/taxi/currentRideService';
import VehicleIcon from '../../components/taxi/VehicleIcon';

const FALLBACK_POLL_DELAY_MS = 10000;
const FALLBACK_POLL_INTERVAL_MS = 10000;

function normalizeDriver(driver) {
  if (!driver) return null;
  return {
    id: driver._id || driver.id,
    name: driver.name || 'Captain',
    phone: driver.phone || '',
    vehicleNumber: driver.vehicleNumber || '',
    vehicleModel: driver.vehicleModel || driver.vehicleMake || '',
    rating: Number(driver.rating || 0),
    location: driver.location || null,
  };
}

export default function SearchingDriverScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};

  const [status, setStatus] = useState('Finding you a captain nearby...');
  const [stage, setStage] = useState('searching'); // 'searching' | 'accepted'

  const hasStartedRef = useRef(false);
  const disposedRef = useRef(false);
  const activeRideIdRef = useRef('');
  const trackingStartedRef = useRef(false);
  const driverRef = useRef(null);
  const timerRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const pollStartTimeoutRef = useRef(null);
  const cancellingRef = useRef(false);

  const vehicleIconType = params.vehicleIconType || params.vehicle?.iconType || params.vehicle?.name || 'car';

  const hydrateAcceptedRide = useCallback(async () => {
    const res = await api.get('/rides/active/me');
    const activeRide = res?.data?.data || res?.data || res;
    return activeRide?.rideId ? activeRide : null;
  }, []);

  const moveToTracking = useCallback(
    ({acceptedDriver, rideId, rideSnapshot}) => {
      if (disposedRef.current || trackingStartedRef.current) return;

      const nextDriver = normalizeDriver(acceptedDriver);
      const nextOtp = String(rideSnapshot?.otp || params.otp || '');
      driverRef.current = nextDriver;
      activeRideIdRef.current = String(rideId || activeRideIdRef.current || '');
      trackingStartedRef.current = true;
      setStage('accepted');
      setStatus('Captain accepted your ride.');

      const ride = {
        ...params,
        pickup: rideSnapshot?.pickupAddress || params.pickup,
        drop: rideSnapshot?.dropAddress || params.drop,
        pickupCoords: rideSnapshot?.pickupLocation?.coordinates || params.pickupCoords,
        dropCoords: rideSnapshot?.dropLocation?.coordinates || params.dropCoords,
        rideId: activeRideIdRef.current,
        otp: nextOtp,
        driver: nextDriver,
        fare: rideSnapshot?.fare || params.fare || params.baseFare || params.vehicle?.price || 22,
        paymentMethod: params.paymentMethod || 'Cash',
        status: 'accepted',
      };
      saveCurrentRide(ride);

      clearInterval(pollIntervalRef.current);
      timerRef.current = setTimeout(() => {
        navigation.replace('RideTracking', {ride});
      }, 1200);
    },
    [navigation, params],
  );

  const handleCancel = useCallback(async () => {
    if (cancellingRef.current) return;
    cancellingRef.current = true;
    clearTimeout(timerRef.current);

    const rideId = activeRideIdRef.current;
    try {
      if (rideId) await api.patch(`/rides/${rideId}/cancel`);
    } catch {
      // navigation still proceeds even if the cancel races a state update
    }
    navigation.navigate('TaxiHome');
  }, [navigation]);

  // Android hardware back button -> same cancel flow as a tap on the X.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCancel();
      return true;
    });
    return () => sub.remove();
  }, [handleCancel]);

  useEffect(() => {
    if (hasStartedRef.current) return undefined;
    hasStartedRef.current = true;

    const onRideSearchUpdate = ({matchedDrivers, radius}) => {
      const radiusKm = radius ? (Number(radius) / 1000).toFixed(1) : '';
      setStatus(
        matchedDrivers > 0
          ? `${matchedDrivers} captain${matchedDrivers > 1 ? 's' : ''} notified within ${radiusKm} km`
          : `Searching within ${radiusKm} km`,
      );
    };
    const onRideAccepted = ({driver, rideId}) => moveToTracking({acceptedDriver: driver, rideId});
    const onRideState = payload => {
      if (!payload || String(payload.rideId || '') !== String(activeRideIdRef.current || '')) return;
      if (payload.status === 'accepted' || payload.liveStatus === 'accepted') {
        moveToTracking({acceptedDriver: payload.driver, rideId: payload.rideId, rideSnapshot: payload});
      }
    };
    const onRideStatusUpdated = async payload => {
      if (!payload || String(payload.rideId || '') !== String(activeRideIdRef.current || '')) return;
      if (payload.status === 'accepted' || payload.liveStatus === 'accepted') {
        const activeRide = await hydrateAcceptedRide().catch(() => null);
        moveToTracking({acceptedDriver: activeRide?.driver || driverRef.current, rideId: payload.rideId, rideSnapshot: activeRide || payload});
      }
    };
    const onRideCancelled = ({reason}) => {
      setStatus(reason === 'No drivers accepted the ride request' ? 'No drivers available nearby' : reason || 'No drivers accepted the ride request.');
      setStage('searching');
    };
    const onError = ({message}) => setStatus(message || 'Could not request ride.');

    socketService.on('rideSearchUpdate', onRideSearchUpdate);
    socketService.on('rideAccepted', onRideAccepted);
    socketService.on('ride:state', onRideState);
    socketService.on('ride:status:updated', onRideStatusUpdated);
    socketService.on('rideCancelled', onRideCancelled);
    socketService.on('errorMessage', onError);

    (async () => {
      try {
        const userToken = await getLocalUserToken();
        if (!userToken) {
          navigation.replace('Login');
          return;
        }

        const requestPayload = {
          pickup: params.pickupCoords || [93.0167, 25.1667],
          drop: params.dropCoords || [93.0167, 25.1667],
          pickupAddress: params.pickup || '',
          dropAddress: params.drop || '',
          fare: params.baseFare || params.fare || params.vehicle?.price || 22,
          estimatedDistanceMeters: params.estimatedDistanceMeters || 0,
          estimatedDurationMinutes: params.estimatedDurationMinutes || 0,
          vehicleTypeId: params.vehicleTypeId,
          vehicleTypeIds: params.vehicleTypeId ? [params.vehicleTypeId] : [],
          vehicleIconType: params.vehicleIconType || params.vehicle?.iconType,
          vehicleIconUrl: params.vehicleIconUrl || params.vehicle?.vehicleIconUrl || params.vehicle?.icon || '',
          paymentMethod: params.paymentMethod || 'Cash',
          serviceType: params.serviceType || 'ride',
          intercity: params.intercity || undefined,
          promo_code: params.promo_code || '',
          zone_id: params.zone_id || params.zoneId || '',
          service_location_id: params.service_location_id || params.serviceLocationId || '',
          transport_type: params.transport_type || params.transportType || params.vehicle?.transportType || 'taxi',
          scheduledAt: params.scheduledAt || null,
        };

        const response = await api.post('/rides', requestPayload, {timeout: 15000});
        if (disposedRef.current) return;

        const payload = response?.data || response;
        const ride = payload?.data?.ride || payload?.ride || payload;
        const rideId = String(ride?._id || ride?.id || payload?.realtime?.rideId || '');
        activeRideIdRef.current = rideId;

        const socket = await socketService.connect({role: 'user', token: userToken});
        if (socket && rideId) {
          socketService.emit('joinRide', {rideId});
          socketService.emit('ride:join', {rideId});
        }

        const pollActiveRide = async () => {
          if (disposedRef.current) return;
          try {
            const activeRide = await hydrateAcceptedRide();
            if (disposedRef.current || !activeRide) return;
            const isThisRide = String(activeRide.rideId || '') === rideId;
            const isAccepted = ['accepted', 'arriving', 'started', 'ongoing'].includes(String(activeRide.status || activeRide.liveStatus || '').toLowerCase());
            if (isThisRide && isAccepted) {
              moveToTracking({acceptedDriver: activeRide.driver || driverRef.current, rideId: activeRide.rideId, rideSnapshot: activeRide});
            }
          } catch {
            // socket remains the primary path; polling is only a fallback
          }
        };

        pollStartTimeoutRef.current = setTimeout(() => {
          if (disposedRef.current || trackingStartedRef.current) return;
          pollActiveRide();
          pollIntervalRef.current = setInterval(pollActiveRide, FALLBACK_POLL_INTERVAL_MS);
        }, FALLBACK_POLL_DELAY_MS);

        if (!disposedRef.current) setStatus('Booking created. Notifying nearby drivers...');
      } catch (error) {
        if (disposedRef.current) return;
        const errorMessage = error?.error || error?.message || error?.response?.data?.message || 'Network error or server down';
        const isNoDrivers = errorMessage.toLowerCase().includes('no driver') || errorMessage.toLowerCase().includes('not available');
        setStatus(isNoDrivers ? 'No drivers available nearby' : errorMessage);
        if (!isNoDrivers) {
          setTimeout(() => {
            if (!disposedRef.current) navigation.navigate('TaxiHome');
          }, 3000);
        }
      }
    })();

    return () => {
      disposedRef.current = true;
      clearTimeout(timerRef.current);
      clearTimeout(pollStartTimeoutRef.current);
      clearInterval(pollIntervalRef.current);
      socketService.off('rideSearchUpdate', onRideSearchUpdate);
      socketService.off('rideAccepted', onRideAccepted);
      socketService.off('ride:state', onRideState);
      socketService.off('ride:status:updated', onRideStatusUpdated);
      socketService.off('rideCancelled', onRideCancelled);
      socketService.off('errorMessage', onError);
    };
  }, [hydrateAcceptedRide, moveToTracking, navigation, params]);

  const vehicleLabel = useMemo(() => params.vehicle?.name || 'ride', [params.vehicle]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row justify-end px-4 py-3">
        <Pressable onPress={handleCancel} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
          <X size={18} color="#475569" />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <View className="w-24 h-24 rounded-full bg-amber-50 items-center justify-center mb-6">
          {stage === 'accepted' ? <Car size={36} color="#059669" /> : <VehicleIcon name={vehicleIconType} size={36} color="#d97706" />}
        </View>
        {stage === 'searching' && <ActivityIndicator className="mb-4" />}
        <Text className="text-base font-extrabold text-slate-900 text-center">
          {stage === 'accepted' ? 'Captain is on the way!' : `Looking for a ${vehicleLabel}...`}
        </Text>
        <Text className="text-[13px] text-slate-500 text-center mt-2">{status}</Text>
      </View>

      {stage === 'searching' && (
        <View className="px-4 py-4">
          <Pressable onPress={handleCancel} className="border border-rose-200 rounded-xl py-3.5 items-center">
            <Text className="text-rose-600 font-bold text-sm">Cancel search</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
