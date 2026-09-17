/**
 * Moving the money for a confirmed booking.
 *
 * Extracted so the Razorpay path and the unconfigured-gateway dev path settle
 * through exactly one implementation — the same reason `createPackage` is
 * shared between the operator and admin create routes. A second copy of this
 * is a second place for the wallet arithmetic to drift.
 */
import ToursWallet from '../models/Wallet.js';
import { settlementSplit } from './pricing.js';

/**
 * Mark the advance received and settle the operator wallet.
 *
 * The platform always keeps commission + tax; the operator always ends up with
 * `operatorPayout`, collecting `balanceDue` in cash themselves. So the wallet
 * only settles the difference — and when the advance is too small to cover the
 * platform's cut, that difference is a **debit**.
 *
 * @param {Object} booking  a loaded TourBooking document
 * @param {{paymentId?: string, paymentMethod?: string}} payment
 * @returns {Promise<{booking: Object, movement: Object}>}
 */
export const settleBookingAdvance = async (booking, { paymentId, paymentMethod } = {}) => {
  if (booking.paymentStatus !== 'pending') {
    const error = new Error('This booking has already been settled');
    error.statusCode = 400;
    throw error;
  }

  booking.paymentId = paymentId || booking.paymentId;
  if (paymentMethod) booking.paymentMethod = paymentMethod;
  booking.amountPaid = booking.advanceAmount;
  booking.paymentStatus = booking.balanceDue > 0 ? 'advance_paid' : 'paid';
  booking.bookingStatus = 'confirmed';

  const split = settlementSplit(booking);
  const wallet = await ToursWallet.forOperator(booking.operatorId);
  const reference = booking.bookingId;

  if (split.direction === 'credit' && split.amount > 0) {
    await wallet.credit(
      split.amount,
      `Advance received for ${reference}`,
      reference,
      'booking_payment',
      { bookingId: reference },
    );
  } else if (split.direction === 'debit' && split.amount > 0) {
    // The advance did not cover commission + tax, so the platform recovers the
    // shortfall from the wallet. The operator still nets operatorPayout once
    // they collect the balance in cash.
    await wallet.debit(
      split.amount,
      `Platform commission and tax for ${reference}`,
      reference,
      'commission_deduction',
      { bookingId: reference },
    );
  }

  await booking.save();

  return {
    booking,
    movement: {
      direction: split.direction,
      amount: split.amount,
      platformCut: split.platformCut,
      walletBalance: wallet.balance,
    },
  };
};

/**
 * Undo what `settleBookingAdvance` moved, when a booking is cancelled.
 *
 * Whatever direction the settlement went, the reversal goes the other way by
 * the same amount: an operator credited their share gives it back, and one
 * debited the platform's shortfall has it returned. Reading the movement from
 * the same `settlementSplit` the settlement used keeps the two in step — a
 * reversal that recomputed the split its own way is how wallets drift.
 *
 * Returning the customer's money through the gateway is deliberately not done
 * here. That is a Razorpay refund against a captured payment, with its own
 * failure modes and its own audit trail, and it should be an explicit step
 * rather than a side effect of cancelling.
 *
 * @returns {Promise<{direction: string, amount: number, walletBalance: number}|null>}
 */
export const reverseBookingSettlement = async (booking) => {
  // Nothing was ever settled, so there is nothing to give back.
  if (!['advance_paid', 'paid'].includes(booking.paymentStatus)) return null;

  const split = settlementSplit(booking);
  if (!split.amount) return null;

  const wallet = await ToursWallet.forOperator(booking.operatorId);
  const reference = booking.bookingId;

  if (split.direction === 'credit') {
    // The operator was given their share; cancelling takes it back.
    await wallet.debit(
      split.amount,
      `Cancelled — advance returned for ${reference}`,
      reference,
      'refund_deduction',
      { bookingId: reference },
    );
  } else {
    // The platform had recovered its cut from the wallet; cancelling returns it.
    await wallet.credit(
      split.amount,
      `Cancelled — commission and tax returned for ${reference}`,
      reference,
      'cancellation_refund',
      { bookingId: reference },
    );
  }

  return {
    // The opposite of whichever way the settlement went.
    direction: split.direction === 'credit' ? 'debit' : 'credit',
    amount: split.amount,
    walletBalance: wallet.balance,
  };
};

export default { settleBookingAdvance, reverseBookingSettlement };
