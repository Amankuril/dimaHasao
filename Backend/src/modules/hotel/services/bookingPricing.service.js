/**
 * What a stay costs, and whether it can be sold.
 *
 * Extracted from `createBooking` so the quote endpoint and the booking endpoint
 * compute the same numbers from one implementation. The consumer screen used to
 * derive its own total (12% GST plus a flat ₹99 service fee) which the server
 * had never heard of — that is the shape of the food payment bug, where the
 * amount charged and the amount verified disagreed.
 *
 * The arithmetic below is unchanged from the controller, including its
 * rounding, its "tax on gross" choice and the minimum-commission floor.
 */
import mongoose from 'mongoose';
import AvailabilityLedger from '../models/AvailabilityLedger.js';
import Booking from '../models/Booking.js';
import Offer from '../models/Offer.js';
import PaymentConfig from '../config/payment.config.js';
import { priceStay } from '../utils/nightlyPricing.js';

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Units left for a room type across a date range.
 * @returns {Promise<{totalInventory: number, blockedUnits: number, availableUnits: number}>}
 */
export const getAvailability = async ({ propertyId, roomTypeId, checkIn, checkOut, roomType }) => {
  const ledgerEntries = await AvailabilityLedger.aggregate([
    {
      $match: {
        propertyId: new mongoose.Types.ObjectId(String(propertyId)),
        roomTypeId: new mongoose.Types.ObjectId(String(roomTypeId)),
        startDate: { $lt: checkOut },
        endDate: { $gt: checkIn },
      },
    },
    { $group: { _id: null, blockedUnits: { $sum: '$units' } } },
  ]);

  const blockedUnits = ledgerEntries.length > 0 ? ledgerEntries[0].blockedUnits : 0;
  const totalInventory = roomType.totalInventory || 0;

  return {
    totalInventory,
    blockedUnits,
    availableUnits: Math.max(0, totalInventory - blockedUnits),
  };
};

/**
 * Take inventory for a stay, or refuse.
 *
 * Booking used to write nothing here and check nothing: `availableUnits` was
 * reported in the quote and then ignored, and the ledger was only ever written
 * by a partner blocking rooms by hand. So customer bookings consumed no
 * inventory at all — six simultaneous requests for a room type with
 * totalInventory 1 all succeeded, and a single request beyond capacity would
 * have too.
 *
 * Mongo may be standalone here, so a transaction is not assumed. Instead the
 * claim is written first and then ranked: every overlapping entry is ordered by
 * _id (monotonic, so it is insertion order), and a claim is kept only if it
 * lands within the room type's capacity. Two racing requests therefore both
 * insert, both rank, and exactly the ones that fit survive — the rest remove
 * their own entry and are refused. Under-selling by one is possible only if a
 * winner crashes between insert and rank; overselling is not.
 */
export const claimAvailability = async ({ propertyId, roomTypeId, checkIn, checkOut, units = 1, roomType, referenceId }) => {
  const total = Number(roomType?.totalInventory || 0);
  if (total <= 0) {
    return { ok: false, availableUnits: 0, totalInventory: total };
  }

  const entry = await AvailabilityLedger.create({
    propertyId,
    roomTypeId,
    inventoryType: roomType.inventoryType || 'room',
    source: 'platform',
    referenceId,
    startDate: checkIn,
    endDate: checkOut,
    units,
    createdBy: 'system',
  });

  // Everything overlapping this stay, oldest first.
  const overlapping = await AvailabilityLedger.find({
    propertyId,
    roomTypeId,
    startDate: { $lt: checkOut },
    endDate: { $gt: checkIn },
  }).sort({ _id: 1 }).select('_id units').lean();

  let consumed = 0;
  for (const row of overlapping) {
    const rowUnits = Number(row.units || 0);
    if (String(row._id) === String(entry._id)) {
      // Ours fits only if everything ahead of it left room.
      if (consumed + rowUnits > total) {
        await AvailabilityLedger.deleteOne({ _id: entry._id });
        return { ok: false, availableUnits: Math.max(0, total - consumed), totalInventory: total };
      }
      return { ok: true, ledgerId: entry._id, availableUnits: Math.max(0, total - consumed - rowUnits), totalInventory: total };
    }
    consumed += rowUnits;
  }

  // Our own entry vanished (a concurrent release). Safer to refuse than to
  // assume the room is ours.
  await AvailabilityLedger.deleteOne({ _id: entry._id });
  return { ok: false, availableUnits: Math.max(0, total - consumed), totalInventory: total };
};

/** Give a booking's inventory back. Safe to call twice. */
export const releaseAvailability = async (referenceId) => {
  if (!referenceId) return 0;
  const result = await AvailabilityLedger.deleteMany({ source: 'platform', referenceId });
  return result?.deletedCount || 0;
};

/**
 * Resolve a coupon against this stay. Returns a zero discount rather than
 * throwing when the code does not apply — an invalid code must not block a
 * booking, only fail to discount it.
 */
