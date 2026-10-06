import { localStore } from '../../lib/storage';
import { calculateDistanceMeters } from './driverRideJobs';

/* Module-level helpers of Taxi/modules/driver/pages/DriverHome.jsx (data shaping, wallet rules, local driver cache). */
export const DEFAULT_MAP_CENTER = { lat: 22.7196, lng: 75.8577 };
export const ONLINE_LOCATION_EMIT_MIN_DISTANCE_METERS = 25;
export const ONLINE_LOCATION_EMIT_MIN_INTERVAL_MS = 12000;

export const toLatLng = (coordinates) => {
  const [lng, lat] = coordinates || [];
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return DEFAULT_MAP_CENTER;
  return { lat: Number(lat), lng: Number(lng) };
};

export const formatDistanceLabel = (meters) => {
  const value = Number(meters || 0);
  if (!Number.isFinite(value) || value <= 0) return 'Nearby';
  if (value < 1000) return `${Math.round(value)} m`;
  return `${(value / 1000).toFixed(1)} km`;
};

export const formatFareLabel = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 'Rs 0';
  return `Rs ${amount}`;
};

export const normalizeTodaySummary = (value = {}) => ({
  dateKey: String(value?.dateKey || ''),
  earnings: Number(value?.earnings || 0),
  distanceMeters: Number(value?.distanceMeters || 0),
  rides: Number(value?.rides || 0),
  activeSeconds: Math.max(0, Math.round(Number(value?.activeSeconds || 0))),
});

