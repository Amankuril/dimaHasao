import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import { useLocation, useNavigate } from '../../lib/webRouter';
import { socketService } from '../api/socket';
import api from '../api/client';
import { computeDrivingRoute } from '../shared/utils/googleRoutes';
import { HAS_VALID_GOOGLE_MAPS_KEY } from '../shared/utils/googleMaps';
import { getLocalDriverToken } from '../services/registrationService';
import {
  ACTIVE_TRIP_HYDRATION_RETRY_DELAYS_MS, ARRIVAL_RADIUS_METERS, DEFAULT_CENTER, DEFAULT_DRIVER_COORDS,
  DRIVER_LOCATION_EMIT_MIN_DISTANCE_METERS, DRIVER_LOCATION_EMIT_MIN_INTERVAL_MS, ROUTE_OFF_PATH_METERS, ROUTE_REFRESH_DEBOUNCE_MS,
  arePathsEquivalent, arePositionsNearlyEqual, buildDriverPaymentCollection, buildFallbackRoute, buildPersistedTripState,
  calculateBearing, cleanPhoneNumber, clearStoredActiveTripSnapshot, clearStoredTripPhase, clearStoredTripUiState,
  computeCommissionSummary, createOffsetPosition, formatAddressFromPoint, formatDistanceLabel, formatDurationLabel,
  getActiveTripVehicleIcon, getAreaName, getDistanceMeters, getJobRideId, getRouteCacheKey, getRouteHeading, getSimulationPath,
  hexToRgba, isSnapshotForRide, normalizeHeading, parseFareAmount, readCoordinatePair, readStoredActiveTripSnapshot,
  readStoredDriverCoords, readStoredTripUiState, resolvePhaseFromJob, simplifyRoutePath, toLatLng, trimRoutePathFromPosition,
  unwrapApiPayload, withDriverAuthorization, writeStoredActiveTripSnapshot, writeStoredTripPhase, writeStoredTripUiState,
} from '../utils/activeTripHelpers';

// Web: the ActiveTrip component body (Taxi/modules/driver/pages/ActiveTrip.jsx), state / effects / handlers unchanged.
// The screen and its map / phase sheets render what this returns.

// Web: getCurrentCoords() on navigator.geolocation.
const getCurrentCoords = async () => {
  const permission = await Location.requestForegroundPermissionsAsync().catch(() => null);
  if (!permission || permission.status !== 'granted') {
    throw new Error('Please allow location permission to continue tracking.');
  }
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    throw new Error('Please allow location permission to continue tracking.');
  }
};

