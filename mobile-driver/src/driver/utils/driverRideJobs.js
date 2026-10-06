/*
 * Pure helpers DriverHome.jsx and DriverRideRequestListener.jsx each define inline on the web (identical copies);
 * shared here so both screens use one definition.
 */
export const DEFAULT_MAP_COORDS = [75.8577, 22.7196];

export const formatPoint = (point, fallback) => {
  const [lng, lat] = point?.coordinates || [];
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
  }
  return fallback;
};

export const formatScheduledDateTime = (value) => {
  if (!value) return 'Schedule time not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Schedule time not available';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const isScheduledRideForFuture = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
};

export const normalizeJobType = (job = {}) => {
  const value = String(job.type || job.serviceType || 'ride').toLowerCase();
  if (value === 'parcel') return 'parcel';
  if (value === 'intercity') return 'intercity';
  return 'ride';
};

export const getJobTitle = (type) => {
  if (type === 'parcel') return 'Delivery';
  if (type === 'intercity') return 'Intercity Ride';
  return 'Taxi Ride';
};

export const getJobRideId = (job = {}) => String(job?.rideId || job?.id || job?._id || job?.requestId || '').trim();

const getPointCoordinates = (point) => {
  const [lng, lat] = point?.coordinates || [];
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) return { lat: Number(lat), lng: Number(lng) };
  return null;
};

export const calculateDistanceMeters = (startPoint, endPoint) => {
  const start = getPointCoordinates(startPoint);
  const end = getPointCoordinates(endPoint);
  if (!start || !end) return 0;

  const earthRadiusMeters = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLat = toRadians(end.lat - start.lat);
  const deltaLng = toRadians(end.lng - start.lng);
  const startLat = toRadians(start.lat);
  const endLat = toRadians(end.lat);
  const haversine = Math.sin(deltaLat / 2) ** 2 + Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) ** 2;
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusMeters * arc;
};

export const formatTripDistance = (job = {}) => {
  const estimatedMeters = Number(
    job.estimatedDistanceMeters
      || job.raw?.estimatedDistanceMeters
      || calculateDistanceMeters(job.pickupLocation || job.raw?.pickupLocation, job.dropLocation || job.raw?.dropLocation)
      || 0,
  );

  if (Number.isFinite(estimatedMeters) && estimatedMeters > 0) {
    return estimatedMeters < 1000
      ? `${Math.max(50, Math.round(estimatedMeters / 10) * 10)} m`
      : `${(estimatedMeters / 1000).toFixed(estimatedMeters >= 10000 ? 0 : 1)} km`;
  }
  if (job.intercity?.distance) return `${job.intercity.distance} km`;
  if (job.raw?.intercity?.distance) return `${job.raw.intercity.distance} km`;
  if (job.radius) return `within ${(Number(job.radius) / 1000).toFixed(1)} km`;
  if (job.raw?.radius) return `within ${(Number(job.raw.radius) / 1000).toFixed(1)} km`;
  return 'nearby';
};

export const unwrapApiPayload = (response) => response?.data?.data || response?.data || response;

export const withDriverAuthorization = (token) => (token ? { headers: { Authorization: `Bearer ${token}` } } : {});

/** The `rideRequest` socket payload -> the request object both screens hold (the listener adds a few more keys). */
export const buildRideRequest = (data, extra = {}) => {
  const requestType = normalizeJobType(data);
  return {
    type: requestType,
    title: getJobTitle(requestType),
    fare: `Rs ${data.fare || 0}`,
    payment: data.paymentMethod || 'Cash',
    pickup: data.pickupAddress || formatPoint(data.pickupLocation, 'Pickup Location'),
    drop: data.dropAddress || formatPoint(data.dropLocation, 'Drop Location'),
    distance: formatTripDistance(data),
    requestId: data.rideId,
    rideId: data.rideId,
    acceptRejectDurationSeconds: data.acceptRejectDurationSeconds || data.expiresInSeconds,
    bookingMode: data.bookingMode || 'normal',
    bidding: data.bidding || { enabled: false },
    raw: data,
    ...extra,
  };
};

/** The `rideBiddingUpdated` merge both screens apply to the open request. */
export const mergeBiddingUpdate = (current, payload) => {
  if (!current?.rideId || current.rideId !== payload.rideId) return current;
  const pricingNegotiationMode = payload.pricingNegotiationMode || current.raw?.pricingNegotiationMode || 'none';
  const isDriverBidMode = pricingNegotiationMode === 'driver_bid';
  return {
    ...current,
    fare: `Rs ${payload.fare || current.raw?.fare || 0}`,
    bookingMode: payload.bookingMode || current.bookingMode || 'normal',
    raw: {
      ...(current.raw || {}),
      fare: payload.fare || current.raw?.fare || 0,
      bookingMode: payload.bookingMode || current.raw?.bookingMode || 'bidding',
      pricingNegotiationMode,
      fareIncreaseWaitMinutes: payload.fareIncreaseWaitMinutes || current.raw?.fareIncreaseWaitMinutes || 0,
      nextFareIncreaseAt: payload.nextFareIncreaseAt || current.raw?.nextFareIncreaseAt || null,
      bidding: {
        ...(current.raw?.bidding || {}),
        enabled: isDriverBidMode,
        baseFare: payload.baseFare || current.raw?.bidding?.baseFare || current.raw?.baseFare || current.raw?.fare || 0,
        userMaxBidFare: payload.userMaxBidFare || payload.fare || current.raw?.bidding?.userMaxBidFare || current.raw?.userMaxBidFare || 0,
        bidStepAmount: payload.bidStepAmount || current.raw?.bidding?.bidStepAmount || 10,
      },
    },
  };
};
