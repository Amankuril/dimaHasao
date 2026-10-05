import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useNavigate } from '../../lib/webRouter';
import { localStore } from '../../lib/storage';
import { events } from '../../lib/events';
import api from '../api/client';
import { useSettings } from '../context/SettingsContext';
import { getLocalUserToken } from '../services/authService';
import {
  CURRENT_RIDE_UPDATED_EVENT,
  getCurrentRide,
  getCurrentRideSignature,
  isActiveCurrentRide,
  saveCurrentRide,
  clearCurrentRide,
} from '../services/currentRideService';
import {
  ACTIVE_RIDE_SYNC_INTERVAL_MS,
  DEFERRED_SECTION_DELAY_MS,
  FORCED_SYNC_COOLDOWN_MS,
  IDLE_RIDE_SYNC_INTERVALS_MS,
  defaultSettings,
  formatScheduledDateTime,
  getCurrentRideIcon,
  getScheduledCountdownLabel,
  isRentalCurrentRide,
  normalizeRentalCurrentRideSnapshot,
  unwrapApiPayload,
} from '../components/home/homeShared';

const ROUTE_PREFIX = '/taxi/user';
const USER_APP_SETTINGS_KEY = 'Appzeto 24:admin:user-app-settings';
const LAST_LOCATION_KEY = 'Appzeto 24:lastLocation';

const readSavedPickupAddress = () => {
  try {
    const saved = JSON.parse(localStore.getItem(LAST_LOCATION_KEY) || '{}');
    return String(saved?.address || '').trim() || 'Dima Hasao, Assam';
  } catch {
    return 'Dima Hasao, Assam';
  }
};

