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
  const totalNights = Math.ceil((checkOut - checkIn) / DAY_MS);

  if (!totalNights || totalNights <= 0) {
    const error = new Error('Invalid check-in/check-out dates');
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
