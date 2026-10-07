/**
 * Festival pass payments.
 *
 * Same shape as the tours payment path: the Razorpay order amount is read from
 * the stored booking, never from the request, and both endpoints are scoped to
 * the caller's own booking.
 */
import FestivalBooking from '../models/FestivalBooking.js';
import {
  getRazorpayClient,
  getRazorpayKeyId,
  isRazorpayConfigured,
  verifyPaymentSignature,
} from '../../../core/payments/razorpay.service.js';
import { confirmBookingPayment, confirmReleasedBookingPayment } from './bookingController.js';

const findOwnBooking = (id, userId) => FestivalBooking.findOne({ _id: id, userId });

/** Every booking in one checkout, scoped to the caller. */
const findOwnGroup = (orderGroupId, userId) =>
  FestivalBooking.find({ orderGroupId, userId }).sort({ createdAt: 1 });

/**
 * The Razorpay order behind a signature, checked against what it was opened for.
 *
 * A valid signature only proves a payment against *some* order of ours — any
 * module's, any amount. Verify used to confirm whichever booking the URL
 * named, so a ₹1 payment could unlock a costly pass. The orders opened below
 * carry the booking (or basket) id in their notes.
 *
 * @returns {Promise<{ok: true}|{ok: false, status: number, message: string}>}
 */
const checkOrderFor = async (orderId, expect) => {
  let order;
  try {
    order = await getRazorpayClient().orders.fetch(orderId);
  } catch (err) {
    console.error('Festival verify: order fetch failed:', err.message);
    return { ok: false, status: 502, message: 'Could not confirm this payment with the gateway. Please retry.' };
  }
  const notes = order?.notes || {};
  const matches = notes.module === 'festivals' &&
    Object.entries(expect).every(([key, value]) => String(notes[key] || '') === String(value));
  return matches
    ? { ok: true }
    : { ok: false, status: 400, message: 'This payment belongs to a different booking' };
};

/** Confirmation is not for sale without a gateway on the live server. */
const devSettleRefused = (res) => {
  if (process.env.NODE_ENV !== 'production') return false;
  // Keys going missing on the live server (a bad deploy, an env typo) must not
  // turn this development shortcut into free passes.
  res.status(503).json({ success: false, message: 'Online payment is unavailable right now. Please try again later.' });
  return true;
};

/** @route POST /v1/festivals/payments/bookings/:id/order */
export const createPaymentOrder = async (req, res) => {
  try {
    const booking = await findOwnBooking(req.params.id, req.user._id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.paymentStatus !== 'pending') {
      return res.status(400).json({ success: false, message: 'This booking is already paid' });
    }

    const amount = Number(booking.totalAmount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'This booking has nothing to pay' });
    }

    if (!isRazorpayConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Online payment is not configured on this server',
        gatewayConfigured: false,
        payable: amount,
      });
    }

    const order = await getRazorpayClient().orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: booking.bookingId,
      notes: { bookingId: booking.bookingId, module: 'festivals', userId: String(booking.userId) },
    });

    res.json({
      success: true,
      gatewayConfigured: true,
      razorpayKeyId: getRazorpayKeyId(),
      order: { id: order.id, amount: order.amount, currency: order.currency },
      booking: { id: booking._id, bookingId: booking.bookingId, totalAmount: booking.totalAmount },
    });
  } catch (error) {
    console.error('Festival create payment order error:', error);
    res.status(500).json({ success: false, message: error.error?.description || 'Could not start the payment' });
  }
};

