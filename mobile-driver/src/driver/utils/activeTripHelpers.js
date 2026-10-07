import simplify from 'simplify-js';
import { localStore } from '../../lib/storage';
import { BACKEND_ORIGIN } from '../api/runtimeConfig';

// Web: the helper block at the top of Taxi/modules/driver/pages/ActiveTrip.jsx (storage keys, phase and
// snapshot persistence, route maths, formatters, commission and payment-collection builders).
export const autoIcon = require('../../../assets/images/auto.webp');
export const bikeIcon = require('../../../assets/images/bike.webp');
export const carIcon = require('../../../assets/images/car.webp');

export const DEFAULT_CENTER = { lat: 22.7196, lng: 75.8577 };
export const DEFAULT_DRIVER_COORDS = [75.8577, 22.7196];
export const ARRIVAL_RADIUS_METERS = 100;
export const ROUTE_SIMPLIFY_TOLERANCE = 0.00008;
export const ROUTE_OFF_PATH_METERS = 45;
export const ROUTE_REFRESH_DEBOUNCE_MS = 2500;
export const DRIVER_LOCATION_EMIT_MIN_DISTANCE_METERS = 12;
export const DRIVER_LOCATION_EMIT_MIN_INTERVAL_MS = 3000;
export const toLatLng = (coordinates, fallback = DEFAULT_CENTER) => {
    const [lng, lat] = coordinates || [];

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
        return { lat: Number(lat), lng: Number(lng) };
    }

    return fallback;
};

export const readCoordinatePair = (...sources) => {
    for (const source of sources) {
        if (Array.isArray(source) && source.length >= 2) {
            const [lng, lat] = source;
            if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
                return [Number(lng), Number(lat)];
            }
        }

        const nestedCoords = source?.coordinates;
        if (Array.isArray(nestedCoords) && nestedCoords.length >= 2) {
            const [lng, lat] = nestedCoords;
            if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
                return [Number(lng), Number(lat)];
            }
        }

        const lat = Number(source?.lat ?? source?.latitude);
        const lng = Number(source?.lng ?? source?.longitude ?? source?.lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return [lng, lat];
        }
    }

    return null;
};

export const createOffsetPosition = (position, latOffset = -0.0045, lngOffset = -0.0035) => ({
    lat: Number(position?.lat ?? DEFAULT_CENTER.lat) + latOffset,
    lng: Number(position?.lng ?? DEFAULT_CENTER.lng) + lngOffset,
});

export const arePositionsNearlyEqual = (first, second, threshold = 0.0002) => (
    Math.abs(Number(first?.lat ?? 0) - Number(second?.lat ?? 0)) < threshold &&
    Math.abs(Number(first?.lng ?? 0) - Number(second?.lng ?? 0)) < threshold
);

export const getAreaName = (address, fallback) => {
    const cleanAddress = String(address || '').trim();

    if (!cleanAddress) {
        return fallback;
    }

    return cleanAddress
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(', ') || fallback;
};