export const resolveCoupon = async ({ couponCode, grossAmount, propertyType, userId }) => {
  if (!couponCode) return { discountAmount: 0, appliedCoupon: null, reason: null };

  const offer = await Offer.findOne({ code: couponCode, isActive: true });
  if (!offer) return { discountAmount: 0, appliedCoupon: null, reason: 'Coupon not found' };

  const isValidDate =
    (!offer.startDate || new Date() >= offer.startDate) &&
    (!offer.endDate || new Date() <= offer.endDate);
  const isValidAmount = grossAmount >= (offer.minBookingAmount || 0);

  const userUsageCount = await Booking.countDocuments({
    userId,
    couponCode: offer.code,
    bookingStatus: { $nin: ['cancelled', 'rejected'] },
  });
  const isUnderUserLimit = userUsageCount < (offer.userLimit || 1);

  const isAllowedType =
    !offer.allowedPropertyType ||
    offer.allowedPropertyType === 'all' ||
    offer.allowedPropertyType === propertyType;

  if (!isValidDate) return { discountAmount: 0, appliedCoupon: null, reason: 'This coupon has expired' };
  if (!isValidAmount) {
    return {
      discountAmount: 0,
      appliedCoupon: null,
      reason: `This coupon needs a booking of at least ₹${offer.minBookingAmount}`,
    };
  }
  if (!isUnderUserLimit) return { discountAmount: 0, appliedCoupon: null, reason: 'You have already used this coupon' };
  if (!isAllowedType) return { discountAmount: 0, appliedCoupon: null, reason: 'This coupon does not apply to this stay' };

  let discountAmount =
    offer.discountType === 'percentage'
      ? (grossAmount * offer.discountValue) / 100
      : offer.discountValue;

  if (offer.discountType === 'percentage' && offer.maxDiscount) {
    discountAmount = Math.min(discountAmount, offer.maxDiscount);
  }
  discountAmount = Math.floor(discountAmount);
  discountAmount = Math.min(discountAmount, grossAmount); // Cannot exceed gross

  return { discountAmount, appliedCoupon: offer.code, reason: null };
};

/**
 * Price a stay end to end.
 *
 * @returns everything the booking document stores and the quote endpoint shows.
 * @throws {Error & {statusCode}} on an unsellable stay, so the caller can pass
 *   the message straight through.
 */
export const quoteStay = async ({
  property,
  roomType,
  checkInDate,
  checkOutDate,
  guests = {},
  couponCode,
  userId,
  settings,
}) => {
  const gstRate = settings.taxRate || 12;

  // One platform commission for every partner. A paid plan used to be able to
  // override this with its own rate; without plans, the global setting is the
  // only rate there is.
  const commissionRate = settings.defaultCommission || 10;

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    const error = new Error('Invalid check-in/check-out dates');
    error.statusCode = 400;
    throw error;
  }

  /*
   * A stay cannot start in the past.
   *
   * Only the night count was checked, so yesterday-to-tomorrow priced and
   * booked happily — it holds inventory for a night that has already gone and
   * puts a check-in date behind the front desk's own clock. Compared at day
   * granularity so a booking made later the same morning still works.
   */
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (checkIn < startOfToday) {
    const error = new Error('Check-in cannot be a date in the past');
    error.statusCode = 400;
    throw error;
  }

  const totalNights = Math.ceil((checkOut - checkIn) / DAY_MS);

  if (!totalNights || totalNights <= 0) {
    const error = new Error('Check-out must be after check-in');
    error.statusCode = 400;
    throw error;
  }

  const requiredUnits = guests.rooms || 1;
  const availability = await getAvailability({
    propertyId: property._id,
    roomTypeId: roomType._id,
    checkIn,
    checkOut,
    roomType,
  });

  if (availability.availableUnits < requiredUnits) {
    const error = new Error(
      `Only ${availability.availableUnits} rooms available for selected dates`,
    );
    error.statusCode = 400;
    throw error;
  }

  // Priced night by night so a stay crossing a seasonal rate boundary is
  // charged correctly on both sides.
  const units = requiredUnits;
  const stay = priceStay(roomType, checkIn, checkOut, units);
  const baseAmount = stay.total;
  const nightlyBreakdown = stay.nights.map((night) => ({
    date: night.date,
    rate: night.rate,
    season: night.season,
    units: night.units,
    amount: night.amount,
  }));
  // Recorded for reference; the nightly breakdown is the real basis.
  const pricePerNight = totalNights > 0 ? Math.round(baseAmount / totalNights / units) : 0;

  const extraAdults = guests.extraAdults || 0;
  const extraChildren = guests.extraChildren || 0;
  const extraAdultPrice = (roomType.extraAdultPrice || 0) * extraAdults * totalNights;
  const extraChildPrice = (roomType.extraChildPrice || 0) * extraChildren * totalNights;
  const extraCharges = extraAdultPrice + extraChildPrice;

  const grossAmount = baseAmount + extraCharges;

  const coupon = await resolveCoupon({
    couponCode,
    grossAmount,
    propertyType: String(property.propertyType || '').toLowerCase(),
    userId,
  });

  // Tax is charged on gross, before the discount.
  const taxes = Math.round((grossAmount * gstRate) / 100);
  const taxableAmount = grossAmount - coupon.discountAmount;
  const totalAmount = taxableAmount + taxes;

  let adminCommission = Math.round((grossAmount * commissionRate) / 100);
  if (adminCommission < PaymentConfig.minCommission) {
    adminCommission = PaymentConfig.minCommission;
  }

  // TotalAmount - Tax - Commission = Gross - Discount - Commission.
  const partnerPayout = Math.floor(totalAmount - taxes - adminCommission);

  return {
    totalNights,
    units,
    pricePerNight,
    baseAmount,
    nightlyBreakdown,
    extraAdultPrice,
    extraChildPrice,
    extraCharges,
    grossAmount,
    gstRate,
    taxes,
    discount: coupon.discountAmount,
    couponCode: coupon.appliedCoupon,
    couponMessage: coupon.reason,
    taxableAmount,
    totalAmount,
    adminCommission,
    partnerPayout,
    availableUnits: availability.availableUnits,
  };
};

export default { quoteStay, getAvailability, resolveCoupon };