/** @route POST /v1/festivals/payments/bookings/:id/verify */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const booking = await findOwnBooking(req.params.id, req.user._id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const check = await checkOrderFor(razorpay_order_id, { bookingId: booking.bookingId });
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.message });

    // A repeat of a verify that already succeeded answers the same way.
    if (booking.paymentStatus === 'paid' && booking.paymentId === razorpay_payment_id) {
      return res.json({ success: true, message: 'Payment confirmed', booking });
    }

    const payment = { paymentId: razorpay_payment_id, paymentMethod: 'razorpay' };

    // Seats released while the buyer paid are taken back first, as the basket
    // path does; this path used to confirm the pass without them.
    if (booking.paymentStatus === 'pending' && booking.bookingStatus === 'cancelled') {
      const revived = await confirmReleasedBookingPayment(booking, payment);
      if (!revived) {
        console.error(`[Festivals] Captured ${razorpay_payment_id} for ${booking.bookingId} but its passes sold out; needs a refund`);
        return res.status(409).json({
          success: false,
          message: 'These passes sold out while the payment was being completed. Nothing was confirmed.',
          soldOut: [{ bookingId: booking.bookingId, category: booking.ticketCategoryName }],
          refundRequired: true,
        });
      }
      return res.json({ success: true, message: 'Payment confirmed', booking: revived });
    }

    const confirmed = await confirmBookingPayment(booking, payment);

    res.json({ success: true, message: 'Payment confirmed', booking: confirmed });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Festival verify payment error:', error);
    res.status(status).json({ success: false, message: error.message || 'Could not confirm the payment' });
  }
};

/**
 * @route POST /v1/festivals/payments/orders/:groupId
 *
 * One Razorpay order for a whole basket.
 *
 * Before this, a basket spanning three categories opened three payment
 * windows in a row, each for one category's share — the buyer paid, then was
 * asked to pay again. The amount is summed from the stored bookings, never
 * from the request.
 */
export const createGroupPaymentOrder = async (req, res) => {
  try {
    const bookings = await findOwnGroup(req.params.groupId, req.user._id);
    if (!bookings.length) return res.status(404).json({ success: false, message: 'Booking not found' });

    const unpaid = bookings.filter((b) => b.paymentStatus === 'pending');
    if (!unpaid.length) {
      return res.status(400).json({ success: false, message: 'These passes are already paid' });
    }

    const amount = unpaid.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'This order has nothing to pay' });
    }

    if (!isRazorpayConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Online payment is not configured on this server',
        gatewayConfigured: false,
        payable: amount,
      });
    }

    const order = await getRazorpayClient().orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      // Razorpay caps a receipt at 40 characters, and a group id is short
      // enough to be the whole receipt.
      receipt: req.params.groupId,
      notes: {
        orderGroupId: req.params.groupId,
        module: 'festivals',
        userId: String(req.user._id),
        passes: String(unpaid.reduce((sum, b) => sum + b.ticketCount, 0)),
      },
    });

    res.json({
      success: true,
      gatewayConfigured: true,
      razorpayKeyId: getRazorpayKeyId(),
      order: { id: order.id, amount: order.amount, currency: order.currency },
      payable: amount,
      bookings: unpaid.map((b) => ({
        id: b._id,
        bookingId: b.bookingId,
        ticketCategoryName: b.ticketCategoryName,
        ticketCount: b.ticketCount,
        totalAmount: b.totalAmount,
      })),
    });
  } catch (error) {
    console.error('Festival create group order error:', error);
    res.status(500).json({ success: false, message: error.error?.description || 'Could not start the payment' });
  }
};

/**
 * @route POST /v1/festivals/payments/orders/:groupId/verify
 * One signature, every booking in the basket confirmed.
 */