export const formatAddressFromPoint = (point, fallback) => {
    const coordinates = readCoordinatePair(point);

    if (!coordinates) {
        return fallback;
    }

    const [lng, lat] = coordinates;
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

export const normalizeTripType = (job = {}) => {
    const value = String(job.type || job.serviceType || 'ride').toLowerCase();
    if (value === 'parcel') return 'parcel';
    if (value === 'intercity') return 'intercity';
    return 'ride';
};

export const getTripTitle = (type) => {
    if (type === 'parcel') return 'Delivery';
    if (type === 'intercity') return 'Intercity Ride';
    return 'Taxi Ride';
};

export const cleanPhoneNumber = (phone) => String(phone || '').replace(/[^\d+]/g, '');

export const buildFallbackRoute = (origin, destination) => [origin, destination];
export const unwrapApiPayload = (response) => response?.data?.data || response?.data || response;
export const hexToRgba = (hex, alpha = 1) => {
    const sanitized = String(hex || '').replace('#', '');

    if (sanitized.length !== 6) {
        return `rgba(15, 23, 42, ${alpha})`;
    }

    const red = Number.parseInt(sanitized.slice(0, 2), 16);
    const green = Number.parseInt(sanitized.slice(2, 4), 16);
    const blue = Number.parseInt(sanitized.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export const getJobRideId = (job = {}) => String(job.rideId || job.id || job._id || job.requestId || '').trim();
export const ACTIVE_TRIP_HYDRATION_RETRY_DELAYS_MS = [0, 700, 1500, 2500, 4000];

export const resolveVehiclePreviewIcon = (iconUrl = '', fallback = carIcon) => {
    const raw = String(iconUrl || '').trim();

    if (!raw) {
        return fallback;
    }

    if (/^(https?:|data:image\/|blob:)/.test(raw)) {
        return raw;
    }

    if (raw.startsWith('/')) {
        return `${BACKEND_ORIGIN}${raw}`;
    }

    if (/^(uploads\/|images\/)/.test(raw)) {
        return `${BACKEND_ORIGIN}/${raw}`;
    }

    return raw;
};

export const getActiveTripVehicleIcon = (ride = {}, driver = {}) => {
    const customIcon = String(
        ride?.vehicleIconUrl ||
        ride?.vehicle?.vehicleIconUrl ||
        ride?.vehicle?.icon ||
        driver?.vehicleIconUrl ||
        driver?.map_icon ||
        driver?.icon ||
        '',
    ).trim();

    if (customIcon) {
        return resolveVehiclePreviewIcon(customIcon, carIcon);
    }

    const iconType = String(
        ride?.vehicleIconType ||
        driver?.vehicleIconType ||
        driver?.vehicleType ||
        '',
    ).toLowerCase();

    if (iconType.includes('bike')) return bikeIcon;
    if (iconType.includes('auto')) return autoIcon;
    if (iconType.includes('car')) return carIcon;

    return carIcon;
};

export const getActiveTripPhaseKey = (id) => (id ? `driverActiveTripPhase:${id}` : '');
export const getActiveTripUiStateKey = (id) => (id ? `driverActiveTripUiState:${id}` : '');
export const ACTIVE_TRIP_SESSION_KEY = 'driverActiveTripSnapshot';

export const readStoredTripPhase = (id) => {
    const key = getActiveTripPhaseKey(id);
    if (!key) return '';

    try {
        return localStore.getItem(key) || '';
    } catch {
        return '';
    }
};

export const writeStoredTripPhase = (id, nextPhase) => {
    const key = getActiveTripPhaseKey(id);
    if (!key) return;

    try {
        localStore.setItem(key, nextPhase);
    } catch {
        // Local storage can be blocked in private contexts; trip still works without it.
    }
};

export const clearStoredTripPhase = (id) => {
    const key = getActiveTripPhaseKey(id);
    if (!key) return;

    try {
        localStore.removeItem(key);
    } catch {
        // No-op.
    }
};

export const readStoredTripUiState = (id) => {
    const key = getActiveTripUiStateKey(id);
    if (!key) return null;

    try {
        const raw = localStore.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const writeStoredTripUiState = (id, nextState) => {
    const key = getActiveTripUiStateKey(id);
    if (!key) return;

    try {
        localStore.setItem(key, JSON.stringify(nextState));
    } catch {
        // Ignore storage failures and continue with in-memory state.
    }
};

export const clearStoredTripUiState = (id) => {
    const key = getActiveTripUiStateKey(id);
    if (!key) return;

    try {
        localStore.removeItem(key);
    } catch {
        // No-op.
    }
};

export const readStoredActiveTripSnapshot = () => {
    try {
        const raw = localStore.getItem(ACTIVE_TRIP_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const writeStoredActiveTripSnapshot = (snapshot) => {
    try {
        localStore.setItem(ACTIVE_TRIP_SESSION_KEY, JSON.stringify(snapshot));
    } catch {
        // Ignore storage failures.
    }
};

export const clearStoredActiveTripSnapshot = () => {
    try {
        localStore.removeItem(ACTIVE_TRIP_SESSION_KEY);
    } catch {
        // No-op.
    }
};

export const isSnapshotForRide = (snapshot, rideId = '') => {
    const snapshotRideId = getJobRideId(snapshot?.request?.raw || snapshot?.request || snapshot || {});
    const normalizedRideId = String(rideId || '').trim();

    if (!snapshotRideId || !normalizedRideId) {
        return false;
    }

    return snapshotRideId === normalizedRideId;
};

export const readStoredDriverCoords = () => {
    try {
        const stored = JSON.parse(localStore.getItem('driverInfo') || '{}');
        const coordinates = stored?.location?.coordinates || stored?.coordinates;

        if (Array.isArray(coordinates) && coordinates.length === 2) {
            const [lng, lat] = coordinates;
            if (Number.isFinite(Number(lng)) && Number.isFinite(Number(lat))) {
                return [Number(lng), Number(lat)];
            }
        }
    } catch {
        // Ignore storage parsing issues and fall back to live geolocation.
    }

    return null;
};

export const resolvePhaseFromJob = (job = {}) => {
    const rideId = getJobRideId(job);
    const explicitPhase = String(job.phase || '').toLowerCase();
    const storedPhase = readStoredTripPhase(rideId);
    const liveStatus = String(job.liveStatus || job.status || '').toLowerCase();

    if (liveStatus === 'cancelled' || liveStatus === 'canceled') {
        return 'cancelled';
    }

    if (['to_pickup', 'otp_verification', 'in_trip', 'payment_confirm', 'review'].includes(explicitPhase)) {
        return explicitPhase;
    }

    if (['to_pickup', 'otp_verification', 'in_trip', 'payment_confirm', 'review'].includes(storedPhase)) {
        return storedPhase;
    }

    if (liveStatus === 'arriving') return 'otp_verification';
    if (liveStatus === 'started' || liveStatus === 'ongoing') return 'in_trip';
    if (liveStatus === 'arrived') return 'payment_confirm';
    if (liveStatus === 'completed') return 'review';

    return 'to_pickup';
};
export const withDriverAuthorization = (token) => (
    token
        ? {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
        : {}
);

export const normalizeHeading = (value, fallback = 0) => {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        return fallback;
    }

    return ((numeric % 360) + 360) % 360;
};

export const calculateBearing = (from, to, fallback = 0) => {
    if (!from || !to || arePositionsNearlyEqual(from, to, 0.00001)) {
        return fallback;
    }

    const fromLat = Number(from.lat) * (Math.PI / 180);
    const toLat = Number(to.lat) * (Math.PI / 180);
    const deltaLng = (Number(to.lng) - Number(from.lng)) * (Math.PI / 180);
    const y = Math.sin(deltaLng) * Math.cos(toLat);
    const x = Math.cos(fromLat) * Math.sin(toLat) -
        Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);

    return normalizeHeading(Math.atan2(y, x) * (180 / Math.PI), fallback);
};

export const getRouteHeading = (position, path = [], fallback = 0) => {
    const nextPoint = path.find((point) => !arePositionsNearlyEqual(position, point, 0.00001));
    return nextPoint ? calculateBearing(position, nextPoint, fallback) : fallback;
};
export const parseFareAmount = (value) => {
    const numeric = Number(String(value || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
};

export const formatCurrencyAmount = (value) => {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) {
        return 'Rs 0';
    }

    const hasDecimals = Math.abs(numeric % 1) > 0.001;
    return `Rs ${hasDecimals ? numeric.toFixed(2) : Math.round(numeric)}`;
};

export const formatDateTimeLabel = (value, fallback = '--') => {
    if (!value) {
        return fallback;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return fallback;
    }

    return parsed.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

export const formatDurationLabel = (start, end = Date.now()) => {
    if (!start) {
        return '--';
    }

    const startTime = new Date(start).getTime();
    const endTime = typeof end === 'string' || end instanceof Date ? new Date(end).getTime() : Number(end);

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
        return '--';
    }

    const totalMinutes = Math.max(1, Math.round((endTime - startTime) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes} min`;
};

export const computeCommissionSummary = ({ fare = 0, pricingSnapshot = null, explicitCommissionAmount, explicitDriverEarnings }) => {
    const normalizedFare = Math.max(0, Number(fare || 0));
    const commissionType = Number(pricingSnapshot?.admin_commission_type_from_driver ?? 1);
    const commissionValue = Math.max(0, Number(pricingSnapshot?.admin_commission_from_driver ?? 0));
    const fallbackCommissionAmount = commissionType === 1
        ? Math.round(((normalizedFare * commissionValue) / 100) * 100) / 100
        : Math.min(normalizedFare, commissionValue);
    const normalizedExplicitCommission = Number(explicitCommissionAmount);
    const normalizedExplicitDriverEarnings = Number(explicitDriverEarnings);
    const hasSettledExplicitCommission = Number.isFinite(normalizedExplicitCommission) && (
        normalizedExplicitCommission > 0
        || normalizedFare <= 0
        || fallbackCommissionAmount <= 0
    );
    const commissionAmount = hasSettledExplicitCommission
        ? Math.max(0, normalizedExplicitCommission)
        : fallbackCommissionAmount;
    const derivedDriverEarnings = Math.max(normalizedFare - commissionAmount, 0);
    const hasSettledExplicitDriverEarnings = Number.isFinite(normalizedExplicitDriverEarnings) && (
        normalizedExplicitDriverEarnings > 0
        || normalizedFare <= 0
        || derivedDriverEarnings <= 0
    );
    const driverEarnings = hasSettledExplicitDriverEarnings
        ? Math.max(0, normalizedExplicitDriverEarnings)
        : derivedDriverEarnings;

    return {
        commissionAmount,
        driverEarnings,
        commissionType,
        commissionValue,
        commissionLabel: commissionType === 1 ? `${commissionValue}%` : formatCurrencyAmount(commissionValue),
    };
};

export const getSimulationPath = ({ routePath = [], from, to }) => {
    const path = routePath.length > 1 ? routePath : [from, to].filter(Boolean);
    return path
        .filter((point) => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)))
        .map((point) => ({ lat: Number(point.lat), lng: Number(point.lng) }));
};
export const getRouteCacheKey = (origin, destination) => {
    const serializePoint = (point) =>
        point ? `${Number(point.lat || 0).toFixed(5)},${Number(point.lng || 0).toFixed(5)}` : '';

    return `${serializePoint(origin)}|${serializePoint(destination)}`;
};

export const toRadians = (value) => Number(value) * (Math.PI / 180);

export const getDistanceMeters = (from, to) => {
    if (!from || !to) {
        return 0;
    }

    const fromLat = Number(from.lat);
    const fromLng = Number(from.lng);
    const toLat = Number(to.lat);
    const toLng = Number(to.lng);

    if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
        return 0;
    }

    const earthRadiusMeters = 6371000;
    const deltaLat = toRadians(toLat - fromLat);
    const deltaLng = toRadians(toLng - fromLng);
    const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(deltaLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusMeters * c;
};

export const simplifyRoutePath = (points, tolerance = ROUTE_SIMPLIFY_TOLERANCE) => {
    const normalized = (Array.isArray(points) ? points : [])
        .filter((point) => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)))
        .map((point) => ({ lat: Number(point.lat), lng: Number(point.lng) }));

    if (normalized.length <= 2) {
        return normalized;
    }

    const simplified = simplify(
        normalized.map((point) => ({ x: point.lng, y: point.lat })),
        tolerance,
        true,
    ).map((point) => ({ lat: point.y, lng: point.x }));

    const firstPoint = normalized[0];
    const lastPoint = normalized[normalized.length - 1];
    const nextPath = simplified.slice();

    if (!arePositionsNearlyEqual(nextPath[0], firstPoint, 0.000001)) {
        nextPath.unshift(firstPoint);
    }

    if (!arePositionsNearlyEqual(nextPath[nextPath.length - 1], lastPoint, 0.000001)) {
        nextPath.push(lastPoint);
    }

    return nextPath;
};

export const projectPointOnSegment = (point, segmentStart, segmentEnd) => {
    const ax = Number(segmentStart?.lng);
    const ay = Number(segmentStart?.lat);
    const bx = Number(segmentEnd?.lng);
    const by = Number(segmentEnd?.lat);
    const px = Number(point?.lng);
    const py = Number(point?.lat);

    if (![ax, ay, bx, by, px, py].every(Number.isFinite)) {
        return null;
    }

    const abx = bx - ax;
    const aby = by - ay;
    const abLengthSquared = (abx * abx) + (aby * aby);

    if (abLengthSquared <= 0) {
        return { lat: ay, lng: ax, ratio: 0 };
    }

    const apx = px - ax;
    const apy = py - ay;
    const ratio = Math.max(0, Math.min(1, ((apx * abx) + (apy * aby)) / abLengthSquared));

    return {
        lat: ay + (aby * ratio),
        lng: ax + (abx * ratio),
        ratio,
    };
};

export const trimRoutePathFromPosition = (points, position) => {
    const normalizedPath = (Array.isArray(points) ? points : [])
        .filter((point) => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)))
        .map((point) => ({ lat: Number(point.lat), lng: Number(point.lng) }));

    if (!position || normalizedPath.length === 0) {
        return {
            path: normalizedPath,
            distanceMeters: Number.POSITIVE_INFINITY,
            advanced: false,
        };
    }

    if (normalizedPath.length === 1) {
        return {
            path: [position],
            distanceMeters: getDistanceMeters(position, normalizedPath[0]),
            advanced: !arePositionsNearlyEqual(position, normalizedPath[0], 0.00001),
        };
    }

    let closestDistanceMeters = Number.POSITIVE_INFINITY;
    let closestSegmentIndex = 0;
    let closestProjectedPoint = normalizedPath[0];

    for (let index = 0; index < normalizedPath.length - 1; index += 1) {
        const projected = projectPointOnSegment(position, normalizedPath[index], normalizedPath[index + 1]);
        if (!projected) {
            continue;
        }

        const distanceMeters = getDistanceMeters(position, projected);
        if (distanceMeters < closestDistanceMeters) {
            closestDistanceMeters = distanceMeters;
            closestSegmentIndex = index;
            closestProjectedPoint = { lat: projected.lat, lng: projected.lng };
        }
    }

    const remainingPath = [
        position,
        closestProjectedPoint,
        ...normalizedPath.slice(closestSegmentIndex + 1),
    ].filter((point, index, items) => (
        index === 0 || !arePositionsNearlyEqual(point, items[index - 1], 0.000001)
    ));

    return {
        path: simplifyRoutePath(remainingPath),
        distanceMeters: closestDistanceMeters,
        advanced: closestSegmentIndex > 0 || !arePositionsNearlyEqual(position, normalizedPath[0], 0.00005),
    };
};

export const arePathsEquivalent = (first = [], second = [], threshold = 0.00001) => {
    if (first.length !== second.length) {
        return false;
    }

    return first.every((point, index) => arePositionsNearlyEqual(point, second[index], threshold));
};

export const formatDistanceLabel = (meters) => {
    const distance = Number(meters || 0);

    if (!Number.isFinite(distance) || distance <= 0) {
        return 'Nearby';
    }

    if (distance < 1000) {
        return `${Math.max(50, Math.round(distance / 10) * 10)} m away`;
    }

    return `${(distance / 1000).toFixed(distance >= 10000 ? 0 : 1)} km away`;
};

export const formatTimerClock = (totalSeconds) => {
    const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatWholeMinutes = (value) => `${Math.max(0, Math.floor(Number(value) || 0))} min`;

export const buildPersistedTripState = (job = {}, overrides = {}) => {
    const mergedJob = {
        ...job,
        ...overrides,
    };
    const currentRideId = getJobRideId(mergedJob);
    const currentType = normalizeTripType(mergedJob);

    if (!currentRideId) {
        return null;
    }

    return {
        type: currentType,
        rideId: currentRideId,
        phase: mergedJob.phase || '',
        otp: mergedJob.otp || '',
        arrivedAt: mergedJob.arrivedAt || '',
        paymentMethod: mergedJob.paymentMethod || 'Cash',
        pricingSnapshot: mergedJob.pricingSnapshot || null,
        currentDriverCoords: mergedJob.lastDriverLocation?.coordinates || mergedJob.driverLocation?.coordinates || null,
        request: {
            type: currentType,
            title: getTripTitle(currentType),
            fare: `Rs ${mergedJob.fare || 0}`,
            payment: mergedJob.paymentMethod || 'Cash',
            pickup: getAreaName(mergedJob.pickupAddress, formatAddressFromPoint(mergedJob.pickupLocation, 'Pickup area')),
            drop: getAreaName(mergedJob.dropAddress, formatAddressFromPoint(mergedJob.dropLocation, 'Drop area')),
            requestId: currentRideId,
            rideId: currentRideId,
            raw: mergedJob,
        },
    };
};

export const buildDriverPaymentCollection = ({ mode = '', status = '', paymentQr = null } = {}) => {
    const normalizedMode = String(mode || '').trim().toLowerCase();

    if (!normalizedMode) {
        return null;
    }

    if (normalizedMode === 'online') {
        return {
            method: 'online',
            source: 'driver_qr',
            qrId: paymentQr?.id || '',
            status: status === 'success' ? 'paid' : 'pending',
            paidAt: status === 'success' ? new Date().toISOString() : null,
        };
    }

    if (normalizedMode === 'cash') {
        return {
            method: 'cash',
            source: 'driver_cash',
            status: 'paid',
            paidAt: new Date().toISOString(),
        };
    }

    return {
        method: normalizedMode,
        status: status === 'success' ? 'paid' : 'pending',
        paidAt: status === 'success' ? new Date().toISOString() : null,
    };
};