export function useActiveTrip() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = useMemo(() => location.state || {}, [location.state]);
  const routeRideId = routeState?.rideId || routeState?.request?.rideId || '';
  const storedActiveTripSnapshot = useMemo(() => {
      const snapshot = readStoredActiveTripSnapshot();
      return isSnapshotForRide(snapshot, routeRideId) ? snapshot : null;
  }, [routeRideId]);
  const [hydratedTripState, setHydratedTripState] = useState(() => storedActiveTripSnapshot);
  // Was keyed on the route carrying the ride PIN, which drivers are no longer sent.
  const routeHasTripState = Boolean(routeState?.request?.raw || routeState?.request);
  const [isHydratingTrip, setIsHydratingTrip] = useState(!routeRideId || !routeHasTripState);
  const exitToDriverHome = useCallback((statusMessage = '') => {
      if (routeRideId) {
          clearStoredTripPhase(routeRideId);
          clearStoredTripUiState(routeRideId);
      }
      clearStoredActiveTripSnapshot();

      navigate('/taxi/driver/home', {
          replace: true,
          state: statusMessage ? { statusMessage } : undefined,
      });
  }, [navigate, routeRideId]);

  useEffect(() => {
      let active = true;
      const hasRestorableRouteState = Boolean(routeRideId && routeHasTripState);

      if (hasRestorableRouteState) {
          setIsHydratingTrip(false);
      }

      const hydrateTripState = async () => {
          let lastRestoreError = '';
          let restoredActiveTrip = false;

          try {
              for (let attemptIndex = 0; attemptIndex < ACTIVE_TRIP_HYDRATION_RETRY_DELAYS_MS.length; attemptIndex += 1) {
                  const delayMs = ACTIVE_TRIP_HYDRATION_RETRY_DELAYS_MS[attemptIndex];

                  if (delayMs > 0) {
                      await new Promise((resolve) => setTimeout(resolve, delayMs));
                  }

                  if (!active) {
                      return;
                  }

                  const driverToken = getLocalDriverToken();
                  const [activeRide] = await Promise.allSettled([
                      api.get('/rides/active/me', withDriverAuthorization(driverToken)),
                  ]);

                  if (!active) {
                      return;
                  }

                  const ridePayload =
                      activeRide.status === 'fulfilled' ? unwrapApiPayload(activeRide.value) : null;

                  const currentJob = getJobRideId(ridePayload) ? ridePayload : null;
                  const currentRideId = getJobRideId(currentJob);
                  const currentStatus = String(currentJob?.liveStatus || currentJob?.status || '').toLowerCase();

                  if (currentRideId && currentStatus !== 'cancelled' && currentStatus !== 'canceled') {
                      const restoredPhase = resolvePhaseFromJob(currentJob);
                      const nextPersistedState = buildPersistedTripState(currentJob, {
                          phase: restoredPhase,
                      });

                      setHydratedTripState(nextPersistedState);
                      writeStoredActiveTripSnapshot(nextPersistedState);
                      setPhase(restoredPhase);
                      restoredActiveTrip = true;
                      return;
                  }

                  if (currentRideId && (currentStatus === 'cancelled' || currentStatus === 'canceled')) {
                      lastRestoreError = 'Ride was cancelled or is no longer active.';
                      break;
                  }
              }
          } catch {
              lastRestoreError = 'Could not restore active trip.';
          } finally {
              if (active) {
                  const fallbackSnapshot = readStoredActiveTripSnapshot();
                  const matchingFallbackSnapshot = isSnapshotForRide(fallbackSnapshot, routeRideId)
                      ? fallbackSnapshot
                      : null;
                  if (restoredActiveTrip) {
                      setIsHydratingTrip(false);
                      return;
                  }

                  if (matchingFallbackSnapshot) {
                      setHydratedTripState(matchingFallbackSnapshot);
                      setPhase(resolvePhaseFromJob(matchingFallbackSnapshot?.request?.raw || matchingFallbackSnapshot));
                  } else if (lastRestoreError) {
                      exitToDriverHome(lastRestoreError);
                  } else {
                      exitToDriverHome('Ride was cancelled or is no longer active.');
                  }

                  setIsHydratingTrip(false);
              }
          }
      };

      hydrateTripState();

      return () => {
          active = false;
      };
  }, [exitToDriverHome, routeHasTripState, routeRideId]);

  const effectiveState = hydratedTripState || routeState;

  const tripType = effectiveState?.type || 'ride';
  const isParcel = tripType === 'parcel';
  const liveRequest = effectiveState?.request || {};
  const liveRaw = liveRequest.raw || {};
  const rideId = getJobRideId(liveRequest) || getJobRideId(effectiveState);
  const [resolvedPickupCoords, setResolvedPickupCoords] = useState(null);
  const [resolvedDropCoords, setResolvedDropCoords] = useState(null);
  const vehicleIconUrl = getActiveTripVehicleIcon(
      {
          ...effectiveState,
          ...liveRequest,
          ...liveRaw,
          vehicle: liveRaw?.vehicle || liveRequest?.vehicle || effectiveState?.vehicle || null,
      },
      liveRaw?.driver || liveRequest?.raw?.driver || liveRequest?.driver || effectiveState?.driver || {},
  );

  const pickupAddressLabel = String(
      liveRaw?.pickupAddress ||
      liveRequest?.pickup ||
      effectiveState?.request?.pickup ||
      effectiveState?.pickupAddress ||
      '',
  ).trim();
  const dropAddressLabel = String(
      liveRaw?.dropAddress ||
      liveRequest?.drop ||
      effectiveState?.request?.drop ||
      effectiveState?.dropAddress ||
      '',
  ).trim();

  const pickupCoords = useMemo(
      () => readCoordinatePair(
          liveRaw?.pickup,
          liveRaw?.pickupLocation,
          liveRequest?.pickup,
          liveRequest?.pickupLocation,
          liveRequest?.raw?.pickup,
          liveRequest?.raw?.pickupLocation,
          effectiveState?.pickup,
          effectiveState?.pickupLocation,
          effectiveState?.request?.raw?.pickup,
          effectiveState?.request?.raw?.pickupLocation,
          effectiveState?.pickupCoords,
      ) || resolvedPickupCoords || DEFAULT_DRIVER_COORDS,
      [
          effectiveState?.pickup,
          effectiveState?.pickupCoords,
          effectiveState?.pickupLocation,
          effectiveState?.request?.raw?.pickup,
          effectiveState?.request?.raw?.pickupLocation,
          liveRaw?.pickup,
          liveRaw?.pickupLocation,
          liveRequest?.pickup,
          liveRequest?.pickupLocation,
          liveRequest?.raw?.pickup,
          liveRequest?.raw?.pickupLocation,
          resolvedPickupCoords,
      ],
  );
  const dropCoords = useMemo(
      () => readCoordinatePair(
          liveRaw?.drop,
          liveRaw?.dropLocation,
          liveRequest?.drop,
          liveRequest?.dropLocation,
          liveRequest?.raw?.drop,
          liveRequest?.raw?.dropLocation,
          effectiveState?.drop,
          effectiveState?.dropLocation,
          effectiveState?.request?.raw?.drop,
          effectiveState?.request?.raw?.dropLocation,
          effectiveState?.dropCoords,
      ) || resolvedDropCoords || [75.8937, 22.7533],
      [effectiveState?.drop, effectiveState?.dropCoords, effectiveState?.dropLocation, effectiveState?.request?.raw?.drop, effectiveState?.request?.raw?.dropLocation, liveRaw?.drop, liveRaw?.dropLocation, liveRequest?.drop, liveRequest?.dropLocation, liveRequest?.raw?.drop, liveRequest?.raw?.dropLocation, resolvedDropCoords],
  );
  const assignedDriverCoords = readCoordinatePair(
      liveRaw?.driverLocation,
      liveRequest?.driverLocation,
      effectiveState?.driverCoords,
      effectiveState?.currentDriverCoords,
      readStoredDriverCoords(),
  );

  const pickupPosition = useMemo(() => toLatLng(pickupCoords), [pickupCoords]);
  const dropPosition = useMemo(() => toLatLng(dropCoords), [dropCoords]);
  const initialDriverPosition = useMemo(
      () => assignedDriverCoords ? toLatLng(assignedDriverCoords, pickupPosition) : createOffsetPosition(pickupPosition),
      [assignedDriverCoords, pickupPosition],
  );

  const [phase, setPhase] = useState(() => {
      const initialState = isSnapshotForRide(storedActiveTripSnapshot, routeRideId)
          ? storedActiveTripSnapshot
          : routeState;
      const initialJob = initialState?.request?.raw || initialState?.request || initialState || {};

      return resolvePhaseFromJob({
          ...initialJob,
          rideId: routeRideId || getJobRideId(initialState?.request || initialState),
          phase: initialState?.phase || initialJob?.phase || '',
      });
  });
  const [otp, setOtp] = useState(['', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [selectedRating, setSelectedRating] = useState(0);
  const [driverPaymentStatus, setDriverPaymentStatus] = useState('pending');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('');
  const [paymentQr, setPaymentQr] = useState(null);
  const [paymentQrError, setPaymentQrError] = useState('');
  const [isGeneratingPaymentQr, setIsGeneratingPaymentQr] = useState(false);
  const [qrZoomed, setQrZoomed] = useState(true);
  const [arrivalGuardError, setArrivalGuardError] = useState('');
  const [localArrivedAt, setLocalArrivedAt] = useState('');
  const [waitingNow, setWaitingNow] = useState(() => Date.now());
  const [map, setMap] = useState(null);
  const mapViewRef = useRef(null);
  const otpInputRefs = useRef([]);
  const [driverPosition, setDriverPosition] = useState(initialDriverPosition);
  const [driverHeading, setDriverHeading] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [routeError, setRouteError] = useState('');
  const [isSimulationEnabled, setIsSimulationEnabled] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  // Web: useBaseGoogleMapsLoader(); with a Maps key the native map is always ready, without one the web never loads.
  const isLoaded = HAS_VALID_GOOGLE_MAPS_KEY;
  const simulationPathRef = useRef([]);
  const simulationTimerRef = useRef(null);
  const isSimulationEnabledRef = useRef(false);
  const routeCacheRef = useRef(new Map());
  const hasResolvedLivePositionRef = useRef(false);
  const hasHydratedUiStateRef = useRef(false);
  const mapFrameKeyRef = useRef('');
  const lastRouteRefreshAtRef = useRef(0);
  const routeTrimStateRef = useRef({ distanceMeters: Number.POSITIVE_INFINITY, shouldRefresh: false });
  const lastDriverLocationEmitRef = useRef({
      position: null,
      emittedAt: 0,
  });
  const previousDestinationRef = useRef(null);

  const activeDestination = useMemo(
      () => (phase === 'to_pickup' || phase === 'otp_verification' ? pickupPosition : dropPosition),
      [dropPosition, phase, pickupPosition],
  );
  const pickupDistanceMeters = useMemo(
      () => getDistanceMeters(driverPosition, pickupPosition),
      [driverPosition, pickupPosition],
  );
  const dropDistanceMeters = useMemo(
      () => getDistanceMeters(driverPosition, dropPosition),
      [driverPosition, dropPosition],
  );
  const riderDistanceLabel = useMemo(
      () => formatDistanceLabel(pickupDistanceMeters),
      [pickupDistanceMeters],
  );

  useEffect(() => {
      const currentStatus = String(
          liveRaw?.liveStatus ||
          liveRaw?.status ||
          liveRequest?.liveStatus ||
          liveRequest?.status ||
          effectiveState?.liveStatus ||
          effectiveState?.status ||
          '',
      ).toLowerCase();

      if (currentStatus === 'cancelled' || currentStatus === 'canceled' || phase === 'cancelled') {
          exitToDriverHome('Ride was cancelled by the user.');
      }
  }, [effectiveState?.liveStatus, effectiveState?.status, exitToDriverHome, liveRaw?.liveStatus, liveRaw?.status, liveRequest?.liveStatus, liveRequest?.status, phase]);

  useEffect(() => {
      const currentRideId = rideId || routeRideId;

      if (!currentRideId) {
          return undefined;
      }

      const socket = socketService.connect({ role: 'driver' });
      const onSocketConnect = () => {
          socketService.emit('ride:join', { rideId: currentRideId });
      };
      if (socket) {
          socketService.emit('ride:join', { rideId: currentRideId });
          socket.on('connect', onSocketConnect);
      }

      const handleTripClosed = (payload = {}) => {
          if (String(payload.rideId || '') !== String(currentRideId)) {
              return;
          }

          const closeReason = String(payload.reason || '').toLowerCase();
          if (closeReason === 'accepted-by-another-driver') {
              return;
          }

          clearStoredTripPhase(currentRideId);
          clearStoredTripUiState(currentRideId);
          exitToDriverHome(payload.message || 'Ride was cancelled by the user.');
      };

      const handleRideStatusUpdated = (payload = {}) => {
          if (String(payload.rideId || '') !== String(currentRideId)) {
              return;
          }

          const nextStatus = String(payload.liveStatus || payload.status || '').toLowerCase();
          if (nextStatus === 'cancelled' || nextStatus === 'canceled') {
              clearStoredTripPhase(currentRideId);
              clearStoredTripUiState(currentRideId);
              exitToDriverHome('Ride was cancelled by the user.');
          }
      };

      const handleRideState = (payload) => {
          if (!payload) {
              clearStoredTripPhase(currentRideId);
              clearStoredTripUiState(currentRideId);
              exitToDriverHome('Ride was cancelled or is no longer active.');
              return;
          }

          if (String(payload.rideId || payload._id || '') !== String(currentRideId)) {
              return;
          }

          const nextStatus = String(payload.liveStatus || payload.status || '').toLowerCase();
          if (nextStatus === 'cancelled' || nextStatus === 'canceled') {
              clearStoredTripPhase(currentRideId);
              clearStoredTripUiState(currentRideId);
              exitToDriverHome('Ride was cancelled by the user.');
          }
      };

      socketService.on('rideRequestClosed', handleTripClosed);
      socketService.on('rideCancelled', handleTripClosed);
      socketService.on('ride:status:updated', handleRideStatusUpdated);
      socketService.on('ride:state', handleRideState);

      return () => {
          socketService.off('rideRequestClosed', handleTripClosed);
          socketService.off('rideCancelled', handleTripClosed);
          socketService.off('ride:status:updated', handleRideStatusUpdated);
          socketService.off('ride:state', handleRideState);
          if (socket) {
              socket.off('connect', onSocketConnect);
          }
      };
  }, [exitToDriverHome, rideId, routeRideId]);

  useEffect(() => {
      if (!rideId) {
          return;
      }

      writeStoredTripPhase(rideId, phase);
  }, [phase, rideId]);

  useEffect(() => {
      if (!rideId || hasHydratedUiStateRef.current) {
          return;
      }

      const storedUiState = readStoredTripUiState(rideId);
      hasHydratedUiStateRef.current = true;

      if (!storedUiState) {
          return;
      }

      if (typeof storedUiState.selectedPaymentMode === 'string') {
          setSelectedPaymentMode(storedUiState.selectedPaymentMode);
      }

      if (typeof storedUiState.driverPaymentStatus === 'string') {
          setDriverPaymentStatus(storedUiState.driverPaymentStatus);
      }

      if (storedUiState.paymentQr && typeof storedUiState.paymentQr === 'object') {
          setPaymentQr(storedUiState.paymentQr);
      }

      if (typeof storedUiState.paymentQrError === 'string') {
          setPaymentQrError(storedUiState.paymentQrError);
      }

      if (typeof storedUiState.selectedRating === 'number') {
          setSelectedRating(storedUiState.selectedRating);
      }

      if (typeof storedUiState.localArrivedAt === 'string') {
          setLocalArrivedAt(storedUiState.localArrivedAt);
      }
  }, [rideId]);

  useEffect(() => {
      if (!rideId || !hasHydratedUiStateRef.current) {
          return;
      }

      writeStoredTripUiState(rideId, {
          selectedPaymentMode,
          driverPaymentStatus,
          paymentQr,
          paymentQrError,
          selectedRating,
          localArrivedAt,
      });
  }, [driverPaymentStatus, localArrivedAt, paymentQr, paymentQrError, rideId, selectedPaymentMode, selectedRating]);

  useEffect(() => {
      if (!rideId || !effectiveState) {
          return;
      }

      const rawJob = liveRaw?.rideId || liveRaw?._id || liveRaw?.id
          ? liveRaw
          : liveRequest?.rideId || liveRequest?._id || liveRequest?.id
              ? liveRequest?.raw || liveRequest
              : effectiveState?.request?.raw || effectiveState;

      const derivedLiveStatus =
          phase === 'otp_verification'
              ? 'arriving'
              : phase === 'in_trip'
                  ? 'started'
                  : phase === 'payment_confirm'
                      ? 'arrived'
                      : phase === 'review'
                          ? 'completed'
                          : rawJob?.liveStatus || rawJob?.status || 'accepted';
      const derivedStatus =
          phase === 'in_trip' || phase === 'payment_confirm'
              ? 'ongoing'
              : phase === 'review'
                  ? 'completed'
                  : rawJob?.status || derivedLiveStatus;
      const nextPersistedState = buildPersistedTripState(rawJob, {
          phase,
          liveStatus: derivedLiveStatus,
          status: derivedStatus,
          arrivedAt: phase === 'otp_verification' ? (localArrivedAt || rawJob?.arrivedAt || '') : '',
      });
      if (nextPersistedState) {
          writeStoredActiveTripSnapshot(nextPersistedState);
      }
  }, [effectiveState, liveRaw, liveRequest, localArrivedAt, phase, rideId]);

  useEffect(() => {
      if (!rideId || hydratedTripState) {
          return;
      }

      const routeJob = liveRaw?.rideId || liveRaw?._id || liveRaw?.id
          ? liveRaw
          : liveRequest?.rideId || liveRequest?._id || liveRequest?.id
              ? liveRequest
              : effectiveState;

      const restoredPhase = resolvePhaseFromJob({
          ...routeJob,
          rideId,
      });

      setPhase((current) => (current === 'to_pickup' ? restoredPhase : current));
  }, [effectiveState, hydratedTripState, liveRaw, liveRequest, rideId]);

  useEffect(() => {
      setResolvedPickupCoords(null);
      setResolvedDropCoords(null);
  }, [rideId]);

  useEffect(() => {
      if (!isLoaded) {
          return;
      }

      let active = true;

      const resolveAddressCoords = (address, setter) => {
          const trimmedAddress = String(address || '').trim();

          if (!trimmedAddress) {
              return;
          }

          // Web: google.maps.Geocoder; native: the platform geocoder.
          Location.geocodeAsync(trimmedAddress)
              .then((results) => {
                  if (!active || !results?.[0]) {
                      return;
                  }

                  setter([results[0].longitude, results[0].latitude]);
              })
              .catch(() => {});
      };

      if (!readCoordinatePair(
          liveRaw?.pickup,
          liveRaw?.pickupLocation,
          liveRequest?.pickup,
          liveRequest?.pickupLocation,
          liveRequest?.raw?.pickup,
          liveRequest?.raw?.pickupLocation,
          effectiveState?.pickup,
          effectiveState?.pickupLocation,
          effectiveState?.request?.raw?.pickup,
          effectiveState?.request?.raw?.pickupLocation,
          effectiveState?.pickupCoords,
      ) && pickupAddressLabel) {
          resolveAddressCoords(pickupAddressLabel, setResolvedPickupCoords);
      }

      if (!readCoordinatePair(
          liveRaw?.drop,
          liveRaw?.dropLocation,
          liveRequest?.drop,
          liveRequest?.dropLocation,
          liveRequest?.raw?.drop,
          liveRequest?.raw?.dropLocation,
          effectiveState?.drop,
          effectiveState?.dropLocation,
          effectiveState?.request?.raw?.drop,
          effectiveState?.request?.raw?.dropLocation,
          effectiveState?.dropCoords,
      ) && dropAddressLabel) {
          resolveAddressCoords(dropAddressLabel, setResolvedDropCoords);
      }

      return () => {
          active = false;
      };
  }, [
      dropAddressLabel,
      effectiveState?.dropCoords,
      effectiveState?.drop,
      effectiveState?.dropLocation,
      effectiveState?.pickup,
      effectiveState?.pickupCoords,
      effectiveState?.pickupLocation,
      effectiveState?.request?.raw?.drop,
      effectiveState?.request?.raw?.dropLocation,
      effectiveState?.request?.raw?.pickup,
      effectiveState?.request?.raw?.pickupLocation,
      isLoaded,
      liveRaw?.drop,
      liveRaw?.dropLocation,
      liveRaw?.pickup,
      liveRaw?.pickupLocation,
      liveRequest?.drop,
      liveRequest?.dropLocation,
      liveRequest?.pickup,
      liveRequest?.pickupLocation,
      liveRequest?.raw?.drop,
      liveRequest?.raw?.dropLocation,
      liveRequest?.raw?.pickup,
      liveRequest?.raw?.pickupLocation,
      pickupAddressLabel,
  ]);

  const tripData = isParcel ? {
      sender: {
          name: liveRaw.parcel?.senderName || 'Sender',
          rating: '5.0',
          phone: liveRaw.parcel?.senderMobile || '',
      },
      receiver: {
          name: liveRaw.parcel?.receiverName || 'Receiver',
          phone: liveRaw.parcel?.receiverMobile || '',
      },
      pickup: getAreaName(liveRaw.pickupAddress || liveRequest?.pickup, formatAddressFromPoint(liveRaw.pickupLocation, 'Pickup area')),
      drop: getAreaName(liveRaw.dropAddress || liveRequest?.drop, formatAddressFromPoint(liveRaw.dropLocation, 'Drop area')),
      fare: `Rs ${liveRaw.fare || effectiveState?.fare || 120}`,
      payment: effectiveState?.paymentMethod || 'Online'
  } : {
      user: {
          name: liveRaw.user?.name || liveRequest?.user?.name || 'Passenger',
          rating: liveRaw.user?.rating || liveRequest?.user?.rating || '4.8',
          phone: liveRaw.user?.phone || liveRequest?.user?.phone || '',
      },
      pickup: getAreaName(liveRaw.pickupAddress || liveRequest?.pickup, formatAddressFromPoint(liveRaw.pickupLocation, 'Pickup area')),
      drop: getAreaName(liveRaw.dropAddress || liveRequest?.drop, formatAddressFromPoint(liveRaw.dropLocation, 'Drop area')),
      fare: `Rs ${liveRaw.fare || effectiveState?.fare || 120}`,
      payment: liveRequest?.payment || effectiveState?.paymentMethod || 'Online'
  };

  const displayFare = liveRequest?.fare || tripData.fare;
  const fareAmount = parseFareAmount(displayFare);
  const waitingPricing = liveRaw?.pricingSnapshot || liveRequest?.raw?.pricingSnapshot || effectiveState?.pricingSnapshot || {};
  const allowedPaymentModes = (() => {
      const rawItems = Array.isArray(waitingPricing?.allowed_payment_methods) ? waitingPricing.allowed_payment_methods : [];
      const normalized = [...new Set(
          rawItems
              .map((item) => String(item || '').trim().toLowerCase())
              .filter((item) => item === 'cash' || item === 'online')
      )];

      return normalized.length ? normalized : ['cash', 'online'];
  })();
  const waitingChargePerMinute = Math.max(0, Number(waitingPricing?.waiting_charge ?? 0));
  const freeWaitingBeforeMinutes = Math.max(0, Number(waitingPricing?.free_waiting_before ?? 0));
  const waitingStartedAt = localArrivedAt || liveRaw?.arrivedAt || liveRequest?.raw?.arrivedAt || effectiveState?.arrivedAt || '';
  const waitingElapsedSeconds = waitingStartedAt
      ? Math.max(0, Math.floor((waitingNow - new Date(waitingStartedAt).getTime()) / 1000))
      : 0;
  const freeWaitingRemainingSeconds = Math.max(0, freeWaitingBeforeMinutes * 60 - waitingElapsedSeconds);
  const waitingChargeableMinutes = Math.max(0, Math.ceil(waitingElapsedSeconds / 60) - freeWaitingBeforeMinutes);
  const canMarkArrived = pickupDistanceMeters <= ARRIVAL_RADIUS_METERS;
  const canDeliverParcel = dropDistanceMeters <= ARRIVAL_RADIUS_METERS;
  const isWaitingForOtp = phase === 'otp_verification' && Boolean(waitingStartedAt);
  const pickupContact = isParcel ? tripData.sender : tripData.user;
  const destinationContact = isParcel ? tripData.receiver : tripData.user;
  const tripStartedAt = liveRaw?.startedAt || liveRequest?.raw?.startedAt || effectiveState?.startedAt || '';
  const tripArrivedAt = localArrivedAt || liveRaw?.arrivedAt || liveRequest?.raw?.arrivedAt || effectiveState?.arrivedAt || '';
  // eslint-disable-next-line react-hooks/purity
  const tripDurationLabel = formatDurationLabel(tripStartedAt, tripArrivedAt || Date.now());
  const tripSummaryTitle = isParcel ? 'Delivery Summary' : 'Ride Summary';
  const tripSummarySubtitle = isParcel ? 'Review the delivery details before you close the order.' : 'Review the trip details before you close the ride.';
  const destinationRoleLabel = isParcel ? 'Receiver' : 'Rider';
  const paymentModeLabel = selectedPaymentMode
      ? (selectedPaymentMode === 'cash' ? 'Cash' : 'Online')
      : (effectiveState?.paymentMethod || liveRequest?.payment || tripData.payment || 'Pending');
  const commissionSummary = computeCommissionSummary({
      fare: fareAmount,
      pricingSnapshot: waitingPricing,
      explicitCommissionAmount: liveRaw?.commissionAmount ?? effectiveState?.commissionAmount,
      explicitDriverEarnings: liveRaw?.driverEarnings ?? effectiveState?.driverEarnings,
  });
  const paymentCollectionLabel = isParcel ? 'receiver' : 'rider';
  const routeStrokeColor = '#000000';
  const routeAccentSoft = hexToRgba(routeStrokeColor, 0.08);
  const routeAccentMuted = hexToRgba(routeStrokeColor, 0.18);
  const routeAccentBorder = hexToRgba(routeStrokeColor, 0.18);
  const simulationTotalSteps = Math.max(0, simulationPathRef.current.length - 1);
  const simulationProgress = simulationTotalSteps > 0
      ? Math.min(100, Math.round((simulationStep / simulationTotalSteps) * 100))
      : 0;
  const displayDriverHeading = useMemo(() => {
      if (Number.isFinite(Number(driverHeading))) {
          return normalizeHeading(driverHeading);
      }

      return getRouteHeading(
          driverPosition,
          routePath,
          calculateBearing(driverPosition, activeDestination),
      );
  }, [activeDestination, driverHeading, driverPosition, routePath]);
  const displayDriverHeadingRef = useRef(displayDriverHeading);

  const callContact = (phone) => {
      const cleanPhone = cleanPhoneNumber(phone);

      if (!cleanPhone) {
          Alert.alert('', 'Phone number is not available for this trip yet.');
          return;
      }

      Linking.openURL(`tel:${cleanPhone}`).catch(() => {});
  };

  const openTripChat = () => {
      navigate('/taxi/driver/chat', {
          state: {
              rideId,
              peer: {
                  name: pickupContact?.name || 'Passenger',
                  phone: pickupContact?.phone || '',
                  subtitle: `${isParcel ? 'Sender' : 'Passenger'} - Active now`,
                  role: isParcel ? 'Sender' : 'Passenger',
              },
          },
      });
  };

  const openSupportChat = () => {
      navigate('/taxi/driver/support/chat', {
          state: {
              rideId,
              backPath: '/taxi/driver/active-trip',
              backState: {
                  ...effectiveState,
                  rideId,
              },
          },
      });
  };

  const triggerEmergencySos = () => {
      Linking.openURL('tel:112').catch(() => {});
  };

  const publishRideStatus = (nextStatus, paymentMode = '') => {
      if (!rideId) {
          return;
      }

      const driverPaymentCollection = nextStatus === 'completed'
          ? buildDriverPaymentCollection({
              mode: paymentMode || selectedPaymentMode,
              status: driverPaymentStatus,
              paymentQr,
          })
          : null;

      socketService.emit('ride:status:update', {
          rideId,
          status: nextStatus,
          paymentMethod: paymentMode || undefined,
          ...(driverPaymentCollection ? { driverPaymentCollection } : {}),
      });
  };

  const completeRideAndExit = async () => {
      const paymentMode = selectedPaymentMode || effectiveState?.paymentMethod || liveRequest?.payment || '';

      try {
          if (rideId) {
              const driverToken = getLocalDriverToken();
              await api.patch(
                  `/rides/${rideId}/status`,
                  {
                      status: 'completed',
                      paymentMethod: paymentMode || undefined,
                      driverPaymentCollection: buildDriverPaymentCollection({
                          mode: paymentMode,
                          status: driverPaymentStatus,
                          paymentQr,
                      }) || undefined,
                  },
                  withDriverAuthorization(driverToken),
              );
          }
      } catch {
          // Keep going with the socket publish so the trip can still complete in transient API failure cases.
      }

      publishRideStatus('completed', paymentMode);
      clearStoredTripPhase(rideId);
      clearStoredTripUiState(rideId);
      navigate('/taxi/driver/home');
  };

  const completeRideForUserSync = async (paymentMode = '') => {
      if (!rideId) {
          return;
      }

      try {
          const driverToken = getLocalDriverToken();
          await api.patch(
              `/rides/${rideId}/status`,
              {
                  status: 'completed',
                  paymentMethod: paymentMode || undefined,
                  driverPaymentCollection: buildDriverPaymentCollection({
                      mode: paymentMode,
                      status: driverPaymentStatus,
                      paymentQr,
                  }) || undefined,
              },
              withDriverAuthorization(driverToken),
          );
      } catch {
          // The socket publish below remains as a realtime fallback for the rider side.
      }

      publishRideStatus('completed', paymentMode);
  };

  useEffect(() => {
      if (!waitingStartedAt || phase !== 'otp_verification') {
          return undefined;
      }

      setWaitingNow(Date.now());
      const intervalId = setInterval(() => {
          setWaitingNow(Date.now());
      }, 1000);

      return () => clearInterval(intervalId);
  }, [phase, waitingStartedAt]);

  const publishDriverLocation = (position, heading = displayDriverHeading, { speed = null, force = false } = {}) => {
      if (!rideId || !position) {
          return;
      }

      const now = Date.now();
      const lastEmission = lastDriverLocationEmitRef.current;
      const movedDistance = getDistanceMeters(lastEmission.position, position);
      const shouldEmit = force ||
          !lastEmission.position ||
          movedDistance >= DRIVER_LOCATION_EMIT_MIN_DISTANCE_METERS ||
          now - Number(lastEmission.emittedAt || 0) >= DRIVER_LOCATION_EMIT_MIN_INTERVAL_MS;

      if (!shouldEmit) {
          return;
      }

      socketService.emit('ride:driver-location:update', {
          rideId,
          coordinates: [position.lng, position.lat],
          heading: normalizeHeading(heading),
          speed,
          simulated: isSimulationEnabledRef.current,
      });

      lastDriverLocationEmitRef.current = {
          position,
          emittedAt: now,
      };
  };

  const stopSimulationTimer = () => {
      if (simulationTimerRef.current) {
          clearInterval(simulationTimerRef.current);
          simulationTimerRef.current = null;
      }
  };

  const startSimulation = () => {
      const nextPath = getSimulationPath({
          routePath,
          from: driverPosition,
          to: activeDestination,
      });

      if (nextPath.length < 2) {
          return;
      }

      stopSimulationTimer();
      simulationPathRef.current = nextPath;
      const nextHeading = getRouteHeading(nextPath[0], nextPath.slice(1), displayDriverHeading);
      setSimulationStep(0);
      setIsSimulationEnabled(true);
      setIsSimulationRunning(true);
      setRoutePath(nextPath);
      setDriverPosition(nextPath[0]);
      setDriverHeading(nextHeading);
      publishDriverLocation(nextPath[0], nextHeading);
  };

  const pauseSimulation = () => {
      stopSimulationTimer();
      setIsSimulationRunning(false);
  };

  const resumeSimulation = () => {
      if (simulationPathRef.current.length < 2) {
          startSimulation();
          return;
      }

      setIsSimulationEnabled(true);
      setIsSimulationRunning(true);
  };

  const resetSimulation = () => {
      stopSimulationTimer();
      simulationPathRef.current = [];
      setIsSimulationEnabled(false);
      setIsSimulationRunning(false);
      setSimulationStep(0);
      setDriverPosition(initialDriverPosition);
      const nextHeading = calculateBearing(initialDriverPosition, activeDestination, displayDriverHeading);
      setDriverHeading(nextHeading);
      publishDriverLocation(initialDriverPosition, nextHeading);
  };

  const generatePaymentQr = async () => {
      if (!rideId || !fareAmount) {
          setPaymentQrError('Ride fare is missing.');
          return;
      }

      setIsGeneratingPaymentQr(true);
      setPaymentQrError('');
      setPaymentQr(null);

      try {
          const response = await api.post('/drivers/payments/qr', {
              rideId,
              amount: fareAmount,
          });
          const qr = response?.data?.data || response?.data || {};

          if (!qr.imageUrl) {
              throw new Error('Payment QR image was not returned.');
          }

          setPaymentQr(qr);
          setDriverPaymentStatus('qr_generated');
      } catch (error) {
          setDriverPaymentStatus('pending');
          setPaymentQrError(error?.response?.data?.message || error?.message || 'Could not generate payment QR.');
      } finally {
          setIsGeneratingPaymentQr(false);
      }
  };

  const refreshPaymentStatus = async () => {
      if (!rideId || !paymentQr?.id) {
          return;
      }

      try {
          const response = await api.get('/drivers/payments/qr/status', {
              params: { rideId },
          });
          const status = response?.data?.data || response?.data || {};

          if (status?.paid || ['paid', 'captured', 'completed'].includes(String(status?.status || '').toLowerCase())) {
              setPaymentQr((current) => ({
                  ...(current || paymentQr),
                  status: status.status,
                  paidAt: status.paidAt || Date.now(),
              }));
              setPaymentQrError('');
              setDriverPaymentStatus('success');
          }
      } catch (error) {
          const message = error?.response?.data?.message || error?.message || '';
          if (message) {
              setPaymentQrError(message);
          }
      }
  };

  const handlePaymentModeSelect = (modeId) => {
      setSelectedPaymentMode(modeId);

      if (modeId === 'online') {
          generatePaymentQr();
          return;
      }

      setPaymentQr(null);
      setPaymentQrError('');
      setDriverPaymentStatus('success');
  };

  useEffect(() => {
      if (driverPaymentStatus !== 'qr_generated' || !paymentQr?.id) {
          return undefined;
      }

      refreshPaymentStatus();
      const intervalId = setInterval(refreshPaymentStatus, 3000);

      return () => clearInterval(intervalId);
  }, [driverPaymentStatus, paymentQr?.id, rideId]);

  const startTripAfterOtp = async (enteredOtp) => {
      if (String(enteredOtp).length !== 4) {
          setOtpError('Enter the full 4 digit PIN.');
          return;
      }

      // The PIN is checked by the server now (it is no longer sent to the driver
      // app to compare against). Only move into the trip once the server agrees.
      if (!rideId) {
          setOtpError('Trip details are still loading. Try again in a moment.');
          return;
      }

      try {
          const driverToken = getLocalDriverToken();
          await api.patch(
              `/rides/${rideId}/status`,
              { status: 'started', otp: String(enteredOtp) },
              withDriverAuthorization(driverToken),
          );
      } catch (error) {
          setOtpError(error?.message && error?.status ? error.message : 'Could not verify the PIN. Check your connection and try again.');
          return;
      }

      setOtpError('');
      setLocalArrivedAt('');
      setPhase('in_trip');
      const startedAtIso = new Date().toISOString();
      const rawJobForSnapshot = liveRaw?.rideId || liveRaw?._id || liveRaw?.id
          ? liveRaw
          : liveRequest?.rideId || liveRequest?._id || liveRequest?.id
              ? liveRequest?.raw || liveRequest
              : effectiveState?.request?.raw || effectiveState;
      const optimisticSnapshot = buildPersistedTripState(rawJobForSnapshot, {
          phase: 'in_trip',
          liveStatus: 'started',
          status: 'ongoing',
          startedAt: startedAtIso,
          arrivedAt: '',
      });

      if (optimisticSnapshot) {
          writeStoredActiveTripSnapshot(optimisticSnapshot);
          setHydratedTripState(optimisticSnapshot);
      }

      publishRideStatus('started');
  };

  useEffect(() => {
      isSimulationEnabledRef.current = isSimulationEnabled;
  }, [isSimulationEnabled]);

  useEffect(() => {
      displayDriverHeadingRef.current = displayDriverHeading;
  }, [displayDriverHeading]);

  useEffect(() => {
      if (!isSimulationEnabled && !hasResolvedLivePositionRef.current) {
          setDriverPosition((currentPosition) =>
              arePositionsNearlyEqual(currentPosition, initialDriverPosition) ? currentPosition : initialDriverPosition,
          );
      }
  }, [initialDriverPosition, isSimulationEnabled]);

  useEffect(() => {
      let watchId = null;
      let cancelled = false;
      const socket = socketService.connect({ role: 'driver' });

      if (socket && rideId) {
          socketService.emit('ride:join', { rideId });
      }

      getCurrentCoords()
          .then((position) => {
              if (!cancelled && !isSimulationEnabledRef.current) {
                  hasResolvedLivePositionRef.current = true;
                  setDriverPosition((previousPosition) => {
                      const nextHeading = calculateBearing(previousPosition, position, displayDriverHeadingRef.current);
                      setDriverHeading(nextHeading);
                      publishDriverLocation(position, nextHeading, { force: true });
                      return position;
                  });
              }
          })
          .catch(() => {});

      const onWatchPosition = (pos) => {
          if (cancelled || isSimulationEnabledRef.current) {
              return;
          }

          const nextPosition = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
          };
          // The web's coords.heading / coords.speed are null when unknown; expo reports a negative number.
          const rawHeading = Number.isFinite(pos.coords.heading) && pos.coords.heading >= 0 ? pos.coords.heading : null;
          const rawSpeed = Number.isFinite(pos.coords.speed) && pos.coords.speed >= 0 ? pos.coords.speed : null;

          setDriverPosition((previousPosition) => {
              hasResolvedLivePositionRef.current = true;
              const nextHeading = normalizeHeading(
                  rawHeading,
                  calculateBearing(previousPosition, nextPosition, displayDriverHeadingRef.current),
              );
              setDriverHeading(nextHeading);
              if (rideId) {
                  publishDriverLocation(nextPosition, nextHeading, {
                      speed: rawSpeed,
                  });
              }
              return nextPosition;
          });
      };

      Location.getForegroundPermissionsAsync()
          .then((permission) => (permission.status === 'granted' ? permission : Location.requestForegroundPermissionsAsync()))
          .then((permission) => {
              if (cancelled || permission.status !== 'granted') {
                  return null;
              }

              return Location.watchPositionAsync(
                  { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
                  onWatchPosition,
              );
          })
          .then((subscription) => {
              if (!subscription) {
                  return;
              }

              if (cancelled) {
                  subscription.remove();
                  return;
              }

              watchId = subscription;
          })
          .catch(() => {});

      return () => {
          cancelled = true;
          if (watchId !== null) {
              watchId.remove();
          }
      };
  }, [rideId]);

  useEffect(() => {
      stopSimulationTimer();

      if (!isSimulationRunning || simulationPathRef.current.length < 2) {
          return undefined;
      }

      simulationTimerRef.current = setInterval(() => {
          setSimulationStep((currentStep) => {
              const nextStep = Math.min(currentStep + 1, simulationPathRef.current.length - 1);
              const previousPosition = simulationPathRef.current[currentStep];
              const nextPosition = simulationPathRef.current[nextStep];

              if (nextPosition) {
                  const nextHeading = calculateBearing(
                      previousPosition,
                      nextPosition,
                      getRouteHeading(nextPosition, simulationPathRef.current.slice(nextStep + 1), displayDriverHeadingRef.current),
                  );
                  setDriverPosition(nextPosition);
                  setDriverHeading(nextHeading);
                  setRoutePath(simulationPathRef.current.slice(nextStep));
                  publishDriverLocation(nextPosition, nextHeading);
                  map?.panTo(nextPosition);
              }

              if (nextStep >= simulationPathRef.current.length - 1) {
                  stopSimulationTimer();
                  setIsSimulationRunning(false);
              }

              return nextStep;
          });
      }, 750);

      return () => stopSimulationTimer();
  }, [isSimulationRunning, map, rideId]);

  useEffect(() => () => stopSimulationTimer(), []);

  useEffect(() => {
      const destinationChanged = !previousDestinationRef.current ||
          !arePositionsNearlyEqual(previousDestinationRef.current, activeDestination, 0.00001);
      previousDestinationRef.current = activeDestination;

      if (isSimulationEnabled && !destinationChanged) {
          return;
      }

      if (arePositionsNearlyEqual(driverPosition, activeDestination)) {
          const nextPath = [driverPosition];
          setRoutePath((currentPath) => (arePathsEquivalent(currentPath, nextPath) ? currentPath : nextPath));
          setRouteError('');
          routeTrimStateRef.current = { distanceMeters: 0, shouldRefresh: false };
          return;
      }

      if (routePath.length > 1 && !destinationChanged) {
          const trimmedRoute = trimRoutePathFromPosition(routePath, driverPosition);
          routeTrimStateRef.current = {
              distanceMeters: trimmedRoute.distanceMeters,
              shouldRefresh: trimmedRoute.distanceMeters > ROUTE_OFF_PATH_METERS,
          };

          if (!routeTrimStateRef.current.shouldRefresh && !arePathsEquivalent(routePath, trimmedRoute.path)) {
              setRoutePath(trimmedRoute.path);
          }

          if (!routeTrimStateRef.current.shouldRefresh) {
              setRouteError('');
              return;
          }
      }

      if (!isLoaded) {
          const fallbackRoute = buildFallbackRoute(driverPosition, activeDestination);
          setRoutePath(fallbackRoute);
          if (isSimulationEnabled && destinationChanged) {
              stopSimulationTimer();
              simulationPathRef.current = fallbackRoute;
              setSimulationStep(0);
              setDriverPosition(fallbackRoute[0]);
              const nextHeading = getRouteHeading(fallbackRoute[0], fallbackRoute.slice(1), displayDriverHeadingRef.current);
              setDriverHeading(nextHeading);
              publishDriverLocation(fallbackRoute[0], nextHeading);
              setIsSimulationRunning(true);
          }
          setRouteError('');
          return;
      }

      const now = Date.now();
      if (now - lastRouteRefreshAtRef.current < ROUTE_REFRESH_DEBOUNCE_MS) {
          return;
      }

      const routeCacheKey = getRouteCacheKey(driverPosition, activeDestination);
      const cachedRoute = routeCacheRef.current.get(routeCacheKey);
      if (cachedRoute) {
          if (!arePathsEquivalent(routePath, cachedRoute.routePath)) {
              setRoutePath(cachedRoute.routePath);
          }
          if (isSimulationEnabled && destinationChanged) {
              stopSimulationTimer();
              simulationPathRef.current = cachedRoute.routePath;
              setSimulationStep(0);
              setDriverPosition(cachedRoute.routePath[0]);
              const nextHeading = getRouteHeading(cachedRoute.routePath[0], cachedRoute.routePath.slice(1), displayDriverHeadingRef.current);
              setDriverHeading(nextHeading);
              publishDriverLocation(cachedRoute.routePath[0], nextHeading);
              setIsSimulationRunning(true);
          }
          setRouteError(cachedRoute.routeError);
          routeTrimStateRef.current = { distanceMeters: 0, shouldRefresh: false };
          return;
      }

      lastRouteRefreshAtRef.current = now;
      let active = true;
      void (async () => {
          const result = await computeDrivingRoute({
              origin: driverPosition,
              destination: activeDestination,
          });

          if (!active) {
              return;
          }

          if (result.status === 'OK' && result.path.length) {
              const nextPath = simplifyRoutePath(result.path);
              routeCacheRef.current.set(routeCacheKey, {
                  routePath: nextPath,
                  routeError: '',
              });
              setRoutePath(nextPath);
              
              if (isSimulationEnabled && destinationChanged) {
                  stopSimulationTimer();
                  simulationPathRef.current = nextPath;
                  setSimulationStep(0);
                  setDriverPosition(nextPath[0]);
                  const nextHeading = getRouteHeading(nextPath[0], nextPath.slice(1), displayDriverHeadingRef.current);
                  setDriverHeading(nextHeading);
                  publishDriverLocation(nextPath[0], nextHeading);
                  setIsSimulationRunning(true);
              }

              routeTrimStateRef.current = { distanceMeters: 0, shouldRefresh: false };
              setRouteError('');
              return;
          }

          const fallbackRoute = buildFallbackRoute(driverPosition, activeDestination);
          const nextRouteError = result.status || 'Directions unavailable';
          routeCacheRef.current.set(routeCacheKey, {
              routePath: fallbackRoute,
              routeError: nextRouteError,
          });
          setRoutePath(fallbackRoute);
          
          if (isSimulationEnabled && destinationChanged) {
              stopSimulationTimer();
              simulationPathRef.current = fallbackRoute;
              setSimulationStep(0);
              setDriverPosition(fallbackRoute[0]);
              const nextHeading = getRouteHeading(fallbackRoute[0], fallbackRoute.slice(1), displayDriverHeadingRef.current);
              setDriverHeading(nextHeading);
              publishDriverLocation(fallbackRoute[0], nextHeading);
              setIsSimulationRunning(true);
          }

          routeTrimStateRef.current = { distanceMeters: Number.POSITIVE_INFINITY, shouldRefresh: false };
          setRouteError(nextRouteError);
      })();

      return () => {
          active = false;
      };
  }, [activeDestination, driverPosition, isLoaded, isSimulationEnabled, routePath]);

  useEffect(() => {
      if (!map) {
          return;
      }

      if (isSimulationRunning) {
          map.panTo(driverPosition);
          return;
      }

      const frameKey = [
          phase,
          activeDestination?.lat?.toFixed?.(5) || activeDestination?.lat,
          activeDestination?.lng?.toFixed?.(5) || activeDestination?.lng,
          routePath.length > 1 ? 'route' : 'direct',
      ].join(':');

      if (mapFrameKeyRef.current === frameKey) {
          return;
      }

      mapFrameKeyRef.current = frameKey;

      if (arePositionsNearlyEqual(driverPosition, activeDestination)) {
          map.setView(driverPosition, 15);
          return;
      }

      const bounds = [];

      if (routePath.length > 1) {
          routePath.forEach((point) => bounds.push(point));
          bounds.push(driverPosition);
          bounds.push(activeDestination);
          map.fitBounds(bounds, 72);
          return;
      }

      bounds.push(driverPosition);
      bounds.push(activeDestination);
      map.fitBounds(bounds, 80);
  }, [activeDestination, driverPosition, isSimulationRunning, map, routePath]);

  const handleOTPChange = (index, value) => {
      if (!/^\d*$/.test(value)) return;
      const nextOtp = [...otp];
      nextOtp[index] = value;
      setOtp(nextOtp);

      if (value && index < 3) {
          const nextInput = otpInputRefs.current[index + 1];
          if (nextInput) {
              nextInput.focus();
          }
      }

      setOtpError('');

      const enteredOtp = nextOtp.join('');

      if (enteredOtp.length === 4) {
          setTimeout(() => startTripAfterOtp(enteredOtp), 250);
      }
  };

  const handleOTPKeyDown = (index, event) => {
      if (event.nativeEvent?.key !== 'Backspace') {
          return;
      }

      if (otp[index]) {
          const nextOtp = [...otp];
          nextOtp[index] = '';
          setOtp(nextOtp);
          setOtpError('');
          return;
      }

      if (index > 0) {
          const previousInput = otpInputRefs.current[index - 1];
          if (previousInput) {
              previousInput.focus();
          }
      }
  };

  // Web: GoogleMap onLoad / onUnmount and its map.panTo / setCenter / setZoom / fitBounds, on the native MapView.
  const handleMapReady = () => {
      const view = mapViewRef.current;
      if (!view) {
          return;
      }

      const toCoordinate = (point) => ({ latitude: point.lat, longitude: point.lng });
      setMap({
          panTo: (point) => view.animateCamera({ center: toCoordinate(point) }, { duration: 500 }),
          setView: (point, zoom) => view.animateCamera({ center: toCoordinate(point), zoom }, { duration: 0 }),
          fitBounds: (points, padding) => view.fitToCoordinates(points.map(toCoordinate), {
              edgePadding: { top: padding, right: padding, bottom: padding, left: padding },
              animated: true,
          }),
      });
  };
  const handleMapUnmount = () => setMap(null);

  return {
      navigate,
      phase,
      setPhase,
      isParcel,
      isHydratingTrip,
      routePath,
      routeError,
      driverPosition,
      displayDriverHeading,
      vehicleIconUrl,
      activeDestination,
      pickupPosition,
      tripData,
      isSimulationEnabled,
      isSimulationRunning,
      simulationProgress,
      pauseSimulation,
      resumeSimulation,
      startSimulation,
      resetSimulation,
      routeStrokeColor,
      routeAccentSoft,
      routeAccentMuted,
      routeAccentBorder,
      riderDistanceLabel,
      openTripChat,
      callContact,
      pickupContact,
      destinationContact,
      pickupDistanceMeters,
      canMarkArrived,
      arrivalGuardError,
      setArrivalGuardError,
      setLocalArrivedAt,
      publishRideStatus,
      otp,
      otpError,
      handleOTPChange,
      handleOTPKeyDown,
      startTripAfterOtp,
      otpInputRefs,
      isWaitingForOtp,
      waitingElapsedSeconds,
      freeWaitingRemainingSeconds,
      freeWaitingBeforeMinutes,
      waitingChargePerMinute,
      waitingChargeableMinutes,
      openSupportChat,
      triggerEmergencySos,
      dropDistanceMeters,
      canDeliverParcel,
      setSelectedPaymentMode,
      setPaymentQr,
      setPaymentQrError,
      setDriverPaymentStatus,
      driverPaymentStatus,
      tripSummaryTitle,
      tripSummarySubtitle,
      displayFare,
      paymentModeLabel,
      tripStartedAt,
      tripArrivedAt,
      tripDurationLabel,
      commissionSummary,
      fareAmount,
      destinationRoleLabel,
      allowedPaymentModes,
      handlePaymentModeSelect,
      isGeneratingPaymentQr,
      selectedPaymentMode,
      paymentQrError,
      paymentQr,
      qrZoomed,
      setQrZoomed,
      paymentCollectionLabel,
      completeRideForUserSync,
      effectiveState,
      liveRequest,
      selectedRating,
      setSelectedRating,
      completeRideAndExit,
      mapViewRef,
      handleMapReady,
      handleMapUnmount,
      isLoaded,
  };
}