export const formatSummaryMoney = (value) => `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;

export const formatSummaryDistance = (meters) => {
  const value = Number(meters || 0);
  if (!Number.isFinite(value) || value <= 0) return '0 km';
  const km = value / 1000;
  return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
};

export const isOwnerManagedDriverProfile = (driver = {}) => {
  const accountType = String(
    driver?.accountType || driver?.onboarding?.accountType || driver?.onboarding?.role || driver?.role || '',
  ).toLowerCase();

  return Boolean(
    driver?.owner_id
      || driver?.ownerId
      || driver?.fleet_id
      || driver?.fleetId
      || driver?.owner?._id
      || driver?.onboarding?.owner_id
      || ['fleet_driver', 'fleet_drivers'].includes(accountType),
  );
};

export const getWalletAlertState = (wallet = {}, { ignoreRestrictions = false } = {}) => {
  const balance = Number(wallet.balance || 0);
  const cashLimit = Math.max(0, Number(wallet.cashLimit || 0));
  const minimumBalanceForOrders = Number(wallet.minimumBalanceForOrders || 0);
  // Two different admin settings, and the driver needs both: the balance that lets them go online, and the
  // smallest single top-up allowed.
  const minimumTopUpAmount = Math.max(0, Number(wallet.minimumTopUpAmount || 0));
  const cashLimitUsed = Math.max(0, balance < 0 ? Math.abs(balance) : 0);
  const remainingCashLimit = Math.max(0, cashLimit - cashLimitUsed);
  const warningThreshold = cashLimit > 0 ? Math.min(cashLimit, Math.max(50, cashLimit * 0.15)) : 0;
  const belowMinimumBalance = balance < minimumBalanceForOrders;
  const cashLimitExceeded = cashLimit > 0 && remainingCashLimit <= 0;
  const rawBlocked = Boolean(wallet.isBlocked) || belowMinimumBalance || cashLimitExceeded;
  const isBlocked = ignoreRestrictions ? false : rawBlocked;
  const isWarning = ignoreRestrictions ? false : !isBlocked && cashLimitUsed > 0 && remainingCashLimit <= warningThreshold;

  return {
    balance,
    cashLimit,
    minimumBalanceForOrders,
    minimumTopUpAmount,
    cashLimitUsed,
    remainingCashLimit,
    warningThreshold,
    belowMinimumBalance: ignoreRestrictions ? false : belowMinimumBalance,
    cashLimitExceeded: ignoreRestrictions ? false : cashLimitExceeded,
    isBlocked,
    isWarning,
  };
};

export const createScheduledRidePreview = (ride) => ({
  rideId: ride.rideId,
  type: ride.type || ride.serviceType || 'ride',
  fare: formatFareLabel(ride.fare || ride.baseFare),
  distance: formatDistanceLabel(ride.estimatedDistanceMeters),
  payment: ride.paymentMethod || 'cash',
  pickup: ride.pickupAddress || 'Pickup point',
  drop: ride.dropAddress || 'Drop point',
  scheduledAt: ride.scheduledAt || null,
  customer: {
    name: ride.user?.name || 'Customer',
    phone: ride.user?.phone || '',
  },
  driverId: ride.driverId || '',
  isAssignedToCurrentDriver: Boolean(ride.isAssignedToCurrentDriver),
  raw: {
    fare: ride.fare,
    baseFare: ride.baseFare,
    bookingMode: ride.bookingMode || 'normal',
    parcel: ride.parcel || null,
    intercity: ride.intercity || null,
    user: ride.user || null,
    pickupAddress: ride.pickupAddress || '',
    dropAddress: ride.dropAddress || '',
    scheduledAt: ride.scheduledAt || null,
    ride,
  },
});

export const calculateCoordinateDistanceMeters = (startCoordinates, endCoordinates) => {
  if (!Array.isArray(startCoordinates) || !Array.isArray(endCoordinates)) return Number.POSITIVE_INFINITY;
  return calculateDistanceMeters({ coordinates: startCoordinates }, { coordinates: endCoordinates });
};

export const readStoredDriverInfo = () => {
  try {
    return JSON.parse(localStore.getItem('driverInfo') || '{}');
  } catch {
    return {};
  }
};

export const persistStoredDriverInfo = (updates = {}) => {
  const current = readStoredDriverInfo();
  const next = { ...current, ...updates };
  localStore.setItem('driverInfo', JSON.stringify(next));
  return next;
};

export const readStoredDriverCoords = () => {
  const stored = readStoredDriverInfo();
  const coordinates = stored?.location?.coordinates || stored?.coordinates;

  if (Array.isArray(coordinates) && coordinates.length === 2) {
    const [lng, lat] = coordinates;
    if (Number.isFinite(Number(lng)) && Number.isFinite(Number(lat))) return [Number(lng), Number(lat)];
  }
  return null;
};

export const getDocumentExpiryValue = (document = {}) => (
  document?.expiryDate || document?.expiry_date || document?.expiry || document?.expiresAt || null
);

export const getDocumentReviewStatus = (document = {}) => String(
  document?.approvalStatus || document?.reviewStatus || document?.status || '',
).trim().toLowerCase();

export const getDocumentReason = (document = {}) => String(
  document?.comment || document?.remarks || document?.reason || document?.admin_comment || document?.rejection_reason || '',
).trim();

export const isExpiredDateValue = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
};

export const DRIVER_ROUTE_BOOKING_STORAGE_KEY = 'driver_route_booking_preferences';
export const DRIVER_VEHICLE_REAPPROVAL_PENDING_KEY = 'driver_vehicle_reapproval_pending';
export const getTodaySelfieKey = () => new Date().toISOString().slice(0, 10);

export const readRouteBookingPreferences = () => {
  try {
    const raw = localStore.getItem(DRIVER_ROUTE_BOOKING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { enabled: false, coordinates: null, label: '' };
  } catch {
    return { enabled: false, coordinates: null, label: '' };
  }
};

export const writeRouteBookingPreferences = (nextValue) => {
  localStore.setItem(DRIVER_ROUTE_BOOKING_STORAGE_KEY, JSON.stringify(nextValue));
  return nextValue;
};

export const normalizeRouteBookingPreferences = (routeBooking = null) => {
  const coordinates = Array.isArray(routeBooking?.coordinates) && routeBooking.coordinates.length === 2 ? routeBooking.coordinates : null;

  return {
    enabled: Boolean(routeBooking?.enabled && coordinates),
    coordinates,
    label: String(routeBooking?.label || '').trim(),
    updatedAt: routeBooking?.updatedAt || null,
  };
};

export const isDriverVehicleApprovalPending = (driver = {}) => driver?.approve === false || String(driver?.status || '').toLowerCase() === 'pending';

export const hasSelfieForToday = (onlineSelfie = null) => (
  String(onlineSelfie?.forDate || '').trim() === getTodaySelfieKey() && Boolean(String(onlineSelfie?.imageUrl || '').trim())
);
