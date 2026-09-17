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
import { confirmBookingPayment } from './bookingController.js';

const findOwnBooking = (id, userId) => FestivalBooking.findOne({ _id: id, userId });

/** Every booking in one checkout, scoped to the caller. */
const findOwnGroup = (orderGroupId, userId) =>
  FestivalBooking.find({ orderGroupId, userId }).sort({ createdAt: 1 });

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

    const confirmed = await confirmBookingPayment(booking, {
      paymentId: razorpay_payment_id,
      paymentMethod: 'razorpay',
    });

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

    const confirmed = [];
    for (const booking of bookings) {
      // Already-paid bookings are skipped rather than failing the batch: a
      // retried verify must not lose the passes that did go through.
      if (booking.paymentStatus === 'paid') {
        confirmed.push(booking);
        continue;
      }
      confirmed.push(await confirmBookingPayment(booking, {
        paymentId: razorpay_payment_id,
        paymentMethod: 'razorpay',
      }));
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
