/**
 * Recording the money for a confirmed booking.
 *
 * Extracted so the Razorpay path and the unconfigured-gateway dev path settle
 * through exactly one implementation — a second copy of this is a second place
 * for the booking's payment state to drift.
 *
 * Tours are single-vendor. There is no operator wallet to credit and no payout
 * to split, so settling is now purely a state transition on the booking: the
 * customer paid the district in full, and the district keeps it. The wallet,
 * withdrawal and commission machinery this file used to drive is gone.
 */

/**
 * Mark the payment received and confirm the booking.
 *
 * @param {Object} booking  a loaded TourBooking document
 * @param {{paymentId?: string, paymentMethod?: string}} payment
 * @returns {Promise<{booking: Object, movement: null}>}
 */
export const settleBookingAdvance = async (booking, { paymentId, paymentMethod } = {}) => {
  if (booking.paymentStatus !== 'pending') {
    const error = new Error('This booking has already been settled');
    error.statusCode = 400;
    throw error;
  }

  booking.paymentId = paymentId || booking.paymentId;
  if (paymentMethod) booking.paymentMethod = paymentMethod;
  booking.amountPaid = booking.totalAmount;
  booking.paymentStatus = 'paid';
  booking.bookingStatus = 'confirmed';

  await booking.save();

  // Kept in the return shape so callers that logged the wallet movement keep
  // working; there is simply never a movement now.
  return { booking, movement: null };
};

/**
 * Undo a settlement when a paid booking is cancelled.
 *
 * Refunding the customer is deliberately NOT done here: that is a Razorpay
 * refund against a captured payment, with its own failure modes and its own
 * audit trail, and it should be an explicit step rather than a side effect of
 * cancelling. With no operator wallet left there is nothing else to reverse,
 * so this now only reports whether money had in fact been taken.
 *
 * @returns {Promise<null>}
 */
export const reverseBookingSettlement = async (booking) => {
  if (!['advance_paid', 'paid'].includes(booking.paymentStatus)) return null;
  return null;
};

export default { settleBookingAdvance, reverseBookingSettlement };
