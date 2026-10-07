import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Dimensions, LayoutAnimation, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart2, Bell, CalendarClock, Camera, ChevronRight, Clock, IndianRupee, Navigation, Power, Target, Wallet } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { useNavigate } from '../../lib/webRouter';
import { document, window } from '../../lib/webShim';
import { localStore } from '../../lib/storage';
import { alpha, outfit, shadow, tw } from '../../theme';
import api from '../api/client';
import { socketService } from '../api/socket';
import { HAS_VALID_GOOGLE_MAPS_KEY } from '../shared/utils/googleMaps';
import {
  cancelDriverScheduledRide,
  getCurrentDriver,
  getDriverDocumentTemplates,
  getDriverNotifications,
  getDriverScheduledRides,
  getLocalDriverToken,
} from '../services/registrationService';
import DriverBottomNav from '../components/DriverBottomNav';
import HomeMap, { getMapIconForVehicle } from '../components/HomeMap';
import IncomingRideRequest from './IncomingRideRequest';
import { addLocalDriverNotification, getUnreadDriverNotificationCount, getVisibleDriverNotifications } from '../utils/notificationState';
import { getScheduledRideCountdown } from '../utils/scheduledRideTime';
import { playRideRequestAlertSound, stopRideRequestAlertSound } from '../utils/rideRequestAlertSound';
import { getCurrentCoords } from '../utils/driverLocation';
import { compressSelfieForUpload, takeSelfie, uploadImage } from '../utils/driverSelfie';
import {
  DEFAULT_MAP_COORDS,
  buildRideRequest,
  formatPoint,
  formatScheduledDateTime,
  formatTripDistance,
  getJobRideId,
  getJobTitle,
  isScheduledRideForFuture,
  mergeBiddingUpdate,
  normalizeJobType,
  unwrapApiPayload,
  withDriverAuthorization,
} from '../utils/driverRideJobs';
import {
  DRIVER_VEHICLE_REAPPROVAL_PENDING_KEY,
  ONLINE_LOCATION_EMIT_MIN_DISTANCE_METERS,
  ONLINE_LOCATION_EMIT_MIN_INTERVAL_MS,
  calculateCoordinateDistanceMeters,
  createScheduledRidePreview,
  formatFareLabel,
  formatSummaryDistance,
  formatSummaryMoney,
  getDocumentExpiryValue,
  getDocumentReason,
  getDocumentReviewStatus,
  getWalletAlertState,
  hasSelfieForToday,
  isDriverVehicleApprovalPending,
  isExpiredDateValue,
  isOwnerManagedDriverProfile,
  normalizeRouteBookingPreferences,
  normalizeTodaySummary,
  persistStoredDriverInfo,
  readRouteBookingPreferences,
  readStoredDriverCoords,
  readStoredDriverInfo,
  toLatLng,
  writeRouteBookingPreferences,
} from '../utils/driverHomeState';

/* Web: Taxi/modules/driver/pages/DriverHome.jsx (routes `home` and `dashboard`). */

const SCREEN_H = Dimensions.get('window').height;

/** `animate-pulse` */
function Pulse({ style, children }) {
  const v = useAnimatedValue(1);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[style, { opacity: v }]}>{children}</Animated.View>;
}

/** The status toast: fades / rises in (opacity 0, y 10, scale .96 -> 1). */
function StatusToast({ message }) {
  const v = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [v]);
  return (
    <Animated.View style={[st.statusToast, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}>
      <Text style={[outfit(700), st.statusText]}>{message}</Text>
    </Animated.View>
  );
}

/** A centred dialog over a dimmed backdrop (the web's absolute inset-0 overlay + card). */
function CenterDialog({ onBackdrop, children }) {
  const v = useAnimatedValue(0);
  useEffect(() => {
    Animated.spring(v, { toValue: 1, stiffness: 300, damping: 28, mass: 1, useNativeDriver: true }).start();
  }, [v]);
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onBackdrop}>
      <View style={st.dialogRoot}>
        <Pressable style={st.dialogBackdrop} onPress={onBackdrop} />
        <Animated.View style={[st.dialogCard, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

function ScheduleSheet({ onClose, children }) {
  const v = useAnimatedValue(0);
  useEffect(() => {
    Animated.spring(v, { toValue: 1, stiffness: 320, damping: 32, mass: 1, useNativeDriver: true }).start();
  }, [v]);
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={st.sheetRoot}>
        <Pressable style={st.sheetBackdrop} onPress={onClose} />
        <Animated.View style={[st.sheet, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_H, 0] }) }] }]}>{children}</Animated.View>
      </View>
    </Modal>
  );
}

