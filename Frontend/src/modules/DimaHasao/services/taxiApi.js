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
  driver.vehicleType ||
  ride.vehicleIconType ||
  (ride.serviceType === 'parcel' ? 'Parcel' : 'Ride');

/** Backend ride → the card the v1 bookings screen renders. */
export const adaptRide = (ride = {}) => {
  const driver = ride.driverId && typeof ride.driverId === 'object' ? ride.driverId : {};

  return {
    id: String(ride._id || ''),
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
