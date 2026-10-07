import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Dimensions, LayoutAnimation, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useIsFocused } from 'expo-router';
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
import DriverBottomNav, { NAV_BAR_HEIGHT } from '../components/DriverBottomNav';
import { DT } from '../ui/dt';
import { CtaButton } from '../ui/Surface';
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
  // The web unmounts DriverHome when the driver leaves it; in the native stack it stays mounted underneath, so its
  // realtime / polling work is gated on the screen being focused and it re-syncs when focus returns.
  const isFocused = useIsFocused();
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
    if (!isFocused) {
      return undefined;
    }

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
  }, [isFocused, loadScheduledRides, refreshNotificationCount]);

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

  // Leaving the screen == the web's unmount: drop the open request, the accept bookkeeping and any dialog, so none of
  // it (a native Modal sits above every screen) lingers over the next route.
  useEffect(() => {
    if (isFocused) {
      return;
    }

    clearAcceptRecovery();
    clearRecoveryBurst();
    acceptingRideIdRef.current = '';
    setAcceptingRideId('');
    if (currentRequestRef.current) {
      stopRideRequestAlertSound();
    }
    setShowRequest(false);
    setCurrentRequest(null);
    setShowOfflineConfirm(false);
    setIsScheduleSheetOpen(false);
    setSelectedScheduledRide(null);
  }, [clearAcceptRecovery, clearRecoveryBurst, isFocused]);

  // Returning to the screen == the web's remount: hydrate the driver again (online flag, wallet, selfie, documents,
  // route booking) and resume an active trip if one is running.
  const skipFirstFocusRef = useRef(true);
  useEffect(() => {
    if (!isFocused) {
      return undefined;
    }
    if (skipFirstFocusRef.current) {
      skipFirstFocusRef.current = false;
      return undefined;
    }

    let active = true;
    setRouteBookingPreferences(readRouteBookingPreferences());
    setVehicleReapprovalPending(localStore.getItem(DRIVER_VEHICLE_REAPPROVAL_PENDING_KEY) === 'true');

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
        }
      } catch {
        if (active) {
          setStatusMessage('Could not restore driver status.');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [fetchActiveJob, hydrateDriverState, isFocused, openActiveJob]);

  useEffect(() => {
    if (!isFocused) {
      return undefined;
    }

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
  }, [isFocused, isOnline, refreshTodaySummary]);

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
    // Off screen (another route is on top): the web has unmounted DriverHome, so its listeners and heartbeat are gone
    // (the socket itself stays up for the global request listener).
    if (isOnline && !isFocused) {
      return undefined;
    }

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
  }, [clearAcceptRecovery, clearRecoveryBurst, emitOnlineLocationUpdate, fetchActiveJob, isFocused, isOnline, isOwnerManagedDriver, loadScheduledRides, navigate, refreshNotificationCount, scheduleRecoveryBurst]);

  // Recover the realtime session when the app returns to the foreground or the network comes back
  useEffect(() => {
    if (!isOnline || !isFocused) {
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
  }, [isFocused, isOnline, scheduleRecoveryBurst]);

  // Socket health check
  useEffect(() => {
    if (!isOnline || !isFocused) {
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
  }, [isFocused, isOnline, scheduleRecoveryBurst]);

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
  const bottomOffset = NAV_BAR_HEIGHT + Math.max(insets.bottom, 8) - 8;
  const noticeTop = 104 + (topPad - 48);

  const summaryItems = [
    { Icon: IndianRupee, bg: alpha(DT.success, 0.18), color: tw.emerald400, value: formatSummaryMoney(todaySummary.earnings), label: 'EARNINGS' },
    { Icon: Clock, bg: alpha(DT.gold, 0.2), color: DT.accent, value: `${dutyHours}h ${dutyMins}m`, label: 'ACTIVE' },
    { Icon: Navigation, bg: alpha(tw.blue400, 0.18), color: tw.blue400, value: formatSummaryDistance(todaySummary.distanceMeters), label: 'DISTANCE' },
    { Icon: BarChart2, bg: alpha(DT.success, 0.18), color: tw.emerald400, value: String(todaySummary.rides), label: 'RIDES' },
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
              <Text numberOfLines={1} style={[outfit(800), st.dlgBtnText, { color: DT.ink }]}>Stay online</Text>
            </Press>
            <Press
              onPress={() => {
                setShowOfflineConfirm(false);
                goOffline();
              }}
              scale={1}
              style={[st.dlgBtn, { backgroundColor: DT.danger, borderColor: DT.danger }]}
            >
              <Text numberOfLines={1} style={[outfit(800), st.dlgBtnText, { color: DT.onBrand }]}>Go offline</Text>
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
              <Text numberOfLines={1} style={[outfit(800), st.dlgBtnText, { color: DT.ink }]}>Cancel</Text>
            </Press>
            <Press
              disabled={selfieUploading}
              onPress={openSelfieCamera}
              scale={1}
              style={[st.dlgBtn, { paddingHorizontal: 12, backgroundColor: DT.cta, borderColor: DT.cta, ...shadow('md') }, selfieUploading && { opacity: 0.6 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Camera size={16} color={DT.ctaInk} />
                <Text numberOfLines={1} style={[outfit(800), st.dlgBtnText, { color: DT.ctaInk, flexShrink: 1 }]}>Take new selfie</Text>
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
                <ChevronRight size={18} color={DT.muted} />
              </View>
            </Press>
          </View>

          <ScrollView style={{ marginTop: 16, maxHeight: SCREEN_H * 0.58 }} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
            {isScheduleLoading ? (
              [0, 1, 2].map((index) => (
                <Pulse key={index} style={st.skeleton}>
                  <View style={{ height: 12, width: '50%', borderRadius: 999, backgroundColor: DT.border }} />
                  <View style={{ marginTop: 12, height: 10, width: '100%', borderRadius: 999, backgroundColor: tw.slate100 }} />
                  <View style={{ marginTop: 8, height: 10, width: '80%', borderRadius: 999, backgroundColor: tw.slate100 }} />
                </Pulse>
              ))
            ) : scheduledRides.length === 0 ? (
              <View style={st.emptyBox}>
                <View style={st.emptyIcon}>
                  <CalendarClock size={28} strokeWidth={1.8} color={DT.faint} />
                </View>
                <Text style={[outfit(900), st.emptyTitle]}>No scheduled rides yet</Text>
                <Text style={[outfit(700), st.emptySub]}>Scheduled bookings will show here when they are assigned.</Text>
              </View>
            ) : (
              scheduledRides.map((ride) => (
                <Press key={ride.rideId} onPress={() => setSelectedScheduledRide(createScheduledRidePreview(ride))} scale={0.99} style={st.rideCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View style={st.rideIcon}>
                      <CalendarClock size={18} strokeWidth={2.2} color={DT.brand} />
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
                      <Text numberOfLines={1} style={[outfit(700), st.rideLine, { marginTop: 12, color: DT.muted }]}>
                        {ride.user?.name || 'Customer'}{ride.user?.phone ? ` • ${ride.user.phone}` : ''}
                      </Text>
                      <Text numberOfLines={1} style={[outfit(700), st.rideLine, { marginTop: 8, color: DT.inkSoft }]}>
                        Pickup: {ride.pickupAddress || 'Pickup point'}
                      </Text>
                      <Text numberOfLines={1} style={[outfit(700), st.rideLine, { marginTop: 4, color: DT.inkSoft }]}>
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
            accessibilityLabel="Scheduled rides"
            style={st.roundBtn}
          >
            <CalendarClock size={20} color={DT.brand} />
            {scheduledRideCount > 0 ? (
              <View style={[st.badge, { backgroundColor: DT.brand }]}>
                <Text style={[outfit(900), st.badgeText]}>{scheduledRideCount > 99 ? '99+' : scheduledRideCount}</Text>
              </View>
            ) : null}
          </Press>

          <Press onPress={() => navigate('/taxi/driver/notifications')} scale={0.9} accessibilityLabel="Notifications" style={st.roundBtn}>
            <Bell size={20} color={DT.brand} />
            {notificationCount > 0 ? (
              <View style={[st.badge, { backgroundColor: DT.danger }]}>
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
            accessibilityLabel={isOnline ? 'Go offline' : 'Go online'}
            style={[st.duty, isOnline ? { backgroundColor: DT.success, borderColor: DT.successInk, ...shadow('lg') } : { backgroundColor: DT.card, borderColor: DT.border, ...shadow('lg') }]}
          >
            <Animated.View style={[st.knob, { transform: [{ translateX: knobX }] }]}>
              <Power size={16} strokeWidth={3} color={isOnline ? DT.successInk : DT.muted} />
            </Animated.View>
            <View style={st.dutyLabelWrap}>
              <Text style={[outfit(900), st.dutyLabel, isOnline ? { color: DT.onBrand, marginRight: 24 } : { color: DT.inkSoft, marginLeft: 24 }]}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </Press>
        </View>

        <View style={st.topRight}>
          <Press onPress={() => navigate('/taxi/driver/wallet')} scale={0.95} accessibilityLabel="Wallet balance" style={st.walletPill}>
            <IndianRupee size={14} strokeWidth={3} color={DT.accent} />
            <Text style={[outfit(900), st.walletText]}>
              {Number(walletSummary.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Text>
          </Press>
        </View>
      </View>

      {walletNotice ? (
        <View style={[st.noticeWrap, { top: noticeTop }]}>
          <View style={[st.notice, { borderColor: walletNotice.tone === 'danger' ? DT.danger : DT.warn }]}>
            <View style={[st.noticeIcon, { backgroundColor: walletNotice.tone === 'danger' ? DT.dangerSoft : DT.warnSoft }]}>
              <Wallet size={18} strokeWidth={2.6} color={walletNotice.tone === 'danger' ? DT.dangerInk : DT.warnInk} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text numberOfLines={1} style={[outfit(900), st.noticeTitle]}>{walletNotice.title}</Text>
                <View style={[st.noticeBadge, { backgroundColor: walletNotice.tone === 'danger' ? DT.dangerSoft : DT.warnSoft }]}>
                  <Text style={[outfit(900), st.noticeBadgeText, { color: walletNotice.tone === 'danger' ? DT.dangerInk : DT.warnInk }]}>
                    Rs {Number(walletSummary.balance || 0).toFixed(0)}
                  </Text>
                </View>
              </View>
              <Text style={[outfit(600), st.noticeMsg]}>{walletNotice.message}</Text>
            </View>
            <CtaButton title="Top up" onPress={() => navigate('/taxi/driver/wallet')} style={st.topUp} textStyle={st.topUpText} />
          </View>
        </View>
      ) : null}

      <View style={st.recenterWrap}>
        <Press onPress={recenterMap} scale={0.9} accessibilityLabel="Recenter map" style={st.recenter}>
          <Target size={22} strokeWidth={2.4} color={DT.brand} />
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
              <ChevronRight size={16} strokeWidth={2.8} color={DT.onBrandMuted} />
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
  root: { flex: 1, backgroundColor: DT.bgSoft, overflow: 'hidden' },
  mapFallback: { flex: 1, backgroundColor: DT.bgSoft, alignItems: 'center', justifyContent: 'center' },
  mapFallbackDot: { width: 64, height: 64, borderRadius: 32, backgroundColor: DT.border, marginBottom: 16 },
  mapFallbackText: { fontSize: 14, lineHeight: 20, color: DT.muted, textAlign: 'center' },

  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', zIndex: 40 },
  topLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  topCenter: { flex: 1, alignItems: 'center' },
  topRight: { flex: 1, alignItems: 'flex-end' },
  roundBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.card, alignItems: 'center', justifyContent: 'center', ...shadow('md') },
  badge: { position: 'absolute', top: -4, right: -4, height: 18, minWidth: 18, paddingHorizontal: 4, borderRadius: 9, borderWidth: 2, borderColor: DT.card, alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  badgeText: { fontSize: 9, lineHeight: 12, color: DT.onBrand },
  duty: { width: 112, height: 44, borderRadius: 22, borderWidth: 1, padding: 5, justifyContent: 'center' },
  knob: { position: 'absolute', left: 5, top: 5, width: 32, height: 32, borderRadius: 16, backgroundColor: DT.card, alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  dutyLabelWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingLeft: 8 },
  dutyLabel: { fontSize: 10, letterSpacing: 0.9, minWidth: 56 },
  walletPill: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: DT.brand, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: DT.gold, ...shadow('md') },
  walletText: { fontSize: 14, letterSpacing: -0.2, color: DT.onBrand },

  noticeWrap: { position: 'absolute', left: 16, right: 16, zIndex: 40 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: DT.radius.lg, borderWidth: 1, backgroundColor: DT.card, paddingHorizontal: 14, paddingVertical: 12, ...shadow('md') },
  noticeIcon: { width: 44, height: 44, borderRadius: DT.radius.md, alignItems: 'center', justifyContent: 'center' },
  noticeTitle: { flexShrink: 1, fontSize: 14, lineHeight: 20, color: DT.ink },
  noticeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  noticeBadgeText: { fontSize: 10, lineHeight: 14 },
  noticeMsg: { marginTop: 2, fontSize: 12, lineHeight: 16.5, color: DT.muted },
  topUp: { minHeight: 44, paddingHorizontal: 16, borderRadius: DT.radius.pill },
  topUpText: { fontSize: 13 },

  recenterWrap: { position: 'absolute', right: 20, top: '50%', marginTop: -24, zIndex: 30 },
  recenter: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.card, alignItems: 'center', justifyContent: 'center', ...shadow('md') },

  bottom: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 8, zIndex: 60 },
  statusToast: { marginBottom: 12, alignSelf: 'center', maxWidth: 300, borderRadius: DT.radius.md, backgroundColor: DT.brandDeep, borderWidth: 1, borderColor: DT.gold, paddingHorizontal: 16, paddingVertical: 12, ...shadow('lg') },
  statusText: { fontSize: 12, lineHeight: 18, color: DT.onBrand, textAlign: 'center' },
  summary: { width: '100%', overflow: 'hidden', borderRadius: DT.radius.xl, borderWidth: 1, borderColor: DT.darkSoft, backgroundColor: DT.dark, ...shadow('lg') },
  summaryHead: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  summaryTitle: { fontSize: 12, letterSpacing: 1.3, minWidth: 130, color: DT.gold },
  summaryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: DT.success },
  chevron: { width: 36, height: 36, borderRadius: 18, backgroundColor: DT.darkSoft, alignItems: 'center', justifyContent: 'center' },
  summaryGrid: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 20 },
  summaryIcon: { width: 44, height: 44, borderRadius: DT.radius.md, marginBottom: 8, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { fontSize: 15, lineHeight: 20, color: DT.onBrand },
  summaryLabel: { fontSize: 9, lineHeight: 12, letterSpacing: 0.5, minWidth: 52, textAlign: 'center', color: DT.onBrandMuted },

  dialogRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dialogBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: alpha(tw.slate950, 0.45) },
  dialogCard: { width: Math.min(384, Dimensions.get('window').width - 40), borderRadius: DT.radius.xl, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.card, padding: 24, ...shadow('lg') },
  dlgTitle: { fontSize: 20, lineHeight: 28, color: DT.ink },
  dlgBody: { marginTop: 8, fontSize: 13, lineHeight: 21, color: DT.muted },
  dlgButtons: { marginTop: 20, flexDirection: 'row', gap: 12 },
  dlgBtn: { flex: 1, minHeight: 52, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dlgBtnGhost: { borderColor: DT.border, backgroundColor: DT.card },
  dlgBtnText: { fontSize: 14, lineHeight: 20 },
  selfieKicker: { fontSize: 10, letterSpacing: 1.8, minWidth: 100, color: DT.successInk },
  selfieTitle: { marginTop: 8, fontSize: 20, lineHeight: 28, color: DT.ink },
  selfieError: { marginTop: 12, borderRadius: DT.radius.sm, borderWidth: 1, borderColor: DT.danger, backgroundColor: DT.dangerSoft, paddingHorizontal: 12, paddingVertical: 8 },
  selfieErrorText: { fontSize: 12, color: DT.dangerInk },

  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: alpha(tw.slate950, 0.45) },
  sheet: { maxHeight: SCREEN_H * 0.78, borderTopLeftRadius: DT.radius.xl, borderTopRightRadius: DT.radius.xl, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.bg, paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12, ...shadow('lg') },
  sheetHandle: { alignSelf: 'center', width: 48, height: 5, borderRadius: 999, backgroundColor: DT.border },
  sheetHead: { marginTop: 16, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  sheetKicker: { fontSize: 10, letterSpacing: 2, minWidth: 80, color: DT.gold },
  sheetTitle: { marginTop: 4, fontSize: 22, lineHeight: 28, color: DT.ink },
  sheetSub: { marginTop: 4, fontSize: 12, color: DT.muted },
  sheetClose: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.card, alignItems: 'center', justifyContent: 'center' },
  skeleton: { borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.card, paddingHorizontal: 16, paddingVertical: 16 },
  emptyBox: { borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.card, paddingHorizontal: 20, paddingVertical: 40, alignItems: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: DT.radius.lg, backgroundColor: DT.bgSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 16, fontSize: 16, color: DT.ink },
  emptySub: { marginTop: 4, fontSize: 12, color: DT.muted, textAlign: 'center' },
  rideCard: { width: '100%', borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.card, paddingHorizontal: 16, paddingVertical: 16, ...shadow('sm') },
  rideIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: DT.brandSoft, alignItems: 'center', justifyContent: 'center' },
  rideTitle: { fontSize: 14, color: DT.ink },
  rideWhen: { marginTop: 4, fontSize: 10, letterSpacing: 1.6, minWidth: 80, color: DT.info },
  rideCountdown: { marginTop: 4, fontSize: 11, color: DT.successInk },
  rideFare: { borderRadius: 999, backgroundColor: DT.successSoft, paddingHorizontal: 10, paddingVertical: 4 },
  rideFareText: { fontSize: 9, letterSpacing: 0.45, minWidth: 40, color: DT.successInk },
  rideLine: { fontSize: 11 },
});

export default DriverHome;