const DriverHome = () => {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const storedDriverInfo = useMemo(() => readStoredDriverInfo(), []);
  const [isOwnerManagedDriver, setIsOwnerManagedDriver] = useState(() => isOwnerManagedDriverProfile(storedDriverInfo));
  const [isOnline, setIsOnline] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [todaySummary, setTodaySummary] = useState(() => normalizeTodaySummary());
  const [isTodaySummaryExpanded, setIsTodaySummaryExpanded] = useState(true);
  const [driverCoords, setDriverCoords] = useState(() => readStoredDriverCoords());
  const [statusMessage, setStatusMessage] = useState('');
  const [, setSocketStatus] = useState('offline');
  const [notificationCount, setNotificationCount] = useState(0);
  const [scheduledRideCount, setScheduledRideCount] = useState(0);
  const [scheduledRides, setScheduledRides] = useState([]);
  const [isScheduleSheetOpen, setIsScheduleSheetOpen] = useState(false);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [selectedScheduledRide, setSelectedScheduledRide] = useState(null);
  const [scheduleNow, setScheduleNow] = useState(() => Date.now());
  const [cancellingScheduledRideId, setCancellingScheduledRideId] = useState('');
  const [acceptingRideId, setAcceptingRideId] = useState('');
  const [isHydratingDriver, setIsHydratingDriver] = useState(true);
  const [isTogglingDuty, setIsTogglingDuty] = useState(false);
  const [showOfflineConfirm, setShowOfflineConfirm] = useState(false);
  const [showOnlineSelfiePrompt, setShowOnlineSelfiePrompt] = useState(false);
  const [selfieUploading, setSelfieUploading] = useState(false);
  const [selfieError, setSelfieError] = useState('');
  const [onlineSelfie, setOnlineSelfie] = useState(null);
  const [routeBookingPreferences, setRouteBookingPreferences] = useState(() => readRouteBookingPreferences());
  const [vehicleReapprovalPending, setVehicleReapprovalPending] = useState(() => localStore.getItem(DRIVER_VEHICLE_REAPPROVAL_PENDING_KEY) === 'true');
  const [driverDocuments, setDriverDocuments] = useState({});
  const [documentTemplates, setDocumentTemplates] = useState([]);
  const [vehicleIconType, setVehicleIconType] = useState(() => storedDriverInfo?.vehicleIconType || storedDriverInfo?.vehicleType || 'car');
  const [vehicleIconUrl, setVehicleIconUrl] = useState(() => storedDriverInfo?.vehicleIconUrl || '');
  const [walletSummary, setWalletSummary] = useState({
    balance: 0,
    cashLimit: 500,
    minimumBalanceForOrders: 0,
    availableForOrders: 0,
    isBlocked: false,
  });
  const mapRef = useRef(null);
  const driverCoordsRef = useRef(readStoredDriverCoords());
  const acceptingRideIdRef = useRef('');
  const currentRequestRef = useRef(null);
  const recoveryTimeoutsRef = useRef([]);
  const acceptRecoveryTimeoutsRef = useRef([]);
  const recoveryInFlightRef = useRef(false);
  const lastDutyToggleAtRef = useRef(0);
  const lastOnlineLocationEmitRef = useRef({ coordinates: null, emittedAt: 0 });
  const knobX = useAnimatedValue(0);
  const chevron = useAnimatedValue(1);
  const summaryIntro = useAnimatedValue(0);

  const driverPosition = useMemo(() => toLatLng(driverCoords || DEFAULT_MAP_COORDS), [driverCoords]);
  const mapVehicleIcon = useMemo(() => getMapIconForVehicle(vehicleIconUrl || vehicleIconType), [vehicleIconType, vehicleIconUrl]);

  const walletAlertState = useMemo(
    () => getWalletAlertState(walletSummary, { ignoreRestrictions: isOwnerManagedDriver }),
    [walletSummary, isOwnerManagedDriver],
  );
  const walletNotice = useMemo(() => {
    if (walletAlertState.isBlocked) {
      return {
        title: walletAlertState.belowMinimumBalance ? 'Top up to go online' : 'Cash limit reached',
        message: walletAlertState.belowMinimumBalance
          ? [
            `Keep your wallet at or above Rs ${Math.max(0, walletAlertState.minimumBalanceForOrders)} to receive orders.`,
            // The top-up minimum is a separate setting and is often the larger of the two.
            walletAlertState.minimumTopUpAmount > 0 ? `Top-ups start at Rs ${walletAlertState.minimumTopUpAmount}.` : '',
          ].filter(Boolean).join(' ')
          : 'Add money to keep receiving ride requests.',
        tone: 'danger',
      };
    }

    if (walletAlertState.isWarning) {
      return {
        title: 'Wallet running low',
        message: 'Top up soon to keep receiving orders smoothly.',
        tone: 'warning',
      };
    }

    return null;
  }, [walletAlertState]);

  // The web pushes a history entry so the browser Back button never leaves the home screen; hardware Back does the same.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, []),
  );

  useEffect(() => {
    Animated.spring(summaryIntro, { toValue: 1, stiffness: 300, damping: 25, mass: 1, useNativeDriver: true }).start();
  }, [summaryIntro]);

  useEffect(() => {
    Animated.spring(knobX, { toValue: isOnline ? 72 : 0, stiffness: 400, damping: 30, mass: 1, useNativeDriver: true }).start();
  }, [isOnline, knobX]);

  useEffect(() => {
    Animated.timing(chevron, { toValue: isTodaySummaryExpanded ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [chevron, isTodaySummaryExpanded]);

  const refreshNotificationCount = useCallback(async () => {
    try {
      const response = await getDriverNotifications();
      const results = response?.data?.results || [];
      const visibleNotifications = getVisibleDriverNotifications(results);
      setNotificationCount(getUnreadDriverNotificationCount(visibleNotifications));
    } catch {
      setNotificationCount(0);
    }
  }, []);

  const loadScheduledRides = useCallback(async () => {
    setIsScheduleLoading(true);

    try {
      const response = await getDriverScheduledRides({ limit: 20 });
      const results = response?.data?.results || [];
      const nextScheduledRides = results
        .filter((ride) => ride?.scheduledAt)
        .sort((firstRide, secondRide) => new Date(firstRide.scheduledAt).getTime() - new Date(secondRide.scheduledAt).getTime());

      setScheduledRides(nextScheduledRides);
      setScheduledRideCount(nextScheduledRides.length);
    } catch {
      setScheduledRides([]);
      setScheduledRideCount(0);
    } finally {
      setIsScheduleLoading(false);
    }
  }, []);

  const handleCancelScheduledRide = useCallback(async (ride) => {
    const rideId = String(ride?.rideId || '');

    if (!rideId || cancellingScheduledRideId) {
      return;
    }

    const confirmed = await window.confirmAsync('Cancel this scheduled ride? The user will be notified immediately.');
    if (!confirmed) {
      return;
    }

    setCancellingScheduledRideId(rideId);

    try {
      await cancelDriverScheduledRide(rideId);
      toast.success('Scheduled ride cancelled. User notified.', { duration: 3200 });
      setSelectedScheduledRide(null);
      await loadScheduledRides();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to cancel scheduled ride');
    } finally {
      setCancellingScheduledRideId('');
    }
  }, [cancellingScheduledRideId, loadScheduledRides]);

  useEffect(() => {
    refreshNotificationCount();
    loadScheduledRides();

    // The 30s poll is deliberate; resume refreshes only if the poll has not just done it.
    let lastRefreshAt = Date.now();
    const refreshBoth = () => {
      lastRefreshAt = Date.now();
      refreshNotificationCount();
      loadScheduledRides();
    };

    const handleFocus = () => {
      if (Date.now() - lastRefreshAt < 10000) return;
      refreshBoth();
    };
    const refreshInterval = setInterval(refreshBoth, 30000);

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadScheduledRides, refreshNotificationCount]);

  useEffect(() => {
    if (scheduledRides.length === 0) {
      return undefined;
    }

    const interval = setInterval(() => {
      setScheduleNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [scheduledRides.length]);

  useEffect(() => {
    currentRequestRef.current = currentRequest;
  }, [currentRequest]);

  const emitOnlineLocationUpdate = useCallback((coordinates, { force = false } = {}) => {
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return false;
    }

    const now = Date.now();
    const lastEmission = lastOnlineLocationEmitRef.current;
    const movedDistance = calculateCoordinateDistanceMeters(lastEmission.coordinates, coordinates);
    const shouldEmit = force
      || !Array.isArray(lastEmission.coordinates)
      || movedDistance >= ONLINE_LOCATION_EMIT_MIN_DISTANCE_METERS
      || now - Number(lastEmission.emittedAt || 0) >= ONLINE_LOCATION_EMIT_MIN_INTERVAL_MS;

    if (!shouldEmit) {
      return false;
    }

    socketService.emit('locationUpdate', { coordinates });
    lastOnlineLocationEmitRef.current = { coordinates, emittedAt: now };
    return true;
  }, []);

  useEffect(() => {
    const syncLocalDriverPreferences = () => {
      setRouteBookingPreferences(readRouteBookingPreferences());
      setVehicleReapprovalPending(localStore.getItem(DRIVER_VEHICLE_REAPPROVAL_PENDING_KEY) === 'true');
    };

    window.addEventListener('focus', syncLocalDriverPreferences);
    return () => {
      window.removeEventListener('focus', syncLocalDriverPreferences);
    };
  }, []);

  useEffect(() => {
    if (!isOnline || !showRequest || !currentRequest?.rideId) {
      return undefined;
    }

    playRideRequestAlertSound();

    const replayAlert = () => {
      if (document.visibilityState === 'visible' && currentRequestRef.current?.rideId) {
        playRideRequestAlertSound();
      }
    };

    window.addEventListener('focus', replayAlert);
    document.addEventListener('visibilitychange', replayAlert);

    return () => {
      window.removeEventListener('focus', replayAlert);
      document.removeEventListener('visibilitychange', replayAlert);
    };
  }, [currentRequest?.rideId, isOnline, showRequest]);

  const clearRecoveryBurst = useCallback(() => {
    recoveryTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    recoveryTimeoutsRef.current = [];
  }, []);

  useEffect(() => clearRecoveryBurst, [clearRecoveryBurst]);

  const clearAcceptRecovery = useCallback(() => {
    acceptRecoveryTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    acceptRecoveryTimeoutsRef.current = [];
  }, []);

  useEffect(() => clearAcceptRecovery, [clearAcceptRecovery]);

  const fetchActiveJob = useCallback(async () => {
    const driverToken = getLocalDriverToken();
    const response = await api.get('/rides/active/me', {
      ...withDriverAuthorization(driverToken),
      params: { t: Date.now(), type: 'ride' },
    });
    return unwrapApiPayload(response);
  }, []);

  const openActiveJob = useCallback((job) => {
    const currentRideId = getJobRideId(job);

    if (!currentRideId) {
      return false;
    }

    clearAcceptRecovery();

    const currentType = normalizeJobType(job);

    navigate('/taxi/driver/active-trip', {
      replace: true,
      state: {
        type: currentType,
        rideId: currentRideId,
        otp: job.otp || '',
        request: {
          type: currentType,
          title: getJobTitle(currentType),
          fare: `Rs ${job.fare || 0}`,
          payment: job.paymentMethod || 'Cash',
          pickup: job.pickupAddress || formatPoint(job.pickupLocation, 'Pickup Location'),
          drop: job.dropAddress || formatPoint(job.dropLocation, 'Drop Location'),
          distance: formatTripDistance(job),
          requestId: currentRideId,
          rideId: currentRideId,
          otp: job.otp || '',
          raw: job,
        },
        currentDriverCoords: driverCoordsRef.current || job.lastDriverLocation?.coordinates || null,
      },
    });

    return true;
  }, [clearAcceptRecovery, navigate]);

  const scheduleAcceptRecovery = useCallback((type = 'ride') => {
    clearAcceptRecovery();

    [700, 1500, 3000, 5000].forEach((delay) => {
      const timeoutId = setTimeout(async () => {
        if (!acceptingRideIdRef.current) {
          return;
        }

        try {
          const activeJob = await fetchActiveJob(type);
          if (getJobRideId(activeJob)) {
            openActiveJob(activeJob);
          }
        } catch {
          // Keep waiting for the socket event or the next retry.
        }
      }, delay);

      acceptRecoveryTimeoutsRef.current.push(timeoutId);
    });
  }, [clearAcceptRecovery, fetchActiveJob, openActiveJob]);

  const updateDriverLocation = useCallback(async ({ quiet = false } = {}) => {
    try {
      const coordinates = await getCurrentCoords({ purpose: 'online' });
      driverCoordsRef.current = coordinates;
      setDriverCoords(coordinates);
      persistStoredDriverInfo({
        location: { coordinates },
        coordinates,
      });
      mapRef.current?.panTo(toLatLng(coordinates));
      if (!quiet) {
        setStatusMessage('Current location updated.');
      }
      return coordinates;
    } catch (error) {
      if (!quiet) {
        setStatusMessage(error.message || 'Could not fetch current location.');
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    updateDriverLocation({ quiet: true }).catch(() => {});
  }, [updateDriverLocation]);

  const hydrateDriverState = useCallback(async () => {
    const [response, templateResponse] = await Promise.all([
      getCurrentDriver(),
      getDriverDocumentTemplates().catch(() => null),
    ]);
    const driver = response?.data?.data || response?.data || response;
    const savedCoords = driver?.location?.coordinates;

    setVehicleIconType(driver?.vehicleIconType || driver?.vehicleType || 'car');
    setVehicleIconUrl(driver?.vehicleIconUrl || '');
    setIsOnline(Boolean(driver?.isOnline));
    setIsOwnerManagedDriver(isOwnerManagedDriverProfile(driver));
    setTodaySummary(normalizeTodaySummary(driver?.todaySummary));
    if (driver?.wallet) {
      setWalletSummary(driver.wallet);
    }
    setOnlineSelfie(driver?.onlineSelfie || null);
    setDriverDocuments(driver?.documents || {});
    setRouteBookingPreferences(writeRouteBookingPreferences(normalizeRouteBookingPreferences(driver?.routeBooking)));
    const nextVehicleApprovalPending = isDriverVehicleApprovalPending(driver);
    setVehicleReapprovalPending(nextVehicleApprovalPending);
    if (nextVehicleApprovalPending) {
      localStore.setItem(DRIVER_VEHICLE_REAPPROVAL_PENDING_KEY, 'true');
    } else {
      localStore.removeItem(DRIVER_VEHICLE_REAPPROVAL_PENDING_KEY);
    }
    const templateResults = templateResponse?.data?.data?.results || templateResponse?.data?.results || [];
    setDocumentTemplates(Array.isArray(templateResults) ? templateResults : []);

    const storedDriverInfoSnapshot = readStoredDriverInfo();
    persistStoredDriverInfo({
      owner_id: driver?.owner_id || storedDriverInfoSnapshot?.owner_id || null,
      vehicleIconType: driver?.vehicleIconType || storedDriverInfoSnapshot?.vehicleIconType || '',
      vehicleType: driver?.vehicleType || storedDriverInfoSnapshot?.vehicleType || '',
      vehicleIconUrl: driver?.vehicleIconUrl || storedDriverInfoSnapshot?.vehicleIconUrl || '',
    });

    if (Array.isArray(savedCoords) && savedCoords.length === 2) {
      driverCoordsRef.current = savedCoords;
      setDriverCoords(savedCoords);
      persistStoredDriverInfo({
        location: { coordinates: savedCoords },
        coordinates: savedCoords,
      });
    }

    return driver;
  }, []);

  const refreshTodaySummary = useCallback(async () => {
    const response = await getCurrentDriver();
    const driver = response?.data?.data || response?.data || response;

    setTodaySummary(normalizeTodaySummary(driver?.todaySummary));
    if (driver?.wallet) {
      setWalletSummary(driver.wallet);
    }

    return driver;
  }, []);

  const expiredDocumentNames = useMemo(() => {
    const flattenedTemplates = Array.isArray(documentTemplates)
      ? documentTemplates.flatMap((template) => (Array.isArray(template?.fields)
        ? template.fields.map((field) => ({
          key: field?.key,
          label: field?.label || field?.name || field?.key || 'Document',
          hasExpiryDate: Boolean(template?.has_expiry_date),
        }))
        : []))
      : [];

    return flattenedTemplates
      .filter((field) => field.key && field.hasExpiryDate)
      .filter((field) => isExpiredDateValue(getDocumentExpiryValue(driverDocuments?.[field.key])))
      .map((field) => field.label);
  }, [documentTemplates, driverDocuments]);

  const rejectedDocumentNotes = useMemo(() => {
    const flattenedTemplates = Array.isArray(documentTemplates)
      ? documentTemplates.flatMap((template) => (Array.isArray(template?.fields)
        ? template.fields.map((field) => ({
          key: field?.key,
          label: field?.label || field?.name || field?.key || 'Document',
        }))
        : []))
      : [];

    return flattenedTemplates
      .map((field) => {
        const document = driverDocuments?.[field.key];
        const reviewStatus = getDocumentReviewStatus(document);
        if (!['rejected', 'declined'].includes(reviewStatus)) {
          return null;
        }

        return {
          label: field.label,
          reason: getDocumentReason(document),
        };
      })
      .filter(Boolean);
  }, [documentTemplates, driverDocuments]);

  useEffect(() => {
    let active = true;

    setIsHydratingDriver(true);

    (async () => {
      try {
        const [, activeDelivery, activeRide] = await Promise.allSettled([
          hydrateDriverState(),
          fetchActiveJob('parcel'),
          fetchActiveJob('ride'),
        ]);

        if (!active) {
          return;
        }

        const deliveryPayload = activeDelivery.status === 'fulfilled' ? activeDelivery.value : null;
        const ridePayload = activeRide.status === 'fulfilled' ? activeRide.value : null;

        const currentJob = getJobRideId(deliveryPayload)
          ? deliveryPayload
          : getJobRideId(ridePayload)
            ? ridePayload
            : null;

        if (getJobRideId(currentJob)) {
          openActiveJob(currentJob);
          return;
        }
      } catch {
        if (active) {
          setStatusMessage('Could not restore driver status.');
        }
      } finally {
        if (active) {
          setIsHydratingDriver(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [fetchActiveJob, hydrateDriverState, navigate, openActiveJob]);

  useEffect(() => {
    let intervalId;
    let cancelled = false;

    const syncSummary = async () => {
      try {
        await refreshTodaySummary();
      } catch {
        if (!cancelled) {
          console.warn('[driver-home] failed to refresh today summary');
        }
      }
    };

    syncSummary();
    intervalId = setInterval(syncSummary, isOnline ? 30000 : 120000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncSummary();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOnline, refreshTodaySummary]);

  useEffect(() => {
    if (driverCoords) {
      mapRef.current?.panTo(toLatLng(driverCoords));
    }
  }, [driverCoords]);

  const recenterMap = useCallback(async () => {
    try {
      setStatusMessage('Recentering map...');
      await updateDriverLocation({ quiet: true });
      setStatusMessage('Map recentered to your location.');
    } catch (error) {
      setStatusMessage(error.message || 'Could not recenter map.');
    }
  }, [updateDriverLocation]);

  const goOnline = useCallback(async (selfieImageUrl = '') => {
    if (vehicleReapprovalPending) {
      setStatusMessage('Vehicle update is pending admin approval. Please wait before going online.');
      return;
    }

    if (walletAlertState.isBlocked) {
      setStatusMessage(
        walletAlertState.belowMinimumBalance
          ? `Keep your wallet at or above Rs ${Math.max(0, walletAlertState.minimumBalanceForOrders)} to go online.`
          : 'Cash limit exceeded. Please top up your wallet to go online.',
      );
      return;
    }

    if (expiredDocumentNames.length > 0) {
      setStatusMessage(`Please reupload expired documents: ${expiredDocumentNames.join(', ')}.`);
      return;
    }

    if (rejectedDocumentNotes.length > 0) {
      const firstRejected = rejectedDocumentNotes[0];
      setStatusMessage(
        firstRejected?.reason
          ? `${firstRejected.label} was rejected: ${firstRejected.reason}`
          : `Please reupload rejected documents: ${rejectedDocumentNotes.map((item) => item.label).join(', ')}.`,
      );
      return;
    }

    setIsTogglingDuty(true);
    try {
      setStatusMessage('Going online...');

      // Use last known coords to speed up the transition instead of waiting for a fresh GPS lock.
      let coordinates = Array.isArray(routeBookingPreferences.coordinates) && routeBookingPreferences.enabled
        ? routeBookingPreferences.coordinates
        : driverCoordsRef.current;

      if (!coordinates) {
        // Only wait for GPS when there is no usable position at all.
        coordinates = await updateDriverLocation({ quiet: true });
      } else if (!routeBookingPreferences.enabled) {
        // Refresh in the background so the next heartbeat is accurate.
        updateDriverLocation({ quiet: true }).catch(() => {});
      }

      const socket = socketService.connect({ role: 'driver' });

      if (!socket) {
        console.warn('[driver-home] socket connect skipped because token was missing');
        setIsOnline(false);
        setStatusMessage('Driver session missing. Please login again.');
        return;
      }

      setIsOnline(true);
      const response = await api.patch('/drivers/online', {
        location: coordinates,
        ...(selfieImageUrl ? { selfieImageUrl } : {}),
      });
      const driver = response?.data?.data || response?.data || response;
      setIsOnline(Boolean(driver?.isOnline));
      setVehicleIconUrl((current) => driver?.vehicleIconUrl || current);
      setOnlineSelfie(driver?.onlineSelfie || null);

      // Sync current state with the server response.
      const finalCoords = (Array.isArray(driver?.location?.coordinates) && driver.location.coordinates.length === 2)
        ? driver.location.coordinates
        : coordinates;

      driverCoordsRef.current = finalCoords;
      setDriverCoords(finalCoords);
      persistStoredDriverInfo({
        location: { coordinates: finalCoords },
        coordinates: finalCoords,
      });
      emitOnlineLocationUpdate(finalCoords, { force: true });

      setStatusMessage(
        routeBookingPreferences.enabled
          ? 'You are online. Matching rides from your selected route area.'
          : 'You are online. Waiting for nearby bookings.',
      );
      refreshTodaySummary().catch(() => {});
    } catch (error) {
      console.error('[driver-home] goOnline failed', error);
      setIsOnline(false);
      socketService.disconnect();
      const nextMessage = error?.response?.data?.message || error.message || 'Could not go online.';
      setStatusMessage(nextMessage);
      if (String(nextMessage).toLowerCase().includes('selfie is required')) {
        setShowOnlineSelfiePrompt(true);
      }
    } finally {
      setIsTogglingDuty(false);
    }
  }, [emitOnlineLocationUpdate, expiredDocumentNames, refreshTodaySummary, rejectedDocumentNotes, routeBookingPreferences.coordinates, routeBookingPreferences.enabled, updateDriverLocation, vehicleReapprovalPending, walletAlertState]);

  const goOffline = useCallback(async () => {
    setIsTogglingDuty(true);
    setIsOnline(false);
    try {
      setStatusMessage('Going offline...');
      const response = await api.patch('/drivers/offline');
      const driver = response?.data?.data || response?.data || response;
      setIsOnline(Boolean(driver?.isOnline));
      setIsOnline(false);
      setShowRequest(false);
      setCurrentRequest(null);
      setStatusMessage('You are offline.');
      socketService.disconnect();
      refreshTodaySummary().catch(() => {});
    } catch (error) {
      setIsOnline(true);
      setStatusMessage(error.message || 'Could not go offline.');
    } finally {
      setIsTogglingDuty(false);
    }
  }, [refreshTodaySummary]);

  const handleDutyToggle = useCallback(() => {
    const now = Date.now();
    if (now - lastDutyToggleAtRef.current < 600) {
      return;
    }
    lastDutyToggleAtRef.current = now;

    if (isTogglingDuty) {
      return;
    }

    setStatusMessage(isOnline ? 'Preparing to go offline...' : 'Checking online requirements...');

    if (isOnline) {
      setShowOfflineConfirm(true);
      return;
    }

    if (vehicleReapprovalPending) {
      setStatusMessage('Vehicle update is pending admin approval. Please wait before going online.');
      return;
    }

    if (walletAlertState.isBlocked) {
      setStatusMessage(
        walletAlertState.belowMinimumBalance
          ? `Keep your wallet at or above Rs ${Math.max(0, walletAlertState.minimumBalanceForOrders)} to go online.`
          : 'Cash limit exceeded. Please top up your wallet to go online.',
      );
      return;
    }

    if (expiredDocumentNames.length > 0) {
      setStatusMessage(`Please reupload expired documents: ${expiredDocumentNames.join(', ')}.`);
      return;
    }

    if (rejectedDocumentNotes.length > 0) {
      const firstRejected = rejectedDocumentNotes[0];
      setStatusMessage(
        firstRejected?.reason
          ? `${firstRejected.label} was rejected: ${firstRejected.reason}`
          : `Please reupload rejected documents: ${rejectedDocumentNotes.map((item) => item.label).join(', ')}.`,
      );
      return;
    }

    if (hasSelfieForToday(onlineSelfie)) {
      goOnline();
      return;
    }

    setSelfieError('');
    setShowOnlineSelfiePrompt(true);
  }, [
    expiredDocumentNames,
    goOnline,
    isOnline,
    isTogglingDuty,
    onlineSelfie,
    rejectedDocumentNotes,
    vehicleReapprovalPending,
    walletAlertState,
  ]);

  const uploadSelfieAsset = useCallback(async (asset) => {
    setSelfieUploading(true);
    setSelfieError('');

    try {
      setStatusMessage('Processing selfie...');
      const base64Image = await compressSelfieForUpload(asset);

      setStatusMessage('Uploading selfie...');
      const uploadResult = await uploadImage(base64Image, 'driver-online-selfies');
      const selfieUrl = uploadResult?.url || uploadResult?.secureUrl || '';

      if (!selfieUrl) {
        throw new Error('Selfie upload did not return an image URL');
      }

      setOnlineSelfie({
        imageUrl: selfieUrl,
        capturedAt: new Date().toISOString(),
        forDate: new Date().toISOString().slice(0, 10),
      });
      setShowOnlineSelfiePrompt(false);
      await goOnline(selfieUrl);
    } catch (error) {
      setSelfieError(error?.message || 'Failed to upload selfie');
      setStatusMessage(error?.message || 'Failed to upload selfie');
    } finally {
      setSelfieUploading(false);
    }
  }, [goOnline]);

  const openSelfieCamera = useCallback(async () => {
    try {
      setSelfieError('');
      setStatusMessage('Opening camera...');
      const asset = await takeSelfie();
      if (!asset) return;
      await uploadSelfieAsset(asset);
    } catch (error) {
      const message = error?.message || 'Could not access the camera.';
      setSelfieError(message);
      setStatusMessage(message);
    }
  }, [uploadSelfieAsset]);

  const recoverRealtimeSession = useCallback(async ({ reason = 'resume' } = {}) => {
    if (!isOnline || isHydratingDriver || isTogglingDuty) {
      return;
    }

    if (recoveryInFlightRef.current) {
      return;
    }

    recoveryInFlightRef.current = true;

    try {
      const socket = socketService.connect({ role: 'driver' });

      if (!socket) {
        return;
      }

      let nextCoords = driverCoordsRef.current;

      if (!nextCoords) {
        try {
          nextCoords = await updateDriverLocation({ quiet: true });
        } catch {
          nextCoords = driverCoordsRef.current;
        }
      }

      if (nextCoords) {
        emitOnlineLocationUpdate(nextCoords, { force: true });
      }

      try {
        const [activeDelivery, activeRide] = await Promise.allSettled([
          fetchActiveJob('parcel'),
          fetchActiveJob('ride'),
        ]);
        const deliveryPayload = activeDelivery.status === 'fulfilled' ? activeDelivery.value : null;
        const ridePayload = activeRide.status === 'fulfilled' ? activeRide.value : null;
        const currentJob = getJobRideId(deliveryPayload)
          ? deliveryPayload
          : getJobRideId(ridePayload)
            ? ridePayload
            : null;

        if (getJobRideId(currentJob)) {
          openActiveJob(currentJob);
          return;
        }
      } catch {
        // Ignore: the next burst retries.
      }

      setStatusMessage(
        reason === 'visibility'
          ? 'Realtime connection refreshed.'
          : 'Driver session synced.',
      );
    } finally {
      recoveryInFlightRef.current = false;
    }
  }, [emitOnlineLocationUpdate, fetchActiveJob, isHydratingDriver, isOnline, isTogglingDuty, openActiveJob, updateDriverLocation]);

  const scheduleRecoveryBurst = useCallback(({ reason = 'resume' } = {}) => {
    if (!isOnline || isHydratingDriver || isTogglingDuty) {
      return;
    }

    clearRecoveryBurst();

    [0, 1500, 5000, 10000].forEach((delay, index) => {
      const timeoutId = setTimeout(() => {
        recoverRealtimeSession({
          reason: index === 0 ? reason : `${reason}-retry-${index}`,
        }).catch(() => {});
      }, delay);

      recoveryTimeoutsRef.current.push(timeoutId);
    });
  }, [clearRecoveryBurst, isHydratingDriver, isOnline, isTogglingDuty, recoverRealtimeSession]);

  // Socket + location heartbeat while online
  useEffect(() => {
    if (isOnline) {
      const socket = socketService.connect({ role: 'driver' });

      if (!socket) {
        console.warn('[driver-home] socket effect could not get a socket');
        setStatusMessage('Driver session missing. Please login again.');
        setIsOnline(false);
        setSocketStatus('offline');
        return undefined;
      }

      setSocketStatus(socket.connected ? 'connected' : 'reconnecting');

      if (driverCoordsRef.current) {
        emitOnlineLocationUpdate(driverCoordsRef.current, { force: true });
      }

      const onSocketConnect = () => {
        clearRecoveryBurst();
        setSocketStatus('connected');
      };
      const onSocketDisconnect = () => {
        setSocketStatus('offline');
        scheduleRecoveryBurst({ reason: 'disconnect' });
      };
      const onSocketReconnectAttempt = () => setSocketStatus('reconnecting');
      const onSocketConnectError = () => {
        setSocketStatus('reconnecting');
        scheduleRecoveryBurst({ reason: 'connect-error' });
      };

      const onRideRequest = (data) => {
        const request = buildRideRequest(data);
        setCurrentRequest(request);
        setShowRequest(true);
        playRideRequestAlertSound({ fare: request.fare, pickup: request.pickup });
        setStatusMessage('New booking received.');
      };

      const onRideRequestClosed = ({ rideId, reason, message }) => {
        if (acceptingRideIdRef.current && acceptingRideIdRef.current === rideId) {
          clearAcceptRecovery();
          return;
        }
        const activeRequest = currentRequestRef.current;
        if (!activeRequest?.rideId || activeRequest.rideId === rideId) {
          setShowRequest(false);
          setCurrentRequest(null);
          stopRideRequestAlertSound();
          if (reason === 'user-cancelled') {
            setStatusMessage(message || 'User cancelled the ride.');
          } else if (reason === 'deleted-by-admin') {
            setStatusMessage('Ride was cancelled by admin.');
          } else if (reason === 'unmatched') {
            setStatusMessage('Ride request expired without a match.');
          }
        }
      };

      const onSocketError = ({ message }) => {
        console.error('[driver-home] socket errorMessage received', message);
        setStatusMessage(message || 'Socket error.');
        if (String(message || '').toLowerCase().includes('no longer available')) {
          setShowRequest(false);
          setCurrentRequest(null);
          stopRideRequestAlertSound();
        }
        clearAcceptRecovery();
        acceptingRideIdRef.current = '';
        setAcceptingRideId('');
      };

      const onRideBidSubmitted = ({ rideId }) => {
        if (!rideId || rideId !== acceptingRideIdRef.current) {
          return;
        }

        setAcceptingRideId('');
        setStatusMessage('Bid submitted. Waiting for rider response.');
      };

      const onRideBiddingUpdated = (payload = {}) => {
        if (!payload?.rideId) {
          return;
        }

        setCurrentRequest((current) => mergeBiddingUpdate(current, payload));
      };

      const openAcceptedRide = async (payload) => {
        if (!payload?.rideId || payload.rideId !== acceptingRideIdRef.current) {
          return;
        }

        const activeRequest = currentRequestRef.current;
        const nextType = activeRequest?.type || 'ride';
        const scheduledAt = activeRequest?.raw?.scheduledAt || payload?.scheduledAt || null;
        let currentJob = null;

        try {
          currentJob = await fetchActiveJob(nextType);
        } catch {
          currentJob = null;
        }

        setShowRequest(false);
        stopRideRequestAlertSound();
        clearAcceptRecovery();
        acceptingRideIdRef.current = '';
        setAcceptingRideId('');
        if (isScheduledRideForFuture(scheduledAt)) {
          setStatusMessage(`Scheduled ride confirmed for ${formatScheduledDateTime(scheduledAt)}.`);
          loadScheduledRides();
          return;
        }

        navigate('/taxi/driver/active-trip', {
          state: {
            type: nextType,
            rideId: currentJob?.rideId || payload.rideId,
            otp: currentJob?.otp || payload?.otp || activeRequest?.raw?.otp || '',
            request: {
              ...activeRequest,
              rideId: currentJob?.rideId || payload.rideId,
              otp: currentJob?.otp || payload?.otp || activeRequest?.raw?.otp || '',
              raw: currentJob || {
                ...(activeRequest?.raw || {}),
                otp: payload?.otp || activeRequest?.raw?.otp || '',
                status: payload.status,
                liveStatus: payload.liveStatus,
                acceptedAt: payload.acceptedAt,
              },
            },
            currentDriverCoords: driverCoordsRef.current || readStoredDriverCoords() || null,
          },
        });
      };

      const onWalletUpdated = (payload) => {
        if (payload?.wallet) {
          setWalletSummary(payload.wallet);

          const nextWalletAlertState = getWalletAlertState(payload.wallet, {
            ignoreRestrictions: isOwnerManagedDriver,
          });

          if (nextWalletAlertState.isBlocked) {
            setShowRequest(false);
            setCurrentRequest(null);
            stopRideRequestAlertSound();
            setStatusMessage(
              nextWalletAlertState.belowMinimumBalance
                ? 'Wallet balance must be above Rs 0 to receive new ride requests.'
                : 'Cash limit exceeded. Top up to receive new ride requests.',
            );
          } else if (nextWalletAlertState.isWarning) {
            setStatusMessage('Available cash limit is getting low. Top up soon.');
          }
        }

        if (payload?.notification) {
          addLocalDriverNotification({
            id: payload.notification.id || `wallet-${Date.now()}`,
            title: payload.notification.title || 'Payment received',
            body: payload.notification.body || 'A rider payment was received.',
            sentAt: payload.notification.sentAt || new Date().toISOString(),
            source: 'wallet_event',
          });
          refreshNotificationCount();
        }
      };

      socketService.on('rideRequest', onRideRequest);
      socketService.on('rideRequestClosed', onRideRequestClosed);
      socketService.on('errorMessage', onSocketError);
      socketService.on('rideAccepted', openAcceptedRide);
      socketService.on('rideBidSubmitted', onRideBidSubmitted);
      socketService.on('rideBiddingUpdated', onRideBiddingUpdated);
      socketService.on('driver:wallet:updated', onWalletUpdated);
      socket.on('connect', onSocketConnect);
      socket.on('disconnect', onSocketDisconnect);
      socket.on('connect_error', onSocketConnectError);
      socket.io.on('reconnect_attempt', onSocketReconnectAttempt);

      const locationInterval = setInterval(() => {
        getCurrentCoords({ purpose: 'background' })
          .then((coordinates) => {
            driverCoordsRef.current = coordinates;
            setDriverCoords(coordinates);
            persistStoredDriverInfo({
              location: { coordinates },
              coordinates,
            });
            emitOnlineLocationUpdate(coordinates);
          })
          .catch((error) => {
            console.warn('[driver-home] periodic location update skipped', error?.message || error);
            setStatusMessage(error.message || 'Could not update live location.');
          });
      }, 10000);

      return () => {
        socketService.off('rideRequest', onRideRequest);
        socketService.off('rideRequestClosed', onRideRequestClosed);
        socketService.off('errorMessage', onSocketError);
        socketService.off('rideAccepted', openAcceptedRide);
        socketService.off('rideBidSubmitted', onRideBidSubmitted);
        socketService.off('rideBiddingUpdated', onRideBiddingUpdated);
        socketService.off('driver:wallet:updated', onWalletUpdated);
        socket.off('connect', onSocketConnect);
        socket.off('disconnect', onSocketDisconnect);
        socket.off('connect_error', onSocketConnectError);
        socket.io.off('reconnect_attempt', onSocketReconnectAttempt);
        clearInterval(locationInterval);
      };
    }

    clearRecoveryBurst();
    setSocketStatus('offline');
    socketService.disconnect();
    return undefined;
  }, [clearAcceptRecovery, clearRecoveryBurst, emitOnlineLocationUpdate, fetchActiveJob, isOnline, isOwnerManagedDriver, loadScheduledRides, navigate, refreshNotificationCount, scheduleRecoveryBurst]);

  // Recover the realtime session when the app returns to the foreground or the network comes back
  useEffect(() => {
    if (!isOnline) {
      return undefined;
    }

    const handleVisibilityRecovery = () => {
      if (document.visibilityState === 'visible') {
        scheduleRecoveryBurst({ reason: 'visibility' });
      }
    };

    const handleWindowFocus = () => {
      scheduleRecoveryBurst({ reason: 'focus' });
    };

    let wasConnected = null;
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const connected = state.isConnected !== false;
      if (wasConnected === false && connected) {
        scheduleRecoveryBurst({ reason: 'network' });
      }
      wasConnected = connected;
    });

    document.addEventListener('visibilitychange', handleVisibilityRecovery);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityRecovery);
      window.removeEventListener('focus', handleWindowFocus);
      unsubscribeNet();
    };
  }, [isOnline, scheduleRecoveryBurst]);

  // Socket health check
  useEffect(() => {
    if (!isOnline) {
      return undefined;
    }

    const healthCheckInterval = setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      if (!socketService.isConnected()) {
        setSocketStatus('reconnecting');
        scheduleRecoveryBurst({ reason: 'health-check' });
      }
    }, 8000);

    return () => clearInterval(healthCheckInterval);
  }, [isOnline, scheduleRecoveryBurst]);

  const liveActiveSeconds = Math.max(0, Number(todaySummary.activeSeconds || 0));
  const dutyHours = Math.floor(liveActiveSeconds / 3600);
  const dutyMins = Math.floor((liveActiveSeconds % 3600) / 60);

  const handleAccept = () => {
    if (!currentRequest?.rideId || acceptingRideId) {
      return;
    }

    const acceptedRequestType = currentRequest.type || 'ride';
    acceptingRideIdRef.current = currentRequest.rideId;
    setAcceptingRideId(currentRequest.rideId);
    setStatusMessage('Accepting ride...');
    stopRideRequestAlertSound();
    setShowRequest(false);
    socketService.emit('acceptRide', { rideId: currentRequest.rideId });
    scheduleAcceptRecovery(acceptedRequestType);
    navigate('/taxi/driver/active-trip', {
      state: {
        type: acceptedRequestType,
        rideId: currentRequest.rideId,
        otp: currentRequest?.raw?.otp || currentRequest?.otp || '',
        request: {
          ...currentRequest,
          requestId: currentRequest.requestId || currentRequest.rideId,
          rideId: currentRequest.rideId,
          raw: {
            ...(currentRequest.raw || {}),
            rideId: currentRequest.rideId,
          },
        },
        currentDriverCoords: driverCoordsRef.current || readStoredDriverCoords() || null,
      },
    });
  };

  const handleDecline = () => {
    if (currentRequest?.rideId) {
      socketService.emit('rejectRide', { rideId: currentRequest.rideId });
    }
    stopRideRequestAlertSound();
    setShowRequest(false);
  };

  const handleSubmitBid = (bidFare) => {
    if (!currentRequest?.rideId || acceptingRideId || currentRequest?.raw?.pricingNegotiationMode !== 'driver_bid') {
      return;
    }

    acceptingRideIdRef.current = currentRequest.rideId;
    setAcceptingRideId(currentRequest.rideId);
    setStatusMessage('Submitting bid...');
    stopRideRequestAlertSound();
    socketService.emit('submitRideBid', { rideId: currentRequest.rideId, bidFare });
  };

  const toggleSummary = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(240, 'easeInEaseOut', 'opacity'));
    setIsTodaySummaryExpanded((current) => !current);
  };

  const topPad = Math.max(48, insets.top + 16);
  const bottomOffset = 80 + Math.max(0, insets.bottom - 8);
  const noticeTop = 104 + (topPad - 48);

  const summaryItems = [
    { Icon: IndianRupee, bg: tw.emerald50, color: tw.emerald600, value: formatSummaryMoney(todaySummary.earnings), label: 'EARNINGS' },
    { Icon: Clock, bg: tw.blue50, color: tw.blue600, value: `${dutyHours}h ${dutyMins}m`, label: 'ACTIVE' },
    { Icon: Navigation, bg: tw.orange50, color: tw.orange600, value: formatSummaryDistance(todaySummary.distanceMeters), label: 'DISTANCE' },
    { Icon: BarChart2, bg: tw.purple50, color: tw.purple600, value: String(todaySummary.rides), label: 'RIDES' },
  ];

  return (
    <View style={st.root}>
      {/* Map background */}
      <View style={StyleSheet.absoluteFill}>
        {HAS_VALID_GOOGLE_MAPS_KEY ? (
          <HomeMap ref={mapRef} position={driverPosition} iconSource={mapVehicleIcon} />
        ) : (
          <View style={st.mapFallback}>
            <View style={{ paddingHorizontal: 40, alignItems: 'center' }}>
              <Pulse style={st.mapFallbackDot} />
              <Text style={[outfit(500), st.mapFallbackText]}>Map unavailable. Configure Google Maps key.</Text>
            </View>
          </View>
        )}
      </View>

      {/* Status based background overlay */}
      {!isOnline ? (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(15,23,42,0)', 'rgba(15,23,42,0)', 'rgba(15,23,42,0.1)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <IncomingRideRequest
        visible={showRequest && Boolean(currentRequest)}
        requestData={currentRequest}
        isAccepting={Boolean(acceptingRideId)}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onSubmitBid={handleSubmitBid}
      />
      <IncomingRideRequest
        visible={Boolean(selectedScheduledRide)}
        requestData={selectedScheduledRide}
        mode="preview"
        onPreviewCancel={handleCancelScheduledRide}
        isPreviewCancelling={cancellingScheduledRideId === selectedScheduledRide?.rideId}
        canPreviewCancel={Boolean(selectedScheduledRide?.isAssignedToCurrentDriver)}
        previewCancelDisabledLabel="Not assigned yet"
        onClose={() => setSelectedScheduledRide(null)}
        onDecline={() => setSelectedScheduledRide(null)}
      />

      {showOfflineConfirm ? (
        <CenterDialog onBackdrop={() => setShowOfflineConfirm(false)}>
          <Text style={[outfit(900), st.dlgTitle]}>Go offline?</Text>
          <Text style={[outfit(600), st.dlgBody]}>New ride requests will stop until you go online again.</Text>
          <View style={st.dlgButtons}>
            <Press onPress={() => setShowOfflineConfirm(false)} scale={1} style={[st.dlgBtn, st.dlgBtnGhost]}>
              <Text style={[outfit(900), st.dlgBtnText, { color: tw.slate500, letterSpacing: 1.68 }]}>STAY ONLINE</Text>
            </Press>
            <Press
              onPress={() => {
                setShowOfflineConfirm(false);
                goOffline();
              }}
              scale={1}
              style={[st.dlgBtn, { backgroundColor: tw.rose500, boxShadow: '0 14px 28px rgba(244,63,94,0.28)' }]}
            >
              <Text style={[outfit(900), st.dlgBtnText, { color: '#fff', letterSpacing: 1.68 }]}>GO OFFLINE</Text>
            </Press>
          </View>
        </CenterDialog>
      ) : null}

      {showOnlineSelfiePrompt ? (
        <CenterDialog onBackdrop={() => !selfieUploading && setShowOnlineSelfiePrompt(false)}>
          <Text style={[outfit(900), st.selfieKicker]}>DAILY CHECK-IN</Text>
          <Text style={[outfit(900), st.selfieTitle]}>{"Upload today's selfie"}</Text>
          <Text style={[outfit(600), st.dlgBody]}>
            Before going online, submit a fresh selfie for today. This helps verify the driver account like Rapido-style daily check-in.
          </Text>

          {selfieError ? (
            <View style={st.selfieError}>
              <Text style={[outfit(700), st.selfieErrorText]}>{selfieError}</Text>
            </View>
          ) : null}

          <View style={st.dlgButtons}>
            <Press
              disabled={selfieUploading}
              onPress={() => setShowOnlineSelfiePrompt(false)}
              scale={1}
              style={[st.dlgBtn, st.dlgBtnGhost, { paddingHorizontal: 12 }, selfieUploading && { opacity: 0.6 }]}
            >
              <Text style={[outfit(900), st.dlgBtnText, { fontSize: 11, letterSpacing: 0.88, color: tw.slate500 }]}>CANCEL</Text>
            </Press>
            <Press
              disabled={selfieUploading}
              onPress={openSelfieCamera}
              scale={1}
              style={[st.dlgBtn, { paddingHorizontal: 12, backgroundColor: tw.emerald500, boxShadow: '0 14px 28px rgba(16,185,129,0.28)' }, selfieUploading && { opacity: 0.6 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Camera size={14} color="#fff" />
                <Text numberOfLines={1} style={[outfit(900), st.dlgBtnText, { fontSize: 10, letterSpacing: 0.8, color: '#fff', flexShrink: 1 }]}>TAKE NEW SELFIE</Text>
              </View>
            </Press>
          </View>
        </CenterDialog>
      ) : null}

      {isScheduleSheetOpen ? (
        <ScheduleSheet onClose={() => setIsScheduleSheetOpen(false)}>
          <View style={st.sheetHandle} />
          <View style={st.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={[outfit(900), st.sheetKicker]}>SCHEDULE</Text>
              <Text style={[outfit(900), st.sheetTitle]}>Scheduled rides</Text>
              <Text style={[outfit(600), st.sheetSub]}>Upcoming scheduled requests available for this driver.</Text>
            </View>
            <Press onPress={() => setIsScheduleSheetOpen(false)} style={st.sheetClose}>
              <View style={{ transform: [{ rotate: '45deg' }] }}>
                <ChevronRight size={18} color={tw.slate500} />
              </View>
            </Press>
          </View>

          <ScrollView style={{ marginTop: 16, maxHeight: SCREEN_H * 0.58 }} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
            {isScheduleLoading ? (
              [0, 1, 2].map((index) => (
                <Pulse key={index} style={st.skeleton}>
                  <View style={{ height: 12, width: '50%', borderRadius: 999, backgroundColor: tw.slate200 }} />
                  <View style={{ marginTop: 12, height: 10, width: '100%', borderRadius: 999, backgroundColor: tw.slate100 }} />
                  <View style={{ marginTop: 8, height: 10, width: '80%', borderRadius: 999, backgroundColor: tw.slate100 }} />
                </Pulse>
              ))
            ) : scheduledRides.length === 0 ? (
              <View style={st.emptyBox}>
                <View style={st.emptyIcon}>
                  <CalendarClock size={28} strokeWidth={1.8} color={tw.slate300} />
                </View>
                <Text style={[outfit(900), st.emptyTitle]}>No scheduled rides yet</Text>
                <Text style={[outfit(700), st.emptySub]}>Scheduled bookings will show here when they are assigned.</Text>
              </View>
            ) : (
              scheduledRides.map((ride) => (
                <Press key={ride.rideId} onPress={() => setSelectedScheduledRide(createScheduledRidePreview(ride))} scale={0.99} style={st.rideCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View style={st.rideIcon}>
                      <CalendarClock size={18} strokeWidth={2.2} color={tw.blue600} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={1} style={[outfit(900), st.rideTitle]}>
                            {ride.type === 'parcel' ? 'Scheduled delivery' : ride.type === 'intercity' ? 'Scheduled intercity ride' : 'Scheduled ride'}
                          </Text>
                          <Text style={[outfit(900), st.rideWhen]}>{formatScheduledDateTime(ride.scheduledAt).toUpperCase()}</Text>
                          <Text style={[outfit(900), st.rideCountdown]}>{getScheduledRideCountdown(ride.scheduledAt, scheduleNow)}</Text>
                        </View>
                        <View style={st.rideFare}>
                          <Text style={[outfit(900), st.rideFareText]}>{formatFareLabel(ride.fare || ride.baseFare).toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text numberOfLines={1} style={[outfit(700), st.rideLine, { marginTop: 12, color: tw.slate500 }]}>
                        {ride.user?.name || 'Customer'}{ride.user?.phone ? ` • ${ride.user.phone}` : ''}
                      </Text>
                      <Text numberOfLines={1} style={[outfit(700), st.rideLine, { marginTop: 8, color: tw.slate700 }]}>
                        Pickup: {ride.pickupAddress || 'Pickup point'}
                      </Text>
                      <Text numberOfLines={1} style={[outfit(700), st.rideLine, { marginTop: 4, color: tw.slate700 }]}>
                        Drop: {ride.dropAddress || 'Drop point'}
                      </Text>
                    </View>
                  </View>
                </Press>
              ))
            )}
          </ScrollView>
        </ScheduleSheet>
      ) : null}

      {/* Top floating UI */}
      <View pointerEvents="box-none" style={[st.topBar, { paddingTop: topPad }]}>
        <View style={st.topLeft}>
          <Press
            onPress={() => {
              loadScheduledRides();
              setIsScheduleSheetOpen(true);
            }}
            scale={0.9}
            style={st.roundBtn}
          >
            <CalendarClock size={18} color={tw.slate900} />
            {scheduledRideCount > 0 ? (
              <View style={[st.badge, { backgroundColor: tw.blue600 }]}>
                <Text style={[outfit(900), st.badgeText]}>{scheduledRideCount > 99 ? '99+' : scheduledRideCount}</Text>
              </View>
            ) : null}
          </Press>

          <Press onPress={() => navigate('/taxi/driver/notifications')} scale={0.9} style={st.roundBtn}>
            <Bell size={18} color={tw.slate900} />
            {notificationCount > 0 ? (
              <View style={[st.badge, { backgroundColor: tw.rose500 }]}>
                <Text style={[outfit(900), st.badgeText]}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
              </View>
            ) : null}
          </Press>
        </View>

        <View style={st.topCenter}>
          <Press
            disabled={isTogglingDuty}
            onPress={handleDutyToggle}
            scale={1}
            style={[st.duty, isOnline ? { backgroundColor: tw.emerald500, boxShadow: '0 10px 15px -3px rgba(16,185,129,0.2), 0 4px 6px -4px rgba(16,185,129,0.2)' } : { backgroundColor: tw.slate200, ...shadow('lg') }]}
          >
            <Animated.View style={[st.knob, { transform: [{ translateX: knobX }] }]}>
              <Power size={14} strokeWidth={3} color={isOnline ? tw.emerald500 : tw.slate400} />
            </Animated.View>
            <View style={st.dutyLabelWrap}>
              <Text style={[outfit(900), st.dutyLabel, isOnline ? { color: '#fff', marginRight: 24 } : { color: tw.slate400, marginLeft: 24 }]}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </Press>
        </View>

        <View style={st.topRight}>
          <Press onPress={() => navigate('/taxi/driver/wallet')} scale={0.95} style={st.walletPill}>
            <IndianRupee size={12} strokeWidth={3} color={tw.emerald400} />
            <Text style={[outfit(900), st.walletText]}>
              {Number(walletSummary.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Text>
          </Press>
        </View>
      </View>

      {walletNotice ? (
        <View style={[st.noticeWrap, { top: noticeTop }]}>
          <View style={[st.notice, { borderColor: walletNotice.tone === 'danger' ? tw.rose100 : tw.amber100 }]}>
            <View style={[st.noticeIcon, { backgroundColor: walletNotice.tone === 'danger' ? tw.rose50 : tw.amber50 }]}>
              <Wallet size={18} strokeWidth={2.6} color={walletNotice.tone === 'danger' ? tw.rose600 : tw.amber600} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text numberOfLines={1} style={[outfit(900), st.noticeTitle]}>{walletNotice.title}</Text>
                <View style={[st.noticeBadge, { backgroundColor: walletNotice.tone === 'danger' ? tw.rose50 : tw.amber50 }]}>
                  <Text style={[outfit(900), st.noticeBadgeText, { color: walletNotice.tone === 'danger' ? tw.rose600 : tw.amber600 }]}>
                    Rs {Number(walletSummary.balance || 0).toFixed(0)}
                  </Text>
                </View>
              </View>
              <Text style={[outfit(600), st.noticeMsg]}>{walletNotice.message}</Text>
            </View>
            <Press onPress={() => navigate('/taxi/driver/wallet')} scale={0.95} style={st.topUp}>
              <Text style={[outfit(900), st.topUpText]}>TOP UP</Text>
            </Press>
          </View>
        </View>
      ) : null}

      <View style={st.recenterWrap}>
        <Press onPress={recenterMap} scale={0.9} accessibilityLabel="Recenter map" style={st.recenter}>
          <Target size={20} strokeWidth={2.4} color={tw.slate900} />
        </Press>
      </View>

      {/* Bottom floating UI */}
      <View pointerEvents="box-none" style={[st.bottom, { bottom: bottomOffset }]}>
        {statusMessage ? <StatusToast message={statusMessage} /> : null}

        <Animated.View style={[st.summary, { opacity: summaryIntro, transform: [{ translateY: summaryIntro.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}>
          <Pressable
            onPress={toggleSummary}
            accessibilityState={{ expanded: isTodaySummaryExpanded }}
            accessibilityLabel={isTodaySummaryExpanded ? 'Collapse today summary' : 'Expand today summary'}
            style={st.summaryHead}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={[outfit(900), st.summaryTitle]}>TODAY&apos;S SUMMARY</Text>
              <Pulse style={st.summaryDot} />
            </View>
            <Animated.View style={[st.chevron, { transform: [{ rotate: chevron.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '90deg'] }) }] }]}>
              <ChevronRight size={16} strokeWidth={2.8} color={tw.slate500} />
            </Animated.View>
          </Pressable>

          {isTodaySummaryExpanded ? (
            <View style={st.summaryGrid}>
              {summaryItems.map(({ Icon, bg, color, value, label }) => (
                <View key={label} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={[st.summaryIcon, { backgroundColor: bg }]}>
                    <Icon size={18} strokeWidth={2.5} color={color} />
                  </View>
                  <Text style={[outfit(900), st.summaryValue]}>{value}</Text>
                  <Text style={[outfit(700), st.summaryLabel]}>{label}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </Animated.View>
      </View>

      <DriverBottomNav />
    </View>
  );
};

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  mapFallback: { flex: 1, backgroundColor: tw.slate200, alignItems: 'center', justifyContent: 'center' },
  mapFallbackDot: { width: 64, height: 64, borderRadius: 32, backgroundColor: tw.slate300, marginBottom: 16 },
  mapFallbackText: { fontSize: 14, lineHeight: 20, color: tw.slate500, textAlign: 'center' },

  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', zIndex: 40 },
  topLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  topCenter: { flex: 1, alignItems: 'center' },
  topRight: { flex: 1, alignItems: 'flex-end' },
  roundBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('md') },
  badge: { position: 'absolute', top: -4, right: -4, height: 16, minWidth: 16, paddingHorizontal: 4, borderRadius: 8, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  badgeText: { fontSize: 8, lineHeight: 10, color: '#fff' },
  duty: { width: 112, height: 40, borderRadius: 20, padding: 4, justifyContent: 'center' },
  knob: { position: 'absolute', left: 4, top: 4, width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  dutyLabelWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingLeft: 8 },
  dutyLabel: { fontSize: 9, letterSpacing: 0.9 },
  walletPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' },
  walletText: { fontSize: 13, letterSpacing: -0.325, color: '#fff' },

  noticeWrap: { position: 'absolute', left: 16, right: 16, zIndex: 40 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 21.6, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 14, paddingVertical: 12, boxShadow: '0 16px 36px rgba(15,23,42,0.14)' },
  noticeIcon: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  noticeTitle: { flexShrink: 1, fontSize: 14, lineHeight: 20, letterSpacing: -0.35, color: tw.slate950 },
  noticeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  noticeBadgeText: { fontSize: 10 },
  noticeMsg: { marginTop: 2, fontSize: 12, lineHeight: 16.5, color: tw.slate500 },
  topUp: { borderRadius: 999, backgroundColor: tw.slate950, paddingHorizontal: 12, paddingVertical: 8, ...shadow('sm') },
  topUpText: { fontSize: 10, letterSpacing: 1, color: '#fff' },

  recenterWrap: { position: 'absolute', right: 20, top: '50%', marginTop: -24, zIndex: 30 },
  recenter: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: tw.slate100, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px rgba(15,23,42,0.16)' },

  bottom: { position: 'absolute', left: 0, right: 0, padding: 24, paddingBottom: 16, zIndex: 60 },
  statusToast: { marginBottom: 16, alignSelf: 'center', maxWidth: 280, borderRadius: 16, backgroundColor: 'rgba(15,23,43,0.92)', paddingHorizontal: 16, paddingVertical: 12, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  statusText: { fontSize: 12, lineHeight: 19.5, color: '#fff', textAlign: 'center' },
  summary: { width: '100%', overflow: 'hidden', borderRadius: 28, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' },
  summaryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  summaryTitle: { fontSize: 13, letterSpacing: 1.3, color: tw.slate400 },
  summaryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: tw.emerald500 },
  chevron: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' },
  summaryGrid: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 20 },
  summaryIcon: { width: 40, height: 40, borderRadius: 16, marginBottom: 8, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { fontSize: 14, color: tw.slate900 },
  summaryLabel: { fontSize: 9, letterSpacing: -0.225, color: tw.slate400 },

  dialogRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dialogBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: alpha(tw.slate950, 0.45) },
  dialogCard: { width: Math.min(384, Dimensions.get('window').width - 40), borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', backgroundColor: '#fff', padding: 24, boxShadow: '0 24px 60px rgba(15,23,42,0.22)' },
  dlgTitle: { fontSize: 18, lineHeight: 28, letterSpacing: -0.45, color: tw.slate950 },
  dlgBody: { marginTop: 8, fontSize: 13, lineHeight: 21, color: tw.slate500 },
  dlgButtons: { marginTop: 20, flexDirection: 'row', gap: 12 },
  dlgBtn: { flex: 1, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dlgBtnGhost: { borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50 },
  dlgBtnText: { fontSize: 12 },
  selfieKicker: { fontSize: 10, letterSpacing: 1.8, color: tw.emerald500 },
  selfieTitle: { marginTop: 8, fontSize: 20, lineHeight: 28, letterSpacing: -0.5, color: tw.slate950 },
  selfieError: { marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: tw.rose100, backgroundColor: tw.rose50, paddingHorizontal: 12, paddingVertical: 8 },
  selfieErrorText: { fontSize: 12, color: tw.rose600 },

  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: alpha(tw.slate950, 0.45) },
  sheet: { maxHeight: SCREEN_H * 0.78, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 24, paddingTop: 20, boxShadow: '0 -24px 60px rgba(15,23,42,0.24)' },
  sheetHandle: { alignSelf: 'center', width: 56, height: 6, borderRadius: 999, backgroundColor: tw.slate200 },
  sheetHead: { marginTop: 16, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  sheetKicker: { fontSize: 10, letterSpacing: 2, color: tw.blue500 },
  sheetTitle: { marginTop: 4, fontSize: 22, lineHeight: 28, letterSpacing: -0.55, color: tw.slate950 },
  sheetSub: { marginTop: 4, fontSize: 12, color: tw.slate500 },
  sheetClose: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' },
  skeleton: { borderRadius: 22, borderWidth: 1, borderColor: tw.slate100, backgroundColor: tw.slate50, paddingHorizontal: 16, paddingVertical: 16 },
  emptyBox: { borderRadius: 24, borderWidth: 1, borderColor: tw.slate100, backgroundColor: tw.slate50, paddingHorizontal: 20, paddingVertical: 40, alignItems: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  emptyTitle: { marginTop: 16, fontSize: 16, color: tw.slate700 },
  emptySub: { marginTop: 4, fontSize: 12, color: tw.slate400, textAlign: 'center' },
  rideCard: { width: '100%', borderRadius: 22, borderWidth: 1, borderColor: tw.slate100, backgroundColor: tw.slate50, paddingHorizontal: 16, paddingVertical: 16, ...shadow('sm') },
  rideIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: tw.blue100, alignItems: 'center', justifyContent: 'center' },
  rideTitle: { fontSize: 14, color: tw.slate950 },
  rideWhen: { marginTop: 4, fontSize: 10, letterSpacing: 1.6, color: tw.blue500 },
  rideCountdown: { marginTop: 4, fontSize: 11, color: tw.emerald600 },
  rideFare: { borderRadius: 999, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4 },
  rideFareText: { fontSize: 9, letterSpacing: 0.45, color: tw.slate500 },
  rideLine: { fontSize: 11 },
});

export default DriverHome;
