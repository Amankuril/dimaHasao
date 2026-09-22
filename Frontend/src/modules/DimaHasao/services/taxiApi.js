/**
 * Taxi rides for the consumer app.
 *
 * The v1 "My Bookings" screen listed seeded fixtures — a ride with an invented
 * driver, vehicle and OTP that no taxi module had ever issued. This adapts the
 * real ride history into the exact shape that card already renders.
 *
 * The full booking journey lives in the Taxi module at /taxi/user; this module
 * only needs to *show* what was booked there.
 */
import apiClient from '../../../services/api/axios';

const asArray = (value) => (Array.isArray(value) ? value : []);
const unwrap = (res) => res?.data?.data ?? res?.data ?? {};

const RIDE_STATUS = {
  pending: 'Searching',
  searching: 'Searching',
  accepted: 'Driver Assigned',
  arrived: 'Driver Arrived',
  ongoing: 'On the way',
  in_progress: 'On the way',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const rideDate = (value) => {
  if (!value) return '';
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return '';

  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  const time = then.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (days <= 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + `, ${time}`;
};

/** A short label for the vehicle, falling back through what the ride carries. */
const vehicleLabel = (driver = {}, ride = {}) =>
  [driver.vehicleMake, driver.vehicleModel].filter(Boolean).join(' ') ||
  driver.vehicleType ||
  driver.vehicleIconType ||
  ride.vehicleIconType ||
  (ride.serviceType === 'parcel' ? 'Parcel' : 'Ride');

/** Rides that can still be resumed — the card links back into the live trip. */
const LIVE_RIDE_STATUSES = new Set([
  'pending', 'searching', 'accepted', 'arrived', 'arriving', 'ongoing', 'in_progress', 'started', 'assigned', 'confirmed',
]);

/** Backend ride → the card the v1 bookings screen renders. */
export const adaptRide = (ride = {}) => {
  // The list serializer nests the driver under `driver`; `driverId` is only
  // ever the raw id. Reading `driverId` alone left an assigned ride showing
  // "Awaiting driver" with no vehicle number and a dead Call button.
  const driver =
    (ride.driver && typeof ride.driver === 'object' ? ride.driver : null) ||
    (ride.driverId && typeof ride.driverId === 'object' ? ride.driverId : null) ||
    {};
  const rawStatus = String(ride.liveStatus || ride.status || '').toLowerCase();

  return {
    // The ride serializer returns `rideId`; it has no `_id`. Reading only
    // `_id` left every card with an empty id, so the row had nothing to
    // link to and rendered "ID:" with nothing after it.
    id: String(ride.rideId || ride._id || ''),
    rawStatus,
    isLive: LIVE_RIDE_STATUSES.has(rawStatus),
    date: rideDate(ride.createdAt),
    placeName: ride.dropAddress || ride.pickupAddress || 'Ride',
    pickup: ride.pickupAddress || '—',
    drop: ride.dropAddress || '—',
    transport: vehicleLabel(driver, ride),
    vehicleNo: driver.vehicleNumber || '—',
    driverName: driver.name || 'Awaiting driver',
    driverPhone: driver.phone || '',
    // Only shown while a ride is live; a completed ride's OTP is meaningless.
    otp: ['completed', 'cancelled', 'expired'].includes(ride.status) ? '—' : ride.otp || '—',
    fare: Number(ride.fare ?? ride.baseFare) || 0,
    status: RIDE_STATUS[ride.status] || ride.status || 'Booked',
    serviceType: ride.serviceType || 'ride',
  };
};

/** The signed-in rider's history. */
export const fetchMyRides = async (params = {}) => {
  const body = unwrap(await apiClient.get('/taxi/rides', { params }));
  return asArray(body.results ?? body.rides ?? body).map(adaptRide);
};

export default { fetchMyRides, adaptRide };