export const verifyGroupPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const bookings = await findOwnGroup(req.params.groupId, req.user._id);
    if (!bookings.length) return res.status(404).json({ success: false, message: 'Booking not found' });

    const check = await checkOrderFor(razorpay_order_id, { orderGroupId: req.params.groupId });
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.message });

    const payment = { paymentId: razorpay_payment_id, paymentMethod: 'razorpay' };

    /*
     * A hold that expired mid-payment has already given its seats back, so
     * confirming it would hand out a pass the festival no longer has. Take the
     * seats again before confirming, and if they are genuinely gone say so
     * rather than issuing a pass that does not exist.
     *
     * The signature is already verified at this point, so money has been
     * captured for the whole basket. Every pass that can be honoured is
     * confirmed; the ones that cannot are reported for a refund. Each
     * confirmation is a conditional update, so a retried or concurrent verify
     * cannot confirm (or re-take seats for) the same booking twice.
     */
    const confirmed = [];
    const reclaimFailed = [];
    for (const booking of bookings) {
      // Already-paid bookings are skipped rather than failing the batch: a
      // retried verify must not lose the passes that did go through.
      if (booking.paymentStatus === 'paid') {
        confirmed.push(booking);
        continue;
      }
      if (booking.paymentStatus !== 'pending') continue;

      if (booking.bookingStatus === 'cancelled') {
        const revived = await confirmReleasedBookingPayment(booking, payment);
        if (revived) confirmed.push(revived);
        else reclaimFailed.push(booking);
        continue;
      }

      try {
        confirmed.push(await confirmBookingPayment(booking, payment));
      } catch (err) {
        // Lost a race with a concurrent verify (now paid) or a release sweep.
        const fresh = await FestivalBooking.findById(booking._id);
        if (fresh?.paymentStatus === 'paid') confirmed.push(fresh);
        else if (fresh?.bookingStatus === 'cancelled') {
          const revived = await confirmReleasedBookingPayment(fresh, payment);
          if (revived) confirmed.push(revived);
          else reclaimFailed.push(fresh);
        } else throw err;
      }
    }

    if (reclaimFailed.length) {
      console.error(`[Festivals] Captured ${razorpay_payment_id} for group ${req.params.groupId}; ${reclaimFailed.length} booking(s) sold out, need a refund`);
      return res.status(409).json({
        success: false,
        message: 'Some passes sold out while the payment was being completed. Those were not confirmed and will be refunded.',
        soldOut: reclaimFailed.map((b) => ({ bookingId: b.bookingId, category: b.ticketCategoryName })),
        refundRequired: true,
        bookings: confirmed,
      });
    }

    res.json({ success: true, message: 'Payment confirmed', bookings: confirmed });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Festival verify group payment error:', error);
    res.status(status).json({ success: false, message: error.message || 'Could not confirm the payment' });
  }
};

/**
 * @route POST /v1/festivals/payments/orders/:groupId/settle
 * The no-gateway path for a whole basket. Refused whenever Razorpay is
 * configured, exactly like the single-booking one.
 */
export const settleGroupWithoutGateway = async (req, res) => {
  try {
    if (devSettleRefused(res)) return;
    if (isRazorpayConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Complete the payment through the gateway to confirm this booking.',
      });
    }

    const bookings = await findOwnGroup(req.params.groupId, req.user._id);
    if (!bookings.length) return res.status(404).json({ success: false, message: 'Booking not found' });

    const confirmed = [];
    for (const booking of bookings) {
      // Released holds have no seats; this path never re-takes them.
      if (booking.bookingStatus === 'cancelled' && booking.paymentStatus !== 'paid') continue;
      confirmed.push(booking.paymentStatus === 'paid'
        ? booking
        : await confirmBookingPayment(booking, { paymentMethod: 'dev_no_gateway' }));
    }

    res.json({ success: true, message: 'Booking confirmed', bookings: confirmed });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Festival settle group error:', error);
    res.status(status).json({ success: false, message: error.message || 'Failed to confirm these passes' });
  }
};

/**
 * @route POST /v1/festivals/bookings/:id/settle
 * The no-gateway path, refused whenever Razorpay is configured — so it can
 * never become a way to get a pass without paying.
 */
export const settleWithoutGateway = async (req, res) => {
  try {
    if (devSettleRefused(res)) return;
    if (isRazorpayConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Complete the payment through the gateway to confirm this booking.',
      });
    }

    const booking = await findOwnBooking(req.params.id, req.user._id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const confirmed = await confirmBookingPayment(booking, { paymentMethod: 'dev_no_gateway' });
    res.json({ success: true, message: 'Booking confirmed', booking: confirmed });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Festival settle error:', error);
    res.status(status).json({ success: false, message: error.message || 'Failed to confirm this booking' });
  }
};

export default {
  createPaymentOrder,
  verifyPayment,
  settleWithoutGateway,
  createGroupPaymentOrder,
  verifyGroupPayment,
  settleGroupWithoutGateway,
};
