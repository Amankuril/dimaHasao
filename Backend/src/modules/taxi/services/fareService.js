/**
 * What a ride costs, decided by the server.
 *
 * `createRide` took the fare from the request body and stored it, checked only
 * for being a non-negative number — so a client could book a 50 km trip for ₹1
 * and the driver would be dispatched against it. Food, hotel, tours and
 * festivals all price server-side; taxi was the one module that did not.
 *
 * The tariff already existed in `SetPrice` and was already resolved on every
 * ride — but only to decide which payment methods were allowed. This reads the
 * same rule for what it was designed to hold.
 *
 * The arithmetic mirrors how these tariffs are written: a base price covering a
 * base distance, a per-kilometre rate beyond it, a per-minute rate for time,
 * and a service tax on the total. Outstation trips use the tariff's own
 * outstation columns, which is why they are there.
 */
import { resolveSetPriceForRide } from './rideService.js';

const round = (value) => Math.round((Number(value) || 0) + Number.EPSILON);

const number = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Compute a fare from a resolved tariff.
 *
 * @returns {{total: number, breakdown: Object}|null} null when the tariff
 *   carries no usable base price — an unconfigured rule must not be read as a
 *   free ride.
 */
export const fareFromTariff = (tariff, { distanceMeters = 0, durationMinutes = 0, outstation = false } = {}) => {
  if (!tariff) return null;

  const basePrice = number(outstation ? tariff.outstation_base_price : tariff.base_price, 0);
  // A tariff with no base price has not been filled in; pricing from it would
  // invent a number rather than read one.
  if (!basePrice) return null;

  const baseDistanceKm = number(outstation ? tariff.outstation_base_distance : tariff.base_distance, 0);
  const perKm = number(outstation ? tariff.outstation_price_per_distance : tariff.price_per_distance, 0);
  const perMinute = number(outstation ? tariff.outstation_time_price : tariff.time_price, 0);
  const taxPercent = number(tariff.service_tax, 0);

  const distanceKm = Math.max(0, number(distanceMeters) / 1000);

  /*
   * Inside the base distance, the base price is the whole fare.
   *
   * This mirrors what the rider app already computes — its
   * `calculateEstimatedFare` charges base price alone for a trip that never
   * leaves the base distance, and only adds distance *and* time beyond it. The
   * two have to agree: the app shows the number and the server checks it, so a
   * server that added a time charge on a short hop would reject a fare the
   * rider was correctly quoted.
   */
  const withinBaseDistance = baseDistanceKm > 0 && distanceKm <= baseDistanceKm;
  const chargeableKm = withinBaseDistance ? 0 : Math.max(0, distanceKm - baseDistanceKm);
  const chargeableMinutes = withinBaseDistance ? 0 : Math.max(0, number(durationMinutes));

  const distanceCharge = chargeableKm * perKm;
  const timeCharge = chargeableMinutes * perMinute;
  const subtotal = basePrice + distanceCharge + timeCharge;
  const tax = (subtotal * taxPercent) / 100;

  return {
    total: round(subtotal + tax),
    breakdown: {
      basePrice: round(basePrice),
      baseDistanceKm,
      chargeableKm: Math.round(chargeableKm * 100) / 100,
      perKm,
      distanceCharge: round(distanceCharge),
      perMinute,
      durationMinutes: chargeableMinutes,
      timeCharge: round(timeCharge),
      withinBaseDistance,
      subtotal: round(subtotal),
      taxPercent,
      tax: round(tax),
      outstation,
    },
  };
};

/**
 * The fare for a ride as described, or null when no tariff covers it.
 *
 * Returning null is meaningful: it says the platform has nothing configured for
 * this combination, which is a different answer from "this ride is free".
 */
export const quoteRideFare = async ({
  vehicleTypeId,
  zoneId = null,
  serviceLocationId = null,
  transportType = 'taxi',
  distanceMeters = 0,
  durationMinutes = 0,
  serviceType = 'city',
}) => {
  const tariff = await resolveSetPriceForRide({ zoneId, serviceLocationId, transportType, vehicleTypeId });
  if (!tariff) return null;

  const outstation = String(serviceType || '').trim().toLowerCase() === 'intercity';
  const fare = fareFromTariff(tariff, { distanceMeters, durationMinutes, outstation });
  if (!fare) return null;

  return { ...fare, tariffId: tariff._id, currency: 'INR' };
};

/**
 * How far a submitted fare may sit from the computed one before it is refused.
 *
 * Only rounding needs absorbing. The rider app computes from the same tariff
 * with the same arithmetic, so the two agree to the rupee; ₹2 or 1% is slack,
 * not a discount window. Promo codes do not need room here — the app sends the
 * undiscounted fare and the server applies the promo itself, and a bid ride's
 * range is derived from this same figure rather than replacing it.
 */
export const FARE_TOLERANCE = {
  absolute: Number(process.env.TAXI_FARE_TOLERANCE_RUPEES || 2),
  fraction: Number(process.env.TAXI_FARE_TOLERANCE_FRACTION || 0.01),
};

export const fareWithinTolerance = (submitted, computed) => {
  const allowed = Math.max(FARE_TOLERANCE.absolute, computed * FARE_TOLERANCE.fraction);
  return Math.abs(number(submitted) - computed) <= allowed;
};

export default { fareFromTariff, quoteRideFare, fareWithinTolerance, FARE_TOLERANCE };
