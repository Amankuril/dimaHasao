/**
 * Resolving a promo code against a booking.
 *
 * Shared by the quote and the create path so the discount a traveller is shown
 * is the discount they are charged — the same rule the prices themselves
 * follow. An unusable code returns a reason rather than throwing: a bad coupon
 * should fail to discount, not block the booking.
 */
import TourOffer from '../models/Offer.js';
import TourBooking from '../models/TourBooking.js';

/**
 * @returns {Promise<{discount: number, code: string|null, reason: string|null}>}
 */
export const resolveOffer = async ({ code, baseAmount, pkg, userId }) => {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return { discount: 0, code: null, reason: null };

  const offer = await TourOffer.findOne({ code: normalized, isActive: true });
  if (!offer) return { discount: 0, code: null, reason: 'That code is not valid' };

  const now = new Date();
  if (offer.startDate && now < offer.startDate) {
    return { discount: 0, code: null, reason: 'This offer has not started yet' };
  }
  if (offer.endDate && now > offer.endDate) {
    return { discount: 0, code: null, reason: 'This offer has expired' };
  }
  if (offer.usageLimit && offer.usageCount >= offer.usageLimit) {
    return { discount: 0, code: null, reason: 'This offer has been fully claimed' };
  }
  if (baseAmount < (offer.minBookingAmount || 0)) {
    return {
      discount: 0,
      code: null,
      reason: `This code needs a booking of at least ₹${offer.minBookingAmount}`,
    };
  }

  // Scoped offers: empty list means "everything".
  if (offer.packageIds?.length && !offer.packageIds.some((id) => String(id) === String(pkg._id))) {
    return { discount: 0, code: null, reason: 'This code does not apply to this package' };
  }

  // Counted per traveller on bookings that still stand.
  if (userId) {
    const used = await TourBooking.countDocuments({
      userId,
      couponCode: offer.code,
      bookingStatus: { $nin: ['cancelled'] },
    });
    if (used >= (offer.userLimit || 1)) {
      return { discount: 0, code: null, reason: 'You have already used this code' };
    }
  }

  let discount = offer.discountType === 'percentage'
    ? (baseAmount * offer.discountValue) / 100
    : offer.discountValue;

  if (offer.discountType === 'percentage' && offer.maxDiscount) {
    discount = Math.min(discount, offer.maxDiscount);
  }
  // A discount can never exceed the fare it discounts.
  discount = Math.min(Math.floor(discount), baseAmount);

  return { discount, code: offer.code, reason: null, offerId: offer._id };
};

/** Count a redemption. Called only once a booking is actually created. */
export const claimOffer = async (code) => {
  if (!code) return;
  await TourOffer.updateOne({ code }, { $inc: { usageCount: 1 } });
};

export default { resolveOffer, claimOffer };