/** The logic of web pages/Home.jsx (settings, pickup pill, current-ride sync, promo autoplay, service routing). */
export function useTaxiHome() {
  const navigate = useNavigate();
  const { settings, loading: settingsLoading } = useSettings();
  const [uiSettings] = useState(() => {
    try {
      if (settings?.userHomeSettings && Object.keys(settings.userHomeSettings).length > 0) return settings.userHomeSettings;
      const saved = localStore.getItem(USER_APP_SETTINGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return defaultSettings;
  });
  const [liveUiSettings, setLiveUiSettings] = useState(uiSettings);

  useEffect(() => {
    if (settings?.userHomeSettings && Object.keys(settings.userHomeSettings).length > 0) {
      setLiveUiSettings((prev) => (JSON.stringify(prev) === JSON.stringify(settings.userHomeSettings) ? prev : settings.userHomeSettings));
    }
  }, [settings?.userHomeSettings]);

  const [isAllServicesOpen, setIsAllServicesOpen] = useState(false);
  const [activeServices, setActiveServices] = useState([]);
  const [pickupAddress, setPickupAddress] = useState(readSavedPickupAddress);
  const [isLocationLoading, setIsLocationLoading] = useState(() => {
    try {
      const saved = JSON.parse(localStore.getItem(LAST_LOCATION_KEY) || '{}');
      return !saved?.address;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const handleLocationUpdate = () => setPickupAddress(readSavedPickupAddress());
    const handleLocationStatus = (e) => setIsLocationLoading(e.detail === 'loading');
    events.on('Appzeto 24:location-updated', handleLocationUpdate);
    events.on('Appzeto 24:location-status', handleLocationStatus);
    return () => {
      events.off('Appzeto 24:location-updated', handleLocationUpdate);
      events.off('Appzeto 24:location-status', handleLocationStatus);
    };
  }, []);

  const [currentRide, setCurrentRide] = useState(() => {
    const ride = getCurrentRide();
    return isActiveCurrentRide(ride) ? ride : null;
  });
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [showDeferredSections, setShowDeferredSections] = useState(false);
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  const [isHoveringPromo, setIsHoveringPromo] = useState(false);
  const currentRideRef = useRef(currentRide);
  const lastSyncAtRef = useRef(0);
  const consecutiveIdleMissesRef = useRef(0);
  const lastRideSignatureRef = useRef(getCurrentRideSignature(currentRide));

  const persistCurrentRide = (ride) => {
    const normalizedRide = isActiveCurrentRide(ride) ? ride : null;
    const nextSignature = getCurrentRideSignature(normalizedRide);
    if (lastRideSignatureRef.current === nextSignature) return;
    lastRideSignatureRef.current = nextSignature;
    setCurrentRide(normalizedRide);
    if (normalizedRide) saveCurrentRide(normalizedRide);
    else clearCurrentRide();
  };

  useEffect(() => {
    currentRideRef.current = currentRide;
    lastRideSignatureRef.current = getCurrentRideSignature(currentRide);
  }, [currentRide]);

  const rawBanners = liveUiSettings?.promos || defaultSettings.promos;
  const promoBanners = useMemo(() => {
    if (!Array.isArray(rawBanners)) return [];
    return rawBanners.filter((b) => {
      const imageSrc = b.uploadedImage || b.imageUrl || b.image || b.bannerImage || b.thumbnail || b.url;
      return b.status !== false && b.status !== 'inactive' && imageSrc;
    });
  }, [rawBanners]);

  useEffect(() => {
    setCurrentPromoIndex(0);
  }, [promoBanners.length]);

  useEffect(() => {
    if (!promoBanners || promoBanners.length <= 1) return undefined;
    if (isHoveringPromo) return undefined;
    const interval = setInterval(() => {
      setCurrentPromoIndex((prev) => (prev + 1) % promoBanners.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [promoBanners.length, isHoveringPromo]);

  const handleServiceClick = (service) => {
    const cleanRoute = (route) => {
      if (!route) return '/taxi/user/ride/select-location';
      if (['/delivery', '/rental', '/bus', '/truck', '/self-drive'].includes(route)) return '/taxi/user/ride/select-location';
      return route;
    };

    const targetRoute = service.actionRoute || service.route;
    if (targetRoute === 'ALL_SERVICES_MODAL') {
      setIsAllServicesOpen(true);
      return;
    }

    if (targetRoute && targetRoute.trim() !== '') {
      setIsAllServicesOpen(false);
      let vehicleType = '';
      const tName = String(service.name || service.label || service.title || '').toLowerCase();
      if (tName.includes('bike') || tName.includes('moto')) vehicleType = 'bike';
      else if (tName.includes('auto')) vehicleType = 'auto';
      else if (tName.includes('cab') || tName.includes('taxi') || tName.includes('car') || tName === 'book now' || tName === 'ride') vehicleType = 'cab';

      if (vehicleType) {
        localStore.setItem('selectedVehicleType', vehicleType);
        navigate(`/taxi/user/ride/select-vehicle?vehicleType=${vehicleType}`, { state: { selectedCategory: vehicleType } });
      } else {
        localStore.removeItem('selectedVehicleType');
        navigate(cleanRoute(targetRoute), { state: { selectedCategory: vehicleType } });
      }
      return;
    }

    const name = String(service.name || service.label || service.title || '').toLowerCase();
    const serviceType = String(service.service_type || service.serviceType || service.moduleService || '').toLowerCase();
    setIsAllServicesOpen(false);

    const definedPath = service.path;
    if (definedPath && definedPath.trim() !== '') {
      let vehicleType = '';
      if (name.includes('bike') || name.includes('moto')) vehicleType = 'bike';
      else if (name.includes('auto')) vehicleType = 'auto';
      else if (name.includes('cab') || name.includes('taxi') || name.includes('car') || name === 'book now' || name === 'ride') vehicleType = 'cab';

      if (vehicleType) {
        localStore.setItem('selectedVehicleType', vehicleType);
        navigate(`/taxi/user/ride/select-vehicle?vehicleType=${vehicleType}`, { state: { selectedCategory: vehicleType } });
      } else {
        localStore.removeItem('selectedVehicleType');
        navigate(cleanRoute(definedPath), { state: { selectedCategory: vehicleType } });
      }
      return;
    }

    if (name.includes('outstation') || name.includes('intercity') || serviceType.includes('intercity')) {
      navigate('/taxi/user/intercity');
      return;
    }
    if (name.includes('truck')) {
      navigate('/taxi/user/ride/select-location');
      return;
    }

    let selectedCategory = '';
    if (name.includes('bike') || name.includes('moto')) selectedCategory = 'bike';
    else if (name.includes('auto')) selectedCategory = 'auto';
    else if (name.includes('cab') || name.includes('taxi') || name.includes('car')) selectedCategory = 'cab';
    navigate('/taxi/user/ride/select-location', { state: { selectedCategory } });
  };

  const shouldTickClock =
    String(currentRide?.serviceType || '').toLowerCase() === 'rental' ||
    Number.isFinite(currentRide?.scheduledAt ? new Date(currentRide.scheduledAt).getTime() : NaN);

  useEffect(() => {
    if (!shouldTickClock) return undefined;
    const timer = setInterval(() => setClockNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [shouldTickClock]);

  useEffect(() => {
    const timer = setTimeout(() => setShowDeferredSections(true), DEFERRED_SECTION_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const refreshCurrentRide = () => {
      const ride = getCurrentRide();
      if (String(ride?.serviceType || '').toLowerCase() === 'rental') {
        const normalizedRentalRide = normalizeRentalCurrentRideSnapshot(ride, currentRideRef.current || {});
        const nextRide = isActiveCurrentRide(normalizedRentalRide) ? normalizedRentalRide : null;
        lastRideSignatureRef.current = getCurrentRideSignature(nextRide);
        setCurrentRide(nextRide);
        return;
      }
      const nextRide = isActiveCurrentRide(ride) ? ride : null;
      lastRideSignatureRef.current = getCurrentRideSignature(nextRide);
      setCurrentRide(nextRide);
    };

    refreshCurrentRide();
    events.on(CURRENT_RIDE_UPDATED_EVENT, refreshCurrentRide);

    let cancelled = false;
    let syncTimer = null;
    let syncInFlight = false;

    const scheduleNextSync = () => {
      if (cancelled) return;
      const nextInterval =
        currentRideRef.current && !isRentalCurrentRide(currentRideRef.current)
          ? ACTIVE_RIDE_SYNC_INTERVAL_MS
          : IDLE_RIDE_SYNC_INTERVALS_MS[Math.min(consecutiveIdleMissesRef.current, IDLE_RIDE_SYNC_INTERVALS_MS.length - 1)];
      syncTimer = setTimeout(() => {
        syncCurrentRide();
      }, nextInterval);
    };

    const syncCurrentRide = async (reason = 'timer') => {
      if (cancelled || syncInFlight) {
        scheduleNextSync();
        return;
      }
      if (reason === 'timer' && AppState.currentState !== 'active') {
        scheduleNextSync();
        return;
      }
      if (reason === 'focus' && Date.now() - lastSyncAtRef.current < FORCED_SYNC_COOLDOWN_MS) {
        scheduleNextSync();
        return;
      }

      syncInFlight = true;
      lastSyncAtRef.current = Date.now();
      try {
        const token = getLocalUserToken();
        if (!token) {
          persistCurrentRide(null);
          currentRideRef.current = null;
          consecutiveIdleMissesRef.current = 0;
          return;
        }
        if (isRentalCurrentRide(currentRideRef.current)) {
          consecutiveIdleMissesRef.current = 0;
          return;
        }

        let rideData = null;
        try {
          rideData = unwrapApiPayload(await api.get('/rides/active/me'));
        } catch (error) {
          const status = Number(error?.status || error?.response?.status || 0);
          if (status !== 404) throw error;
        }

        if (rideData?._id || rideData?.rideId) {
          const normalizedRide = {
            rideId: rideData._id || rideData.rideId,
            pickup: rideData.pickupAddress || rideData.pickup,
            drop: rideData.dropAddress || rideData.drop,
            pickupCoords: rideData.pickupLocation?.coordinates || rideData.pickupCoords || null,
            dropCoords: rideData.dropLocation?.coordinates || rideData.dropCoords || null,
            fare: rideData.fare,
            baseFare: rideData.baseFare || rideData.fare || 0,
            status: rideData.status,
            liveStatus: rideData.liveStatus,
            serviceType: rideData.serviceType,
            scheduledAt: rideData.scheduledAt || null,
            acceptedAt: rideData.acceptedAt || null,
            arrivedAt: rideData.arrivedAt || null,
            estimatedDistanceMeters: rideData.estimatedDistanceMeters || 0,
            estimatedDurationMinutes: rideData.estimatedDurationMinutes || 0,
            paymentMethod: rideData.paymentMethod || 'Cash',
            pricingSnapshot: rideData.pricingSnapshot || null,
            otp: rideData.otp || '',
            driver: rideData.driverId || rideData.driver,
            vehicleIconUrl: rideData.vehicleIconUrl,
            vehicleIconType: rideData.vehicleIconType,
          };
          if (isActiveCurrentRide(normalizedRide)) {
            if (cancelled) return;
            consecutiveIdleMissesRef.current = 0;
            persistCurrentRide(normalizedRide);
            currentRideRef.current = normalizedRide;
            return;
          }
        }

        if (cancelled) return;
        consecutiveIdleMissesRef.current = Math.min(consecutiveIdleMissesRef.current + 1, IDLE_RIDE_SYNC_INTERVALS_MS.length - 1);
        persistCurrentRide(null);
        currentRideRef.current = null;
      } finally {
        syncInFlight = false;
        scheduleNextSync();
      }
    };

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncCurrentRide('focus');
    });

    syncCurrentRide('mount');

    return () => {
      cancelled = true;
      if (syncTimer) clearTimeout(syncTimer);
      appStateSub.remove();
      events.off(CURRENT_RIDE_UPDATED_EVENT, refreshCurrentRide);
    };
  }, []);

  const driverName = currentRide?.driver?.name || 'Captain';
  const serviceType = String(currentRide?.serviceType || currentRide?.type || 'ride').toLowerCase();
  const vehicleLabel =
    currentRide?.driver?.vehicle || currentRide?.driver?.vehicleType || (serviceType === 'parcel' ? 'Parcel' : serviceType === 'rental' ? 'Rental' : 'Taxi');
  const currentRideIcon = getCurrentRideIcon(currentRide);
  const trackingPath =
    serviceType === 'parcel' ? `${ROUTE_PREFIX}/parcel/tracking` : serviceType === 'rental' ? `${ROUTE_PREFIX}/rental/confirmed` : `${ROUTE_PREFIX}/ride/tracking`;
  const rideStage = String(currentRide?.liveStatus || currentRide?.status || 'accepted').toLowerCase();
  const hasAssignedDriver = Boolean(currentRide?.driver?._id || currentRide?.driver?.id || currentRide?.driver?.name);
  const scheduledTimestamp = currentRide?.scheduledAt ? new Date(currentRide.scheduledAt).getTime() : NaN;
  const isScheduledRide = Number.isFinite(scheduledTimestamp);
  const isScheduledUpcoming = isScheduledRide && scheduledTimestamp > clockNow;
  const isScheduledAcceptedRide =
    ['ride', 'intercity'].includes(serviceType) && isScheduledUpcoming && hasAssignedDriver && ['accepted', 'arriving'].includes(rideStage);
  const scheduledDateLabel = formatScheduledDateTime(currentRide?.scheduledAt);
  const scheduledCountdown = getScheduledCountdownLabel(currentRide?.scheduledAt, clockNow);

  return {
    navigate,
    routePrefix: ROUTE_PREFIX,
    settingsLoading,
    uiSettings: liveUiSettings,
    isAllServicesOpen,
    setIsAllServicesOpen,
    activeServices,
    setActiveServices,
    pickupAddress,
    isLocationLoading,
    currentRide,
    showDeferredSections,
    promoBanners,
    currentPromoIndex,
    setCurrentPromoIndex,
    isHoveringPromo,
    setIsHoveringPromo,
    handleServiceClick,
    driverName,
    serviceType,
    vehicleLabel,
    currentRideIcon,
    trackingPath,
    isScheduledAcceptedRide,
    scheduledDateLabel,
    scheduledCountdown,
  };
}
